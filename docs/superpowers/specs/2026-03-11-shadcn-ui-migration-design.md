# ShadCN UI Migration Design Spec

**Date:** 2026-03-11
**Status:** Draft
**Scope:** Full UI overhaul -- replace all custom components with shadcn/ui, retheme with MLB enterprise palette

## Context

MapForge currently uses ~13 custom components in `components/common/` built with raw HTML elements and Tailwind classes. Forms use plain `<select>`, `<input>`, `<textarea>` with ad-hoc `useState` validation. The Select component is a basic HTML `<select>` with no search/filter capability. The overall look feels dated and inconsistent.

This migration replaces the entire custom component system with shadcn/ui (Radix-based, copy-paste component model) and introduces a structured form validation stack.

## Design Decisions

- **Approach:** Big bang migration -- replace all components in one pass, no parallel system
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

Retained. shadcn supports it natively. Navy palette works well inverted (light text on dark navy backgrounds).

## Component Mapping

| Current (`common/`) | shadcn Replacement | Notes |
|---|---|---|
| Button.tsx | `button` | primary->default, secondary, ghost, danger->destructive |
| Input.tsx | `input` + `label` | Icon support via wrapper div, error states via form messaging |
| Select.tsx | `select` (basic) + `combobox` (searchable) | Combobox for searchable dropdowns |
| Modal.tsx | `dialog` | Size variants via className |
| Card.tsx | `card` (+header, title, description, content) | Direct 1:1 match |
| Badge.tsx | `badge` | Remap variants (amber->warning, cyan->secondary, etc.) |
| Tabs.tsx | `tabs` | Count badges become custom content in trigger |
| Table.tsx | `table` | For simple tables; AG Grid stays for spreadsheet |
| Tooltip.tsx | `tooltip` | Radix-based, better accessibility |
| Spinner.tsx | Custom (keep) | Use lucide Loader2 with animate-spin, restyle to match |
| ProgressBar.tsx | `progress` | Direct replacement |
| EmptyState.tsx | Custom (keep) | No shadcn equivalent, restyle to match |
| ProtectedRoute.tsx | Keep as-is | Not a UI component |
| NotificationBell.tsx | Restyle with `popover` + `badge` | |
| UserAvatar.tsx | `avatar` | |

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

### shadcn Initialization

Run `npx shadcn@latest init` in `client/`. Configures `components.json`, adds `lib/utils.ts` (the `cn()` helper). Components land in `client/src/components/ui/`.

### Dependencies Added

- `tailwind-merge` + `clsx` (via shadcn's `cn` utility)
- `class-variance-authority` (component variants)
- `@radix-ui/*` packages (installed per-component by shadcn CLI)
- `react-hook-form` + `@hookform/resolvers` + `zod` (form validation)
- `sonner` (replaces react-hot-toast)
- `cmdk` (powers command/combobox)

### Dependencies Removed

- `react-hot-toast` (replaced by sonner)

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

## Migration Order

1. **Foundation** -- Init shadcn, set up MLB theme in CSS variables, install all shadcn components, add react-hook-form + zod
2. **Delete `components/common/`** -- Remove old components (except ProtectedRoute, EmptyState, Spinner which get restyled)
3. **Layout shell** -- Migrate AppLayout, Sidebar, Header with shadcn dropdown-menu, avatar, button
4. **LoginPage** -- Smallest form, smoke test for the new component system
5. **ExercisesPage** -- Card grid with badges and buttons, validates card/badge components
6. **CredentialsPage** -- Simple form + table, validates input/form/table components
7. **ReferenceTablesPage** -- Table + modal form, validates dialog component
8. **AdminDashboardPage** -- Tabs + tables + badges, validates complex layouts
9. **BusinessDashboardPage** -- Cards and stats display
10. **Exercise Wizard (all steps)** -- Biggest migration, benefits from all components already proven. Searchable combobox built here.
11. **EnrichmentSpreadsheetPage** -- Toolbar and chrome only
12. **Pipeline pages** -- PipelinesPage, PipelineRunsPage, PipelineBuilderPage. Canvas untouched, toolbar and dialogs migrated.
13. **Replace react-hot-toast with sonner** -- Swap toast calls app-wide
