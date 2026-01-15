# maguro.dev Renovation Specification

## Overview

Renovate maguro.dev by migrating from Zola to Astro, preserving valuable technical content while archiving older posts, and implementing a fresh design with modern features.

---

## 1. Content Strategy

### Posts to Preserve (13 posts)

These will live on the new maguro.dev at `/blog/[slug]/`:

| Slug                                       | Title                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `async-recursion`                          | Rust で再帰的に呼び出される async 関数を作りたいときには async-recursion クレートが便利 |
| `associated-type-vs-generic-type-in-trait` | Rust のトレイトで、associated type か generic type のどちらを使うか迷ったときの指針     |
| `btree-maximum-value`                      | Rust の BTreeSet / BTreeMap で最大値を素早く取得する方法                                |
| `cargo-snippet-pr`                         | cargo-snippet にPRを出し、爆速でmergeされました                                         |
| `chmin-chmax-macro`                        | 競プロ用のライブラリを Rust で作ってみたシリーズ 〜 chmin! / chmax! マクロ編〜          |
| `coc-pairs-cursor`                         | coc.nvim の拡張機能である coc-pairs で改行時にカーソル位置を望む場所にもってくる        |
| `debug-macro`                              | 競技プログラミングでの使い勝手を考えたオレオレデバッグマクロを作りました                |
| `hashmap-value-i32`                        | HashMap / BTreeMap に何かの回数を値として管理させるときにはオーバーフローに注意         |
| `rust-dbg-in-release`                      | Rust の dbg! マクロはリリースビルドでも普通に動く                                       |
| `rust-itertools-join`                      | Rustで文字列イテレータを連結するときに便利な itertools::join は結構遅い                 |
| `rust-std-fs-copy`                         | Rust の std::fs::copy の macOS と Linux での挙動の違い                                  |
| `rustup-noninteractively`                  | rustup を非対話的環境でインストールする方法                                             |
| `shinjuku-rs-10`                           | 2020/06/30 に開催された Shinjuku.rs #10 に参加しました                                  |

### Posts to Archive

These will redirect to archive.maguro.dev:

- `laravel-nuxt-twitter-login`
- `pokemon-lottery-rust`
- `python-twitter-base64`
- `setup-magurodev`
- `vim-polyglot-for-highlight`
- All 53 weekly reports (`weekly-report-*`)

### Static Pages

- **Keep**: About page (Japanese only)
- **Remove**: About-en, Apps (will return 404 - intentionally not redirected)

---

## 2. Archive Site (archive.maguro.dev)

- **Technology**: Current Zola site, frozen
- **Repository**: Separate repo `magurotuna/archive.maguro.dev`
- **Hosting**: Netlify (separate site from main maguro.dev)
- **URL format**: Trailing slashes (Zola default, e.g., `/weekly-report-2021-01-01/`)
- **Content**: All posts (preserved + archived) for historical reference
- **SEO handling** (to prevent duplicate content issues):
  - **Strategy**: Use `noindex` as primary signal (simple, reliable)
    - `noindex` on ALL archive pages, including preserved posts
    - **Rationale**: Preserved posts have canonical home on main site; archive copies should never be indexed
    - Canonical tags are belt-and-suspenders for social sharing (OG/Twitter URLs point to main site)
    - `noindex` takes precedence for search engines; canonical/OG ensures shared links go to main site
  - Add `<meta name="robots" content="noindex, follow">` to all HTML pages
    - **Guarantee**: Inject in base layout (`templates/base.html`) so ALL pages inherit it
    - No individual template should need to add this; layout handles it globally
  - **RSS/Sitemap/Fallback handling**: Add `X-Robots-Tag` headers via Netlify `_headers` file:
    - **Location**: Create `static/_headers` in archive Zola repo (Zola copies `static/` contents to `public/` root)
    - Contents:

    ```
    # Fallback for all HTML pages (belt-and-suspenders with meta tag)
    /*
      X-Robots-Tag: noindex

    # Explicit for non-HTML resources
    /rss.xml
      X-Robots-Tag: noindex
    /sitemap.xml
      X-Robots-Tag: noindex
    /atom.xml
      X-Robots-Tag: noindex
    ```

    - **Why both meta + header**: Defense in depth; if any template misses meta tag, header still prevents indexing

  - **Validation**: Add archive noindex smoke test to verify:
    - All HTML pages have `<meta name="robots" content="noindex, follow">`
    - `X-Robots-Tag: noindex` header is present on all responses
    - Run: `npm run test:archive-noindex -- --url=https://archive.maguro.dev`
  - This prevents search engines from indexing archive.maguro.dev
  - Users can still access archive content via redirects from main site
  - **Do NOT add `Disallow: /` to robots.txt** — crawlers must see pages to read `noindex` meta
  - Archive site robots.txt should allow crawling: `User-agent: *\nAllow: /`
  - Preserved posts on archive canonicalize to main site (e.g., `<link rel="canonical" href="https://maguro.dev/blog/slug/">`)
  - **OG/Twitter override for preserved posts**: Archive templates should override `og:url` and `twitter:url` meta tags to point to main site for preserved posts
    - Without this, shared links from archive pages would favor `archive.maguro.dev` URLs
    - Use `data/preserved-posts.json` to check if current post is preserved
    - Example: `<meta property="og:url" content="https://maguro.dev/blog/slug/">`
  - **Internal link behavior**: Archive internal links stay on `archive.maguro.dev` (intentional)
    - Archive is a frozen historical snapshot; link rewriting would be complex and error-prone
    - Users who want main site can use header/footer nav or the canonical URL
    - This is acceptable since archive is noindexed anyway
  - Archived-only posts self-canonicalize (no equivalent on main site)

- **Setup workflow**:
  1. Create new repo `magurotuna/archive.maguro.dev`
  2. Copy current maguro.dev content to the new repo
  3. **Update `config.toml`**: Set `base_url = "https://archive.maguro.dev"` (critical: ensures absolute URLs, OG tags, and RSS point to archive domain)
  4. Add `noindex` meta tag to all pages; update robots.txt to allow crawling per SEO handling above
  5. Add canonical links: preserved posts → main site, archived-only → self
     - **Use `data/preserved-posts.json` as source of truth** (same file used for main site redirects)
     - **Sync mechanism**: Copy `data/preserved-posts.json` from main repo to archive repo during initial setup
       - This list is immutable post-migration (preserved posts never change)
       - If ever updated, manually copy to archive repo and redeploy
       - Alternative: Use git submodule for shared data (more complex, not recommended for static list)
     - This ensures canonical URLs stay in sync between repos
  6. Configure Netlify to deploy from archive repo to `archive.maguro.dev`
  7. **Verify archive site is live and stable** before proceeding
     - Check: `curl -I https://archive.maguro.dev/` returns 200
     - Check: `curl -I https://archive.maguro.dev/ | grep X-Robots-Tag` shows noindex
     - Do NOT proceed with main site migration until archive is confirmed working
  8. Proceed with Astro migration on main repo

---

## 3. URL Structure & Redirects

### New URL Pattern

- Blog posts: `/blog/[slug]/`
- Tag pages: `/tags/[tag]/`
- About: `/about/`
- Homepage: `/`

### Redirect Strategy

**Redirect file policy**:

- `public/_redirects.static` — Manually maintained, committed to repo
- `public/_redirects` — **Generated at build time**, NOT committed
  - Add to `.gitignore`: `public/_redirects`
  - Build script merges static + generated → writes to `public/_redirects`
  - Astro copies to `dist/_redirects` during build
  - This keeps working tree clean and avoids merge conflicts
- **Merge order** (Netlify uses first matching rule):
  1. Static redirects (`_redirects.static`) — first, most specific
  2. Preserved post redirects — specific paths before wildcards
  3. Weekly report redirects — specific paths before wildcards
  4. Tag redirects — specific paths before wildcards
  5. Wildcard/splat rules — last (e.g., `/:slug/*` patterns)
  - Within each section: non-wildcard rules before wildcard rules
  - This prevents wildcards from shadowing specific redirects

