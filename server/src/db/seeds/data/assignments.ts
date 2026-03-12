/**
 * User-exercise assignments with role information.
 */

export interface SeedAssignment {
  id: string;
  userId: string;
  exerciseId: string;
  role: "editor" | "viewer";
  assignedBy: string;
}

function assignId(n: number): string {
  return `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

// User IDs
const SARAH = "10000000-0000-4000-8000-000000000001";
const JAMES = "10000000-0000-4000-8000-000000000002";
const ERIN = "10000000-0000-4000-8000-000000000003";
const MARCUS = "10000000-0000-4000-8000-000000000004";
const RACHEL = "10000000-0000-4000-8000-000000000005";
const DAVID = "10000000-0000-4000-8000-000000000006";
const LISA = "10000000-0000-4000-8000-000000000007";
const CARLOS = "10000000-0000-4000-8000-000000000008";
const NATALIE = "10000000-0000-4000-8000-000000000009";
const BRIAN = "10000000-0000-4000-8000-000000000010";

// Exercise IDs
const EX1 = "20000000-0000-4000-8000-000000000001";
const EX2 = "20000000-0000-4000-8000-000000000002";
const EX3 = "20000000-0000-4000-8000-000000000003";
const EX6 = "20000000-0000-4000-8000-000000000006";
const EX7 = "20000000-0000-4000-8000-000000000007";

export const assignments: SeedAssignment[] = [
  // Exercise 1: Dev Programming - large team
  { id: assignId(1), userId: SARAH, exerciseId: EX1, role: "editor", assignedBy: SARAH },
  { id: assignId(2), userId: ERIN, exerciseId: EX1, role: "editor", assignedBy: SARAH },
  { id: assignId(3), userId: MARCUS, exerciseId: EX1, role: "editor", assignedBy: SARAH },
  { id: assignId(4), userId: RACHEL, exerciseId: EX1, role: "editor", assignedBy: SARAH },
  { id: assignId(5), userId: DAVID, exerciseId: EX1, role: "editor", assignedBy: SARAH },
  { id: assignId(6), userId: JAMES, exerciseId: EX1, role: "viewer", assignedBy: SARAH },
  { id: assignId(7), userId: LISA, exerciseId: EX1, role: "viewer", assignedBy: SARAH },

  // Exercise 2: Spring Training - smaller team
  { id: assignId(10), userId: SARAH, exerciseId: EX2, role: "editor", assignedBy: SARAH },
  { id: assignId(11), userId: ERIN, exerciseId: EX2, role: "editor", assignedBy: SARAH },
  { id: assignId(12), userId: MARCUS, exerciseId: EX2, role: "editor", assignedBy: SARAH },
  { id: assignId(13), userId: BRIAN, exerciseId: EX2, role: "viewer", assignedBy: SARAH },

  // Exercise 3: Post-Season Audit - completed, read-only access
  { id: assignId(20), userId: JAMES, exerciseId: EX3, role: "editor", assignedBy: JAMES },
  { id: assignId(21), userId: RACHEL, exerciseId: EX3, role: "editor", assignedBy: JAMES },
  { id: assignId(22), userId: DAVID, exerciseId: EX3, role: "editor", assignedBy: JAMES },
  { id: assignId(23), userId: SARAH, exerciseId: EX3, role: "viewer", assignedBy: JAMES },
  { id: assignId(24), userId: CARLOS, exerciseId: EX3, role: "viewer", assignedBy: JAMES },

  // Exercise 6: Archived
  { id: assignId(30), userId: SARAH, exerciseId: EX6, role: "editor", assignedBy: SARAH },
  { id: assignId(31), userId: ERIN, exerciseId: EX6, role: "editor", assignedBy: SARAH },
  { id: assignId(32), userId: LISA, exerciseId: EX6, role: "viewer", assignedBy: SARAH },

  // Exercise 7: International - paused
  { id: assignId(40), userId: NATALIE, exerciseId: EX7, role: "editor", assignedBy: NATALIE },
  { id: assignId(41), userId: CARLOS, exerciseId: EX7, role: "editor", assignedBy: NATALIE },
  { id: assignId(42), userId: ERIN, exerciseId: EX7, role: "editor", assignedBy: NATALIE },
  { id: assignId(43), userId: JAMES, exerciseId: EX7, role: "viewer", assignedBy: NATALIE },
];
