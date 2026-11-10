# EngIntern

Map-first engineering internship search for the 48 contiguous United States. Pick a state, browse cities alphabetically, and apply through the employer.

## Run locally

Requires Node.js 22 or newer. No package installation needed.

```sh
npm run build
npm run dev
```

Open http://localhost:4173. Run `npm test` for inventory and parser checks. Refresh the dated seed snapshot with `node seed.mjs`, then rebuild and restart.

## Features

Interactive state map, alphabetical cities, engineering field and term filters, official employer descriptions and application links, browser-local saved roles and application tracking. PDF, DOCX and TXT resume matching finds exact shared skills; an AI service is not connected. Personal files and notes remain in the browser. The app does not submit applications automatically.

## Data

Public employer career feeds are configured in sources.mjs and energy.mjs. This is a growing collection, not every job board. Employers control availability; a permanent inventory minimum cannot be guaranteed. There is no inventory cap. Each refresh deduplicates equivalent source records. The included seed is a dated snapshot, not a live guarantee.

## Hosting

The build produces a Cloudflare Worker module at dist/server/index.js. Bind an R2 bucket as BUCKET for persistent catalog updates. GET /api/jobs reads the catalog; POST /api/refresh updates it. The existing hosted deployment uses an access layer to authorize updates. Add appropriate authorization and rate limits before exposing the writer elsewhere. The included GitHub Actions workflow crawls public Internships.com engineering, specialization, and linked location pages daily at 10:30 UTC, commits the catalog, and refreshes the live site. It can also be run manually. GitHub scheduled jobs can be delayed or disabled after prolonged repository inactivity. Existing connected employer feeds have a separate daily site schedule. Production hosting identifiers and credentials are omitted.

## Third-party assets

Bundled assets include D3, topojson-client, us-atlas, Mammoth and PDF.js. Preserve embedded notices and follow their respective upstream licenses. Fonts are served by Google Fonts. Internship descriptions belong to their employers. EngIntern is independent and not affiliated with Southern University or the employers listed.

## Internships.com coverage

Imports include publicly visible listing metadata, source URLs, pay when listed, and published deadlines. Full descriptions and applications remain on the source site. The importer follows each page the publisher exposes, including specialization and location pages, but public browse windows do not necessarily expose the entire advertised inventory. Expired flags and deadlines, older cohorts, and non-contiguous or unresolved locations are excluded. Successful snapshots replace previous imports; failed crawls keep the last good data for at most seven days. Known deadlines are filtered on every API read. Filled roles disappear when the source removes or marks them closed. There is no promise of instantaneous employer status. Internships.com shared-skill matching uses titles only.

U.S. populated-place names are derived from [GeoNames](https://www.geonames.org/), downloaded November 9, 2026, and normalized for city/state validation. GeoNames data is available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The derived us-place-names.json includes normalized name variants, not coordinates. Unresolved cities are excluded rather than guessed.
