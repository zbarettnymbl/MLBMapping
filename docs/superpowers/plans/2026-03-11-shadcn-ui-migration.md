# ShadCN UI Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all custom UI components with shadcn/ui and retheme the app with an MLB enterprise aesthetic (navy/white/blue).

**Architecture:** Install shadcn/ui in the client workspace, replace `components/common/` with shadcn `components/ui/`, rewrite `index.css` with shadcn's CSS variable system mapped to MLB colors, migrate each page sequentially, then delete old components.

**Tech Stack:** shadcn/ui, Radix UI primitives, Tailwind CSS 4, react-hook-form, zod, sonner, cmdk

**Spec:** `docs/superpowers/specs/2026-03-11-shadcn-ui-migration-design.md`

---

## Quick Reference: Variant Mappings

When migrating pages, use these mappings for old -> new variant names:

**Button variants:** `primary` -> `default`, `secondary` -> `secondary`, `ghost` -> `ghost`, `danger` -> `destructive`

**Badge variants:** `default` -> `default`, `amber` -> `warning`, `cyan` -> `secondary`, `error` -> `destructive`, `warning` -> `warning`, `clean` -> `success`, `outline` -> `outline`

**Do NOT modify:** `PipelineCanvas.tsx` (React Flow), any file in `components/grid/` (AG Grid). These keep their own styling systems.

---

## File Structure

### New Files (created by shadcn CLI or manually)
- `client/src/components/ui/button.tsx` -- shadcn button (extended with isLoading/icon)
- `client/src/components/ui/input.tsx` -- shadcn input
- `client/src/components/ui/label.tsx` -- shadcn label
- `client/src/components/ui/card.tsx` -- shadcn card
- `client/src/components/ui/badge.tsx` -- shadcn badge (extended with warning/success)
- `client/src/components/ui/dialog.tsx` -- shadcn dialog (replaces Modal)
- `client/src/components/ui/tabs.tsx` -- shadcn tabs
- `client/src/components/ui/table.tsx` -- shadcn table
- `client/src/components/ui/tooltip.tsx` -- shadcn tooltip
- `client/src/components/ui/progress.tsx` -- shadcn progress
- `client/src/components/ui/avatar.tsx` -- shadcn avatar
- `client/src/components/ui/dropdown-menu.tsx` -- shadcn dropdown-menu
- `client/src/components/ui/popover.tsx` -- shadcn popover
- `client/src/components/ui/command.tsx` -- shadcn command (cmdk)
- `client/src/components/ui/select.tsx` -- shadcn select
- `client/src/components/ui/separator.tsx` -- shadcn separator
- `client/src/components/ui/skeleton.tsx` -- shadcn skeleton
- `client/src/components/ui/radio-group.tsx` -- shadcn radio-group
- `client/src/components/ui/textarea.tsx` -- shadcn textarea
- `client/src/components/ui/form.tsx` -- shadcn form (react-hook-form integration)
- `client/src/components/ui/sonner.tsx` -- shadcn sonner wrapper
- `client/src/lib/utils.ts` -- cn() utility
- `client/components.json` -- shadcn config

