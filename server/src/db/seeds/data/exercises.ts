import { ORG_ID } from "./users.js";

export interface SeedExercise {
  id: string;
  orgId: string;
  name: string;
  description: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  viewMode: "flat" | "matrix";
  uniqueKeyColumns: string[];
  deadline: string | null;
  version: number;
  createdBy: string;
  totalRecords: number;
  classifiedRecords: number;
}

export const exercises: SeedExercise[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    orgId: ORG_ID,
    name: "2026 Development Programming Classification",
    description:
      "Classify all development programming across MLB broadcast partners for the 2026 season. Includes pre-season, regular season, and post-season content across all networks.",
    status: "active",
    viewMode: "flat",
    uniqueKeyColumns: ["siteId", "programId"],
    deadline: "2026-03-25",
    version: 3,
    createdBy: "10000000-0000-4000-8000-000000000001",
    totalRecords: 85,
    classifiedRecords: 52,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    orgId: ORG_ID,
    name: "Spring Training Broadcast Mapping",
    description:
      "Map all Spring Training broadcast programs to their corresponding teams, venues, and networks for tracking and rights verification.",
    status: "active",
    viewMode: "flat",
    uniqueKeyColumns: ["programId"],
    deadline: "2026-04-15",
    version: 1,
    createdBy: "10000000-0000-4000-8000-000000000001",
    totalRecords: 45,
    classifiedRecords: 40,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    orgId: ORG_ID,
    name: "2025 Post-Season Broadcast Audit",
    description:
      "Complete audit and classification of all 2025 post-season broadcast data. All records have been classified and verified.",
    status: "completed",
    viewMode: "flat",
    uniqueKeyColumns: ["siteId", "programId"],
    deadline: "2025-12-31",
    version: 5,
    createdBy: "10000000-0000-4000-8000-000000000002",
    totalRecords: 60,
    classifiedRecords: 60,
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    orgId: ORG_ID,
    name: "Multi-Sport Network Analysis Q2",
    description:
      "Draft exercise for classifying multi-sport broadcast programming across ESPN, Fox Sports, and TBS for Q2 2026.",
    status: "draft",
    viewMode: "flat",
    uniqueKeyColumns: ["programId", "networkId"],
    deadline: null,
    version: 1,
    createdBy: "10000000-0000-4000-8000-000000000003",
    totalRecords: 0,
    classifiedRecords: 0,
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    orgId: ORG_ID,
    name: "Regional Sports Network Inventory",
    description:
      "Draft classification template for mapping regional sports network programming to teams and leagues.",
    status: "draft",
    viewMode: "matrix",
    uniqueKeyColumns: ["networkId", "programId"],
    deadline: null,
    version: 1,
    createdBy: "10000000-0000-4000-8000-000000000002",
    totalRecords: 0,
    classifiedRecords: 0,
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    orgId: ORG_ID,
    name: "2025 Regular Season Classification",
    description:
      "Archived exercise from the 2025 regular season broadcast classification. Retained for historical reference and audit purposes.",
    status: "archived",
    viewMode: "flat",
    uniqueKeyColumns: ["siteId", "programId"],
    deadline: "2025-10-01",
    version: 8,
    createdBy: "10000000-0000-4000-8000-000000000001",
    totalRecords: 120,
    classifiedRecords: 118,
  },
  {
    id: "20000000-0000-4000-8000-000000000007",
    orgId: ORG_ID,
    name: "International Broadcast Rights Mapping",
    description:
      "Classification of international broadcast feeds paused pending updated rights agreements from legal team.",
    status: "paused",
    viewMode: "flat",
    uniqueKeyColumns: ["feedId", "territoryCode"],
    deadline: "2026-06-01",
    version: 2,
    createdBy: "10000000-0000-4000-8000-000000000009",
    totalRecords: 30,
    classifiedRecords: 12,
  },
];
