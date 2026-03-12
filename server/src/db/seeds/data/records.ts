/**
 * Source records for seed data.
 * Each record simulates a row from BigQuery with realistic MLB/sports broadcast data.
 */

export interface SeedSourceRecord {
  id: string;
  exerciseId: string;
  uniqueKey: Record<string, string>;
  sourceData: Record<string, string | number | null>;
  recordState: "new" | "existing" | "changed" | "removed" | "archived";
}

// Helper to create sequential IDs
function recId(n: number): string {
  return `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const EX1 = "20000000-0000-4000-8000-000000000001"; // Active - at risk
const EX2 = "20000000-0000-4000-8000-000000000002"; // Active - on track
const EX3 = "20000000-0000-4000-8000-000000000003"; // Completed
const EX6 = "20000000-0000-4000-8000-000000000006"; // Archived
const EX7 = "20000000-0000-4000-8000-000000000007"; // Paused

const networks = ["ESPN", "ESPN2", "Fox Sports 1", "TBS", "MLB Network", "Apple TV+", "Peacock", "NBC Sports", "ABC", "YES Network", "SNY", "NESN", "Bally Sports", "Marquee Sports Network", "Fox"];
const mlbTeams = [
  { name: "New York Yankees", abbr: "NYY", venue: "Yankee Stadium" },
  { name: "New York Mets", abbr: "NYM", venue: "Citi Field" },
  { name: "Los Angeles Dodgers", abbr: "LAD", venue: "Dodger Stadium" },
  { name: "Boston Red Sox", abbr: "BOS", venue: "Fenway Park" },
  { name: "Chicago Cubs", abbr: "CHC", venue: "Wrigley Field" },
  { name: "San Francisco Giants", abbr: "SF", venue: "Oracle Park" },
  { name: "Houston Astros", abbr: "HOU", venue: "Minute Maid Park" },
  { name: "Atlanta Braves", abbr: "ATL", venue: "Truist Park" },
  { name: "Philadelphia Phillies", abbr: "PHI", venue: "Citizens Bank Park" },
  { name: "San Diego Padres", abbr: "SD", venue: "Petco Park" },
  { name: "Texas Rangers", abbr: "TEX", venue: "Globe Life Field" },
  { name: "St. Louis Cardinals", abbr: "STL", venue: "Busch Stadium" },
];

const programTypes = ["Live Game", "Pre-Game Show", "Post-Game Show", "Studio Show", "Highlight Reel", "Spring Training"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDate(year: number, monthStart: number, monthEnd: number): string {
  const month = monthStart + Math.floor(Math.random() * (monthEnd - monthStart + 1));
  const day = 1 + Math.floor(Math.random() * 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function generateTime(): string {
  const hours = [13, 16, 19, 20, 21, 22];
  const h = pickRandom(hours);
  const m = pickRandom([0, 5, 10, 15, 30]);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

// ============================================================
// Exercise 1: 2026 Development Programming Classification (85 records)
// ============================================================
function generateEx1Records(): SeedSourceRecord[] {
  const records: SeedSourceRecord[] = [];
  for (let i = 1; i <= 85; i++) {
    const team = pickRandom(mlbTeams);
    const awayTeam = pickRandom(mlbTeams.filter((t) => t.name !== team.name));
    const network = pickRandom(networks);
    const programType = pickRandom(programTypes);
    const siteId = String(20000 + i);
    const programId = String(3990000 + i);
    const airDate = generateDate(2026, 3, 9);

    let programName: string;
    if (programType === "Live Game") {
      programName = `${awayTeam.abbr} @ ${team.abbr}`;
    } else if (programType === "Pre-Game Show") {
      programName = `${team.name} Pre-Game Live`;
    } else if (programType === "Post-Game Show") {
      programName = `${team.name} Post-Game Wrap`;
    } else if (programType === "Studio Show") {
      programName = `MLB Tonight - ${airDate}`;
    } else if (programType === "Spring Training") {
      programName = `Spring Training: ${awayTeam.abbr} vs ${team.abbr}`;
    } else {
      programName = `MLB Quick Pitch - ${airDate}`;
    }

    // Mix of states: mostly existing, some new, some changed
    let state: SeedSourceRecord["recordState"] = "existing";
    if (i <= 10) state = "new";
    else if (i > 75 && i <= 80) state = "changed";

    records.push({
      id: recId(i),
      exerciseId: EX1,
      uniqueKey: { siteId, programId },
      sourceData: {
        siteId,
        programId,
        programName,
        programDescription: `${programType} broadcast on ${network}. ${team.name} programming.`,
        broadcastNetwork: network,
        airDate,
        airTime: generateTime(),
        sport: "Baseball",
        league: "MLB",
        homeTeam: team.name,
        awayTeam: programType === "Live Game" || programType === "Spring Training" ? awayTeam.name : null,
        venue: team.venue,
        programType,
        duration: programType === "Live Game" ? 210 : programType === "Studio Show" ? 60 : 30,
        isLive: programType === "Live Game" || programType === "Spring Training" ? 1 : 0,
      },
      recordState: state,
    });
  }
  return records;
}

// ============================================================
// Exercise 2: Spring Training Broadcast Mapping (45 records)
// ============================================================
function generateEx2Records(): SeedSourceRecord[] {
  const records: SeedSourceRecord[] = [];
  const springTrainingVenues = [
    { name: "Camelback Ranch", city: "Glendale, AZ" },
    { name: "Salt River Fields", city: "Scottsdale, AZ" },
    { name: "Sloan Park", city: "Mesa, AZ" },
    { name: "American Family Fields", city: "Maryvale, AZ" },
    { name: "JetBlue Park", city: "Fort Myers, FL" },
    { name: "Roger Dean Chevrolet Stadium", city: "Jupiter, FL" },
    { name: "George M. Steinbrenner Field", city: "Tampa, FL" },
    { name: "CoolToday Park", city: "North Port, FL" },
    { name: "LECOM Park", city: "Bradenton, FL" },
    { name: "Publix Field at Joker Marchant Stadium", city: "Lakeland, FL" },
  ];

  for (let i = 1; i <= 45; i++) {
    const team = pickRandom(mlbTeams);
    const awayTeam = pickRandom(mlbTeams.filter((t) => t.name !== team.name));
    const network = pickRandom(["ESPN", "MLB Network", "Fox Sports 1", "Apple TV+", "Bally Sports"]);
    const stVenue = pickRandom(springTrainingVenues);
    const programId = String(5000000 + i);
    const airDate = generateDate(2026, 2, 3);

    records.push({
      id: recId(100 + i),
      exerciseId: EX2,
      uniqueKey: { programId },
      sourceData: {
        programId,
        programName: `Spring Training: ${awayTeam.abbr} @ ${team.abbr}`,
        programDescription: `Cactus/Grapefruit League game between ${awayTeam.name} and ${team.name} at ${stVenue.name}.`,
        broadcastNetwork: network,
        airDate,
        airTime: generateTime(),
        sport: "Baseball",
        league: "MLB",
        homeTeam: team.name,
        awayTeam: awayTeam.name,
        venue: stVenue.name,
        venueCity: stVenue.city,
        programType: "Spring Training",
        duration: 180,
        isLive: 1,
      },
      recordState: "existing",
    });
  }
  return records;
}

// ============================================================
// Exercise 3: 2025 Post-Season Broadcast Audit (60 records - all classified)
// ============================================================
function generateEx3Records(): SeedSourceRecord[] {
  const records: SeedSourceRecord[] = [];
  const postSeasonRounds = ["Wild Card", "Division Series", "Championship Series", "World Series"];
  const postSeasonTeams = [
    mlbTeams[0], mlbTeams[2], mlbTeams[3], mlbTeams[6],
    mlbTeams[7], mlbTeams[8], mlbTeams[9], mlbTeams[10],
  ];

  for (let i = 1; i <= 60; i++) {
    const team = pickRandom(postSeasonTeams);
    const awayTeam = pickRandom(postSeasonTeams.filter((t) => t.name !== team.name));
    const round = pickRandom(postSeasonRounds);
    const network = pickRandom(["Fox", "TBS", "ESPN", "Fox Sports 1"]);
    const siteId = String(18000 + i);
    const programId = String(2990000 + i);
    const gameNum = (i % 7) + 1;

    records.push({
      id: recId(200 + i),
      exerciseId: EX3,
      uniqueKey: { siteId, programId },
      sourceData: {
        siteId,
        programId,
        programName: `${round} Game ${gameNum}: ${awayTeam.abbr} @ ${team.abbr}`,
        programDescription: `2025 MLB ${round} - Game ${gameNum}. ${awayTeam.name} at ${team.name}.`,
        broadcastNetwork: network,
        airDate: generateDate(2025, 10, 11),
        airTime: generateTime(),
        sport: "Baseball",
        league: "MLB",
        homeTeam: team.name,
        awayTeam: awayTeam.name,
        venue: team.venue,
        programType: "Playoff Game",
        duration: 240,
        isLive: 1,
        round,
        gameNumber: gameNum,
      },
      recordState: "existing",
    });
  }
  return records;
}

// ============================================================
// Exercise 6: Archived 2025 Regular Season (sample 20 of 120)
// ============================================================
function generateEx6Records(): SeedSourceRecord[] {
  const records: SeedSourceRecord[] = [];
  for (let i = 1; i <= 20; i++) {
    const team = pickRandom(mlbTeams);
    const awayTeam = pickRandom(mlbTeams.filter((t) => t.name !== team.name));
    const network = pickRandom(networks);
    const siteId = String(15000 + i);
    const programId = String(1990000 + i);

    records.push({
      id: recId(300 + i),
      exerciseId: EX6,
      uniqueKey: { siteId, programId },
      sourceData: {
        siteId,
        programId,
        programName: `${awayTeam.abbr} @ ${team.abbr}`,
        programDescription: `Regular season game. ${awayTeam.name} at ${team.name}.`,
        broadcastNetwork: network,
        airDate: generateDate(2025, 4, 9),
        airTime: generateTime(),
        sport: "Baseball",
        league: "MLB",
        homeTeam: team.name,
        awayTeam: awayTeam.name,
        venue: team.venue,
        programType: "Live Game",
        duration: 210,
        isLive: 1,
      },
      recordState: "archived",
    });
  }
  return records;
}

// ============================================================
// Exercise 7: International Broadcast (30 records - paused)
// ============================================================
function generateEx7Records(): SeedSourceRecord[] {
  const records: SeedSourceRecord[] = [];
  const territories = ["UK", "JP", "KR", "AU", "MX", "DR", "CA", "DE", "BR", "NL"];
  const intlNetworks = ["ESPN International", "MLB International", "DAZN", "Sky Sports", "NHK", "KBS Sports", "Fox Sports Australia", "ESPN Latin America"];

  for (let i = 1; i <= 30; i++) {
    const team = pickRandom(mlbTeams);
    const awayTeam = pickRandom(mlbTeams.filter((t) => t.name !== team.name));
    const territory = pickRandom(territories);
    const network = pickRandom(intlNetworks);
    const feedId = `INTL-${territory}-${String(i).padStart(4, "0")}`;
    const territoryCode = territory;

    records.push({
      id: recId(400 + i),
      exerciseId: EX7,
      uniqueKey: { feedId, territoryCode },
      sourceData: {
        feedId,
        territoryCode,
        programName: `${awayTeam.abbr} @ ${team.abbr} (${territory})`,
        programDescription: `International feed for ${territory}. ${awayTeam.name} at ${team.name}.`,
        broadcastNetwork: network,
        airDate: generateDate(2026, 4, 8),
        airTime: generateTime(),
        sport: "Baseball",
        league: "MLB",
        homeTeam: team.name,
        awayTeam: awayTeam.name,
        venue: team.venue,
        programType: "Live Game",
        territory,
        language: territory === "JP" ? "Japanese" : territory === "KR" ? "Korean" : territory === "MX" || territory === "DR" ? "Spanish" : territory === "BR" ? "Portuguese" : territory === "DE" ? "German" : "English",
        duration: 210,
        isLive: 1,
      },
      recordState: "existing",
    });
  }
  return records;
}

// Deterministic seed for reproducibility
let _seed = 42;
function seededRandom(): number {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}

// Override Math.random for consistent seed data
const origRandom = Math.random;
export function generateAllRecords(): SeedSourceRecord[] {
  _seed = 42;
  Math.random = seededRandom;
  const all = [
    ...generateEx1Records(),
    ...generateEx2Records(),
    ...generateEx3Records(),
    ...generateEx6Records(),
    ...generateEx7Records(),
  ];
  Math.random = origRandom;
  return all;
}

export const sourceRecords = generateAllRecords();
