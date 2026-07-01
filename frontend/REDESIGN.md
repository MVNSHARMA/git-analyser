# Frontend Redesign: Neo-Brutalist → Primer-Token-Based UI (Light + Dark)

## Context

`frontend/` currently ships a neo-brutalist theme (thick 3px black borders, hard offset
drop-shadow hovers, forced-zero border-radius, terracotta/ochre palette, uppercase
`Darker Grotesque` type) that was a placeholder UI kit, not an intentional design. The product
— "talk to your GitHub repo like an LLM" — benefits from visually associating with GitHub
(building instant trust/familiarity for its developer audience) while staying clearly its own
product, not a GitHub clone. The plan: adopt **GitHub Primer's design tokens only** (color
ramps, spacing, radius, shadow — not the `@primer/react` component library, to avoid a heavy
new dependency and a second styling paradigm on top of the existing Tailwind setup), add one
distinctive brand accent color, use GitHub's system font stack for UI chrome, and use IBM Plex
Mono specifically for content the tool actively generates (chat responses, commit SHAs,
diffs/code). Dark mode is included from the start, following OS preference with a persisted
override, because the token architecture below is deliberately CSS-variable-driven so light and
dark are just two value sets behind the same names.

Grounded via direct inspection of `tailwind.config.ts`, `src/index.css`, `index.html`,
`src/main.tsx`, all 9 `src/components/shared/*` files, `src/pages/Dashboard.tsx` (chat/code
region, sidebar footer region), `src/pages/auth/LoginPage.tsx`, `src/App.tsx`. Confirmed
hardcoded-hex counts via grep: Dashboard.tsx=119, Settings.tsx=22, LandingPage.tsx=21,
SignupPage.tsx=16, LoginPage.tsx=13, Badge.tsx=5, Button.tsx=6, Modal.tsx=5, Avatar.tsx=2,
main.tsx=5, index.css=18 (234 total, 12 files). `brutal-hover`/`brutal-card` used in 6 files (27
occurrences); `rounded-none`/uppercase-brutalist typography in 19 spots across 7 files; 2px/3px
borders in 57 spots across 11 files. No shared Layout/nav component exists — every page owns its
own header markup independently (confirmed in `App.tsx`, `Dashboard.tsx`, `Settings.tsx`,
`LandingPage.tsx`).

---

## 1. Token architecture (Primer Primitives-derived, light + dark)

### 1a. `src/index.css` — light tokens in `:root`, dark tokens in `[data-theme="dark"]`

Replace the current brutalist `:root` block. Keep everything CSS-variable-driven (not hardcoded
directly in `tailwind.config.ts`) so light/dark is just two value blocks behind the same names.

