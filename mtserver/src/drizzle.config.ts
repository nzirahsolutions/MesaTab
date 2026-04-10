import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const host= process.env.NODE_ENV=='development'? process.env.LOCAL_DATABASE_URL : process.env.CLOUD_DATABASE_URL;

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: host as string,
  },
  verbose: true, //tells us exactly what's changing when we set up our migrations
  strict: true //asks you to confirm any changes that migrations may cause
});
