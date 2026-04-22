import { db } from "../config/db.js";

const COLLECTION = "healthReadings";

function normalizeDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
  };
}

export class HealthReading {
  static async create(payload) {
    const now = new Date().toISOString();
    const doc = {
      ...payload,
      timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : now,
      createdAt: now,
      updatedAt: now
    };

    const ref = await db.collection(COLLECTION).add(doc);
    return { id: ref.id, ...doc };
  }

  static async findLatest() {
    const snapshot = await db.collection(COLLECTION).orderBy("timestamp", "desc").limit(1).get();
    if (snapshot.empty) return null;
    return normalizeDoc(snapshot.docs[0]);
  }

  static async findSince(sinceIso) {
    const snapshot = await db.collection(COLLECTION).where("timestamp", ">=", sinceIso).orderBy("timestamp", "asc").get();
    return snapshot.docs.map(normalizeDoc);
  }

  static async findRecent(limit = 120) {
    const snapshot = await db.collection(COLLECTION).orderBy("timestamp", "desc").limit(limit).get();
    return snapshot.docs.map(normalizeDoc).reverse();
  }

  static async countDocuments() {
    const snapshot = await db.collection(COLLECTION).count().get();
    return snapshot.data().count;
  }

  static async insertMany(documents) {
    const batch = db.batch();
    for (const payload of documents) {
      const ref = db.collection(COLLECTION).doc();
      const now = new Date().toISOString();
      batch.set(ref, {
        ...payload,
        timestamp: payload.timestamp ? new Date(payload.timestamp).toISOString() : now,
        createdAt: now,
        updatedAt: now
      });
    }
    await batch.commit();
  }
}
