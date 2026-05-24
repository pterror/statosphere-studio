# TODO

## Affordance polish (post-P10)

Surfaced by two roleplay-sim rounds (layperson + naive) against the actual studio surface. Every item here is **affordance-only** — making existing capabilities self-evident, not adding tutorials or explanations. Items survive any future IA redo.

### Done (commits `6325b32` → `7d49dc2`)

- [x] **Pin affordance** — `6325b32`
- [x] **Inline rename cue** — `6325b32`
- [x] **Drag-target telegraphy at rest** — `6325b32`
- [x] **Drag-handle glyph review** — `6325b32` (block: `⠿⠿`, element: `⠿`)
- [x] **Empty-block interior is an invitation, not a notice** — `2e2daa0`
- [x] **Success/failure feedback channel** — `7d49dc2`
- [x] **Validity dot expansion** — `7d49dc2`

### Deferred — IA work in disguise

- [ ] **Recipe card preview-before-place.** Likely subsumed by IA redo that gives cards more shape.
- [ ] **Wire-target hints on placed atoms.** Making composition visible is closer to a structural IA shift than a polish item. Hold until IA direction is set.

### Maybe (re-evaluate after IA redo)

- [ ] Recipe vs stage vocabulary — pending IA work.
- [ ] JSON footer label change — depends on whether IA keeps a raw-config view.
- [ ] Atoms / Bundles distinction surfacing — may not exist post-IA.
- [ ] Unifying `+ Element` / `+ Add element` / `+ Add recipe…` — IA work.

### Don't (yet)

- Preview / Simulate engine — engineering project, not affordance work.
- Concept tutorials, intro overlays, walkthroughs — explicitly out per design call ("spoonfeeding is what makes a game tutorial shit").

## P1–P10 polish

Shipped on commits `379cc17` → `a158c70`. Not yet pushed pending decision on whether to bundle with this affordance round.

## UI Audit findings (Playwright + axe-core)

Harness: `scripts/audit-ui.ts`. Runs automatically in fast mode (3 steps, ~8s) on pre-commit. Full run: `bun run audit:ui:full`.

### Fixed (this commit)

- **Critical bug: `structuredClone` on Vue reactive proxies** — `toRaw()` only unwraps one layer; nested reactive objects in `extrasByPath`, `params`, and template/arrays were passed directly to `structuredClone` in `materialize.ts`, `rewrite-refs.ts`, `json-patch.ts`. All calls replaced with `cloneJson()` (JSON round-trip). This caused a page-level exception when adding any recipe from the modal, leaving the modal open and breaking all subsequent interactions.
- **Missing `aria-label` on param inputs** — `RecipeBlock.vue` and `ComposedChildBlock.vue` param inputs (number, string, enum) now carry `:aria-label="p.label"`. `ChipList` "add" input gets a `label` prop and `aria-label="Add {label}"`.
- **Missing `aria-label` on search inputs** — `RecipeLibrary.vue` search, `HistoryBrowser.vue` search, `JsonFooter.vue` textarea, `SettingsModal.vue` prefix input, `HistoryBrowser.vue` rename input.
- **`aria-required-parent` on history rows** — `role="option"` items in `HistoryBrowser.vue` lacked a `role="listbox"` parent. Fixed.
- **`scrollable-region-focusable` on history preview panel** — Added `tabindex="0"` and `aria-label` to the scrollable JSON preview pane.

### Deferred (axe `serious`, non-blocking)

- **`nested-interactive`** — `RecipeBlock` and `ComposedChildBlock` headers use `role="button"` on a div that also contains other interactive elements (grip, rename input, ⋯ button). Fixing this requires splitting the header into a collapse-only affordance + a separate row for inline controls — IA-level structural change.
- **`aria-hidden-focus`** — Reka-UI dropdown component puts `aria-hidden` on a portal element that still contains focusable items. Third-party library issue; needs upstream fix or workaround.
- **`color-contrast`** — `text-gray-500`/`text-gray-600` on dark backgrounds fails WCAG AA. Systematic design-system issue; requires a color-palette audit pass across the whole app.
- **`landmark-one-main`, `page-has-heading-one`, `region`** — App is a single-page tool without document structure. These are cosmetic/contextual violations; the studio is not a document.
