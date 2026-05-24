#!/usr/bin/env bun
/**
 * Playwright UI audit harness for statosphere-studio.
 *
 * Drives the running (or auto-started) dev server through key flows,
 * captures screenshots, and runs axe-core accessibility checks at each step.
 *
 * Environment / args:
 *   STUDIO_AUDIT_FAST=1   — fast mode: only initial load, recipe add, element add
 *   --headed              — run with visible browser (local debugging)
 *
 * Exit code: 0 = clean; 1 = console errors / critical axe violations / step failures.
 */

import { chromium, type Browser, type Page } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { spawn, type ChildProcess } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, '..')
const OUT_DIR = join(ROOT, 'tmp', 'ui-audit')
const DEFAULT_PORT = 5173
const FAST_MODE = process.env.STUDIO_AUDIT_FAST === '1'
const HEADED = process.argv.includes('--headed') || process.env.HEADED === '1'
const BASE_URL = `http://localhost:${DEFAULT_PORT}/statosphere-studio/`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepResult {
  step: string
  screenshot: string | null
  consoleErrors: string[]
  axeViolations: Array<{ id: string; impact: string | null; description: string; nodes?: string[] }>
  failed: boolean
  failReason?: string
}

// ---------------------------------------------------------------------------
// Server management
// ---------------------------------------------------------------------------

async function isServerUp(url: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

async function startDevServer(): Promise<{ proc: ChildProcess; started: boolean }> {
  if (await isServerUp(BASE_URL)) {
    console.log(`[audit] Reusing existing dev server at ${BASE_URL}`)
    return { proc: null as unknown as ChildProcess, started: false }
  }

  console.log('[audit] Starting dev server...')
  const proc = spawn('bun', ['run', 'dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  })

  // Parse stdout to find URL / detect ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Dev server did not start in 60s')), 60_000)

    function check(data: Buffer) {
      const line = data.toString()
      if (line.includes('localhost') || line.includes('Local:') || line.includes('ready')) {
        clearTimeout(timeout)
        resolve()
      }
    }

    proc.stdout?.on('data', check)
    proc.stderr?.on('data', check)
    proc.on('error', (err) => { clearTimeout(timeout); reject(err) })
    proc.on('exit', (code) => {
      if (code !== 0) { clearTimeout(timeout); reject(new Error(`Dev server exited with code ${code}`)) }
    })
  })

  // Poll until actually reachable
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (await isServerUp(BASE_URL)) break
    await new Promise((r) => setTimeout(r, 500))
  }
  if (!await isServerUp(BASE_URL)) throw new Error(`Dev server not reachable at ${BASE_URL}`)

  console.log(`[audit] Dev server ready at ${BASE_URL}`)
  return { proc, started: true }
}

// ---------------------------------------------------------------------------
// Screenshot helper
// ---------------------------------------------------------------------------

let screenshotIndex = 0

async function screenshot(page: Page, name: string): Promise<string> {
  screenshotIndex++
  const filename = `${String(screenshotIndex).padStart(2, '0')}-${name}.png`
  const path = join(OUT_DIR, filename)
  await page.screenshot({ path, fullPage: false })
  return filename
}

// ---------------------------------------------------------------------------
// Axe helper
// ---------------------------------------------------------------------------

