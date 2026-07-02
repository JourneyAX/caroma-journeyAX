import { ObjectId } from 'mongodb';

// ── Document stored in MongoDB ─────────────────────────────────────────
export interface KnowledgeDocument {
  _id?: ObjectId;
  brand: string;
  sourceUrl: string;
  title: string;
  content: string;          // full page markdown
  chunk: string;             // the specific chunk text (what gets embedded)
  chunkIndex: number;
  metadata: DocumentMetadata;
  embedding: number[];       // 1536-dim from text-embedding-3-small
  crawledAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  type: DocumentType;
  category?: string;
  collection?: string;
  brand: string;
  sku?: string;
  price?: number;
  currency?: string;
  images?: string[];
  finishes?: string[];
  url?: string;
}

export type DocumentType =
  | 'product'
  | 'troubleshooting'
  | 'design'
  | 'collection'
  | 'installation'
  | 'technical'
  | 'faq'
  | 'pdf'
  | 'general';

// ── Search types ───────────────────────────────────────────────────────
export interface SearchOptions {
  query: string;
  brand?: string;
  type?: DocumentType;
  category?: string;
  collection?: string;
  limit?: number;
}

export interface SearchResult {
  document: KnowledgeDocument;
  score: number;
}

// ── Crawl types ────────────────────────────────────────────────────────
export interface CrawlConfig {
  brandName: string;
  catalogUrl: string;
  includePaths?: string[];
  excludePaths?: string[];
  maxPages?: number;
}

export interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
  metadata?: Record<string, unknown>;
}

// ── Chunk types ────────────────────────────────────────────────────────
export interface Chunk {
  text: string;
  index: number;
  sourceUrl: string;
  title: string;
  fullContent: string;
  metadata: DocumentMetadata;
}

// ── Ingestion status ───────────────────────────────────────────────────
export interface IngestionStatus {
  brand: string;
  status: 'idle' | 'crawling' | 'processing' | 'embedding' | 'complete' | 'error';
  totalPages: number;
  processedPages: number;
  totalChunks: number;
  embeddedChunks: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}
