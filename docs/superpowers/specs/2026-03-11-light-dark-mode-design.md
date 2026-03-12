# Light/Dark Mode Toggle -- Design Spec

**Date**: 2026-03-11
**Status**: Approved

## Overview

Add a light mode theme with a toggle to MapForge. The app currently has a permanent dark theme using a custom "forge" palette. This spec adds a light palette, system preference detection, and a manual toggle in the TopBar.

## Requirements

- Default to user's OS `prefers-color-scheme` on first visit
- Manual toggle in TopBar (right side, next to user info) overrides system preference
- Persist user's choice in `localStorage`
- Clean white light palette with existing amber/cyan accents preserved
- All existing components, AG Grid, and React Flow must support both themes

## Approach: CSS Custom Properties with `.dark` Class

### Why This Approach

Tailwind v4's `@theme` block already uses CSS custom properties. By making the forge palette values respond to a `.dark` class on `<html>`, every component that uses `forge-*` tokens switches automatically without any class changes in component code.

### Light Palette Mapping

The forge scale inverts -- dark numbers become light values:

| Token       | Dark (current)           | Light                    |
|-------------|--------------------------|--------------------------|
| forge-950   | `#08090D` (deepest bg)   | `#FFFFFF`                |
| forge-900   | `#0F1117` (card bg)      | `#F9FAFB`                |
| forge-850   | `#141620` (input bg)     | `#F3F4F6`                |
| forge-800   | `#1A1D2B` (surface)      | `#E5E7EB`                |
| forge-750   | `#212536` (disabled)     | `#D1D5DB`                |
| forge-700   | `#2A2F42` (border)       | `#D1D5DB`                |
| forge-600   | `#3D4460` (scrollbar)    | `#9CA3AF`                |
| forge-500   | `#5A6380`                | `#6B7280`                |
| forge-400   | `#7D869F` (muted text)   | `#4B5563`                |
| forge-300   | `#A0A8BC` (label text)   | `#374151`                |
| forge-200   | `#C4CAD9`                | `#1F2937`                |
| forge-100   | `#E2E5ED` (primary text) | `#111827`                |
| forge-50    | `#F1F2F6` (brightest)    | `#030712`                |

### Accent Color Adjustments (Light Mode)

Amber, cyan, and status colors stay the same hues but may need slightly darker shades for contrast on white backgrounds:

- **amber-600**: `#B45309` (darker for white bg contrast)
- **amber-500**: `#D97706`
- **amber-400**: `#F59E0B`
- **cyan-500**: `#0891B2` (darker for contrast)
- **cyan-400**: `#06B6D4`
- **status-clean**: `#059669` (darker green)
- **status-warning**: `#D97706` (darker amber)
- **status-error**: `#DC2626` (darker red)
- **status-info**: `#2563EB` (darker blue)

### Glow/Shadow Adjustments

Light mode replaces glow effects with subtle standard shadows:
- `--shadow-glow-amber`: `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(217,119,6,0.2)`
- `--shadow-glow-cyan`: `0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(6,182,212,0.2)`

## Architecture

### 1. ThemeProvider Context

**File**: `client/src/contexts/ThemeContext.tsx`

```
ThemeProvider
  - state: theme ('light' | 'dark' | 'system')
  - resolvedTheme: 'light' | 'dark' (what's actually applied)
  - toggleTheme(): cycles dark <-> light (sets explicit preference)
  - On mount: read localStorage('mapforge-theme')
    - If no value: use 'system' (check prefers-color-scheme)
    - If value exists: apply it
  - On change: write to localStorage, apply/remove .dark class on <html>
  - Listen to prefers-color-scheme media query for real-time system changes
```

### 2. Theme Toggle Component

**File**: `client/src/components/layout/ThemeToggle.tsx`

- Sun icon (light active) / Moon icon (dark active) from lucide-react
- Placed in TopBar right side
- Clicking toggles between light and dark (overrides system)
- Uses ghost button styling from existing Button component

### 3. CSS Restructure

**File**: `client/src/index.css`

Current `@theme` block with hardcoded hex values becomes:

