import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const host= process.env.NODE_ENV==='development'? process.env.LOCAL_DATABASE_URL : process.env.CLOUD_DATABASE_URL;
const client = postgres(host!, { prepare: false });
export const db = drizzle(client, { schema, logger: false});//logger true ensures every change in our database in logged in our console
