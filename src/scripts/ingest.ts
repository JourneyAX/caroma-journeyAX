/**
 * JourneyAX Knowledge Ingestion Script
 *
 * Usage:
 *   npx tsx src/scripts/ingest.ts --md          # Import GWA/*.md files only
 *   npx tsx src/scripts/ingest.ts --crawl       # Crawl caroma.com.au
 *   npx tsx src/scripts/ingest.ts --all         # Both MD import + crawl
 *   npx tsx src/scripts/ingest.ts --stats       # Show current DB stats
 *   npx tsx src/scripts/ingest.ts --clear       # Clear all brand data
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { loadMdFiles } from '../services/knowledge/md-loader';
import { crawlSite, mapSite, scrapeUrls } from '../services/knowledge/crawler';
import { classifyPage, classifyMdFile, extractProductMetadata } from '../services/knowledge/classifier';
import { chunkContent } from '../services/knowledge/chunker';
import { embedTexts } from '../services/knowledge/embedder';
import {
  insertDocuments,
  clearBrandDocuments,
  ensureIndexes,
  getStats,
  closeConnection,
} from '../services/knowledge/mongo';
import { KnowledgeDocument, CrawledPage, Chunk, DocumentMetadata } from '../services/knowledge/types';

const BRAND = 'caroma';
const GWA_DIR = path.resolve(process.cwd(), '..', 'GWA');
const CAROMA_URL = 'https://www.caroma.com.au';

// ── Process pages into documents ──────────────────────────────────────
async function processPages(
  pages: CrawledPage[],
  brand: string,
  source: 'crawl' | 'md'
): Promise<KnowledgeDocument[]> {
  console.log(`\n📄 Processing ${pages.length} pages...`);

  // 1. Classify + chunk all pages
  const allChunks: Chunk[] = [];
  for (const page of pages) {
    const classification = source === 'md'
      ? classifyMdFile(page.url, page.markdown)
      : classifyPage(page.url, page.markdown, page.title);

    const metadata: DocumentMetadata = {
      type: classification.type,
      category: classification.category,
      collection: classification.collection,
      brand,
      url: page.url,
    };

    // Extract product-specific metadata
    if (classification.type === 'product') {
      const productMeta = extractProductMetadata(page.markdown);
      Object.assign(metadata, productMeta);
    }

    const chunks = chunkContent(page.markdown, page.title, page.url, metadata);
    allChunks.push(...chunks);
  }

  console.log(`   → ${allChunks.length} chunks created`);

  // Log type distribution
  const typeCount: Record<string, number> = {};
  for (const c of allChunks) {
    typeCount[c.metadata.type] = (typeCount[c.metadata.type] || 0) + 1;
  }
  console.log('   → Types:', JSON.stringify(typeCount));

  // 2. Embed all chunks
  console.log(`\n🧠 Embedding ${allChunks.length} chunks...`);
  const texts = allChunks.map(c => c.text);
  const embeddings = await embedTexts(texts);

  // 3. Build KnowledgeDocument objects
  const now = new Date();
  const documents: KnowledgeDocument[] = allChunks.map((chunk, i) => ({
    brand,
    sourceUrl: chunk.sourceUrl,
    title: chunk.title,
    content: chunk.fullContent,
    chunk: chunk.text,
    chunkIndex: chunk.index,
    metadata: chunk.metadata,
    embedding: embeddings[i],
    crawledAt: now,
    updatedAt: now,
  }));

  return documents;
}

// ── Import MD files ──────────────────────────────────────────────────
async function importMdFiles(): Promise<number> {
  console.log('\n═══════════════════════════════════════════');
  console.log('📁 Importing GWA markdown files...');
  console.log('═══════════════════════════════════════════');

  const pages = loadMdFiles(GWA_DIR);
  if (pages.length === 0) {
    console.log('⚠️  No MD files found in', GWA_DIR);
    return 0;
  }

  const documents = await processPages(pages, BRAND, 'md');

  console.log(`\n💾 Inserting ${documents.length} documents into MongoDB...`);
  const count = await insertDocuments(documents);
  console.log(`✅ Inserted ${count} documents from MD files`);
  return count;
}

// ── Crawl website ────────────────────────────────────────────────────
async function crawlWebsite(): Promise<number> {
  console.log('\n═══════════════════════════════════════════');
  console.log('🔥 Crawling caroma.com.au...');
  console.log('═══════════════════════════════════════════');

  // Step 1: Map the site to discover all URLs
  console.log('\n🗺️  Step 1: Mapping site structure...');
  const allUrls = await mapSite(CAROMA_URL);

  // Normalize URLs (mapUrl might return objects or strings)
  const normalizedUrls = allUrls
    .map(u => (typeof u === 'string' ? u : (u as any)?.url || (u as any)?.href || String(u)))
    .filter((u): u is string => typeof u === 'string' && u.startsWith('http'));

  console.log(`   Normalized ${normalizedUrls.length} URLs`);

  // Filter to relevant bathroom/kitchen/help pages
  const relevantUrls = normalizedUrls.filter(url => {
    const lower = url.toLowerCase();
    return (
      lower.includes('/au/bathroom/') ||
      lower.includes('/au/kitchen-laundry/') ||
      lower.includes('/au/design-planning/') ||
      lower.includes('/au/help/') ||
      lower.includes('/au/independent-living/')
    ) && !(
      lower.includes('/cart') ||
      lower.includes('/checkout') ||
      lower.includes('/account') ||
      lower.includes('/login') ||
      lower.includes('/register') ||
      lower.includes('/wishlist')
    );
  });

  // Limit to avoid burning through Firecrawl credits
  const maxUrls = 150;
  const urlsToScrape = relevantUrls.slice(0, maxUrls);

  console.log(`\n   Total URLs discovered: ${allUrls.length}`);
  console.log(`   Relevant URLs filtered: ${relevantUrls.length}`);
  console.log(`   URLs to scrape (capped at ${maxUrls}): ${urlsToScrape.length}`);

  if (urlsToScrape.length === 0) {
    // Fall back to direct crawl
    console.log('\n   No URLs from map, falling back to direct crawl...');
    const pages = await crawlSite({
      brandName: BRAND,
      catalogUrl: CAROMA_URL + '/au/bathroom/',
      maxPages: 50,
    });

    if (pages.length === 0) {
      console.log('⚠️  No pages crawled');
      return 0;
    }

    const documents = await processPages(pages, BRAND, 'crawl');
    console.log(`\n💾 Inserting ${documents.length} documents into MongoDB...`);
    const count = await insertDocuments(documents);
    console.log(`✅ Inserted ${count} documents from crawl`);
    return count;
  }

  // Step 2: Scrape discovered URLs in batches
  console.log(`\n🔥 Step 2: Scraping ${urlsToScrape.length} pages...`);
  const pages = await scrapeUrls(urlsToScrape, 2);

  if (pages.length === 0) {
    console.log('⚠️  No pages scraped successfully');
    return 0;
  }

  // Step 3: Process, embed, store
  const documents = await processPages(pages, BRAND, 'crawl');

  console.log(`\n💾 Inserting ${documents.length} documents into MongoDB...`);
  const count = await insertDocuments(documents);
  console.log(`✅ Inserted ${count} documents from crawl`);
  return count;
}

// ── Show stats ───────────────────────────────────────────────────────
async function showStats(): Promise<void> {
  const stats = await getStats(BRAND);
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 Knowledge Base Stats');
  console.log('═══════════════════════════════════════════');
  console.log(`Total documents: ${stats.totalDocuments}`);
  console.log(`Brands: ${stats.brands.join(', ') || 'none'}`);
  console.log('By type:');
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`  ${type}: ${count}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const doMd = args.includes('--md') || args.includes('--all');
  const doCrawl = args.includes('--crawl') || args.includes('--all');
  const doStats = args.includes('--stats');
  const doClear = args.includes('--clear');

  if (!doMd && !doCrawl && !doStats && !doClear) {
    console.log('Usage:');
    console.log('  npx tsx src/scripts/ingest.ts --md      Import GWA/*.md files');
    console.log('  npx tsx src/scripts/ingest.ts --crawl   Crawl caroma.com.au');
    console.log('  npx tsx src/scripts/ingest.ts --all     Both MD + crawl');
    console.log('  npx tsx src/scripts/ingest.ts --stats   Show DB stats');
    console.log('  npx tsx src/scripts/ingest.ts --clear   Clear all brand data');
    process.exit(0);
  }

  try {
    // Ensure standard indexes exist
    await ensureIndexes();

    if (doClear) {
      console.log(`\n🗑️  Clearing all ${BRAND} documents...`);
      const deleted = await clearBrandDocuments(BRAND);
      console.log(`   Deleted ${deleted} documents`);
    }

    let totalInserted = 0;

    if (doMd) {
      totalInserted += await importMdFiles();
    }

    if (doCrawl) {
      totalInserted += await crawlWebsite();
    }

    if (totalInserted > 0) {
      console.log(`\n🎉 Total documents inserted: ${totalInserted}`);
      console.log('\n⚠️  IMPORTANT: Create the Vector Search index in Atlas UI:');
      console.log('   Database: journeyx → Collection: documents');
      console.log('   Index name: vector_index');
      console.log('   JSON definition:');
      console.log(JSON.stringify({
        fields: [
          { type: 'vector', path: 'embedding', numDimensions: 1536, similarity: 'cosine' },
          { type: 'filter', path: 'metadata.type' },
          { type: 'filter', path: 'metadata.category' },
          { type: 'filter', path: 'metadata.brand' },
        ],
      }, null, 2));
    }

    if (doStats || totalInserted > 0) {
      await showStats();
    }
  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

main();
