# Cloudflare Workers Static Assets

## Scope and architecture

This repository remains an Astro static site. Pages, RSS, sitemap, and PNG OGP
images are generated on the build host using Node.js 24. `node:fs`, Satori, and
native `@resvg/resvg-js` run at build time; they do not need a Workers runtime
adapter or `nodejs_compat`. No Worker `main`, bindings, backend, SSR adapter,
account ID, or credentials are configured in this repository. The production
custom domains are attached to the `maguro-dev` Worker in the Cloudflare
dashboard, not in `wrangler.jsonc`.

`npm run build` still writes `dist/` with the source `_redirects` syntax; it is
used by `npm run preview` and the Playwright visual tests, not by production.
Cloudflare has a separate output directory so neither build leaves its artifact
in the other's redirect format.

`archive.maguro.dev` is a **separate Zola repository and deployment**, as described
in `RENOVATION_SPEC.md`. Keep its noindex behavior intact. The redirect tests
assert archive destinations without following them; a passing local suite does
not establish archive availability.

## Local commands

```console
npm ci
npm run check:cloudflare
npm run preview:cloudflare
```

- `build:cloudflare`: generate the redirects, build Astro into
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
Keep both lockfiles synchronized when changing Wrangler or any other dependency,
following the README's npm/Deno steps.

## Workers Builds

The GitHub repository is connected to the `maguro-dev` Worker through Workers
Builds. A push to `main` builds and deploys production; a push to any other branch
publishes a branch preview and comments its URL on the pull request. The build
settings live in the Cloudflare dashboard:

- Root directory: the repository root.
- Environment: `NODE_VERSION=24` and `SKIP_DEPENDENCY_INSTALL=1`.
- Build command: `npm ci && npm run check:cloudflare`.
- Deploy command: `npx wrangler deploy`; non-production branches use
  `npx wrangler preview`.

The Worker name in the dashboard must match `wrangler.jsonc`. See
[build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
and [build-image overrides](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).

## Automatic branch previews

Workers Builds uses `npx wrangler preview` for branch previews. Wrangler requires
a [`previews` block](https://developers.cloudflare.com/workers/previews/configuration/#wrangler-configuration-file)
even for a static site, so `wrangler.jsonc` includes `"previews": {}`. Static assets
and compatibility settings remain at the top level and apply to the preview.
The build uploads the branch's generated `dist-cloudflare/`, including `/resume.pdf`.

`npm run preview:cloudflare` remains a local emulator command. `npx wrangler preview`
publishes a remote branch preview; `npx wrangler deploy` publishes production and
must not replace the branch preview command.

## Routing contract

The [Workers redirects format](https://developers.cloudflare.com/workers/static-assets/redirects/)
uses numeric status codes. The redirect sources are written in Netlify's syntax,
which the generator has always emitted. The post-build step turns its `301!` into `301`
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

## Rollback

If a release is faulty, return to the last known-good Worker version using
[Cloudflare rollback](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
and recheck production URLs, then revert the faulty commit on `main` so the next
deploy does not reintroduce it.
