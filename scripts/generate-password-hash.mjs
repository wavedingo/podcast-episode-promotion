#!/usr/bin/env node
/**
 * Generates a hashed password value for AUTH_USER_* env vars.
 *
 * Usage:
 *   node scripts/generate-password-hash.mjs <username> <password>
 *
 * Example:
 *   node scripts/generate-password-hash.mjs alice mysecretpassword
 *
 * Copy the output line into your .env.local as AUTH_USER_1, AUTH_USER_2, or AUTH_USER_3.
 */

import { pbkdf2Sync, randomBytes } from 'crypto';

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error('Usage: node scripts/generate-password-hash.mjs <username> <password>');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(password, salt, 310_000, 32, 'sha256').toString('hex');
const value = `${username}:${salt}:${hash}`;

console.log('\nAdd to .env.local (pick the next free slot number):\n');
console.log(`AUTH_USER_?=${value}`);
console.log('\nRun this script once per user, replacing ? with 1, 2, or 3.\n');
