"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.getDb = getDb;
const mongodb_1 = require("mongodb");
let client = null;
let db = null;
/**
 * Connects to the MongoDB database and caches the client connection pool
 */
async function connectToDatabase(uri, dbName = 'journeyax') {
    if (client && db) {
        return { client, db };
    }
    client = new mongodb_1.MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    return { client, db };
}
/**
 * Returns the active MongoDB database instance
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call connectToDatabase first.');
    }
    return db;
}
