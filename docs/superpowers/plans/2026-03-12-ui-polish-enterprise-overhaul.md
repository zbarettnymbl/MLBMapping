# UI Polish & Enterprise Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform MapForge from generic AI-looking UI into a polished enterprise application worthy of mlb.com -- fixing missing hover states, cursor pointers, garish delete buttons, raw HTML selects, inconsistent badge colors, and adding a navy sidebar.

**Architecture:** Bottom-up approach: fix the design tokens and base components first (CSS variables, Button, Badge, global cursor-pointer), then sweep through every page/component replacing raw HTML elements with the styled UI components. No new dependencies needed -- all tools already exist (Radix primitives, CVA, Tailwind CSS variables).

**Tech Stack:** React 19, Tailwind CSS 4, Radix UI primitives, class-variance-authority (CVA), lucide-react

---

## File Structure

### Files to Modify (design system foundation)
- `client/src/index.css` -- Update CSS variables for navy sidebar theme, refine badge colors
- `client/src/components/ui/button.tsx` -- Add `cursor-pointer` to base class
- `client/src/components/ui/badge.tsx` -- Replace raw Tailwind colors with CSS variable-based colors, add refined enterprise palette
- `client/src/components/ui/tabs.tsx` -- Add `cursor-pointer` to TabsTrigger

### Files to Modify (layout)
- `client/src/components/layout/Sidebar.tsx` -- Navy background, refined active states
- `client/src/components/layout/AppLayout.tsx` -- Subtle refinements

### Files to Modify (pages -- destructive button + card consistency)
- `client/src/pages/ReferenceTablesPage.tsx` -- Replace inline destructive Delete with ghost/icon button
- `client/src/pages/PipelinesPage.tsx` -- Replace inline destructive Delete with ghost/icon button
- `client/src/pages/CredentialsPage.tsx` -- Replace inline destructive Remove with ghost/icon button

### Files to Modify (raw `<select>` -> Radix Select or styled native select)
- `client/src/components/pipeline/config/BigQuerySourceForm.tsx` -- 4 raw selects + 2 raw buttons
- `client/src/components/pipeline/config/BigQueryDestinationForm.tsx` -- 4 raw selects + 3 raw buttons
- `client/src/components/pipeline/config/EnrichmentExerciseForm.tsx` -- 1 raw select + 2 raw buttons
- `client/src/components/pipeline/config/NotificationForm.tsx` -- 1 raw select
- `client/src/components/pipeline/config/TransformForm.tsx` -- 2 raw buttons + raw inputs
- `client/src/components/pipeline/config/ValidationGateForm.tsx` -- 2 raw buttons
- `client/src/components/pipeline/TriggerConfigPanel.tsx` -- 2 raw selects
- `client/src/components/pipeline/NodeConfigDrawer.tsx` -- 2 raw tab buttons
- `client/src/components/grid/BulkEditPanel.tsx` -- 2 raw selects + 3 raw buttons
- `client/src/components/grid/SpreadsheetHeader.tsx` -- 2 raw buttons + 1 raw input
- `client/src/components/bigquery/BigQuerySidebar.tsx` -- 1 raw select + 3 raw buttons
- `client/src/components/bigquery/BigQueryTableView.tsx` -- 1 raw select + 2 raw buttons
- `client/src/components/reference-tables/ManualColumnEditor.tsx` -- 1 raw select + 1 raw button
- `client/src/components/reference-tables/BigQuerySourceStep.tsx` -- 3 raw selects + 2 raw buttons

### Files to Modify (raw `<button>` in other components)
- `client/src/components/grid/SpreadsheetFooter.tsx`
- `client/src/components/grid/QuickFilterBar.tsx`
- `client/src/components/grid/DependentPicklistEditor.tsx`
- `client/src/components/grid/MultiSelectEditor.tsx`
- `client/src/components/grid/DateCellEditor.tsx`
- `client/src/components/bigquery/BigQueryDatasetTree.tsx`
- `client/src/components/bigquery/BigQuerySchemaPanel.tsx`
- `client/src/components/reference-tables/CreateReferenceTableModal.tsx`
- `client/src/components/reference-tables/CsvUploadStep.tsx`
- `client/src/components/wizard/WizardStepper.tsx`
- `client/src/components/wizard/Step7UserAssignment.tsx`
- `client/src/components/dashboard/ExerciseTable.tsx` -- SortableHeader raw buttons

