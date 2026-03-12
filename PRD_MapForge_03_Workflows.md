# MapForge PRD -- Part 3: Workflows & User Experiences

---

## Workflow 1: Admin Creates a New Enrichment Exercise (End-to-End)

This is the core admin workflow -- setting up a brand-new classification task from scratch.

### Step 1: Create the Exercise

```
Admin lands on MapForge dashboard
  -> Clicks "New Enrichment Exercise"
  -> Enters: Name, Description, Icon/Color (optional)
  -> Selects: "BigQuery" as data source type
  -> Exercise created in DRAFT status
```
### Step 2: Configure the Data Source

```
Admin enters BigQuery connection details:
  -> GCP Project ID
  -> Dataset name
  -> Table name OR custom SQL query
  -> Authentication: Service Account JSON key or OAuth
  -> Click "Test Connection" -> shows preview of data (first 50 rows)
  -> Select which columns to include in the exercise
  -> Designate unique key column(s) (e.g., siteId + programId)
  -> Set refresh schedule: Manual | Hourly | Daily | Weekly | Custom Cron
  -> Save source configuration
```
### Step 3: Define Source Columns (Read-Only)

```
System auto-detects columns from BigQuery source
  -> For each source column, admin sets:
     - Display label (defaults to BigQuery column name)
     - Visibility: Show to business users | Hide (internal use only)
     - All source columns are automatically read-only (lockCells: true)
  -> Admin reorders columns as desired
```
### Step 4: Add Classification Columns (Editable)

```
Admin clicks "Add Classification Column"
  -> Enters: Column name, description
  -> Selects data type:
     | Type          | Config Options                                           |
     |---------------|----------------------------------------------------------|
     | Picklist      | Values: manual list OR link to Reference Table           |
     | Multi-Select  | Values: manual list OR link to Reference Table           |
     | Text          | Regex pattern, min/max length                            |
     | Number        | Integer/decimal, min/max value                           |
     | Date          | Date format, min/max date                                |
     | Boolean       | Label for true/false                                     |
  -> Sets: Required/Optional, Default value
  -> For picklist: optionally configures dependent dropdown rules
     (e.g., "Filter values based on [sportCategory] column using [Reference Table: Sport Hierarchy]")
  -> Repeats for each classification column needed
```
### Step 5: Configure Validation Rules

```
Admin adds validation rules:
  -> Required field checks (auto-generated for required columns)
  -> Cross-column rules:
     "If sportCategory = 'Girls Baseball', categorization must be one of [Girls Baseball Breakthrough Series, ...]"
  -> Custom expressions (optional):
     "Weight values must sum to 1.0 per tier"
  -> Each rule has: severity (error/warning), error message
```
### Step 6: Set Up Reference Tables (if not already done)

```
If the exercise uses picklist values that don't yet exist:
  -> Admin navigates to Reference Tables
  -> Creates a new table (e.g., "Sport Categories")
  -> Adds rows manually, uploads CSV, or connects to BigQuery
  -> Returns to exercise config and links the picklist column to the reference table
```
### Step 7: Assign Users

```
Admin navigates to exercise's "Access" tab
  -> Searches for users by email or name
  -> Assigns users with role: Editor or Viewer
  -> Optionally sets a deadline date
  -> Optionally writes a message that users see when they open the exercise
```
### Step 8: Build Pipeline (Optional but Recommended)

```
Admin navigates to Pipelines
  -> Creates a new pipeline linked to this exercise
  -> Drags nodes onto the canvas:
     [BigQuery Source] -> [Enrichment Exercise] -> [Validation Gate] -> [BigQuery Destination]
  -> Configures each node:
     - BigQuery Source: same connection as the exercise source
     - Enrichment Exercise: selects this exercise
     - Validation Gate: "All required fields must be filled" + custom rules
     - BigQuery Destination: target dataset/table, write mode (merge on unique key)
  -> Sets trigger: Cron schedule (e.g., daily at 2 AM) or manual
  -> Saves and activates pipeline
```
### Step 9: Publish

```
Admin reviews the full configuration
  -> Clicks "Publish"
  -> Exercise moves from DRAFT to ACTIVE
  -> Initial data pull from BigQuery runs
  -> Assigned users receive a notification (in-app + email)
  -> Business users can now log in and begin classifying
```

---

## Workflow 2: Business User Classifies Records

This is the primary daily workflow for domain experts.

### Step 1: Login and See My Work

```
Business user logs into MapForge
  -> Dashboard shows assigned exercises:
     | Exercise                              | Records | Done  | Status       |
     |---------------------------------------|---------|-------|--------------|
     | Development Programming 2026          | 342     | 78%   | In Progress  |
     | Draft Ranking Weights 2026            | 24      | 0%    | New          |
  -> User clicks "Development Programming 2026"
```

### Step 2: View and Classify

