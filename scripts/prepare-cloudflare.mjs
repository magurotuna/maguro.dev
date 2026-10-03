/** Prepare only the Cloudflare artifact; keep public/ and dist/ Netlify-compatible. */
import { readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Workers applies redirects before assets, so Netlify's force marker is redundant.
// Fail closed if future rules use Netlify-specific conditions or unsupported codes.
export function cloudflareRedirects(input) {
  const exact = [];
  const dynamic = [];
  const seen = new Map();
  for (const [index, raw] of input.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const fields = line.split(/\s+/);
    const [source, destination, status] = fields;
    if (
      fields.length !== 3 ||
      !source.startsWith("/") ||
      source.startsWith("//") ||
      /[?#]/.test(source) ||
      !/^(?:\/(?!\/)|https?:\/\/)/.test(destination) ||
      !/^(301|302|303|307|308)!?$/.test(status) ||
      (source.match(/\*/g) || []).length > 1
    ) {
      throw new Error(
        `Unsupported or duplicate redirect on line ${index + 1}: ${line}`,
      );
    }
    const normalized = `${source}  ${destination}  ${status.replace(/!$/, "")}`;
    if (seen.has(source)) {
      if (seen.get(source) === normalized) continue;
      throw new Error(`Conflicting redirect on line ${index + 1}: ${line}`);
    }
    seen.set(source, normalized);
    if (normalized.length > 1000) {
      throw new Error(`Redirect on line ${index + 1} exceeds 1000 characters`);
    }
    const rules = /\*|:[A-Za-z]\w*/.test(source) ? dynamic : exact;
    rules.push(normalized);
  }
  if (exact.length > 2000 || dynamic.length > 100) {
    throw new Error(
      `Cloudflare redirect limits exceeded: ${exact.length}/2000 static, ${dynamic.length}/100 dynamic`,
    );
  }
  // Cloudflare requires exact rules before dynamic rules. Order within each group
  // is stable; runtime tests check all current legacy paths and splats.
  return [
    "# Generated for Cloudflare Workers Static Assets. Do not edit.",
    `# ${exact.length} static rules; ${dynamic.length} dynamic rules`,
    ...exact,
    ...dynamic,
    "",
  ].join("\n");
}

export function prepareCloudflare(directory) {
  // Require the real Astro 404 page, rather than accidentally deploying an SPA fallback.
  if (!statSync(resolve(directory, "404.html")).isFile()) {
    throw new Error("Missing Astro 404.html in the Cloudflare build");
  }
  const redirects = cloudflareRedirects(
    readFileSync(resolve(directory, "_redirects"), "utf8"),
  );
  writeFileSync(resolve(directory, "_redirects"), redirects);
  // This is generator source, not a public asset. Leave public/_redirects.static alone.
  rmSync(resolve(directory, "_redirects.static"), { force: true });
  console.log(`Prepared Cloudflare assets in ${directory}`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  prepareCloudflare(
    fileURLToPath(new URL("../dist-cloudflare/", import.meta.url)),
  );
}