### New File to Create
- `client/src/components/ui/native-select.tsx` -- Styled native `<select>` wrapper for pipeline config forms where Radix Select is overkill (simple dropdowns in drawers)

---

## Chunk 1: Design System Foundation

### Task 1: Add `cursor-pointer` to Button component

**Files:**
- Modify: `client/src/components/ui/button.tsx:9`

- [ ] **Step 1: Add cursor-pointer to button base classes**

In `button.tsx`, the `buttonVariants` cva base string is missing `cursor-pointer`. Add it:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  // ... rest unchanged
```

- [ ] **Step 2: Verify the app still builds**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ui/button.tsx
git commit -m "fix: add cursor-pointer to Button component base styles"
```

### Task 2: Add `cursor-pointer` to TabsTrigger

**Files:**
- Modify: `client/src/components/ui/tabs.tsx:32`

- [ ] **Step 1: Add cursor-pointer to TabsTrigger base classes**

In `tabs.tsx`, the TabsTrigger className string is missing `cursor-pointer`. Add it after `transition-all`:

```typescript
"inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all cursor-pointer focus-visible:outline-none ..."
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ui/tabs.tsx
git commit -m "fix: add cursor-pointer to TabsTrigger component"
```

### Task 3: Refine Badge color palette for enterprise look

**Files:**
- Modify: `client/src/components/ui/badge.tsx`

The current badge uses raw Tailwind colors (`bg-yellow-100`, `bg-green-100`) that look garish. Replace with muted, enterprise-grade tones using HSL values that integrate with the design system.

- [ ] **Step 1: Update badge variants**

Replace the entire `badgeVariants` definition:

```typescript
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/10 text-primary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive",
        outline: "text-foreground border-border",
        warning:
          "border-transparent bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning",
        success:
          "border-transparent bg-success/10 text-success dark:bg-success/15 dark:text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

Key changes:
- `rounded-full` -> `rounded-md` (more professional)
- `font-semibold` -> `font-medium` (less aggressive)
- All variants now use `color/10` opacity pattern for backgrounds -- subtle, enterprise-appropriate
- Success uses `bg-success/10 text-success` instead of raw `bg-green-100 text-green-800`
- Warning uses `bg-warning/10 text-warning` instead of raw `bg-yellow-100 text-yellow-800`
- Default uses `bg-primary/10 text-primary` instead of heavy solid background
- Destructive uses `bg-destructive/10 text-destructive` instead of solid red

- [ ] **Step 2: Verify build**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ui/badge.tsx
git commit -m "fix: refine badge variants with muted enterprise color palette"
```

### Task 4: Create styled NativeSelect component

**Files:**
- Create: `client/src/components/ui/native-select.tsx`

Many pipeline config forms use raw `<select>` elements. Rather than converting all of these to the heavy Radix Select (which would be overkill for simple config drawers), create a lightweight styled `<select>` wrapper that matches the Input component styling.

- [ ] **Step 1: Create the NativeSelect component**

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
})
NativeSelect.displayName = "NativeSelect"

export { NativeSelect }
```

- [ ] **Step 2: Verify build**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ui/native-select.tsx
git commit -m "feat: add styled NativeSelect component for form selects"
```

### Task 5: Update CSS variables and font stack

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Add sidebar-specific CSS variables and update font**

Add new CSS variables for the navy sidebar and refine the font stack. Add these variables inside the `:root` block:

```css
    --sidebar: 215 50% 14%;
    --sidebar-foreground: 210 40% 80%;
    --sidebar-accent: 207 100% 31%;
    --sidebar-muted: 215 40% 20%;
    --sidebar-border: 215 30% 22%;
```

And the dark mode equivalents inside `.dark`:

```css
    --sidebar: 222 47% 8%;
    --sidebar-foreground: 210 40% 80%;
    --sidebar-accent: 217 91% 68%;
    --sidebar-muted: 222 30% 15%;
    --sidebar-border: 222 30% 18%;
```

Add the theme mappings inside `@theme inline`:

```css
  --color-sidebar: hsl(var(--sidebar));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-accent: hsl(var(--sidebar-accent));
  --color-sidebar-muted: hsl(var(--sidebar-muted));
  --color-sidebar-border: hsl(var(--sidebar-border));
```

