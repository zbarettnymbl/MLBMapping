# ShadCN UI Migration Design Spec

**Date:** 2026-03-11
**Status:** Draft
**Scope:** Full UI overhaul -- replace all custom components with shadcn/ui, retheme with MLB enterprise palette

## Context

MapForge currently uses ~13 custom components in `components/common/` built with raw HTML elements and Tailwind classes. Forms use plain `<select>`, `<input>`, `<textarea>` with ad-hoc `useState` validation. The Select component is a basic HTML `<select>` with no search/filter capability. The overall look feels dated and inconsistent.

This migration replaces the entire custom component system with shadcn/ui (Radix-based, copy-paste component model) and introduces a structured form validation stack.

## Design Decisions

- **Approach:** Sequential replacement migration -- replace all custom components with shadcn equivalents page by page, then delete old components once nothing imports them. No parallel component system -- each page is fully migrated before moving on.
- **Theme:** MLB enterprise aesthetic (navy, white, subtle blue accents) -- clean Statcast-inspired data dashboard feel, not the current "Industrial Precision" forge theme
- **Searchable selects:** Simple searchable select via shadcn combobox (command + popover). Type to filter a flat list, pick one. No async loading or multi-select needed.
- **Form validation:** react-hook-form + zod + shadcn Form component replaces ad-hoc useState validation
- **Untouched:** AG Grid (spreadsheet), React Flow (pipeline canvas) -- these keep their own styling

## Theme & Design Language

### Color Palette (MLB Enterprise)

| Role | Value | Usage |
|------|-------|-------|
| Primary | #041E42 (Navy) | Headers, primary buttons, sidebar |
| Secondary | #005A9C (MLB Blue) | Accents, links, hover states |
| Background | #FFFFFF / #F5F7FA | Page backgrounds |
| Surface | #FFFFFF | Cards on gray backgrounds |
| Border | #E2E8F0 | Subtle borders |
| Text primary | #041E42 | Headings |
| Text body | #475569 | Body text |
| Destructive | #DC2626 | Errors, delete actions |
| Success | #16A34A | Confirmations |
| Muted | #94A3B8 | Placeholders, disabled states |

### Typography

System font stack (shadcn default): `-apple-system, BlinkMacSystemFont, "Segoe UI", ...`

Drop custom fonts (DM Sans, Inter, JetBrains Mono). Let the data be the focus, not the font.

### Border Radius

shadcn default (0.5rem). Slightly rounded, modern but professional.

### Dark Mode

Retained. shadcn supports it natively via the `dark` class on `<html>`.

| Role | Light | Dark |
|------|-------|------|
| Background | #FFFFFF / #F5F7FA | #0A0F1E / #111827 |
| Surface (cards) | #FFFFFF | #1E293B |
| Primary | #041E42 | #93C5FD (light blue for contrast) |
| Secondary | #005A9C | #60A5FA |
| Border | #E2E8F0 | #334155 |
| Text primary | #041E42 | #F1F5F9 |
| Text body | #475569 | #CBD5E1 |
| Muted | #94A3B8 | #64748B |