```css
:root {
  /* Canvas / surface */
  --color-canvas-default:  #ffffff;
  --color-canvas-subtle:   #f6f8fa;
  --color-canvas-inset:    #f6f8fa;

  /* Foreground (text) */
  --color-fg-default: #1f2328;
  --color-fg-muted:   #656d76;
  --color-fg-subtle:  #6e7781;
  --color-fg-on-emphasis: #ffffff;

  /* Borders */
  --color-border-default: #d0d7de;
  --color-border-muted:   #d8dee4;
  --color-border-subtle:  rgba(31, 35, 40, 0.15);

  /* Neutral gray ramp */
  --color-neutral-50:  #f6f8fa;
  --color-neutral-100: #eaeef2;
  --color-neutral-200: #d0d7de;
  --color-neutral-300: #afb8c1;
  --color-neutral-400: #8c959f;
  --color-neutral-500: #6e7781;
  --color-neutral-600: #57606a;
  --color-neutral-700: #424a53;
  --color-neutral-800: #32383f;
  --color-neutral-900: #24292f;

  /* Semantic status */
  --color-success-fg: #1a7f37;
  --color-success-emphasis: #2da44e;
  --color-attention-fg: #9a6700;
  --color-attention-emphasis: #d4a72c;
  --color-danger-fg: #d1242f;
  --color-danger-emphasis: #cf222e;

  /* Product accent — RESOLVED: warm mustard-gold, deliberately hue/saturation-shifted away
     from the attention/warning yellow above so the two are never visually confusable.
     Accent sits at HSL hue 50 (true yellow-gold) vs attention-fg's hue 40 and
     attention-emphasis's hue 44 (both lean more orange) — same "warm gold" family, clearly
     separable side-by-side. White-on-accent-emphasis contrast = 4.97:1 (passes WCAG AA 4.5:1). */
  --color-accent-emphasis: #856e00;
  --color-accent-emphasis-hover: #665500;
  --color-accent-subtle: #fbf7e4;

  /* Radius */
  --radius-small:  3px;
  --radius-medium: 6px;
  --radius-large:  12px;
  --radius-full:   9999px;

  /* Shadow / elevation */
  --shadow-small:  0 1px 0 rgba(31, 35, 40, 0.04);
  --shadow-medium: 0 3px 6px rgba(140, 149, 159, 0.15);
  --shadow-large:  0 8px 24px rgba(140, 149, 159, 0.2);
}

[data-theme="dark"] {
  --color-canvas-default:  #0d1117;
  --color-canvas-subtle:   #161b22;
  --color-canvas-inset:    #010409;

  --color-fg-default: #e6edf3;
  --color-fg-muted:   #8b949e;
  --color-fg-subtle:  #6e7681;
  --color-fg-on-emphasis: #ffffff;

  --color-border-default: #30363d;
  --color-border-muted:   #21262d;
  --color-border-subtle:  rgba(240, 246, 252, 0.1);

  --color-neutral-50:  #161b22;
  --color-neutral-100: #21262d;
  --color-neutral-200: #30363d;
  --color-neutral-300: #484f58;
  --color-neutral-400: #6e7681;
  --color-neutral-500: #8b949e;
  --color-neutral-600: #b1bac4;
  --color-neutral-700: #c9d1d9;
  --color-neutral-800: #e6edf3;
  --color-neutral-900: #f0f6fc;

  --color-success-fg: #3fb950;
  --color-success-emphasis: #238636;
  --color-attention-fg: #d29922;
  --color-attention-emphasis: #9e6a03;
  --color-danger-fg: #f85149;
  --color-danger-emphasis: #da3633;

  /* Accent — dark variant needed brightening, not reuse of the light value, to stay legible:
     bright warm gold, near-black text on top. Contrast (near-black on accent) = 10.96:1. */
  --color-accent-emphasis: #f5d63d;
  --color-accent-emphasis-hover: #fbe36a;
  --color-accent-subtle: #393418;
  --color-fg-on-emphasis: #1f2328; /* overrides the light default for this bright accent */

  --shadow-small:  0 1px 0 rgba(0, 0, 0, 0.3);
  --shadow-medium: 0 3px 6px rgba(0, 0, 0, 0.4);
  --shadow-large:  0 8px 24px rgba(0, 0, 0, 0.5);
}
```

Delete: `* { border-radius: 0 !important }` (global override — do this first, it blocks every
other visual change). Delete: `.brutal-hover` / `.brutal-card` utility blocks (replaced in
Section 3). Restyle scrollbar rules to use `var(--color-border-default)` /
`var(--color-accent-emphasis)` instead of the old brand vars.

Note: dark-theme hex values above are GitHub's well-established dark palette (e.g. `#0d1117`
canvas, `#30363d` border are widely recognizable GitHub dark-mode constants); the accent triad
was numerically contrast-checked. If pixel-perfect fidelity to the current live Primer package
matters later, cross-check against `@primer/primitives`' dark theme JSON — not required to ship
this plan, just a nice-to-have accuracy pass.

### 1b. `tailwind.config.ts` — semantic color/radius/shadow/font tokens

