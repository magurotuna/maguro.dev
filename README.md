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

`package.json` is retained because Astro and its integrations are distributed
as npm packages. Netlify continues to use the Node.js build configured in
`netlify.toml`; the same scripts remain compatible with both runtimes.
