/**
 * check-ui-lints.ts — static AST-based lint over Vue SFCs.
 *
 * Rules:
 *   no-native-dialog              — no prompt/alert/confirm in <script>
 *   no-inline-style-mutation      — no .style. in event handler attribute values
 *   no-structured-clone-on-reactive — structuredClone(reactive) → use cloneJson
 *   glyph-button-needs-label      — glyph-only <button> must have aria-label/title
 *   clickable-non-button-needs-keyboard — @click on non-interactive el needs role+tabindex+keydown
 *   no-raw-teleport               — only Popover.vue may use <Teleport> directly
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { parse as parseSFC } from '@vue/compiler-sfc'
import { parse as parseTemplate, type ElementNode, type AttributeNode, type DirectiveNode, type TemplateChildNode, NodeTypes } from '@vue/compiler-dom'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Violation {
  rule: string
  file: string
  line: number
  message: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = new URL('../', import.meta.url).pathname.replace(/\/$/, '')
const SRC = join(ROOT, 'src')

function collectVueFiles(dir: string): string[] {
  const result: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      result.push(...collectVueFiles(full))
    } else if (entry.endsWith('.vue') && !full.includes('/test/') && !entry.endsWith('.spec.vue')) {
      result.push(full)
    }
  }
  return result
}

/** Return the line number (1-based) for a character offset in source text. */
function lineOf(src: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src[i] === '\n') line++
  }
  return line
}

// ---------------------------------------------------------------------------
// Rule 1: no-native-dialog
// ---------------------------------------------------------------------------