- [ ] **Step 2: Verify build**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add client/src/index.css
git commit -m "feat: add navy sidebar CSS variables to design system"
```

---

## Chunk 2: Sidebar Navy Overhaul

### Task 6: Restyle Sidebar with navy theme

**Files:**
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar component with navy theme**

Replace the aside className and update all internal elements to use the new sidebar color scheme:

```tsx
<aside className="w-52 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
```

Update brand section:
```tsx
<div className="h-14 flex items-center px-5 border-b border-sidebar-border gap-2.5">
  <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center">
    <Flame className="w-4 h-4 text-white" />
  </div>
  <span className="text-base font-semibold text-white tracking-tight">MapForge</span>
</div>
```

Update navigation section labels:
```tsx
<div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
```

Update NavLink className:
```tsx
<NavLink
  key={item.to}
  to={item.to}
  className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-all duration-150 ${
    active
      ? 'bg-white/10 text-white font-semibold shadow-[inset_3px_0_0_0] shadow-sidebar-accent'
      : 'text-sidebar-foreground font-medium hover:bg-sidebar-muted hover:text-white'
  }`}
>
  <span className={active ? 'text-sidebar-accent' : 'text-sidebar-foreground/70'}>
    <Icon className="w-[18px] h-[18px]" />
  </span>
  {item.label}
</NavLink>
```

Update user footer:
```tsx
<div className="border-t border-sidebar-border px-3 py-3">
  <div className="flex items-center gap-2.5">
    <div className="w-7 h-7 rounded-full bg-sidebar-muted flex items-center justify-center text-[11px] font-semibold text-sidebar-foreground uppercase">
      {user.name?.charAt(0) || '?'}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[12px] font-medium text-white truncate">{user.name}</p>
      <p className="text-[10px] text-sidebar-foreground/60 truncate">{user.role}</p>
    </div>
    <button
      onClick={logout}
      className="p-1 text-sidebar-foreground/60 hover:text-white transition-colors cursor-pointer"
      title="Sign out"
    >
      <LogOut className="w-4 h-4" />
    </button>
  </div>
</div>
```

- [ ] **Step 2: Verify build and visual check**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/Sidebar.tsx
git commit -m "feat: restyle sidebar with navy enterprise theme"
```

---

## Chunk 3: Delete Button Patterns & Page Consistency

### Task 7: Replace destructive delete buttons across pages

The prominent red "Delete" / "Remove" buttons on list pages look aggressive and AI-generated. Replace them with subtle ghost icon buttons that only reveal on hover.

**Files:**
- Modify: `client/src/pages/ReferenceTablesPage.tsx`
- Modify: `client/src/pages/PipelinesPage.tsx`
- Modify: `client/src/pages/CredentialsPage.tsx`

- [ ] **Step 1: Fix ReferenceTablesPage.tsx delete button**

Add `Trash2` to the lucide-react imports. Replace the inline destructive Delete button (lines 94-103) with:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7 text-muted-foreground hover:text-destructive"
  onClick={(e) => {
    e.stopPropagation();
    setDeleteTarget({ id: table.id, name: table.name });
  }}
>
  <Trash2 size={14} />
</Button>
```

- [ ] **Step 2: Fix PipelinesPage.tsx delete button**

Add `Trash2` to the lucide-react imports. Replace the destructive Delete button (lines 120-127) with:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7 text-muted-foreground hover:text-destructive"
  onClick={() => handleDelete(pipeline.id, pipeline.name)}
>
  <Trash2 size={14} />
</Button>
```

- [ ] **Step 3: Fix CredentialsPage.tsx remove button**

Add `Trash2` to the lucide-react imports. Replace the destructive Remove button (lines 187-191) with:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7 text-muted-foreground hover:text-destructive"
  onClick={() => handleDelete(cred.id, cred.name)}
>
  <Trash2 size={14} />
</Button>
```

- [ ] **Step 4: Fix NodeConfigDrawer.tsx full-width destructive delete**

In `NodeConfigDrawer.tsx` (line 135-139), change the full-width destructive delete button to a more subtle pattern:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5"
  onClick={() => removeNode(selectedNode.id)}
>
  Delete Node
</Button>
```

- [ ] **Step 5: Verify build**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/ReferenceTablesPage.tsx client/src/pages/PipelinesPage.tsx client/src/pages/CredentialsPage.tsx client/src/components/pipeline/NodeConfigDrawer.tsx
git commit -m "fix: replace garish destructive delete buttons with subtle ghost icons"
```

