/**
 * Classification values for records that have been classified.
 * Maps record IDs to column values set by users.
 */

export interface SeedClassification {
  id: string;
  recordId: string;
  columnKey: string;
  value: string;
  updatedBy: string;
}

function classId(n: number): string {
  return `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function recId(n: number): string {
  return `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

// Users who do classification work
const classifiers = [
  "10000000-0000-4000-8000-000000000003", // Erin
  "10000000-0000-4000-8000-000000000004", // Marcus
  "10000000-0000-4000-8000-000000000005", // Rachel
  "10000000-0000-4000-8000-000000000006", // David
];

const sportCategories = [
  "Live Regular Season",
  "Live Post-Season",
  "Live Spring Training",
  "Studio Programming",
  "Pre/Post Game",
  "Shoulder Programming",
  "Documentary",
  "Highlights / Recap",
];

const contentTiers = ["Tier 1 - Premium", "Tier 2 - Standard", "Tier 3 - Value", "Tier 4 - Filler"];
const rightsStatuses = ["Confirmed", "Pending", "Disputed", "Expired"];

// Generate classifications for Exercise 1 (52 of 85 records classified)
function generateEx1Classifications(): SeedClassification[] {
  const classifications: SeedClassification[] = [];
  let counter = 1;

  for (let i = 11; i <= 62; i++) {
    // Records 11-62 are classified (52 records)
    const rid = recId(i);
    const user = classifiers[(i - 11) % classifiers.length];

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "sportCategory",
      value: sportCategories[i % sportCategories.length],
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "contentTier",
      value: contentTiers[i % contentTiers.length],
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "rightsStatus",
      value: rightsStatuses[i % rightsStatuses.length],
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "verifiedSport",
      value: "Baseball",
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "verifiedLeague",
      value: "MLB",
      updatedBy: user,
    });
  }

  return classifications;
}

// Generate classifications for Exercise 2 (40 of 45 records classified)
function generateEx2Classifications(): SeedClassification[] {
  const classifications: SeedClassification[] = [];
  let counter = 5000;

  for (let i = 101; i <= 140; i++) {
    const rid = recId(i);
    const user = classifiers[(i - 101) % classifiers.length];

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "sportCategory",
      value: "Live Spring Training",
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "contentTier",
      value: contentTiers[i % contentTiers.length],
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "rightsStatus",
      value: "Confirmed",
      updatedBy: user,
    });
  }

  return classifications;
}

// Generate classifications for Exercise 3 (all 60 records classified - completed)
function generateEx3Classifications(): SeedClassification[] {
  const classifications: SeedClassification[] = [];
  let counter = 10000;

  for (let i = 201; i <= 260; i++) {
    const rid = recId(i);
    const user = classifiers[(i - 201) % classifiers.length];

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "sportCategory",
      value: "Live Post-Season",
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "contentTier",
      value: "Tier 1 - Premium",
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "rightsStatus",
      value: "Confirmed",
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "verifiedSport",
      value: "Baseball",
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "verifiedLeague",
      value: "MLB",
      updatedBy: user,
    });
  }

  return classifications;
}

// Generate classifications for Exercise 7 (12 of 30 records classified - paused)
function generateEx7Classifications(): SeedClassification[] {
  const classifications: SeedClassification[] = [];
  let counter = 20000;

  for (let i = 401; i <= 412; i++) {
    const rid = recId(i);
    const user = classifiers[(i - 401) % classifiers.length];

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "sportCategory",
      value: "Live Regular Season",
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "rightsStatus",
      value: "Pending",
      updatedBy: user,
    });

    classifications.push({
      id: classId(counter++),
      recordId: rid,
      columnKey: "territoryRights",
      value: i % 2 === 0 ? "Exclusive" : "Non-Exclusive",
      updatedBy: user,
    });
  }

  return classifications;
}

export function generateAllClassifications(): SeedClassification[] {
  return [
    ...generateEx1Classifications(),
    ...generateEx2Classifications(),
    ...generateEx3Classifications(),
    ...generateEx7Classifications(),
  ];
}

export const classifications = generateAllClassifications();
