/**
 * Phase 1: Download technical PDFs from already-scraped product pages,
 * extract text, and ingest into MongoDB knowledge base.
 *
 * Usage:
 *   npx tsx src/scripts/ingest-technical-pdfs.ts             # Full pipeline
 *   npx tsx src/scripts/ingest-technical-pdfs.ts --dry-run    # List PDFs without downloading
 *   npx tsx src/scripts/ingest-technical-pdfs.ts --stats      # Show ingestion stats
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { chunkContent } from '../services/knowledge/chunker';
import { embedTexts } from '../services/knowledge/embedder';
import {
  getCollection,
  insertDocuments,
  closeConnection,
  getStats,
} from '../services/knowledge/mongo';
import { KnowledgeDocument, DocumentMetadata, DocumentType } from '../services/knowledge/types';

const BRAND = 'caroma';
const PDF_DIR = path.resolve(process.cwd(), '..', 'GWA', 'Technical_PDFs');
const BATCH_SIZE = 20; // Embed in batches
const DOWNLOAD_CONCURRENCY = 3;
const DOWNLOAD_DELAY_MS = 300;

// ── Step 1: Extract PDF URLs from MongoDB ──────────────────────────────
async function extractPdfUrls(): Promise<Map<string, { productTitle: string; productUrl: string }>> {
  console.log('\n═══════════════════════════════════════════');
  console.log('📋 Step 1: Extracting PDF URLs from MongoDB...');
  console.log('═══════════════════════════════════════════');

  const col = await getCollection();
  const allWithPdf = await col.find({ chunk: { $regex: /\.pdf/i } }).toArray();

  const pdfMap = new Map<string, { productTitle: string; productUrl: string }>();

  for (const doc of allWithPdf) {
    const matches = doc.chunk.match(/https?:\/\/[^\s)>\]"]+\.pdf[^\s)>\]"']*/gi);
    if (matches) {
      for (const url of matches) {
        // Clean URL — remove trailing markdown artifacts
        const cleanUrl = url.replace(/[)\]"'>]+$/, '').replace(/\\$/, '');
        if (!pdfMap.has(cleanUrl)) {
          pdfMap.set(cleanUrl, {
            productTitle: doc.title || 'Unknown Product',
            productUrl: doc.metadata?.url || doc.sourceUrl || '',
          });
        }
      }
    }
  }

  console.log(`   Found ${pdfMap.size} unique PDF URLs`);
  return pdfMap;
}