```
Spreadsheet view loads:
  LEFT SIDE (read-only, gray background):     RIGHT SIDE (editable, white background):
  | siteId | programId | programName        | | sportCategory    | categorization                    |
  |--------|-----------|--------------------| |------------------|-----------------------------------|
  | 22044  | 3998508   | 2023 Girls Baseball| | [Girls Baseball] | [Girls Baseball Breakthrough...]  |
  |        |           | Breakthrough Series| |                  |                                   |
  | 22044  | 4036238   | 2023 World Series  | | [  v  ]          | [  v  ]                           |
  |        |           | Game 2             | |                  |                                   |
  | 22044  | 3998628   | 2023 BREAKTHROUGH  | | [Boys Baseball]  | [Boys Baseball Breakthrough...]   |
  |        |           | SERIES TEAM - WWBA | |                  |                                   |

Progress bar at top: "267 of 342 records classified (78%)"
Quick filters: [All] [Unclassified] [Classified] [Has Errors]
```
### Step 3: Use Dropdowns and Dependent Filters

```
User clicks the sportCategory cell for an unclassified record
  -> Dropdown appears: [Boys Baseball] [Girls Baseball] [Softball] [NGWSD]
  -> User selects "Boys Baseball"
  -> User clicks the categorization cell
  -> Dropdown shows ONLY Boys Baseball categorizations:
     [Boys Baseball Breakthrough Series]
     [MLB ID Tour]
     [Hank Aaron Invitational]
     [HBCU Classic]
     [High School Home Run Derby]
     [Commissioners Cup]
     [The Program]
  -> User selects "MLB ID Tour"
  -> Both cells save automatically
  -> Row status changes from "Unclassified" to "Classified"
  -> Progress bar updates: "268 of 342 (78.4%)"
```

### Step 4: Bulk Classify Similar Records

```
User notices 15 records all named "MLB TOUR 2023 - [CITY]"
  -> Selects all 15 rows (Shift+Click)
  -> Clicks "Apply to Selected"
  -> Panel appears:
     sportCategory: [Boys Baseball]
     categorization: [MLB ID Tour]
  -> Clicks "Apply"
  -> All 15 records classified in one action
  -> Progress bar jumps: "283 of 342 (82.7%)"
```

### Step 5: Handle Validation Errors

```
User accidentally selects "Softball" for sportCategory
but picks "Boys Baseball Breakthrough Series" for categorization
  -> Cell border turns red
  -> Hover shows: "categorization 'Boys Baseball Breakthrough Series'
     is not valid when sportCategory is 'Softball'"
  -> Error count in header increases
  -> User corrects the sportCategory to "Boys Baseball"
  -> Error clears automatically
```
### Step 6: Return Later to Continue

```
User closes MapForge
  -> Next week, new programs are added to BigQuery
  -> Pipeline auto-refreshes the source data
  -> User receives notification: "12 new records need classification in Development Programming 2026"
  -> User logs in, clicks the exercise
  -> Previous classifications are intact
  -> 12 new records appear at the top, highlighted as "New"
  -> User classifies the new records
```

---

## Workflow 3: Admin Monitors Progress and Follows Up

### Step 1: Check the Admin Dashboard

```
Admin logs into MapForge (admin view)
  -> Dashboard shows all active exercises:
     | Exercise                     | Assigned To    | Progress | Deadline   | Status      |
     |------------------------------|----------------|----------|------------|-------------|
     | Development Programming 2026 | Sarah, Mike    | 78%      | Apr 15     | On Track    |
     | Draft Ranking Weights 2026   | Dave           | 0%       | Mar 31     | At Risk     |
  -> Admin clicks "Draft Ranking Weights 2026" to investigate
```

### Step 2: View Per-User Progress

```
Exercise detail view:
  | User  | Assigned Records | Classified | Last Active | Status     |
  |-------|------------------|------------|-------------|------------|
  | Dave  | 24               | 0          | Never       | Not Started|

  -> Admin clicks "Send Reminder"
  -> Dave receives email: "You have 24 records to classify in Draft Ranking Weights 2026. Deadline: Mar 31."
```

### Step 3: Review Audit Log

```
Admin navigates to "Audit Log" for Development Programming 2026
  -> Sees chronological list:
     | Timestamp           | User   | Record Key       | Column          | Old Value         | New Value                  |
     |---------------------|--------|------------------|-----------------|-------------------|----------------------------|
     | 2026-03-09 14:32:01 | Sarah  | 22044-3998508    | sportCategory   | (empty)           | Girls Baseball             |
     | 2026-03-09 14:32:04 | Sarah  | 22044-3998508    | categorization  | (empty)           | Girls Baseball Breakthrough|
     | 2026-03-09 14:33:15 | Mike   | 22044-3998628    | sportCategory   | Boys Baseball     | Softball                   |
     | 2026-03-09 14:33:18 | Mike   | 22044-3998628    | sportCategory   | Softball          | Boys Baseball              |
  -> Admin can filter by user, date range, column, or record
  -> Admin can export log as CSV
```
---

