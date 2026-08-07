# convrtr Spine — Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a statically-exported site where `/image/png-to-webp` converts a real PNG to WebP entirely in-browser — routed, themed, worker-backed, quality-controlled, and provably offline — with every one of those properties generated from a single registry entry.

**Architecture:** A typed registry declares tools as data. Route generation, page metadata, the options UI, and file validation are all derived from that data, so adding a tool means adding one file. Conversion runs in a Web Worker via a ranked engine layer that probes device capability at runtime. Quality is a two-tier control surface: outcome-framed presets over an exhaustive parameter panel.

**Tech Stack:** Next.js 15 (App Router, `output: 'export'`), TypeScript strict, Tailwind v4, Biome, Vitest + happy-dom, Playwright, `@jsquash/*` WASM codecs, zod.

## Global Constraints

- **Zero server.** No API routes, no server actions, no runtime Node. `output: 'export'` only.
- **No file bytes may cross the network.** Enforced by the network-assertion test in Task 14.
- **Lossless is the default** wherever the format supports it; loss is always the user's explicit choice.
- **Every number in the UI is monospace with `tabular-nums`.**
- **Radius never exceeds 4px** except pills. Elevation is a 1px hairline, never a shadow.
- **No gradients, glows, blur, glassmorphism, decorative shadows, emoji icons, or stock illustration.** These are review-rejectable defects.
- **Both themes are first-class.** Contrast: WCAG AA minimum, AAA for body text.
- Minus signs in numeric read-outs use U+2212 (`−`), not a hyphen.
- Node 20+. Package manager: pnpm.

---

### Task 1: Project scaffold, CI gates, and cross-origin isolation

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `biome.json`, `vitest.config.ts`, `vercel.json`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Test: `src/lib/__tests__/smoke.test.ts`, `src/__tests__/deploy-config.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a working `pnpm test`, `pnpm build`, `pnpm lint`; `vercel.json` carrying the COOP/COEP headers every later task depends on for `SharedArrayBuffer`.

- [ ] **Step 1: Scaffold and install**

```bash
cd /Users/mreshank/Dev/convrtr
pnpm dlx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-pnpm --eslint=false --turbopack
pnpm add zod
pnpm add -D vitest @vitejs/plugin-react happy-dom @biomejs/biome @playwright/test
```

When prompted about the non-empty directory, keep existing files (`LICENSE`, `docs/`).

- [ ] **Step 2: Write the failing deploy-config test**

```ts
// src/__tests__/deploy-config.test.ts
import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'
import vercelConfig from '../../vercel.json'

describe('deployment configuration', () => {
  it('exports a fully static site with no server runtime', () => {
    expect(nextConfig.output).toBe('export')
  })

  it('serves cross-origin isolation headers so SharedArrayBuffer is available', () => {
    const headers = vercelConfig.headers[0].headers
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]))
    expect(byKey['Cross-Origin-Opener-Policy']).toBe('same-origin')
    expect(byKey['Cross-Origin-Embedder-Policy']).toBe('credentialless')
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run src/__tests__/deploy-config.test.ts`
Expected: FAIL — `vercel.json` cannot be resolved.

- [ ] **Step 4: Write the configuration**

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
}

export default nextConfig
```

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }
      ]
    }
  ]
}
```

```ts
// vitest.config.ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'happy-dom', globals: true },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
```

Add to `tsconfig.json` `compilerOptions`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"resolveJsonModule": true`.

Add to `package.json` scripts:

```json
{
  "test": "vitest run",
  "lint": "biome check .",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/__tests__/deploy-config.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Verify the static build produces no server output**

Run: `pnpm build`
Expected: build succeeds and `out/` is created. Confirm no `.next/server/app/**/*.js` route handlers exist:
`test ! -d .next/server/app/api && echo "no server routes"`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold static Next.js app with cross-origin isolation"
```

---

### Task 2: Formatting utilities

Pure functions, no DOM. Every read-out in the product renders through these, so their formatting rules are the design system's numeric contract.

**Files:**
- Create: `src/lib/format.ts`
- Test: `src/lib/__tests__/format.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `formatBytes(bytes: number): string`
  - `formatDelta(from: number, to: number): string`
  - `formatDuration(seconds: number): string`
  - `formatPercent(ratio: number): string`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/format.test.ts
import { describe, expect, it } from 'vitest'
import { formatBytes, formatDelta, formatDuration, formatPercent } from '../format'

describe('formatBytes', () => {
  it('uses two decimals below 10 and one above', () => {
    expect(formatBytes(1_840_000)).toBe('1.84 MB')
    expect(formatBytes(28_700_000)).toBe('28.7 MB')
  })

  it('handles bytes and kilobytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.05 KB')
  })
})

describe('formatDelta', () => {
  it('uses a true minus sign U+2212 when output shrank', () => {
    expect(formatDelta(1_840_000, 1_120_000)).toBe('−39%')
  })

  it('uses a plus sign when output grew', () => {
    expect(formatDelta(1_900_000, 1_940_000)).toBe('+2%')
  })

  it('reports zero change without a sign', () => {
    expect(formatDelta(1000, 1000)).toBe('0%')
  })
})

describe('formatDuration', () => {
  it('formats sub-minute durations with one decimal', () => {
    expect(formatDuration(4.23)).toBe('00:04.2')
  })

  it('formats durations past a minute', () => {
    expect(formatDuration(102)).toBe('00:01:42')
  })
})

describe('formatPercent', () => {
  it('renders a 0-1 ratio as a whole percentage', () => {
    expect(formatPercent(0.67)).toBe('67%')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/format.test.ts`
Expected: FAIL — cannot resolve `../format`.

- [ ] **Step 3: Implement**

```ts
// src/lib/format.ts

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000
    unit += 1
  }
  const decimals = value < 10 ? 2 : 1
  return `${value.toFixed(decimals)} ${UNITS[unit]}`
}

export function formatDelta(from: number, to: number): string {
  if (from === 0) return '0%'
  const change = Math.round(((to - from) / from) * 100)
  if (change === 0) return '0%'
  return change < 0 ? `−${Math.abs(change)}%` : `+${change}%`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    const whole = Math.floor(seconds)
    const tenth = Math.floor((seconds - whole) * 10)
    return `00:${String(whole).padStart(2, '0')}.${tenth}`
  }
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':')
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/__tests__/format.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/__tests__/format.test.ts
git commit -m "feat: add numeric formatting contract for instrument read-outs"
```

---

### Task 3: Design tokens and dual-theme resolution

**Files:**
- Create: `src/styles/tokens.css`, `src/lib/theme.ts`, `src/components/ThemeScript.tsx`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Test: `src/lib/__tests__/theme.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type ThemePreference = 'system' | 'light' | 'dark'`
  - `resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): 'light' | 'dark'`
  - `THEME_STORAGE_KEY: string`
  - `<ThemeScript />` — renders the pre-paint inline script

- [ ] **Step 1: Write the failing theme-resolution tests**

```ts
// src/lib/__tests__/theme.test.ts
import { describe, expect, it } from 'vitest'
import { resolveTheme, THEME_STORAGE_KEY } from '../theme'

describe('resolveTheme', () => {
  it('follows the system when preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('ignores the system when the user has chosen explicitly', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('THEME_STORAGE_KEY', () => {
  it('is namespaced to the product', () => {
    expect(THEME_STORAGE_KEY).toBe('convrtr.theme')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/theme.test.ts`
Expected: FAIL — cannot resolve `../theme`.

- [ ] **Step 3: Implement theme logic**

```ts
// src/lib/theme.ts
export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'convrtr.theme'

export function resolveTheme(
  pref: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light'
  return pref
}
```

- [ ] **Step 4: Write the tokens**

