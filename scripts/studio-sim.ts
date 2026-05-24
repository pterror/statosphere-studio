#!/usr/bin/env bun
/**
 * Studio simulator — a text-mode mock of Statosphere Studio's UI.
 *
 * Usage:
 *   bun run scripts/studio-sim.ts reset
 *   bun run scripts/studio-sim.ts show
 *   bun run scripts/studio-sim.ts click "<thing>"
 *   bun run scripts/studio-sim.ts type "<field>" "<text>"
 *   bun run scripts/studio-sim.ts key "<key>"        # Esc, Enter, ArrowDown, etc
 *   bun run scripts/studio-sim.ts back
 *
 * State persisted at /tmp/studio-sim-state.json.
 * Designed for use by a roleplay agent — narration in, screen out.
 *
 * Faithfulness: mirrors the actual studio surface as captured in the audit.
 * Not 100% complete — focuses on the first-open recipe-authoring flow.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const STATE_FILE = process.env.STUDIO_SIM_STATE ?? '/tmp/studio-sim-state.json'

type ElementKind = 'variable' | 'classifier' | 'generator' | 'rule' | 'function'

interface Element {
  kind: ElementKind
  name: string
  fields: Record<string, string | string[] | number>
}

interface Instance {
  recipe: string
  name: string
  params: Record<string, string | string[] | number>
  extras: Element[]
  expanded: boolean
}

interface State {
  view:
    | 'initial'
    | 'library_modal'
    | 'canvas'
    | 'settings'
    | 'history'
    | 'share'
    | 'promote'
    | 'import'
    | 'graph'
  instances: Instance[]
  search: string
  filter: 'All' | 'Atoms' | 'Bundles' | 'Custom'
  focusedInstance: number | null
  jsonOpen: boolean
  overflowMenuOpen: boolean
  elementPickerOpen: boolean
  blockMenuFor: number | null
  elementDrawerFor: { instanceIdx: number; elemIdx: number } | null
  paramEdit: { instanceIdx: number; param: string } | null
  inlineRename: number | null
  history: string[]
}

const DEFAULT_STATE: State = {
  view: 'initial',
  instances: [],
  search: '',
  filter: 'All',
  focusedInstance: null,
  jsonOpen: false,
  overflowMenuOpen: false,
  elementPickerOpen: false,
  blockMenuFor: null,
  elementDrawerFor: null,
  paramEdit: null,
  inlineRename: null,
  history: [],
}

const RECIPES: { name: string; kind: 'atom' | 'bundle' | 'custom'; desc: string; tags?: string[] }[] = [
  { name: 'Counter', kind: 'atom', desc: 'Tracks a numeric value that goes up or down.' },
  { name: 'State', kind: 'atom', desc: 'Holds one value chosen from a fixed set.' },
  { name: 'Flag', kind: 'atom', desc: 'On/off switch.' },
  { name: 'Event Detector', kind: 'atom', desc: 'Detects when something is happening in the message.' },
  { name: 'Multi-Event Classifier', kind: 'atom', desc: 'Picks one of several events from the message.' },
  { name: 'Dynamic Label', kind: 'atom', desc: 'Names a label chosen at runtime.' },
  { name: 'Text Generator', kind: 'atom', desc: 'Produces text based on state.' },
  { name: 'Image Generator', kind: 'atom', desc: 'Produces an image prompt based on state.' },
  { name: 'Stage Direction Rule', kind: 'atom', desc: 'Injects stage directions when conditions hold.' },
  { name: 'Status Line Rule', kind: 'atom', desc: 'Injects a status line when conditions hold.' },
  { name: 'HP Tracker', kind: 'bundle', desc: 'Health that goes down when attacked, up when healed.' },
  { name: 'Mood Companion', kind: 'bundle', desc: 'A mood that drifts based on tone.' },
  { name: 'Stamina Tracker', kind: 'bundle', desc: 'Energy that depletes on action, recovers on rest.' },
  { name: 'Background Swapper', kind: 'bundle', desc: 'Switches background art by scene.' },
  { name: 'NPC Relationships', kind: 'bundle', desc: 'Per-character affinity values.' },
  { name: 'Branching Scenario', kind: 'bundle', desc: 'A scene that branches on choices.' },
  { name: 'Inventory', kind: 'bundle', desc: 'List of items the character holds.' },
  { name: 'Mystery Game', kind: 'bundle', desc: 'Clues, suspects, and a solution state.' },
  { name: 'Persistent Memory', kind: 'bundle', desc: 'Long-term notes that survive turns.' },
  { name: 'Time of Day', kind: 'bundle', desc: 'A clock that advances each turn.' },
  { name: 'Custom', kind: 'bundle', desc: 'Blank slate. Add your own elements.' },
]

const RECIPE_PARAMS: Record<string, { key: string; label: string; kind: 'string' | 'number' | 'label-list' | 'enum'; choices?: string[]; default: string | string[] | number }[]> = {
  Counter: [
    { key: 'name', label: 'Variable name', kind: 'string', default: 'counter' },
    { key: 'min', label: 'Minimum', kind: 'number', default: 0 },
    { key: 'max', label: 'Maximum', kind: 'number', default: 100 },
    { key: 'start', label: 'Starting value', kind: 'number', default: 0 },
  ],
  'HP Tracker': [
    { key: 'name', label: 'Stat name', kind: 'string', default: 'hp' },
    { key: 'max', label: 'Max HP', kind: 'number', default: 100 },
    { key: 'down_labels', label: 'Damage events', kind: 'label-list', default: ['attacked', 'hurt'] },
    { key: 'up_labels', label: 'Heal events', kind: 'label-list', default: ['healed', 'rested'] },
  ],
  'Mood Companion': [
    { key: 'name', label: 'Character name', kind: 'string', default: 'companion' },
    { key: 'moods', label: 'Mood labels', kind: 'label-list', default: ['cheerful', 'neutral', 'sad', 'angry'] },
  ],
  'Event Detector': [
    { key: 'name', label: 'Event name', kind: 'string', default: 'event' },
    { key: 'description', label: 'Detect when…', kind: 'string', default: '' },
  ],
}

function loadState(): State {
  if (!existsSync(STATE_FILE)) return structuredClone(DEFAULT_STATE)
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

function saveState(s: State) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
}

function recordAction(s: State, action: string) {
  s.history.push(action)
  if (s.history.length > 40) s.history.shift()
}

function recipeCards(s: State): typeof RECIPES {
  let r = RECIPES
  if (s.filter !== 'All') {
    const want = s.filter.toLowerCase().replace(/s$/, '')
    r = r.filter((c) => c.kind === want)
  }
  if (s.search.trim()) {
    const q = s.search.trim().toLowerCase()
    r = r.filter((c) => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
  }
  return r
}

function render(s: State): string {
  const out: string[] = []

  // Top bar — always present
  const undoOk = s.history.length > 0
  out.push('────────────────────────────────────────────────────────────────────')
  out.push(
    `  Statosphere Studio   [ Browse ▾ ]   [ ${undoOk ? '↶' : '↶(disabled)'} ] [ ↷(disabled) ]   [ + Element ▾ ]   ● green   [ ⋯ ]   [ ⚙ ]`,
  )
  out.push('────────────────────────────────────────────────────────────────────')

  // View body
  if (s.view === 'initial' || (s.view === 'canvas' && s.instances.length === 0)) {
    out.push('')
    out.push('                      Add your first recipe')
    out.push('                  Search or browse to get started.')
    out.push('')
    out.push(`  [ Search recipes…           ${s.search ? `"${s.search}"` : ''} ]   (${recipeCards(s).length} of ${RECIPES.length})`)
    out.push(`  Filters:  ${s.filter === 'All' ? '[All]' : ' All '} · ${s.filter === 'Atoms' ? '[Atoms]' : ' Atoms '} · ${s.filter === 'Bundles' ? '[Bundles]' : ' Bundles '} · ${s.filter === 'Custom' ? '[Custom]' : ' Custom '}`)
    out.push('')
    for (const r of recipeCards(s)) {
      out.push(`  ┌─────────────────────────────────────────────────────────┐`)
      out.push(`  │ ${r.name.padEnd(34)} [${r.kind}] │`)
      out.push(`  │ ${r.desc.slice(0, 55).padEnd(55)} │`)
      out.push(`  └─────────────────────────────────────────────────────────┘`)
    }
    out.push('')
    out.push('  Keyboard: ↑↓ navigate · ↵ add · / search · Esc close')
  } else if (s.view === 'canvas') {
    out.push('')
    out.push('  [ Browse ▾ search strip: Search recipes…  ]')
    out.push('')
    for (let i = 0; i < s.instances.length; i++) {
      const inst = s.instances[i]
      const focus = s.focusedInstance === i ? '►' : ' '
      const chev = inst.expanded ? '▼' : '▶'
      const namePart = s.inlineRename === i ? `[ ${inst.name}|editing ]` : inst.name
      out.push(`  ${focus} ┌─────────────────────────────────────────────────────────────┐`)
      out.push(`    │ ≡  ${namePart}   (${inst.recipe})            ${chev}  [⋯] │`)
      if (Object.keys(inst.params).length > 0) {
        const pieces: string[] = []
        for (const [k, v] of Object.entries(inst.params)) {
          const display = Array.isArray(v) ? `[${v.join(', ')}]` : String(v)
          pieces.push(`${k}=${display}`)
        }
        out.push(`    │ params: ${pieces.join('  ')}`.padEnd(67) + ' │')
      }
      if (inst.expanded) {
        if (inst.extras.length === 0) {
          out.push(`    │   (recipe contents — variables/classifiers/etc from the      │`)
          out.push(`    │    recipe template, not editable here unless pinned)         │`)
        } else {
          for (let j = 0; j < inst.extras.length; j++) {
            const e = inst.extras[j]
            const open = s.elementDrawerFor && s.elementDrawerFor.instanceIdx === i && s.elementDrawerFor.elemIdx === j
            out.push(`    │   ⠿ [${e.kind.padEnd(10)}] ${e.name.padEnd(40)} ${open ? '▼' : '▶'} │`)
            if (open) {
              for (const [k, v] of Object.entries(e.fields)) {
                const display = Array.isArray(v) ? `[${v.join(', ')}]` : String(v)
                out.push(`    │      ${k.padEnd(20)}: ${display.slice(0, 30).padEnd(30)} │`)
              }
            }
          }
        }
        out.push(`    │   [ + Add element ▾ ]                                         │`)
      }
      out.push(`    └─────────────────────────────────────────────────────────────┘`)
    }
    out.push('  ┌─ + Add recipe… ─────────────────────────────────────────────┐')
    out.push('  │ (dashed; click to open library)                              │')
    out.push('  └──────────────────────────────────────────────────────────────┘')
  } else if (s.view === 'settings') {
    out.push('')
    out.push('  ╔══════════════════ Settings ══════════════════╗')
    out.push('  ║                                                ║')
    out.push('  ║  Appearance:  [Light] [Dark] [Auto]            ║')
    out.push('  ║    ☐ Reduce motion                             ║')
    out.push('  ║                                                ║')
    out.push('  ║  Trusted Import Prefixes:                      ║')
    out.push('  ║    (none)   [           ] [Add]                ║')
    out.push('  ║                                                ║')
    out.push('  ║  Editor:                                       ║')
    out.push('  ║    ☐ Expand advanced fields by default         ║')
    out.push('  ║    ☐ Strip instance prefix on export           ║')
    out.push('  ║                                                ║')
    out.push('  ║  Data:                                         ║')
    out.push('  ║    Saved Drafts: (none)                        ║')
    out.push('  ║    Custom Recipes: (none)                      ║')
    out.push('  ║    [Clear scratch slot]                        ║')
    out.push('  ║    [Export everything…]  ☐ Include history     ║')
    out.push('  ║    [Import bundle…]                            ║')
    out.push('  ║    [Reset all studio data…]                    ║')
    out.push('  ║                                                ║')
    out.push('  ║  [Close]                                       ║')
    out.push('  ╚════════════════════════════════════════════════╝')
  } else if (s.view === 'library_modal') {
    out.push('')
    out.push('  ╔════════════ Browse Recipes ══════════════════╗')
    out.push(`  ║  [ Search recipes…  "${s.search}" ]   (${recipeCards(s).length} of ${RECIPES.length})`.padEnd(53) + '║')
    out.push(`  ║  ${s.filter === 'All' ? '[All]' : ' All '} ${s.filter === 'Atoms' ? '[Atoms]' : ' Atoms '} ${s.filter === 'Bundles' ? '[Bundles]' : ' Bundles '} ${s.filter === 'Custom' ? '[Custom]' : ' Custom '}`.padEnd(53) + '║')
    out.push('  ║                                                 ║')
    for (const r of recipeCards(s).slice(0, 8)) {
      out.push(`  ║  • ${r.name.padEnd(28)} [${r.kind.padEnd(7)}]   ║`)
    }
    if (recipeCards(s).length > 8) {
      out.push(`  ║  …and ${recipeCards(s).length - 8} more                          ║`)
    }
    out.push('  ║                                                 ║')
    out.push('  ║  ↑↓ navigate · ↵ add · / search · Esc close     ║')
    out.push('  ╚═════════════════════════════════════════════════╝')
  } else if (s.view === 'history') {
    out.push('')
    out.push('  ╔══════════════ History ════════════════════════╗')
    out.push('  ║  [Search]   [Export tree…] [Import tree…]      ║')
    out.push('  ║                                                 ║')
    out.push('  ║  ○ root                                         ║')
    for (let i = 0; i < s.history.length; i++) {
      const branch = i === s.history.length - 1 ? '└' : '├'
      out.push(`  ║  ${branch}─ ${s.history[i].slice(0, 38).padEnd(38)} ║`)
    }
    out.push('  ║                                                 ║')
    out.push('  ║  [Close]                                        ║')
    out.push('  ╚═════════════════════════════════════════════════╝')
  }

  // JSON footer
  out.push('')
  if (s.jsonOpen) {
    out.push('  ▼ JSON  [fullscreen] [collapse]')
    out.push('  ┌──────────────────────────────────────────────────────────────┐')
    out.push(`  │ ${JSON.stringify({ instances: s.instances.length }, null).slice(0, 60).padEnd(60)} │`)
    out.push('  └──────────────────────────────────────────────────────────────┘')
  } else {
    out.push(`  ▶ JSON   {…${s.instances.length} instance(s)}   ~${JSON.stringify(s.instances).length}B`)
  }

  // Overlays
  if (s.overflowMenuOpen) {
    out.push('')
    out.push('  (⋯ menu open:)')
    out.push('  ┌────────────────┐')
    out.push('  │ Import         │')
    out.push('  │ Copy JSON      │')
    out.push('  │ Download .json │')
    out.push('  │ Share          │')
    out.push('  │ Graph          │')
    out.push('  │ History… ⌘H    │')
    out.push('  │ Save Menu ▸    │')
    out.push('  └────────────────┘')
  }
  if (s.elementPickerOpen) {
    out.push('')
    out.push('  (+ Element popover:)')
    out.push('  ┌──────────────────┐')
    out.push('  │ Variable     (V) │')
    out.push('  │ Classifier   (C) │')
    out.push('  │ Generator    (G) │')
    out.push('  │ Content Rule (R) │')
    out.push('  │ Function     (F) │')
    out.push('  └──────────────────┘')
  }
  if (s.blockMenuFor !== null) {
    const inst = s.instances[s.blockMenuFor]
    out.push('')
    out.push(`  (block ⋯ menu for "${inst?.name}":)`)
    out.push('  ┌─────────────────────┐')
    out.push('  │ Rename              │')
    out.push('  │ Duplicate           │')
    out.push('  │ Promote to recipe…  │')
    out.push('  │ Export as URL       │')
    out.push('  │ Remove              │')
    out.push('  └─────────────────────┘')
  }

  return out.join('\n')
}

function reset(): State {
  const s = structuredClone(DEFAULT_STATE)
  saveState(s)
  return s
}

function findRecipe(name: string): typeof RECIPES[number] | undefined {
  const lower = name.trim().toLowerCase()
  return RECIPES.find((r) => r.name.toLowerCase() === lower)
}

function instantiateRecipe(name: string): Instance | null {
  const r = findRecipe(name)
  if (!r) return null
  const params: Record<string, string | string[] | number> = {}
  for (const p of RECIPE_PARAMS[r.name] ?? []) {
    params[p.key] = p.default
  }
  return {
    recipe: r.name,
    name: r.name,
    params,
    extras: [],
    expanded: true,
  }
}

function emptyElement(kind: ElementKind, instance: Instance): Element {
  const prefix = { variable: 'var', classifier: 'cls', generator: 'gen', rule: 'rule', function: 'fn' }[kind]
  let max = 0
  for (const e of instance.extras) {
    const m = e.name.match(new RegExp(`^${prefix}_(\\d+)$`))
    if (m) max = Math.max(max, Number(m[1]))
  }
  const name = `${prefix}_${max + 1}`
  if (kind === 'variable') return { kind, name, fields: { type: 'number', default: '0', description: '' } }
  if (kind === 'classifier') return { kind, name, fields: { description: '', labels: [] } }
  if (kind === 'generator') return { kind, name, fields: { kind: 'text', template: '' } }
  if (kind === 'rule') return { kind, name, fields: { kind: 'Stage Direction', condition: '', text: '' } }
  return { kind, name, fields: { params: [], body: '0' } }
}

function handle(s: State, args: string[]): string {
  const [cmd, ...rest] = args
  const arg = rest.join(' ').trim()

  if (cmd === 'reset') {
    return 'state reset.\n\n' + render(reset())
  }

  if (cmd === 'show') return render(s)

  if (cmd === 'back') {
    // close any overlay first
    if (s.overflowMenuOpen) { s.overflowMenuOpen = false; recordAction(s, 'close ⋯'); return render(s) }
    if (s.elementPickerOpen) { s.elementPickerOpen = false; recordAction(s, 'close + Element popover'); return render(s) }
    if (s.blockMenuFor !== null) { s.blockMenuFor = null; recordAction(s, 'close block menu'); return render(s) }
    if (s.elementDrawerFor !== null) { s.elementDrawerFor = null; recordAction(s, 'close drawer'); return render(s) }
    if (s.paramEdit !== null) { s.paramEdit = null; recordAction(s, 'cancel param edit'); return render(s) }
    if (s.inlineRename !== null) { s.inlineRename = null; recordAction(s, 'cancel rename'); return render(s) }
    if (s.view === 'settings' || s.view === 'history' || s.view === 'library_modal' || s.view === 'share' || s.view === 'promote' || s.view === 'import' || s.view === 'graph') {
      s.view = s.instances.length === 0 ? 'initial' : 'canvas'
      recordAction(s, 'close modal')
      return render(s)
    }
    return '(nothing to go back from)\n\n' + render(s)
  }

  if (cmd === 'key') {
    const k = arg.toLowerCase()
    if (k === 'esc' || k === 'escape') return handle(s, ['back'])
    if (k === 'enter' && s.inlineRename !== null) {
      recordAction(s, `commit rename instance ${s.inlineRename}`)
      s.inlineRename = null
      return render(s)
    }
    if (k === '/') {
      return '(focus moved to search field — use `type "<text>"` to enter a query)\n\n' + render(s)
    }
    return `(key "${arg}" — not implemented in sim)\n\n` + render(s)
  }

  if (cmd === 'type') {
    // form: type "<field>" "<text>"
    const m = arg.match(/^"?([^"]+)"?\s+"?([^"]*)"?$/)
    if (!m) {
      // assume search if unparseable
      s.search = arg.replace(/^"|"$/g, '')
      recordAction(s, `type search "${s.search}"`)
      return render(s)
    }
    const [, field, text] = m
    const f = field.toLowerCase()
    if (f.includes('search')) {
      s.search = text
      recordAction(s, `type search "${text}"`)
      return render(s)
    }
    if (s.paramEdit !== null) {
      const inst = s.instances[s.paramEdit.instanceIdx]
      const p = (RECIPE_PARAMS[inst.recipe] ?? []).find((p) => p.key === s.paramEdit!.param)
      if (p?.kind === 'number') inst.params[s.paramEdit.param] = Number(text)
      else if (p?.kind === 'label-list') inst.params[s.paramEdit.param] = text.split(',').map((x) => x.trim()).filter(Boolean)
      else inst.params[s.paramEdit.param] = text
      recordAction(s, `set ${inst.name}.${s.paramEdit.param} = "${text}"`)
      s.paramEdit = null
      return render(s)
    }
    if (s.inlineRename !== null) {
      s.instances[s.inlineRename].name = text
      recordAction(s, `rename to "${text}"`)
      s.inlineRename = null
      return render(s)
    }
    if (s.elementDrawerFor !== null) {
      const e = s.instances[s.elementDrawerFor.instanceIdx].extras[s.elementDrawerFor.elemIdx]
      if (f in e.fields) {
        const cur = e.fields[f]
        e.fields[f] = Array.isArray(cur) ? text.split(',').map((x) => x.trim()) : text
        recordAction(s, `set ${e.name}.${f} = "${text}"`)
        return render(s)
      }
      return `(no field "${field}" on this element — fields are: ${Object.keys(e.fields).join(', ')})\n\n` + render(s)
    }
    return `(don't know where to type "${text}" — no active field)\n\n` + render(s)
  }

  if (cmd === 'click') {
    const target = arg.replace(/^"|"$/g, '').trim()
    const t = target.toLowerCase()

    // top bar
    if (t === 'browse' || t === 'browse ▾' || t === 'browse ▾ button' || t === 'browse button') {
      s.view = 'library_modal'
      recordAction(s, 'open Browse')
      return render(s)
    }
    if (t === '+ element' || t === '+ element ▾' || t === 'element' || t === 'add element top') {
      s.elementPickerOpen = true
      recordAction(s, 'open + Element')
      return render(s)
    }
    if (t === '⋯' || t === 'overflow' || t === '⋯ button') {
      s.overflowMenuOpen = !s.overflowMenuOpen
      recordAction(s, 'toggle ⋯')
      return render(s)
    }
    if (t === '⚙' || t === 'settings' || t === 'gear') {
      s.view = 'settings'
      s.overflowMenuOpen = false
      recordAction(s, 'open Settings')
      return render(s)
    }
    if (t === '↶' || t === 'undo') {
      recordAction(s, 'undo')
      return '(undo invoked — state unwound 1 step in real studio; sim does not model granular undo)\n\n' + render(s)
    }
    if (t === '↷' || t === 'redo') {
      return '(redo)\n\n' + render(s)
    }
    if (t === 'history' || t === 'history…' || t === 'history menu') {
      s.view = 'history'
      s.overflowMenuOpen = false
      recordAction(s, 'open History')
      return render(s)
    }
    if (t === 'share') { s.view = 'share'; s.overflowMenuOpen = false; recordAction(s, 'open Share'); return render(s) }
    if (t === 'graph') { s.view = 'graph'; s.overflowMenuOpen = false; recordAction(s, 'open Graph'); return render(s) }
    if (t === 'import') { s.view = 'import'; s.overflowMenuOpen = false; recordAction(s, 'open Import'); return render(s) }

    // element picker selection
    if (s.elementPickerOpen) {
      const kind = ({
        variable: 'variable',
        classifier: 'classifier',
        generator: 'generator',
        'content rule': 'rule',
        rule: 'rule',
        function: 'function',
      } as Record<string, ElementKind>)[t]
      if (kind) {
        s.elementPickerOpen = false
        let target = s.focusedInstance
        if (target === null) {
          // create a Custom block
          const custom = instantiateRecipe('Custom')!
          s.instances.push(custom)
          target = s.instances.length - 1
          s.focusedInstance = target
          s.view = 'canvas'
          recordAction(s, 'create Custom block (no focus)')
        }
        const el = emptyElement(kind, s.instances[target])
        s.instances[target].extras.push(el)
        s.instances[target].expanded = true
        s.elementDrawerFor = { instanceIdx: target, elemIdx: s.instances[target].extras.length - 1 }
        recordAction(s, `add ${kind} "${el.name}" to ${s.instances[target].name}`)
        return render(s)
      }
    }

    // filter chips
    if (['all', 'atoms', 'bundles', 'custom'].includes(t)) {
      s.filter = (t[0].toUpperCase() + t.slice(1)) as State['filter']
      recordAction(s, `filter: ${s.filter}`)
      return render(s)
    }

    // recipe card click → instantiate
    const recipe = findRecipe(target)
    if (recipe) {
      const inst = instantiateRecipe(recipe.name)
      if (inst) {
        s.instances.push(inst)
        s.focusedInstance = s.instances.length - 1
        s.view = 'canvas'
        recordAction(s, `add ${recipe.name}`)
        return render(s)
      }
    }

    // JSON footer
    if (t === 'json' || t === '▶ json' || t === '▼ json') {
      s.jsonOpen = !s.jsonOpen
      recordAction(s, `JSON ${s.jsonOpen ? 'open' : 'close'}`)
      return render(s)
    }

    // + Add element inside a block (assumes focused or only-instance)
    if (t === '+ add element' || t === 'add element' || t === '+ add element ▾') {
      s.elementPickerOpen = true
      recordAction(s, 'open + Add element (block-level)')
      return render(s)
    }

    // + Add recipe
    if (t === '+ add recipe' || t === '+ add recipe…' || t === 'add recipe') {
      s.view = 'library_modal'
      recordAction(s, 'open + Add recipe library')
      return render(s)
    }

    // instance-targeted actions: "expand <name>", "collapse <name>", "rename <name>", "remove <name>", "menu <name>"
    const matchInst = (s2: State, q: string) => {
      const ql = q.trim().toLowerCase()
      const idx = s2.instances.findIndex((i) => i.name.toLowerCase() === ql)
      if (idx >= 0) return idx
      // fallback: first instance
      return s2.instances.length === 1 ? 0 : -1
    }

    if (t.startsWith('expand ') || t.startsWith('collapse ') || t === 'expand' || t === 'collapse' || t === '▶' || t === '▼') {
      const targetName = t.replace(/^(expand|collapse|▶|▼)\s*/, '').trim()
      const idx = targetName ? matchInst(s, targetName) : (s.focusedInstance ?? 0)
      if (idx >= 0) {
        s.instances[idx].expanded = !s.instances[idx].expanded
        s.focusedInstance = idx
        recordAction(s, `${s.instances[idx].expanded ? 'expand' : 'collapse'} ${s.instances[idx].name}`)
        return render(s)
      }
    }

    // block ⋯ menu
    if (t.startsWith('block menu ') || t.startsWith('block ⋯ ')) {
      const targetName = t.replace(/^(block menu|block ⋯)\s*/, '').trim()
      const idx = matchInst(s, targetName)
      if (idx >= 0) { s.blockMenuFor = idx; recordAction(s, `open block menu ${s.instances[idx].name}`); return render(s) }
    }

    // block menu items
    if (s.blockMenuFor !== null) {
      const idx = s.blockMenuFor
      if (t === 'rename') { s.inlineRename = idx; s.blockMenuFor = null; recordAction(s, 'rename'); return render(s) }
      if (t === 'duplicate') {
        s.instances.splice(idx + 1, 0, structuredClone(s.instances[idx]))
        s.instances[idx + 1].name = s.instances[idx].name + ' copy'
        s.blockMenuFor = null
        recordAction(s, 'duplicate')
        return render(s)
      }
      if (t === 'remove') {
        recordAction(s, `remove ${s.instances[idx].name}`)
        s.instances.splice(idx, 1)
        s.blockMenuFor = null
        s.focusedInstance = null
        if (s.instances.length === 0) s.view = 'initial'
        return render(s)
      }
      if (t === 'promote to recipe' || t === 'promote to recipe…') { s.view = 'promote'; s.blockMenuFor = null; recordAction(s, 'open Promote'); return render(s) }
      if (t === 'export as url') { return '(URL copied — not modeled)\n\n' + render(s) }
    }

    // inline-rename activation
    if (t.startsWith('name ') || t.startsWith('instance name ')) {
      const targetName = t.replace(/^(instance name|name)\s*/, '').trim()
      const idx = matchInst(s, targetName)
      if (idx >= 0) { s.inlineRename = idx; recordAction(s, `start rename ${s.instances[idx].name}`); return render(s) }
    }

    // param edit
    if (t.startsWith('param ')) {
      const rest = t.replace('param ', '').trim()
      const idx = s.focusedInstance ?? 0
      if (s.instances[idx]) {
        s.paramEdit = { instanceIdx: idx, param: rest }
        recordAction(s, `edit param ${rest}`)
        return render(s)
      }
    }

    // element row click
    if (t.startsWith('element ')) {
      const elemName = t.replace('element ', '').trim()
      const instIdx = s.focusedInstance ?? 0
      const elemIdx = s.instances[instIdx]?.extras.findIndex((e) => e.name.toLowerCase() === elemName)
      if (elemIdx !== undefined && elemIdx >= 0) {
        s.elementDrawerFor = { instanceIdx: instIdx, elemIdx }
        recordAction(s, `open drawer ${elemName}`)
        return render(s)
      }
    }

    return `(don't know what to do with "click ${target}" — try: a recipe name from the library, "+ Element", "⋯", "Browse", "settings", "expand <name>", "block menu <name>", "param <key>", "element <name>", "json", "+ Add element")\n\n` + render(s)
  }

  if (cmd === 'help' || !cmd) {
    return [
      'Commands:',
      '  reset                       — clear state',
      '  show                        — print current screen',
      '  click "<target>"            — click a button / card / row',
      '  type "<field>" "<text>"     — type text into a field',
      '  type "<text>"               — types into the most recent focus',
      '  key "<key>"                 — Esc, Enter, /, etc',
      '  back                        — Esc-equivalent / close overlay',
      '',
      'Common clickable targets:',
      '  Browse · + Element · ⋯ · ⚙ · ↶ · ↷ · JSON',
      '  <recipe name>  (e.g. HP Tracker, Counter, Mood Companion)',
      '  All · Atoms · Bundles · Custom',
      '  Variable · Classifier · Generator · Content Rule · Function   (after + Element)',
      '  expand <instance-name>   collapse <instance-name>',
      '  block menu <instance-name>',
      '  Rename · Duplicate · Promote to recipe · Remove   (in block menu)',
      '  name <instance-name>     (begin inline rename)',
      '  param <param-key>        (begin param edit)',
      '  + Add element            (within focused block)',
      '  element <element-name>   (open drawer)',
      '',
      'Use `show` again any time to redraw.',
    ].join('\n')
  }

  return `unknown command: ${cmd}\n\n` + render(s)
}

const args = process.argv.slice(2)
const state = loadState()
const out = handle(state, args)
saveState(state)
console.log(out)
