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

Public employer career feeds are configured in sources.mjs and energy.mjs. This is a growing collection, not every job board. Employers control availability; a permanent inventory minimum cannot be guaranteed. Each refresh checks a 100-distinct-posting target, deduplicating city copies. The included seed is a dated snapshot, not a live guarantee.

## Hosting

The build produces a Cloudflare Worker module at dist/server/index.js. Bind an R2 bucket as BUCKET for persistent catalog updates. GET /api/jobs reads the catalog; POST /api/refresh updates it. The existing hosted deployment uses an access layer to authorize updates. Add appropriate authorization and rate limits before exposing the writer elsewhere. An external scheduler must call the refresh endpoint for unattended daily updates; cloning does not install a scheduler. Production hosting identifiers and credentials are omitted.

## Third-party assets

Bundled assets include D3, topojson-client, us-atlas, Mammoth and PDF.js. Preserve embedded notices and follow their respective upstream licenses. Fonts are served by Google Fonts. Internship descriptions belong to their employers. EngIntern is independent and not affiliated with Southern University or the employers listed.