```ts
colors: {
  canvas: {
    default: 'var(--color-canvas-default)',
    subtle:  'var(--color-canvas-subtle)',
    inset:   'var(--color-canvas-inset)',
  },
  fg: {
    default: 'var(--color-fg-default)',
    muted:   'var(--color-fg-muted)',
    subtle:  'var(--color-fg-subtle)',
    onEmphasis: 'var(--color-fg-on-emphasis)',
  },
  border: {
    default: 'var(--color-border-default)',
    muted:   'var(--color-border-muted)',
    subtle:  'var(--color-border-subtle)',
  },
  neutral: {
    50: 'var(--color-neutral-50)', 100: 'var(--color-neutral-100)',
    200: 'var(--color-neutral-200)', 300: 'var(--color-neutral-300)',
    400: 'var(--color-neutral-400)', 500: 'var(--color-neutral-500)',
    600: 'var(--color-neutral-600)', 700: 'var(--color-neutral-700)',
    800: 'var(--color-neutral-800)', 900: 'var(--color-neutral-900)',
  },
  success: { fg: 'var(--color-success-fg)', emphasis: 'var(--color-success-emphasis)' },
  attention: { fg: 'var(--color-attention-fg)', emphasis: 'var(--color-attention-emphasis)' },
  danger: { fg: 'var(--color-danger-fg)', emphasis: 'var(--color-danger-emphasis)' },
  accent: {
    emphasis: 'var(--color-accent-emphasis)',
    hover:    'var(--color-accent-emphasis-hover)',
    subtle:   'var(--color-accent-subtle)',
  },
  // keep brand/secondary/ink/surface/error/success/warning as deprecated aliases during
  // the migration window (Section 5), delete once all 17 files are converted (Section 5.4)
},
borderRadius: {
  DEFAULT: 'var(--radius-medium)',
  small: 'var(--radius-small)',
  medium: 'var(--radius-medium)',
  large: 'var(--radius-large)',
},
boxShadow: {
  'elevation-small':  'var(--shadow-small)',
  'elevation-medium': 'var(--shadow-medium)',
  'elevation-large':  'var(--shadow-large)',
},
fontFamily: {
  sans: [
    '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Noto Sans',
    'Helvetica', 'Arial', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"',
  ],
  mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
},
```

Do not touch `animation`/`keyframes` (`fade-in`, `slide-in`, `pulse-slow`) — confirmed fine as-is.

**No `darkMode` config needed.** Theme switching happens by toggling a `[data-theme="dark"]`
attribute on `<html>`, which the CSS variable overrides above respond to automatically —
independent of Tailwind's `dark:` variant system. Do not add `dark:` utility classes anywhere;
everything already flows through the `var(--color-*)` tokens. (Escape hatch for later: if a
component ever needs a structurally different dark treatment, not just recolored, add
`darkMode: ['selector', '[data-theme="dark"]']` then — not needed for this migration.)

---

## 2. What to delete vs keep

Delete:
- `* { border-radius: 0 !important }` in `src/index.css`
- `.brutal-hover` / `.brutal-card` utilities in `src/index.css`
- `border-[3px]` / `border-2` / `border-[2px]` thick-border usages (replaced per-component)
- `font-black uppercase tracking-wider/widest` pattern (Button, Input labels, Badge, Modal
  title, all auth pages, Dashboard headers) → Primer uses normal-case, weight 600 max
- `colors.brand` (terracotta ramp), `colors.secondary` (ochre) from `tailwind.config.ts` once
  migration completes (deprecated aliases only during the transition window)
- `'Darker Grotesque'` and `'JetBrains Mono'` `<link>` in `index.html`

Keep as-is:
- `animation`/`keyframes` in `tailwind.config.ts`
- Component structure/logic and `App.tsx` routing/`ProtectedRoute` — pure visual migration, no
  behavior changes

---

## 3. Replacement utilities for `.brutal-hover` / `.brutal-card`