**Static redirects** (`public/_redirects.static`, manually maintained):

```
# RSS feed aliases (cover all possible feed paths)
# NOTE: Verify current Zola feed URL before migration (Zola defaults to atom.xml)
# Run: curl -I https://maguro.dev/rss.xml https://maguro.dev/atom.xml https://maguro.dev/feed.xml
/feed.xml  /rss.xml  301
/feed.xml/  /rss.xml  301
/atom.xml  /rss.xml  301
/atom.xml/  /rss.xml  301

# Archived posts: redirect to archive subdomain
# VERIFIED: All archived posts are flat (only index.html, no nested assets)
# Verification method: Run `zola build` then check for non-index.html files:
#   find public/{laravel-*,pokemon-*,python-*,setup-*,vim-*} -type f ! -name 'index.html' 2>/dev/null
# Note: `public/` here refers to Zola's build output directory, not Astro's static assets
# For safety, add splat redirects for all archived posts (handles any missed assets):
# Three rules per post: slug, slug/, and slug/* for assets
#
# IMPORTANT: Global/shared assets (if any posts reference /img/*, /static/*, etc.)
# - Archived posts may reference shared assets like /img/shared.png
# - These won't be caught by per-slug redirects
# - Migration step: Audit archived posts for shared asset references
# - Options: (a) redirect /img/* to archive, (b) copy shared assets, (c) update posts to use relative paths
# - See Phase 5 migration checklist for asset inventory task
/laravel-nuxt-twitter-login  https://archive.maguro.dev/laravel-nuxt-twitter-login/  301!
/laravel-nuxt-twitter-login/  https://archive.maguro.dev/laravel-nuxt-twitter-login/  301!
/laravel-nuxt-twitter-login/*  https://archive.maguro.dev/laravel-nuxt-twitter-login/:splat  301!
/pokemon-lottery-rust  https://archive.maguro.dev/pokemon-lottery-rust/  301!
/pokemon-lottery-rust/  https://archive.maguro.dev/pokemon-lottery-rust/  301!
/pokemon-lottery-rust/*  https://archive.maguro.dev/pokemon-lottery-rust/:splat  301!
/python-twitter-base64  https://archive.maguro.dev/python-twitter-base64/  301!
/python-twitter-base64/  https://archive.maguro.dev/python-twitter-base64/  301!
/python-twitter-base64/*  https://archive.maguro.dev/python-twitter-base64/:splat  301!
/setup-magurodev  https://archive.maguro.dev/setup-magurodev/  301!
/setup-magurodev/  https://archive.maguro.dev/setup-magurodev/  301!
/setup-magurodev/*  https://archive.maguro.dev/setup-magurodev/:splat  301!
/vim-polyglot-for-highlight  https://archive.maguro.dev/vim-polyglot-for-highlight/  301!
/vim-polyglot-for-highlight/  https://archive.maguro.dev/vim-polyglot-for-highlight/  301!
/vim-polyglot-for-highlight/*  https://archive.maguro.dev/vim-polyglot-for-highlight/:splat  301!
```

**Generated redirects** (output by `scripts/generate-redirects.ts`, merged into final `public/_redirects`):

```
# Preserved posts: old URL → new /blog/ URL (13 posts)
# Source: data/preserved-posts.json (shared with archive repo for canonical sync)
# Use 301! (forced) to ensure redirect even if matching path exists in public/
# Three rules per post: slug, slug/, and slug/* for assets
# NOTE: Asset redirects (/*) require copying assets to `public/blog/[slug]/` during migration
#       Alternatively, store assets in `public/assets/blog/[slug]/` and adjust redirect targets
/async-recursion  /blog/async-recursion/  301!
/async-recursion/  /blog/async-recursion/  301!
/async-recursion/*  /blog/async-recursion/:splat  301!
# ... (all 13 preserved posts: slug, slug/, slug/* variants each, all with 301!)

# Weekly reports: redirect to archive subdomain (53 reports)
# Enumerated explicitly because Netlify placeholders are segment-based
# Source: data/weekly-reports.json
# VERIFIED: Weekly reports are flat (no per-report assets)
# Verification: find public/weekly-report-* -type f ! -name 'index.html' 2>/dev/null
# Include /* for safety (same pattern as archived posts)
/weekly-report-2021-09-27  https://archive.maguro.dev/weekly-report-2021-09-27/  301!
/weekly-report-2021-09-27/  https://archive.maguro.dev/weekly-report-2021-09-27/  301!
/weekly-report-2021-09-27/*  https://archive.maguro.dev/weekly-report-2021-09-27/:splat  301!
# ... (all 53 weekly reports: slug, slug/, slug/* variants each)

# Tag redirects: Zola romaji slugs → Astro Unicode slugs, archived-only tags → archive
# Source: src/content/blog/ tags + data/archived-tags.json
# Two rules per tag: with and without trailing slash
/tags/jing-ji-puroguramingu  /tags/競技プログラミング/  301
/tags/jing-ji-puroguramingu/  /tags/競技プログラミング/  301
/tags/weekly-report  https://archive.maguro.dev/tags/weekly-report/  301!
/tags/weekly-report/  https://archive.maguro.dev/tags/weekly-report/  301!
# ... (all tag mappings, both variants each)
```

---

## 4. Technology Stack

### Framework

- **Astro** (latest stable)
- Static site generation (SSG)
- Content Collections for blog posts

### Key Dependencies

- `astro` - Core framework
- `@astrojs/mdx` - MDX support for rich content
- `@astrojs/rss` - RSS feed generation
- `@astrojs/sitemap` - Sitemap generation
- `astro-pagefind` - Pagefind integration (handles indexing after build)
- `@pagefind/default-ui` - Pagefind search UI (inline dropdown)
- `rehype-katex` + `remark-math` - Math rendering (+ `katex` for CSS)
- `astro-expressive-code` - Code blocks with copy button, line numbers, language labels
- `remark-gfm` - GitHub Flavored Markdown (tables, autolinks, strikethrough, task lists)
- Custom `remark-inline-footnotes` plugin - Parses `^[...]` syntax into distinct `inlineFootnote` nodes
- Custom `remark-remove-gfm-footnotes` plugin - Strips GFM `footnoteDefinition`/`footnoteReference` nodes in remark phase (before rehype conversion)
- Custom `rehype-inline-footnotes-to-html` plugin - Converts inline footnote nodes to HTML
- `gray-matter` - Frontmatter parsing for build scripts (redirect generation)
- `html-entities` - HTML entity decoding for Zola tag extraction (e.g., `&amp;` → `&`)
- `tsx` - TypeScript execution for build scripts

### Hosting

- **Netlify** (same as current)
- Build command: `npm run link-cards:strict && npm run build` (validates cache then builds)
- Publish directory: `dist/`

### Astro Configuration

Key settings in `astro.config.mjs`:

```js
export default defineConfig({
  site: "https://maguro.dev", // Required for RSS, sitemap, canonical URLs
  trailingSlash: "always", // Enforce trailing slashes on all URLs
  integrations: [
    mdx(),
    sitemap(),
    pagefind(),
    expressiveCode(), // Code blocks with copy button, line numbers
  ],
  // ... other config
});
```

### Build Pipeline

The `npm run build` command runs the following in order:

1. `scripts/generate-redirects.ts` - generates weekly-report and tag redirects, merges with static redirects
2. `astro build` - builds the site
3. `astro-pagefind` - auto-indexes after build (configured in astro.config.mjs)

**Note**: `link-cards.ts` validation is handled separately via Netlify build command (`link-cards:strict`), not in `npm run build`, to avoid redundant runs.

```json
// package.json scripts
{
  "build": "tsx scripts/generate-redirects.ts && astro build",
  "refresh-link-cache": "tsx scripts/link-cards.ts --refresh",
  "link-cards:strict": "tsx scripts/link-cards.ts --strict",
  "test:redirects": "tsx scripts/smoke-test-redirects.ts",
  "test:archive-noindex": "tsx scripts/smoke-test-archive-noindex.ts"
}
```