### Modified Files
- `client/package.json` -- add shadcn deps, remove react-hot-toast, remove autoprefixer
- `client/src/index.css` -- replace forge theme with shadcn CSS vars + MLB palette
- `client/src/App.tsx` -- swap Toaster provider, update ProtectedRoute import
- `client/src/components/layout/AppLayout.tsx` -- replace common/ imports with ui/
- `client/src/components/layout/Sidebar.tsx` -- retheme with MLB colors
- `client/src/components/layout/ThemeToggle.tsx` -- restyle
- `client/src/components/layout/TopBar.tsx` -- restyle with shadcn classes
- `client/src/pages/LoginPage.tsx` -- use shadcn form components + react-hook-form + zod
- `client/src/pages/ExercisesPage.tsx` -- use shadcn tabs, badge, button, card
- `client/src/pages/CredentialsPage.tsx` -- use shadcn form, input, button, card
- `client/src/pages/ReferenceTablesPage.tsx` -- use shadcn table, dialog, form
- `client/src/components/reference-tables/CreateReferenceTableModal.tsx` -- replace Modal, Button from common/, swap toast
- `client/src/components/reference-tables/CsvUploadStep.tsx` -- replace forge-* classes
- `client/src/components/reference-tables/ManualColumnEditor.tsx` -- replace Button from common/
- `client/src/components/reference-tables/BigQuerySourceStep.tsx` -- replace Button, Spinner from common/
- `client/src/components/reference-tables/ReferenceTableGrid.tsx` -- replace Button, Spinner from common/
- `client/src/components/bigquery/BigQueryDatasetTree.tsx` -- replace forge-* classes
- `client/src/components/bigquery/BigQuerySchemaPanel.tsx` -- replace forge-* classes
- `client/src/components/bigquery/BigQuerySidebar.tsx` -- replace forge-* classes
- `client/src/pages/AdminDashboardPage.tsx` -- use shadcn tabs, table, badge
- `client/src/pages/BusinessDashboardPage.tsx` -- use shadcn card, button
- `client/src/pages/ExerciseWizardPage.tsx` -- update step component styling
- `client/src/pages/PipelinesPage.tsx` -- use shadcn button, badge, card
- `client/src/pages/PipelineBuilderPage.tsx` -- toolbar migration
- `client/src/pages/PipelineRunsPage.tsx` -- use shadcn table, badge
- `client/src/pages/EnrichmentSpreadsheetPage.tsx` -- toolbar chrome only
- `client/src/components/wizard/Step1ExerciseInfo.tsx` -- shadcn form
- `client/src/components/wizard/Step2DataSource.tsx` -- shadcn combobox, form
- `client/src/components/wizard/Step3SourceColumns.tsx` -- shadcn form
- `client/src/components/wizard/Step4ClassificationColumns.tsx` -- shadcn form
- `client/src/components/wizard/Step5ValidationRules.tsx` -- shadcn form
- `client/src/components/wizard/Step6ReferenceTables.tsx` -- shadcn form
- `client/src/components/wizard/Step7UserAssignment.tsx` -- shadcn form
- `client/src/components/wizard/Step8Pipeline.tsx` -- shadcn form
- `client/src/components/wizard/Step9Publish.tsx` -- shadcn form
- `client/src/components/wizard/WizardStepper.tsx` -- restyle
- `client/src/components/wizard/ColumnConfigPanel.tsx` -- shadcn form
- `client/src/components/dashboard/ExerciseCard.tsx` -- use ui/ components
- `client/src/components/dashboard/StatusBadge.tsx` -- use ui/badge
- `client/src/components/dashboard/ExerciseProgressDrawer.tsx` -- use ui/ components
- `client/src/components/dashboard/UserProgressCard.tsx` -- use ui/ components
- `client/src/components/dashboard/AdminStatsBar.tsx` -- restyle
- `client/src/components/dashboard/UserAvatarStack.tsx` -- use ui/avatar
- `client/src/components/pipeline/PipelineToolbar.tsx` -- use ui/button, swap toast
- `client/src/components/pipeline/NodeConfigDrawer.tsx` -- use ui/ components
- `client/src/components/pipeline/NodePalette.tsx` -- restyle
- `client/src/components/pipeline/RunProgressBanner.tsx` -- restyle
- `client/src/components/pipeline/RunStatusBadge.tsx` -- use ui/badge
- `client/src/components/pipeline/TriggerConfigPanel.tsx` -- use ui/form
- `client/src/components/common/EmptyState.tsx` -- restyle with shadcn classes
- `client/src/components/common/Spinner.tsx` -- restyle (lucide Loader2)
- `client/src/components/common/UserAvatar.tsx` -- use ui/avatar + ui/dropdown-menu
- `client/src/components/common/NotificationBell.tsx` -- use ui/popover
- `client/src/hooks/useAdmin.ts` -- swap toast import
- `client/src/hooks/useAutoSave.ts` -- swap toast import

### Deleted Files (after all pages migrated)
- `client/src/components/common/Button.tsx`
- `client/src/components/common/Input.tsx`
- `client/src/components/common/Select.tsx`
- `client/src/components/common/Modal.tsx`
- `client/src/components/common/Card.tsx`
- `client/src/components/common/Badge.tsx`
- `client/src/components/common/Tabs.tsx`
- `client/src/components/common/Table.tsx`
- `client/src/components/common/Tooltip.tsx`
- `client/src/components/common/ProgressBar.tsx`
- `client/src/components/common/index.ts`

### Test Files to Update
- `client/src/components/dashboard/__tests__/StatusBadge.test.tsx`
- `client/src/components/dashboard/__tests__/ExerciseTable.test.tsx`
- `client/src/components/dashboard/__tests__/ExerciseProgressDrawer.test.tsx`
- `client/src/components/dashboard/__tests__/UserProgressCard.test.tsx`
- `client/src/components/dashboard/__tests__/UserAvatarStack.test.tsx`
- `client/src/components/dashboard/__tests__/AdminStatsBar.test.tsx`
- `client/src/pages/__tests__/AdminDashboardPage.test.tsx`
- `client/src/__tests__/admin-dashboard.integration.test.tsx`
- `client/src/hooks/__tests__/useAdmin.test.ts` -- mock path update
- `client/src/hooks/__tests__/useAutoSave.test.ts` -- mock path update

---

## Chunk 1: Foundation

### Task 1: Initialize shadcn/ui

**Files:**
- Create: `client/components.json`
- Create: `client/src/lib/utils.ts`
- Modify: `client/package.json`

- [ ] **Step 1: Install shadcn/ui dependencies manually**

Since shadcn's `init` command may prompt interactively, install deps directly:

```bash
cd client
npm install tailwind-merge clsx class-variance-authority
npm install react-hook-form @hookform/resolvers zod
npm install sonner cmdk @radix-ui/react-slot
```

- [ ] **Step 2: Create components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
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

- [ ] **Step 3: Create lib/utils.ts**

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Create components/ui/ directory**

```bash
mkdir -p client/src/components/ui
```

- [ ] **Step 5: Commit**

```bash
git add client/components.json client/src/lib/utils.ts client/package.json client/package-lock.json
git commit -m "feat: initialize shadcn/ui foundation with dependencies"
```

