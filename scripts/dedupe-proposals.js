const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGO_DB_URI;
  const dbName = process.env.APP_DB_NAME || process.env.AUTH_DB_NAME;
  if (!uri || !dbName) {
    console.error('Missing MONGO_DB_URI or APP_DB_NAME/AUTH_DB_NAME in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const proposals = db.collection('proposals');

    console.log('Scanning proposals for duplicates (group by task_id + freelancer_id)...');

    const pipeline = [
      {
        $group: {
          _id: { task_id: '$task_id', freelancer_id: '$freelancer_id' },
          docs: { $push: { _id: '$_id', createdAt: '$createdAt', submitted_at: '$submitted_at' } },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ];

    const cursor = proposals.aggregate(pipeline, { allowDiskUse: true });
    let totalRemoved = 0;
    while (await cursor.hasNext()) {
      const group = await cursor.next();
      const docs = group.docs
        .map((d) => ({
          _id: d._id,
          ts: d.createdAt ? new Date(d.createdAt) : d.submitted_at ? new Date(d.submitted_at) : new Date(0),
        }))
        .sort((a, b) => b.ts - a.ts); // keep most recent

      const toKeep = docs[0]._id;
      const toRemove = docs.slice(1).map((d) => d._id);

      if (toRemove.length) {
        const res = await proposals.deleteMany({ _id: { $in: toRemove } });
        console.log(`Removed ${res.deletedCount} duplicates for task_id=${group._id.task_id} freelancer_id=${group._id.freelancer_id}`);
        totalRemoved += res.deletedCount;
      }
    }

    console.log('Dedupe complete. Total removed:', totalRemoved);
  } catch (err) {
    console.error('Dedupe failed:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();
