import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://mapforge:mapforge_dev@localhost:5433/mapforge';
const client = postgres(connectionString, { max: 20, idle_timeout: 20, connect_timeout: 10 });
export const db = drizzle(client, { schema });