```css
/* src/styles/tokens.css */
:root {
  --surface-base: #fafaf8;
  --surface-raised: #ffffff;
  --surface-overlay: #ffffff;
  --hairline: rgba(0, 0, 0, 0.1);
  --text-primary: #16161a;
  --text-muted: #6b6b73;
  --signal: #5c7000;
  --lossy: #9a6b00;
  --error: #c62a1c;

  --radius: 4px;
  --hairline-width: 1px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}

:root[data-theme='dark'] {
  --surface-base: #0b0b0c;
  --surface-raised: #121214;
  --surface-overlay: #1a1a1d;
  --hairline: rgba(255, 255, 255, 0.1);
  --text-primary: #f2f2f0;
  --text-muted: #8a8a92;
  --signal: #ccff00;
  --lossy: #ffb020;
  --error: #ff4d3d;
}

body {
  background: var(--surface-base);
  color: var(--text-primary);
}

.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

Add `@import "../styles/tokens.css";` at the top of `src/app/globals.css`.

- [ ] **Step 5: Write the pre-paint script to prevent theme flash**

```tsx
// src/components/ThemeScript.tsx
import { THEME_STORAGE_KEY } from '@/lib/theme'

const script = `
(function () {
  try {
    var pref = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || 'system';
    var dark = pref === 'dark' ||
      (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />
}
```

Render `<ThemeScript />` as the first child of `<head>` in `src/app/layout.tsx`, and load IBM Plex Sans + IBM Plex Mono via `next/font/google`, exposing `--font-mono`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/__tests__/theme.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add src/styles src/lib/theme.ts src/lib/__tests__/theme.test.ts src/components/ThemeScript.tsx src/app
git commit -m "feat: add dual-theme design tokens with flash-free resolution"
```

---

### Task 4: The registry

**Files:**
- Create: `src/core/registry/types.ts`, `src/core/registry/index.ts`
- Test: `src/core/registry/__tests__/conformance.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `ToolSchema` (zod), `type Tool`
  - `type QualityPreset = 'lossless' | 'visually-lossless' | 'balanced' | 'smallest' | 'target-size' | 'custom'`
  - `TOOLS: Tool[]`, `getTool(id: string): Tool | undefined`, `getToolsByCategory(c: Category): Tool[]`

- [ ] **Step 1: Write the failing conformance tests**

```ts
// src/core/registry/__tests__/conformance.test.ts
import { describe, expect, it } from 'vitest'
import { getTool, TOOLS } from '../index'
import { ToolSchema } from '../types'

describe('registry conformance', () => {
  it('contains at least one tool', () => {
    expect(TOOLS.length).toBeGreaterThan(0)
  })

  it('validates every entry against the schema', () => {
    for (const tool of TOOLS) {
      expect(() => ToolSchema.parse(tool)).not.toThrow()
    }
  })

  it('has no duplicate ids', () => {
    const ids = TOOLS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves every related tool id', () => {
    for (const tool of TOOLS) {
      for (const related of tool.seo.related) {
        expect(getTool(related), `${tool.id} → ${related}`).toBeDefined()
      }
    }
  })

  it('derives a slug that matches the id suffix', () => {
    for (const tool of TOOLS) {
      expect(tool.id).toBe(`${tool.category}/${tool.slug}`)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/core/registry`
Expected: FAIL — cannot resolve `../index`.

- [ ] **Step 3: Implement types**

```ts
// src/core/registry/types.ts
import { z } from 'zod'

export const CATEGORIES = ['image', 'video', 'audio', 'document', 'data'] as const
export type Category = (typeof CATEGORIES)[number]

export const QUALITY_PRESETS = [
  'lossless',
  'visually-lossless',
  'balanced',
  'smallest',
  'target-size',
  'custom',
] as const
export type QualityPreset = (typeof QUALITY_PRESETS)[number]

export const AdvancedParamSchema = z.discriminatedUnion('control', [
  z.object({
    control: z.literal('stepper'),
    key: z.string(),
    label: z.string(),
    group: z.string(),
    min: z.number(),
    max: z.number(),
    step: z.number(),
    default: z.number(),
  }),
  z.object({
    control: z.literal('slider'),
    key: z.string(),
    label: z.string(),
    group: z.string(),
    min: z.number(),
    max: z.number(),
    step: z.number(),
    default: z.number(),
  }),
  z.object({
    control: z.literal('select'),
    key: z.string(),
    label: z.string(),
    group: z.string(),
    options: z.array(z.object({ value: z.string(), label: z.string() })),
    default: z.string(),
  }),
  z.object({
    control: z.literal('toggle'),
    key: z.string(),
    label: z.string(),
    group: z.string(),
    default: z.boolean(),
  }),
])
export type AdvancedParam = z.infer<typeof AdvancedParamSchema>

export const ToolSchema = z.object({
  id: z.string(),
  slug: z.string(),
  category: z.enum(CATEGORIES),
  kind: z.enum(['convert', 'compress', 'resize', 'extract', 'edit', 'inspect', 'generate']),
  accept: z.object({
    mime: z.array(z.string()).min(1),
    ext: z.array(z.string()).min(1),
    maxBytes: z.number().optional(),
  }),
  output: z.object({ ext: z.string(), mime: z.string() }),
  engines: z.array(z.string()).min(1),
  quality: z.object({
    losslessAvailable: z.boolean(),
    defaultPreset: z.enum(QUALITY_PRESETS),
    presets: z.array(
      z.object({
        id: z.enum(QUALITY_PRESETS),
        label: z.string(),
        explanation: z.string(),
        params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
      }),
    ),
    advanced: z.array(AdvancedParamSchema),
  }),
  seo: z.object({
    title: z.string(),
    h1: z.string(),
    intent: z.string(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    related: z.array(z.string()),
  }),
})

export type Tool = z.infer<typeof ToolSchema>
```

- [ ] **Step 4: Implement the registry index with the first real entry**

```ts
// src/core/registry/index.ts
import type { Category, Tool } from './types'
import { pngToWebp } from './tools/png-to-webp'

export * from './types'

export const TOOLS: Tool[] = [pngToWebp]

export function getTool(id: string): Tool | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function getToolsByCategory(category: Category): Tool[] {
  return TOOLS.filter((t) => t.category === category)
}
```

