# Light/Dark Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light mode theme with a sun/moon toggle so MapForge respects system preference and allows manual override.

**Architecture:** CSS custom properties define both light and dark palettes at `:root` / `.dark`. Tailwind v4's `@theme` block references these variables. A React context manages theme state (system/light/dark), persists to localStorage, and applies the `.dark` class on `<html>`. An inline script in `index.html` prevents FOUC.

**Tech Stack:** React 19, Tailwind CSS 4 (`@theme` + CSS custom properties), lucide-react (Sun/Moon icons), AG Grid (`themeQuartz` + `colorSchemeDarkBlue`), @xyflow/react (`colorMode` prop)

**Spec:** `docs/superpowers/specs/2026-03-11-light-dark-mode-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/index.css` | Modify | Restructure `@theme` to use CSS custom properties with light/dark variants |
| `client/index.html` | Modify | Add inline FOUC prevention script |
| `client/src/contexts/ThemeContext.tsx` | Create | Theme state management, localStorage persistence, `.dark` class toggling |
| `client/src/components/layout/ThemeToggle.tsx` | Create | Sun/Moon toggle button for TopBar |
| `client/src/components/layout/AppLayout.tsx` | Modify | Add ThemeToggle to TopBar area |
| `client/src/App.tsx` | Modify | Wrap routes with ThemeProvider |
| `client/src/components/grid/EnrichmentGrid.tsx` | Modify | Dynamic AG Grid theme based on resolved theme |
| `client/src/components/grid/grid.css` | Modify | Ensure grid custom classes work with CSS variables (already does) |
| `client/src/components/pipeline/PipelineCanvas.tsx` | Modify | Pass `colorMode` to ReactFlow |
| `client/src/pages/LoginPage.tsx` | Modify | Wrap with ThemeProvider access (already inside App) |

---

## Chunk 1: CSS Foundation

### Task 1: Restructure index.css to use CSS custom properties

This is the critical foundation. Every other task depends on the forge palette being driven by CSS variables.

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Replace `@theme` color block with CSS custom properties**

Replace the entire `@theme` section and prepend `:root` / `.dark` variable blocks. The `@theme` block then references these variables.