```css
@layer utilities {
  .surface-hover {
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .surface-hover:hover {
    box-shadow: var(--shadow-medium);
    border-color: var(--color-border-muted);
  }

  .surface-card {
    background-color: var(--color-canvas-default);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-medium);
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .surface-card:hover {
    box-shadow: var(--shadow-medium);
  }
}
```

Sweep mapping: `brutal-hover` → `surface-hover`, `brutal-card` → `surface-card`,
`border-[3px] border-[#111827]` → `border border-default rounded-md` (Primer uses 1px hairline
borders — the "weight" signal brutalism relied on is replaced by elevation shadow, not border
thickness). `rounded-none` → delete (rely on the new default `rounded-md`).

---

## 4. Codemod-able hex → token regex sweep

234 occurrences across 12 files. Do a mechanical find/replace pass first (~70-80% of
occurrences), then hand-fix the remainder (gradients, opacity-modified values like
`bg-[#DD614C]/10`, context-specific cases like the chat bubble accent border).

| Find (exact literal)              | Replace with            |
|------------------------------------|--------------------------|
| `border-[#111827]`                 | `border-default`        |
| `text-[#111827]`                   | `text-fg-default`       |
| `bg-[#111827]`                     | `bg-fg-default`         |
| `border-t-[#111827]` / `border-b-[#111827]` | `border-t-default` / `border-b-default` |
| `bg-white` (surface/card contexts) | `bg-canvas-default` — CAUTION: audit each hit, some are intentionally literal |
| `text-gray-500` / `-400` / `-600`  | `text-fg-muted` |
| `border-[#DD614C]`                 | `border-accent-emphasis` |
| `text-[#DD614C]`                   | `text-accent-emphasis`  |
| `bg-[#DD614C]`                     | `bg-accent-emphasis`    |
| `hover:bg-[#c24c38]` / `hover:bg-[#c54d39]` | `hover:bg-accent-hover` |
| `border-[#DC2626]` / `text-[#DC2626]` | `border-danger-fg` / `text-danger-fg` |
| `border-[#16A34A]` / `text-[#16A34A]` | `border-success-fg` / `text-success-fg` |
| `border-[#D97706]` / `text-[#D97706]` | `border-attention-fg` / `text-attention-fg` |
| `font-black uppercase tracking-wider/widest` | `font-semibold` (drop uppercase/tracking) — manual review, not pure mechanical |

Run file-by-file (not a blind repo-wide sed) since `bg-white` and some grays are
context-sensitive. Review the diff per file before moving to the next.

---

## 5. Migration order

Rationale: infra first (nothing else can start without it) → shared components (establish the
vocabulary, consumed everywhere, so pages benefit for free before being touched directly) →
pages ordered simplest-to-hardest (auth pages validate the token set cheaply; Dashboard last,
highest risk) → cleanup once nothing references the deprecated aliases.

**5.1 Infrastructure**
- `frontend/src/index.css` — new `:root` + `[data-theme="dark"]` tokens, delete global radius
  override, delete/replace brutal utilities, restyle scrollbar
- `frontend/tailwind.config.ts` — new tokens (keep `brand`/`secondary`/`ink`/`surface` as
  deprecated aliases during transition)
- `frontend/index.html` — swap Google Fonts `<link>`: drop Darker Grotesque + JetBrains Mono,
  add IBM Plex Mono (`family=IBM+Plex+Mono:wght@400;500;600`); system sans needs no link
- **New:** `frontend/src/stores/themeStore.ts` — Zustand store + `persist` middleware
  (`localStorage` key `theme-preference`). On init: if no persisted override, read
  `window.matchMedia('(prefers-color-scheme: dark)').matches`. Exposes `theme: 'light'|'dark'`
  and `setTheme()`; applies theme via `document.documentElement.setAttribute('data-theme', theme)`.
- `frontend/src/main.tsx` — apply the resolved theme synchronously *before*
  `ReactDOM.createRoot(...).render(...)` to avoid a flash of wrong theme; also restyle the
  `Toaster` (Section 7).
