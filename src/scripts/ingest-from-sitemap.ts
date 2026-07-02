/**
 * Sitemap-based product ingestion script.
 * 
 * Uses the extracted sitemap URLs to scrape product pages from caroma.com.au.
 * Intelligently samples products across collections to maximize coverage
 * within the Firecrawl credit budget.
 *
 * Usage:
 *   npx tsx src/scripts/ingest-from-sitemap.ts --products [--limit 200]
 *   npx tsx src/scripts/ingest-from-sitemap.ts --static [--limit 50]
 *   npx tsx src/scripts/ingest-from-sitemap.ts --all [--limit 200]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { scrapeUrls } from '../services/knowledge/crawler';
import { classifyPage, extractProductMetadata } from '../services/knowledge/classifier';
import { chunkContent } from '../services/knowledge/chunker';
import { embedTexts } from '../services/knowledge/embedder';
import { insertDocuments, ensureIndexes, getStats, closeConnection } from '../services/knowledge/mongo';
import { KnowledgeDocument, DocumentMetadata, Chunk } from '../services/knowledge/types';

const BRAND = 'caroma';
const DATA_DIR = path.resolve(process.cwd(), 'data');

// ── Load URLs from sitemap files ──────────────────────────────────────
function loadUrls(filename: string): string[] {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return [];
  }
  return fs.readFileSync(filepath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('https://'));
}

// ── Smart sampling: pick diverse products across collections ──────────
function smartSample(urls: string[], limit: number): string[] {
  // Group by collection/category
  const groups: Record<string, string[]> = {};
  
  for (const url of urls) {
    const slug = url.split('/product/')[1] || '';
    // Extract collection name from URL
    let group = 'other';
    if (slug.includes('contura-ii')) group = 'contura-ii';
    else if (slug.includes('liano-ii')) group = 'liano-ii';
    else if (slug.includes('liano')) group = 'liano';
    else if (slug.includes('urbane-ii')) group = 'urbane-ii';
    else if (slug.includes('urbane')) group = 'urbane';
    else if (slug.includes('luna-ii')) group = 'luna-ii';
    else if (slug.includes('luna')) group = 'luna';
    else if (slug.includes('opal')) group = 'opal';
    else if (slug.includes('elvire')) group = 'elvire';
    else if (slug.includes('cleanflush')) group = 'cleanflush';
    else if (slug.includes('easyswitch')) group = 'easyswitch';
    else if (slug.includes('care') || slug.includes('independent')) group = 'care';

    if (!groups[group]) groups[group] = [];
    groups[group].push(url);
  }

  console.log('\n   Product groups:');
  for (const [group, items] of Object.entries(groups)) {
    console.log(`     ${group}: ${items.length} products`);
  }

  // Distribute the limit across groups proportionally, minimum 1 per group
  const selected: string[] = [];
  const groupEntries = Object.entries(groups);
  const perGroup = Math.max(1, Math.floor(limit / groupEntries.length));

  for (const [group, items] of groupEntries) {
    // Prioritize variety: pick different product types within each group
    // De-duplicate by base product name (ignore finish variants)
    const baseProducts = new Map<string, string>();
    for (const url of items) {
      const slug = url.split('/product/')[1] || '';
      // Strip finish suffix (chrome, matte-black, brushed-brass, etc.)
      const base = slug
        .replace(/-(?:chrome|matte-black|matte-white|white|brushed-brass|brushed-nickel|brushed-bronze|gunmetal|satin-black|matte-clay)-?\d*\/?$/, '')
        .replace(/-\d+\/$/, '');
      if (!baseProducts.has(base)) {
        baseProducts.set(base, url);
      }
    }

    // Take up to perGroup unique base products
    const uniqueProducts = [...baseProducts.values()].slice(0, perGroup);
    selected.push(...uniqueProducts);
  }

  // If we have room, add more from larger groups
  if (selected.length < limit) {
    const remaining = limit - selected.length;
    const extras = urls.filter(u => !selected.includes(u));
    // Shuffle and take remaining
    for (let i = extras.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [extras[i], extras[j]] = [extras[j], extras[i]];
    }
    selected.push(...extras.slice(0, remaining));
  }

  return selected.slice(0, limit);
}

// ── Process pages into documents ──────────────────────────────────────
async function processPages(
  pages: Array<{ url: string; title: string; markdown: string; metadata?: Record<string, unknown> }>,
  source: string
): Promise<KnowledgeDocument[]> {
  console.log(`\n📄 Processing ${pages.length} pages...`);

  const allChunks: Chunk[] = [];
  for (const page of pages) {
    const classification = classifyPage(page.url, page.markdown, page.title);
    const metadata: DocumentMetadata = {
      type: classification.type,
      category: classification.category,
      collection: classification.collection,
      brand: BRAND,
      url: page.url,
    };

    // Extract product-specific metadata
    if (classification.type === 'product' || page.url.includes('/product/')) {
      metadata.type = 'product';
      const productMeta = extractProductMetadata(page.markdown);
      Object.assign(metadata, productMeta);
    }

    const chunks = chunkContent(page.markdown, page.title, page.url, metadata);
    allChunks.push(...chunks);
  }

  console.log(`   → ${allChunks.length} chunks created`);

  const typeCount: Record<string, number> = {};
  for (const c of allChunks) {
    typeCount[c.metadata.type] = (typeCount[c.metadata.type] || 0) + 1;
  }
  console.log('   → Types:', JSON.stringify(typeCount));

  console.log(`\n🧠 Embedding ${allChunks.length} chunks...`);
  const texts = allChunks.map(c => c.text);
  const embeddings = await embedTexts(texts);

  const now = new Date();
  return allChunks.map((chunk, i) => ({
    brand: BRAND,
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
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const doProducts = args.includes('--products') || args.includes('--all');
  const doStatic = args.includes('--static') || args.includes('--all');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 200;

  if (!doProducts && !doStatic) {
    console.log('Usage:');
    console.log('  npx tsx src/scripts/ingest-from-sitemap.ts --products [--limit 200]');
    console.log('  npx tsx src/scripts/ingest-from-sitemap.ts --static [--limit 50]');
    console.log('  npx tsx src/scripts/ingest-from-sitemap.ts --all [--limit 200]');
    process.exit(0);
  }

  try {
    await ensureIndexes();
    let totalInserted = 0;

    if (doProducts) {
      console.log('\n═══════════════════════════════════════════');
      console.log('🛒 Ingesting product pages from sitemap');
      console.log('═══════════════════════════════════════════');

      const allUrls = loadUrls('sitemap-products.txt');
      console.log(`   Total product URLs in sitemap: ${allUrls.length}`);

      const sampled = smartSample(allUrls, limit);
      console.log(`   Sampled ${sampled.length} URLs (limit: ${limit})`);

      console.log(`\n🔥 Scraping ${sampled.length} product pages...`);
      const pages = await scrapeUrls(sampled, 2);
      console.log(`   Successfully scraped: ${pages.length} pages`);

      if (pages.length > 0) {
        const docs = await processPages(pages, 'sitemap-products');
        console.log(`\n💾 Inserting ${docs.length} product documents...`);
        totalInserted += await insertDocuments(docs);
      }
    }

    if (doStatic) {
      console.log('\n═══════════════════════════════════════════');
      console.log('📄 Ingesting static pages from sitemap');
      console.log('═══════════════════════════════════════════');

      const allUrls = loadUrls('sitemap-static.txt');
      // For static, filter out unneeded pages
      const relevantUrls = allUrls.filter(u =>
        u.includes('/renovation-guide/') ||
        u.includes('/collection/') ||
        u.includes('/independent-living/') ||
        u.includes('/innovation/') ||
        u.includes('/our-story/') ||
        u.includes('/bathroom/') ||
        u.includes('/kitchen-laundry/') ||
        u.includes('/livewell/')
      );

      console.log(`   Total static URLs: ${allUrls.length}`);
      console.log(`   Relevant static URLs: ${relevantUrls.length}`);

      const urlsToScrape = relevantUrls.slice(0, Math.min(relevantUrls.length, 60));

      console.log(`\n🔥 Scraping ${urlsToScrape.length} static pages...`);
      const pages = await scrapeUrls(urlsToScrape, 2);
      console.log(`   Successfully scraped: ${pages.length} pages`);

      if (pages.length > 0) {
        const docs = await processPages(pages, 'sitemap-static');
        console.log(`\n💾 Inserting ${docs.length} static documents...`);
        totalInserted += await insertDocuments(docs);
      }
    }

    if (totalInserted > 0) {
      console.log(`\n🎉 Total documents inserted: ${totalInserted}`);
    }

    const stats = await getStats(BRAND);
    console.log('\n═══════════════════════════════════════════');
    console.log('📊 Knowledge Base Stats');
    console.log('═══════════════════════════════════════════');
    console.log(`Total documents: ${stats.totalDocuments}`);
    console.log('By type:');
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`  ${type}: ${count}`);
    }
  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

main();
