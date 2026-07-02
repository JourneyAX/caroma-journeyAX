import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: '.env.local' });

async function check() {
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db('journeyx');
    const col = db.collection('documents');
    
    const docs = await col.find({ 
        $or: [
            { "chunk": { $regex: /soap dispenser/i } },
            { "title": { $regex: /dispenser/i } }
        ]
    }).toArray();
    
    console.log(`Found ${docs.length} docs mentioning soap dispenser.`);
    if (docs.length > 0) {
        // Log unique URLs
        const urls = new Set(docs.map(d => d.metadata?.url || d.sourceUrl));
        console.log("URLs:");
        urls.forEach(u => console.log(u));
    }
    await client.close();
}
check().catch(console.error);
