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
 * serve useful OGP.
 *
 * Metadata is read from `.link-card-cache.json`. URLs missing from the cache
 * are fetched and written back, so adding a URL in `npm run dev` just works.
 * Run `npm run refresh-link-cache` to refetch everything.
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
      const tweetId = findTweetId(url);
      const replacement = tweetId
        ? buildTweet(tweetId)
        : buildLinkCard(url, await getMetadata(url));
      // Replace the <p> in place so the card is not nested in a paragraph.
      Object.assign(paragraph, replacement);
    }
  };
}

/**
 * Returns the URL if `node` is a `<p>` whose only content is an external link
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
  if (typeof href !== "string" || !isExternalLink(href)) return null;
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

function isExternalLink(href: string): boolean {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return !(
      url.hostname === "maguro.dev" || url.hostname.endsWith(".maguro.dev")
    );
  } catch {
    return false;
  }
}

let cache: Record<string, LinkCardMetadata> | undefined;
const inFlight = new Map<string, Promise<LinkCardMetadata>>();
let pendingSave: Promise<void> = Promise.resolve();

function getMetadata(url: string): Promise<LinkCardMetadata> {
  cache ??= loadCache();
  const cached = cache[url];
  if (cached) return Promise.resolve(cached);

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
function buildLinkCard(url: string, metadata: LinkCardMetadata): Element {
  const content: ElementContent[] = [
    div("link-card-title", metadata.title ?? url),
  ];
  if (metadata.description) {
    content.push(div("link-card-description", metadata.description));
  }
  content.push(
    div("link-card-domain", new URL(url).hostname.replace("www.", "")),
  );

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
      href: url,
      className: ["link-card"],
      target: "_blank",
      rel: ["noopener", "noreferrer"],
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
