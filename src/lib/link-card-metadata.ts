import { readFileSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { select } from "hast-util-select";
import { toString } from "hast-util-to-string";

export interface LinkCardMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  /** True when fetching failed. The card falls back to showing the URL only. */
  failed?: boolean;
  fetchedAt: string;
}

type Cache = Record<string, LinkCardMetadata>;

export const CACHE_PATH = path.resolve(process.cwd(), ".link-card-cache.json");

const USER_AGENT =
  "Mozilla/5.0 (compatible; maguro.dev-link-card/1.0; +https://maguro.dev)";
const FETCH_TIMEOUT_MS = 10_000;
// OGP lives in <head>, so there is no need to read huge pages to the end.
const MAX_BYTES = 1024 * 1024;

export function loadCache(): Cache {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8")) as Cache;
  } catch {
    return {};
  }
}

export async function saveCache(cache: Cache): Promise<void> {
  const sorted = Object.fromEntries(
    Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)),
  );
  // Write atomically since pages are rendered concurrently.
  const tmp = `${CACHE_PATH}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(sorted, null, 2) + "\n");
  await rename(tmp, CACHE_PATH);
}

export async function fetchLinkCardMetadata(
  url: string,
): Promise<LinkCardMetadata> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const bytes = await readBody(res);
    const html = decode(bytes, res.headers.get("content-type"));
    return { ...extractMetadata(html, res.url || url), fetchedAt };
  } catch (error) {
    console.warn(`[link-card] Failed to fetch ${url}: ${error}`);
    return {
      title: null,
      description: null,
      image: null,
      failed: true,
      fetchedAt,
    };
  }
}

async function readBody(res: Response): Promise<Uint8Array> {
  if (!res.body) {
    return new Uint8Array(await res.arrayBuffer());
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => {});
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/**
 * Decodes the response body. Some Japanese sites still serve Shift_JIS or
 * EUC-JP, so the charset is taken from Content-Type or <meta charset>.
 */
function decode(bytes: Uint8Array, contentType: string | null): string {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  const charset =
    contentType?.match(/charset=["']?([\w-]+)/i)?.[1] ??
    head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function extractMetadata(
  html: string,
  baseUrl: string,
): Omit<LinkCardMetadata, "fetchedAt"> {
  const tree = fromHtml(html);
  const title =
    meta(tree, 'meta[property="og:title"]') ??
    meta(tree, 'meta[name="twitter:title"]') ??
    text(tree, "title");
  const description =
    meta(tree, 'meta[property="og:description"]') ??
    meta(tree, 'meta[name="twitter:description"]') ??
    meta(tree, 'meta[name="description"]');
  const rawImage =
    meta(tree, 'meta[property="og:image"]') ??
    meta(tree, 'meta[name="twitter:image"]');
  return { title, description, image: resolveUrl(rawImage, baseUrl) };
}

function meta(tree: Root, selector: string): string | null {
  const content = select(selector, tree)?.properties?.content;
  return typeof content === "string" ? normalize(content) : null;
}

function text(tree: Root, selector: string): string | null {
  const node = select(selector, tree);
  return node ? normalize(toString(node)) : null;
}

function normalize(value: string): string | null {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed === "" ? null : trimmed;
}

function resolveUrl(value: string | null, baseUrl: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}