- **New:** `frontend/src/components/shared/ThemeToggle.tsx` — small reusable toggle button
  (sun/moon icon swap), not a full nav/Layout component. Drop into each page's *existing* header
  markup: Dashboard's sidebar footer icon row (~lines 239-271, alongside Settings/Logout icons),
  Settings header, LandingPage header, auth pages' header area. A full shared Layout/nav
  component is explicitly out of scope for this change — reuse existing per-page chrome.

**5.2 Shared components** (`frontend/src/components/shared/`), dependency order:
- `Spinner.tsx` (leaf — swap `border-t-brand-500` styling)
- `Badge.tsx` (leaf, 5 hex — direct token swap per variant)
- `Avatar.tsx` (leaf, 2 hex)
- `Button.tsx` (used everywhere — `border-[3px]` → `border border-default rounded-md`, drop
  `uppercase tracking-wider font-black` → `font-medium`, `brutal-hover` → `surface-hover`,
  primary variant → `bg-accent-emphasis hover:bg-accent-hover text-fg-onEmphasis`)
- `Input.tsx` (border/focus → `border-default` / `focus:border-accent-emphasis`)
- `Modal.tsx` (`border-[3px]` → `border rounded-lg shadow-elevation-large`, header bg `#fdfdfd`
  → `bg-canvas-subtle`)
- `IndexingProgress.tsx` (currently references `bg-surface-900`/`text-surface-200`, which don't
  exist in the current config and are likely no-ops today — fix to `bg-canvas-subtle`/
  `text-fg-muted`)
- `AddRepoModal.tsx` (composes Modal/Input/Button — verify after those convert; likely needs
  zero direct changes)
- `ProtectedRoute.tsx` (loading screen `bg-surface-900 text-white` → `bg-canvas-default
  text-fg-default`)

**5.3 Pages** (`frontend/src/pages/`), simplest first:
- `auth/CallbackPage.tsx`, `auth/VerifyEmailPage.tsx` (small/loading-state only)
- `auth/ForgotPasswordPage.tsx`, `auth/ResetPasswordPage.tsx` (small forms)
- `auth/LoginPage.tsx` (13 hex — `bg-white` outer → `bg-canvas-default`, card `border-[#111827]`
  → `border border-default rounded-lg shadow-elevation-medium`; keep the top accent bar as a
  thin `bg-accent-emphasis` strip — the one place a strong accent line reads as intentional
  branding rather than leftover brutalism)
- `auth/SignupPage.tsx` (16 hex — same shape as LoginPage)
- `auth/LandingPage.tsx` (21 hex — marketing/hero page, most freedom for the accent color to
  show up as the "pop")
- `Settings.tsx` (22 hex — forms/toggles; also where `ThemeToggle` can additionally live as an
  explicit "Appearance" setting alongside the nav toggle, if useful)
- `Dashboard.tsx` (119 hex, LAST — sidebar → commits table → contributor cards → chat panel, in
  that order. Chat panel needs care: user bubble `border-[#111827]` → `border-default`;
  **de-tint the assistant bubble from accent to neutral** — use `bg-canvas-subtle
  border-border-default` rather than tinting every AI response with the accent color, so accent
  stays reserved for primary actions and the tool's identity comes through via the avatar/icon
  instead; inline code `bg-[#DD614C]/10 text-[#DD614C]` → `bg-accent-subtle
  text-accent-emphasis` (fine to keep accent here); code block `pre` → `bg-canvas-subtle border
  border-default font-mono` (now correctly resolving to IBM Plex Mono))

**5.4 Cleanup pass** (after all files converted and manually verified):
- Remove deprecated `brand`/`secondary`/`ink`/`surface` entries from `tailwind.config.ts`
- Grep repo-wide for remaining hex literals in `src/` to confirm near-zero stragglers (legitimate
  exceptions: `bg-black/60` modal backdrop scrim, fine to keep literal)

---

## 6. IBM Plex Mono scope

