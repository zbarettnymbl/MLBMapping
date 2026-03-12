# MapForge PRD -- Part 1: Overview & Strategy

## Product Name

**MapForge** -- Dynamic Data Enrichment & Classification Platform

---

## Executive Summary

MapForge is a full-stack web application that enables MLB's Baseball & Softball Development analytics team to dynamically enrich, classify, and manage data originating from external systems (primarily BigQuery). The platform replaces a patchwork of Google Sheets, manual refresh processes, and locked-down spreadsheets with a structured, multi-user application that enforces data quality, provides audit trails, and automates the round-trip of data between BigQuery and the classification interface.

This PRD is informed by a live client discovery call and detailed technical requirements analysis. MapForge's core building blocks -- templates, reference tables, validation rules, pipelines, and audit logging -- form the architectural foundation. The platform follows an enrichment model where source data is read-only and business users add new classification columns.

---

## Problem Statement

### Current State

The client's analytics team (part of MLB's central office) frequently encounters a recurring operational pattern:

1. Structured data exists in BigQuery (employee records, program registrations, draft prospect rankings, etc.)
2. That data needs to be **enriched with human-generated classifications** -- sport categories, program categorizations, tier weights, headcount mappings, etc.
3. The people with the domain knowledge to make these classifications are **business users**, not data engineers.
4. Today, this is done via **Google Sheets** connected to BigQuery, with manual refresh cycles managed by the analytics team.

### Pain Points

| Pain Point | Impact | Frequency |
|---|---|---|
| **Manual refresh cycles** -- A data engineer must manually refresh the Google Sheet with new BigQuery data multiple times per year | Engineering time wasted on repetitive ops work | Every use case, multiple times/year |
| **No input validation** -- Google Sheets allow typos, incorrect categorizations, dragging cell formulas incorrectly | Dirty data enters downstream pipelines, requiring cleanup | Constant |
| **No conditional logic in dropdowns** -- Selecting "Girls Baseball" does not filter the sub-categorization dropdown to only Girls Baseball options | Users must memorize which sub-categories belong to which parent category | Every classification action |
| **No audit trail** -- No record of who changed what, when | Accountability gaps; "I didn't change that" disputes are unresolvable | Periodic |
| **Access control is all-or-nothing** -- Sharing a Google Sheet means everyone sees everything | Cannot scope access to specific datasets or use cases | Every use case |
| **No automation** -- Data must be manually pushed back to BigQuery after classification | Delays in downstream reporting; stale data | Every refresh cycle |
| **Not scalable** -- Each new use case requires a new Google Sheet, new manual plumbing, new BigQuery queries | Engineering team becomes the bottleneck for every new classification exercise | Growing; 3+ use cases identified so far |
| **Existing custom app is too rigid** -- The current Jitterbit/vinyl-based headcount mapping app was built for one specific use case and cannot adapt to new ones | The app is being deprecated because it cannot generalize | Terminal |

### Why the Existing App Failed

The client explicitly stated that their current headcount mapping application (built in Jitterbit/vinyl) is "half-baked" and being retired because:

