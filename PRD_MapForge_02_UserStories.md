# MapForge PRD -- Part 2: User Stories

---

## Persona Definitions

### Admin (Analytics Team Member)

The data-savvy configuration user. Understands BigQuery, SQL, data modeling. Sets up enrichment exercises, manages reference data, builds pipelines, controls access. Does NOT do the actual classification work -- delegates that to business users.

**Examples from call**: Erin (primary admin), John (data engineer), Charles/Stan (team lead)

### Business User (Domain Expert)

The classification worker. Has deep domain knowledge (knows that program #3977991 is "States Play", knows that a Top 40 Tier 1 HS IF should be weighted 0.047). Does NOT understand data modeling, BigQuery, or SQL. Needs a simple, guided interface.

**Examples from call**: Baseball & Softball Development department staff, Draft operations staff, HR/ops staff at individual clubs

### System (Automated Processes)

Background processes that refresh data, run pipelines, push results, and send notifications without human intervention.

---

## Epic 1: Data Source Configuration

### US-1.1: Connect a BigQuery Source

> **As an** Admin, **I want to** connect to a BigQuery dataset/table as a data source **so that** I can pull source records into MapForge without manual CSV exports.

**Acceptance Criteria**:
- Admin can authenticate with a GCP service account or OAuth credentials
- Admin can browse available BigQuery projects, datasets, and tables
- Admin can write or paste a custom SQL query to define the source data
- Connection test validates access before saving
- Source data preview shows the first 50 rows and all columns
### US-1.2: Define Source Refresh Schedule

> **As an** Admin, **I want to** configure how often source data is refreshed from BigQuery **so that** business users always see current data without me manually updating it.

**Acceptance Criteria**:
- Options: manual, hourly, daily, weekly, custom cron expression
- Admin can trigger a manual refresh at any time
- Refresh runs in the background; users see the last-refreshed timestamp
- New records from BigQuery are automatically added to the enrichment view
- Records removed from BigQuery are flagged (not deleted) -- see US-5.4
### US-1.3: Upload a CSV/File as Source (Fallback)

> **As an** Admin, **I want to** upload a CSV or Excel file as a data source **so that** I can support edge cases where data does not live in BigQuery (e.g., a Google Sheet export, a one-time file from a vendor).

**Acceptance Criteria**:
- Supports CSV, Excel (.xlsx), and TSV formats
- File is parsed and columns are auto-detected
- Admin can preview data before confirming
- This source can later be replaced with a BigQuery connection
---

## Epic 2: Enrichment Exercise Configuration

### US-2.1: Create an Enrichment Exercise

> **As an** Admin, **I want to** create a new enrichment exercise by selecting a data source and defining classification columns **so that** business users have a structured place to enrich the data.

**Acceptance Criteria**:
- Admin names the exercise and provides a description
- Admin selects or creates a data source (BigQuery or file)
- Admin designates which source columns are displayed to business users (some columns may be hidden -- e.g., internal IDs)
- Admin defines the unique key column(s) that identify each record (e.g., siteId + programId)
- Exercise is created in "draft" status until published
### US-2.2: Add Classification Columns

> **As an** Admin, **I want to** add editable classification columns to an enrichment exercise **so that** business users can enter the data we need.

**Acceptance Criteria**:
- Supported column types:
  - **Picklist (single-select)** -- dropdown from a defined list of values
  - **Picklist (multi-select)** -- multiple selections allowed
  - **Text (free-form)** -- with optional regex validation
  - **Number** -- integer or decimal, with optional min/max
  - **Date** -- with optional date range constraints
  - **Boolean** -- yes/no toggle
- Each column has: label, description, data type, required/optional flag, default value
- Columns are ordered by the admin and appear in that order in the business user view
### US-2.3: Configure Dependent Dropdowns

> **As an** Admin, **I want to** configure a classification column's picklist values to depend on the value selected in another column **so that** business users only see valid options (e.g., selecting "Girls Baseball" for sportCategory filters categorization to only Girls Baseball sub-categories).

**Acceptance Criteria**:
- Admin can define parent-child relationships between two classification columns
- When the parent value changes, the child dropdown updates to show only valid options
- If the parent value is cleared, the child value is also cleared
- The dependency rules are stored as configuration, not code
- Multiple levels of dependency are supported (A -> B -> C)
### US-2.4: Link Classification Columns to Reference Tables

> **As an** Admin, **I want to** populate a classification column's dropdown from a Reference Table **so that** I manage the valid values in one place and they're consistent across exercises.

**Acceptance Criteria**:
- Admin can link a picklist column to a specific column in a Reference Table
- When the Reference Table is updated, the dropdown values update automatically
- Admin can optionally display a different column than the stored value (e.g., display "Baseball America" but store "BA")
- Reference Tables can be shared across multiple exercises
### US-2.5: Configure Auto-Populated (Rollup) Columns

> **As an** Admin, **I want to** define columns that auto-populate based on the value of another column and a lookup table **so that** business users only need to make one selection and parent categories fill automatically (like the headcount Category 4 -> 3 -> 2 -> 1 rollup).

**Acceptance Criteria**:
- Admin defines a "computed" column that derives its value from a lookup
- Lookup is: "when column X = value, set this column to the corresponding value in Reference Table Y"
- Computed columns are visible but not editable by business users
- If the source classification changes, computed columns update immediately
- Supports multi-level rollups (value -> level 3 -> level 2 -> level 1)
### US-2.6: Set Column Display & Editability Rules

> **As an** Admin, **I want to** control which columns are visible, editable, and read-only for business users **so that** they see only what they need and cannot modify source data.

**Acceptance Criteria**:
- Each column can be: visible+editable, visible+read-only, or hidden
- Source data columns default to visible+read-only
- Classification columns default to visible+editable
- Admin can override these defaults per column
- Hidden columns are still available for validation rules and export but not shown in the UI
---

## Epic 3: Reference Table Management

### US-3.1: Create and Manage Reference Tables

> **As an** Admin, **I want to** create reference tables that hold valid classification values **so that** dropdowns are populated from managed, controlled lists.

**Acceptance Criteria**:
- Admin can create a reference table by: manual entry, CSV upload, or BigQuery query
- Reference table has named columns with data types
- Admin can add, edit, and delete rows
- Changes to reference tables take effect immediately in linked exercises
- Reference tables are versioned -- admin can see history of changes
### US-3.2: Refresh Reference Tables from BigQuery

> **As an** Admin, **I want to** configure a reference table to auto-refresh from a BigQuery query **so that** classification options stay in sync with authoritative data sources.

**Acceptance Criteria**:
- Admin can attach a BigQuery query to a reference table
- Refresh runs on schedule (manual, daily, weekly) or on-demand
- New values from BigQuery are added; removed values are flagged (not deleted, to avoid breaking existing classifications)
- Admin is notified when the reference table changes
### US-3.3: Define Hierarchical Reference Data

> **As an** Admin, **I want to** define parent-child relationships within a reference table **so that** I can model hierarchical classifications (sport -> sub-category, or Category 4 -> 3 -> 2 -> 1).

**Acceptance Criteria**:
- Reference table columns can have a "parent" column designation
- Given a child value, the system can automatically resolve all parent values
- This hierarchy drives dependent dropdowns (US-2.3) and auto-populated rollup columns (US-2.5)
---

## Epic 4: Business User Experience

### US-4.1: View Assigned Enrichment Tasks

> **As a** Business User, **I want to** log in and see a list of enrichment exercises assigned to me **so that** I know what work I need to do.

**Acceptance Criteria**:
- Dashboard shows all exercises the user has access to
- Each exercise shows: name, description, progress (X of Y records classified), last-updated date, status (active, completed, needs attention)
- Exercises with unclassified records are highlighted
- User can click into an exercise to begin/continue work
### US-4.2: Classify Records in a Spreadsheet View

> **As a** Business User, **I want to** see source data alongside editable classification columns in a familiar spreadsheet-like interface **so that** I can efficiently classify records.

**Acceptance Criteria**:
- Source columns appear on the left side (read-only, visually distinct -- e.g., slightly grayed or with a lock icon)
- Classification columns appear on the right side (editable, visually distinct -- e.g., white background, colored header)
- Dropdowns open inline in the cell (not in a separate modal)
- Changes save automatically (no explicit "save" button needed)
- Keyboard navigation: Tab moves to the next editable cell, Enter confirms a dropdown selection
- Pagination or virtual scrolling for large datasets (1000+ records)
- Sorting and filtering on any column
- Search/filter to find specific records quickly
### US-4.3: See Real-Time Validation Feedback

> **As a** Business User, **I want to** see immediate feedback when I enter an invalid value **so that** I can correct mistakes before they reach downstream systems.

**Acceptance Criteria**:
- Invalid cells are highlighted (red border or background)
- Hovering or clicking an invalid cell shows the error message
- Validation runs client-side for instant feedback (picklist membership, required fields, number ranges)
- A summary bar shows: "X errors, Y warnings, Z records complete"
- User can filter the view to show only records with errors
### US-4.4: Filter and Sort to Focus Work

> **As a** Business User, **I want to** filter the spreadsheet to show only unclassified records or records matching specific criteria **so that** I can focus on the work that still needs to be done.

**Acceptance Criteria**:
- Quick filters: "All", "Unclassified", "Classified", "Has Errors"
- Column-level filters (text search, picklist filter, date range)
- Multi-column sorting
- Filters persist during the session but reset on next visit (unless explicitly saved)
### US-4.5: Bulk Classification

> **As a** Business User, **I want to** select multiple records and apply the same classification to all of them at once **so that** I can efficiently classify groups of similar records.

**Acceptance Criteria**:
- Multi-row selection via checkbox or Shift+Click
- "Apply to selected" action opens a panel to set classification values
- Bulk action respects all validation rules
- Undo support for bulk actions (or at minimum, confirmation prompt)
### US-4.6: See Classification Progress

> **As a** Business User, **I want to** see my progress toward completing all classifications **so that** I know how much work remains.

**Acceptance Criteria**:
- Progress bar showing: X of Y records fully classified
- Breakdown by classification column (e.g., "sportCategory: 95% complete, categorization: 80% complete")
- Progress updates in real-time as the user works
---

## Epic 5: Data Lifecycle & State Management

### US-5.1: Persist Classifications Across Refreshes

> **As a** Business User, **I want** my previous classifications to persist when new source data is loaded **so that** I don't lose my work when the data refreshes.

**Acceptance Criteria**:
- Classifications are stored by the unique key of the source record (e.g., siteId + programId)
- When source data is refreshed, existing classifications are re-matched by key
- New records (no matching key) appear as unclassified
- Changed source records (same key, different data) keep their classification but are flagged for review
### US-5.2: Track Record History and Changes

> **As an** Admin, **I want to** see a full history of who classified each record and when **so that** I have an audit trail for compliance and dispute resolution.

**Acceptance Criteria**:
- Every classification change is logged with: user, timestamp, old value, new value, column
- Admin can view the change history for any individual record
- Admin can export the full audit log for an exercise
- Bulk changes are logged individually (one entry per record per column)
### US-5.3: View Historical/Inactive Records

> **As an** Admin, **I want to** see records that were previously classified but are no longer in the current source data **so that** I have a historical record and can investigate if needed.

**Acceptance Criteria**:
- Records that disappear from the source data are moved to a "Historical" or "Inactive" tab
- Historical records show: all source data as of the last refresh, all classifications, date removed
- Historical records are excluded from progress calculations
- Admin can archive or permanently delete historical records
### US-5.4: Handle Source Data Changes Gracefully

> **As an** Admin, **I want** the system to handle changes in source data intelligently **so that** classifications remain accurate when source records are updated, added, or removed.

**Acceptance Criteria**:
- **New records**: Appear as unclassified, highlighted in the UI
- **Updated records** (same key, changed source data): Keep classification, flag for review with a "source data changed" indicator
- **Removed records**: Move to Historical tab (US-5.3)
- **Schema changes** (new source column, renamed column): Admin is alerted; exercise is paused until admin confirms the mapping

---

## Epic 6: Pipeline & Automation

### US-6.1: Push Enriched Data to BigQuery

> **As an** Admin, **I want to** push the classified/enriched data back to BigQuery **so that** downstream reporting and analytics have access to the classifications.

**Acceptance Criteria**:
- Admin configures the target BigQuery dataset, table name, and write mode (append, overwrite, merge)
- Export includes: selected source columns + all classification columns
- Export can run on-demand or on a schedule
- Export results are logged (rows pushed, errors, timestamp)
### US-6.2: Build Automated Enrichment Pipelines

> **As an** Admin, **I want to** build an automated pipeline that pulls source data, makes it available for classification, validates completeness, and pushes results to BigQuery **so that** the entire process runs without my manual intervention.

**Acceptance Criteria**:
- Visual pipeline builder (DAG/flowchart style)
- Available nodes: BigQuery Source, Enrichment Task, Validation Gate, Transform (unpivot, aggregate, filter), BigQuery Destination, Notification
- Pipeline can be triggered: on schedule (cron), on-demand, or via API
- Pipeline execution is logged with per-node status
- Failed nodes send notifications to the admin
### US-6.3: Stream Changes to BigQuery in Real-Time

> **As an** Admin, **I want to** optionally configure real-time streaming of classification changes to BigQuery **so that** downstream systems always have the latest data without waiting for a batch push.

**Acceptance Criteria**:
- Toggle between batch (scheduled push) and stream (real-time push) modes
- In stream mode, each saved classification change is pushed to BigQuery within seconds
- Failed pushes are queued and retried
- Admin can see the stream status (connected, lag, errors)
### US-6.4: Transform Data Before Export (Unpivot, Aggregate)

> **As an** Admin, **I want to** apply transformations to the enriched data before pushing to BigQuery **so that** the output matches the format downstream systems expect (e.g., unpivoting a pivot table into flat rows).

**Acceptance Criteria**:
- Transform types: unpivot, pivot, aggregate (sum, count, avg), filter, rename columns, derive new columns
- Transforms are configured in the pipeline builder as intermediate nodes
- Admin can preview the transform output before activating
- Transform definitions are versioned
---

## Epic 7: Access Control & Notifications

### US-7.1: Assign Exercises to Specific Users

> **As an** Admin, **I want to** assign specific enrichment exercises to specific business users **so that** each person only sees the work relevant to them.

**Acceptance Criteria**:
- Admin can invite users by email
- Admin can assign users to one or more exercises
- Users only see assigned exercises when they log in
- Admin can revoke access at any time
- Supports role assignment: "viewer" (read-only) and "editor" (can classify)
### US-7.2: Notify Users When Action Is Needed

> **As a** Business User, **I want to** receive notifications when new data is available for classification or when a deadline is approaching **so that** I complete my work on time.

**Acceptance Criteria**:
- In-app notifications (bell icon with unread count)
- Email notifications (configurable per user: daily digest or immediate)
- Notification triggers: new records added, deadline approaching (configurable: 30/20/10 days), admin message
- Users can mute notifications per exercise
### US-7.3: Admin Progress Dashboard

> **As an** Admin, **I want to** see a dashboard showing the completion status of all active enrichment exercises and which users have/haven't completed their work **so that** I can follow up with people who are behind.

**Acceptance Criteria**:
- List of all active exercises with: name, total records, classified count, % complete, assigned users
- Drill-down per exercise: per-user progress (who classified what, when)
- Visual indicators: green (complete), yellow (in progress), red (overdue or untouched)
- Export progress report as CSV
---

## Epic 8: Pivot Table / Matrix Editing (Stretch)

### US-8.1: Matrix-Style Data Entry View

> **As a** Business User, **I want to** edit data in a pivot-table/matrix layout (rows x columns = values) **so that** I can work with data the way I naturally think about it, rather than being forced into flat rows.

**Acceptance Criteria**:
- Admin can configure an exercise to use "matrix view" instead of flat table view
- Admin defines: row dimensions, column dimensions, and value fields
- Business users see a pivot-table-style grid and edit values in cells
- Changes are stored internally as flat rows (unpivoted) but displayed as a matrix
- Sorting and filtering work on the matrix dimensions

**Context from call**: The draft prospect ranking weights use case (Tier x Rank x Position/Level -> weights per outlet) is a pivot table. Business users explicitly stated they would "never accept" a flat row view for this data. Charles/Stan said "for me as a data person, I would think of unpivoting this... but business users are never going to accept that."
