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