## Workflow 4: Pipeline Execution (Automated)

### Step 1: Scheduled Trigger Fires

```
It's 2:00 AM. The daily cron trigger fires for "Development Programming Pipeline"
  -> Pipeline execution starts
  -> Node 1: BigQuery Source
     - Runs configured SQL query against BigQuery
     - Returns 342 rows (8 new since last refresh)
     - Status: SUCCESS
```

### Step 2: Source Data Sync

```
  -> Node 2: Source Data Sync
     - Compares new data against existing records by unique key (siteId + programId)
     - 334 existing records: source data updated, classifications preserved
     - 8 new records: added as unclassified
     - 0 removed records
     - Status: SUCCESS
```

### Step 3: Validation Gate

```
  -> Node 3: Validation Gate
     - Checks: all records with classifications pass validation rules
     - 267 fully classified and valid
     - 67 unclassified (not an error, just incomplete)
     - 0 classified but invalid
     - Status: SUCCESS (only fails if classified records have errors)
```

### Step 4: Export to BigQuery

```
  -> Node 4: BigQuery Destination
     - Pushes 267 valid, classified records to target BigQuery table
     - Write mode: MERGE on siteId + programId
     - Columns exported: siteId, programId, programName, year, sportCategory, categorization
     - Status: SUCCESS
     - 267 rows written, 0 errors
```

### Step 5: Notification

```
  -> Node 5: Notification
     - Sends summary to admin (Erin):
       "Pipeline completed: 267 records exported to BigQuery.
        8 new records added for classification.
        67 records still awaiting classification."
     - If new records were added, also notifies assigned business users
```
---

## Workflow 5: Admin Adds a New Use Case (Reuse Pattern)

This demonstrates the platform's reusability -- the core value proposition.

```
Erin receives a request:
  "The international scouting team needs to classify prospect events
   by region and talent level. Data is in BigQuery."

Time: 45 minutes

1. Create exercise: "International Scouting Event Classification" (2 min)
2. Connect BigQuery source: intl_scouting.prospect_events table (5 min)
3. Define source columns: event_id, event_name, country, date, participant_count (3 min)
4. Add classification columns:
   - region: Picklist linked to "Regions" reference table (already exists) (2 min)
   - talent_level: New picklist [Elite, Advanced, Development, Introductory] (3 min)
   - notes: Free text, optional (1 min)
5. Add validation: region is required, talent_level is required (2 min)
6. Create reference table for talent levels (if not reusing existing) (5 min)
7. Assign users: 3 international scouting staff (3 min)
8. Build pipeline: BigQuery -> Enrich -> Validate -> BigQuery (10 min)
9. Publish and notify users (2 min)

Total: ~35 minutes
No code written. No engineering ticket filed. No Google Sheet created.
```

This is the "less than a couple hours" promise from the demo call, with simple use cases closer to 30 minutes.

---

## Workflow 6: Matrix/Pivot Table Editing (Draft Weights Use Case)

This is the stretch-goal workflow for the draft ranking weights.

### Admin Configuration

```
Admin creates exercise: "2026 Draft Ranking Weights"
  -> Source: BigQuery table with dimensions (tier, rank, position_level)
  -> View mode: MATRIX (not flat table)
  -> Row dimensions: Tier (Top 40, 41-80, 81-120, 121+), Position/Level (HS IF, HS OF, etc.)
  -> Column dimensions: Outlet (BA, ESPN, Pipeline)
  -> Value field: Weight (decimal number, 0.000-1.000)
  -> Auto-computed column: Total (sum of all outlet weights per row)
```

### Business User Experience

```
User sees a familiar spreadsheet-style matrix:
  |          |   | POS/LVL | BA    | ESPN  | Pipeline | Total |
  |----------|---|---------|-------|-------|----------|-------|
  | Top 40   | 1 | HS IF   | 0.047 | 0.038 | 0.086   | 0.171 |
  | Top 40   | 1 | HS OF   | 0.044 | 0.076 | 0.059   | 0.179 |
  | ...      |   |         |       |       |          |       |

  -> User clicks a weight cell and types a new value
  -> Total column recalculates automatically
  -> Validation: weight must be 0.000-1.000
  -> Changes save automatically
```

### Pipeline Export

```
Pipeline unpivots the matrix before pushing to BigQuery:
  | tier   | rank | position_level | outlet   | weight |
  |--------|------|----------------|----------|--------|
  | Top 40 | 1    | HS IF          | BA       | 0.047  |
  | Top 40 | 1    | HS IF          | ESPN     | 0.038  |
  | Top 40 | 1    | HS IF          | Pipeline | 0.086  |
  | ...    |      |                |          |        |
```
