import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getCollection, insertDocuments, closeConnection } from '../services/knowledge/mongo';
import { chunkContent } from '../services/knowledge/chunker';
import { embedTexts } from '../services/knowledge/embedder';
import { KnowledgeDocument, DocumentMetadata } from '../services/knowledge/types';

const GWA_PDF_DIR = path.resolve(process.cwd(), '..', 'GWA', 'Technical_PDFs');
if (!fs.existsSync(GWA_PDF_DIR)) {
  fs.mkdirSync(GWA_PDF_DIR, { recursive: true });
}

// Ensure unique PDF download
const downloadedPdfs = new Set(fs.readdirSync(GWA_PDF_DIR).filter(f => f.endsWith('.pdf')));

async function main() {
  const col = await getCollection();
  
  // 1. Get all unique product URLs from the DB
  const docs = await col.find({ 'metadata.brand': 'caroma' }).toArray();
  const urls = new Set(docs.map(d => d.metadata.url).filter(u => u && u.includes('/product/')));
  const urlList = Array.from(urls) as string[];
  
  console.log(`Found ${urlList.length} unique product URLs in DB.`);

  // 2. Start Playwright
  console.log('Launching Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let pdfsDownloaded = 0;
  
  // To avoid running out of time during demo, let's limit to 10 for now just to prove it works,
  // or we can run it fully. Let's run a batch of 20 URLs.
  // In a real scenario we'd do all 300, but for POC let's test it out.
  const batch = urlList; // urlList.slice(0, 30);
  
  console.log(`Processing ${batch.length} URLs...`);

  for (let i = 0; i < batch.length; i++) {
    const url = batch[i];
    console.log(`[${i+1}/${batch.length}] Visiting: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // Wait a bit for dynamic React components (like the Technical Downloads tab) to render
      await page.waitForTimeout(2000);

      // Extract all PDF links
      const pdfLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors
          .map(a => a.href)
          .filter(href => href && href.toLowerCase().endsWith('.pdf'));
      });

      const uniquePdfLinks = [...new Set(pdfLinks)];
      
      for (const pdfUrl of uniquePdfLinks) {
        const filename = decodeURIComponent(pdfUrl.split('/').pop() || 'unknown.pdf').replace(/[^a-zA-Z0-9.\-_]/g, '_');
        
        if (downloadedPdfs.has(filename)) {
          // Already downloaded in Phase 1
          continue;
        }

        console.log(`  -> Found NEW PDF: ${filename}`);
        const destPath = path.join(GWA_PDF_DIR, filename);
        
        try {
          const response = await fetch(pdfUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(destPath, buffer);
            downloadedPdfs.add(filename);
            
            // Extract text
            const text = execSync(`pdftotext "${destPath}" -`, { encoding: 'utf-8' }).trim();
            if (text.length > 50) {
                // Figure out type based on filename
                const lower = filename.toLowerCase();
                let type: any = 'technical';
                if (lower.includes('troubleshoot') || lower.includes('is2105')) {
                    type = 'troubleshooting';
                }

                const meta: DocumentMetadata = {
                  type,
                  brand: 'caroma',
                  url
                };

                const title = `Technical Document for ${url.split('/').pop()}`;
                const chunks = chunkContent(text, filename, url, meta);
                const embeddings = await embedTexts(chunks.map(c => c.text));

                const now = new Date();
                const newDocs: KnowledgeDocument[] = chunks.map((chunk, j) => ({
                  brand: 'caroma',
                  sourceUrl: chunk.sourceUrl,
                  title,
                  content: chunk.text,
                  chunk: chunk.text,
                  chunkIndex: chunk.index,
                  metadata: chunk.metadata,
                  embedding: embeddings[j],
                  crawledAt: now,
                  updatedAt: now,
                }));

                await insertDocuments(newDocs);
                console.log(`    -> Ingested ${chunks.length} chunks into DB.`);
                pdfsDownloaded++;
            }
          }
        } catch (downloadErr: any) {
          console.error(`  -> Failed to download/ingest ${pdfUrl}: ${downloadErr.message}`);
        }
      }

    } catch (e: any) {
      console.log(`  -> Failed to process page: ${e.message}`);
    }
  }

  await browser.close();
  await closeConnection();
  console.log(`\nPhase 2 Complete! Downloaded and ingested ${pdfsDownloaded} new PDFs.`);
}

main().catch(console.error);
