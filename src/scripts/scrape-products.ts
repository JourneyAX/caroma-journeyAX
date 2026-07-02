/**
 * Deep product scraper — discovers and scrapes individual product pages
 * from Caroma category listings.
 *
 * Usage:
 *   npx tsx src/scripts/scrape-products.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { scrapePage, scrapeUrls } from '../services/knowledge/crawler';
import { classifyPage, extractProductMetadata } from '../services/knowledge/classifier';
import { chunkContent } from '../services/knowledge/chunker';
import { embedTexts } from '../services/knowledge/embedder';
import { insertDocuments, ensureIndexes, getStats, closeConnection } from '../services/knowledge/mongo';
import { KnowledgeDocument, DocumentMetadata, Chunk } from '../services/knowledge/types';

const BRAND = 'caroma';

// All category pages that contain links to individual products
const CATEGORY_PAGES = [
  // Bathroom
  'https://www.caroma.com.au/au/bathroom/',
  'https://www.caroma.com.au/au/bathroom/basins/',
  'https://www.caroma.com.au/au/bathroom/basins/above-counter/',
  'https://www.caroma.com.au/au/bathroom/basins/inset/',
  'https://www.caroma.com.au/au/bathroom/basins/semi-recessed/',
  'https://www.caroma.com.au/au/bathroom/basins/wall-mounted/',
  'https://www.caroma.com.au/au/bathroom/showers/',
  'https://www.caroma.com.au/au/bathroom/showers/shower-heads/',
  'https://www.caroma.com.au/au/bathroom/showers/shower-systems/',
  'https://www.caroma.com.au/au/bathroom/tapware/',
  'https://www.caroma.com.au/au/bathroom/tapware/basin-mixers/',
  'https://www.caroma.com.au/au/bathroom/tapware/bath-shower-mixers/',
  'https://www.caroma.com.au/au/bathroom/tapware/outlets-spouts/',
  'https://www.caroma.com.au/au/bathroom/toilet-suites/',
  'https://www.caroma.com.au/au/bathroom/baths/',
  'https://www.caroma.com.au/au/bathroom/bathroom-accessories/',
  // Collections
  'https://www.caroma.com.au/au/bathroom/collections/',
  // Kitchen
  'https://www.caroma.com.au/au/kitchen-laundry/',
  'https://www.caroma.com.au/au/kitchen-laundry/kitchen-sinks-accessories/',
  // Independent living (care products)
  'https://www.caroma.com.au/au/independent-living/',
  // Help / troubleshooting
  'https://www.caroma.com.au/au/caroma-warranties/',
  'https://www.caroma.com.au/au/contact-us/',
];

/**
 * Extract product detail URLs from a scraped category page.
 */
function extractProductUrls(markdown: string, baseUrl: string): string[] {
  const urls = new Set<string>();

  // Pattern 1: Markdown links to /product/ pages
  const mdLinkRegex = /\(https?:\/\/www\.caroma\.com[^)]*\/product\/[^)\s]+\)/g;
  let match;
  while ((match = mdLinkRegex.exec(markdown)) !== null) {
    let url = match[0].slice(1, -1);
    // Clean up URLs that have image paths prepended
    const productIndex = url.indexOf('https://www.caroma.com/au/product/');
    if (productIndex > 0) {
      url = url.slice(productIndex);
    }
    if (url.includes('/product/') && !url.includes('.png') && !url.includes('.jpg')) {
      urls.add(url.split(/[)\s]/)[0]);
    }
  }

  // Pattern 2: Bare URLs in markdown
  const bareRegex = /https?:\/\/www\.caroma\.com\/au\/product\/[^\s"')]+/g;
  while ((match = bareRegex.exec(markdown)) !== null) {
    const url = match[0];
    if (!url.includes('.png') && !url.includes('.jpg') && !url.includes('.webp')) {
      urls.add(url);
    }
  }

  return [...urls];
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('🔍 Deep Product Scraper');
  console.log('═══════════════════════════════════════════');

  await ensureIndexes();

  // Step 1: Scrape category pages to discover product URLs
  console.log(`\n📂 Step 1: Scraping ${CATEGORY_PAGES.length} category pages to discover products...`);
  const allProductUrls = new Set<string>();

  for (const categoryUrl of CATEGORY_PAGES) {
    console.log(`  → ${categoryUrl}`);
    const page = await scrapePage(categoryUrl);
    if (page) {
      const productUrls = extractProductUrls(page.markdown, categoryUrl);
      for (const u of productUrls) allProductUrls.add(u);
      console.log(`    Found ${productUrls.length} product links`);
    }
    // Small delay
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n   Total unique product URLs discovered: ${allProductUrls.size}`);

  if (allProductUrls.size === 0) {
    console.log('⚠️  No product URLs found — exiting');
    await closeConnection();
    return;
  }

  // Step 2: Scrape each product detail page
  const productUrlList = [...allProductUrls];
  // Cap at 100 to conserve credits
  const urlsToScrape = productUrlList.slice(0, 100);
  console.log(`\n🔥 Step 2: Scraping ${urlsToScrape.length} product detail pages (capped at 100)...`);
  const productPages = await scrapeUrls(urlsToScrape, 2);

  console.log(`   Successfully scraped: ${productPages.length} product pages`);

  if (productPages.length === 0) {
    console.log('⚠️  No product pages scraped — exiting');
    await closeConnection();
    return;
  }

  // Step 3: Process — classify, chunk, embed
  console.log(`\n📄 Step 3: Processing ${productPages.length} product pages...`);
  const allChunks: Chunk[] = [];

  for (const page of productPages) {
    const classification = classifyPage(page.url, page.markdown, page.title);
    const metadata: DocumentMetadata = {
      type: classification.type || 'product', // Force product type for these pages
      category: classification.category,
      collection: classification.collection,
      brand: BRAND,
      url: page.url,
    };

    // Extract detailed product metadata
    const productMeta = extractProductMetadata(page.markdown);
    Object.assign(metadata, productMeta);

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

  // Step 4: Embed
  console.log(`\n🧠 Step 4: Embedding ${allChunks.length} chunks...`);
  const texts = allChunks.map(c => c.text);
  const embeddings = await embedTexts(texts);

  // Step 5: Store in MongoDB
  const now = new Date();
  const documents: KnowledgeDocument[] = allChunks.map((chunk, i) => ({
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

  console.log(`\n💾 Step 5: Inserting ${documents.length} product documents into MongoDB...`);
  const count = await insertDocuments(documents);
  console.log(`✅ Inserted ${count} product documents`);

  // Show stats
  const stats = await getStats(BRAND);
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 Updated Knowledge Base Stats');
  console.log('═══════════════════════════════════════════');
  console.log(`Total documents: ${stats.totalDocuments}`);
  console.log('By type:');
  for (const [type, cnt] of Object.entries(stats.byType)) {
    console.log(`  ${type}: ${cnt}`);
  }

  await closeConnection();
}

main();
