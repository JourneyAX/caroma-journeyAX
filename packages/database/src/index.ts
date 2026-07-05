import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connects to the MongoDB database and caches the client connection pool
 */
export async function connectToDatabase(
  uri: string,
  dbName: string = 'journeyax'
): Promise<{ client: MongoClient; db: Db }> {
  if (client && db) {
    return { client, db };
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  
  return { client, db };
}

/**
 * Returns the active MongoDB database instance
 */
export function getDb(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
}
