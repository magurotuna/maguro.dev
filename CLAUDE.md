# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a personal blog/website built with [Astro](https://astro.build/), a modern static site generator. The site is deployed on Netlify.

## Development Commands

### Build & Development
- **Install dependencies**: `npm install`
- **Build the site**: `npm run build` (generates redirects then builds)
- **Local development server**: `npm run dev` (auto-reloads on changes)

### Common Tasks
- **Create a new blog post**: Add a new `.mdx` file in `src/content/blog/` with YAML frontmatter
- **Generate redirects**: `npm run build` (runs generate-redirects.ts before Astro build)
- **Link card metadata**: `npm run link-cards:strict` (strict mode for link card generation)

## Architecture & Structure

### Content Organization
- **Blog posts**: `src/content/blog/*.mdx` - Technical articles in MDX format
- **Pages**: `src/pages/` - Astro page components
- **Layouts**: `src/layouts/` - Base layout with theme and SEO support
- **Components**: `src/components/` - Reusable Astro/TSX components
- **Static assets**: `public/` - Images, favicon, robots.txt, redirects

### Post Frontmatter Structure
```yaml
---
title: "Post Title"
date: 2021-09-27
tags: ["tag1", "tag2"]
description: "Optional description for SEO"
draft: false
---
```

### Key Configuration
- **astro.config.mjs**: Main Astro configuration (integrations, markdown plugins)
- **netlify.toml**: Deployment configuration (Node.js 22)
- **tsconfig.json**: TypeScript configuration
- **src/content/config.ts**: Content collection schema definition

### Component Library
- **Tweet.astro**: Twitter embed with theme-aware re-rendering
- **YouTube.astro**: YouTube video embed component
- **LinkCard.astro**: Rich link preview cards
- **ThemeToggle.astro**: Dark/light theme switcher with localStorage
- **Search.astro**: Pagefind-powered site search

### Data Files
- **data/preserved-posts.json**: List of 13 post slugs to keep on main site
- **data/weekly-reports.json**: Weekly report slugs (redirected to archive)
- **data/archived-tags.json**: Tags only appearing in archived content
- **data/zola-tag-slugs.json**: Mapping of tag names to old Zola URL slugs

### Scripts
- **scripts/generate-redirects.ts**: Generates _redirects file from data JSONs

## Important Notes

1. **Node.js Version**: The site uses Node.js 24 LTS (specified in netlify.toml).

2. **Content Features**:
   - KaTeX for mathematical expressions
   - Expressive Code for syntax highlighting
   - Pagefind for client-side search
   - RSS feed at /rss.xml

3. **URL Structure**: Posts are served at `/blog/[slug]/` with trailing slashes.

4. **Redirects**: Old Zola URLs redirect to new paths or archive.maguro.dev.

5. **Deployment**: All pushes to main branch auto-deploy via Netlify.