---

## Chunk 4: Pipeline Config Forms -- Replace Raw Selects & Buttons

### Task 8: Fix BigQuerySourceForm.tsx

**Files:**
- Modify: `client/src/components/pipeline/config/BigQuerySourceForm.tsx`

- [ ] **Step 1: Replace raw selects and buttons**

Add import at top:
```typescript
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
```

Replace each `<select ... className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground">` with `<NativeSelect>`.

Replace the Query Type toggle buttons (lines 88-109) with proper styled toggle using CSS variables instead of raw `bg-blue-50 border-blue-400 text-blue-700`:

```tsx
<div className="flex gap-2">
  <Button
    type="button"
    variant={config.queryType === 'table' || !config.queryType ? 'default' : 'outline'}
    size="sm"
    className="flex-1"
    onClick={() => update({ queryType: 'table' })}
  >
    Table
  </Button>
  <Button
    type="button"
    variant={config.queryType === 'query' ? 'default' : 'outline'}
    size="sm"
    className="flex-1"
    onClick={() => update({ queryType: 'query' })}
  >
    Custom SQL
  </Button>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/BigQuerySourceForm.tsx
git commit -m "fix: replace raw selects and buttons in BigQuerySourceForm"
```

### Task 9: Fix BigQueryDestinationForm.tsx

**Files:**
- Modify: `client/src/components/pipeline/config/BigQueryDestinationForm.tsx`

- [ ] **Step 1: Replace raw selects and buttons**

Same pattern as Task 8. Import `NativeSelect` and `Button`. Replace all 4 raw `<select>` with `<NativeSelect>`. Replace the Write Mode toggle buttons (lines 102-115) -- replace raw `bg-purple-50 border-purple-400 text-purple-700` with Button component:

```tsx
<div className="flex gap-1">
  {(['merge', 'append', 'overwrite'] as const).map(mode => (
    <Button
      key={mode}
      type="button"
      variant={config.writeMode === mode ? 'default' : 'outline'}
      size="sm"
      className="flex-1 text-xs"
      onClick={() => update({ writeMode: mode })}
    >
      {mode.charAt(0).toUpperCase() + mode.slice(1)}
    </Button>
  ))}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/BigQueryDestinationForm.tsx
git commit -m "fix: replace raw selects and buttons in BigQueryDestinationForm"
```

### Task 10: Fix EnrichmentExerciseForm.tsx

**Files:**
- Modify: `client/src/components/pipeline/config/EnrichmentExerciseForm.tsx`

- [ ] **Step 1: Replace raw select and mode toggle buttons**

Import `NativeSelect` and `Button`. Replace the raw select with `NativeSelect`. Replace the mode toggle buttons (lines 36-55) -- remove raw `bg-amber-50 border-amber-400 text-amber-700` and use Button component.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/EnrichmentExerciseForm.tsx
git commit -m "fix: replace raw selects and buttons in EnrichmentExerciseForm"
```

### Task 11: Fix NotificationForm.tsx

**Files:**
- Modify: `client/src/components/pipeline/config/NotificationForm.tsx`

- [ ] **Step 1: Replace raw select**

Import `NativeSelect`. Replace the Recipient Type raw `<select>` with `<NativeSelect>`.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/NotificationForm.tsx
git commit -m "fix: replace raw select in NotificationForm"
```

### Task 12: Fix TransformForm.tsx

**Files:**
- Modify: `client/src/components/pipeline/config/TransformForm.tsx`

- [ ] **Step 1: Replace raw toggle buttons and remove button**

Import `Button`. Replace transform type toggle buttons (lines 41-54) -- remove raw `bg-cyan-500/20 border-cyan-500/50 text-cyan-300`:

```tsx
{SUPPORTED_TYPES.map(type => (
  <Button
    key={type}
    type="button"
    variant={config.transformType === type ? 'default' : 'outline'}
    size="sm"
    className="flex-1"
    onClick={() => update({ transformType: type, config: {} })}
  >
    {type.charAt(0).toUpperCase() + type.slice(1)}
  </Button>
))}
```

