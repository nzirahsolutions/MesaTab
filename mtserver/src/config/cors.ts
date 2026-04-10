import type { CorsOptions } from 'cors';
import 'dotenv/config';

// Define your allowed origins in a list
const allowedOrigins = [
  process.env.CLIENT_URL, 
  process.env.LOCAL_CLIENT_URL,
  'http://localhost:5173',
];

export const corsOptions: CorsOptions = {
  // Filters out any undefined values if the env variable isn't set
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("CORS origin denied"));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};