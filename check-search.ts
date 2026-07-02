import { MongoClient } from 'mongodb';
async function check() {
  const uri = process.env.MONGODB_URI!;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('journeyx');
  const col = db.collection('documents');

  // Find a document that mentions Liano
  const liano = await col.findOne({ chunk: { $regex: /liano/i }, "metadata.type": "product" });
  if (liano) {
    console.log('=== LIANO PRODUCT ===');
    console.log('Title:', liano.title);
    console.log('Metadata:', JSON.stringify(liano.metadata));
    console.log('Chunk (first 500):', liano.chunk?.slice(0, 500));
  }
  
  // Find one with "shower" in the chunk
  const shower = await col.findOne({ chunk: { $regex: /shower.*mixer/i }, "metadata.type": "product" });
  if (shower) {
    console.log('\n=== SHOWER PRODUCT ===');
    console.log('Title:', shower.title);
    console.log('Metadata:', JSON.stringify(shower.metadata));
    console.log('Chunk (first 500):', shower.chunk?.slice(0, 500));
  }
  
  // Search for a troubleshooting doc
  const troubleshoot = await col.findOne({ chunk: { $regex: /leak/i }, "metadata.type": "troubleshooting" });
  if (troubleshoot) {
    console.log('\n=== TROUBLESHOOTING ===');
    console.log('Title:', troubleshoot.title);
    console.log('Chunk (first 300):', troubleshoot.chunk?.slice(0, 300));
  }
  
  await client.close();
}
check().catch(e => console.error('❌', e.message));