**Note**: `link-cards.ts` is NOT in the `build` script. The Netlify build command runs `link-cards:strict` first (see Hosting section), so running it again would be redundant. Local dev uses `refresh-link-cache` manually as needed.

Note: Pagefind indexing is handled by `astro-pagefind` integration, not a separate script.

### Analytics

- **Cloudflare Web Analytics** (privacy-friendly, no cookies)

---

## 5. Design Specification

### Design Philosophy

- Between joshwcomeau.com (colorful, good typography) and blog.jim-nielsen.com (minimal)
- **No decorative animations** - clean, static design
  - Minimal UI transitions OK (e.g., dropdown fades, hover states)
  - No scroll animations, parallax, or loading animations
- Focus on readability and content

### Color Scheme

#### Light Mode

- Background: `#fafafa` or similar off-white
- Text: `#1a1a1a` (near black)
- Accent: Retain brand color `#c05b4d` (current rust/coral)
- Code background: Light gray `#f5f5f5`

#### Dark Mode

- Background: `#0d0d0d` or `#121212`
- Text: `#e5e5e5`
- Accent: Lighter variant of brand color
- Code background: `#1e1e1e`

### Typography

- Body: System font stack or clean sans-serif (Noto Sans JP for Japanese)
- Code: Monospace (JetBrains Mono, Fira Code, or system monospace)
- Base size: 16-18px
- Line height: 1.6-1.7 for readability

### Layout

- Max content width: 720-800px (current is 800px)
- Responsive breakpoints: Mobile (<768px), Desktop (≥768px)
- Generous whitespace

### Components

#### Header

- Site title/logo (left)
- Navigation links (right): Home, About, Event (links to event.maguro.dev)
- Inline search box (results as dropdown)
- Theme toggle (light/dark)

#### Homepage

- List of posts with:
  - Title (linked)
  - Date
  - Tags (linked)
  - Excerpt (first ~150 chars or custom description)

#### Blog Post

- Title
- Date and tags
- Table of Contents (auto-generated, collapsible on mobile)
- Content
- Footnotes (bottom of page, traditional style)

#### Footer

- Copyright
- RSS link
- Social links (optional)

---

## 6. Features Specification

### 6.1 Light/Dark Mode

- Default: Follow system preference (`prefers-color-scheme`)
- Manual toggle in header
- Persist preference in localStorage
- No flash on page load (inline script in `<head>`)
- **Emit `theme-changed` event** on toggle for components that need to react:

  ```js
  document.dispatchEvent(
    new CustomEvent("theme-changed", { detail: { theme: "dark" } }),
  );
  ```

  - Required by: Tweet embeds (re-render with new theme), potentially other dynamic components

### 6.2 Embeds

#### X (Twitter) Embeds

- Use `<Tweet id="xxx" />` component
- **Loading strategy**: Eager render on page load (not lazy)
  - Lazy loading conflicts with theme toggle re-rendering
  - Theme toggle re-renders ALL tweets to match new theme
  - Future optimization: Use IntersectionObserver to defer initial render until tweet is near viewport, but still re-render all visible tweets on theme change
- Support both light and dark themes
- **Theme toggle handling**: Twitter embeds use an iframe that doesn't auto-update on theme change
  - `window.twttr.widgets.load()` only renders NEW tweets, not already-rendered ones
  - **Correct approach**: Store original blockquote in `<template>`, clone on initial render AND theme toggle

    ```astro
    <!-- Tweet.astro (component) -->
    <div class="tweet-container" data-tweet-id={id}>
      <template class="tweet-template">
        <blockquote class="twitter-tweet" data-theme="light">
          <!-- Use twitter.com not x.com — widgets.js expects twitter.com URLs -->
          <a href={`https://twitter.com/i/web/status/${id}`}></a>
        </blockquote>
      </template>
      <div class="tweet-embed"></div>
    </div>
    ```

    ```astro
    <!-- BaseLayout.astro (global, once) — NOT in Tweet.astro to avoid duplication --><!-- Script runs after DOM ready (Astro bundled scripts default behavior) --><!-- Place at end of body, NOT in head, to ensure .tweet-container nodes exist -->
    <script>
      // Helper function to render tweets with current theme
      function renderTweets(theme) {
        document.querySelectorAll(".tweet-container").forEach((container) => {
          const template = container.querySelector(".tweet-template");
          const embedTarget = container.querySelector(".tweet-embed");
          if (template && embedTarget) {
            const clone = template.content.cloneNode(true);
            const blockquote = clone.querySelector("blockquote");
            if (blockquote) blockquote.dataset.theme = theme;
            embedTarget.innerHTML = "";
            embedTarget.appendChild(clone);
          }
        });
        // Guard: Only call if widgets.js is loaded
        if (window.twttr?.widgets) {
          window.twttr.widgets.load();
        }
      }

      // getCurrentTheme() must be attached to window (Astro scripts are modules by default)
      // Define in theme toggle script: window.getCurrentTheme = function() { ... }
      // Or use inline approach: const theme = document.documentElement.dataset.theme || 'light';
      function getCurrentTheme() {
        return document.documentElement.dataset.theme || "light";
      }

      // Initial render on page load (wait for widgets.js)
      if (window.twttr?.widgets) {
        renderTweets(getCurrentTheme());
      } else {
        // widgets.js not yet loaded; wait for it
        window.twttr = window.twttr || {};
        window.twttr.ready =
          window.twttr.ready ||
          function (fn) {
            window.twttr._e = window.twttr._e || [];
            window.twttr._e.push(fn);
          };
        window.twttr.ready(function () {
          renderTweets(getCurrentTheme());
        });
      }

      // On theme toggle: re-render with new theme
      document.addEventListener("theme-changed", function (e) {
        renderTweets(e.detail.theme);
      });
    </script>
    ```

  - **Script placement**: Tweet rendering script in `BaseLayout.astro` (once), NOT in `Tweet.astro`
    - Prevents duplicate listeners when multiple tweets on same page
  - **widgets.js loading**: Load `https://platform.twitter.com/widgets.js` in base layout (global, once)
  - **Why `<template>`**: Avoids HTML escaping issues with `data-*` attributes; template content is inert
  - Key: Twitter replaces blockquote with iframe; original must be preserved externally
  - Pass `data-theme` attribute matching current site theme (light/dark)
  - **Required: Debounce theme toggle** to prevent rapid re-renders:
    ```js
    let debounceTimer;
    document.addEventListener("theme-changed", function (e) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => renderTweets(e.detail.theme), 300);
    });
    ```
  - **Fallback for widgets.js failure** (network error, ad blocker):
    - If `window.twttr` is undefined after 5 seconds, show static blockquote link
    - The `<template>` content remains accessible as fallback
    ```js
    setTimeout(() => {
      if (!window.twttr?.widgets) {
        document.querySelectorAll(".tweet-embed:empty").forEach((el) => {
          el.innerHTML =
            '<p><a href="https://twitter.com/...">View tweet</a></p>';
        });
      }
    }, 5000);
    ```

#### YouTube Embeds

- Use `<YouTube id="xxx" />` component
- Responsive 16:9 aspect ratio
- Lazy load with facade/thumbnail

#### Link Cards (Auto-detect)

- Automatically convert standalone links (link on its own line) to rich cards
- Card displays:
  - Title (from OG/meta)
  - Description (from OG/meta)
  - Favicon
  - Domain name
