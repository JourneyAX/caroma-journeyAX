import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getCollection, closeConnection } from '../services/knowledge/mongo';
import { loadMdFiles } from '../services/knowledge/md-loader';
import { chunkContent } from '../services/knowledge/chunker';
import { embedTexts } from '../services/knowledge/embedder';
import { insertDocuments } from '../services/knowledge/mongo';
import { KnowledgeDocument, DocumentMetadata } from '../services/knowledge/types';

async function main() {
  const col = await getCollection();
  
  // 1. Delete old troubleshooting documents
  const delResult = await col.deleteMany({ "metadata.type": "troubleshooting" });
  console.log(`Deleted ${delResult.deletedCount} old troubleshooting docs`);

  // 2. Load MD files (only troubleshooting for now)
  const allMd = loadMdFiles(path.resolve(process.cwd(), '..', 'GWA'));
  const tbPages = allMd.filter(p => p.url.includes('Troubleshooting'));
  console.log(`Found ${tbPages.length} troubleshooting MD files`);

  // 3. Chunk and embed
  const allChunks = [];
  for (const page of tbPages) {
    const meta: DocumentMetadata = {
        type: 'troubleshooting',
        brand: 'caroma',
        url: page.url
    };
    const chunks = chunkContent(page.markdown, page.title, page.url, meta);
    for (const c of chunks) {
        allChunks.push(c);
    }
  }

  console.log(`Created ${allChunks.length} chunks`);
  
  const texts = allChunks.map(c => c.text);
  const embeddings = await embedTexts(texts);
  
  const now = new Date();
  const docs: KnowledgeDocument[] = allChunks.map((chunk, i) => ({
      brand: 'caroma',
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

  const inserted = await insertDocuments(docs);
  console.log(`Inserted ${inserted} new troubleshooting documents`);
  
  await closeConnection();
}

main().catch(console.error);