```ts
// src/core/registry/tools/png-to-webp.ts
import type { Tool } from '../types'

export const pngToWebp: Tool = {
  id: 'image/png-to-webp',
  slug: 'png-to-webp',
  category: 'image',
  kind: 'convert',
  accept: { mime: ['image/png'], ext: ['png'] },
  output: { ext: 'webp', mime: 'image/webp' },
  engines: ['jsquash-webp'],
  quality: {
    losslessAvailable: true,
    defaultPreset: 'lossless',
    presets: [
      {
        id: 'lossless',
        label: 'Lossless',
        explanation: 'Bit-exact. The original pixels are recoverable.',
        params: { lossless: 1, quality: 100, method: 4 },
      },
      {
        id: 'visually-lossless',
        label: 'Visually lossless',
        explanation: 'No difference you can see at 100% zoom. Noticeably smaller.',
        params: { lossless: 0, quality: 92, method: 4 },
      },
      {
        id: 'balanced',
        label: 'Balanced',
        explanation: 'Clearly smaller. Loss is hard to spot in normal use.',
        params: { lossless: 0, quality: 78, method: 4 },
      },
      {
        id: 'smallest',
        label: 'Smallest',
        explanation: 'Aggressive. Visible artefacts on detailed images.',
        params: { lossless: 0, quality: 55, method: 6 },
      },
    ],
    advanced: [
      { control: 'stepper', key: 'method', label: 'Method', group: 'Encoder', min: 0, max: 6, step: 1, default: 4 },
      { control: 'slider', key: 'near_lossless', label: 'Near lossless', group: 'Encoder', min: 0, max: 100, step: 1, default: 100 },
      { control: 'slider', key: 'alpha_quality', label: 'Alpha quality', group: 'Encoder', min: 0, max: 100, step: 1, default: 100 },
      { control: 'stepper', key: 'filter_strength', label: 'Filter strength', group: 'Encoder', min: 0, max: 100, step: 1, default: 60 },
      { control: 'stepper', key: 'segments', label: 'Segments', group: 'Output', min: 1, max: 4, step: 1, default: 4 },
      { control: 'stepper', key: 'sns_strength', label: 'SNS strength', group: 'Output', min: 0, max: 100, step: 1, default: 50 },
      { control: 'toggle', key: 'exif', label: 'Keep EXIF orientation', group: 'Image', default: true },
    ],
  },
  seo: {
    title: 'Convert PNG to WebP — free, private, in your browser | convrtr',
    h1: 'Convert PNG to WebP',
    intent:
      'Convert PNG images to WebP without uploading them. The conversion runs inside your browser, so your files never leave your device. Lossless by default.',
    faq: [
      {
        q: 'Is WebP lossless?',
        a: 'WebP supports both lossless and lossy compression. convrtr defaults to lossless, which typically produces files around 26% smaller than PNG with pixel-identical output.',
      },
      {
        q: 'Are my images uploaded anywhere?',
        a: 'No. convrtr has no server. The conversion runs in your browser using WebAssembly, and you can confirm it by opening your browser network tab while converting.',
      },
    ],
    related: [],
  },
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/core/registry`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/core/registry
git commit -m "feat: add typed tool registry with conformance tests"
```

---

### Task 5: Quality model — preset resolution and Custom flip

**Files:**
- Create: `src/core/quality/index.ts`
- Test: `src/core/quality/__tests__/quality.test.ts`

**Interfaces:**
- Consumes: `Tool`, `QualityPreset`, `AdvancedParam` from `@/core/registry`
- Produces:
  - `type QualityState = { preset: QualityPreset; params: Record<string, number | string | boolean> }`
  - `initialQuality(tool: Tool): QualityState`
  - `applyPreset(tool: Tool, preset: QualityPreset): QualityState`
  - `setParam(tool: Tool, state: QualityState, key: string, value: number | string | boolean): QualityState`
  - `describeFidelity(tool: Tool, state: QualityState): 'LOSSLESS' | 'VISUALLY LOSSLESS' | 'INHERENTLY LOSSY' | string`

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/quality/__tests__/quality.test.ts
import { describe, expect, it } from 'vitest'
import { pngToWebp } from '@/core/registry/tools/png-to-webp'
import { applyPreset, describeFidelity, initialQuality, setParam } from '../index'

describe('initialQuality', () => {
  it('starts at the tool default preset with that preset params', () => {
    const state = initialQuality(pngToWebp)
    expect(state.preset).toBe('lossless')
    expect(state.params.lossless).toBe(1)
  })

  it('merges advanced defaults underneath the preset params', () => {
    const state = initialQuality(pngToWebp)
    expect(state.params.sns_strength).toBe(50)
  })
})

describe('applyPreset', () => {
  it('replaces preset params but keeps advanced defaults', () => {
    const state = applyPreset(pngToWebp, 'balanced')
    expect(state.preset).toBe('balanced')
    expect(state.params.quality).toBe(78)
    expect(state.params.sns_strength).toBe(50)
  })
})

describe('setParam', () => {
  it('flips the preset to custom when a parameter deviates', () => {
    const state = setParam(pngToWebp, initialQuality(pngToWebp), 'method', 6)
    expect(state.preset).toBe('custom')
    expect(state.params.method).toBe(6)
  })

  it('does not flip to custom when the value equals the current preset value', () => {
    const state = setParam(pngToWebp, initialQuality(pngToWebp), 'method', 4)
    expect(state.preset).toBe('lossless')
  })
})

describe('describeFidelity', () => {
  it('reports LOSSLESS on the lossless preset', () => {
    expect(describeFidelity(pngToWebp, initialQuality(pngToWebp))).toBe('LOSSLESS')
  })

  it('reports VISUALLY LOSSLESS on that preset', () => {
    expect(describeFidelity(pngToWebp, applyPreset(pngToWebp, 'visually-lossless'))).toBe(
      'VISUALLY LOSSLESS',
    )
  })

  it('reports the quality number when custom and lossy', () => {
    const custom = setParam(pngToWebp, applyPreset(pngToWebp, 'balanced'), 'quality', 61)
    expect(describeFidelity(pngToWebp, custom)).toBe('LOSSY · Q61')
  })

  it('still reports LOSSLESS when a custom edit keeps lossless on', () => {
    const custom = setParam(pngToWebp, initialQuality(pngToWebp), 'sns_strength', 20)
    expect(describeFidelity(pngToWebp, custom)).toBe('LOSSLESS')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/core/quality`
Expected: FAIL — cannot resolve `../index`.

- [ ] **Step 3: Implement**

```ts
// src/core/quality/index.ts
import type { QualityPreset, Tool } from '@/core/registry'

export type ParamValue = number | string | boolean
export type QualityState = {
  preset: QualityPreset
  params: Record<string, ParamValue>
}

function advancedDefaults(tool: Tool): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {}
  for (const param of tool.quality.advanced) out[param.key] = param.default
  return out
}

function presetParams(tool: Tool, preset: QualityPreset): Record<string, ParamValue> {
  return tool.quality.presets.find((p) => p.id === preset)?.params ?? {}
}

export function applyPreset(tool: Tool, preset: QualityPreset): QualityState {
  return {
    preset,
    params: { ...advancedDefaults(tool), ...presetParams(tool, preset) },
  }
}

export function initialQuality(tool: Tool): QualityState {
  return applyPreset(tool, tool.quality.defaultPreset)
}

export function setParam(
  tool: Tool,
  state: QualityState,
  key: string,
  value: ParamValue,
): QualityState {
  const params = { ...state.params, [key]: value }
  const baseline = { ...advancedDefaults(tool), ...presetParams(tool, state.preset) }
  const deviates = Object.keys(params).some((k) => params[k] !== baseline[k])
  return { preset: deviates ? 'custom' : state.preset, params }
}

export function describeFidelity(tool: Tool, state: QualityState): string {
  if (!tool.quality.losslessAvailable) return 'INHERENTLY LOSSY'
  if (state.params.lossless === 1 || state.params.lossless === true) return 'LOSSLESS'
  if (state.preset === 'visually-lossless') return 'VISUALLY LOSSLESS'
  const quality = state.params.quality
  return typeof quality === 'number' ? `LOSSY · Q${quality}` : 'LOSSY'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/core/quality`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/quality
git commit -m "feat: add two-tier quality model with custom-preset flip"
```

---

### Task 6: Engine layer and the WebP engine

**Files:**
- Create: `src/core/engines/types.ts`, `src/core/engines/jsquash-webp.ts`, `src/core/engines/index.ts`
- Test: `src/core/engines/__tests__/engines.test.ts`

**Interfaces:**
- Consumes: `ParamValue` from `@/core/quality`
- Produces:
  - `interface Engine { id: string; probe(): Promise<boolean>; run(input: ArrayBuffer, params: Record<string, ParamValue>, onProgress: (r: number) => void): Promise<ArrayBuffer> }`
  - `getEngine(id: string): Engine | undefined`
  - `selectEngine(ids: string[]): Promise<Engine | undefined>`

- [ ] **Step 1: Install codecs**

```bash
pnpm add @jsquash/png @jsquash/webp
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/core/engines/__tests__/engines.test.ts
import { describe, expect, it, vi } from 'vitest'
import type { Engine } from '../types'
import { selectEngine } from '../index'

