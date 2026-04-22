import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

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

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
  verbose: true, //tells us exactly what's changing when we set up our migrations
  strict: true //asks you to confirm any changes that migrations may cause
});