// ── Step 2: Download PDFs ──────────────────────────────────────────────
async function downloadPdf(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      console.log(`   ⚠️  HTTP ${response.status} for ${path.basename(destPath)}`);
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      console.log(`   ⚠️  Not a PDF (${contentType}) for ${path.basename(destPath)}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 100) {
      console.log(`   ⚠️  Empty/tiny file for ${path.basename(destPath)}`);
      return false;
    }

    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err: any) {
    console.log(`   ❌ Download failed: ${err.message?.substring(0, 80)} — ${path.basename(destPath)}`);
    return false;
  }
}

async function downloadAllPdfs(
  pdfMap: Map<string, { productTitle: string; productUrl: string }>
): Promise<Map<string, string>> {
  console.log('\n═══════════════════════════════════════════');
  console.log(`📥 Step 2: Downloading ${pdfMap.size} PDFs...`);
  console.log('═══════════════════════════════════════════');

  // Create output directory
  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }

  const urlToFile = new Map<string, string>();
  const entries = Array.from(pdfMap.entries());
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = entries.slice(i, i + DOWNLOAD_CONCURRENCY);

    const promises = batch.map(async ([url, meta]) => {
      // Generate safe filename from URL
      const urlPath = new URL(url).pathname;
      const originalName = decodeURIComponent(path.basename(urlPath));
      const safeName = originalName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 120);
      const destPath = path.join(PDF_DIR, safeName);

      // Skip if already downloaded
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100) {
        skipped++;
        urlToFile.set(url, destPath);
        return;
      }

      const ok = await downloadPdf(url, destPath);
      if (ok) {
        downloaded++;
        urlToFile.set(url, destPath);
      } else {
        failed++;
      }
    });

    await Promise.all(promises);

    // Progress
    const total = Math.min(i + DOWNLOAD_CONCURRENCY, entries.length);
    process.stdout.write(`\r   Progress: ${total}/${entries.length} (${downloaded} new, ${skipped} cached, ${failed} failed)`);

    // Rate limit
    if (i + DOWNLOAD_CONCURRENCY < entries.length) {
      await new Promise(resolve => setTimeout(resolve, DOWNLOAD_DELAY_MS));
    }
  }

  console.log(`\n   ✅ Downloaded: ${downloaded}, Cached: ${skipped}, Failed: ${failed}`);
  console.log(`   📁 PDFs saved to: ${PDF_DIR}`);

  return urlToFile;
}

// ── Step 3: Extract text from PDFs ─────────────────────────────────────
function extractTextFromPdf(pdfPath: string): string {
  try {
    const result = execSync(`pdftotext "${pdfPath}" -`, {
      encoding: 'utf-8',
      timeout: 15000,
      maxBuffer: 5 * 1024 * 1024,
    });

    // Clean up the text
    const cleaned = result
      .replace(/\f/g, '\n---\n')      // Form feeds → section breaks
      .replace(/\r\n/g, '\n')          // Normalize line endings
      .replace(/\n{4,}/g, '\n\n\n')    // Reduce excessive blank lines
      .trim();

    return cleaned;
  } catch (err: any) {
    console.log(`   ⚠️  pdftotext failed for ${path.basename(pdfPath)}: ${err.message?.substring(0, 60)}`);
    return '';
  }
}

interface ExtractedPdf {
  pdfUrl: string;
  filePath: string;
  productTitle: string;
  productUrl: string;
  text: string;
  textLength: number;
}

function extractAllPdfs(
  urlToFile: Map<string, string>,
  pdfMap: Map<string, { productTitle: string; productUrl: string }>
): ExtractedPdf[] {
  console.log('\n═══════════════════════════════════════════');
  console.log(`📄 Step 3: Extracting text from ${urlToFile.size} PDFs...`);
  console.log('═══════════════════════════════════════════');

  const results: ExtractedPdf[] = [];
  let textBased = 0;
  let imageBased = 0;
  let totalChars = 0;

  for (const [url, filePath] of urlToFile.entries()) {
    const meta = pdfMap.get(url)!;
    const text = extractTextFromPdf(filePath);

    if (text.length < 50) {
      imageBased++;
      continue; // Skip image-based PDFs
    }

    textBased++;
    totalChars += text.length;

    results.push({
      pdfUrl: url,
      filePath,
      productTitle: meta.productTitle,
      productUrl: meta.productUrl,
      text,
      textLength: text.length,
    });
  }

  console.log(`   ✅ Text-based PDFs (extractable): ${textBased}`);
  console.log(`   ⚠️  Image-based PDFs (skipped): ${imageBased}`);
  console.log(`   📊 Total extracted characters: ${totalChars.toLocaleString()}`);

  return results;
}

// ── Step 4: Convert to knowledge documents ─────────────────────────────
async function buildAndIngestDocuments(extracted: ExtractedPdf[]): Promise<number> {
  console.log('\n═══════════════════════════════════════════');
  console.log(`🧠 Step 4: Building knowledge documents from ${extracted.length} PDFs...`);
  console.log('═══════════════════════════════════════════');

  // Classify PDF type from filename
  function classifyPdf(filename: string): { type: DocumentType; category: string } {
    const lower = filename.toLowerCase();
    if (lower.includes('instruction') || lower.includes('install'))
      return { type: 'technical', category: 'installation' };
    if (lower.includes('template'))
      return { type: 'technical', category: 'template' };
    if (lower.includes('brochure') || lower.includes('guide'))
      return { type: 'technical', category: 'guide' };
    if (lower.includes('spare') || lower.includes('part'))
      return { type: 'technical', category: 'spare-parts' };
    if (lower.includes('warranty'))
      return { type: 'technical', category: 'warranty' };
    return { type: 'technical', category: 'general' };
  }

  // Build chunks from each PDF
  const allChunks: {
    text: string;
    title: string;
    sourceUrl: string;
    metadata: DocumentMetadata;
  }[] = [];

  for (const pdf of extracted) {
    const filename = path.basename(pdf.filePath);
    const classification = classifyPdf(filename);

    const metadata: DocumentMetadata = {
      type: classification.type,
      category: classification.category,
      brand: BRAND,
      url: pdf.pdfUrl,
    };

    // Prepend context to the text so chunks know what product they belong to
    const contextHeader = `# Technical Document: ${filename}\n` +
      `**Related Product:** ${pdf.productTitle}\n` +
      `**Source:** ${pdf.productUrl}\n\n`;

    const fullText = contextHeader + pdf.text;

    const chunks = chunkContent(fullText, filename, pdf.pdfUrl, metadata);
    for (const chunk of chunks) {
      allChunks.push({
        text: chunk.text,
        title: `${pdf.productTitle} — ${filename}`,
        sourceUrl: pdf.pdfUrl,
        metadata: chunk.metadata,
      });
    }
  }

  console.log(`   → ${allChunks.length} chunks created`);

  if (allChunks.length === 0) {
    console.log('   ⚠️  No chunks to embed');
    return 0;
  }

  // Embed in batches
  console.log(`\n   🧠 Embedding ${allChunks.length} chunks...`);
  const texts = allChunks.map(c => c.text);
  const embeddings = await embedTexts(texts);

  // Build KnowledgeDocument objects
  const now = new Date();
  const documents: KnowledgeDocument[] = allChunks.map((chunk, i) => ({
    brand: BRAND,
    sourceUrl: chunk.sourceUrl,
    title: chunk.title,
    content: chunk.text,
    chunk: chunk.text,
    chunkIndex: 0,
    metadata: chunk.metadata,
    embedding: embeddings[i],
    crawledAt: now,
    updatedAt: now,
  }));

  // Insert
  console.log(`\n   💾 Inserting ${documents.length} documents into MongoDB...`);
  const count = await insertDocuments(documents);
  console.log(`   ✅ Inserted ${count} technical documents`);

  return count;
}

