# Algolia Squarespace Sync

A small Node.js script that copies the blog posts from a Squarespace site (jeffwinterinsights.com) into an Algolia search index every week, so the site can search and suggest related posts from an index that stays up to date on its own.

<!-- Placeholder: add a link or screenshot of the page that uses this index here -->

## How it works

- Reads the posts in the site's `/insights` collection from Squarespace's built-in JSON feed.
- Turns each post into a clean record: title, link, slug, excerpt, plain-text content (HTML stripped and trimmed to fit Algolia's size limits), main image, tags, categories and publish date.
- Uses the post's URL path as the record ID, so running it again updates existing posts instead of creating duplicates.
- Sends the records to Algolia in one batch with the official `algoliasearch` client.
- A GitHub Actions workflow runs the sync every Monday at 07:20 UTC, and it can also be started by hand.

## Tech

- JavaScript (Node.js 20, ES modules)
- Algolia (`algoliasearch` v5)
- Squarespace JSON feed
- GitHub Actions, with API keys stored as repository secrets

## Run it locally

You need an Algolia app and an admin API key.

```bash
npm install
ALGOLIA_APP_ID=... ALGOLIA_ADMIN_API_KEY=... ALGOLIA_INDEX_NAME=... npm run sync
```

`SITE_URL` is optional and defaults to `https://www.jeffwinterinsights.com`.

---

Ahmed Amine Tiffrent · [Portfolio](https://www.aminetiffrent.com/portfolio)
