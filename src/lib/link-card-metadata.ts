import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { select } from "hast-util-select";
import { toString } from "hast-util-to-string";

export interface LinkCardMetadata {
  title: string | null;
  description: string | null;
  /** Path of the downloaded copy under `public/`, e.g. `/link-card-images/…`. */
  image: string | null;
  /** The original og:image URL. */
  imageSource?: string | null;
  /** True when fetching failed. The card falls back to showing the URL only. */
  failed?: boolean;
  fetchedAt: string;
}

type Cache = Record<string, LinkCardMetadata>;

export const CACHE_PATH = path.resolve(process.cwd(), ".link-card-cache.json");

/**
 * OG images are downloaded and served from this site, since some sites forbid
 * embedding them elsewhere (e.g. `Cross-Origin-Resource-Policy: same-origin`)
 * and remote images can disappear.
 */
export const IMAGE_DIR = path.resolve(process.cwd(), "public/link-card-images");
const IMAGE_URL_PREFIX = "/link-card-images/";
// Displayed at most 320px wide, so 2x covers high-DPI screens.
const IMAGE_WIDTH = 640;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
    const bytes = await readBody(res, MAX_BYTES);
    const html = decode(bytes, res.headers.get("content-type"));
    const { image: imageSource, ...metadata } = extractMetadata(
      html,
      res.url || url,
    );
    const image = imageSource ? await downloadImage(url, imageSource) : null;
    return { ...metadata, image, imageSource, fetchedAt };
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

/** Local file name for the image of the page at `pageUrl`. */
export function imageFileName(pageUrl: string): string {
  const hash = createHash("sha256").update(pageUrl).digest("hex");
  return `${hash.slice(0, 16)}.webp`;
}

/** Path of a downloaded image in `public/`, or null for anything else. */
export function localImagePath(image: string | null): string | null {
  return image?.startsWith(IMAGE_URL_PREFIX)
    ? path.join(IMAGE_DIR, image.slice(IMAGE_URL_PREFIX.length))
    : null;
}

async function downloadImage(
  pageUrl: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT, Referer: pageUrl },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const bytes = await readBody(res, MAX_IMAGE_BYTES);
    // Loaded lazily so that builds, which never fetch, do not need sharp.
    const { default: sharp } = await import("sharp");
    const webp = await sharp(bytes)
      .resize({ width: IMAGE_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const fileName = imageFileName(pageUrl);
    await mkdir(IMAGE_DIR, { recursive: true });
    await writeFile(path.join(IMAGE_DIR, fileName), webp);
    return `${IMAGE_URL_PREFIX}${fileName}`;
  } catch (error) {
    console.warn(`[link-card] Failed to download ${imageUrl}: ${error}`);
    return null;
  }
}

async function readBody(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) {
    return new Uint8Array(await res.arrayBuffer());
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  while (total < maxBytes) {
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
