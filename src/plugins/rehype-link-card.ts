import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { AstroIntegration } from "astro";
import matter from "gray-matter";
import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";
import {
  fetchLinkCardMetadata,
  loadCache,
  saveCache,
  type LinkCardMetadata,
} from "../lib/link-card-metadata.ts";

/**
 * Rehype plugin to turn a paragraph that consists of a single bare URL into a
 * link card with the target page's OGP metadata. X (Twitter) post URLs become
 * the same embed as `src/components/Tweet.astro` instead, since X does not
 * serve useful OGP. Links to posts on this site become cards built from the
 * post's frontmatter and OG image, without any fetch.
 *
 * Metadata is read from `.link-card-cache.json`. During `astro dev`, URLs
 * missing from the cache are fetched and written back, so adding a URL just
 * works. Builds never fetch, so CI and deploys do not depend on other sites;
 * a missing URL falls back to a URL-only card (`npm run check:link-cards`
 * catches that in CI). Run `npm run refresh-link-cache` to refetch everything.
 */
export default function rehypeLinkCard() {
  return async (tree: Root) => {
    const targets: { paragraph: Element; url: string }[] = [];
    visit(tree, "element", (node: Element) => {
      const url = findStandaloneUrl(node);
      if (url) {
        targets.push({ paragraph: node, url });
      }
    });

    for (const { paragraph, url } of targets) {
      let replacement: Element;
      const tweetId = findTweetId(url);
      const slug = findOwnPostSlug(url);
      if (tweetId) {
        replacement = buildTweet(tweetId);
      } else if (slug !== null) {
        const metadata = getOwnPostMetadata(slug);
        // Leave links to unknown pages on this site as plain links.
        if (!metadata) continue;
        replacement = buildLinkCard(`/blog/${slug}/`, "maguro.dev", metadata);
      } else if (isOwnSite(url)) {
        continue;
      } else {
        replacement = buildLinkCard(
          url,
          new URL(url).hostname.replace("www.", ""),
          await getMetadata(url),
        );
      }
      // Replace the <p> in place so the card is not nested in a paragraph.
      Object.assign(paragraph, replacement);
    }
  };
}

/**
 * Returns the URL if `node` is a `<p>` whose only content is an http(s) link
 * with the URL itself as its text (what remark-gfm makes from a bare URL).
 */
export function findStandaloneUrl(node: Element): string | null {
  if (node.tagName !== "p") return null;
  const children = node.children.filter(
    (child) => !(child.type === "text" && child.value.trim() === ""),
  );
  if (children.length !== 1) return null;
  const link = children[0];
  if (link.type !== "element" || link.tagName !== "a") return null;
  const href = link.properties?.href;
  if (typeof href !== "string" || !isHttpUrl(href)) return null;
  const text = link.children.length === 1 ? link.children[0] : undefined;
  if (text?.type !== "text" || text.value !== href) return null;
  return href;
}

/** Returns the post ID if `url` points to a post on X (Twitter). */
export function findTweetId(url: string): string | null {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^(www|mobile)\./, "");
    if (host !== "x.com" && host !== "twitter.com") return null;
    return pathname.match(/^\/[^/]+\/status\/(\d+)\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Returns the slug if `url` points to a post on this site. */
export function findOwnPostSlug(url: string): string | null {
  const { hostname, pathname } = new URL(url);
  if (hostname !== "maguro.dev" && hostname !== "www.maguro.dev") return null;
  return pathname.match(/^\/blog\/([^/]+)\/?$/)?.[1] ?? null;
}

export function isOwnSite(url: string): boolean {
  const { hostname } = new URL(url);
  return hostname === "maguro.dev" || hostname.endsWith(".maguro.dev");
}

function isHttpUrl(href: string): boolean {
  try {
    const { protocol } = new URL(href);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function getOwnPostMetadata(slug: string): LinkCardMetadata | null {
  const file = path.resolve(process.cwd(), "src/content/blog", `${slug}.mdx`);
  if (!existsSync(file)) {
    console.warn(`[link-card] No post found for /blog/${slug}/`);
    return null;
  }
  const { data } = matter(readFileSync(file, "utf-8"));
  return {
    title: typeof data.title === "string" ? data.title : null,
    description: typeof data.description === "string" ? data.description : null,
    // OG images are generated only for published posts.
    image: data.draft ? null : `/og/${slug}.png`,
    fetchedAt: "",
  };
}

let fetchMissing = false;

/**
 * Integration that enables fetching missing metadata only under `astro dev`.
 */
export function linkCardIntegration(): AstroIntegration {
  return {
    name: "link-card",
    hooks: {
      "astro:config:setup": ({ command }) => {
        fetchMissing = command === "dev";
      },
    },
  };
}

let cache: Record<string, LinkCardMetadata> | undefined;
const inFlight = new Map<string, Promise<LinkCardMetadata>>();
let pendingSave: Promise<void> = Promise.resolve();

function getMetadata(url: string): Promise<LinkCardMetadata> {
  cache ??= loadCache();
  const cached = cache[url];
  if (cached) return Promise.resolve(cached);
  if (!fetchMissing) {
    console.warn(
      `[link-card] ${url} is not in .link-card-cache.json. Run \`npm run link-cards\` and commit the cache.`,
    );
    return Promise.resolve({
      title: null,
      description: null,
      image: null,
      fetchedAt: "",
    });
  }

  let promise = inFlight.get(url);
  if (!promise) {
    promise = fetchLinkCardMetadata(url).then((metadata) => {
      cache![url] = metadata;
      inFlight.delete(url);
      pendingSave = pendingSave.then(() => saveCache(cache!)).catch(() => {});
      return metadata;
    });
    inFlight.set(url, promise);
  }
  return promise;
}

/**
 * Builds the same markup as `src/components/Tweet.astro`. The script in
 * `BaseLayout.astro` renders the embed into it.
 */
function buildTweet(id: string): Element {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["tweet-container"], dataTweetId: id },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { className: ["tweet-embed"] },
        children: [],
      },
      {
        type: "element",
        tagName: "noscript",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "a",
            properties: { href: `https://x.com/i/web/status/${id}` },
            children: [{ type: "text", value: "View tweet on X" }],
          },
        ],
      },
    ],
  };
}

/** Builds the same markup as `src/components/LinkCard.astro`. */
function buildLinkCard(
  href: string,
  domain: string,
  metadata: LinkCardMetadata,
): Element {
  const content: ElementContent[] = [
    div("link-card-title", metadata.title ?? href),
  ];
  if (metadata.description) {
    content.push(div("link-card-description", metadata.description));
  }
  content.push(div("link-card-domain", domain));

  const children: ElementContent[] = [];
  if (metadata.image) {
    children.push({
      type: "element",
      tagName: "div",
      properties: { className: ["link-card-image"] },
      children: [
        {
          type: "element",
          tagName: "img",
          properties: { src: metadata.image, alt: "", loading: "lazy" },
          children: [],
        },
      ],
    });
  }
  children.push({
    type: "element",
    tagName: "div",
    properties: { className: ["link-card-content"] },
    children: content,
  });

  return {
    type: "element",
    tagName: "a",
    properties: {
      href,
      className: ["link-card"],
      ...(href.startsWith("/")
        ? {}
        : { target: "_blank", rel: ["noopener", "noreferrer"] }),
    },
    children,
  };
}

function div(className: string, text: string): Element {
  return {
    type: "element",
    tagName: "div",
    properties: { className: [className] },
    children: [{ type: "text", value: text }],
  };
}
