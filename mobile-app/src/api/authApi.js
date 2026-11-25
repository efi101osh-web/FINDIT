// PREVIEW VERSION (Stage 7): no server yet, so these return sample results.
// Stage 8 replaces the bodies with real calls to POST /auth/login and /auth/register,
// and stores the token with expo-secure-store. The functions keep the same names and shapes.

import { delay } from './delay';
import { sampleUserFor } from './sampleData';

/** Looks for a saved login on the phone. Stage 8 reads expo-secure-store; for now there is none. */
export async function restoreSession() {
  return null;
}

export async function login({ email }) {
  await delay(600);
  return { user: sampleUserFor({ email }), token: null };
}

export async function register({ fullName, email }) {
  await delay(600);
  return { user: sampleUserFor({ fullName, email }), token: null };
}

export async function logout() {
  return undefined;
}
