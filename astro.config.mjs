import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
  site: 'https://maguro.dev',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      themeCssSelector: (theme) => {
        return theme.name === 'github-dark' ? '[data-theme="dark"]' : '[data-theme="light"]';
      },
    }),
    mdx(),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [
      rehypeKatex,
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'prepend',
          properties: { className: ['heading-anchor'], ariaHidden: true, tabIndex: -1 },
          content: (heading) => {
            const level = Number(heading.tagName.charAt(1));
            return { type: 'text', value: '#'.repeat(level) + ' ' };
          },
        },
      ],
    ],
  },
});