function stub(id: string, supported: boolean): Engine {
  return {
    id,
    probe: vi.fn(async () => supported),
    run: vi.fn(async () => new ArrayBuffer(0)),
  }
}

describe('selectEngine', () => {
  it('returns the first engine whose probe succeeds', async () => {
    const registry = new Map([
      ['a', stub('a', false)],
      ['b', stub('b', true)],
    ])
    const chosen = await selectEngine(['a', 'b'], registry)
    expect(chosen?.id).toBe('b')
  })

  it('returns undefined when no engine is supported', async () => {
    const registry = new Map([['a', stub('a', false)]])
    expect(await selectEngine(['a'], registry)).toBeUndefined()
  })

  it('ignores ids that are not registered', async () => {
    const registry = new Map([['b', stub('b', true)]])
    const chosen = await selectEngine(['missing', 'b'], registry)
    expect(chosen?.id).toBe('b')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/core/engines`
Expected: FAIL — cannot resolve `../index`.

- [ ] **Step 4: Implement the engine contract and registry**

```ts
// src/core/engines/types.ts
import type { ParamValue } from '@/core/quality'

export interface Engine {
  id: string
  probe(): Promise<boolean>
  run(
    input: ArrayBuffer,
    params: Record<string, ParamValue>,
    onProgress: (ratio: number) => void,
  ): Promise<ArrayBuffer>
}
```

```ts
// src/core/engines/index.ts
import { jsquashWebp } from './jsquash-webp'
import type { Engine } from './types'

export * from './types'

export const ENGINES = new Map<string, Engine>([[jsquashWebp.id, jsquashWebp]])

export function getEngine(id: string): Engine | undefined {
  return ENGINES.get(id)
}

export async function selectEngine(
  ids: string[],
  registry: Map<string, Engine> = ENGINES,
): Promise<Engine | undefined> {
  for (const id of ids) {
    const engine = registry.get(id)
    if (engine && (await engine.probe())) return engine
  }
  return undefined
}
```

```ts
// src/core/engines/jsquash-webp.ts
import type { ParamValue } from '@/core/quality'
import type { Engine } from './types'

export const jsquashWebp: Engine = {
  id: 'jsquash-webp',

  async probe() {
    return typeof WebAssembly === 'object'
  },

  async run(input, params, onProgress) {
    const { default: decodePng } = await import('@jsquash/png/decode')
    const { default: encodeWebp } = await import('@jsquash/webp/encode')

    onProgress(0.1)
    const imageData = await decodePng(input)
    onProgress(0.5)

    const encoded = await encodeWebp(imageData, {
      lossless: Number(params.lossless ?? 0),
      quality: Number(params.quality ?? 92),
      method: Number(params.method ?? 4),
      near_lossless: Number(params.near_lossless ?? 100),
      alpha_quality: Number(params.alpha_quality ?? 100),
      filter_strength: Number(params.filter_strength ?? 60),
      segments: Number(params.segments ?? 4),
      sns_strength: Number(params.sns_strength ?? 50),
    } as Parameters<typeof encodeWebp>[1])

    onProgress(1)
    return encoded
  },
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/core/engines`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/core/engines package.json pnpm-lock.yaml
git commit -m "feat: add ranked engine layer with capability probing"
```

---

### Task 7: Worker pipeline

**Files:**
- Create: `src/core/pipeline/protocol.ts`, `src/core/pipeline/worker.ts`, `src/core/pipeline/client.ts`
- Test: `src/core/pipeline/__tests__/protocol.test.ts`

**Interfaces:**
- Consumes: `selectEngine`, `getEngine` from `@/core/engines`
- Produces:
  - `type JobRequest = { id: string; engines: string[]; input: ArrayBuffer; params: Record<string, ParamValue> }`
  - `type JobEvent` (progress | done | error)
  - `runJob(request, onEvent, signal): Promise<ArrayBuffer>`

- [ ] **Step 1: Write the failing protocol tests**

```ts
// src/core/pipeline/__tests__/protocol.test.ts
import { describe, expect, it } from 'vitest'
import { isJobEvent, makeJobId } from '../protocol'

describe('makeJobId', () => {
  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => makeJobId()))
    expect(ids.size).toBe(100)
  })
})

describe('isJobEvent', () => {
  it('accepts a progress event', () => {
    expect(isJobEvent({ type: 'progress', id: 'a', ratio: 0.5, phase: 'encode' })).toBe(true)
  })

  it('accepts a done event', () => {
    expect(isJobEvent({ type: 'done', id: 'a', output: new ArrayBuffer(2) })).toBe(true)
  })

  it('accepts an error event', () => {
    expect(isJobEvent({ type: 'error', id: 'a', code: 'ENGINE_FAILURE', message: 'x' })).toBe(true)
  })

  it('rejects an unknown shape', () => {
    expect(isJobEvent({ type: 'nonsense' })).toBe(false)
    expect(isJobEvent(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/core/pipeline`
Expected: FAIL — cannot resolve `../protocol`.

- [ ] **Step 3: Implement the protocol**

```ts
// src/core/pipeline/protocol.ts
import type { ParamValue } from '@/core/quality'

export type ErrorCode =
  | 'UNSUPPORTED_INPUT'
  | 'CORRUPT_INPUT'
  | 'CAPABILITY_MISSING'
  | 'OUT_OF_MEMORY'
  | 'USER_CANCELLED'
  | 'ENGINE_FAILURE'

export type JobRequest = {
  id: string
  engines: string[]
  input: ArrayBuffer
  params: Record<string, ParamValue>
}

export type JobEvent =
  | { type: 'progress'; id: string; ratio: number; phase: string }
  | { type: 'done'; id: string; output: ArrayBuffer }
  | { type: 'error'; id: string; code: ErrorCode; message: string }

export function makeJobId(): string {
  return crypto.randomUUID()
}

export function isJobEvent(value: unknown): value is JobEvent {
  if (typeof value !== 'object' || value === null) return false
  const event = value as Record<string, unknown>
  if (typeof event.id !== 'string') return false
  if (event.type === 'progress') return typeof event.ratio === 'number'
  if (event.type === 'done') return event.output instanceof ArrayBuffer
  if (event.type === 'error') return typeof event.code === 'string'
  return false
}
```

- [ ] **Step 4: Implement the worker and client**

```ts
// src/core/pipeline/worker.ts
import { selectEngine } from '@/core/engines'
import type { JobEvent, JobRequest } from './protocol'

self.onmessage = async (event: MessageEvent<JobRequest>) => {
  const { id, engines, input, params } = event.data
  const post = (message: JobEvent) => self.postMessage(message)

  try {
    const engine = await selectEngine(engines)
    if (!engine) {
      post({ type: 'error', id, code: 'CAPABILITY_MISSING', message: 'No supported engine' })
      return
    }
    const output = await engine.run(input, params, (ratio) =>
      post({ type: 'progress', id, ratio, phase: engine.id }),
    )
    post({ type: 'done', id, output })
  } catch (error) {
    post({
      type: 'error',
      id,
      code: 'ENGINE_FAILURE',
      message: error instanceof Error ? error.message : 'Unknown failure',
    })
  }
}
```

```ts
// src/core/pipeline/client.ts
import { isJobEvent, type JobEvent, type JobRequest } from './protocol'

export function runJob(
  request: JobRequest,
  onEvent: (event: JobEvent) => void,
  signal: AbortSignal,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

    const cleanup = () => {
      worker.terminate()
      signal.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Cancelled', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort)

    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (!isJobEvent(event.data)) return
      onEvent(event.data)
      if (event.data.type === 'done') {
        const { output } = event.data
        cleanup()
        resolve(output)
      }
      if (event.data.type === 'error') {
        const { message } = event.data
        cleanup()
        reject(new Error(message))
      }
    }

    worker.postMessage(request, [request.input])
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/core/pipeline`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/core/pipeline
git commit -m "feat: add cancellable worker pipeline with typed job protocol"
```

---

### Task 8: File I/O

**Files:**
- Create: `src/core/io/index.ts`
- Test: `src/core/io/__tests__/io.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `readFile(file: File): Promise<ArrayBuffer>`
  - `saveOutput(bytes: ArrayBuffer, filename: string, mime: string): Promise<void>`
  - `outputFilename(input: string, ext: string): string`
  - `acceptsFile(file: File, accept: { mime: string[]; ext: string[] }): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/io/__tests__/io.test.ts
import { describe, expect, it } from 'vitest'
import { acceptsFile, outputFilename } from '../index'

describe('outputFilename', () => {
  it('swaps the extension', () => {
    expect(outputFilename('diagram.png', 'webp')).toBe('diagram.webp')
  })

  it('handles names containing dots', () => {
    expect(outputFilename('my.holiday.photo.png', 'webp')).toBe('my.holiday.photo.webp')
  })

  it('appends when there is no extension', () => {
    expect(outputFilename('noext', 'webp')).toBe('noext.webp')
  })
})

describe('acceptsFile', () => {
  const accept = { mime: ['image/png'], ext: ['png'] }

  it('accepts a matching mime type', () => {
    expect(acceptsFile(new File([], 'a.png', { type: 'image/png' }), accept)).toBe(true)
  })

  it('falls back to the extension when mime is empty', () => {
    expect(acceptsFile(new File([], 'a.png', { type: '' }), accept)).toBe(true)
  })

  it('rejects a non-matching file', () => {
    expect(acceptsFile(new File([], 'a.gif', { type: 'image/gif' }), accept)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/core/io`
Expected: FAIL — cannot resolve `../index`.

- [ ] **Step 3: Implement**

```ts
// src/core/io/index.ts

export function outputFilename(input: string, ext: string): string {
  const dot = input.lastIndexOf('.')
  const stem = dot === -1 ? input : input.slice(0, dot)
  return `${stem}.${ext}`
}

export function acceptsFile(
  file: File,
  accept: { mime: string[]; ext: string[] },
): boolean {
  if (file.type && accept.mime.includes(file.type)) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return accept.ext.includes(ext)
}

export function readFile(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer()
}

type PickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string
    types: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<FileSystemFileHandle>
}

export async function saveOutput(
  bytes: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<void> {
  const picker = (window as PickerWindow).showSaveFilePicker
  const blob = new Blob([bytes], { type: mime })

  if (picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: mime, accept: { [mime]: [`.${filename.split('.').pop()}`] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/core/io`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/core/io
git commit -m "feat: add file input validation and disk-first output"
```

---

### Task 9: DropField component

**Files:**
- Create: `src/components/instrument/DropField.tsx`
- Test: `src/components/instrument/__tests__/DropField.test.tsx`

**Interfaces:**
- Consumes: `acceptsFile` from `@/core/io`
- Produces: `<DropField accept={...} formats={string[]} onFiles={(files: File[]) => void} />`

- [ ] **Step 1: Install testing library**

```bash
pnpm add -D @testing-library/react @testing-library/dom
```

- [ ] **Step 2: Write the failing tests**

```tsx
// src/components/instrument/__tests__/DropField.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DropField } from '../DropField'

const accept = { mime: ['image/png'], ext: ['png'] }

describe('DropField', () => {
  it('renders the accepted formats as chips', () => {
    render(<DropField accept={accept} formats={['PNG']} onFiles={vi.fn()} />)
    expect(screen.getByText('PNG')).toBeDefined()
  })

  it('emits accepted files on drop', () => {
    const onFiles = vi.fn()
    render(<DropField accept={accept} formats={['PNG']} onFiles={onFiles} />)
    const file = new File([], 'a.png', { type: 'image/png' })
    fireEvent.drop(screen.getByTestId('drop-field'), { dataTransfer: { files: [file] } })
    expect(onFiles).toHaveBeenCalledWith([file])
  })

  it('filters out files that do not match the accept rule', () => {
    const onFiles = vi.fn()
    render(<DropField accept={accept} formats={['PNG']} onFiles={onFiles} />)
    const bad = new File([], 'a.gif', { type: 'image/gif' })
    fireEvent.drop(screen.getByTestId('drop-field'), { dataTransfer: { files: [bad] } })
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('marks itself active while dragging over', () => {
    render(<DropField accept={accept} formats={['PNG']} onFiles={vi.fn()} />)
    const field = screen.getByTestId('drop-field')
    fireEvent.dragOver(field)
    expect(field.getAttribute('data-active')).toBe('true')
    fireEvent.dragLeave(field)
    expect(field.getAttribute('data-active')).toBe('false')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/components/instrument`
Expected: FAIL — cannot resolve `../DropField`.

- [ ] **Step 4: Implement**

```tsx
// src/components/instrument/DropField.tsx
'use client'

import { useRef, useState } from 'react'
import { acceptsFile } from '@/core/io'

type Props = {
  accept: { mime: string[]; ext: string[] }
  formats: string[]
  onFiles: (files: File[]) => void
}

export function DropField({ accept, formats, onFiles }: Props) {
  const [active, setActive] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const handle = (files: FileList | null) => {
    if (!files) return
    const accepted = Array.from(files).filter((f) => acceptsFile(f, accept))
    if (accepted.length > 0) onFiles(accepted)
  }

  return (
    <div
      data-testid="drop-field"
      data-active={active}
      onDragOver={(e) => {
        e.preventDefault()
        setActive(true)
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setActive(false)
        handle(e.dataTransfer.files)
      }}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') input.current?.click()
      }}
      role="button"
      tabIndex={0}
      className="flex flex-col gap-4 border border-dashed p-8"
      style={{
        borderColor: active ? 'var(--signal)' : 'var(--hairline)',
        background: active ? 'var(--surface-raised)' : 'transparent',
        borderRadius: 'var(--radius)',
      }}
    >
      <span className="mono text-[13px]">DROP FILES HERE</span>
      <span className="mono text-[12px]" style={{ color: 'var(--text-muted)' }}>
        or click to browse
      </span>
      <div className="flex flex-wrap gap-2">
        {formats.map((f) => (
          <span
            key={f}
            className="mono border px-2 py-1 text-[11px]"
            style={{ borderColor: 'var(--hairline)', borderRadius: 'var(--radius)' }}
          >
            {f}
          </span>
        ))}
      </div>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={accept.mime.join(',')}
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/components/instrument`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/instrument package.json pnpm-lock.yaml
git commit -m "feat: add DropField with accept filtering and keyboard access"
```

---

### Task 10: Read-out components

**Files:**
- Create: `src/components/instrument/FileReadout.tsx`, `src/components/instrument/FidelityBadge.tsx`, `src/components/instrument/ProgressBar.tsx`
- Test: `src/components/instrument/__tests__/readouts.test.tsx`

**Interfaces:**
- Consumes: `formatBytes`, `formatPercent`, `formatDuration` from `@/lib/format`
- Produces:
  - `<FileReadout name={string} facts={string[]} />`
  - `<FidelityBadge label={string} />` — acid when lossless, amber otherwise
  - `<ProgressBar ratio={number} phase={string} elapsedSeconds={number} />`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/instrument/__tests__/readouts.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FidelityBadge } from '../FidelityBadge'
import { FileReadout } from '../FileReadout'
import { ProgressBar } from '../ProgressBar'

describe('FileReadout', () => {
  it('joins facts with a middot', () => {
    render(<FileReadout name="diagram.png" facts={['PNG', 'RGBA8', '1.84 MB']} />)
    expect(screen.getByTestId('facts').textContent).toBe('PNG · RGBA8 · 1.84 MB')
  })
})

describe('FidelityBadge', () => {
  it('uses the signal colour for lossless', () => {
    render(<FidelityBadge label="LOSSLESS" />)
    expect(screen.getByText('LOSSLESS').getAttribute('data-tone')).toBe('lossless')
  })

  it('uses the lossy tone for anything else', () => {
    render(<FidelityBadge label="LOSSY · Q61" />)
    expect(screen.getByText('LOSSY · Q61').getAttribute('data-tone')).toBe('lossy')
  })
})

describe('ProgressBar', () => {
  it('exposes an accessible progress value', () => {
    render(<ProgressBar ratio={0.67} phase="encode" elapsedSeconds={4.2} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('67')
  })

  it('renders the readout row', () => {
    render(<ProgressBar ratio={0.67} phase="encode" elapsedSeconds={4.2} />)
    expect(screen.getByTestId('progress-readout').textContent).toContain('67%')
    expect(screen.getByTestId('progress-readout').textContent).toContain('00:04.2')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/instrument/__tests__/readouts.test.tsx`
Expected: FAIL — modules cannot be resolved.

- [ ] **Step 3: Implement**

```tsx
// src/components/instrument/FileReadout.tsx
export function FileReadout({ name, facts }: { name: string; facts: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[15px]">{name}</span>
      <span data-testid="facts" className="mono text-[12px]" style={{ color: 'var(--text-muted)' }}>
        {facts.join(' · ')}
      </span>
    </div>
  )
}
```

```tsx
// src/components/instrument/FidelityBadge.tsx
export function FidelityBadge({ label }: { label: string }) {
  const lossless = label === 'LOSSLESS' || label === 'VISUALLY LOSSLESS'
  return (
    <span
      data-tone={lossless ? 'lossless' : 'lossy'}
      className="mono border px-3 py-1 text-[11px] tracking-[0.08em]"
      style={{
        color: lossless ? 'var(--signal)' : 'var(--lossy)',
        borderColor: lossless ? 'var(--signal)' : 'var(--lossy)',
        borderRadius: '999px',
      }}
    >
      {label}
    </span>
  )
}
```

```tsx
// src/components/instrument/ProgressBar.tsx
import { formatDuration, formatPercent } from '@/lib/format'

type Props = { ratio: number; phase: string; elapsedSeconds: number }

export function ProgressBar({ ratio, phase, elapsedSeconds }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-[2px] w-full"
        style={{ background: 'var(--hairline)' }}
      >
        <div
          className="h-full"
          style={{ width: `${ratio * 100}%`, background: 'var(--signal)' }}
        />
      </div>
      <span data-testid="progress-readout" className="mono text-[12px]">
        {formatPercent(ratio)} {'·'} {phase} {'·'} ELAPSED {formatDuration(elapsedSeconds)}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/instrument/__tests__/readouts.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/instrument
git commit -m "feat: add file, fidelity and progress read-out components"
```

---

### Task 11: Options panel — both tiers

**Files:**
- Create: `src/components/instrument/OptionsPanel.tsx`
- Test: `src/components/instrument/__tests__/OptionsPanel.test.tsx`

**Interfaces:**
- Consumes: `Tool` from `@/core/registry`; `QualityState`, `applyPreset`, `setParam` from `@/core/quality`
- Produces: `<OptionsPanel tool={Tool} state={QualityState} onChange={(s: QualityState) => void} />`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/instrument/__tests__/OptionsPanel.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { pngToWebp } from '@/core/registry/tools/png-to-webp'
import { initialQuality } from '@/core/quality'
import { OptionsPanel } from '../OptionsPanel'

describe('OptionsPanel', () => {
  it('renders every preset as a selectable segment', () => {
    render(<OptionsPanel tool={pngToWebp} state={initialQuality(pngToWebp)} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Lossless' })).toBeDefined()
    expect(screen.getByRole('radio', { name: 'Smallest' })).toBeDefined()
  })

  it('marks the active preset as checked', () => {
    render(<OptionsPanel tool={pngToWebp} state={initialQuality(pngToWebp)} onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Lossless' }).getAttribute('aria-checked')).toBe('true')
  })

  it('shows the explanation for the active preset', () => {
    render(<OptionsPanel tool={pngToWebp} state={initialQuality(pngToWebp)} onChange={vi.fn()} />)
    expect(screen.getByText('Bit-exact. The original pixels are recoverable.')).toBeDefined()
  })

  it('emits a new state when a preset is chosen', () => {
    const onChange = vi.fn()
    render(<OptionsPanel tool={pngToWebp} state={initialQuality(pngToWebp)} onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Balanced' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ preset: 'balanced' }))
  })

  it('hides advanced controls until disclosed', () => {
    render(<OptionsPanel tool={pngToWebp} state={initialQuality(pngToWebp)} onChange={vi.fn()} />)
    expect(screen.queryByLabelText('SNS strength')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /ADVANCED/ }))
    expect(screen.getByLabelText('SNS strength')).toBeDefined()
  })

  it('emits a custom preset when an advanced control changes', () => {
    const onChange = vi.fn()
    render(<OptionsPanel tool={pngToWebp} state={initialQuality(pngToWebp)} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /ADVANCED/ }))
    fireEvent.change(screen.getByLabelText('SNS strength'), { target: { value: '20' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ preset: 'custom' }))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/instrument/__tests__/OptionsPanel.test.tsx`
Expected: FAIL — cannot resolve `../OptionsPanel`.

- [ ] **Step 3: Implement**

```tsx
// src/components/instrument/OptionsPanel.tsx
'use client'

import { useState } from 'react'
import { applyPreset, setParam, type QualityState } from '@/core/quality'
import type { Tool } from '@/core/registry'

type Props = {
  tool: Tool
  state: QualityState
  onChange: (state: QualityState) => void
}

export function OptionsPanel({ tool, state, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const active = tool.quality.presets.find((p) => p.id === state.preset)
  const groups = [...new Set(tool.quality.advanced.map((p) => p.group))]

  return (
    <div className="flex flex-col gap-4">
      <span className="mono text-[11px] tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
        QUALITY
      </span>

      <div role="radiogroup" aria-label="Quality" className="flex">
        {tool.quality.presets.map((preset) => {
          const selected = preset.id === state.preset
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={preset.label}
              onClick={() => onChange(applyPreset(tool, preset.id))}
              className="mono border px-4 py-3 text-[12px]"
              style={{
                color: selected ? 'var(--signal)' : 'var(--text-primary)',
                borderColor: selected ? 'var(--signal)' : 'var(--hairline)',
              }}
            >
              {preset.label.toUpperCase()}
            </button>
          )
        })}
      </div>

      {active && (
        <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {active.explanation}
        </span>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mono self-start text-[11px] tracking-[0.08em]"
      >
        ADVANCED {open ? '⌃' : '⌄'}
      </button>

      {open && (
        <div className="flex gap-8">
          {groups.map((group) => (
            <div key={group} className="flex flex-1 flex-col gap-3">
              <span className="mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {group.toUpperCase()}
              </span>
              {tool.quality.advanced
                .filter((p) => p.group === group)
                .map((param) => (
                  <label key={param.key} className="flex items-center justify-between gap-4">
                    <span className="mono text-[11px]">{param.label}</span>
                    {param.control === 'toggle' ? (
                      <input
                        type="checkbox"
                        aria-label={param.label}
                        checked={Boolean(state.params[param.key])}
                        onChange={(e) =>
                          onChange(setParam(tool, state, param.key, e.target.checked))
                        }
                      />
                    ) : param.control === 'select' ? (
                      <select
                        aria-label={param.label}
                        value={String(state.params[param.key])}
                        onChange={(e) => onChange(setParam(tool, state, param.key, e.target.value))}
                      >
                        {param.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={param.control === 'slider' ? 'range' : 'number'}
                        aria-label={param.label}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={Number(state.params[param.key])}
                        onChange={(e) =>
                          onChange(setParam(tool, state, param.key, Number(e.target.value)))
                        }
                      />
                    )}
                  </label>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/instrument/__tests__/OptionsPanel.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/instrument/OptionsPanel.tsx src/components/instrument/__tests__/OptionsPanel.test.tsx
git commit -m "feat: add two-tier options panel driven by the registry schema"
```

---

### Task 12: Generated routes and page metadata

**Files:**
- Create: `src/app/[category]/[slug]/page.tsx`
- Create: `src/app/[category]/[slug]/ToolClient.tsx` — **stub only in this task** (`export function ToolClient({ toolId }: { toolId: string }) { return <div>{toolId}</div> }`), so the static build resolves. Task 13 replaces it with the real implementation.
- Create: `src/lib/jsonld.ts`
- Test: `src/lib/__tests__/jsonld.test.ts`

**Interfaces:**
- Consumes: `TOOLS`, `getTool` from `@/core/registry`
- Produces:
  - `buildToolJsonLd(tool: Tool, url: string): object`
  - a static route per registry entry at `/{category}/{slug}`

- [ ] **Step 1: Write the failing JSON-LD tests**

```ts
// src/lib/__tests__/jsonld.test.ts
import { describe, expect, it } from 'vitest'
import { pngToWebp } from '@/core/registry/tools/png-to-webp'
import { buildToolJsonLd } from '../jsonld'

describe('buildToolJsonLd', () => {
  const graph = buildToolJsonLd(pngToWebp, 'https://convrtr.mreshank.com/image/png-to-webp') as {
    '@graph': { '@type': string; [key: string]: unknown }[]
  }

  it('emits a SoftwareApplication node that is free', () => {
    const app = graph['@graph'].find((n) => n['@type'] === 'SoftwareApplication')
    expect(app).toBeDefined()
    expect((app?.offers as { price: string }).price).toBe('0')
  })

  it('emits an FAQPage node with one entry per registry FAQ', () => {
    const faq = graph['@graph'].find((n) => n['@type'] === 'FAQPage')
    expect((faq?.mainEntity as unknown[]).length).toBe(pngToWebp.seo.faq.length)
  })

  it('emits a HowTo node naming the tool', () => {
    const howTo = graph['@graph'].find((n) => n['@type'] === 'HowTo')
    expect(howTo?.name).toBe(pngToWebp.seo.h1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/__tests__/jsonld.test.ts`
Expected: FAIL — cannot resolve `../jsonld`.

- [ ] **Step 3: Implement JSON-LD**

```ts
// src/lib/jsonld.ts
import type { Tool } from '@/core/registry'

export function buildToolJsonLd(tool: Tool, url: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: tool.seo.h1,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        url,
        description: tool.seo.intent,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'HowTo',
        name: tool.seo.h1,
        step: [
          { '@type': 'HowToStep', text: `Drop your .${tool.accept.ext[0]} file onto the page.` },
          { '@type': 'HowToStep', text: 'Choose how much quality you want to keep.' },
          { '@type': 'HowToStep', text: `Save the .${tool.output.ext} file to your device.` },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: tool.seo.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  }
}
```

- [ ] **Step 4: Implement the generated route**

```tsx
// src/app/[category]/[slug]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTool, TOOLS } from '@/core/registry'
import { buildToolJsonLd } from '@/lib/jsonld'
import { ToolClient } from './ToolClient'

const SITE = 'https://convrtr.mreshank.com'

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ category: tool.category, slug: tool.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>
}): Promise<Metadata> {
  const { category, slug } = await params
  const tool = getTool(`${category}/${slug}`)
  if (!tool) return {}
  return {
    title: tool.seo.title,
    description: tool.seo.intent,
    alternates: { canonical: `${SITE}/${tool.id}` },
    openGraph: { title: tool.seo.title, description: tool.seo.intent, url: `${SITE}/${tool.id}` },
  }
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>
}) {
  const { category, slug } = await params
  const tool = getTool(`${category}/${slug}`)
  if (!tool) notFound()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildToolJsonLd(tool, `${SITE}/${tool.id}`)),
        }}
      />
      <ToolClient toolId={tool.id} />
    </>
  )
}
```

- [ ] **Step 5: Run tests and build**

Run: `pnpm vitest run src/lib/__tests__/jsonld.test.ts`
Expected: PASS (3 tests)

Run: `pnpm build`
Expected: build succeeds and `out/image/png-to-webp.html` exists.

- [ ] **Step 6: Commit**

```bash
git add src/app src/lib/jsonld.ts src/lib/__tests__/jsonld.test.ts
git commit -m "feat: generate static tool routes and structured data from the registry"
```

---

### Task 13: Wire the vertical slice

Assembles Tasks 4–12 into the working `/image/png-to-webp` page.

**Files:**
- Create: `src/app/[category]/[slug]/ToolClient.tsx` (implementing the stub referenced in Task 12)
- Test: `e2e/png-to-webp.spec.ts`, `e2e/fixtures/diagram.png`

**Interfaces:**
- Consumes: `getTool`, `initialQuality`, `describeFidelity`, `runJob`, `makeJobId`, `readFile`, `saveOutput`, `outputFilename`, `DropField`, `FileReadout`, `FidelityBadge`, `ProgressBar`, `OptionsPanel`
- Produces: a working conversion page

- [ ] **Step 1: Implement the client component**

```tsx
// src/app/[category]/[slug]/ToolClient.tsx
'use client'

import { useState } from 'react'
import { DropField } from '@/components/instrument/DropField'
import { FidelityBadge } from '@/components/instrument/FidelityBadge'
import { FileReadout } from '@/components/instrument/FileReadout'
import { OptionsPanel } from '@/components/instrument/OptionsPanel'
import { ProgressBar } from '@/components/instrument/ProgressBar'
import { describeFidelity, initialQuality, type QualityState } from '@/core/quality'
import { outputFilename, readFile, saveOutput } from '@/core/io'
import { makeJobId } from '@/core/pipeline/protocol'
import { runJob } from '@/core/pipeline/client'
import { getTool } from '@/core/registry'
import { formatBytes, formatDelta } from '@/lib/format'

export function ToolClient({ toolId }: { toolId: string }) {
  const tool = getTool(toolId)
  if (!tool) throw new Error(`Unknown tool ${toolId}`)

  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState<QualityState>(() => initialQuality(tool))
  const [progress, setProgress] = useState<number | null>(null)
  const [result, setResult] = useState<{ bytes: ArrayBuffer; size: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const convert = async () => {
    if (!file) return
    setError(null)
    setResult(null)
    setProgress(0)
    const input = await readFile(file)
    try {
      const output = await runJob(
        { id: makeJobId(), engines: tool.engines, input, params: quality.params },
        (event) => {
          if (event.type === 'progress') setProgress(event.ratio)
        },
        new AbortController().signal,
      )
      setResult({ bytes: output, size: output.byteLength })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conversion failed')
    } finally {
      setProgress(null)
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div className="flex items-start justify-between">
        <h1 className="text-[28px] tracking-[-0.02em]">{tool.seo.h1}</h1>
        <FidelityBadge label={describeFidelity(tool, quality)} />
      </div>

      {!file && (
        <DropField
          accept={tool.accept}
          formats={tool.accept.ext.map((e) => e.toUpperCase())}
          onFiles={(files) => setFile(files[0] ?? null)}
        />
      )}

      {file && (
        <div
          className="flex flex-col gap-6 border p-6"
          style={{ borderColor: 'var(--hairline)', borderRadius: 'var(--radius)' }}
        >
          <FileReadout
            name={file.name}
            facts={[tool.accept.ext[0]!.toUpperCase(), formatBytes(file.size)]}
          />
          <OptionsPanel tool={tool} state={quality} onChange={setQuality} />
          {progress !== null && (
            <ProgressBar ratio={progress} phase="ENCODE" elapsedSeconds={0} />
          )}
          {error && (
            <span className="mono text-[12px]" style={{ color: 'var(--error)' }}>
              {error}
            </span>
          )}
          {result ? (
            <div className="flex items-center justify-between">
              <span data-testid="result" className="mono text-[12px]">
                {formatBytes(file.size)} {'→'} {formatBytes(result.size)}{' '}
                {formatDelta(file.size, result.size)}
              </span>
              <button
                type="button"
                className="mono border px-4 py-2 text-[12px]"
                style={{ color: 'var(--signal)', borderColor: 'var(--signal)' }}
                onClick={() =>
                  saveOutput(
                    result.bytes,
                    outputFilename(file.name, tool.output.ext),
                    tool.output.mime,
                  )
                }
              >
                SAVE
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={convert}
              disabled={progress !== null}
              className="mono self-end border px-4 py-2 text-[12px]"
              style={{ color: 'var(--signal)', borderColor: 'var(--signal)' }}
            >
              CONVERT
            </button>
          )}
        </div>
      )}

      <span className="mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
        LOCAL ONLY {'·'} 0 BYTES UPLOADED {'·'} WORKS OFFLINE
      </span>
    </main>
  )
}
```

This replaces the stub created in Task 12.

- [ ] **Step 2: Create the e2e fixture**

```bash
mkdir -p e2e/fixtures
pnpm dlx tsx -e "
const { writeFileSync } = require('node:fs');
const { createCanvas } = require('canvas');
" 2>/dev/null || true
```

If `canvas` is unavailable, generate the fixture with ImageMagick or copy any real PNG:

```bash
cp docs/design/webm-to-mp4.png e2e/fixtures/diagram.png
```

- [ ] **Step 3: Write the failing e2e test**

```ts
// e2e/png-to-webp.spec.ts
import { expect, test } from '@playwright/test'

test('converts a PNG to WebP entirely in the browser', async ({ page }) => {
  const uploads: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' || request.method() === 'PUT') uploads.push(request.url())
  })

  await page.goto('/image/png-to-webp')
  await expect(page.getByRole('heading', { name: 'Convert PNG to WebP' })).toBeVisible()
  await expect(page.getByText('LOSSLESS')).toBeVisible()

  await page.setInputFiles('input[type=file]', 'e2e/fixtures/diagram.png')
  await page.getByRole('button', { name: 'CONVERT' }).click()

  await expect(page.getByTestId('result')).toBeVisible({ timeout: 30_000 })
  expect(uploads, 'no request may carry file bytes').toEqual([])
})
```

- [ ] **Step 4: Configure Playwright and run to verify it fails**

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: { command: 'pnpm dev', url: 'http://localhost:3000', reuseExistingServer: true },
})
```

Run: `pnpm playwright test`
Expected: FAIL initially if any wiring is incomplete.

- [ ] **Step 5: Run until it passes**

Run: `pnpm playwright test`
Expected: PASS — the result read-out appears and `uploads` is empty.

- [ ] **Step 6: Commit**

```bash
git add src/app e2e playwright.config.ts
git commit -m "feat: wire the png-to-webp vertical slice end to end"
```

---

### Task 14: Fidelity and network assertion harness

The two claims the product is built on, made mechanical.

**Files:**
- Create: `src/core/engines/__tests__/fidelity.test.ts`
- Modify: `package.json` (CI script)

**Interfaces:**
- Consumes: `jsquashWebp` from `@/core/engines`
- Produces: a reusable pattern every future engine's tests follow

- [ ] **Step 1: Write the failing fidelity test**

```ts
// src/core/engines/__tests__/fidelity.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { jsquashWebp } from '../jsquash-webp'

const source = readFileSync('e2e/fixtures/diagram.png')
const input = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength)

describe('jsquash-webp fidelity', () => {
  it('produces a valid WebP with the RIFF/WEBP signature', async () => {
    const out = await jsquashWebp.run(input.slice(0), { lossless: 1, quality: 100 }, () => {})
    const header = new Uint8Array(out.slice(0, 12))
    const tag = String.fromCharCode(...header.slice(0, 4))
    const format = String.fromCharCode(...header.slice(8, 12))
    expect(tag).toBe('RIFF')
    expect(format).toBe('WEBP')
  })

  it('round-trips lossless output to pixel-identical image data', async () => {
    const { default: decodePng } = await import('@jsquash/png/decode')
    const { default: decodeWebp } = await import('@jsquash/webp/decode')

    const original = await decodePng(input.slice(0))
    const encoded = await jsquashWebp.run(input.slice(0), { lossless: 1, quality: 100 }, () => {})
    const decoded = await decodeWebp(encoded)

    expect(decoded.width).toBe(original.width)
    expect(decoded.height).toBe(original.height)
    expect(Array.from(decoded.data)).toEqual(Array.from(original.data))
  })

  it('reports monotonically increasing progress ending at 1', async () => {
    const ticks: number[] = []
    await jsquashWebp.run(input.slice(0), { lossless: 1 }, (r) => ticks.push(r))
    expect(ticks.at(-1)).toBe(1)
    expect(ticks).toEqual([...ticks].sort((a, b) => a - b))
  })
})
```

- [ ] **Step 2: Run to verify it fails or passes honestly**

Run: `pnpm vitest run src/core/engines/__tests__/fidelity.test.ts`
Expected: PASS. **If the round-trip test fails, the lossless claim is false** — fix the engine parameters, do not weaken the test.

- [ ] **Step 3: Add the full gate to CI**

```json
{
  "scripts": {
    "ci": "pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm playwright test"
  }
}
```

- [ ] **Step 4: Run the full gate**

Run: `pnpm ci`
Expected: all stages pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/engines/__tests__/fidelity.test.ts package.json
git commit -m "test: enforce lossless round-trip and zero-upload guarantees"
```

---

## Self-Review

**Spec coverage.** Registry (§5.2) → Task 4. Engine layer with probing (§5.3) → Task 6. Execution pipeline with cancellation (§5.5) → Task 7. Cross-origin isolation (§5.6) → Task 1. Routing and structured data (§5.7) → Task 12. Two-tier quality model (§5.9) → Tasks 5 and 11. Design tokens and dual theme (§6) → Task 3. Testing strategy (§8) → Task 14.

**Deferred from this slice, tracked in PHASES.md:** remux-before-transcode (§5.4, no video engine yet), OPFS streaming, batch orchestration, worker *pool* (this slice spawns one worker per job), URL-encoded configuration, per-tool persistence, target-size search, perceptual scoring, PWA/offline, category hubs and `/tools` index, OG image generation, sitemap, full error-taxonomy UI. Each is a task in Phase 0 of the backlog and will be planned once these interfaces are real.

**Known limitation to fix in the next plan:** `ToolClient` constructs `new AbortController().signal` inline, so the Cancel path is not yet reachable from the UI. The pipeline supports cancellation (Task 7); only the UI wiring is deferred.
