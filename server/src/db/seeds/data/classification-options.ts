/**
 * Classification picklist options for dependent dropdowns.
 * Hierarchy: Sport -> League -> Team
 * Also includes: Venues, Broadcast Networks, Program Types
 */

export interface SportHierarchy {
  sport: string;
  leagues: {
    league: string;
    teams: {
      name: string;
      abbreviation: string;
      venue: string;
      city: string;
    }[];
  }[];
}

export const sportHierarchy: SportHierarchy[] = [
  {
    sport: "Baseball",
    leagues: [
      {
        league: "MLB",
        teams: [
          { name: "New York Yankees", abbreviation: "NYY", venue: "Yankee Stadium", city: "New York" },
          { name: "New York Mets", abbreviation: "NYM", venue: "Citi Field", city: "New York" },
          { name: "Los Angeles Dodgers", abbreviation: "LAD", venue: "Dodger Stadium", city: "Los Angeles" },
          { name: "Boston Red Sox", abbreviation: "BOS", venue: "Fenway Park", city: "Boston" },
          { name: "Chicago Cubs", abbreviation: "CHC", venue: "Wrigley Field", city: "Chicago" },
          { name: "San Francisco Giants", abbreviation: "SF", venue: "Oracle Park", city: "San Francisco" },
          { name: "Houston Astros", abbreviation: "HOU", venue: "Minute Maid Park", city: "Houston" },
          { name: "Atlanta Braves", abbreviation: "ATL", venue: "Truist Park", city: "Atlanta" },
          { name: "Philadelphia Phillies", abbreviation: "PHI", venue: "Citizens Bank Park", city: "Philadelphia" },
          { name: "San Diego Padres", abbreviation: "SD", venue: "Petco Park", city: "San Diego" },
          { name: "Texas Rangers", abbreviation: "TEX", venue: "Globe Life Field", city: "Arlington" },
          { name: "St. Louis Cardinals", abbreviation: "STL", venue: "Busch Stadium", city: "St. Louis" },
        ],
      },
      {
        league: "MiLB",
        teams: [
          { name: "Durham Bulls", abbreviation: "DUR", venue: "Durham Bulls Athletic Park", city: "Durham" },
          { name: "Las Vegas Aviators", abbreviation: "LVA", venue: "Las Vegas Ballpark", city: "Las Vegas" },
          { name: "Nashville Sounds", abbreviation: "NAS", venue: "First Horizon Park", city: "Nashville" },
          { name: "Sacramento River Cats", abbreviation: "SAC", venue: "Sutter Health Park", city: "Sacramento" },
          { name: "Iowa Cubs", abbreviation: "IOW", venue: "Principal Park", city: "Des Moines" },
        ],
      },
    ],
  },
  {
    sport: "Football",
    leagues: [
      {
        league: "NFL",
        teams: [
          { name: "Dallas Cowboys", abbreviation: "DAL", venue: "AT&T Stadium", city: "Arlington" },
          { name: "New England Patriots", abbreviation: "NE", venue: "Gillette Stadium", city: "Foxborough" },
          { name: "Green Bay Packers", abbreviation: "GB", venue: "Lambeau Field", city: "Green Bay" },
          { name: "Kansas City Chiefs", abbreviation: "KC", venue: "Arrowhead Stadium", city: "Kansas City" },
          { name: "San Francisco 49ers", abbreviation: "SF", venue: "Levi's Stadium", city: "Santa Clara" },
          { name: "Philadelphia Eagles", abbreviation: "PHI", venue: "Lincoln Financial Field", city: "Philadelphia" },
          { name: "Buffalo Bills", abbreviation: "BUF", venue: "Highmark Stadium", city: "Orchard Park" },
        ],
      },
      {
        league: "NCAA Football",
        teams: [
          { name: "Alabama Crimson Tide", abbreviation: "ALA", venue: "Bryant-Denny Stadium", city: "Tuscaloosa" },
          { name: "Ohio State Buckeyes", abbreviation: "OSU", venue: "Ohio Stadium", city: "Columbus" },
          { name: "Georgia Bulldogs", abbreviation: "UGA", venue: "Sanford Stadium", city: "Athens" },
          { name: "Michigan Wolverines", abbreviation: "MICH", venue: "Michigan Stadium", city: "Ann Arbor" },
          { name: "Texas Longhorns", abbreviation: "TEX", venue: "Darrell K Royal Stadium", city: "Austin" },
        ],
      },
    ],
  },
  {
    sport: "Basketball",
    leagues: [
      {
        league: "NBA",
        teams: [
          { name: "Los Angeles Lakers", abbreviation: "LAL", venue: "Crypto.com Arena", city: "Los Angeles" },
          { name: "Boston Celtics", abbreviation: "BOS", venue: "TD Garden", city: "Boston" },
          { name: "Golden State Warriors", abbreviation: "GSW", venue: "Chase Center", city: "San Francisco" },
          { name: "Milwaukee Bucks", abbreviation: "MIL", venue: "Fiserv Forum", city: "Milwaukee" },
          { name: "Phoenix Suns", abbreviation: "PHX", venue: "Footprint Center", city: "Phoenix" },
          { name: "Denver Nuggets", abbreviation: "DEN", venue: "Ball Arena", city: "Denver" },
          { name: "Miami Heat", abbreviation: "MIA", venue: "Kaseya Center", city: "Miami" },
        ],
      },
      {
        league: "NCAA Basketball",
        teams: [
          { name: "Duke Blue Devils", abbreviation: "DUKE", venue: "Cameron Indoor Stadium", city: "Durham" },
          { name: "Kentucky Wildcats", abbreviation: "UK", venue: "Rupp Arena", city: "Lexington" },
          { name: "North Carolina Tar Heels", abbreviation: "UNC", venue: "Dean Smith Center", city: "Chapel Hill" },
          { name: "Kansas Jayhawks", abbreviation: "KU", venue: "Allen Fieldhouse", city: "Lawrence" },
          { name: "Gonzaga Bulldogs", abbreviation: "GONZ", venue: "McCarthey Athletic Center", city: "Spokane" },
        ],
      },
    ],
  },
  {
    sport: "Hockey",
    leagues: [
      {
        league: "NHL",
        teams: [
          { name: "New York Rangers", abbreviation: "NYR", venue: "Madison Square Garden", city: "New York" },
          { name: "Toronto Maple Leafs", abbreviation: "TOR", venue: "Scotiabank Arena", city: "Toronto" },
          { name: "Montreal Canadiens", abbreviation: "MTL", venue: "Bell Centre", city: "Montreal" },
          { name: "Boston Bruins", abbreviation: "BOS", venue: "TD Garden", city: "Boston" },
          { name: "Pittsburgh Penguins", abbreviation: "PIT", venue: "PPG Paints Arena", city: "Pittsburgh" },
        ],
      },
    ],
  },
  {
    sport: "Soccer",
    leagues: [
      {
        league: "MLS",
        teams: [
          { name: "LA Galaxy", abbreviation: "LAG", venue: "Dignity Health Sports Park", city: "Carson" },
          { name: "Atlanta United", abbreviation: "ATL", venue: "Mercedes-Benz Stadium", city: "Atlanta" },
          { name: "Seattle Sounders", abbreviation: "SEA", venue: "Lumen Field", city: "Seattle" },
          { name: "Inter Miami CF", abbreviation: "MIA", venue: "Chase Stadium", city: "Fort Lauderdale" },
          { name: "LAFC", abbreviation: "LAFC", venue: "BMO Stadium", city: "Los Angeles" },
        ],
      },
    ],
  },
];

export const broadcastNetworks = [
  "ESPN",
  "ESPN2",
  "ESPN+",
  "Fox Sports 1",
  "Fox Sports 2",
  "Fox",
  "TBS",
  "TNT",
  "MLB Network",
  "NFL Network",
  "NBA TV",
  "NHL Network",
  "CBS",
  "CBS Sports Network",
  "NBC",
  "NBC Sports",
  "Peacock",
  "ABC",
  "Apple TV+",
  "Amazon Prime Video",
  "YouTube TV",
  "Bally Sports",
  "YES Network",
  "SNY",
  "NESN",
  "Marquee Sports Network",
];

export const programTypes = [
  "Live Game",
  "Pre-Game Show",
  "Post-Game Show",
  "Studio Show",
  "Documentary",
  "Highlight Reel",
  "Press Conference",
  "Draft Coverage",
  "Award Ceremony",
  "Spring Training",
  "Playoff Game",
  "World Series",
  "All-Star Game",
  "Exhibition",
];
