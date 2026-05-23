# statosphere-studio

Best-in-class editor for [Statosphere](https://github.com/Lord-Raven/statosphere) stage configurations.

## Dev

```bash
bun install
bun run dev          # SPA dev server
bun run build        # Build SPA + library
bun run typecheck    # Type check
```

## Embed as library

```ts
import { StatosphereStudio } from 'statosphere-studio'
```

Vue must be externalized (not bundled).