- Fetch metadata at build time (not runtime)
- **Build reliability**:
  - Timeout: 5 seconds per URL
  - Cache: Store fetched metadata in `.link-card-cache.json` (committed to repo)
  - **Cache TTL**: 30 days - entries older than TTL are stale (but still usable)
    - Stale entries are ONLY refreshed when running `--refresh` flag
    - Regular builds use cached data as-is, even if stale (network resilience)
  - **Cache pruning**: Build script removes entries for URLs no longer in any published post
    - **Filter drafts**: Skip posts with `draft: true` when scanning for URLs
    - Prevents caching metadata for URLs only in unpublished drafts
  - On failure: Gracefully fall back to simple link (no build failure)
  - **Network resilience**: Default behavior uses cached data only (no network requests)
    - Fresh fetches ONLY happen with `--refresh` flag (explicit developer action)
    - This prevents transient network failures from breaking production deploys
  - **CI detection**: Check `process.env.CI` or `process.env.NETLIFY` environment variables
  - **Failure handling by mode**:
    - Local dev (`CI` not set): Use cached data as-is (no automatic refresh), log warnings for stale entries
      - Run `npm run refresh-link-cache` explicitly to update stale entries
      - This keeps local builds fast and network-free by default
    - CI/Netlify (`CI=true`) **without** `--strict`: Skip TTL refresh, fall back to plain links on missing, exit 0
      - This mode is NOT used in production (see below) — only for local testing with `CI=true`
    - `--refresh` flag: Force re-fetch all URLs (run locally before push to update cache)
    - `--strict` flag: Exit 1 on any missing cache entry (for validating cache completeness before deploy)
      - **This is the production mode**: Netlify build command uses `link-cards:strict`
      - Ensures no missing cache entries slip through to production
      - If strict fails, developer must run `npm run refresh-link-cache` and commit cache
    - **Summary of modes**:
      - Local dev: Cache-only, warns on stale/missing, exit 0
      - Netlify/production: Uses `--strict`, fails on missing, exit 1
      - Explicit refresh: Uses `--refresh`, fetches all URLs
- **Script**: `scripts/link-cards.ts`
  - **Important**: NOT part of `npm run build` — validation runs separately
    - Netlify: `link-cards:strict` runs via build command before `npm run build`
    - Local dev: Run `npm run refresh-link-cache` manually when adding new links
    - CI: Optional `link-cards:strict` step in GitHub Actions
  - `npm run refresh-link-cache` - force re-fetch all URLs (run locally before push)
  - `npm run link-cards:strict` - validate all URLs are cached
  - **CI enforcement**: Add `npm run link-cards:strict` to GitHub Actions workflow (required check)
    - Ensures all link cards have cached metadata before production deploy
    - Fails fast if author forgot to run `refresh-link-cache` after adding new links
    - Example workflow step:
      ```yaml
      - name: Validate link card cache
        run: npm run link-cards:strict
      ```
    - **Mandatory enforcement**: Production deploys MUST run strict check
      - **Primary**: Add `npm run link-cards:strict` to Netlify build command:
        ```toml
        # netlify.toml
        [build]
          command = "npm run link-cards:strict && npm run build"
        ```
      - This ensures every deploy validates cache, regardless of CI pipeline
      - GitHub Actions `link-cards:strict` is optional additional check

### 6.3 Footnotes

- **Primary syntax**: Inline footnotes (Pandoc-style): `^[footnote content here]`
  - No manual numbering required
  - Numbers auto-assigned in order of appearance **per article** (each post starts at 1)
- Rendered at bottom of article
- Backlinks to return to reference point
- Styled consistently with site theme
- **Implementation**:
  - Use custom remark plugin (`remark-inline-footnotes`) for `^[...]` inline footnotes
  - **Disable GFM footnotes**: Use `remark-gfm` (full bundle) + custom `remark-remove-gfm-footnotes`:
    - `remark-gfm` parses all GFM syntax including `[^1]` footnotes into mdast nodes
    - `remark-inline-footnotes` generates distinct node types (`inlineFootnote`, `inlineFootnoteDefinition`) to avoid collision
    - `remark-remove-gfm-footnotes` (custom ~20 lines) strips GFM `footnoteDefinition`/`footnoteReference` mdast nodes **before** rehype conversion (critical: must run in remark phase to prevent unwanted HTML generation)
      - **Build-time validation**: If any GFM footnote nodes are found, **fail the build** (not just warn)
        - Log error with file path and line number: "GFM footnote found at [file]:[line] - convert to inline ^[...] syntax"
        - Exit 1 to prevent deployment with missing content
        - This is safer than warnings which can be ignored
    - Separate rehype handler converts `inlineFootnote` nodes to HTML with proper numbering
  - Plugin order in Astro config: `remarkPlugins: [remarkInlineFootnotes, remarkGfm, remarkRemoveGfmFootnotes, remarkMath]`, `rehypePlugins: [rehypeInlineFootnotesToHtml, rehypeKatex]`
- **Migration note**: No existing posts use `[^1]` syntax, so conflicts are unlikely
  - If future content needs `[^1]` support, convert to inline `^[...]` syntax or update plugin
  - **Pre-migration audit**: Verify no preserved posts use GFM footnotes
    - Command: `grep -E '\[\^[0-9]+\]' content/*.md` (finds `[^1]`, `[^2]`, etc.)
    - If found: convert to inline `^[footnote text]` syntax before migration
    - This prevents silent content loss from `remark-remove-gfm-footnotes`

### 6.4 KaTeX / Math Support

- Inline math: `$...$`
- Block math: `$$...$$`
- Rendered at build time (no client-side JS)
- **Required CSS**: Import `katex/dist/katex.min.css` in base layout (rehype-katex only generates HTML, not styles)

### 6.5 Code Blocks

- **Use `astro-expressive-code`** (wraps Shiki with additional features)
  - Provides copy button, line numbers, and language label out of the box
  - Shiki alone doesn't include these UI features
- Theme matches site theme:
  - Light mode: `github-light` or similar
  - Dark mode: `github-dark` or `one-dark-pro`
