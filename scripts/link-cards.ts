/**
 * Updates `.link-card-cache.json` for every standalone URL in blog posts.
 *
 *   tsx scripts/link-cards.ts            fetch URLs missing from the cache
 *   tsx scripts/link-cards.ts --refresh  refetch every URL
 *   tsx scripts/link-cards.ts --strict   fail if any URL could not be fetched
 *   tsx scripts/link-cards.ts --check    fail if any URL is missing from the
 *                                        cache, without network access (CI)
 *
 * URLs no longer used by any post are removed from the cache.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Element } from "hast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import {
  fetchLinkCardMetadata,
  loadCache,
  saveCache,
} from "../src/lib/link-card-metadata.ts";
import {
  findStandaloneUrl,
  findTweetId,
  isOwnSite,
} from "../src/plugins/rehype-link-card.ts";

const BLOG_DIR = path.resolve(process.cwd(), "src/content/blog");

const refresh = process.argv.includes("--refresh");
const strict = process.argv.includes("--strict");
const check = process.argv.includes("--check");

async function collectUrls(): Promise<Map<string, string[]>> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype);
  const urls = new Map<string, string[]>();
  for (const file of (await readdir(BLOG_DIR)).sort()) {
    if (!file.endsWith(".mdx") && !file.endsWith(".md")) continue;
    const source = await readFile(path.join(BLOG_DIR, file), "utf-8");
    const tree = await processor.run(processor.parse(source));
    visit(tree, "element", (node: Element) => {
      const url = findStandaloneUrl(node);
      if (url && !findTweetId(url) && !isOwnSite(url))
        urls.set(url, [...(urls.get(url) ?? []), file]);
    });
  }
  return urls;
}

const urls = await collectUrls();
const oldCache = loadCache();

if (check) {
  const missing = [...urls].filter(([url]) => !oldCache[url]);
  if (missing.length > 0) {
    console.error(
      `Missing from .link-card-cache.json (run \`npm run link-cards\` and commit it):\n  ${missing
        .map(([url, files]) => `${url} (${files.join(", ")})`)
        .join("\n  ")}`,
    );
    process.exit(1);
  }
  console.log(`All ${urls.size} link card(s) are cached.`);
  process.exit(0);
}
const cache: typeof oldCache = {};
const failures: string[] = [];

for (const [url, files] of urls) {
  let metadata = refresh ? undefined : oldCache[url];
  if (!metadata) {
    console.log(`Fetching ${url} (${files.join(", ")})`);
    metadata = await fetchLinkCardMetadata(url);
  }
  cache[url] = metadata;
  if (metadata.failed) failures.push(`${url} (${files.join(", ")})`);
}

await saveCache(cache);
console.log(`Saved ${urls.size} link card(s).`);

if (failures.length > 0) {
  console.warn(`Could not fetch metadata for:\n  ${failures.join("\n  ")}`);
  if (strict) process.exit(1);
}
