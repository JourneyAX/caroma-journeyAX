import { MongoClient, Db } from 'mongodb';
/**
 * Connects to the MongoDB database and caches the client connection pool
 */
export declare function connectToDatabase(uri: string, dbName?: string): Promise<{
    client: MongoClient;
    db: Db;
}>;
/**
 * Returns the active MongoDB database instance
 */
export declare function getDb(): Db;
