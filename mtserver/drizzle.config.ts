import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  verbose: true, //tells us exactly what's changing when we set up our migrations
  strict: true //asks you to confirm any changes that migrations may cause
});