Destructive (#DC2626) and Success (#16A34A) remain the same in both modes.

## Component Mapping

| Current (`common/`) | shadcn Replacement | Notes |
|---|---|---|
| Button.tsx | `button` (extended) | See Button Migration Pattern below |
| Input.tsx | `input` + `label` | Icon support via wrapper div, error states via form messaging |
| Select.tsx | `select` (basic) + `combobox` (searchable) | Combobox for searchable dropdowns |
| Modal.tsx | `dialog` | Size variants via className |
| Card.tsx | `card` (+header, title, description, content) | Direct 1:1 match |
| Badge.tsx | `badge` | Variant mapping: default->default, amber->warning, cyan->secondary, error->destructive, warning->warning, clean->success (custom), outline->outline |
| Tabs.tsx | `tabs` | Count badges become custom content in trigger |
| Table.tsx | `table` | For simple tables; AG Grid stays for spreadsheet |
| Tooltip.tsx | `tooltip` | Radix-based, better accessibility |
| Spinner.tsx | Custom (keep) | Use lucide Loader2 with animate-spin, restyle to match |
| ProgressBar.tsx | `progress` | Direct replacement |
| EmptyState.tsx | Custom (keep) | No shadcn equivalent, restyle to match |
| ProtectedRoute.tsx | Keep as-is | Not a UI component |
| NotificationBell.tsx | Restyle with `popover` + `badge` | |
| UserAvatar.tsx | `avatar` | |

### Button Migration Pattern

The current Button has `isLoading`, `icon`, and `iconPosition` props that shadcn's button does not include. These are used across ~14 files. The approach:

- Extend shadcn's `button.tsx` directly (since we own the code) to add `isLoading`, `icon`, and `iconPosition` props
- `isLoading`: renders `<Loader2 className="animate-spin" />` from lucide-react before children, disables the button
- `icon` / `iconPosition`: renders the icon ReactNode before or after children
- Variant mapping: primary->default, secondary->secondary, ghost->ghost, danger->destructive

This keeps the same API surface so page migrations are straightforward -- just change the import path.

### Badge Variant Mapping

| Current | shadcn | Notes |
|---------|--------|-------|
| default | default | |
| amber | warning | Custom variant added to shadcn badge |
| cyan | secondary | |
| error | destructive | |
| warning | warning | Same as amber |
| clean | success | Custom variant added to shadcn badge |
| outline | outline | |

shadcn's badge ships with default, secondary, destructive, outline. We add `warning` and `success` variants to match current usage.

### New Components

- `command` -- powers searchable select (combobox)
- `popover` -- used by combobox and notification bell
- `dropdown-menu` -- action menus, user menu in header
- `separator` -- clean dividers
- `skeleton` -- loading states where appropriate
- `sonner` -- replaces react-hot-toast
- `form` -- structured form validation with react-hook-form + zod
- `radio-group` -- wizard step radio selections

## Technical Setup

### Tailwind CSS v4 Compatibility

This project uses Tailwind CSS 4 via `@tailwindcss/vite` (no `tailwind.config.js`). shadcn has v4 support. Key considerations:

- `npx shadcn@latest init` detects Tailwind v4 and configures accordingly
- Theme variables go in `@theme` blocks in `index.css` (Tailwind v4 style), not in a JS config
- shadcn's CSS variables (`--primary`, `--background`, etc.) are defined as standard CSS custom properties and referenced via `@theme` for Tailwind utility class generation
- The existing `@theme` block in `index.css` is replaced with shadcn's variable system, with MLB colors mapped in
- `components.json` will use `style: "default"` and the CSS-variables approach compatible with v4

### shadcn Initialization

Run `npx shadcn@latest init` in `client/`. Select Tailwind v4 mode when prompted. Configures `components.json`, adds `lib/utils.ts` (the `cn()` helper). Components land in `client/src/components/ui/`.

Expected `components.json` key settings:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "tailwind": {
    "css": "src/index.css",
    "baseColor": "slate"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### Dependencies Added

- `tailwind-merge` + `clsx` (via shadcn's `cn` utility)
- `class-variance-authority` (component variants)
- `@radix-ui/*` packages (installed per-component by shadcn CLI)
- `react-hook-form` + `@hookform/resolvers` + `zod` (form validation)
- `sonner` (replaces react-hot-toast)
- `cmdk` (powers command/combobox)

### Dependencies Removed

- `react-hot-toast` (replaced by sonner)
- `autoprefixer` (not needed with Tailwind v4)

### File Structure After Migration

```
client/src/components/
  ui/               # shadcn components (button, input, dialog, etc.)
  common/           # App-specific composites (EmptyState, Spinner, ProtectedRoute)
  dashboard/        # Dashboard-specific components
  grid/             # AG Grid components (unchanged)
  layout/           # AppLayout, Sidebar, Header
  pipeline/         # React Flow components (canvas unchanged, toolbar migrated)
  wizard/           # Wizard step components
```

### CSS Changes

- `index.css` rewritten with shadcn's CSS variable system
- MLB navy palette mapped to shadcn variable names (`--primary`, `--secondary`, `--background`, etc.)
- Remove all custom forge color variables, custom shadow/glow definitions
- Keep AG Grid and React Flow custom CSS

### Path Alias

`@/` already maps to `client/src/` -- shadcn expects this, no config change needed.

## Form Validation Strategy

**Stack:** react-hook-form + zod + shadcn Form component

- Define a zod schema per form (e.g., `loginSchema`, `exerciseInfoSchema`)
- shadcn `<Form>` wraps react-hook-form's `FormProvider`
- `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` handle layout and error display
- Validation errors render automatically below the field

### Where This Applies

- LoginPage (email, password)
- Exercise Wizard steps (name, description, data source config, column mapping)
- CredentialsPage (add credential form)
- ReferenceTablesPage (add/edit table)
- Pipeline node configuration dialogs

### What Stays As-Is

- AG Grid inline editing (has its own validation)
- Zustand stores that manage wizard state -- react-hook-form handles per-step form state, wizard store tracks step progression and accumulates submitted data

### Wizard Store / react-hook-form Boundary

The Exercise Wizard has a Zustand store (`exerciseWizardStore`) that tracks the current step and accumulates data across steps. With react-hook-form:

- Each wizard step component gets its own zod schema and `useForm()` instance
- On step submit (`form.handleSubmit`), validated data is pushed into the Zustand store via its existing actions
- Step navigation validation (can I advance?) is handled by react-hook-form's `isValid` state -- the "Next" button is disabled until the current step's form is valid
- The Zustand store API does not change -- it still receives data the same way, just from react-hook-form's `onSubmit` instead of raw state

## Page-by-Page Migration Scope

**LoginPage** -- Replace raw HTML inputs with shadcn input, button, label. Add form with zod validation.

**ExerciseWizardPage + Steps 1-9** -- Biggest surface area. Replace all inputs, selects, textareas, radio groups, buttons. Cascading dropdowns in Step2 become combobox with searchable filtering. Radio button groups become shadcn radio-group.

**AdminDashboardPage** -- Tabs, tables, badges, cards. Structural component swaps.

**EnrichmentSpreadsheetPage** -- AG Grid untouched. Toolbar buttons, filter dropdowns, and surrounding chrome get shadcn treatment.

**PipelineBuilderPage** -- React Flow canvas untouched. Toolbar buttons, node palette, and forms/dialogs within nodes migrated.

**PipelinesPage / PipelineRunsPage** -- Tables, badges, buttons. Straightforward swaps.

**ExercisesPage** -- Card grid, buttons, status badges.

**CredentialsPage** -- Form inputs, buttons, table.

**ReferenceTablesPage** -- Table, modal for add/edit, form inputs.

**BusinessDashboardPage** -- Cards, charts/stats display. Structural.

**AppLayout (Sidebar + Header)** -- Navigation links, user menu (dropdown-menu), notification bell (popover), theme toggle.

## Toast Migration (react-hot-toast -> sonner)

sonner has a different API from react-hot-toast. Key differences:

| react-hot-toast | sonner |
|---|---|
| `import toast from 'react-hot-toast'` | `import { toast } from 'sonner'` |
| `toast.success('msg')` | `toast.success('msg')` (same) |
| `toast.error('msg')` | `toast.error('msg')` (same) |
| `toast('msg')` | `toast('msg')` (same) |
| `<Toaster />` from `react-hot-toast` | `<Toaster />` from `sonner` |

The API is largely compatible. Main change is the import path and swapping the `<Toaster>` provider in `App.tsx`. Toast calls in `useAdmin.ts`, `useAutoSave.ts`, and `EnrichmentSpreadsheetPage.tsx` need import path updates. Any toast configuration options (position, duration) use different prop names on sonner's `<Toaster>`.

## Testing Strategy

Client tests exist in `client/src/__tests__/` and `client/src/pages/__tests__/` and `client/src/stores/__tests__/`. Migration impact:

- **Component render tests:** Will break due to changed component structure (different DOM output from shadcn vs custom). Update alongside each page migration step -- when a page is migrated, its tests are updated in the same step.
- **Store tests:** Unaffected. Zustand stores don't render components.
- **MSW mocks:** Unaffected. API mocking is independent of UI components.
- **Testing library queries:** May need updates -- `getByRole`, `getByText` queries may find different elements with shadcn's Radix-based DOM structure. Fix as encountered during page migration.

## Migration Order

1. **Foundation** -- Init shadcn, set up MLB theme in CSS variables, install all shadcn components, add react-hook-form + zod. Extend Button with `isLoading`/`icon` props. Add custom Badge variants (warning, success).
2. **Layout shell** -- Migrate AppLayout, Sidebar, Header with shadcn dropdown-menu, avatar, button. Update imports from `common/` to `ui/`.
3. **LoginPage** -- Smallest form, smoke test for the new component system. Update any tests.
4. **ExercisesPage** -- Card grid with badges and buttons, validates card/badge components.
5. **CredentialsPage** -- Simple form + table, validates input/form/table components.
6. **ReferenceTablesPage** -- Table + modal form, validates dialog component.
7. **AdminDashboardPage** -- Tabs + tables + badges, validates complex layouts. Update tests.
8. **BusinessDashboardPage** -- Cards and stats display.
9. **Exercise Wizard (all steps)** -- Biggest migration, benefits from all components already proven. Searchable combobox built here.
10. **EnrichmentSpreadsheetPage** -- Toolbar and chrome only (AG Grid untouched).
11. **Pipeline pages** -- PipelinesPage, PipelineRunsPage, PipelineBuilderPage. Canvas untouched, toolbar and dialogs migrated.
12. **Replace react-hot-toast with sonner** -- Swap toast provider in App.tsx, update import paths in all files.
13. **Delete old `components/common/`** -- Remove Button, Input, Select, Modal, Card, Badge, Tabs, Table, Tooltip, ProgressBar. Keep ProtectedRoute, EmptyState (restyled), Spinner (restyled). Remove `react-hot-toast` from package.json.
