# Cloudflare Workers Static Assets migration

## Scope and architecture

This repository remains an Astro static site. Pages, RSS, sitemap, and PNG OGP
images are generated on the build host using Node.js 24. `node:fs`, Satori, and
native `@resvg/resvg-js` run at build time; they do not need a Workers runtime
adapter or `nodejs_compat`. No Worker `main`, bindings, backend, SSR adapter,
account ID, credentials, or production domain routes are configured.

`netlify.toml`, `npm run build`, and the Netlify preview/production workflow remain
unchanged. Cloudflare has a separate output directory so either target can be
built without leaving the other target's artifact in the wrong redirect format.

`archive.maguro.dev` is a **separate Zola repository and deployment**, as described
in `RENOVATION_SPEC.md`. It is outside this migration. Keep its DNS, hosting, and
noindex behavior intact. The redirect tests assert archive destinations without
following them; a passing local suite does not establish archive availability.

## Local commands

```console
npm ci
npm run check:cloudflare
npm run preview:cloudflare
```

- `build:cloudflare`: generate the existing Netlify redirects, build Astro into
  `dist-cloudflare/` (including the résumé PDF), then adapt only that artifact for
  Cloudflare. The shared Astro post-build hook compiles `resume/resume.typ` with
  the pinned Typst CLI; see the [résumé build notes](../README.md#résumé-pdf).
- `test:cloudflare:unit`: test normalization, validation, limits, and preparation.
- `test:cloudflare:routing`: test the already-built artifact in Wrangler's local
  Workers runtime; requires local process/socket support. Does not deploy.
- `check:cloudflare`: fresh build plus résumé generation, preparation, and routing
  tests; CI runs this command.
- `preview:cloudflare`: fresh build plus `wrangler dev --local`. The printed URL
  is local to the machine running the command.
- `deploy:cloudflare`: fresh build plus `wrangler deploy`. This publishes a new
  deployment; do not use it for a local check.

For a local packaging check without publication:

```console
npm run build:cloudflare
npx wrangler deploy --dry-run
```

The Cloudflare build invokes the existing generator through `node --import tsx`,
which avoids the extra IPC server used by the `tsx` CLI in restricted containers.
The original Netlify command is unchanged. Keep both lockfiles synchronized when
changing Wrangler or any other dependency, following the README's npm/Deno steps.

## Routing contract

The [Workers redirects format](https://developers.cloudflare.com/workers/static-assets/redirects/)
uses numeric status codes. The post-build step turns Netlify's `301!` into `301`
because Workers already applies redirects ahead of matching assets. It places
exact rules before dynamic rules, keeps each group's order, and collapses only
identical duplicates. Conflicting or unsupported rules fail the build.

The current inventory is 178 unique exact and 71 dynamic rules, below the 2,000
and 100 limits. Future additions are validated against these limits and the
1,000-character per-rule limit. `public/_redirects.static` and generated
`public/_redirects` retain their Netlify syntax. The copied `_redirects.static`
source is removed only from the Cloudflare output.

[`auto-trailing-slash`](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
serves Astro's directory pages with a slash and leaves file endpoints such as
`/rss.xml` and `/og/example.png` as files. Do not change Astro's
`trailingSlash: "ignore"`: Astro 7 needs it to prerender dynamic PNG endpoints.
Noncanonical HTML requests receive the platform's 307 normalization redirect;
legacy migration rules remain 301. Tests cover both, query preservation, nested
asset splats, Japanese tag destinations, and every current legacy rule.

[`not_found_handling: "404-page"`](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
serves Astro's generated `404.html` with status 404. There is no SPA fallback.

## Hosted parallel validation (requires separate approval)

1. Confirm the Cloudflare account, available Worker name (`maguro-dev` in the
   config), billing plan, and deployment credentials. Do not put credentials in
   the repository. Authenticate or connect the GitHub repository only with the
   owner's approval.
2. Deploy first to the Worker's `workers.dev` hostname without adding production
   domains. Confirm the exact hostname from Cloudflare; do not guess it.
3. If using Workers Builds, set root directory to the repository root,
   `NODE_VERSION=24`, and `SKIP_DEPENDENCY_INSTALL=1`. Use build command
   `npm ci && npm run check:cloudflare` and deploy command `npx wrangler deploy`.
   The Worker name in the dashboard must match `wrangler.jsonc`. Choose the
   intended branch explicitly. These are future settings, not configured here.
   See [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
   and [build-image overrides](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).
4. Check home/about/blog/tags, Japanese URLs, mobile rendering, RSS, both sitemap
   files, all OGP images, and a nonexistent nested path. Compare redirect status,
   Location, query strings, and nested legacy assets with Netlify. Follow archive
   redirects separately and verify the archive still serves the expected content
   and noindex policy. Inspect canonical/OG URLs: they intentionally remain
   `https://maguro.dev`, including on parallel deployments.
5. Check preview indexing/access settings before sharing the parallel hostname.
   No blanket noindex header is built into the production artifact.

## Cutover checklist (requires separate approval)

- Record the working Netlify deployment, current DNS records/TTL, zone provider,
  redirects, TLS settings, and the tested Cloudflare commit/version. Keep Netlify
  deploys and the site's custom-domain configuration available for rollback.
- If Cloudflare is not already authoritative DNS, plan the zone migration
  separately and preserve all records, including mail and the archive subdomain.
- Decide apex and `www` behavior explicitly. No hostname changes are in this
  patch. [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
  require an active Cloudflare zone and can create DNS/certificates. An existing
  CNAME on the target hostname must be resolved during the approved cutover.
- Add only the approved production hostname(s), with the intended `www` redirect
  configured separately if needed. Verify TLS and DNS propagation, then repeat
  the hosted routing/content checks against production.
- Monitor 404s, redirects, asset loading, RSS/sitemap retrieval, and archive reachability.
  Retain the known-good Netlify deployment until the owner agrees to retire it.

## Rollback

If a Cloudflare release is faulty but DNS is correct, return to the recorded
known-good Worker version using [Cloudflare rollback](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
and recheck production URLs.

For a hosting rollback, remove the production Worker custom-domain mapping or
route as appropriate, restore the exact saved Netlify DNS records and domain
routing, and verify TLS, redirects, and content after caches/TTL settle. Rebuild
Netlify with `npm run build`, never upload `dist-cloudflare/` to Netlify. Do not
change `archive.maguro.dev` as part of either rollback. DNS, deployments, domain
associations, and account actions require approval; this patch performs none.