- Line numbers (optional, enabled via ` ```js showLineNumbers`)
- Copy button (enabled by default)
- Language label (enabled by default)

### 6.6 Table of Contents

- Auto-generated from headings (h2, h3)
- Sticky sidebar on desktop (if space allows)
- Collapsible on mobile
- Highlight current section on scroll

### 6.7 Search

- Client-side search using **astro-pagefind** integration
- **No keyboard shortcuts** (to avoid conflicts with user-defined shortcuts)
- **UI implementation**:
  - `Search.astro` wraps `@pagefind/default-ui` component
  - Import Pagefind CSS: `import '@pagefind/default-ui/css/ui.css'`
  - **Client-side initialization** (required for interactivity):

    ```astro
    <!-- Search.astro component -->
    <div id="search"></div>
    <script>
      // Astro bundles this script and resolves bare imports
      // Runs after DOM is ready (Astro default behavior)
      import { PagefindUI } from "@pagefind/default-ui";
      new PagefindUI({ element: "#search", showSubResults: true });
    </script>
    ```

    - Note: Don't use `is:inline` — bare imports won't resolve in inline scripts
    - Astro's bundled scripts execute after DOM is ready by default

  - **Dev mode handling**: Pagefind index doesn't exist during `astro dev` (only after `astro build`)
    - The `PagefindUI` constructor will 404 on `/pagefind/pagefind.js` and show an error in console
    - **Note**: try/catch won't suppress async fetch errors from PagefindUI
    - **Required guard**: Check for dev mode before instantiation:
      ```js
      // Astro exposes import.meta.env.DEV for this
      if (!import.meta.env.DEV) {
        new PagefindUI({ element: "#search", showSubResults: true });
      } else {
        document.getElementById("search")?.remove(); // Hide search UI in dev
      }
      ```
    - This prevents noisy console errors and keeps dev environment clean
    - Production builds work normally since `astro-pagefind` runs after build
  - Inline search box in header (not a modal)
  - Results appear as dropdown below the search input
  - Override CSS variables to match site theme (light/dark mode)

- **How it works**:
  - Build time: `astro-pagefind` auto-indexes after `astro build` (configured in astro.config.mjs)
  - Runtime: 100% client-side, no server required
  - Loads index chunks on demand (~10KB base + chunks as needed)
- **Searches**:
  - Full article content (body text)
  - Titles
  - Tags
  - Headings
- **Exclusions** (via `data-pagefind-ignore` attribute):
  - Draft posts (`draft: true` in frontmatter)
  - Non-content pages (404, etc.)
  - Header and footer elements (to avoid repeated nav text in results)
  - Table of Contents sidebar
- **Japanese (CJK) tokenization**:
  - Pagefind uses a segmentation library for CJK text (no spaces between words)
  - Test search quality with actual Japanese content after build
  - If results are poor, consider Pagefind's `--force-language ja` option or custom segmenter
  - Most common Pagefind issues are with compound words; single-character searches work well

### 6.8 RSS Feed

- **Canonical URL**: `/rss.xml` (same as current Zola site for subscriber continuity)
- Redirect `/feed.xml` → `/rss.xml` if accessed
- **Trailing slash note**: `trailingSlash: 'always'` applies to HTML pages, not file endpoints
  - Astro outputs `/rss.xml` as a file, not `/rss.xml/index.html`
  - No `/rss.xml/` redirect needed (would be invalid RSS)
- **GUID stability for subscriber continuity**:
  - RSS `<guid>` should use old URL format (`https://maguro.dev/[slug]/`) not new `/blog/[slug]/`
  - This prevents feed readers from treating all posts as new after migration
  - `<link>` uses new URL; `<guid>` uses old URL (with `isPermaLink="false"`)
  - **Important**: `@astrojs/rss` ignores unknown fields like `guid` — use `customData` instead:

    ```js
    // rss.xml.ts
    import rss from "@astrojs/rss";

    // Note: In Astro content collections, use post.id or post.slug depending on config
    // Default is post.id (filename without extension)
    items: posts.map((post) => ({
      title: post.data.title,
      link: `https://maguro.dev/blog/${post.id}/`,
      pubDate: post.data.date,
      // Use customData for guid — @astrojs/rss ignores top-level guid
      customData: `<guid isPermaLink="false">https://maguro.dev/${post.id}/</guid>`,
    }));
    ```

  - **Verification**: After build, check RSS doesn't have duplicate `<guid>` tags:
    - `curl https://maguro.dev/rss.xml | grep '<guid>'` — should see exactly one per item
    - If `@astrojs/rss` auto-generates `<guid>`, the `customData` approach will create duplicates
    - Alternative: Use `link` as GUID (less ideal but simpler) if customData causes issues

- Include full content or excerpt
- Validate with W3C Feed Validator

### 6.9 Tags

- Display tags on each post
- Tag pages at `/tags/[tag]/` listing all posts with that tag
- Tag cloud or list on homepage/sidebar (optional)
- **URL normalization** (new Astro site):
  - **Shared `slugifyTag(tag: string)` function** in `src/utils/slugify.ts`:
    - Used by BOTH `getStaticPaths()` in `[tag].astro` AND `scripts/generate-redirects.ts`
    - This ensures tag page URLs and redirect targets always match
  - Rules:
    - **Unicode normalization**: Apply `tag.normalize('NFC')` first (prevents NFD/NFC mismatches across systems)
    - Lowercase ASCII: `Rust` → `rust`
    - Spaces → hyphens: `Weekly Report` → `weekly-report`
    - Japanese tags: kept as raw Unicode (e.g., `競技プログラミング`)
    - **Emoji/symbols**: Convert to text description or strip
      - `🚀` → `rocket`, `⭐` → `star`, `❤️` → `heart` (common emoji)
      - Or strip entirely: `Tag🚀Name` → `tagname`
      - **Build error** on unknown emoji to force explicit handling
      - This prevents unstable URLs from emoji variation selectors
    - **Special characters**: Encode rather than strip to prevent collisions
      - `+` → `plus` (e.g., `C++` → `c-plus-plus`)
      - `#` → `sharp` (e.g., `C#` → `c-sharp`)
      - `.` → `dot` (e.g., `.NET` → `dot-net`)
      - `&` → `and` (e.g., `C&A` → `c-and-a`)
    - **Fallback for other punctuation**: Use deterministic ASCII substitutions
      - `@` → `at`, `!` → `bang`, `*` → `star`, `^` → `caret`, `~` → `tilde`
      - `%` → `pct`, `$` → `dollar`, `=` → `eq`, `:` → `colon`, `;` → `semi`
      - **No percent-encoding**: Avoids double-encoding issues in Astro/Netlify
      - Any unhandled ASCII punctuation → build error (add explicit mapping)
      - This ensures predictable, route-safe slugs without encoding mismatches
    - **Unsafe characters** (removed entirely): `/`, `?`, `\`, control chars
      - These cannot be used in URL paths safely even when encoded
      - Note: `#` in tag NAMES (e.g., `C#`) is encoded to `sharp` per above rules
        - Only URL fragment `#` would be unsafe, but tags don't contain those
    - **Empty/degenerate slug detection**: Build fails if tag produces empty or invalid slug
      - e.g., tag `///` after removing unsafe chars → empty → error
      - e.g., tag consisting only of removed punctuation → empty → error
      - This prevents invalid `/tags//` routes
    - **Collision detection**: Build script fails with error if two different tags produce same slug
      - e.g., if both `C&A` and `C and A` exist → both would become `c-and-a` → error
      - Resolution: Rename one tag or add distinguishing suffix
      - **Reserved word collision**: Also check against route-reserved slugs:
        - Reserved: `index`, `rss`, `404`, `about`, `tags`, `blog`, `assets`, `_redirects`, `api`, `search`, `feed`, `sitemap`, `robots`
        - e.g., a tag named "RSS" → slug `rss` → collision with `/tags/rss/` special route
        - Build fails if any tag slug matches reserved words
      - **Note**: Collision detection requires global tag context (all tags from all posts)
        - Implemented in `scripts/generate-redirects.ts`, NOT in `slugifyTag()` itself
        - `slugifyTag()` is pure function; collision check is build-time validator
    - **Unit tests**: `slugifyTag()` should have comprehensive tests covering:
      - ASCII case normalization, space handling
      - Special character substitutions (`+`, `#`, `.`, `&`, etc.)
      - Japanese/Unicode passthrough with NFC normalization
      - Empty/degenerate input handling
    - **Integration tests** (separate from unit tests):
      - Collision detection across all tags (requires test fixtures)
      - Redirect smoke tests for slug normalization
  - Final URL: `/tags/${slugifyTag(tag)}/`
  - Display name preserved in UI (original case/spacing)
- **Existing Japanese tags in preserved posts**:
  - `競技プログラミング`, `マクロ`, `競プロ用のライブラリを Rust で作ってみたシリーズ`
- **Canonical form**: Unencoded Unicode
  - Old Zola URLs use romaji transliteration: `/tags/jing-ji-puroguramingu/`
  - New Astro URLs use Unicode: `/tags/競技プログラミング/`
  - Redirects map old romaji → new Unicode
  - **Encoding in `_redirects` file**: Use raw UTF-8 (not percent-encoded)
    - Netlify accepts UTF-8 in redirect rules and handles browser percent-encoding automatically
    - Example: `/tags/jing-ji-puroguramingu/  /tags/競技プログラミング/  301` (not `/%E7%AB%B6...`)
    - **Verification required**: Smoke test both raw and percent-encoded request paths
      - Raw UTF-8: `curl -I 'https://maguro.dev/tags/競技プログラミング/'`
      - Percent-encoded: `curl -I 'https://maguro.dev/tags/%E7%AB%B6%E6%8A%80%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0/'`
      - Both should return 200 (or 301 to normalized path)
      - **Smoke test script must test both forms**: Use raw string for display, `encodeURI()` for actual request
    - If Netlify requires percent-encoding, update `generate-redirects.ts` to emit encoded paths
