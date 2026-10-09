// Loads apps/api/.env no matter which folder the server is started from,
// and fills safe development defaults so a missing .env never silently breaks the API.
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
const found = fs.existsSync(envPath);
dotenv.config({ path: envPath });

const isProd = process.env.NODE_ENV === 'production';
const warnings = [];
if (!found) warnings.push(`No .env file at ${envPath} - using development defaults. Copy .env.example to .env.`);

if (!process.env.MONGODB_URI) {
  if (isProd) throw new Error('MONGODB_URI is required in production.');
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/proofloop';
  warnings.push('MONGODB_URI not set - using mongodb://127.0.0.1:27017/proofloop');
}
const weak = !process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('replace_with');
if (weak) {
  if (isProd) throw new Error('Set a strong JWT_SECRET in production.');
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  warnings.push('JWT_SECRET not set - generated a temporary one (logins reset when the API restarts).');
}
export const envWarnings = warnings;