Replace the column mapping remove `x` button (line 94-101) with:
```tsx
<Button
  type="button"
  variant="ghost"
  size="icon"
  className="h-6 w-6 text-muted-foreground hover:text-destructive"
  onClick={() => { /* existing handler */ }}
>
  <X size={12} />
</Button>
```

Replace the `+ Add column mapping` link-style button (line 106-113) with:
```tsx
<Button variant="ghost" size="sm" className="text-xs" onClick={/* existing handler */}>
  + Add column mapping
</Button>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/TransformForm.tsx
git commit -m "fix: replace raw buttons in TransformForm with Button component"
```

### Task 13: Fix ValidationGateForm.tsx

**Files:**
- Modify: `client/src/components/pipeline/config/ValidationGateForm.tsx`

- [ ] **Step 1: Replace On Failure toggle buttons**

Import `Button`. Replace the failure action toggle buttons (lines 77-97) -- remove raw `bg-red-50 border-red-400 text-red-700` and `bg-yellow-50 border-yellow-400 text-yellow-700`:

```tsx
<div className="flex gap-2">
  <Button
    type="button"
    variant={config.failAction === 'stop' || !config.failAction ? 'default' : 'outline'}
    size="sm"
    className="flex-1"
    onClick={() => updateNodeConfig(nodeId, { ...config, failAction: 'stop' })}
  >
    Stop Pipeline
  </Button>
  <Button
    type="button"
    variant={config.failAction === 'warn_and_continue' ? 'default' : 'outline'}
    size="sm"
    className="flex-1 text-xs"
    onClick={() => updateNodeConfig(nodeId, { ...config, failAction: 'warn_and_continue' })}
  >
    Warn & Continue
  </Button>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/config/ValidationGateForm.tsx
git commit -m "fix: replace raw toggle buttons in ValidationGateForm"
```

### Task 14: Fix TriggerConfigPanel.tsx

**Files:**
- Modify: `client/src/components/pipeline/TriggerConfigPanel.tsx`

- [ ] **Step 1: Replace raw selects**

Import `NativeSelect`. Replace both raw `<select>` elements (trigger type selector and cron preset selector) with `<NativeSelect>`. Keep the existing height/size classes (`h-8`).

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/TriggerConfigPanel.tsx
git commit -m "fix: replace raw selects in TriggerConfigPanel"
```

### Task 15: Fix NodeConfigDrawer.tsx tab buttons

**Files:**
- Modify: `client/src/components/pipeline/NodeConfigDrawer.tsx`

- [ ] **Step 1: Replace raw tab buttons with cursor-pointer**

The two tab buttons (lines 98-121) are raw `<button>` elements. Add `cursor-pointer` to both button classNames. These are custom tabs within a drawer so they don't need the Radix Tabs component, but they do need proper cursor.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/NodeConfigDrawer.tsx
git commit -m "fix: add cursor-pointer to NodeConfigDrawer tab buttons"
```

---

## Chunk 5: Grid, BigQuery & Reference Table Components

### Task 16: Fix BulkEditPanel.tsx

**Files:**
- Modify: `client/src/components/grid/BulkEditPanel.tsx`

- [ ] **Step 1: Replace raw selects, buttons, and inputs**

Import `NativeSelect` and `Button`.

Replace each raw `<select>` in `renderFieldInput` with `<NativeSelect>`.

Replace the close button (line 182) -- add `cursor-pointer`:
```tsx
<button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
```

Replace the footer Cancel button (lines 214-220) with `<Button variant="ghost" size="sm">`.

Replace the footer Apply button (lines 222-236) with `<Button>` using appropriate variant.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/grid/BulkEditPanel.tsx
git commit -m "fix: replace raw selects and buttons in BulkEditPanel"
```

### Task 17: Fix SpreadsheetHeader.tsx

**Files:**
- Modify: `client/src/components/grid/SpreadsheetHeader.tsx`

- [ ] **Step 1: Replace raw buttons with Button component**

Import `Button`. Replace the Bulk Edit and Export CSV raw `<button>` elements (lines 100-124) with:

```tsx
<Button
  variant="outline"
  size="sm"
  className="text-xs"
  disabled={selectedCount === 0}
  onClick={onBulkEdit}
  icon={<Pencil size={12} />}
>
  Bulk Edit ({selectedCount})
</Button>

<Button
  variant="ghost"
  size="sm"
  className="text-xs"
  onClick={onExportCsv}
  icon={<Download size={12} />}
