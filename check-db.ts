import { MongoClient } from 'mongodb';
async function check() {
  const uri = process.env.MONGODB_URI!;
  const client = new MongoClient(uri);
  await client.connect();
  console.log('✅ Connected!');
  const db = client.db('journeyx');
  const count = await db.collection('documents').countDocuments();
  console.log('Total documents:', count);
  const types = await db.collection('documents').aggregate([
    { $group: { _id: "$metadata.type", count: { $sum: 1 } } }
  ]).toArray();
  console.log('By type:', JSON.stringify(types));
  const sample = await db.collection('documents').findOne({});
  console.log('Sample title:', sample?.title);
  console.log('Has embedding:', !!sample?.embedding);
  await client.close();
}
check().catch(e => console.error('❌ FAILED:', e.message));
