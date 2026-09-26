# Contributing to convrtr

convrtr is a typography-first, brutalist technical instrument for client-side file conversion. Contributions are welcome, provided they preserve the repository invariants.

---

## Core Invariant

The architectural rule for all converters:

> Adding a conversion touches only `src/core/registry` (and, if introducing a new codec, `src/core/engines`) — never `src/app`.

Every tool is declared as a typed configuration conforming to `ToolSchema`. Formats, presets, descriptions, and engines are parsed at build time and dynamically routed.

---

## Design and Style Policies

### 1. Strict Policy: Zero Emojis
- NEVER use emojis in UI, product copy, button labels, chips, badges, tooltips, dialogs, or menus.
- NEVER use emojis in code, console logs, build scripts, comments, or terminal output.
- NEVER use emojis in documentation, store listings, commit messages, or PR descriptions.
- convrtr is a brutalist, typography-first, Dieter Rams-inspired technical instrument. Use clean uppercase monospace text, simple geometric arrows (`↗`, `->`, `^`), or minimalist monochrome SVGs when indicators are required.

### 2. Zero Network Exfiltration Invariant
Under no circumstances may any file bytes or telemetric payloads leave the browser. All conversion tasks must execute inside local Web Workers or WebAssembly instances.

---

## Local Development Workflow

```bash
# 1. Install dependencies
pnpm install

# 2. Run local development server
pnpm dev

# 3. Run typechecking
pnpm typecheck

# 4. Run linter and formatter (Biome)
pnpm lint

# 5. Run unit tests (Vitest)
pnpm test

# 6. Run the complete CI verification gate
pnpm ci
```

All pull requests must pass `pnpm ci` before merging.

---

## Adding a New Converter

1. Create a declarative tool specification in `src/core/registry/tools/<category>/<tool-id>.ts`.
2. Define accepted extensions, output extension, MIME types, and quality presets.
3. If the codec engine exists in `src/core/engines`, reference it in the `engines` array.
4. If a new WebAssembly or WebCodecs adapter is required, implement it inside `src/core/engines/<engine-name>/`.
5. Export the new tool in `src/core/registry/index.ts`.
6. Run `pnpm test` to verify MIME parity, category assignment, and streamable conformity.
