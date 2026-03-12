import { v4 as uuid } from "uuid";

export interface SeedUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: "admin" | "user";
  avatarUrl: string | null;
}

// Shared org ID for all seed users
export const ORG_ID = "a1b2c3d4-0000-4000-8000-000000000001";

export const ORG = {
  id: ORG_ID,
  name: "MLB Broadcasting Operations",
  slug: "mlb-broadcasting",
  settings: {},
};

export const users: SeedUser[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    orgId: ORG_ID,
    email: "sarah.martinez@mlb.com",
    name: "Sarah Martinez",
    role: "admin",
    avatarUrl: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    orgId: ORG_ID,
    email: "james.chen@mlb.com",
    name: "James Chen",
    role: "admin",
    avatarUrl: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    orgId: ORG_ID,
    email: "erin.kowalski@mlb.com",
    name: "Erin Kowalski",
    role: "user",
    avatarUrl: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    orgId: ORG_ID,
    email: "marcus.johnson@mlb.com",
    name: "Marcus Johnson",
    role: "user",
    avatarUrl: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    orgId: ORG_ID,
    email: "rachel.nguyen@mlb.com",
    name: "Rachel Nguyen",
    role: "user",
    avatarUrl: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    orgId: ORG_ID,
    email: "david.thompson@mlb.com",
    name: "David Thompson",
    role: "user",
    avatarUrl: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    orgId: ORG_ID,
    email: "lisa.park@mlb.com",
    name: "Lisa Park",
    role: "user",
    avatarUrl: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    orgId: ORG_ID,
    email: "carlos.rivera@mlb.com",
    name: "Carlos Rivera",
    role: "user",
    avatarUrl: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    orgId: ORG_ID,
    email: "natalie.foster@mlb.com",
    name: "Natalie Foster",
    role: "admin",
    avatarUrl: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000010",
    orgId: ORG_ID,
    email: "brian.mitchell@mlb.com",
    name: "Brian Mitchell",
    role: "user",
    avatarUrl: null,
  },
];
