import fs from "fs";
import admin from "firebase-admin";
import { env } from "./env.js";

let initialized = false;
export let db;

function normalizePrivateKey(rawKey) {
  if (!rawKey) return "";

  let normalized = rawKey.trim();

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  return normalized.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

function buildCredential() {
  if (env.firebaseServiceAccountPath && fs.existsSync(env.firebaseServiceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(env.firebaseServiceAccountPath, "utf-8"));
    return admin.credential.cert(serviceAccount);
  }

  if (env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey) {
    return admin.credential.cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: normalizePrivateKey(env.firebasePrivateKey)
    });
  }

  throw new Error("Firebase credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.");
}

export async function connectDb() {
  if (!initialized) {
    admin.initializeApp({ credential: buildCredential() });
    db = admin.firestore();
    initialized = true;
    console.log("Firebase Firestore connected");
  }
  return db;
}