Add to `index.html`'s Google Fonts link: `family=IBM+Plex+Mono:wght@400;500;600`. System sans
needs no Google Fonts entry (OS-native).

Apply `font-mono` (now IBM Plex Mono) to:
- AI chat response code blocks/inline code (`Dashboard.tsx` `ReactMarkdown` rendering, already
  using `font-mono` in most spots — just needs the underlying token swapped)
- Commit SHA display in the commits table (add `font-mono` where missing — verify during 5.3)
- Diff/code snippet `<pre>`/`<code>` blocks generally

Keep system sans on: nav, sidebar, buttons, labels, form inputs, headings, body copy, badges,
tabs, and repo names (repo names are GitHub metadata display, not tool-generated content).

---

## 7. `main.tsx` Toaster restyle

Current colors (`#1a1d2e` bg / `#f0f2ff` text) are a mismatched dark-mode leftover, unrelated to
this redesign but worth fixing alongside it since it's the same file:

```tsx
<Toaster
  position="top-right"
  toastOptions={{
    style: {
      background: 'var(--color-canvas-default)',
      color: 'var(--color-fg-default)',
      border: '1px solid var(--color-border-default)',
      borderRadius: 'var(--radius-medium)',
      boxShadow: 'var(--shadow-medium)',
      fontFamily: 'inherit',
      fontSize: '14px',
    },
    success: { iconTheme: { primary: 'var(--color-success-emphasis)', secondary: '#ffffff' } },
    error:   { iconTheme: { primary: 'var(--color-danger-emphasis)', secondary: '#ffffff' } },
  }}
/>
```

Inline `style` objects can read CSS custom properties directly via `var(--...)` — no extra work
needed, and this automatically follows theme switches since the vars themselves change. Drop the
hardcoded `'Inter, sans-serif'` (Inter was never actually loaded) in favor of `fontFamily:
'inherit'`.

---

## 8. Verification approach (manual — no VRT tooling exists)

Dev server already runs via `npm run dev` at `localhost:3000`.

1. **After Section 5.1 (tokens + config, before component migration):** confirm the app still
   renders without Tailwind/PostCSS build errors; toggle `data-theme` manually via browser
   DevTools (`document.documentElement.setAttribute('data-theme','dark')`) to sanity-check the
   dark override block resolves before `themeStore`/`ThemeToggle` even exist.
2. **After each shared component conversion (5.2):** spot-check every variant/size prop
   combination — Button's 4 variants × 3 sizes, Badge's 5 variants, Modal open/close, Input
   focus/error states — **in both light and dark** (toggle via the DevTools trick above until
   `ThemeToggle` ships, then via the real toggle) — by viewing them in situ on whichever page
   already renders them (Login/Signup exercise Button+Input; Dashboard exercises
   Badge+Modal+Avatar+IndexingProgress).
3. **After each page conversion (5.3):** load that route, check contrast is legible in **both
   themes**, check hover states show the new `surface-hover`/`surface-card` shadow (a missed
   class-name swap will silently produce a dead-looking element — watch for that specifically
   since `brutal-hover` is being removed).
4. **Dashboard-specific:** exercise the chat panel with an AI response containing a fenced code
   block + inline code to confirm IBM Plex Mono renders (check via DevTools computed
   font-family), check commits tab SHA rendering, check contributor cards — in both themes.
5. **Theme toggle-specific (new):** verify no flash-of-wrong-theme on page load/refresh in both
   OS-preference states (test by changing OS dark/light setting and reloading with no stored
   override), verify the persisted override survives a refresh, verify toggling updates every
   open page consistently.
6. **Cross-cutting:** after all files convert, one full click-through (landing → signup/login →
   dashboard → add repo modal → chat → settings) in both light and dark to catch inconsistent
   leftover brutalist styling, plus confirm Toaster renders correctly on a success and an error
   toast in both themes.
