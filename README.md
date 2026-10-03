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
