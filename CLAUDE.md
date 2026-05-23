# CLAUDE.md

Behavioral rules for Claude Code in the statosphere-studio repository.

## Origin

Statosphere stages are configured via five JSON arrays — variables, functions, classifiers, generators, content rules — each with its own schema. The existing Statosphere UI exposes these as raw JSON inputs, which is adequate but hostile to new users and error-prone for complex stages.

Statosphere Studio is a best-in-class editor for that configuration surface. Four differentiators:

1. **Built-in help** — every field has a help rail sourced from the upstream schema descriptions and extended guide prose. Users never need to leave the editor to understand a field.
2. **Templates** — curated starter configurations for common stage patterns (emotion tracking, memory, image generation). One click to bootstrap a working stage.
3. **Shareable saves** — the full configuration encodes to a URL-safe string (fflate + base64url) so a stage can be shared as a link with no backend.
4. **fflate URL hotlinks** — the statosphere-guide site embeds StatosphereStudio as a Vue library component, with deep links that open the editor pre-loaded with the guide's example configurations.

Dual output: SPA deployed to GitHub Pages for standalone use; Vue library (`dist/statosphere-studio.es.js`) for embedding in statosphere-guide via global component registration.

## Architecture

- `src/stores/config.ts` — pinia store: config tree, dirty flag, per-field validation errors
- `src/components/StatosphereStudio.vue` — root component, exported from lib
- `src/components/sections/` — one section component per element type
- `schemas/` — vendored upstream schemas; `upstream-commit.txt` tracks the pin

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
