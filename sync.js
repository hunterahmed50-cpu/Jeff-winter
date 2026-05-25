import { algoliasearch } from 'algoliasearch';

const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME;
const SITE_URL = process.env.SITE_URL || 'https://www.jeffwinterinsights.com';

async function run() {
  const url = `${SITE_URL}/insights?format=json-pretty`;
  const response = await fetch(url);
  const data = await response.json();

  const items = data?.items || [];

  const records = items.map((item) => {
    const path = item.fullUrl?.startsWith('/')
      ? item.fullUrl
      : `/${item.fullUrl || ''}`;

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
  }).filter(record => record.objectID && record.title);

  const client = algoliasearch(APP_ID, ADMIN_API_KEY);
  const index = client.initIndex(INDEX_NAME);

  await index.saveObjects(records);
  console.log(`Synced ${records.length} records to ${INDEX_NAME}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