>
  Export CSV
</Button>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/grid/SpreadsheetHeader.tsx
git commit -m "fix: replace raw buttons in SpreadsheetHeader with Button component"
```

### Task 18: Fix BigQuerySidebar.tsx

**Files:**
- Modify: `client/src/components/bigquery/BigQuerySidebar.tsx`

- [ ] **Step 1: Replace raw select and buttons**

Import `NativeSelect`. Replace the credential selector raw `<select>` (lines 132-143) with `<NativeSelect className="text-xs">`.

Add `cursor-pointer` to both toggle sidebar buttons (lines 92-99, 109-116).

Add `cursor-pointer` to the retry button (line 166).

- [ ] **Step 2: Commit**

```bash
git add client/src/components/bigquery/BigQuerySidebar.tsx
git commit -m "fix: replace raw select and add cursors in BigQuerySidebar"
```

### Task 19: Fix BigQueryTableView.tsx

**Files:**
- Modify: `client/src/components/bigquery/BigQueryTableView.tsx`

- [ ] **Step 1: Replace raw select and buttons**

Import `NativeSelect` and `Button`. Replace the limit selector raw `<select>` (lines 120-128) with `<NativeSelect>`.

Replace the Export CSV and Create Exercise raw `<button>` elements (lines 130-146) with `<Button>` components.

Replace the error retry button (line 169) with `<Button variant="link" size="sm">`.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/bigquery/BigQueryTableView.tsx
git commit -m "fix: replace raw selects and buttons in BigQueryTableView"
```

### Task 20: Fix ManualColumnEditor.tsx

**Files:**
- Modify: `client/src/components/reference-tables/ManualColumnEditor.tsx`

- [ ] **Step 1: Replace raw select and delete button**

Import `NativeSelect`. Replace the type raw `<select>` (lines 50-58) with `<NativeSelect className="h-8 text-sm">`.

Replace the raw delete button (lines 59-62) with:
```tsx
<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeColumn(i)}>
  <Trash2 size={14} />
</Button>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/reference-tables/ManualColumnEditor.tsx
git commit -m "fix: replace raw select and button in ManualColumnEditor"
```

### Task 21: Fix BigQuerySourceStep.tsx

**Files:**
- Modify: `client/src/components/reference-tables/BigQuerySourceStep.tsx`

- [ ] **Step 1: Replace raw selects and toggle buttons**

Import `NativeSelect` and `Button`. Replace all 3 raw `<select>` elements (credential, dataset, table) with `<NativeSelect>`.

Replace the query type toggle buttons (lines 128-144) with `<Button>` component pattern:

```tsx
<div className="flex gap-2">
  <Button
    type="button"
    variant={queryType === 'table' ? 'default' : 'outline'}
    size="sm"
    onClick={() => { setQueryType('table'); /* rest of handler */ }}
  >
    Table
  </Button>
  <Button
    type="button"
    variant={queryType === 'query' ? 'default' : 'outline'}
    size="sm"
    onClick={() => { setQueryType('query'); /* rest of handler */ }}
  >
    Custom Query
  </Button>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/reference-tables/BigQuerySourceStep.tsx
git commit -m "fix: replace raw selects and buttons in BigQuerySourceStep"
```

---

## Chunk 6: Remaining Raw Buttons Sweep

### Task 22: Add cursor-pointer to all remaining raw buttons

**Files (sweep through each):**
- `client/src/components/grid/SpreadsheetFooter.tsx`
- `client/src/components/grid/QuickFilterBar.tsx`
- `client/src/components/grid/DependentPicklistEditor.tsx`
- `client/src/components/grid/MultiSelectEditor.tsx`
- `client/src/components/grid/DateCellEditor.tsx`
- `client/src/components/bigquery/BigQueryDatasetTree.tsx`
- `client/src/components/bigquery/BigQuerySchemaPanel.tsx`
- `client/src/components/reference-tables/CreateReferenceTableModal.tsx`
- `client/src/components/reference-tables/CsvUploadStep.tsx`
- `client/src/components/wizard/WizardStepper.tsx`
- `client/src/components/wizard/Step7UserAssignment.tsx`
- `client/src/components/dashboard/ExerciseTable.tsx`

For each file, check every raw `<button>` element and either:
1. Replace with the `<Button>` component if it's a primary action
2. Add `cursor-pointer` to its className if it's a specialized element (like sort headers, tree toggles, cell editors)