const NATIVE_DIALOG_RE = /\b(prompt|alert|confirm)\s*\(/g

function checkNoNativeDialog(file: string, src: string, violations: Violation[]): void {
  // Only scan inside <script>/<script setup> blocks
  const sfc = parseSFC(src)
  for (const block of [sfc.descriptor.script, sfc.descriptor.scriptSetup]) {
    if (!block) continue
    const text = block.content

    // Build a set of locally-defined function names so we can skip `foo()` calls
    // where `foo` is defined in-file (e.g. `function confirm() { ... }`).
    const localFns = new Set<string>()
    const fnDefRe = /\bfunction\s+(\w+)\s*\(/g
    const arrowRe = /\bconst\s+(\w+)\s*=/g
    let fd: RegExpExecArray | null
    while ((fd = fnDefRe.exec(text)) !== null) localFns.add(fd[1])
    while ((fd = arrowRe.exec(text)) !== null) localFns.add(fd[1])

    NATIVE_DIALOG_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = NATIVE_DIALOG_RE.exec(text)) !== null) {
      const fnName = m[1]
      // Skip if it's a locally-defined function
      if (localFns.has(fnName)) continue
      // Skip if inside a comment
      const before = text.slice(0, m.index)
      const lastNewline = before.lastIndexOf('\n')
      const lineContent = before.slice(lastNewline + 1)
      if (lineContent.trimStart().startsWith('//')) continue
      const line = lineOf(src, block.loc.start.offset + m.index)
      violations.push({
        rule: 'no-native-dialog',
        file,
        line,
        message: `Native \`${fnName}()\` call — use a Popover/ConfirmPopover instead`,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 2: no-inline-style-mutation
// ---------------------------------------------------------------------------

function checkNoInlineStyleMutation(file: string, src: string, violations: Violation[]): void {
  const sfc = parseSFC(src)
  if (!sfc.descriptor.template) return
  const templateSrc = sfc.descriptor.template.content
  const templateOffset = sfc.descriptor.template.loc.start.offset

  // Regex scan over template source: find @event="..." with .style. in value
  const attrRe = /@(?:mouseenter|mouseleave|focus|blur|pointerenter|pointerleave|pointerover)="([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(templateSrc)) !== null) {
    if (m[1].includes('.style.')) {
      const line = lineOf(src, templateOffset + m.index)
      violations.push({
        rule: 'no-inline-style-mutation',
        file,
        line,
        message: `Inline \`.style.\` mutation in event handler — use \`:class\` / \`:style\` bindings or reactive state instead`,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 3: no-structured-clone-on-reactive
// ---------------------------------------------------------------------------

// Patterns:  structuredClone(<ident>.value)
//            structuredClone(props.<ident>)
//            structuredClone(instances(...))  etc.
const STORE_GETTER_NAMES = ['instances', 'customLibrary', 'results', 'items', 'history']

function checkNoStructuredCloneOnReactive(file: string, src: string, violations: Violation[]): void {
  const sfc = parseSFC(src)
  for (const block of [sfc.descriptor.script, sfc.descriptor.scriptSetup]) {
    if (!block) continue
    const text = block.content
    const cloneRe = /structuredClone\s*\(\s*([^)]*?)\s*\)/g
    let m: RegExpExecArray | null
    while ((m = cloneRe.exec(text)) !== null) {
      const arg = m[1].trim()
      const isReactive =
        /^\w+\.value\b/.test(arg) ||
        /^props\.\w+/.test(arg) ||
        new RegExp(`^(?:${STORE_GETTER_NAMES.join('|')})\\s*(?:\\(|$)`).test(arg)
      if (isReactive) {
        const line = lineOf(src, block.loc.start.offset + m.index)
        violations.push({
          rule: 'no-structured-clone-on-reactive',
          file,
          line,
          message: `\`structuredClone(${arg})\` on reactive value — use \`cloneJson()\` from \`src/lib/clone.ts\` (wraps structuredClone(toRaw(...)))`,
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 4: glyph-button-needs-label
// ---------------------------------------------------------------------------

/** Returns true if the string contains only whitespace and/or non-ASCII glyphs (no readable words). */
function isGlyphOnly(text: string): boolean {
  // Whitespace-only → considered empty
  if (text.trim().length === 0) return true
  // Any ASCII alphanumeric content means it has readable text — not glyph-only
  if (/[a-zA-Z0-9]/.test(text)) return false
  // Otherwise: only non-alphanumeric characters (symbols, punctuation, emoji, etc.)
  return true
}

function hasAccessibleLabel(node: ElementNode): boolean {
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      const name = (prop as AttributeNode).name
      if (name === 'aria-label' || name === 'title') return true
    } else if (prop.type === NodeTypes.DIRECTIVE) {
      const dir = prop as DirectiveNode
      if (dir.name === 'bind') {
        const argName = dir.arg && dir.arg.type === NodeTypes.SIMPLE_EXPRESSION ? dir.arg.content : ''
        if (argName === 'aria-label' || argName === 'title') return true
      }
    }
  }
  return false
}

/** Extract visible text content from a button node for glyph-only checks.
 *
 *  - Vue interpolations `{{ expr }}` are treated as placeholder text "x" (they
 *    resolve to readable strings at runtime — caller has no way to check the value).
 *  - `aria-hidden` children are skipped (decorative).
 *  - SVG children contribute no text.
 */
function extractTextContent(node: ElementNode): string {
  let text = ''
  for (const child of node.children) {
    if (child.type === NodeTypes.TEXT) {
      text += child.content
    } else if (child.type === NodeTypes.INTERPOLATION) {
      // Treat any interpolation as opaque readable text — the lint cannot statically
      // evaluate the expression.  Return a sentinel that passes the alphanumeric check.
      text += 'x'
    } else if (child.type === NodeTypes.ELEMENT) {
      const el = child as ElementNode
      // SVG elements provide no accessible text — skip them (they'll need aria-label)
      if (el.tag === 'svg') continue
      // aria-hidden children are decorative
      const ariaHidden = el.props.find(
        p => p.type === NodeTypes.ATTRIBUTE && (p as AttributeNode).name === 'aria-hidden'
      )
      if (!ariaHidden) {
        text += extractTextContent(el)
      }
    }
  }
  return text
}

function walkTemplateNodes(
  nodes: TemplateChildNode[],
  visitor: (node: ElementNode) => void
): void {
  for (const node of nodes) {
    if (node.type === NodeTypes.ELEMENT) {
      visitor(node as ElementNode)
      walkTemplateNodes((node as ElementNode).children, visitor)
    } else if (node.type === NodeTypes.IF) {
      for (const branch of (node as any).branches) {
        walkTemplateNodes(branch.children, visitor)
      }
    } else if (node.type === NodeTypes.FOR) {
      walkTemplateNodes((node as any).children, visitor)
    }
  }
}

function checkGlyphButtonNeedsLabel(file: string, src: string, violations: Violation[]): void {
  const sfc = parseSFC(src)
  if (!sfc.descriptor.template) return
  const templateContent = sfc.descriptor.template.content
  const templateOffset = sfc.descriptor.template.loc.start.offset

  let ast: ReturnType<typeof parseTemplate>
  try {
    ast = parseTemplate(templateContent)
  } catch {
    return
  }

  walkTemplateNodes(ast.children, (node) => {
    if (node.tag !== 'button') return
    const text = extractTextContent(node)
    if (!isGlyphOnly(text)) return
    if (hasAccessibleLabel(node)) return
    const line = lineOf(src, templateOffset + node.loc.start.offset)
    violations.push({
      rule: 'glyph-button-needs-label',
      file,
      line,
      message: `Button with glyph-only content "${text.trim()}" needs \`aria-label\` or \`title\` attribute`,
    })
  })
}

// ---------------------------------------------------------------------------
// Rule 5: clickable-non-button-needs-keyboard
// ---------------------------------------------------------------------------

const INTERACTIVE_TAGS = new Set(['button', 'a', 'input', 'textarea', 'select'])

function hasProp(node: ElementNode, check: (name: string, value: string | undefined) => boolean): boolean {
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE) {
      const a = prop as AttributeNode
      if (check(a.name, a.value?.content)) return true
    } else if (prop.type === NodeTypes.DIRECTIVE) {
      const d = prop as DirectiveNode
      const argName = d.arg && d.arg.type === NodeTypes.SIMPLE_EXPRESSION ? d.arg.content : ''
      if (check(`:${argName}`, undefined)) return true
      // Also check @event syntax (name === 'on')
      if (d.name === 'on') {
        if (check(`@${argName}`, undefined)) return true
      }
    }
  }
  return false
}

function hasClickHandler(node: ElementNode): boolean {
  return hasProp(node, (name) => name === '@click' || name === '@click.stop' || name === '@click.prevent' || name.startsWith('@click'))
}

function hasRole(node: ElementNode, roles: string[]): boolean {
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && (prop as AttributeNode).name === 'role') {
      const val = (prop as AttributeNode).value?.content ?? ''
      if (roles.includes(val)) return true
    } else if (prop.type === NodeTypes.DIRECTIVE) {
      const d = prop as DirectiveNode
      if (d.name === 'bind') {
        const argName = d.arg && d.arg.type === NodeTypes.SIMPLE_EXPRESSION ? d.arg.content : ''
        if (argName === 'role') return true // dynamic role — assume valid
      }
    }
  }
  return false
}

function hasTabindex(node: ElementNode): boolean {
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && (prop as AttributeNode).name === 'tabindex') {
      const val = (prop as AttributeNode).value?.content ?? '0'
      return parseInt(val, 10) >= 0
    } else if (prop.type === NodeTypes.DIRECTIVE) {
      const d = prop as DirectiveNode
      if (d.name === 'bind') {
        const argName = d.arg && d.arg.type === NodeTypes.SIMPLE_EXPRESSION ? d.arg.content : ''
        if (argName === 'tabindex') return true // dynamic tabindex — assume valid
      }
    }
  }
  return false
}

function hasKeyboardHandler(node: ElementNode): boolean {
  return hasProp(node, (name) =>
    name.startsWith('@keydown') || name.startsWith('@keyup')
  )
}

function checkClickableNonButtonNeedsKeyboard(file: string, src: string, violations: Violation[]): void {
  const sfc = parseSFC(src)
  if (!sfc.descriptor.template) return
  const templateContent = sfc.descriptor.template.content
  const templateOffset = sfc.descriptor.template.loc.start.offset

  let ast: ReturnType<typeof parseTemplate>
  try {
    ast = parseTemplate(templateContent)
  } catch {
    return
  }

  walkTemplateNodes(ast.children, (node) => {
    if (INTERACTIVE_TAGS.has(node.tag)) return
    // Component tags (PascalCase) are not native elements
    if (/^[A-Z]/.test(node.tag)) return
    // SVG presentational elements — keyboard accessibility model differs from HTML
    const SVG_PRESENTATIONAL = new Set(['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'use', 'defs', 'marker'])
    if (SVG_PRESENTATIONAL.has(node.tag)) return

    if (!hasClickHandler(node)) return

    // Pure propagation-stopper: @click.stop with no action — just prevents bubbling
    // Detect by checking if the @click directive has a non-empty handler expression
    const hasRealClick = node.props.some(p => {
      if (p.type !== NodeTypes.DIRECTIVE || p.name !== 'on') return false
      const d = p as DirectiveNode
      const argName = d.arg && d.arg.type === NodeTypes.SIMPLE_EXPRESSION ? d.arg.content : ''
      if (!argName.startsWith('click')) return false
      // If the expression is empty, it's a bare @click.stop stopper
      const expr = d.exp && d.exp.type === NodeTypes.SIMPLE_EXPRESSION ? d.exp.content.trim() : ''
      return expr.length > 0
    })
    if (!hasRealClick) return

    // Modal overlay pattern: elements with @mousedown (for closing) and no meaningful click action
    // These are backdrop divs, not interactive widgets.
    const isOverlay = hasProp(node, (name) => name === '@mousedown.self' || name === '@mousedown')
    if (isOverlay) return

    // menuitem role: only needs some keyboard handler
    if (hasRole(node, ['menuitem'])) {
      if (!hasKeyboardHandler(node)) {
        const line = lineOf(src, templateOffset + node.loc.start.offset)
        violations.push({
          rule: 'clickable-non-button-needs-keyboard',
          file,
          line,
          message: `<${node.tag}> with role="menuitem" and @click needs a @keydown handler`,
        })
      }
      return
    }

    if (hasRole(node, ['link'])) return // link role with @click is fine
    // option role: keyboard handled by parent listbox — no individual key handler needed
    if (hasRole(node, ['option'])) return

    const missing: string[] = []
    if (!hasRole(node, ['button'])) missing.push('role="button"')
    if (!hasTabindex(node)) missing.push('tabindex="0"')
    if (!hasKeyboardHandler(node)) missing.push('@keydown or @keyup handler')

    if (missing.length > 0) {
      const line = lineOf(src, templateOffset + node.loc.start.offset)
      violations.push({
        rule: 'clickable-non-button-needs-keyboard',
        file,
        line,
        message: `<${node.tag}> with @click must be keyboard accessible — missing: ${missing.join(', ')}`,
      })
    }
  })
}

// ---------------------------------------------------------------------------
// Rule 6: no-raw-teleport
// ---------------------------------------------------------------------------

// These files use Teleport for legitimate non-Popover purposes (modal dialogs,
// toast notifications, file-drop overlays) and are part of the established
// modal infrastructure, not recreations of Popover's anchored-floating plumbing.
const TELEPORT_ALLOWLIST = new Set([
  'src/components/Popover.vue',          // the Popover primitive itself
  'src/components/Toast.vue',            // toast notification system — fixed-position, not anchored
  'src/components/HistoryBrowser.vue',   // full-screen modal dialog
  'src/components/PromoteRecipeDialog.vue', // full-screen modal dialog
  'src/components/StreamCanvas.vue',     // file-drop overlay
  'src/components/StatosphereStudio.vue', // cmd-K modal overlay
])

function checkNoRawTeleport(file: string, src: string, violations: Violation[]): void {
  const relPath = relative(ROOT, file)
  if (TELEPORT_ALLOWLIST.has(relPath)) return

  const sfc = parseSFC(src)
  if (!sfc.descriptor.template) return
  const templateContent = sfc.descriptor.template.content
  const templateOffset = sfc.descriptor.template.loc.start.offset

  let ast: ReturnType<typeof parseTemplate>
  try {
    ast = parseTemplate(templateContent)
  } catch {
    return
  }

  walkTemplateNodes(ast.children, (node) => {
    if (node.tag.toLowerCase() !== 'teleport') return
    const line = lineOf(src, templateOffset + node.loc.start.offset)
    violations.push({
      rule: 'no-raw-teleport',
      file,
      line,
      message: `Raw <Teleport> use — use the <Popover> primitive for anchored floating UI, or add to TELEPORT_ALLOWLIST if this is a new modal/overlay`,
    })
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = collectVueFiles(SRC)
const allViolations: Violation[] = []

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const relFile = relative(ROOT, file)
  const fileViolations: Violation[] = []

  checkNoNativeDialog(relFile, src, fileViolations)
  checkNoInlineStyleMutation(relFile, src, fileViolations)
  checkNoStructuredCloneOnReactive(relFile, src, fileViolations)
  checkGlyphButtonNeedsLabel(relFile, src, fileViolations)
  checkClickableNonButtonNeedsKeyboard(relFile, src, fileViolations)
  checkNoRawTeleport(relFile, src, fileViolations)

  allViolations.push(...fileViolations)
}

// Print results
for (const v of allViolations) {
  console.error(`fail [${v.rule}] ${v.file}:${v.line} — ${v.message}`)
}

const passed = files.length - new Set(allViolations.map((v) => v.file)).size
const failedFiles = new Set(allViolations.map((v) => v.file)).size
console.log(`\n${passed} files passed, ${failedFiles} files with violations, ${allViolations.length} total violations`)

if (allViolations.length > 0) process.exit(1)