- **Redirect generation** (in `scripts/generate-redirects.ts`):
  - Reads `public/_redirects.static` (manually maintained static redirects)
  - Reads `data/preserved-posts.json` (list of 13 preserved post slugs for redirect generation)
  - Reads `data/archived-tags.json` (list of tags that only exist in archived posts)
  - Reads `data/weekly-reports.json` (list of 53 weekly report slugs)
  - Reads `data/zola-tag-slugs.json` (tag name → Zola slug mapping, extracted from Zola build)
    - **NFC normalize all keys** on load: `Object.fromEntries(Object.entries(json).map(([k,v]) => [k.normalize('NFC'), v]))`
    - Same for `archived-tags.json` entries: normalize before comparison
    - Prevents NFD/NFC mismatches from dropping Japanese tag redirects
  - Scans all tags from `src/content/blog/` (preserved posts) using `gray-matter` for frontmatter parsing
    - Note: Cannot use `astro:content` APIs in standalone tsx script; uses direct file reads + gray-matter
    - **NFC normalize content tags**: Apply `.normalize('NFC')` to each tag from frontmatter
      - macOS may write tags as NFD; normalize before comparison with JSON sources
    - **Exact tag name matching required**: Tags in content must match `data/zola-tag-slugs.json` keys byte-for-byte (after NFC normalization)
      - If any tags are renamed, case-normalized, or modified during migration, their old URLs won't redirect
      - Before migration: Verify content tags exactly match Zola tag names
      - Command (portable, works on BSD/macOS and GNU):
        ```bash
        diff <(jq -r 'keys[]' data/zola-tag-slugs.json | sort) \
             <(grep '^tags:' src/content/blog/*.mdx | sed 's/.*tags: *\[//' | tr ',' '\n' | tr -d '[]"' | sed 's/^ *//' | sort -u)
        ```
    - **Filter drafts**: Skip posts with `draft: true` in frontmatter
      - Drafts shouldn't generate redirect rules (no published page to redirect to)
      - Draft-only tags shouldn't appear in tag redirects
  - **Zola tag URL format** (archive uses this):
    - **Source Zola slugs from build output** (do NOT reimplement transliteration):
      1. Run `zola build` on current site
      2. **Extraction method**: Parse `public/tags/*/index.html` files to get both:
         - **Slug**: directory name (e.g., `jing-ji-puroguramingu`)
         - **Tag name**: parse from `<h1>` in the HTML (preferred) or `<title>` with suffix stripping
           - `<h1>` typically contains just the tag name (e.g., "競技プログラミング")
           - `<title>` includes site suffix (e.g., "競技プログラミング - maguro.dev") — **must strip suffix**
           - Suffix pattern: ` - maguro.dev` or similar; use regex: `.replace(/ - maguro\.dev$/, '')`
           - **Normalization step**: Also strip common prefixes if present (e.g., "Tag: ", "タグ: ")
             - Regex: `.replace(/^(Tag:|タグ:)\s*/i, '')`
           - **Assertion**: Before running script, verify HTML shape matches expectations:
             - Check one tag page manually: `curl https://maguro.dev/tags/rust/ | grep -o '<h1>.*</h1>'`
             - If format differs, update extraction logic
         - **Decode HTML entities**: Use library like `he` or `html-entities` to decode `&amp;`, `&lt;`, etc.
           - e.g., `C &amp; A` in HTML → `C & A` in JSON
           - Without decoding, tag matching will fail for tags with special characters
         - Or parse Zola's `templates/taxonomy_list.html` context variable `{{ term.name }}` from build logs
      3. Store mapping in `data/zola-tag-slugs.json`: `{"競技プログラミング": "jing-ji-puroguramingu", ...}`
      4. **Script**: `scripts/extract-zola-tags.ts` — one-time run before migration
         - **Run in current Zola repo** (not Astro): Reads `public/tags/*/index.html` from Zola build output
         - Copy resulting `data/zola-tag-slugs.json` to new Astro repo
         - This script is NOT used post-migration; it's a pre-migration data extraction step
    - This ensures exact parity with existing URLs and avoids transliteration bugs
    - Examples from Zola output:
      - `競技プログラミング` → `jing-ji-puroguramingu`
      - `Weekly Report` → `weekly-report`
  - Generates redirect rules:
    - **Skip self-redirects**: If Zola slug === Astro slug (e.g., ASCII tags like `rust`), no redirect needed
      - Prevents 301 loops when old and new URLs are identical
      - Log info: "Skipping redirect for tag 'rust' (same slug)"
    - **Preserved tags** (tags used in preserved posts): old Zola slug → new Astro slug
      - e.g., `/tags/jing-ji-puroguramingu/` → `/tags/競技プログラミング/`
      - **Note**: If tag exists in both preserved AND archived posts, redirect goes to main site
        - This is intentional: main site is the canonical home for active content
        - Archived posts for that tag are accessible at archive.maguro.dev directly
      - **Behavior change acknowledgment**: Old tag pages showed ALL posts (preserved + archived)
        - New tag pages only show preserved posts; archived posts won't appear
        - This is acceptable: main site focuses on curated technical content
        - Users wanting full history can visit archive.maguro.dev
    - **Archived-only tags** (tags ONLY used in archived posts): redirect to archive with Zola slug
      - e.g., `/tags/weekly-report/` → `https://archive.maguro.dev/tags/weekly-report/`
  - Merges static + generated rules → writes to `public/_redirects`
  - Netlify reads `dist/_redirects` (copied from `public/` by Astro)
  - Runs as pre-build script (see Build Pipeline section)
  - **Validation** (runs at end of script):
    - **Preserved post existence check**: Verify every slug in `data/preserved-posts.json` maps to a non-draft content file in `src/content/blog/`
      - Exit 1 if any slug is missing or has `draft: true` (redirect would 301 to 404)
      - This catches accidental deletions or premature draft setting
    - **Duplicate source detection**: Verify no source path appears in both static and generated rules
      - Exit 1 on duplicates (first-match order could mask intended behavior)
      - Log which source paths conflict for debugging
    - Verify all entries in `data/preserved-posts.json` have redirect rules
    - Verify all entries in `data/weekly-reports.json` have redirect rules
    - Verify all entries in `data/archived-tags.json` have redirect rules
    - **Comprehensive tag coverage**: Verify every key in `data/zola-tag-slugs.json` is accounted for:
      - Either exists in current `src/content/blog/` tags (redirect to main site)
      - Or exists in `data/archived-tags.json` (redirect to archive)
      - Missing tags → exit 1 (indicates incomplete archived-tags.json or removed content)
      - This prevents silent 404s for old tag URLs
    - Exit 1 on any missing redirects to catch configuration drift early
  - **Auto-generate archived-tags.json** (optional helper):
    - `npm run generate-archived-tags`: Computes `zola-tag-slugs` keys minus current content tags
    - Useful for initial migration and periodic verification
  - **Tag redirect classification** (determines whether a tag needs a redirect):
    - **Source of truth**: `data/zola-tag-slugs.json` — if a tag exists here, Zola knew about it and old URLs exist
    - **Precedence**: Current content is AUTHORITATIVE over `archived-tags.json`
      - If a tag exists in both `src/content/blog/` AND `archived-tags.json`:
        - Current content wins → redirect to main site (not archive)
        - Log warning: "Tag 'X' in archived-tags.json but active in current content"
        - This is a stale entry; remove from archived-tags.json to fix
    - **Classification logic** (per tag found in `src/content/blog/`):
      1. **In zola-tag-slugs.json?** → Tag needs redirect (old Zola URL → new Astro URL)
         - Covers both preserved tags AND archived-only tags that get reused in new posts
         - If also in `archived-tags.json`, ignore archived-tags.json entry (current content wins)
      2. **NOT in zola-tag-slugs.json?** → New tag, no redirect needed (log info, continue)
         - Tag was created after migration; no old URL ever existed
    - **archived-tags.json processing** (after current content tags):
      - Only generate archive redirects for tags NOT in current content
      - Tags appearing in both are handled by current content logic above
    - This logic is robust to:
      - New posts using previously archived-only tags (correctly generates redirect to main)
      - Truly new tags (correctly skips redirect)
      - Stale archived-tags.json entries (warns but doesn't break)
    - **Validation**: Warn if a tag in `archived-tags.json` is found in current content (stale entry)

---

## 7. SEO & Meta

- Canonical URLs (using `site` from astro.config.mjs)
- Open Graph tags (title, description, image)
- Twitter Card tags
- JSON-LD structured data for articles
- Sitemap: `/sitemap-index.xml` (auto-generated by `@astrojs/sitemap`)
  - **Note**: `@astrojs/sitemap` generates `sitemap-index.xml` by default (not `sitemap.xml`)
  - Verify output filename matches `robots.txt` reference after first build
- robots.txt: Static file in `public/robots.txt`
  ```
  User-agent: *
  Allow: /
  Sitemap: https://maguro.dev/sitemap-index.xml
  ```

---

## 8. Project Structure (Astro)

```
/
├── public/
│   ├── favicon.ico
│   ├── robots.txt             # Robots directives (static file)
│   ├── img/
│   │   └── ogp.png
│   └── _redirects.static      # Static redirects (feed.xml, archived posts ONLY)
├── scripts/
│   ├── generate-redirects.ts        # Generates all redirects, merges with static
│   ├── link-cards.ts                # Link card cache management
│   ├── smoke-test-redirects.ts      # Post-deploy redirect verification
│   ├── smoke-test-archive-noindex.ts # Validates archive site noindex headers
│   └── extract-zola-tags.ts         # One-time: extracts tag→slug mapping from Zola build
├── data/
│   ├── preserved-posts.json   # List of 13 preserved post slugs (source of truth for redirects/canonicals)
│   │   # Format: ["async-recursion", "associated-type-vs-generic-type-in-trait", ...]
│   ├── archived-tags.json     # Tags that only exist in archived posts
│   │   # Format: ["Weekly Report", "OSS", ...]
│   ├── weekly-reports.json    # List of 53 weekly report slugs for redirect generation
│   │   # Format: ["weekly-report-2021-09-27", "weekly-report-2021-09-20", ...]
│   └── zola-tag-slugs.json    # Tag name → Zola slug mapping (extracted from Zola build)
│       # Format: {"競技プログラミング": "jing-ji-puroguramingu", "Rust": "rust", ...}
├── .link-card-cache.json      # Cached link card metadata
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ThemeToggle.astro
│   │   ├── PostList.astro
│   │   ├── TableOfContents.astro
│   │   ├── Search.astro
│   │   ├── Tweet.astro
│   │   ├── YouTube.astro
│   │   └── LinkCard.astro
│   ├── content/
│   │   ├── config.ts          # Content collection schema
│   │   └── blog/
│   │       ├── async-recursion.mdx   # Use .mdx for Astro component support
│   │       └── ... (13 posts, all .mdx for Tweet/YouTube/LinkCard embeds)
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── PostLayout.astro
│   ├── pages/
│   │   ├── index.astro        # Homepage
│   │   ├── about.astro        # About page
│   │   ├── 404.astro          # Not found page
│   │   ├── blog/
│   │   │   └── [slug].astro    # Single segment, not catch-all
│   │   ├── tags/
│   │   │   ├── index.astro    # All tags
│   │   │   └── [tag].astro    # Posts by tag
│   │   └── rss.xml.ts         # RSS feed
│   ├── styles/
│   │   └── global.css
│   └── utils/
│       └── slugify.ts          # Shared slugifyTag() used by pages and scripts
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── netlify.toml
```

---

## 9. Migration Checklist

### Phase 1: Setup

- [ ] Initialize new Astro project
- [ ] Configure TypeScript
- [ ] Set up content collections
- [ ] Install dependencies (MDX, RSS, KaTeX, etc.)

### Phase 2: Design & Layout

- [ ] Create base layout with theme support
- [ ] Build header component with navigation
- [ ] Build footer component
- [ ] Implement light/dark mode toggle
- [ ] Set up global styles and CSS variables

### Phase 3: Core Pages

- [ ] Homepage with post list
- [ ] Blog post template with ToC
- [ ] About page
- [ ] Tag pages
- [ ] 404 page

### Phase 4: Features

- [ ] Implement embed components (Tweet, YouTube, LinkCard)
- [ ] Set up KaTeX rendering
- [ ] Configure syntax highlighting themes
- [ ] Add footnote styling
- [ ] Implement search with Pagefind
- [ ] Generate RSS feed

### Phase 5: Content Migration

- [ ] Copy 13 preserved posts to new structure
- [ ] Update frontmatter format for Astro
- [ ] **Audit and convert Zola shortcodes to MDX components**:
  - Scan preserved posts for Zola shortcodes (list all 13 slugs explicitly):
    ```bash
    grep -rE '\{\{.*%.*%.*\}\}' content/async-recursion.md content/associated-type-vs-generic-type-in-trait.md \
      content/btree-maximum-value.md content/cargo-snippet-pr.md content/chmin-chmax-macro.md \
      content/coc-pairs-cursor.md content/debug-macro.md content/hashmap-value-i32.md \
      content/rust-dbg-in-release.md content/rust-itertools-join.md content/rust-std-fs-copy.md \
      content/rustup-noninteractively.md content/shinjuku-rs-10.md
    ```
  - Common Zola shortcodes to convert:
    - `{% youtube(id="xxx") %}` → `<YouTube id="xxx" />`
    - Tweet embeds (if any) → `<Tweet id="xxx" />`
    - `{% figure(src="...", alt="...") %}` → Markdown image or custom component
  - MDX requires all components to be imported or globally available
  - Build will fail on unconverted shortcodes (good: catches issues early)
- [ ] Fix any broken internal links
  - **Internal links to archived posts**: If a preserved post links to an archived post:
    - Option A: Keep as `/archived-slug/` — redirects to archive (acceptable, adds one hop)
    - Option B: Rewrite to `https://archive.maguro.dev/archived-slug/` (direct, no redirect)
    - Recommendation: Option A (simpler, redirects handle it correctly)
- [ ] Verify images are copied and paths updated
  - **Asset path strategy**: Copy assets to `public/blog/[slug]/` to match redirect targets
  - e.g., old `/async-recursion/image.png` → `public/blog/async-recursion/image.png`
  - This ensures `/:slug/*` redirects resolve correctly
- [ ] **Audit global/shared assets (preserved posts)** — **Run in Zola repo before migration**:
  - Scan preserved posts for references to `/img/*`, `/static/*`, `/assets/*`
  - **Patterns to check** (HTML, Markdown, CSS):
    - HTML: `src="/img/..."`, `href="/assets/..."`
    - Markdown images: `![alt](/img/...)`, `![](/static/...)`
    - CSS: `url(/img/...)`, `url('/assets/...')`
  - Command (run in Zola repo): `grep -rE '(src=["'\'']?|!\[.*\]\(|url\(['\''"]?)/(img|static|assets)/' content/{async-recursion,associated-type,...}.md`
  - If found: copy assets to new Astro repo's `public/blog/[slug]/` or `public/assets/[slug]/` and update paths
  - Ensures old asset URLs work via `/:slug/*` redirects
- [ ] **Audit global/shared assets (archived posts)** — **Run in Zola repo before migration**:
  - Scan all archived posts for references to `/img/*`, `/static/*`, `/assets/*`
  - **Patterns to check**: Same as preserved posts (HTML src, Markdown images, CSS url)
  - Command (run in Zola repo): `grep -rE '(src=["'\'']?|!\[.*\]\(|url\(['\''"]?)/(img|static|assets)/' content/ | grep -v preserved-post-slugs`
  - **Concrete strategy**: Scope asset redirects carefully to avoid colliding with new site assets:
    - **DO NOT use global `/img/*` or `/static/*` redirects** — these would hijack new site assets (e.g., `public/img/ogp.png`)
    - Instead, add explicit redirects for specific archived post asset paths found during audit
    - Example (if archived posts reference `/img/laravel-logo.png`):
      ```
      /img/laravel-logo.png  https://archive.maguro.dev/img/laravel-logo.png  301!
      ```
    - **Alternative**: Move new site assets to `/assets/` (not `/img/`) to avoid collision, then use global `/img/*` redirect
      - Requires updating all references in new site to use `/assets/`
    - Archive site already has all assets (frozen Zola copy)
    - Only exception: preserved post assets should be copied to new site (handled separately)
- [ ] Generate `data/archived-tags.json`:
  - Extract all tags from current Zola site
  - Remove tags that exist in preserved posts
  - Result: tags like `OSS`, `Weekly Report`, etc. that need archive redirects
  - **Maintenance note**: If a new post reuses an archived-only tag:
    - Remove that tag from `archived-tags.json` (it's now a preserved tag)
    - This changes redirect from archive → main site
    - Rare scenario; manual update is acceptable
- [ ] Generate `data/weekly-reports.json`:
  - List all 53 weekly report slugs (e.g., `weekly-report-2021-09-27`)
  - Used by redirect generator to create explicit redirect rules
- [ ] Generate `data/zola-tag-slugs.json`:
  - Run `zola build` on current site
  - Extract tag name → slug mappings from `public/tags/*/` directory names
  - Store as JSON: `{"競技プログラミング": "jing-ji-puroguramingu", ...}`
  - Required for old tag URL → new tag URL redirects

### Phase 6: Redirects & Archive

- [ ] Create new repo `magurotuna/archive.maguro.dev`
- [ ] Copy current Zola site to archive repo
- [ ] Configure Netlify to deploy archive repo to `archive.maguro.dev`
- [ ] Create comprehensive `_redirects` file for main site
- [ ] Create `scripts/smoke-test-redirects.ts`:
  - Reads all data JSON files (preserved-posts, weekly-reports, archived-tags, zola-tag-slugs)
  - **Also parses `public/_redirects.static`** to test static redirects (feed.xml, archived posts)
  - **Skip self-redirects**: Don't test redirects where source === target (e.g., ASCII tags like `rust`)
    - These are intentionally omitted from `_redirects` to avoid 301 loops
    - Smoke test should mirror `generate-redirects.ts` skip logic
  - **Splat redirect testing**: For `/:slug/*` rules, test only the base path (no splat)
    - e.g., for `/async-recursion/*` rule, test `/async-recursion/` only
    - Actual asset paths are unknown; base path redirect proves rule works
    - Alternatively: Maintain `data/known-asset-paths.json` for concrete asset tests (optional)
  - For each expected redirect, makes HTTP request to deployed site
    - **Try HEAD first, fall back to GET**: Some CDN/Netlify setups handle HEAD differently or omit Location header
    - Example logic:
      ```ts
      let res = await fetch(url, { method: "HEAD", redirect: "manual" });
      if (res.status !== 301 && res.status !== 302) {
        res = await fetch(url, { method: "GET", redirect: "manual" });
      }
      ```
    - This reduces false negatives from HEAD-specific CDN behavior
  - **Unicode URL encoding**: Use `encodeURI()` for full paths or `encodeURIComponent()` per segment
    - e.g., `/tags/競技プログラミング/` → `/tags/%E7%AB%B6%E6%8A%80...`
    - Node's `fetch`/`http` modules require properly encoded URLs
  - Verifies 301 status and correct Location header
  - Reports pass/fail summary with specific failures listed
  - Run: `npm run test:redirects -- --url=https://maguro.dev` (or deploy preview URL)
  - **CI integration**: Run smoke tests on deploy previews via GitHub Actions:
    ```yaml
    # Runs after Netlify deploy preview is ready
    - name: Smoke test redirects
      run: npm run test:redirects -- --url=${{ steps.netlify.outputs.deploy_url }}
    ```
  - This catches redirect regressions before production deploy
- [ ] Test all redirect rules using smoke test script

### Phase 7: Polish & Deploy

- [ ] Add Cloudflare Analytics
- [ ] SEO optimization (meta tags, sitemap, robots.txt)
- [ ] Performance audit (Lighthouse)
- [ ] Cross-browser testing
- [ ] Deploy to production

---

## 10. Post Frontmatter Schema (Astro)

```yaml
---
title: "Post Title"
description: "Brief description for SEO and excerpts"
date: 2020-08-22
tags: ["Rust", "async"]
draft: false
---
```

### Draft Handling

Drafts (`draft: true`) are excluded from:

- **Page generation**: Filter in `getStaticPaths()` and `getCollection()`
  ```ts
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  ```
- **RSS feed**: Same filter applied in `rss.xml.ts`
- **Search index**: `data-pagefind-ignore` attribute on draft pages
- **Homepage listing**: Filtered in index.astro query

---

## 11. Decisions Summary

| Question          | Decision                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Posts to preserve | 13 Rust/tech posts (listed above)                                                                |
| Archive setup     | Separate repo `magurotuna/archive.maguro.dev` with frozen Zola site                              |
| URL structure     | /blog/[slug]/ with redirects                                                                     |
| Design style      | Clean, between joshwcomeau and jim-nielsen, no decorative animations (minimal UI transitions OK) |
| Homepage layout   | List with excerpts                                                                               |
| Footnotes         | Inline `^[...]` syntax (Pandoc-style), rendered at bottom                                        |
| Analytics         | Cloudflare Web Analytics                                                                         |
| Language          | Japanese only                                                                                    |
| Code theme        | Match site theme (light/dark)                                                                    |
| Tags              | Keep with dedicated tag pages                                                                    |
| Link cards        | Auto-detect standalone links                                                                     |
| Search            | Pagefind, inline dropdown (not modal), no keyboard shortcuts                                     |

---

## 12. Migration Day Checklist

### Pre-Migration (Day Before)

- [ ] **Content freeze**: Stop publishing new posts on Zola site
  - Any posts published after this point could be lost
  - Announce freeze date internally if applicable
- [ ] Verify archive.maguro.dev is deployed and accessible
- [ ] Run full smoke test suite on staging/preview deployment
- [ ] Backup current Zola `public/` output (for rollback)
- [ ] Verify DNS TTL is low enough for quick propagation (recommend 300s)

### Migration Day

1. [ ] Final `zola build` and snapshot of production site
2. [ ] Deploy archive.maguro.dev with frozen Zola content
3. [ ] Verify archive site: noindex headers, canonical tags, all posts accessible
4. [ ] Deploy new Astro site to maguro.dev
5. [ ] Run `npm run test:redirects -- --url=https://maguro.dev`
6. [ ] Verify RSS feed: `curl https://maguro.dev/rss.xml | head -50`
7. [ ] Test key preserved post URLs manually
8. [ ] Test one archived post redirect manually
9. [ ] Monitor for 404s in Netlify analytics (first hour)

### Rollback Plan

If critical issues are discovered post-deploy:

1. **Immediate (< 1 hour)**: Revert Netlify deploy to previous production
   - Netlify keeps deploy history; one-click rollback in dashboard
2. **DNS-level**: Point maguro.dev to archive.maguro.dev temporarily
   - Only if Netlify rollback fails
3. **Artifacts to preserve for rollback**:
   - Last Zola `public/` build output (zip and store)
   - `netlify.toml` and `config.toml` from Zola site
   - Keep for at least 2 weeks post-migration

### Post-Migration Verification

- [ ] Submit new sitemap to Google Search Console
- [ ] Verify RSS feed in a feed reader
- [ ] Check search works with Japanese queries
- [ ] Monitor 404 logs for first week
- [ ] Remove content freeze after 48 hours of stable operation

---

## Summary

This renovation will transform maguro.dev from a Zola-based blog with 71 posts into a modern, focused Astro site with 13 high-quality technical posts. The design will be clean and readable with full dark mode support. Rich features like embeds, link cards, search, and math support will enhance the reading experience. All existing post URLs will be properly redirected to prevent dead links. Removed pages (About-en, Apps) will return 404.
