import crypto from "crypto";
import { db } from "../config/db.js";

const COLLECTION = "users";

function normalizeDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
  };
}

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, passwordHash = "") {
  const [salt, storedHash] = String(passwordHash).split(":");
  if (!salt || !storedHash) return false;

  const derivedHash = crypto.scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (derivedHash.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(derivedHash, storedBuffer);
}

export function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export class User {
  static async create({ name, email, password }) {
    const now = new Date().toISOString();
    const doc = {
      name: String(name).trim(),
      email: normalizeEmail(email),
      passwordHash: hashPassword(password),
      createdAt: now,
      updatedAt: now
    };

    const ref = await db.collection(COLLECTION).add(doc);
    return sanitizeUser({ id: ref.id, ...doc });
  }

  static async findByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    const snapshot = await db.collection(COLLECTION).where("email", "==", normalizedEmail).limit(1).get();
    if (snapshot.empty) return null;
    return normalizeDoc(snapshot.docs[0]);
  }

  static async findById(id) {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return normalizeDoc(doc);
  }
}
