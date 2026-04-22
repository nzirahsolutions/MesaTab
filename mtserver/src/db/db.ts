import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

function resolveDatabaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    const localUrl = process.env.LOCAL_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.CLOUD_DATABASE_URL;
    if (localUrl) return localUrl;
  }

  const cloudUrl = process.env.CLOUD_DATABASE_URL ?? process.env.DATABASE_URL;
  if (cloudUrl) return cloudUrl;

  throw new Error(
    'Database URL is not configured. Use LOCAL_DATABASE_URL for development, or CLOUD_DATABASE_URL / DATABASE_URL for production.'
  );
}

const client = postgres(resolveDatabaseUrl(), { prepare: false });
export const db = drizzle(client, { schema, logger: false});//logger true ensures every change in our database in logged in our console
