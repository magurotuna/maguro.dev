[![Netlify Status](https://api.netlify.com/api/v1/badges/c01b769a-84f1-4b9b-b0aa-2fe791ab8d30/deploy-status)](https://app.netlify.com/sites/blissful-ardinghelli-dcdc9a/deploys)

# maguro.dev

## Development

Enter the Nix development environment and install the npm dependencies with
Deno:

```console
direnv allow
deno install
```

Run the tasks declared in `package.json` through Deno:

```console
deno task dev
deno task build
deno task format:check
```

`package.json` is the source of truth for dependencies and tasks. Deno supports
it directly, so this project does not need a `deno.json` file.

## Résumé PDF

Edit `resume/resume.typ` to update the résumé linked from About at `/resume.pdf`.
Every Astro build compiles it into the selected output directory after Astro
finishes: `dist/resume.pdf` for `npm run build` (including Netlify), or
`dist-cloudflare/resume.pdf` for `npm run build:cloudflare`. These generated files
are ignored. The existing tracked `resume/resume.pdf` is a historical snapshot;
site builds do not copy it or use it as a fallback, and it does not need updating.

The build downloads the official [Typst 0.15.1 CLI](https://github.com/typst/typst/releases/tag/v0.15.1)
for macOS or Linux (arm64/x64), verifies its pinned SHA256, and caches the archive
under `node_modules/.cache/typst/`. It requires `tar` with xz support and network
access to GitHub on the first build. Cached archives are checked on every build.
Only Typst's embedded fonts are used, including Libertinus Serif. PDF creation
time uses `SOURCE_DATE_EPOCH` when set, or the Unix epoch for reproducible builds
independent of checkout time and Git history depth. Download, checksum, or compile
errors fail the build and leave no output PDF.

Use `npm run build && npm run preview` to preview the PDF locally; `astro dev`
does not generate it. `npm run test:resume` checks regeneration and failure handling.
`npm run check:cloudflare` also checks the About link and PDF bytes/content type
in the local Workers runtime. No hosting build-command changes are required.

## Dependency updates

This project keeps two lockfiles because local development and Netlify use
different package managers:

- `deno.lock` is used by Deno locally.
- `package-lock.json` is used by npm on Netlify.

Use npm to change `package.json` and `package-lock.json`, then update
`deno.lock` from the resulting manifest:

```console
npm install <package>
deno install
```

For removals, follow the same order:

```console
npm uninstall <package>
deno install
```

Commit `package.json`, `package-lock.json`, and `deno.lock` together whenever a
dependency changes. Use `deno ci` for a clean, lockfile-strict local install.

Netlify continues to use the Node.js build configured in `netlify.toml`; the
same `package.json` scripts remain compatible with both runtimes.

## Cloudflare migration (parallel with Netlify)

The optional Cloudflare target uses Workers Static Assets. It has no SSR adapter
or request-time Worker code. Netlify's existing build and deployment stay in place.
Use Node.js 24 for the Cloudflare tooling:

```console
npm ci
npm run check:cloudflare
npm run preview:cloudflare
```

Cloudflare output goes to `dist-cloudflare/`; Netlify continues to use `dist/`.
`preview:cloudflare` rebuilds and starts a local Workers emulator, not a remote
preview. `deploy:cloudflare` rebuilds and **publishes to Cloudflare**; run it only
when a deployment is intended and the target account has been verified.

See [Cloudflare setup, cutover, and rollback](docs/cloudflare-migration.md) before
connecting an account, deploying, or changing DNS.

## PR screenshots

PR builds upload before/after screenshots as Actions artifacts. A separate trusted
workflow publishes inline images to a public image repository. See
[screenshot publishing setup and limits](docs/visual-screenshots.md).
