# statosphere-studio

Best-in-class editor for [Statosphere](https://github.com/Lord-Raven/statosphere) stage configurations.

## Architecture (v2)

A single canvas of **recipe instances** replaces the old tabbed layout. Each recipe encapsulates a reusable configuration pattern (HP Tracker, Inventory, etc.) with typed parameters. The canvas materializes all instances into the five Statosphere schema arrays (variables / classifiers / generators / contentRules / functions), which is what gets pasted into Chub.

Key modules:
- `src/recipes/` — recipe type model, builtin registry, materialize pipeline
- `src/stores/recipes.ts` — Pinia store: instances + custom library, persisted to localStorage
- `src/stores/config.ts` — derived store: computed projection of materialized instances
- `src/share/encode.ts` — `#cfg=` hash codec (gzip + base64url); v2.5 carries a studio sidecar (instances + customLibrary) so shared URLs restore the full recipe structure
- `src/share/hydrate.ts` — hash hydration on page load; v1 plain-config payloads are wrapped as a Custom recipe

## Dev

```bash
bun install
bun run dev              # SPA dev server
bun run build            # Build SPA + library
bun run typecheck        # Type check
bun run validate-recipes # Validate all builtin recipes against upstream schemas
```

## Embed as library

```html
<StatosphereStudio embedded template="hp-tracker" />
```

Pass any builtin recipe id as `template` to pre-load an instance. Unknown ids render an empty studio with a console warning.

```ts
import { StatosphereStudio } from '@pterror/statosphere-studio'
import '@pterror/statosphere-studio/dist/style.css'
```

Vue and Pinia must be externalized (not bundled).