```css
/* --- Theme Variables --- */
:root {
  /* Forge Palette - Light mode (default) */
  --forge-950: #FFFFFF;
  --forge-900: #F9FAFB;
  --forge-850: #F3F4F6;
  --forge-800: #E5E7EB;
  --forge-750: #D1D5DB;
  --forge-700: #D1D5DB;
  --forge-600: #9CA3AF;
  --forge-500: #6B7280;
  --forge-400: #4B5563;
  --forge-300: #374151;
  --forge-200: #1F2937;
  --forge-100: #111827;
  --forge-50: #030712;

  /* Amber - Light mode (darker for white bg contrast) */
  --amber-950: #451A03;
  --amber-900: #78350F;
  --amber-800: #92400E;
  --amber-700: #B45309;
  --amber-600: #B45309;
  --amber-500: #D97706;
  --amber-400: #F59E0B;
  --amber-300: #FBBF24;
  --amber-200: #FDE68A;
  --amber-100: #FEF3C7;

  /* Cyan - Light mode */
  --cyan-900: #164E63;
  --cyan-800: #155E75;
  --cyan-700: #0E7490;
  --cyan-600: #0891B2;
  --cyan-500: #0891B2;
  --cyan-400: #06B6D4;
  --cyan-300: #22D3EE;
  --cyan-200: #67E8F9;
  --cyan-100: #CFFAFE;

  /* Status - Light mode (darker for contrast) */
  --status-clean: #059669;
  --status-clean-muted: #D1FAE5;
  --status-warning: #D97706;
  --status-warning-muted: #FEF3C7;
  --status-error: #DC2626;
  --status-error-muted: #FEE2E2;
  --status-info: #2563EB;
  --status-info-muted: #DBEAFE;

  /* Shadows - Light mode */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.12);
  --shadow-glow-amber: 0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(217,119,6,0.2);
  --shadow-glow-cyan: 0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(6,182,212,0.2);
  --shadow-glow-error: 0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(220,38,38,0.2);
}

.dark {
  /* Forge Palette - Dark mode (original values) */
  --forge-950: #08090D;
  --forge-900: #0F1117;
  --forge-850: #141620;
  --forge-800: #1A1D2B;
  --forge-750: #212536;
  --forge-700: #2A2F42;
  --forge-600: #3D4460;
  --forge-500: #5A6380;
  --forge-400: #7D869F;
  --forge-300: #A0A8BC;
  --forge-200: #C4CAD9;
  --forge-100: #E2E5ED;
  --forge-50: #F1F2F6;

  /* Amber - Dark mode (original) */
  --amber-950: #2D1800;
  --amber-900: #5C3000;
  --amber-800: #8B4A00;
  --amber-700: #B56200;
  --amber-600: #D4790E;
  --amber-500: #E8A838;
  --amber-400: #F0C260;
  --amber-300: #F5D88A;
  --amber-200: #FAEAB5;
  --amber-100: #FDF5DC;

  /* Cyan - Dark mode (original) */
  --cyan-900: #083344;
  --cyan-800: #0C4A5E;
  --cyan-700: #0E6B8A;
  --cyan-600: #0E8AAD;
  --cyan-500: #22B8DB;
  --cyan-400: #38BDF8;
  --cyan-300: #67D4FF;
  --cyan-200: #A5E7FF;
  --cyan-100: #D6F4FF;

  /* Status - Dark mode (original) */
  --status-clean: #34D399;
  --status-clean-muted: #065F46;
  --status-warning: #FBBF24;
  --status-warning-muted: #713F12;
  --status-error: #F87171;
  --status-error-muted: #7F1D1D;
  --status-info: #60A5FA;
  --status-info-muted: #1E3A5F;

  /* Shadows - Dark mode (original) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.6);
  --shadow-glow-amber: 0 0 20px rgba(232, 168, 56, 0.15);
  --shadow-glow-cyan: 0 0 20px rgba(56, 189, 248, 0.15);
  --shadow-glow-error: 0 0 12px rgba(248, 113, 113, 0.2);
}
```

Then update the `@theme` block to reference variables:

```css
@theme {
  /* --- Forge Palette --- */
  --color-forge-950: var(--forge-950);
  --color-forge-900: var(--forge-900);
  --color-forge-850: var(--forge-850);
  --color-forge-800: var(--forge-800);
  --color-forge-750: var(--forge-750);
  --color-forge-700: var(--forge-700);
  --color-forge-600: var(--forge-600);
  --color-forge-500: var(--forge-500);
  --color-forge-400: var(--forge-400);
  --color-forge-300: var(--forge-300);
  --color-forge-200: var(--forge-200);
  --color-forge-100: var(--forge-100);
  --color-forge-50: var(--forge-50);

  /* --- Amber Accent --- */
  --color-amber-950: var(--amber-950);
  --color-amber-900: var(--amber-900);
  --color-amber-800: var(--amber-800);
  --color-amber-700: var(--amber-700);
  --color-amber-600: var(--amber-600);
  --color-amber-500: var(--amber-500);
  --color-amber-400: var(--amber-400);
  --color-amber-300: var(--amber-300);
  --color-amber-200: var(--amber-200);
  --color-amber-100: var(--amber-100);

  /* --- Cyan Accent --- */
  --color-cyan-900: var(--cyan-900);
  --color-cyan-800: var(--cyan-800);
  --color-cyan-700: var(--cyan-700);
  --color-cyan-600: var(--cyan-600);
  --color-cyan-500: var(--cyan-500);
  --color-cyan-400: var(--cyan-400);
  --color-cyan-300: var(--cyan-300);
  --color-cyan-200: var(--cyan-200);
  --color-cyan-100: var(--cyan-100);

  /* --- Status Colors --- */
  --color-status-clean: var(--status-clean);
  --color-status-clean-muted: var(--status-clean-muted);
  --color-status-warning: var(--status-warning);
  --color-status-warning-muted: var(--status-warning-muted);
  --color-status-error: var(--status-error);
  --color-status-error-muted: var(--status-error-muted);
  --color-status-info: var(--status-info);
  --color-status-info-muted: var(--status-info-muted);

  /* --- Typography (unchanged) --- */
  --font-display: 'Inter', system-ui, -apple-system, sans-serif;
  --font-sans: 'DM Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* --- Spacing (unchanged) --- */
  --spacing-px: 1px;
  --spacing-0: 0px;
  --spacing-0\.5: 2px;
  --spacing-1: 4px;
  --spacing-1\.5: 6px;
  --spacing-2: 8px;
  --spacing-2\.5: 10px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  --spacing-20: 80px;
  --spacing-24: 96px;

  /* --- Border Radius (unchanged) --- */
  --radius-none: 0px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-xl: 8px;
  --radius-full: 9999px;

  /* --- Shadows ---
     NOTE: Shadow variables are defined at :root/.dark level and used directly
     via var(--shadow-sm) etc. They do NOT go in @theme to avoid circular refs.
     Components use the CSS variables directly. */

  /* --- Animations (unchanged) --- */
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-slide-up: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-slide-down: slide-down 0.3s ease-out;
  --animate-scale-in: scale-in 0.2s ease-out;
  --animate-pulse-glow: pulse-glow 2s ease-in-out infinite;
  --animate-shimmer: shimmer 2s linear infinite;
}
```

The rest of `index.css` (keyframes, `@layer base`, `@layer utilities`) stays the same. The base layer already uses `var(--color-forge-*)` references which will now resolve through the CSS custom property chain.

- [ ] **Step 2: Verify dark mode renders correctly**

Start the dev server. Since there's no FOUC script or ThemeProvider yet, manually test by opening browser devtools and running `document.documentElement.classList.add('dark')` in the console.

Run: `cd client && npx vite --open`
Expected: After adding `.dark` class via console, app renders identically to the current dark theme.

- [ ] **Step 3: Verify light mode renders**

In the browser console, run `document.documentElement.classList.remove('dark')`.
Expected: App renders with white/gray backgrounds and dark text. The structure should be visible and readable.

- [ ] **Step 4: Commit**

```bash
git add client/src/index.css
git commit -m "refactor: restructure CSS to use custom properties for light/dark theming"
```

---

## Chunk 2: Theme Context and FOUC Prevention

### Task 2: Add FOUC prevention script to index.html

**Files:**
- Modify: `client/index.html`

- [ ] **Step 1: Add inline theme detection script**

Add this script as the first child of `<head>`, before any other tags (except `<meta charset>`):

```html
<script>
  (function() {
    var theme = localStorage.getItem('mapforge-theme');
    var dark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  })();
</script>
```

Also remove the hardcoded `bg-forge-950 text-forge-50` classes from `<body>` tag since those will now be handled by the CSS variables automatically. Replace with just `antialiased`:

```html
<body class="antialiased">
```

- [ ] **Step 2: Commit**

```bash
git add client/index.html
git commit -m "feat: add FOUC prevention script for theme detection"
```

### Task 3: Create ThemeContext

**Files:**
- Create: `client/src/contexts/ThemeContext.tsx`

- [ ] **Step 1: Write ThemeContext**

```tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'mapforge-theme';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(resolved: ResolvedTheme) {
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return 'system';
  });

  const resolved = resolveTheme(theme);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (newTheme === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, newTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setTheme]);

  // Apply theme class to <html>
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/contexts/ThemeContext.tsx
git commit -m "feat: add ThemeContext with system preference detection and localStorage persistence"
```