// ── Show stats ───────────────────────────────────────────────────────
async function showStats(): Promise<void> {
  const stats = await getStats(BRAND);
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 Knowledge Base Stats');
  console.log('═══════════════════════════════════════════');
  console.log(`Total documents: ${stats.totalDocuments}`);
  console.log('By type:');
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`  ${type}: ${count}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const statsOnly = args.includes('--stats');

  try {
    if (statsOnly) {
      await showStats();
      return;
    }

    // Step 1: Extract PDF URLs
    const pdfMap = await extractPdfUrls();

    if (dryRun) {
      console.log('\n📋 Dry run — PDF URLs found:');
      let i = 0;
      for (const [url, meta] of pdfMap.entries()) {
        i++;
        console.log(`  ${i}. ${path.basename(new URL(url).pathname)}`);
        console.log(`     Product: ${meta.productTitle}`);
        console.log(`     URL: ${url.substring(0, 100)}`);
      }
      console.log(`\nTotal: ${pdfMap.size} PDFs would be downloaded`);
      return;
    }

    // Step 2: Download PDFs
    const urlToFile = await downloadAllPdfs(pdfMap);

    // Step 3: Extract text
    const extracted = extractAllPdfs(urlToFile, pdfMap);

    if (extracted.length === 0) {
      console.log('\n⚠️  No text-extractable PDFs found');
      return;
    }

    // Step 4: Build docs, embed, ingest
    const count = await buildAndIngestDocuments(extracted);

    console.log(`\n🎉 Phase 1 complete! Ingested ${count} technical documents from ${extracted.length} PDFs`);

    await showStats();
  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

main();
