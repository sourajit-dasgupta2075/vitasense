import { db } from "../config/db.js";

const COLLECTION = "alerts";

function normalizeDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
  };
}

export class Alert {
  static async create(payload) {
    const now = new Date().toISOString();
    const doc = { ...payload, createdAt: now, updatedAt: now };
    const ref = await db.collection(COLLECTION).add(doc);
    return { id: ref.id, ...doc };
  }

  static async createMany(documents) {
    return Promise.all(documents.map((doc) => Alert.create(doc)));
  }

  static async findRecent(limit = 10) {
    const snapshot = await db.collection(COLLECTION).orderBy("createdAt", "desc").limit(limit).get();
    return snapshot.docs.map(normalizeDoc);
  }
}