1. Define CSS custom properties at `:root` with light values as default
2. Override those variables under `.dark` selector with dark values
3. Reference the custom properties in the `@theme` block via `var(--forge-950)` etc.
4. Scrollbar, selection, and base layer styles also switch via the custom properties
5. Glow/shadow custom properties also switch per mode

Example structure:
```css
:root {
  --forge-950: #FFFFFF;
  --forge-900: #F9FAFB;
  /* ... light values ... */
}
.dark {
  --forge-950: #08090D;
  --forge-900: #0F1117;
  /* ... dark values ... */
}
@theme {
  --color-forge-950: var(--forge-950);
  --color-forge-900: var(--forge-900);
  /* ... */
}
```

### FOUC Prevention

Add an inline script in `index.html` `<head>` (before any CSS loads) to set the `.dark` class immediately based on localStorage or system preference. This prevents a flash of the wrong theme:

```html
<script>
  (function() {
    var theme = localStorage.getItem('mapforge-theme');
    var dark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  })();
</script>
```

### 4. AG Grid Theming

- The project uses `ag-theme-quartz-dark-blue` (see EnrichmentGrid.tsx)
- Switch to `ag-theme-quartz` (light) or `ag-theme-quartz-dark-blue` (dark) based on resolvedTheme
- Override AG Grid CSS variables to match forge palette in both modes
- Update `grid.css` to use CSS custom properties instead of hardcoded forge colors

### 5. React Flow Theming

- @xyflow/react supports `colorMode` prop ('light' | 'dark') on the `<ReactFlow>` component
- Pass `resolvedTheme` from ThemeContext to React Flow's `colorMode` prop
- Custom node components already use forge-* tokens, so they switch automatically via CSS variables

### 6. Component Updates

Most components use `forge-*` classes which will switch automatically. Components needing manual attention:

- **AppLayout**: No changes needed (uses forge-950 bg)
- **TopBar**: Add ThemeToggle component
- **Card**: Glow effects need light-mode shadow variants
- **Button**: Focus ring offset color needs to reference forge bg
- **Badge**: Semi-transparent backgrounds may need opacity adjustments
- **Sidebar**: Hardcoded `bg-forge-900` and `border-forge-700` will switch via CSS vars; nav active state colors (amber-500/10) may need light mode variants
- **Grid components**: AG Grid theme class swap (`ag-theme-quartz` / `ag-theme-quartz-dark-blue`)
- **Pipeline canvas**: React Flow `colorMode` prop

## Provider Nesting Order

```
QueryClientProvider > BrowserRouter > AuthProvider > ThemeProvider > Routes
```

ThemeProvider wraps Routes so all page components can access theme context. It sits inside AuthProvider since theme is independent of auth state.

## localStorage Key

Use `mapforge-theme` as the localStorage key. Values: `'light'` | `'dark'` | absent (system default).

## Testing

- Toggle persists across page reloads
- System preference respected on first visit
- System preference change (OS toggle) updates theme in real-time when set to 'system'
- All pages render correctly in both modes (visual check in Chrome)
- AG Grid cells, headers, and scrollbars match theme
- React Flow canvas and custom nodes match theme
- Amber/cyan accents remain readable in both modes
- Focus states visible in both modes

## Files to Create/Modify

**New files:**
- `client/src/contexts/ThemeContext.tsx`
- `client/src/components/layout/ThemeToggle.tsx`

**Modified files:**
- `client/src/index.css` -- Restructure to CSS custom properties with light/dark variants
- `client/src/components/layout/TopBar.tsx` -- Add ThemeToggle
- `client/src/components/layout/AppLayout.tsx` -- Wrap with ThemeProvider
- `client/src/components/grid/grid.css` -- Use CSS custom properties
- `client/src/main.tsx` -- Add ThemeProvider to app root (inside AuthProvider, wrapping Routes)
- `client/index.html` -- Add inline FOUC prevention script in `<head>`
- Pipeline canvas component -- Pass `colorMode` to `<ReactFlow>`
- `client/src/components/layout/Sidebar.tsx` -- Verify nav active states in light mode
