# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a personal blog/website built with [Zola](https://www.getzola.org/), a static site generator written in Rust. The site is deployed on Netlify and uses the Even theme for styling.

## Development Commands

### Build & Development
- **Build the site**: `zola build`
- **Local development server**: `zola serve` (auto-reloads on changes)
- **Build for Netlify deploy preview**: `zola build --base-url $DEPLOY_PRIME_URL`

### Common Tasks
- **Create a new blog post**: Add a new `.md` file in the `content/` directory with appropriate frontmatter
- **Add a new static page**: Create `.md` file in `content/pages/`
- **Modify styles**: Edit SCSS files in `sass/` directory

## Architecture & Structure

### Content Organization
- **Blog posts**: `content/*.md` - Weekly reports and technical articles
- **Static pages**: `content/pages/` - About, Apps, and other standalone pages
- **Images**: `content/img/` for content images, `static/` for site assets

### Post Frontmatter Structure
```toml
+++
title = "Post Title"
date = 2021-09-27

[taxonomies]
tags = ["tag1", "tag2"]
+++
```

### Key Configuration
- **config.toml**: Main Zola configuration (base URL, theme settings, features)
- **netlify.toml**: Deployment configuration (Zola version: 0.11.0)
- **templates/**: Custom HTML templates overriding theme defaults
- **sass/**: Custom SCSS styles extending the Even theme

### Theme Customization
The site uses the Even theme located in `themes/even/`. Custom overrides:
- Templates in root `templates/` directory override theme templates
- Custom styles in root `sass/` directory extend theme styles
- Navigation menu configured in `config.toml` under `[extra.even_menu]`

## Important Notes

1. **Zola Version**: The site is pinned to Zola 0.11.0 in netlify.toml. Ensure compatibility when making changes.

2. **Content Features**: 
   - KaTeX enabled for mathematical expressions
   - Syntax highlighting with Monokai theme
   - Search index generation enabled
   - RSS feeds for main content and tags

3. **Deployment**: All pushes to main branch auto-deploy via Netlify. Pull requests generate deploy previews.

4. **No Build Scripts**: This is a pure Zola project with no npm/yarn dependencies or custom build scripts.