### Task 4: Wire ThemeProvider into App

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add ThemeProvider wrapping Routes**

Add import at top:
```tsx
import { ThemeProvider } from '@/contexts/ThemeContext';
```

Wrap the content inside `<AuthProvider>` with `<ThemeProvider>`:

```tsx
<AuthProvider>
  <ThemeProvider>
    <Toaster position="top-right" />
    <Routes>
      {/* ... existing routes ... */}
    </Routes>
  </ThemeProvider>
</AuthProvider>
```

- [ ] **Step 2: Verify dark mode still works**

Run the dev server. If your system preference is dark, the app should load in dark mode. If light, it should load in light mode. Toggle your OS dark mode to confirm real-time switching.

Run: `cd client && npx vite --open`

- [ ] **Step 3: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: wire ThemeProvider into App component tree"
```

---

## Chunk 3: Toggle UI and TopBar Integration

### Task 5: Create ThemeToggle component

**Files:**
- Create: `client/src/components/layout/ThemeToggle.tsx`

- [ ] **Step 1: Write ThemeToggle**

```tsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md text-forge-400 hover:text-forge-100 hover:bg-forge-800 transition-colors"
      title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/layout/ThemeToggle.tsx
git commit -m "feat: add ThemeToggle component with sun/moon icons"
```

### Task 6: Add ThemeToggle to AppLayout TopBar

**Files:**
- Modify: `client/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add ThemeToggle to the TopBar right section**

Add import:
```tsx
import { ThemeToggle } from './ThemeToggle';
```

In the TopBar right-side `<div>`, add `<ThemeToggle />` before `<NotificationBell />`:

```tsx
<div className="flex items-center gap-3">
  {topBarExtra}
  <ThemeToggle />
  <NotificationBell />
  {user && <UserAvatar user={user} size="sm" showDropdown />}
</div>
```

- [ ] **Step 2: Test the toggle**

Run the dev server, click the sun/moon toggle. The entire app should switch between light and dark. Refresh the page -- the choice should persist.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/AppLayout.tsx
git commit -m "feat: add theme toggle to AppLayout TopBar"
```

---

## Chunk 4: AG Grid and React Flow Integration

### Task 7: Dynamic AG Grid theme switching

**Files:**
- Modify: `client/src/components/grid/EnrichmentGrid.tsx`

- [ ] **Step 1: Make AG Grid theme respond to resolved theme**

Add import:
```tsx
import { useTheme } from '@/contexts/ThemeContext';
```

Inside the component, get the resolved theme and build the AG Grid theme dynamically. Light mode is just `themeQuartz` without any color scheme part (AG Grid community does not export a `colorSchemeLight` -- the default quartz theme is already light):

```tsx
const { resolvedTheme } = useTheme();
const agTheme = resolvedTheme === 'dark'
  ? themeQuartz.withPart(colorSchemeDarkBlue)
  : themeQuartz;
```

Remove the module-level `const agTheme = ...` line (line 34 currently).

Also update the wrapper div className to switch between AG Grid CSS class names:

```tsx
<div className={`flex-1 ${resolvedTheme === 'dark' ? 'ag-theme-quartz-dark-blue' : 'ag-theme-quartz'}`}>
```

- [ ] **Step 2: Test in both modes**

Open the enrichment spreadsheet page. Toggle theme. Grid should switch between light and dark styling.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/grid/EnrichmentGrid.tsx
git commit -m "feat: dynamic AG Grid theme switching based on resolved theme"
```

### Task 8: React Flow colorMode

**Files:**
- Modify: `client/src/components/pipeline/PipelineCanvas.tsx`

- [ ] **Step 1: Pass colorMode to ReactFlow**

Add import:
```tsx
import { useTheme } from '@/contexts/ThemeContext';
```

Inside the component:
```tsx
const { resolvedTheme } = useTheme();
```

