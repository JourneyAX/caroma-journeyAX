import { MongoClient, Db, Collection } from 'mongodb';
import { KnowledgeDocument, SearchOptions, SearchResult } from './types';

// ── Singleton client ───────────────────────────────────────────────────
let client: MongoClient | null = null;
let db: Db | null = null;

const DB_NAME = 'journeyx';
const COLLECTION_NAME = 'documents';
const VECTOR_INDEX_NAME = 'vector_index';

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in environment');

  client = new MongoClient(uri);
  await client.connect();
  console.log('✅ Connected to MongoDB Atlas');
  return client;
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  const c = await getMongoClient();
  db = c.db(DB_NAME);
  return db;
}

export async function getCollection(): Promise<Collection<KnowledgeDocument>> {
  const database = await getDb();
  return database.collection<KnowledgeDocument>(COLLECTION_NAME);
}

// ── Insert documents ───────────────────────────────────────────────────
export async function insertDocuments(docs: KnowledgeDocument[]): Promise<number> {
  if (docs.length === 0) return 0;
  const col = await getCollection();
  const result = await col.insertMany(docs as any[]);
  return result.insertedCount;
}

// ── Clear brand data ───────────────────────────────────────────────────
export async function clearBrandDocuments(brand: string): Promise<number> {
  const col = await getCollection();
  const result = await col.deleteMany({ brand });
  return result.deletedCount;
}

// ── Vector search ──────────────────────────────────────────────────────
export async function vectorSearch(
  queryEmbedding: number[],
  options: SearchOptions
): Promise<SearchResult[]> {
  const col = await getCollection();
  const limit = options.limit || 8;

  // Build pre-filter for metadata fields
  const filter: Record<string, unknown> = {};
  if (options.brand) {
    filter['metadata.brand'] = options.brand;
  }
  if (options.type) {
    filter['metadata.type'] = options.type;
  }
  if (options.category) {
    filter['metadata.category'] = options.category;
  }

  const pipeline: object[] = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: limit * 10,
        limit: limit,
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
      },
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $project: {
        embedding: 0, // Don't return the 1536-dim vector
      },
    },
  ];

  const results = await col.aggregate(pipeline).toArray();

  return results.map((doc) => ({
    document: doc as unknown as KnowledgeDocument,
    score: (doc as any).score || 0,
  }));
}

// ── Regex search (works without any Atlas indexes) ─────────────────────
export async function regexSearch(
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const col = await getCollection();
  const limit = options.limit || 8;

  const filter: Record<string, unknown> = {};
  
  // Brand filter — check both 'brand' and 'metadata.brand'
  if (options.brand) {
    filter['$or'] = [
      { brand: options.brand },
      { 'metadata.brand': options.brand }
    ];
  }
  if (options.type) filter['metadata.type'] = options.type;
  if (options.category) filter['metadata.category'] = options.category;

  // Build regex from the important words in the query
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'how'].includes(w));
  
  if (words.length > 0) {
    const regexPattern = words.join('|');
    filter.chunk = { $regex: new RegExp(regexPattern, 'i') };
  }

  const results = await col
    .find(filter)
    .limit(limit)
    .toArray();

  return results.map((doc, i) => ({
    document: doc as KnowledgeDocument,
    score: 1 - i * 0.1, // Decreasing relevance
  }));
}

// ── Search (tries vector first, falls back to regex) ───────────────────
export async function search(
  queryEmbedding: number[] | null,
  options: SearchOptions
): Promise<SearchResult[]> {
  // Try vector search first
  if (queryEmbedding) {
    try {
      const vectorResults = await vectorSearch(queryEmbedding, options);
      if (vectorResults.length > 0) {
        console.log(`  📊 Vector search: ${vectorResults.length} results`);
        return vectorResults;
      }
    } catch (err) {
      console.warn('  ⚠️ Vector search unavailable, using regex fallback');
    }
  }
  
  // Fallback to regex search (always works, no index needed)
  try {
    const regexResults = await regexSearch(options.query, options);
    console.log(`  📊 Regex search: ${regexResults.length} results for "${options.query}"`);
    return regexResults;
  } catch (err) {
    console.error('  ❌ Regex search also failed:', err);
    return [];
  }
}

// ── Stats ──────────────────────────────────────────────────────────────
export async function getStats(brand?: string): Promise<{
  totalDocuments: number;
  byType: Record<string, number>;
  brands: string[];
}> {
  const col = await getCollection();
  const filter = brand ? { brand } : {};

  const totalDocuments = await col.countDocuments(filter);

  const typeAgg = await col
    .aggregate([
      { $match: filter },
      { $group: { _id: '$metadata.type', count: { $sum: 1 } } },
    ])
    .toArray();

  const byType: Record<string, number> = {};
  for (const t of typeAgg) {
    byType[t._id as string] = t.count;
  }

  const brandsAgg = await col.distinct('brand');

  return { totalDocuments, byType, brands: brandsAgg };
}

// ── Ensure indexes ─────────────────────────────────────────────────────
export async function ensureIndexes(): Promise<void> {
  const col = await getCollection();
  // Standard indexes for filtering
  await col.createIndex({ brand: 1 });
  await col.createIndex({ 'metadata.type': 1 });
  await col.createIndex({ 'metadata.category': 1 });
  await col.createIndex({ sourceUrl: 1 });
  console.log('✅ Standard indexes created');
  // Note: Vector search index must be created in Atlas UI
}

// ── Close connection ───────────────────────────────────────────────────
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}