- It was built for a **single, specific use case** (workforce headcount categorization)
- It is **not customizable** -- cannot adapt to new classification schemas
- The use case itself is being absorbed into a larger personnel system
- Performance issues with large datasets ("takes a long time to load")
- Broken features (the "My Changes" and "Termed/Inactive" tabs don't work)

The lesson: **the new platform must be inherently dynamic** -- able to support any enrichment use case without code changes.

---

## Vision

A self-service platform where the analytics team can:

1. **Configure** a new data enrichment exercise in under an hour (connect a BigQuery source, define classification columns, set up validation rules)
2. **Publish** it to business users who see only their assigned work in a clean, purpose-built UI
3. **Automate** the round-trip: source data refreshes on schedule, enriched data streams back to BigQuery
4. **Audit** every change with user attribution and timestamps
5. **Reuse** the same platform for any future enrichment use case -- text classifications, numeric weights, date assignments, or any combination

---

## Stakeholders & Users

### Admin Users (Analytics Team -- Erin, John, Charles/Stan)

- Configure new enrichment exercises (source data, classification columns, validation rules, lookup tables)
- Manage reference data (add/remove/update classification options)
- Monitor progress (who has completed their assignments, who hasn't)
- Control access (which business users see which exercises)
- Build and manage data pipelines (BigQuery pull, validation, BigQuery push)

### Business Users (Department Staff)

- Log in and see only their assigned enrichment tasks
- View source data (read-only) alongside editable classification columns
- Select from validated dropdowns, enter numeric values, pick dates
- See real-time validation feedback ("invalid selection", "required field")
- Receive notifications when new data needs classification or deadlines approach

### Downstream Consumers

- BigQuery tables that receive enriched data for reporting and analytics
- Looker/Tableau dashboards that break out metrics by the classifications entered in MapForge
- Other internal systems that join on the enriched data

---

## Use Cases Identified in Discovery

### Use Case 1: Baseball/Softball Development Programming Classification

**Status**: Currently managed in Google Sheets, actively used
**Complexity**: Low-medium
**Best representative** of the typical use case

- **Source data**: BigQuery table of program registrations from an online registration platform (siteId, programId, programName, year)
- **Classification columns** (new, created by the analytics team):
  - `sportCategory` -- picklist: Boys Baseball, Girls Baseball, Softball, NGWSD
  - `categorization` -- dependent picklist: filtered by sportCategory selection (e.g., if Boys Baseball, show: Boys Baseball Breakthrough Series, MLB ID Tour, Hank Aaron Invitational, HBCU Classic, High School Home Run Derby, etc.)
- **Users**: Baseball & Softball Development department staff
- **Cadence**: 2-3 times per year (spring setup, summer catch-up, fall year-end)
- **Unique key**: Combination of siteId + programId
- **Challenge**: Program names are cryptic (row 155 in the demo was just numbers + "ID Tour" -- only the business user knows what it means)
- **Output**: Enriched data pushed back to BigQuery, joined to source tables for year-over-year reporting by sport/categorization

### Use Case 2: Draft Prospect Ranking Weights

**Status**: Currently managed in Google Sheets, actively used
**Complexity**: Medium-high (pivot table format)

- **Source data**: Categorization dimensions from a system (Tier: Top 40, 41-80, 81-120, 121+; numeric rank 1-4; Position/Level: HS IF, HS OF, HS P, COL IF, COL OF, COL P)
- **Value columns** (new, entered by business users):
  - `BA` (Baseball America weight) -- numeric decimal
  - `ESPN` (ESPN weight) -- numeric decimal
  - `Pipeline` (Pipeline weight) -- numeric decimal
- **Users**: Draft operations staff
- **Data shape**: Business users think of this as a pivot table / matrix, NOT flat rows. They will resist a flat row-per-record interface.
- **Challenge**: Requires either a pivot-table-style editing UI or an automatic unpivot step before pushing to BigQuery
- **Output**: Weights pushed to BigQuery; used downstream in draft ranking calculations

### Use Case 3: Workforce Headcount Categorization (Deprecated -- for reference only)

**Status**: Being retired; functionality absorbed into a larger personnel system
**Complexity**: High (many records, many users across 30 baseball organizations)

- **Source data**: BigQuery employee records pulled from a workforce management platform
- **Classification columns**: 4-level hierarchical category (Category 4 is the most granular; 3, 2, 1 auto-populate based on a configuration/rollup table)
- **Users**: HR/ops staff at each baseball organization
- **Key pattern**: This established the need for **hierarchical/rollup classification** -- user picks the most granular level, and parent categories auto-populate based on a configuration table

This use case validates the concept but is NOT the target for MapForge. It is included for architectural reference only.

---

## Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Time to configure a new enrichment exercise | < 1 hour for simple, < 3 hours for complex | Admin self-report + audit log timestamps |
| Classification accuracy (no typos/invalid entries) | 100% (enforced by validation) | Validation error rate at export time |
| Time to classify new records | 50% reduction vs. Google Sheets | Comparison of cycle time before/after |
| Manual engineering intervention for data refresh | Zero (fully automated) | Count of manual refresh requests |
| Business user adoption | 100% of assigned users actively using within 30 days of launch | Login/activity metrics |
| Data freshness in BigQuery | Same-day or better (configurable) | Lag between source update and BigQuery push |

---

## Constraints & Considerations

### Technical Environment

- **Cloud**: Google Cloud Platform (GCP) -- the client is a Google shop
- **Data warehouse**: BigQuery (both source and destination for all data)
- **Current stack**: Jitterbit (being moved away from), Google Sheets, BigQuery, SQL Server (legacy replication), Looker Studio, Tableau
- **Legal/InfoSec**: New software platforms require legal and InfoSec approval -- this is expected to be the longest lead-time item
- **Technology approval**: The team may need to work within pre-approved technology stacks; some back-and-forth expected on which specific tools/services are permitted

### Timeline

- No hard deadline -- "we're not in a massive rush"
- Current Google Sheets workflow is functional (if suboptimal)
- Goal is to "do it the right way" and set a foundation for future full-stack builds beyond vinyl/Jitterbit
- Legal/InfoSec approval process will likely be the gating factor

### Design Philosophy

- This is the client's **first non-vinyl/Jitterbit custom application** -- it sets the precedent for future builds
- Must demonstrate clear value over the Google Sheets approach
- Admin configuration should be powerful but not require engineering skills
- Business user experience should be simpler than a Google Sheet, not more complex

---

## Platform Architecture Foundations

MapForge is built on the following core architectural components, each purpose-designed to support dynamic data enrichment workflows:

| Component | Purpose | Key Capabilities |
|---|---|---|
| **Templates** | Define the schema for each enrichment exercise -- source columns (read-only) + classification columns (editable) | Per-column editability flags; enrichment mode where source columns are locked; reusable custom column type definitions |
| **Reference Tables** | Managed lookup lists for classification values (sport categories, categorizations, headcount categories, etc.) | Manual entry, URL import, SFTP sync, and BigQuery as refresh sources; versioned updates |
| **Validation Rules** | Enforce data quality at the point of entry -- required fields, valid picklist selections, conditional requirements | Relational rules, validation hooks, dependent-dropdown validation, cross-column conditional logic |
| **Pipelines** | Automated data flow: BigQuery pull, enrich, validate, BigQuery push | Configurable source/destination node types including BigQuery; scheduled and on-demand execution |
| **Audit Log** | Track every classification change with user attribution and timestamps | Full change history per cell; who changed what, when, and from what prior value |
| **AG Grid Spreadsheet** | Primary data entry interface for business users | Mixed read-only/editable column support; pivot-table view option for matrix-style data; inline validation feedback |
| **Template Relationships** | Cross-reference between classification columns and reference tables | Foreign-key-style validation ensuring selected values exist in the governing reference table |
| **Row Constraints** | Enforce cross-column business rules (e.g., "if sportCategory = Girls Baseball, categorization must be a Girls Baseball value") | Conditional-required constraint types; multi-column dependency chains |
| **Organizations & Auth** | Multi-user access with role-based permissions | Assignment-level access control scoping users to specific enrichment exercises and datasets |
| **Notifications** | Alert business users when new data needs classification or deadlines approach | In-app and email notification channels; configurable triggers |
