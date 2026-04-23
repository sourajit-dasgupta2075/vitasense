import fs from "fs";
import admin from "firebase-admin";
import crypto from "crypto";
import { env } from "../config/env.js";

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

function buildFirebaseCredential() {
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

  return null;
}

function ensureFirebaseInitialized() {
  if (admin.apps.length === 0) {
    const credential = buildFirebaseCredential();
    if (!credential) return null;
    admin.initializeApp({ credential });
  }
  return admin;
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
}

function signPayload(payload) {
  const payloadString = JSON.stringify(payload);
  return crypto.createHmac("sha256", process.env.AUTH_SECRET || "vitasense-auth-secret-change-me").update(payloadString).digest("base64url");
}

function verifyCustomToken(token = "") {
  const [encodedPayload, signature] = String(token).split(".");
  if (!encodedPayload || !signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    const expectedSignature = signPayload(payload);
    if (signature !== expectedSignature) return null;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(token) {
  const firebaseApp = ensureFirebaseInitialized();
  if (!firebaseApp) {
    throw new Error("Firebase admin credentials are not configured.");
  }
  return firebaseApp.auth().verifyIdToken(token);
}

export async function authenticate(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const parts = token.split(".");
  let payload = null;

  if (parts.length === 3) {
    try {
      payload = await verifyFirebaseIdToken(token);
    } catch (error) {
      // If Firebase is configured and the token is clearly a Firebase JWT, fail early.
      if (env.firebaseProjectId || env.firebaseServiceAccountPath || env.firebaseClientEmail) {
        return res.status(401).json({ message: "Firebase token validation failed" });
      }
    }
  }

  if (!payload && parts.length === 2) {
    payload = verifyCustomToken(token);
  }

  if (!payload) {
    return res.status(401).json({ message: "Invalid authentication token" });
  }

  req.authUser = {
    uid: payload.sub || payload.uid,
    email: payload.email || payload.user_email || "",
    provider: parts.length === 3 ? "firebase" : "legacy"
  };

  return next();
}
