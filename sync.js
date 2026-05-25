import { algoliasearch } from 'algoliasearch';

const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME;
const SITE_URL = process.env.SITE_URL || 'https://www.jeffwinterinsights.com';

async function run() {
  if (!APP_ID || !ADMIN_API_KEY || !INDEX_NAME) {
    throw new Error('Missing ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, or ALGOLIA_INDEX_NAME');
  }

  const response = await fetch(`${SITE_URL}/insights?format=json-pretty`);
  if (!response.ok) {
    throw new Error(`Squarespace fetch failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const items = data?.items || [];

  const records = items.map((item) => {
    const fullUrl = item.fullUrl || '';
    const path = fullUrl.startsWith('/') ? fullUrl : `/${fullUrl}`;

    return {
      objectID: path,
      url: path,
      title: item.title || '',
      excerpt: item.excerpt || '',
      image: item.assetUrl || '',
      tags: item.tags || [],
      categories: item.categories || [],
      publishDate: item.publishOn || item.addedOn || null
    };
  }).filter((record) => record.objectID && record.title);

  const client = algoliasearch(APP_ID, ADMIN_API_KEY);

  await client.saveObjects({
    indexName: INDEX_NAME,
    objects: records
  });

  console.log(`Synced ${records.length} records to ${INDEX_NAME}`);
}

run().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