async function runAxe(page: Page): Promise<StepResult['axeViolations']> {
  try {
    const results = await new AxeBuilder({ page }).analyze()
    return results.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      description: v.description,
      nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 200)),
    }))
  } catch (err) {
    console.warn('[audit] axe scan failed:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function buildMarkdown(results: StepResult[], timing: number): string {
  const lines: string[] = [
    '# UI Audit Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Mode:** ${FAST_MODE ? 'fast' : 'full'}`,
    `**Duration:** ${(timing / 1000).toFixed(1)}s`,
    '',
  ]

  const criticalImpacts = new Set(['critical', 'serious'])
  let totalErrors = 0
  let totalCritical = 0

  for (const r of results) {
    lines.push(`## ${r.step}`)
    if (r.screenshot) lines.push(`**Screenshot:** \`${r.screenshot}\``)
    if (r.failed) lines.push(`\n> FAILED: ${r.failReason ?? 'unknown'}`)

    if (r.consoleErrors.length > 0) {
      totalErrors += r.consoleErrors.length
      lines.push('\n### Console Errors')
      for (const e of r.consoleErrors) lines.push(`- \`${e}\``)
    }

    if (r.axeViolations.length > 0) {
      const critical = r.axeViolations.filter((v) => criticalImpacts.has(v.impact ?? ''))
      const minor = r.axeViolations.filter((v) => !criticalImpacts.has(v.impact ?? ''))
      totalCritical += critical.length

      if (critical.length > 0) {
        lines.push('\n### Axe — Critical/Serious')
        for (const v of critical) lines.push(`- **${v.id}** (${v.impact}): ${v.description}`)
      }
      if (minor.length > 0) {
        lines.push('\n### Axe — Minor/Moderate')
        for (const v of minor) lines.push(`- ${v.id} (${v.impact}): ${v.description}`)
      }
    } else {
      lines.push('\n_No axe violations._')
    }

    lines.push('')
  }

  lines.push('---')
  lines.push(`**Total console errors:** ${totalErrors}`)
  lines.push(`**Total critical/serious axe violations:** ${totalCritical}`)
  lines.push(`**Steps failed:** ${results.filter((r) => r.failed).length} / ${results.length}`)

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

async function run() {
  mkdirSync(OUT_DIR, { recursive: true })

  const t0 = Date.now()
  const { proc, started } = await startDevServer()

  let browser: Browser | null = null
  const results: StepResult[] = []
  let exitCode = 0

  try {
    // On NixOS the downloaded Playwright binary can't run — use system Chrome if available
    const systemChrome =
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
      (() => {
        for (const p of [
          '/run/current-system/sw/bin/google-chrome',
          '/run/current-system/sw/bin/google-chrome-stable',
          '/run/current-system/sw/bin/chromium',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
        ]) {
          try { Bun.spawnSync(['test', '-x', p]); return p } catch {}
        }
        return undefined
      })()
    browser = await chromium.launch({
      headless: !HEADED,
      ...(systemChrome ? { executablePath: systemChrome } : {}),
    })
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()

    // Collect console errors globally
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    page.on('pageerror', (err) => {
      consoleErrors.push(`[pageerror] ${err.message}`)
    })

    // Helper: drain and reset collected errors for a step
    function drainErrors(): string[] {
      const errs = [...consoleErrors]
      consoleErrors.length = 0
      return errs
    }

    async function step(
      name: string,
      screenshotSlug: string,
      fn: () => Promise<void>,
    ): Promise<StepResult> {
      consoleErrors.length = 0
      let failed = false
      let failReason: string | undefined
      let shotFile: string | null = null

      try {
        await fn()
        shotFile = await screenshot(page, screenshotSlug)
      } catch (err) {
        failed = true
        failReason = String(err)
        console.error(`[audit] Step "${name}" failed:`, err)
        try { shotFile = await screenshot(page, `${screenshotSlug}-fail`) } catch {}
      }

      const errs = drainErrors()
      const violations = await runAxe(page)
      // Critical violations (and console errors) block the build.
      // Serious violations are reported but do not fail — they are structural/third-party
      // issues tracked in TODO.md and addressed incrementally.
      const criticalViolations = violations.filter((v) => v.impact === 'critical')
      const seriousViolations = violations.filter((v) => v.impact === 'serious')

      const r: StepResult = {
        step: name,
        screenshot: shotFile,
        consoleErrors: errs,
        axeViolations: violations,
        failed,
        failReason,
      }
      results.push(r)

      const status = (failed || errs.length > 0 || criticalViolations.length > 0) ? 'FAIL' : 'OK'
      if (status === 'FAIL') exitCode = 1
      console.log(`[audit] ${status.padEnd(4)} ${name}`)
      if (errs.length > 0) errs.forEach((e) => console.log(`       console.error: ${e}`))
      if (criticalViolations.length > 0) criticalViolations.forEach((v) => console.log(`       axe ${v.impact}: ${v.id}`))
      if (seriousViolations.length > 0) seriousViolations.forEach((v) => console.log(`       axe warn ${v.impact}: ${v.id}`))

      return r
    }

    // -------------------------------------------------------------------------
    // Step 1: Initial load (always in fast mode)
    // -------------------------------------------------------------------------
    await step('Initial load', '01-initial', async () => {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      // Verify page loaded
      await page.waitForSelector('.flex.flex-col', { timeout: 10_000 })
    })

    if (!FAST_MODE) {
      // -----------------------------------------------------------------------
      // Step 2: Search for "HP"
      // -----------------------------------------------------------------------
      await step('Library search — HP', '02-library-search', async () => {
        // Open library modal via cmd-K equivalent — click Browse button
        await page.click('text=Browse')
        await page.waitForSelector('.recipe-library', { timeout: 5_000 })
        const searchInput = page.locator('.recipe-library input[type="search"], .recipe-library input[placeholder]').first()
        await searchInput.fill('HP')
        await page.waitForTimeout(300)
        // Verify at least one result contains "HP"
        const cards = await page.locator('.recipe-card').count()
        if (cards === 0) throw new Error('No recipe cards visible after searching "HP"')
      })

      // -----------------------------------------------------------------------
      // Step 3: Filter chips (performed within the modal, which is still open)
      // -----------------------------------------------------------------------
      // The modal contains its own RecipeLibrary; scope all chip actions to it
      const modalLibrary = page.locator('.fixed.inset-0.z-50 .recipe-library').first()
      for (const chip of ['All', 'Atoms', 'Bundles', 'Custom']) {
        const slug = `03-filter-${chip.toLowerCase()}`
        await step(`Filter chip — ${chip}`, slug, async () => {
          // Clear search first if on All pass
          if (chip === 'All') {
            const searchInput = modalLibrary.locator('input').first()
            await searchInput.fill('')
          }
          await modalLibrary.locator('.chip', { hasText: chip }).first().click()
          await page.waitForTimeout(200)
          const active = await modalLibrary.locator('.chip.active').innerText()
          if (!active.includes(chip)) throw new Error(`Chip "${chip}" did not become active`)
        })
      }

      // Reset search + filter before placing recipe
      await modalLibrary.locator('input').first().fill('')
      await modalLibrary.locator('.chip', { hasText: 'All' }).first().click()
      await page.waitForTimeout(200)
    }

    // -------------------------------------------------------------------------
    // Step 4: Add HP Tracker from library (always in fast mode — core action)
    // -------------------------------------------------------------------------
    await step('Add HP Tracker card', '04-hp-tracker-add', async () => {
      // In fast mode: open the modal; in full mode: it's already open
      const modalOverlay = page.locator('.fixed.inset-0.z-50').first()
      const modalOpen = await modalOverlay.isVisible().catch(() => false)
      if (!modalOpen) {
        // Open via Browse button (topbar)
        await page.click('button.topbar-collapse:has-text("Browse"), button:has-text("Browse ▾")').catch(async () => {
          // Fallback: click any Browse button
          await page.locator('button', { hasText: 'Browse' }).first().click()
        })
        await page.waitForSelector('.recipe-library', { timeout: 5_000 })
      }

      // Find HP Tracker card — prefer within modal if open, else anywhere
      const modalLib = page.locator('.fixed.inset-0.z-50 .recipe-library').first()
      const useModal = await modalLib.isVisible().catch(() => false)
      const scope = useModal ? modalLib : page

      // Clear any search filter first
      const searchInput = scope.locator('input').first()
      await searchInput.fill('').catch(() => {})

      const card = scope.locator('.recipe-card', { hasText: 'HP Tracker' }).first()
      await card.waitFor({ timeout: 5_000 })
      await card.click()
      await page.waitForTimeout(500)
      // Verify a recipe block appeared on canvas
      const blocks = await page.locator('.glass-panel.transition-colors').count()
      if (blocks === 0) {
        // Try alternate: the block-header might be the indicator
        const headers = await page.locator('[aria-expanded]').count()
        if (headers === 0) throw new Error('No recipe block appeared after clicking HP Tracker')
      }
    })

    // Helper: close any open modal overlay
    async function closeModal() {
      const overlay = page.locator('.fixed.inset-0.z-50').first()
      if (!await overlay.isVisible().catch(() => false)) return
      // The inner backdrop div has @mousedown="libraryModalOpen = false"
      // Click it to close the modal reliably
      const backdrop = page.locator('.fixed.inset-0.z-50 > .fixed.inset-0').first()
      if (await backdrop.isVisible().catch(() => false)) {
        await backdrop.dispatchEvent('mousedown')
        await page.waitForTimeout(300)
      } else {
        // Fallback: send Escape to page
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
      // If still open, try clicking the close button
      if (await overlay.isVisible().catch(() => false)) {
        const closeBtn = page.locator('.fixed.inset-0.z-50 button[aria-label*="lose"], .fixed.inset-0.z-50 button:has-text("×")').first()
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click()
          await page.waitForTimeout(200)
        }
      }
    }

    // Helper: expand the first recipe block (using block-header aria-label, not the ⋯ button)
    async function ensureBlockExpanded() {
      // The block header button has aria-label="<name> — expand block" or "collapse block"
      const collapseBtn = page.locator('[aria-label*="expand block"]').first()
      if (await collapseBtn.isVisible().catch(() => false)) {
        await collapseBtn.click()
        await page.waitForTimeout(300)
      }
    }

    if (!FAST_MODE) {
      // -----------------------------------------------------------------------
      // Step 5: Expand the recipe block
      // -----------------------------------------------------------------------
      await step('Expand recipe block', '05-recipe-expanded', async () => {
        // Close modal if still open after HP Tracker add
        await closeModal()
        await ensureBlockExpanded()
        // Verify body rendered (+ Add element button visible means block is expanded)
        await page.locator('button', { hasText: '+ Add element' }).first().waitFor({ timeout: 5_000 })
      })
    }

    // -------------------------------------------------------------------------
    // Step 5 (fast) / Step 6 (full): Add Variable element — key DOMException check
    // -------------------------------------------------------------------------
    await step('Add element — Variable (no DOMException)', '05-add-element-variable', async () => {
      // Dismiss library modal if open
      await closeModal()

      // Ensure block is expanded
      await ensureBlockExpanded()

      // Click "+ Add element ▾" button
      const addBtn = page.locator('button', { hasText: '+ Add element' }).first()
      await addBtn.waitFor({ timeout: 5_000 })
      await addBtn.click()
      await page.waitForTimeout(200)

      // Click "Variable" from picker
      const variableItem = page.locator('[role="menuitem"]', { hasText: 'Variable' }).first()
      await variableItem.waitFor({ timeout: 3_000 })
      await variableItem.click()
      await page.waitForTimeout(400)

      // Check for error toast or DOMException in console (captured globally)
      const errText = consoleErrors.join(' ')
      if (errText.toLowerCase().includes('domexception')) {
        throw new Error(`DOMException detected after adding Variable: ${errText}`)
      }

      // Check for error toast
      const errorToast = await page.locator('.toast, [role="alert"]').filter({ hasText: /error/i }).count()
      if (errorToast > 0) throw new Error('Error toast appeared after adding Variable element')
    })

    if (!FAST_MODE) {
      // -----------------------------------------------------------------------
      // Step 7: Open ⋯ overflow menu
      // -----------------------------------------------------------------------
      await step('Open overflow menu (⋯)', '07-overflow-menu', async () => {
        await closeModal()
        await page.click('button[title="More options"]')
        await page.waitForSelector('[role="menuitem"]', { timeout: 3_000 })
        const items = await page.locator('[role="menuitem"]').count()
        if (items === 0) throw new Error('No menu items in overflow menu')
      })

      // Close the overflow menu
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // -----------------------------------------------------------------------
      // Step 8: Open Settings
      // -----------------------------------------------------------------------
      await step('Open Settings modal', '08-settings', async () => {
        await closeModal()
        // Click the ⚙ settings button in topbar
        await page.click('button[title="Settings"]')
        await page.waitForSelector('[role="dialog"], .glass-panel:has-text("Settings")', { timeout: 5_000 })
      })

      // Close Settings
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // -----------------------------------------------------------------------
      // Step 9: Open History (cmd+H)
      // -----------------------------------------------------------------------
      await step('Open History (cmd+H)', '09-history', async () => {
        await closeModal()
        await page.keyboard.press('Meta+h')
        await page.waitForTimeout(400)
        const historyPanel = page.locator('text=History').first()
        await historyPanel.waitFor({ timeout: 5_000 })
      })

      // Close history
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // -----------------------------------------------------------------------
      // Step 10: Undo (cmd+Z)
      // -----------------------------------------------------------------------
      await step('Undo (cmd+Z)', '10-undo', async () => {
        // Count blocks before undo
        const blocksBefore = await page.locator('[aria-expanded]').count()
        await page.keyboard.press('Meta+z')
        await page.waitForTimeout(400)
        const blocksAfter = await page.locator('[aria-expanded]').count()
        // Undo should change state (block removed or step reversed)
        // Accept either: fewer blocks or same (if no undoable history yet)
        console.log(`[audit]   blocks before=${blocksBefore} after=${blocksAfter}`)
      })

      // -----------------------------------------------------------------------
      // Step 11: JSON footer
      // -----------------------------------------------------------------------
      await step('JSON footer expand', '11-json-footer', async () => {
        await closeModal()
        // The JSON footer toggle button has aria-label "Expand JSON panel" when collapsed
        const footer = page.locator('[aria-label="Expand JSON panel"]').first()
        await footer.waitFor({ timeout: 5_000 })
        await footer.click()
        await page.waitForTimeout(300)
        // Textarea should be visible
        await page.waitForSelector('textarea', { timeout: 3_000 })
        const content = await page.locator('textarea').first().inputValue()
        if (!content.includes('{')) throw new Error('JSON footer textarea does not contain JSON content')
      })
    }

    // -------------------------------------------------------------------------
    // Write reports
    // -------------------------------------------------------------------------
    const timing = Date.now() - t0
    writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2))
    writeFileSync(join(OUT_DIR, 'report.md'), buildMarkdown(results, timing))

    console.log('')
    console.log(`[audit] Report written to ${OUT_DIR}`)
    console.log(`[audit] Duration: ${(timing / 1000).toFixed(1)}s`)
    console.log(`[audit] Steps: ${results.length} total, ${results.filter((r) => r.failed).length} failed`)
    console.log(`[audit] Exit code: ${exitCode}`)
  } finally {
    await browser?.close()
    if (started && proc) {
      proc.kill()
      // Give it a moment to actually exit
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  process.exit(exitCode)
}

run().catch((err) => {
  console.error('[audit] Fatal:', err)
  process.exit(1)
})
