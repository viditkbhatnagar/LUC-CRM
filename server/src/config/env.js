// Validated environment loader — single place that reads process.env.
// Loads server/.env via dotenv (no-op if vars already set by the host, e.g. Render).
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/.env lives two levels up from src/config/
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const bool = (v, def = false) =>
  v === undefined ? def : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

const isTest = process.env.NODE_ENV === 'test';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest,
  port: Number(process.env.PORT) || 4000,

  // In test runs we connect to the dedicated test DB; otherwise the app DB.
  mongoUri: isTest
    ? process.env.MONGODB_URI_TEST || process.env.MONGODB_URI
    : process.env.MONGODB_URI,
  mongoUriTest: process.env.MONGODB_URI_TEST,

  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  cookieName: 'luc_token',
  cookieSecure: bool(process.env.COOKIE_SECURE, false),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  messagingDriver: process.env.MESSAGING_DRIVER || 'console',
  storageDriver: process.env.STORAGE_DRIVER || 'stub',
  ingestApiKey: process.env.INGEST_API_KEY || '',
  cronSecret: process.env.CRON_SECRET || '',

  aws: {
    region: process.env.AWS_REGION || '',
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  seedOnBoot: bool(process.env.SEED_ON_BOOT, false),

  // Run the SLA sweep on an in-process 15-min timer instead of a separate
  // Render cron service — lets a single (always-on) web service do everything.
  runSweepInProcess: bool(process.env.RUN_SWEEP_IN_PROCESS, false),
};

// Fail fast on missing critical secrets (except in test, which may stub them).
export function assertEnv() {
  const missing = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (env.isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16)) {
    missing.push('JWT_SECRET (>=16 chars in production)');
  }
  if (missing.length) {
    throw new Error(`Missing/invalid environment variables: ${missing.join(', ')}`);
  }
}
