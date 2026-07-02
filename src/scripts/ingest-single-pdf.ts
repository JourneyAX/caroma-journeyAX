import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { chunkContent } from '../services/knowledge/chunker';
import { embedTexts } from '../services/knowledge/embedder';
import { insertDocuments, closeConnection } from '../services/knowledge/mongo';
import { KnowledgeDocument, DocumentMetadata } from '../services/knowledge/types';

async function main() {
  const url = process.argv[2];
  const title = process.argv[3] || 'Liano II Sensor Soap Dispenser';
  const type = process.argv[4] || 'troubleshooting';
  
  if (!url) {
    console.error("Please provide a PDF URL");
    process.exit(1);
  }

  const filename = "Liano_II_Sensor_Troubleshooting.pdf";
  const destPath = path.join(path.resolve(process.cwd(), '..', 'GWA', 'Technical_PDFs'), filename);

  console.log(`Downloading ${url}...`);
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`Saved to ${destPath}`);

  console.log("Extracting text...");
  const text = execSync(`pdftotext "${destPath}" -`, { encoding: 'utf-8' }).trim();
  
  console.log(`Extracted ${text.length} characters. Chunking...`);
  const meta: DocumentMetadata = {
    type: type as any,
    brand: 'caroma',
    url: url
  };

  const contextHeader = `# Technical Document: ${filename}\n**Related Product:** ${title}\n**Source:** ${url}\n\n`;
  const fullText = contextHeader + text;

  const chunks = chunkContent(fullText, filename, url, meta);
  console.log(`Created ${chunks.length} chunks. Embedding...`);

  const embeddings = await embedTexts(chunks.map(c => c.text));

  const now = new Date();
  const docs: KnowledgeDocument[] = chunks.map((chunk, i) => ({
    brand: 'caroma',
    sourceUrl: chunk.sourceUrl,
    title: `${title} — ${filename}`,
    content: chunk.text,
    chunk: chunk.text,
    chunkIndex: chunk.index,
    metadata: chunk.metadata,
    embedding: embeddings[i],
    crawledAt: now,
    updatedAt: now,
  }));

  console.log("Inserting into MongoDB...");
  const count = await insertDocuments(docs);
  console.log(`Inserted ${count} documents!`);

  await closeConnection();
}

main().catch(console.error);
