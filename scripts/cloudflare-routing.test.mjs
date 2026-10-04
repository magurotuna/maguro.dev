/** Local Workers-runtime regression tests. Never fetch archive/production origins. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { after, before, test } from "node:test";
import { createTestHarness } from "wrangler";

const server = createTestHarness({
  workers: [{ configPath: "./wrangler.jsonc" }],
});
let origin;
before(async () => {
  ({ url: origin } = await server.listen());
});
after(async () => {
  await server.close();
});

async function get(path) {
  // Manual redirects are essential: archive destinations must never be fetched.
  return server.fetch(path, { redirect: "manual" });
}

async function expectRedirect(path, destination, status = 301) {
  const response = await get(path);
  assert.equal(response.status, status, path);
  assert.equal(
    new URL(response.headers.get("location"), origin).href,
    new URL(destination, origin).href,
    path,
  );
}

test("every legacy redirect keeps its status, destination, nested splat and query", async () => {
  const rules = readFileSync("public/_redirects", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  assert.ok(
    rules.length > 200,
    "expected the complete generated redirect inventory",
  );
  for (const rule of rules) {
    const [source, target, code] = rule.split(/\s+/);
    const splat = "nested/image.png";
    const path = source.replace("*", splat);
    const destination = target.replace(":splat", splat);
    await expectRedirect(path, destination, Number(code.replace("!", "")));
    const query = "?utm_source=migration&ref=a%2Fb";
    await expectRedirect(
      path + query,
      destination + query,
      Number(code.replace("!", "")),
    );
  }
});

test("HTML directory pages have trailing slashes, while file endpoints do not", async () => {
  const [post] = JSON.parse(readFileSync("data/preserved-posts.json", "utf8"));
  for (const path of ["/about", `/blog/${post}`, "/tags", "/tags/rust"]) {
    await expectRedirect(path, `${path}/`, 307);
    await expectRedirect(`${path}?a=1`, `${path}/?a=1`, 307);
    const response = await get(`${path}/`);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), /text\/html/, path);
  }
  for (const path of [
    "/",
    "/rss.xml",
    "/sitemap-index.xml",
    "/sitemap-0.xml",
    "/robots.txt",
  ]) {
    assert.equal((await get(path)).status, 200, path);
  }
  for (const name of readdirSync("dist-cloudflare/og").filter((name) =>
    name.endsWith(".png"),
  )) {
    const response = await get(`/og/${name}`);
    assert.equal(response.status, 200, name);
    assert.match(response.headers.get("content-type"), /image\/png/, name);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(
      bytes.subarray(0, 8),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      name,
    );
  }
});

test("missing paths use the Astro 404 page and redirect sources are not served", async () => {
  for (const path of [
    "/does-not-exist",
    "/nested/does-not-exist/",
    "/og/missing.png",
    "/_redirects",
    "/_redirects.static",
  ]) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /Page not found\./, path);
  }
});

test("About links to the freshly built PDF on the same origin", async () => {
  const about = await get("/about/");
  assert.equal(about.status, 200);
  const link = (await about.text()).match(
    /<a\b[^>]*href="([^"]+)"[^>]*>Résumé \(PDF\)<\/a>/,
  );
  assert.ok(link, "expected the résumé link on About");
  assert.equal(link[1], "/resume.pdf");
  assert.equal(new URL(link[1], origin).origin, new URL(origin).origin);

  const pdf = await get(link[1]);
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type"), /^application\/pdf(?:;|$)/);
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.deepEqual(bytes, readFileSync("dist-cloudflare/resume.pdf"));
});