7. **Final grep sweep:** re-run the hex-literal grep across `src/` to confirm near-zero count
   (excluding legitimate literals like `bg-black/60`); grep for `brutal-hover`, `brutal-card`,
   `Darker Grotesque`, `JetBrains Mono` repo-wide to confirm zero remaining references.

---

## Summary of concrete file changes

| File | Change |
|---|---|
| `frontend/src/index.css` | New `:root` + `[data-theme="dark"]` Primer token vars; delete global `border-radius:0`; delete `.brutal-hover`/`.brutal-card`, add `.surface-hover`/`.surface-card`; restyle scrollbar |
| `frontend/tailwind.config.ts` | Add `canvas`/`fg`/`border`/`neutral`/`success`/`attention`/`danger`/`accent` colors (var-backed), `borderRadius`, `boxShadow`, new `fontFamily.sans`/`fontFamily.mono`; deprecate then remove `brand`/`secondary`/`ink`/`surface` |
| `frontend/index.html` | Replace Google Fonts link: drop Darker Grotesque + JetBrains Mono, add IBM Plex Mono only |
| `frontend/src/main.tsx` | Pre-render theme init (read `themeStore`, set `data-theme` before mount); restyle `Toaster` to token-driven theme |
| **`frontend/src/stores/themeStore.ts`** (new) | Zustand + `persist`: OS-preference-on-first-load, persisted override, `data-theme` application |
| **`frontend/src/components/shared/ThemeToggle.tsx`** (new) | Reusable light/dark toggle button, dropped into existing per-page headers |
| `frontend/src/components/shared/Spinner.tsx` | Token swap |
| `frontend/src/components/shared/Badge.tsx` | Token swap per variant |
| `frontend/src/components/shared/Avatar.tsx` | Token swap |
| `frontend/src/components/shared/Button.tsx` | Token swap, drop uppercase/brutal-hover, new variant styles using `accent`/`danger` tokens |
| `frontend/src/components/shared/Input.tsx` | Token swap, border/focus states |
| `frontend/src/components/shared/Modal.tsx` | Token swap, `border` + `rounded-lg` + `shadow-elevation-large` |
| `frontend/src/components/shared/IndexingProgress.tsx` | Fix already-broken `surface-900`/`surface-200` refs to real tokens |
| `frontend/src/components/shared/AddRepoModal.tsx` | No direct changes expected |
| `frontend/src/components/shared/ProtectedRoute.tsx` | Loading screen token swap |
| `frontend/src/pages/auth/CallbackPage.tsx` | Token swap |
| `frontend/src/pages/auth/VerifyEmailPage.tsx` | Token swap |
| `frontend/src/pages/auth/ForgotPasswordPage.tsx` | Token swap |
| `frontend/src/pages/auth/ResetPasswordPage.tsx` | Token swap |
| `frontend/src/pages/auth/LoginPage.tsx` | Token swap, `ThemeToggle` in header |
| `frontend/src/pages/auth/SignupPage.tsx` | Token swap, `ThemeToggle` in header |
| `frontend/src/pages/auth/LandingPage.tsx` | Token swap, accent as hero "pop", `ThemeToggle` in header |
| `frontend/src/pages/Settings.tsx` | Token swap, `ThemeToggle` in header (possibly also as explicit Appearance setting) |
| `frontend/src/pages/Dashboard.tsx` | Token swap in sub-passes (chrome → table → cards → chat); IBM Plex Mono on SHAs/code blocks; de-tint assistant chat bubble from accent to neutral; `ThemeToggle` in sidebar footer icon row |

## Decisions resolved during planning

- **Accent color**: warm mustard-gold, `#856e00` light / `#f5d63d` dark — hue-shifted and
  saturation/lightness-separated from Primer's attention/warning yellow so the two read as
  distinct even though both are in the "warm gold" family. Passes WCAG AA in both themes.
- **Dark mode**: OS `prefers-color-scheme` on first load, persisted override via
  `themeStore.ts`, toggle placed in each page's existing header (no new shared Layout/nav
  introduced — out of scope for this change).
