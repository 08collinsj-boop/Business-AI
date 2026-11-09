# Colzo public website search audit - 23 October 2026

Source: `colzo-site-production` at `129fdf453c21c9676399ca5b7a9a48d0f64b3abe`.
Scope: public website only, on an isolated review branch. No Production release, account changes, customer data, schema changes or paid tools.

## Evidence and changes

- Live homepage, robots.txt, sitemap.xml, `/ai-marketing-small-business/` and `/customer-enquiry-management/` returned HTTP 200 during the audit.
- All 15 source HTML pages already contain static text and canonical URLs. Titles are unique. Local internal links and fragments resolve, including legal documents. A server-rendering framework migration is unnecessary for these static pages.
- Sitemap omitted the two public pages above. Added both canonical URLs without inventing modification dates.
- Homepage title was only a brand slogan. Updated title and Open Graph title to describe web enquiries and follow-ups for small businesses. Added factual WebSite JSON-LD matching the visible product description, without review counts, ratings, prices or availability claims.
- Public-site Preview output previously retained indexable HTML and production robots rules. Preview builds now remove existing robots meta directives and add `noindex, nofollow` to every emitted HTML file, including aliases, legacy pages and legal pages. Preview robots.txt disallows crawling. Production rules and HTML remain unchanged except for the source metadata improvements. This is indexing hygiene, not access control; authentication remains necessary for private information.
- Existing llms.txt retained. No broad crawler permission or security changes.

## Official guidance

Google says its existing SEO fundamentals apply to AI search features. There is no special AI schema or extra machine-readable file requirement. Structured data must match visible content.
https://developers.google.com/search/docs/appearance/ai-features

Google explicitly says llms.txt does not improve Google Search visibility or ranking.
https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

## Remaining work

- Merge/release this isolated PR only after reviewing the public-site Preview. The target branch serves the live website, so this task does not merge it automatically.
- After release, verify the final public responses and submit the sitemap in the existing Search Console property. Property ownership and current indexing coverage were not verified in this task. No DNS or account verification changes made.
- Run Lighthouse/PageSpeed against the public-site Preview and final production URL; no performance score is claimed here.
- Legacy supporting pages still show some Business AI branding. This needs a separate content/design pass; no new comparison articles or competitor claims were fabricated.
- Organic visibility and pilot acquisition require useful content and distribution; indexing/rankings are not guaranteed by these fixes.

## Verification

Regression checks demonstrated failures before the fixes for omitted sitemap entries, homepage metadata and Preview indexing. Focused suite: 8 passed, 0 failed, including production/Preview builds with and without an app Preview URL, source link integrity, and owner-app fail-closed build behavior. Full `npm run verify` passed: 1,219 tests, 0 failures/skips; app build passed; static verification checked 320 JavaScript files.
