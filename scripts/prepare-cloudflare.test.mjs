import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { unstable_readConfig as readWranglerConfig } from "wrangler";
import {
  cloudflareRedirects,
  prepareCloudflare,
} from "./prepare-cloudflare.mjs";

test("Wrangler enables branch previews with the shared static asset configuration", () => {
  const args = { config: "./wrangler.jsonc" };
  const production = readWranglerConfig(args);
  const preview = readWranglerConfig(args, { isPreview: true });
  assert.ok(preview.previews, "wrangler preview requires a previews block");
  assert.equal(Object.hasOwn(preview.previews, "assets"), false);
  assert.ok(preview.assets?.directory.endsWith("/dist-cloudflare"));
  assert.deepEqual(preview.assets, production.assets);
  assert.equal(preview.compatibility_date, production.compatibility_date);
});

test("removes force markers only from status codes and puts exact rules first", () => {
  const result = cloudflareRedirects(
    `# comment\n/old/* /new/:splat 301!\n/old /new/ 301!\n/feed.xml /rss.xml 301\n/bang /hello!/ 302!\n`,
  );
  assert.equal(
    result,
    [
      "# Generated for Cloudflare Workers Static Assets. Do not edit.",
      "# 3 static rules; 1 dynamic rules",
      "/old  /new/  301",
      "/feed.xml  /rss.xml  301",
      "/bang  /hello!/  302",
      "/old/*  /new/:splat  301",
      "",
    ].join("\n"),
  );
  assert.equal(
    cloudflareRedirects(result),
    result,
    "preparation is idempotent",
  );
});

test("deduplicates identical legacy rules without changing the destination", () => {
  assert.equal(
    cloudflareRedirects("/a /b 301!\n/a /b 301\n"),
    cloudflareRedirects("/a /b 301\n"),
  );
});

test("rejects unsupported Netlify syntax, duplicate sources and oversized rules", () => {
  for (const input of [
    "/a /b 200",
    "/a /b 301 Country=jp",
    "/a /b 301\n/a /c 302",
    "https://maguro.dev/a /b 301",
    "/a?x=y /b 301",
    "/a/*/* /b 301",
    "/a //other.example/b 301",
    `/a /${"b".repeat(1000)} 301`,
  ])
    assert.throws(() => cloudflareRedirects(input));
});

test("enforces the Cloudflare static and dynamic redirect limits", () => {
  const rules = (count, suffix) =>
    Array.from({ length: count }, (_, i) => `/a${i}${suffix} /b 301`).join(
      "\n",
    );
  assert.doesNotThrow(() => cloudflareRedirects(rules(2000, "")));
  assert.throws(() => cloudflareRedirects(rules(2001, "")), /limits exceeded/);
  assert.doesNotThrow(() => cloudflareRedirects(rules(100, "/*")));
  assert.throws(() => cloudflareRedirects(rules(101, "/*")), /limits exceeded/);
});

test("prepares only the selected artifact and requires a real 404 page", () => {
  const directory = mkdtempSync(join(tmpdir(), "maguro-cloudflare-"));
  try {
    writeFileSync(join(directory, "_redirects"), "/old /new/ 301!\n");
    writeFileSync(join(directory, "_redirects.static"), "source rules");
    assert.throws(() => prepareCloudflare(directory), /404.html/);
    assert.match(readFileSync(join(directory, "_redirects"), "utf8"), /301!/);
    writeFileSync(join(directory, "404.html"), "not found");
    prepareCloudflare(directory);
    assert.doesNotMatch(
      readFileSync(join(directory, "_redirects"), "utf8"),
      /301!/,
    );
    assert.equal(existsSync(join(directory, "_redirects.static")), false);
    assert.equal(
      readFileSync(join(directory, "404.html"), "utf8"),
      "not found",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