- [ ] **Step 1: Fix SpreadsheetFooter.tsx** -- Add `cursor-pointer` to pagination buttons
- [ ] **Step 2: Fix QuickFilterBar.tsx** -- Add `cursor-pointer` to filter buttons
- [ ] **Step 3: Fix DependentPicklistEditor.tsx** -- Add `cursor-pointer`
- [ ] **Step 4: Fix MultiSelectEditor.tsx** -- Add `cursor-pointer` to all buttons
- [ ] **Step 5: Fix DateCellEditor.tsx** -- Add `cursor-pointer`
- [ ] **Step 6: Fix BigQueryDatasetTree.tsx** -- Add `cursor-pointer` to tree toggle buttons
- [ ] **Step 7: Fix BigQuerySchemaPanel.tsx** -- Add `cursor-pointer`
- [ ] **Step 8: Fix CreateReferenceTableModal.tsx** -- Add `cursor-pointer` or replace with Button
- [ ] **Step 9: Fix CsvUploadStep.tsx** -- Add `cursor-pointer`
- [ ] **Step 10: Fix WizardStepper.tsx** -- Add `cursor-pointer`
- [ ] **Step 11: Fix Step7UserAssignment.tsx** -- Add `cursor-pointer`
- [ ] **Step 12: Fix ExerciseTable.tsx SortableHeader** -- Add `cursor-pointer` to the sort buttons

- [ ] **Step 13: Commit**

```bash
git add client/src/components/grid/ client/src/components/bigquery/ client/src/components/reference-tables/ client/src/components/wizard/ client/src/components/dashboard/ExerciseTable.tsx
git commit -m "fix: add cursor-pointer to all remaining raw button elements"
```

---

## Chunk 7: Final Visual Consistency Pass

### Task 23: Harmonize card patterns across pages

All list item cards should use the same pattern. Currently:
- ExercisesPage: `bg-card border border-border rounded-lg`
- PipelinesPage: `bg-muted/50 border border-border rounded-lg`
- CredentialsPage: Uses `<Card>` component
- ReferenceTablesPage: Uses `<Card>` component

- [ ] **Step 1: Standardize PipelinesPage list items**

In `PipelinesPage.tsx`, change the pipeline list item container (line 85) from:
```
bg-muted/50 border border-border rounded-lg hover:bg-muted hover:border-border
```
to:
```
bg-card border border-border rounded-lg hover:bg-accent/50 hover:border-border/80 hover:shadow-sm
```

This matches the ExercisesPage pattern.

- [ ] **Step 2: Verify visual consistency**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/PipelinesPage.tsx
git commit -m "fix: harmonize card patterns across list pages"
```

### Task 24: Remove hardcoded colors from pipeline warning banners

**Files:**
- Modify: `client/src/components/pipeline/config/TransformForm.tsx`
- Modify: `client/src/components/pipeline/NodeConfigDrawer.tsx`

- [ ] **Step 1: Fix unsupported transform type banner**

In `TransformForm.tsx` (line 19), replace:
```
bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-300
```
with:
```
bg-warning/10 border border-warning/30 rounded text-xs text-warning
```

- [ ] **Step 2: Fix NodeConfigDrawer fallback banner**

In `NodeConfigDrawer.tsx` (line 33), same replacement.

- [ ] **Step 3: Fix BigQueryTableView error colors**

In `BigQueryTableView.tsx`, replace `text-red-400` (line 167) with `text-destructive`, and `text-amber-400 hover:text-amber-300` (line 170) with `text-primary hover:text-primary/80`.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/pipeline/config/TransformForm.tsx client/src/components/pipeline/NodeConfigDrawer.tsx client/src/components/bigquery/BigQueryTableView.tsx
git commit -m "fix: replace hardcoded colors with design system tokens"
```

### Task 25: Final build verification

- [ ] **Step 1: Run full typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: No errors

- [ ] **Step 2: Run client tests**

Run: `cd client && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Visual smoke test**

Run: `npm run dev` and verify:
- Navy sidebar renders correctly in both light and dark mode
- All badges use muted color palette
- No bright red delete buttons on list pages
- All buttons show pointer cursor on hover
- All selects in pipeline config use styled appearance
- Cards are visually consistent across all pages

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final UI polish adjustments"
```