Add `colorMode` prop to `<ReactFlow>`:
```tsx
<ReactFlow
  nodes={rfNodes}
  edges={rfEdges}
  nodeTypes={nodeTypes}
  onConnect={onConnect}
  onNodeClick={onNodeClick}
  onNodeDragStop={onNodeDragStop}
  onPaneClick={onPaneClick}
  colorMode={resolvedTheme}
  fitView
  className="bg-forge-950"
>
```

Also update the Background color. The hardcoded `#374151` won't adapt to theme changes. Use the CSS variable so it switches automatically:

```tsx
<Background color="var(--forge-700)" gap={20} />
```

- [ ] **Step 2: Test pipeline canvas in both modes**

Navigate to `/pipelines/new`. Toggle theme. Canvas background, controls, and minimap should match the theme. Custom nodes use forge-* classes so they switch automatically.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/pipeline/PipelineCanvas.tsx
git commit -m "feat: add colorMode support to pipeline canvas"
```

---

## Chunk 5: Visual Polish and Verification

### Task 9: Verify and fix body/login page styles

**Files:**
- Modify: `client/src/pages/LoginPage.tsx` (if needed)

- [ ] **Step 1: Visual check of LoginPage in light mode**

The LoginPage uses `bg-forge-950`, `bg-forge-900`, `text-forge-50`, etc. These all reference CSS variables now and should switch automatically. Load `/login` in both modes and verify it looks correct.

If the login page needs a ThemeToggle (since users aren't logged in yet), add one to the top-right corner:

Add import and add toggle to the login page:
```tsx
import { ThemeToggle } from '@/components/layout/ThemeToggle';
```

Add at the top of the outer div:
```tsx
<div className="min-h-screen flex items-center justify-center bg-forge-950 relative">
  <div className="absolute top-4 right-4">
    <ThemeToggle />
  </div>
  {/* ... existing card ... */}
</div>
```

- [ ] **Step 2: Commit if changes were made**

```bash
git add client/src/pages/LoginPage.tsx
git commit -m "feat: add theme toggle to login page"
```

### Task 10: Visual audit in Chrome - all pages both modes

- [ ] **Step 1: Check each page in light mode**

Navigate through every page in Chrome, toggling between light and dark:
1. `/login` -- card and form should have proper contrast
2. `/admin` -- dashboard cards, stats, charts
3. `/dashboard` -- user dashboard
4. `/exercises` -- exercise list cards
5. `/exercises/:id` -- AG Grid spreadsheet
6. `/pipelines` -- pipeline list
7. `/pipelines/new` -- React Flow canvas
8. `/reference-tables` -- table list
9. `/credentials` -- credentials page

For each page, verify:
- Background colors are white/light gray (not dark)
- Text is dark and readable
- Amber accents are visible and have good contrast
- Borders are visible but subtle
- Scrollbars match the theme
- Focus rings are visible

- [ ] **Step 2: Fix any issues found**

Common issues to watch for:
- Hardcoded hex colors (e.g., `#374151` in PipelineCanvas Background -- already handled in Task 8)
- `rgba()` backgrounds that look wrong on white (e.g., `bg-amber-500/10` might be too faint on white)
- Inline styles with hardcoded dark colors
- AG Grid cell custom styling in grid.css

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: visual polish for light mode across all pages"
```

### Task 11: Toast notification styling

**Note:** This modifies `App.tsx` again (previously modified in Task 4). Apply this change to the already-modified file.

- [ ] **Step 1: Check react-hot-toast styling**

Toasts from `react-hot-toast` may need theme-aware styling. In `App.tsx`, update the Toaster:

```tsx
<Toaster
  position="top-right"
  toastOptions={{
    style: {
      background: 'var(--forge-900)',
      color: 'var(--forge-100)',
      border: '1px solid var(--forge-700)',
    },
  }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: theme-aware toast notification styling"
```