### Task 2: Rewrite index.css with MLB theme

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Replace index.css with shadcn CSS variable system + MLB palette**

Replace the entire file. The new CSS must:
- Use shadcn's variable naming convention (`--background`, `--foreground`, `--primary`, etc.)
- Map MLB navy (#041E42) as primary, MLB blue (#005A9C) as secondary accents
- Use HSL values (shadcn convention) for all color variables
- Keep `@import "tailwindcss"` at top
- Define light mode in `:root`, dark mode in `.dark`
- Keep `@theme` block for Tailwind v4 integration
- Preserve AG Grid and scrollbar CSS
- Remove all forge/amber/cyan custom variables

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 210 20% 98%;
    --foreground: 215 50% 14%;
    --card: 0 0% 100%;
    --card-foreground: 215 50% 14%;
    --popover: 0 0% 100%;
    --popover-foreground: 215 50% 14%;
    --primary: 215 94% 14%;
    --primary-foreground: 210 20% 98%;
    --secondary: 210 17% 95%;
    --secondary-foreground: 215 50% 14%;
    --muted: 210 17% 95%;
    --muted-foreground: 215 16% 47%;
    --accent: 207 100% 31%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 207 100% 31%;
    --radius: 0.5rem;
    --chart-1: 215 94% 14%;
    --chart-2: 207 100% 31%;
    --chart-3: 142 76% 36%;
    --chart-4: 38 92% 50%;
    --chart-5: 0 84% 60%;
  }

  .dark {
    --background: 222 47% 5%;
    --foreground: 210 40% 96%;
    --card: 217 33% 17%;
    --card-foreground: 210 40% 96%;
    --popover: 217 33% 17%;
    --popover-foreground: 210 40% 96%;
    --primary: 213 94% 78%;
    --primary-foreground: 222 47% 5%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 96%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 217 91% 68%;
    --accent-foreground: 222 47% 5%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --border: 217 33% 25%;
    --input: 217 33% 25%;
    --ring: 217 91% 68%;
  }
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-success: hsl(var(--success));
  --color-success-foreground: hsl(var(--success-foreground));
  --color-warning: hsl(var(--warning));
  --color-warning-foreground: hsl(var(--warning-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }

  ::selection {
    @apply bg-primary text-primary-foreground;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-muted-foreground/30 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-muted-foreground/50;
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Verify the app still compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: May have errors from forge-* class references -- that is expected at this stage. The CSS itself should be valid.

- [ ] **Step 3: Commit**

```bash
git add client/src/index.css
git commit -m "feat: replace forge theme with MLB enterprise shadcn theme"
```

### Task 3: Install core shadcn components

**Files:**
- Create: all files in `client/src/components/ui/`

- [ ] **Step 1: Install shadcn components via CLI**

Run each component install. The CLI reads `components.json` and generates files:

```bash
cd client
npx shadcn@latest add button input label card badge dialog tabs table tooltip progress avatar dropdown-menu popover command select separator skeleton radio-group textarea form sonner
```

If the CLI prompts, accept defaults. This creates all files in `src/components/ui/`.

- [ ] **Step 2: Extend Button with isLoading and icon props**

Open `client/src/components/ui/button.tsx` and add these props to the `ButtonProps` interface and render logic:

```typescript
// Add to ButtonProps interface:
isLoading?: boolean
icon?: React.ReactNode
iconPosition?: "left" | "right"

// In the render, before {children}:
{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
{!isLoading && icon && iconPosition === "left" && icon}
{children}
{!isLoading && icon && iconPosition === "right" && icon}

// Add Loader2 import from lucide-react
// Set disabled={disabled || isLoading} on the button element
// Default iconPosition to "left"
```

- [ ] **Step 3: Extend Badge with warning and success variants**

Open `client/src/components/ui/badge.tsx` and add to the `badgeVariants` cva:

```typescript
warning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
```

- [ ] **Step 4: Verify components were generated**

```bash
ls client/src/components/ui/
```

Expected: All .tsx files listed above should exist.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: Errors from pages still using forge-* classes and common/ imports, but no errors in ui/ components.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ui/
git commit -m "feat: install and extend shadcn components with MLB variants"
```

---

## Chunk 2: Layout Shell & Login

### Task 4: Migrate AppLayout, Sidebar, Header

**Files:**
- Modify: `client/src/components/layout/AppLayout.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`
- Modify: `client/src/components/layout/ThemeToggle.tsx`
- Modify: `client/src/components/common/UserAvatar.tsx`
- Modify: `client/src/components/common/NotificationBell.tsx`
- Modify: `client/src/components/layout/TopBar.tsx` (if it has forge-* classes)

- [ ] **Step 1: Rewrite AppLayout.tsx**

Replace forge-* classes with shadcn theme classes:

```typescript
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '@/components/common/NotificationBell';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface AppLayoutProps {
  title?: string;
  children: ReactNode;
  topBarExtra?: ReactNode;
}

export function AppLayout({ title, children, topBarExtra }: AppLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-3">
            {topBarExtra}
            <ThemeToggle />
            <NotificationBell />
            {user && <UserAvatar user={user} size="sm" showDropdown />}
          </div>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite Sidebar.tsx**

Replace all forge-* and amber-* classes with shadcn semantic classes. Replace inline SVG icons with lucide-react icons:

Key replacements:
- `bg-forge-900` -> `bg-card`
- `border-forge-700` -> `border-border`
- `text-forge-100` -> `text-foreground`
- `text-forge-400` -> `text-muted-foreground`
- `text-forge-500` -> `text-muted-foreground`
- `bg-amber-500/10 text-amber-400` (active) -> `bg-primary/10 text-primary`
- `shadow-amber-500` -> `shadow-primary`
- `hover:bg-forge-800/70` -> `hover:bg-muted`

Import icons from lucide-react: `LayoutDashboard, ClipboardList, Table2, GitBranch, Database, Key, LogOut`

- [ ] **Step 3: Rewrite ThemeToggle.tsx**

Use shadcn Button with ghost variant and lucide Sun/Moon icons:

```typescript
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
```

Note: shadcn button may not have a `size="icon"` variant by default. If not, add it to the button variants:
```typescript
icon: "h-10 w-10",
```

- [ ] **Step 4: Update UserAvatar.tsx to use shadcn Avatar + DropdownMenu**

Replace custom avatar with shadcn `Avatar` and `DropdownMenu` for the user dropdown.

- [ ] **Step 5: Update NotificationBell.tsx to use shadcn Popover**

Replace custom notification bell with shadcn `Popover` for the dropdown.

- [ ] **Step 5.5: Update TopBar.tsx**

Read the file. Replace any forge-* classes with shadcn semantic classes.

- [ ] **Step 6: Verify the layout renders**

```bash
cd client && npm run dev
```

Open http://localhost:5173 and verify sidebar, header, and theme toggle work.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/layout/ client/src/components/common/UserAvatar.tsx client/src/components/common/NotificationBell.tsx
git commit -m "feat: migrate layout shell to shadcn with MLB theme"
```

### Task 5: Migrate LoginPage

**Files:**
- Modify: `client/src/pages/LoginPage.tsx`

- [ ] **Step 1: Rewrite LoginPage with shadcn components + react-hook-form + zod**

This is the smoke test for the form validation stack. Use `useForm()` with a zod schema.

```typescript
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    await login(values.email, values.password);
    navigate(values.email.includes('admin') ? '/admin' : '/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to MapForge</CardTitle>
          <CardDescription>
            Use any email to sign in. Include "admin" for admin role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify login page renders and works**

```bash
cd client && npm run dev
```

Navigate to http://localhost:5173/login. Verify form renders, inputs work, submit works.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/LoginPage.tsx
git commit -m "feat: migrate LoginPage to shadcn components"
```

### Task 6: Update App.tsx imports

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Swap ProtectedRoute import path (keep from common/ for now)**

No change needed yet -- ProtectedRoute stays in common/.

- [ ] **Step 2: Commit** (skip if no changes)

---

## Chunk 3: Simple Pages

### Task 7: Migrate ExercisesPage

**Files:**
- Modify: `client/src/pages/ExercisesPage.tsx`

- [ ] **Step 1: Rewrite ExercisesPage with shadcn components**

Replace:
- `Button` import from `common/` -> `ui/button`
- `Spinner` import from `common/` -> keep from common/ (no shadcn equiv) or use `Loader2` from lucide
- Inline tab buttons -> shadcn `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- Inline status badges -> shadcn `Badge`
- `forge-*` classes -> shadcn semantic classes (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`)
- `amber-*` active tab styling -> `text-primary`, `border-primary`

- [ ] **Step 2: Verify page renders**

```bash
cd client && npm run dev
```

Navigate to http://localhost:5173/exercises.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ExercisesPage.tsx
git commit -m "feat: migrate ExercisesPage to shadcn components"
```

### Task 8: Migrate CredentialsPage

**Files:**
- Modify: `client/src/pages/CredentialsPage.tsx`

- [ ] **Step 1: Rewrite CredentialsPage with shadcn components + react-hook-form + zod**

Replace:
- `Button` from `common/` -> `ui/button` (variant mapping: `primary`->`default`, `ghost`->`ghost`)
- `Spinner` from `common/` -> lucide `Loader2` with animate-spin
- Inline `<input>` -> shadcn `Input` wrapped in `FormField`/`FormItem`/`FormControl`
- Inline `<textarea>` -> shadcn `Textarea` wrapped in `FormField`
- `forge-*` classes -> shadcn semantic classes (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`)
- Card-like credential items -> shadcn `Card`

Add zod schema for the credential form:
```typescript
const credentialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  credentialValue: z.string().min(1, 'Service account JSON is required'),
});
```

Wire up `useForm()` with `zodResolver(credentialSchema)`. On submit, push to `createCredential` API.

- [ ] **Step 2: Verify page renders and add/delete credential works**

```bash
cd client && npm run dev
```

Navigate to http://localhost:5173/credentials.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/CredentialsPage.tsx
git commit -m "feat: migrate CredentialsPage to shadcn components"
```

### Task 9: Migrate ReferenceTablesPage + sub-components

**Files:**
- Modify: `client/src/pages/ReferenceTablesPage.tsx`
- Modify: `client/src/components/reference-tables/CreateReferenceTableModal.tsx`
- Modify: `client/src/components/reference-tables/CsvUploadStep.tsx`
- Modify: `client/src/components/reference-tables/ManualColumnEditor.tsx`
- Modify: `client/src/components/reference-tables/BigQuerySourceStep.tsx`
- Modify: `client/src/components/reference-tables/ReferenceTableGrid.tsx`
- Modify: `client/src/components/bigquery/BigQueryDatasetTree.tsx`
- Modify: `client/src/components/bigquery/BigQuerySchemaPanel.tsx`
- Modify: `client/src/components/bigquery/BigQuerySidebar.tsx`

- [ ] **Step 1: Read ReferenceTablesPage.tsx and all sub-component files**

```bash
# Read the file first to understand what it uses
```

- [ ] **Step 2: Rewrite with shadcn components + react-hook-form + zod for add/edit forms**

Replace:
- `Button` from `common/` -> `ui/button` (use variant mapping from Quick Reference)
- Any Modal usage -> shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogTrigger`
- Table rendering -> shadcn `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`
- `forge-*` classes -> shadcn semantic classes (`bg-card`, `border-border`, `text-foreground`)
- Add/edit reference table forms -> use `useForm()` + zod schema + shadcn `Form`/`FormField`/`FormControl`/`FormMessage`

- [ ] **Step 3: Migrate reference-tables sub-components**

For each file in `components/reference-tables/`:
- `CreateReferenceTableModal.tsx`: Replace `Modal` with shadcn `Dialog`. Replace `Button` from common/ with ui/button. Replace forge-* classes. Note: this file also imports `react-hot-toast` -- swap to `sonner` now (do not wait for Task 15).
- `CsvUploadStep.tsx`: Replace forge-* classes with shadcn semantic classes.
- `ManualColumnEditor.tsx`: Replace `Button` from common/ with ui/button. Replace forge-* classes.
- `BigQuerySourceStep.tsx`: Replace `Button`, `Spinner` from common/ with ui equivalents. Replace forge-* classes.
- `ReferenceTableGrid.tsx`: Replace `Button`, `Spinner` from common/ with ui equivalents. Replace forge-* classes.

- [ ] **Step 4: Migrate bigquery sub-components**

For each file in `components/bigquery/`:
- `BigQueryDatasetTree.tsx`: Replace forge-* classes with shadcn semantic classes.
- `BigQuerySchemaPanel.tsx`: Replace forge-* classes with shadcn semantic classes.
- `BigQuerySidebar.tsx`: Replace forge-* classes with shadcn semantic classes.

- [ ] **Step 5: Verify page renders**

Navigate to http://localhost:5173/reference-tables.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/ReferenceTablesPage.tsx client/src/components/reference-tables/ client/src/components/bigquery/
git commit -m "feat: migrate ReferenceTablesPage and sub-components to shadcn"
```

---

## Chunk 4: Dashboard Pages

### Task 10: Migrate AdminDashboardPage + dashboard components

**Files:**
- Modify: `client/src/pages/AdminDashboardPage.tsx`
- Modify: `client/src/components/dashboard/ExerciseCard.tsx`
- Modify: `client/src/components/dashboard/StatusBadge.tsx`
- Modify: `client/src/components/dashboard/ExerciseProgressDrawer.tsx`
- Modify: `client/src/components/dashboard/UserProgressCard.tsx`
- Modify: `client/src/components/dashboard/AdminStatsBar.tsx`
- Modify: `client/src/components/dashboard/UserAvatarStack.tsx`
- Modify: `client/src/components/dashboard/StatusSummaryBar.tsx`
- Modify: `client/src/components/dashboard/DeadlineIndicator.tsx`
- Modify: `client/src/components/dashboard/ExerciseTable.tsx`
- Modify: `client/src/components/dashboard/__tests__/*.test.tsx` (6 test files)
- Modify: `client/src/pages/__tests__/AdminDashboardPage.test.tsx`
- Modify: `client/src/__tests__/admin-dashboard.integration.test.tsx`

- [ ] **Step 1: Read all dashboard component files**

Read each file in `components/dashboard/` to understand current imports and structure.

- [ ] **Step 2: Migrate StatusBadge.tsx**

Replace Badge import from `common/` with `ui/badge`. Map variant names.

- [ ] **Step 3: Migrate ExerciseCard.tsx**

Replace Card, Badge, ProgressBar, Button imports from `common/` with shadcn equivalents from `ui/`.

- [ ] **Step 4: Migrate UserProgressCard.tsx**

Replace Card-related components with shadcn Card.

- [ ] **Step 5: Migrate ExerciseProgressDrawer.tsx**

Replace any modal/drawer patterns with shadcn Dialog or Sheet. Replace forge-* classes.

- [ ] **Step 6: Migrate AdminStatsBar.tsx**

Replace forge-* classes with shadcn semantic classes.

- [ ] **Step 7: Migrate UserAvatarStack.tsx**

Use shadcn Avatar for user avatars in the stack.

- [ ] **Step 8: Migrate StatusSummaryBar.tsx and DeadlineIndicator.tsx**

Replace forge-* classes with shadcn semantic classes.

- [ ] **Step 8.5: Migrate ExerciseTable.tsx**

Replace any common/ imports and forge-* classes. This is AG Grid-based -- only migrate the wrapper/chrome, not grid internals.

- [ ] **Step 9: Migrate AdminDashboardPage.tsx**

Replace Button from common/ with ui/button. Replace forge-* classes.

- [ ] **Step 10: Update dashboard component tests**

Update imports and fix any broken queries due to DOM structure changes. Run:

```bash
cd client && npx vitest run src/components/dashboard/__tests__/
```

- [ ] **Step 11: Update AdminDashboardPage test**

```bash
cd client && npx vitest run src/pages/__tests__/AdminDashboardPage.test.tsx
```

- [ ] **Step 12: Update admin-dashboard integration test**

```bash
cd client && npx vitest run src/__tests__/admin-dashboard.integration.test.tsx
```

- [ ] **Step 13: Verify all tests pass**

```bash
cd client && npx vitest run
```

- [ ] **Step 14: Commit**

```bash
git add client/src/components/dashboard/ client/src/pages/AdminDashboardPage.tsx client/src/pages/__tests__/ client/src/__tests__/admin-dashboard.integration.test.tsx
git commit -m "feat: migrate AdminDashboard and dashboard components to shadcn"
```

### Task 11: Migrate BusinessDashboardPage

**Files:**
- Modify: `client/src/pages/BusinessDashboardPage.tsx`

- [ ] **Step 1: Read BusinessDashboardPage.tsx**

- [ ] **Step 2: Rewrite with shadcn components**

Replace Button, Card, EmptyState, Spinner imports from `common/` with shadcn equivalents. EmptyState stays in common/ but gets restyled. Replace forge-* classes.

- [ ] **Step 3: Verify page renders**

Navigate to http://localhost:5173/dashboard.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/BusinessDashboardPage.tsx
git commit -m "feat: migrate BusinessDashboardPage to shadcn components"
```

---

## Chunk 5: Exercise Wizard

### Task 12: Migrate Exercise Wizard Steps

**Files:**
- Modify: `client/src/pages/ExerciseWizardPage.tsx`
- Modify: `client/src/components/wizard/WizardStepper.tsx`
- Modify: `client/src/components/wizard/Step1ExerciseInfo.tsx`
- Modify: `client/src/components/wizard/Step2DataSource.tsx`
- Modify: `client/src/components/wizard/Step3SourceColumns.tsx`
- Modify: `client/src/components/wizard/Step4ClassificationColumns.tsx`
- Modify: `client/src/components/wizard/Step5ValidationRules.tsx`
- Modify: `client/src/components/wizard/Step6ReferenceTables.tsx`
- Modify: `client/src/components/wizard/Step7UserAssignment.tsx`
- Modify: `client/src/components/wizard/Step8Pipeline.tsx`
- Modify: `client/src/components/wizard/Step9Publish.tsx`
- Modify: `client/src/components/wizard/ColumnConfigPanel.tsx`

- [ ] **Step 1: Read all wizard step files**

Read each step file to understand current form patterns, imports, and state management.

- [ ] **Step 2: Migrate WizardStepper.tsx**

Replace forge-* styling with shadcn semantic classes. Keep the stepper structure but retheme.

- [ ] **Step 3: Migrate ExerciseWizardPage.tsx**

Replace forge-* classes with shadcn semantic classes. Update any common/ imports.

- [ ] **Step 4: Migrate Step1ExerciseInfo.tsx with react-hook-form + zod**

Define a zod schema for Step 1:
```typescript
const step1Schema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  description: z.string().optional(),
  viewMode: z.enum(['spreadsheet', 'kanban', 'list']),
});
```

Set up `useForm({ resolver: zodResolver(step1Schema) })`. On `form.handleSubmit`, push validated data to the exerciseWizardStore.

Replace:
- Inline `<input>` -> shadcn `Input` wrapped in `FormField`/`FormItem`/`FormControl`/`FormMessage`
- Inline `<textarea>` -> shadcn `Textarea` in `FormField`
- Radio buttons -> shadcn `RadioGroup` + `RadioGroupItem` in `FormField`
- Button -> shadcn `Button` (use variant mapping from Quick Reference)
- forge-* classes -> `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`
- "Next" button disabled via `!form.formState.isValid`

- [ ] **Step 5: Migrate Step2DataSource.tsx -- define zod schema**

Define a zod schema for Step 2:
```typescript
const step2Schema = z.object({
  credentialId: z.string().min(1, 'Select a credential'),
  queryType: z.enum(['table', 'sql']),
  datasetId: z.string().optional(),
  tableId: z.string().optional(),
  sqlQuery: z.string().optional(),
});
```

Set up `useForm({ resolver: zodResolver(step2Schema) })`.

- [ ] **Step 6: Migrate Step2DataSource.tsx -- build searchable combobox**

This is the biggest single step. Replace the cascading `<select>` dropdowns (credential -> dataset -> table) with the shadcn Combobox pattern:

```typescript
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
```

Each dropdown (credential, dataset, table) gets its own Popover+Command. The `CommandInput` provides the search/filter. Wrap each in `FormField` for validation.

Replace remaining `<input>`, `<textarea>`, buttons, and forge-* classes.

- [ ] **Step 7: Migrate Step3SourceColumns.tsx with react-hook-form + zod**

Read the file. Define a zod schema for step 3 fields. Set up `useForm()`. Replace form elements with shadcn `FormField`/`FormControl` wrappers. Replace forge-* classes with shadcn semantic classes.

- [ ] **Step 8: Migrate Step4ClassificationColumns.tsx with react-hook-form + zod**

Same pattern: read file, define zod schema, set up `useForm()`, replace form elements, replace forge-* classes.

- [ ] **Step 9: Migrate Step5ValidationRules.tsx with react-hook-form + zod**

Same pattern.

- [ ] **Step 10: Migrate Step6ReferenceTables.tsx with react-hook-form + zod**

Same pattern.

- [ ] **Step 11: Migrate Step7UserAssignment.tsx with react-hook-form + zod**

Same pattern.

- [ ] **Step 12: Migrate Step8Pipeline.tsx**

Minimal form -- replace forge-* classes with shadcn semantic classes. Add zod schema if there are form fields.

- [ ] **Step 13: Migrate Step9Publish.tsx**

Replace Button styling (use variant mapping) and forge-* classes. This is the review/publish step.

- [ ] **Step 14: Migrate ColumnConfigPanel.tsx with react-hook-form + zod**

Read the file. Define zod schema for column config fields. Replace form elements with shadcn components in `FormField` wrappers.

- [ ] **Step 15: Verify wizard flow end-to-end**

```bash
cd client && npm run dev
```

Navigate to http://localhost:5173/exercises/new and step through all 9 steps.

- [ ] **Step 16: Commit**

```bash
git add client/src/components/wizard/ client/src/pages/ExerciseWizardPage.tsx
git commit -m "feat: migrate Exercise Wizard to shadcn with searchable combobox"
```

---

## Chunk 6: Spreadsheet & Pipeline Pages

### Task 13: Migrate EnrichmentSpreadsheetPage

**Files:**
- Modify: `client/src/pages/EnrichmentSpreadsheetPage.tsx`

- [ ] **Step 1: Read EnrichmentSpreadsheetPage.tsx**

- [ ] **Step 2: Migrate toolbar chrome only**

Replace forge-* classes with shadcn semantic classes. AG Grid component and grid-related components are NOT touched. Only the surrounding page chrome (buttons, headers, toolbar) gets shadcn treatment.

- [ ] **Step 3: Verify spreadsheet page still works**

Navigate to an exercise page and verify AG Grid still renders and functions correctly.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/EnrichmentSpreadsheetPage.tsx
git commit -m "feat: migrate EnrichmentSpreadsheetPage chrome to shadcn"
```

### Task 14: Migrate Pipeline Pages

**Files:**
- Modify: `client/src/pages/PipelinesPage.tsx`
- Modify: `client/src/pages/PipelineBuilderPage.tsx`
- Modify: `client/src/pages/PipelineRunsPage.tsx`
- Modify: `client/src/components/pipeline/PipelineToolbar.tsx`
- Modify: `client/src/components/pipeline/NodeConfigDrawer.tsx`
- Modify: `client/src/components/pipeline/NodePalette.tsx`
- Modify: `client/src/components/pipeline/RunProgressBanner.tsx`
- Modify: `client/src/components/pipeline/RunStatusBadge.tsx`
- Modify: `client/src/components/pipeline/TriggerConfigPanel.tsx`

- [ ] **Step 1: Read all pipeline component files**

- [ ] **Step 2: Migrate PipelinesPage.tsx**

Replace Button, EmptyState from common/ with shadcn. Replace forge-* classes.

- [ ] **Step 3: Migrate PipelineRunsPage.tsx**

Replace forge-* classes. Use shadcn Table if applicable, Badge for status.

- [ ] **Step 4: Migrate PipelineToolbar.tsx**

Replace Button from common/ with ui/button. Note: this file also imports from react-hot-toast -- leave that for the toast migration task.

- [ ] **Step 5: Migrate NodeConfigDrawer.tsx**

Replace forge-* classes. Use shadcn Dialog or keep drawer pattern with shadcn styling.

- [ ] **Step 6: Migrate NodePalette.tsx**

Replace forge-* classes with shadcn semantic classes.

- [ ] **Step 7: Migrate RunProgressBanner.tsx and RunStatusBadge.tsx**

Replace forge-* classes. Use shadcn Badge for status display.

- [ ] **Step 8: Migrate TriggerConfigPanel.tsx**

Replace form elements with shadcn Input, Select, Label.

- [ ] **Step 9: Migrate PipelineBuilderPage.tsx**

Replace forge-* classes. React Flow canvas is NOT touched.

- [ ] **Step 10: Verify pipeline pages work**

Navigate to http://localhost:5173/pipelines and verify list, builder, and runs pages work.

- [ ] **Step 11: Commit**

```bash
git add client/src/pages/PipelinesPage.tsx client/src/pages/PipelineBuilderPage.tsx client/src/pages/PipelineRunsPage.tsx client/src/components/pipeline/
git commit -m "feat: migrate Pipeline pages to shadcn components"
```

---

## Chunk 7: Toast Migration & Cleanup

### Task 15: Replace react-hot-toast with sonner

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/hooks/useAdmin.ts`
- Modify: `client/src/hooks/useAutoSave.ts`
- Modify: `client/src/pages/EnrichmentSpreadsheetPage.tsx`
- Modify: `client/src/components/pipeline/PipelineToolbar.tsx`
- Modify: `client/src/components/reference-tables/CreateReferenceTableModal.tsx` (if not already swapped in Task 9)
- Modify: `client/src/hooks/__tests__/useAdmin.test.ts`
- Modify: `client/src/hooks/__tests__/useAutoSave.test.ts`
- Modify: `client/package.json`

- [ ] **Step 1: Swap Toaster provider in App.tsx**

```typescript
// Remove:
import { Toaster } from 'react-hot-toast';

// Add:
import { Toaster } from '@/components/ui/sonner';

// Replace <Toaster position="top-right" toastOptions={...} /> with:
<Toaster />
```

- [ ] **Step 2: Update toast imports in hooks**

In `useAdmin.ts` and `useAutoSave.ts`:
```typescript
// Remove:
import toast from 'react-hot-toast';

// Add:
import { toast } from 'sonner';
```

The `toast.success()`, `toast.error()`, and `toast()` calls are API-compatible -- no changes needed to the call sites.

- [ ] **Step 3: Update toast import in EnrichmentSpreadsheetPage.tsx**

Same import swap as above.

- [ ] **Step 4: Update toast import in PipelineToolbar.tsx**

Same import swap as above.

- [ ] **Step 5: Update test mocks (if they exist)**

Check if `useAdmin.test.ts` and `useAutoSave.test.ts` mock `react-hot-toast`. If so, update:
```typescript
// Remove:
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

// Add:
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
```

If a test file does not mock `react-hot-toast`, skip it.

- [ ] **Step 6: Remove react-hot-toast from package.json**

```bash
cd client && npm uninstall react-hot-toast
```

- [ ] **Step 7: Remove autoprefixer from devDependencies**

```bash
cd client && npm uninstall autoprefixer
```

- [ ] **Step 8: Run all tests**

```bash
cd client && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add client/src/App.tsx client/src/hooks/ client/src/pages/EnrichmentSpreadsheetPage.tsx client/src/components/pipeline/PipelineToolbar.tsx client/package.json client/package-lock.json
git commit -m "feat: replace react-hot-toast with sonner"
```

### Task 16: Delete old components/common/ files

**Files:**
- Delete: `client/src/components/common/Button.tsx`
- Delete: `client/src/components/common/Input.tsx`
- Delete: `client/src/components/common/Select.tsx`
- Delete: `client/src/components/common/Modal.tsx`
- Delete: `client/src/components/common/Card.tsx`
- Delete: `client/src/components/common/Badge.tsx`
- Delete: `client/src/components/common/Tabs.tsx`
- Delete: `client/src/components/common/Table.tsx`
- Delete: `client/src/components/common/Tooltip.tsx`
- Delete: `client/src/components/common/ProgressBar.tsx`
- Modify: `client/src/components/common/index.ts`

- [ ] **Step 1: Verify no files import from common/ (except ProtectedRoute, EmptyState, Spinner, UserAvatar, NotificationBell)**

```bash
cd client && grep -r "from.*common/" src/ --include="*.tsx" --include="*.ts" | grep -v "ProtectedRoute\|EmptyState\|Spinner\|UserAvatar\|NotificationBell\|node_modules"
```

Expected: No results. If results exist, those files still need migration.

- [ ] **Step 2: Delete replaced component files**

```bash
rm client/src/components/common/Button.tsx
rm client/src/components/common/Input.tsx
rm client/src/components/common/Select.tsx
rm client/src/components/common/Modal.tsx
rm client/src/components/common/Card.tsx
rm client/src/components/common/Badge.tsx
rm client/src/components/common/Tabs.tsx
rm client/src/components/common/Table.tsx
rm client/src/components/common/Tooltip.tsx
rm client/src/components/common/ProgressBar.tsx
```

- [ ] **Step 3: Update common/index.ts barrel export**

Remove exports for deleted components. Keep exports for ProtectedRoute, EmptyState, Spinner, UserAvatar, NotificationBell.

- [ ] **Step 4: Restyle EmptyState.tsx**

Replace forge-* classes with shadcn semantic classes.

- [ ] **Step 5: Restyle Spinner.tsx**

Replace with lucide `Loader2` + `animate-spin` pattern, using shadcn classes.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Run all tests**

```bash
cd client && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 8: Verify app works end-to-end**

```bash
cd client && npm run dev
```

Navigate through all pages: Login, Dashboard, Exercises, Exercise Wizard, Spreadsheet, Pipelines, Pipeline Builder, Pipeline Runs, Reference Tables, Credentials, Admin Dashboard. Verify everything renders and functions.

- [ ] **Step 9: Commit**

```bash
git add -A client/src/components/common/
git commit -m "feat: delete old common/ components, restyle EmptyState and Spinner"
```

### Task 17: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A && git commit -m "fix: resolve remaining migration issues"
```
