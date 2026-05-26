import { algoliasearch } from 'algoliasearch';

const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME;
const SITE_URL = process.env.SITE_URL || 'https://www.jeffwinterinsights.com';

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeUrl(input) {
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input;
  if (input.startsWith('//')) return `https:${input}`;
  if (input.startsWith('/')) return new URL(input, SITE_URL).toString();
  return new URL(`/${input}`, SITE_URL).toString();
}

function decodeEntities(str = '') {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(html = '') {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

function trimToBytes(str = '', maxBytes = 6000) {
  let out = '';
  for (const char of str) {
    const next = out + char;
    if (Buffer.byteLength(next, 'utf8') > maxBytes) break;
    out = next;
  }
  return out.trim();
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(v => String(v).trim()).filter(Boolean))];
}

function cleanExcerpt(item) {
  const raw = item.excerpt || item.seoDescription || item.description || '';
  return trimToBytes(stripHtml(raw), 600);
}

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

function findImageUrl(item) {
  const candidates = [
    getNested(item, 'assetUrl'),
    getNested(item, 'mainImage.assetUrl'),
    getNested(item, 'mainImage.url'),
    getNested(item, 'mainImage.originalUrl'),
    getNested(item, 'image.assetUrl'),
    getNested(item, 'image.url'),
    getNested(item, 'thumbnail.assetUrl'),
    getNested(item, 'thumbnail.url'),
    getNested(item, 'coverImage.assetUrl'),
    getNested(item, 'coverImage.url'),
    getNested(item, 'bodyAssetUrl'),
  ];

  for (const value of candidates) {
    const url = firstString(value);
    if (url) return normalizeUrl(url);
  }

  const html = firstString(item.bodyHtml, item.body, item.content);
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match?.[1]) return normalizeUrl(match[1]);

  return '';
}

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
    const contentHtml = firstString(item.bodyHtml, item.body, item.content);
    const content = trimToBytes(stripHtml(contentHtml), 6000);
    const image = findImageUrl(item);

    return {
      objectID: path,
      url: path,
      title: item.title || '',
      slug: item.urlId || '',
      excerpt: cleanExcerpt(item),
      content,
      image,
      tags: normalizeArray(item.tags),
      categories: normalizeArray(item.categories),
      publishDate: item.publishOn || item.addedOn || null,
    };
  }).filter((record) => record.objectID && record.title);

  const client = algoliasearch(APP_ID, ADMIN_API_KEY);

  await client.saveObjects({
    indexName: INDEX_NAME,
    objects: records,
  });

  console.log(`Synced ${records.length} records to ${INDEX_NAME}`);
}

run().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
