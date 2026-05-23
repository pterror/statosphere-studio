# CLAUDE.md

Behavioral rules for Claude Code in the statosphere-studio repository.

## Origin

Statosphere stages are configured via five JSON arrays — variables, functions, classifiers, generators, content rules — each with its own schema. The existing Statosphere UI exposes these as raw JSON inputs, which is adequate but hostile to new users and error-prone for complex stages.

Statosphere Studio is a best-in-class editor for that configuration surface. Four differentiators:

1. **Built-in help** — every field has inline descriptions sourced from the upstream schemas and the statosphere-guide.
2. **Recipes** — composable, parameterized configuration patterns (HP Tracker, Inventory, etc.) that materialize into the five schema arrays. The canvas is a stream of recipe instances.
3. **Shareable URLs** — the `#cfg=` hash encodes the full studio state (instances + custom library) via gzip + base64url so a stage configuration can be shared as a link with no backend.
4. **Embeddable** — the statosphere-guide embeds `<StatosphereStudio embedded template="hp-tracker">` via the library build; the `template` prop maps to a builtin recipe id.

Dual output: SPA deployed to GitHub Pages for standalone use; Vue library (`dist/statosphere-studio.es.js`) for embedding in statosphere-guide via global component registration.

## Architecture (v2)

- `src/recipes/types.ts` — RecipeDef / RecipeInstance model; ParamSpec, SchemaArrays
- `src/recipes/builtins/` — 10 builtin recipes + custom freeform bucket
- `src/recipes/materialize.ts` — `materializeInstances()`: applies params, pins, extras, prefixes; honors `stripPrefixOnExport`
- `src/stores/recipes.ts` — Pinia store: instances + custom library, persisted to localStorage
- `src/stores/config.ts` — derived store: computed projection of materialized instances; drives Ajv validation
- `src/components/StreamCanvas.vue` — recipe-instance stream; RecipeBlock per instance
- `src/share/encode.ts` — `#cfg=` hash codec; v2.5 wire format: `{ config, sidecar: { instances, customLibrary } }` (plain ConfigTree = legacy v1 import, wrapped as Custom recipe)
- `src/share/hydrate.ts` — hash hydration on page load; restores sidecar or wraps legacy plain-config
- `schemas/` — vendored upstream schemas; `upstream-commit.txt` tracks the pin
- `scripts/validate-recipes.ts` — materializes each builtin with default params and Ajv-validates all sections

## Development

```bash
nix develop
bun install
bun run dev          # SPA dev server
bun run build        # Build SPA + library
bun run typecheck    # Type check
```

If a tool appears missing, you are outside `nix develop`.

## Commit Convention

Conventional commits: `type(scope): message`

## Hard Constraints

- No `--no-verify`. Fix the issue or fix the hook.
- No interactive git commands.
- No assuming a tool is missing without checking `nix develop`.
