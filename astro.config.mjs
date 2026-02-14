import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import icon from "astro-icon";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeExternalLinkFavicon from "./src/plugins/rehype-external-link-favicon.ts";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Build a map of blog slug -> date for sitemap lastmod
const blogDir = join(process.cwd(), "src/content/blog");
const blogDates = new Map();
for (const file of readdirSync(blogDir).filter((f) => f.endsWith(".mdx"))) {
  const content = readFileSync(join(blogDir, file), "utf-8");
  const dateMatch = content.match(/^date:\s*(.+)$/m);
  if (dateMatch) {
    const slug = file.replace(/\.mdx$/, "");
    blogDates.set(slug, new Date(dateMatch[1].trim()));
  }
}

export default defineConfig({
  site: "https://maguro.dev",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  integrations: [
    expressiveCode({
      themes: ["catppuccin-latte", "catppuccin-mocha"],
      themeCssSelector: (theme) => {
        return theme.name === "catppuccin-mocha"
          ? '[data-theme="dark"]'
          : '[data-theme="light"]';
      },
      plugins: [pluginLineNumbers()],
    }),
    icon({
      include: {
        lucide: ["sun", "moon", "rss", "github", "linkedin", "link", "check"],
        "simple-icons": ["x", "hatenabookmark"],
      },
    }),
    mdx(),
    sitemap({
      serialize(item) {
        const match = item.url.match(/\/blog\/([^/]+)\/?$/);
        if (match) {
          const date = blogDates.get(match[1]);
          if (date) {
            item.lastmod = date.toISOString();
          }
        }
        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkGfm, remarkMath],
    remarkRehype: {
      footnoteLabelTagName: "span",
      footnoteLabelProperties: { className: ["footnotes-title"] },
      footnoteBackContent: " ",
    },
    rehypePlugins: [
      rehypeKatex,
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
          properties: (heading) => {
            const level = Number(heading.tagName.charAt(1));
            return { className: ["heading-anchor"], "data-level": level };
          },
        },
      ],
      [
        rehypeExternalLinks,
        {
          target: "_blank",
          rel: ["noopener", "noreferrer"],
        },
      ],
      rehypeExternalLinkFavicon,
    ],
  },
});
