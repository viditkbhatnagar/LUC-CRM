// Mongoose connection. The database name is part of MONGODB_URI
// (luc_crm_dev for the app, luc_crm_test for tests) — we never touch
// other databases on the shared cluster.
import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

let connected = false;

export async function connectDb(uri = env.mongoUri) {
  if (connected) return mongoose.connection;
  if (!uri) throw new Error('connectDb: no MongoDB URI provided');

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });
  connected = true;

  // eslint-disable-next-line no-console
  console.log(`[luc-crm] mongodb connected → ${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDb() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
