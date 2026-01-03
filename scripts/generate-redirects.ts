/**
 * Generates the _redirects file for Netlify by merging static redirects
 * with generated redirects for preserved posts, weekly reports, and tags.
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

// Import slugify function - use relative path for tsx execution
const slugifyTagModule = await import('../src/utils/slugify.js');
const { slugifyTag } = slugifyTagModule;

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'blog');

// Load JSON data files
function loadJson<T>(filename: string): T {
  const filepath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

// Read all tags from blog content
function getContentTags(): Set<string> {
  const tags = new Set<string>();

  if (!fs.existsSync(CONTENT_DIR)) {
    console.warn(`Content directory ${CONTENT_DIR} does not exist yet`);
    return tags;
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const { data } = matter(content);

    // Skip drafts
    if (data.draft) continue;

    // Normalize tags and add to set
    if (Array.isArray(data.tags)) {
      for (const tag of data.tags) {
        tags.add(String(tag).normalize('NFC'));
      }
    }
  }

  return tags;
}

function main() {
  // Load data
  const preservedPosts = loadJson<string[]>('preserved-posts.json');
  const weeklyReports = loadJson<string[]>('weekly-reports.json');
  const archivedTags = loadJson<string[]>('archived-tags.json').map((t) => t.normalize('NFC'));
  const zolaTagSlugs = loadJson<Record<string, string>>('zola-tag-slugs.json');

  // Normalize zola tag slug keys
  const normalizedZolaTagSlugs: Record<string, string> = {};
  for (const [key, value] of Object.entries(zolaTagSlugs)) {
    normalizedZolaTagSlugs[key.normalize('NFC')] = value;
  }

  // Get current content tags
  const contentTags = getContentTags();

  // Read static redirects
  const staticRedirectsPath = path.join(PUBLIC_DIR, '_redirects.static');
  let staticRedirects = '';
  if (fs.existsSync(staticRedirectsPath)) {
    staticRedirects = fs.readFileSync(staticRedirectsPath, 'utf-8');
  }

  const generatedRules: string[] = [];

  // Generate preserved post redirects
  generatedRules.push('# Preserved posts: old URL → new /blog/ URL');
  for (const slug of preservedPosts) {
    generatedRules.push(`/${slug}  /blog/${slug}/  301!`);
    generatedRules.push(`/${slug}/  /blog/${slug}/  301!`);
    generatedRules.push(`/${slug}/*  /blog/${slug}/:splat  301!`);
  }

  // Generate weekly report redirects
  generatedRules.push('');
  generatedRules.push('# Weekly reports: redirect to archive subdomain');
  for (const slug of weeklyReports) {
    generatedRules.push(`/${slug}  https://archive.maguro.dev/${slug}/  301!`);
    generatedRules.push(`/${slug}/  https://archive.maguro.dev/${slug}/  301!`);
    generatedRules.push(`/${slug}/*  https://archive.maguro.dev/${slug}/:splat  301!`);
  }

  // Generate tag redirects
  generatedRules.push('');
  generatedRules.push('# Tag redirects: Zola slugs → Astro slugs or archive');

  const processedTags = new Set<string>();

  // Process tags from current content (redirect to main site)
  for (const tag of contentTags) {
    const zolaSlug = normalizedZolaTagSlugs[tag];
    if (!zolaSlug) {
      // New tag, no redirect needed
      console.log(`Info: Tag "${tag}" is new (not in zola-tag-slugs.json), skipping redirect`);
      continue;
    }

    const astroSlug = slugifyTag(tag);

    // Skip self-redirects (e.g., ASCII tags where slug doesn't change)
    if (zolaSlug === astroSlug) {
      console.log(`Info: Skipping redirect for tag "${tag}" (same slug: ${zolaSlug})`);
      processedTags.add(tag);
      continue;
    }

    // Warn if tag is in archived-tags but also in content
    if (archivedTags.includes(tag)) {
      console.warn(`Warning: Tag "${tag}" in archived-tags.json but active in current content`);
    }

    generatedRules.push(`/tags/${zolaSlug}  /tags/${astroSlug}/  301`);
    generatedRules.push(`/tags/${zolaSlug}/  /tags/${astroSlug}/  301`);
    processedTags.add(tag);
  }

  // Process archived-only tags (redirect to archive)
  for (const tag of archivedTags) {
    if (processedTags.has(tag)) {
      continue; // Already handled above
    }

    const zolaSlug = normalizedZolaTagSlugs[tag];
    if (!zolaSlug) {
      console.warn(`Warning: Archived tag "${tag}" not found in zola-tag-slugs.json`);
      continue;
    }

    generatedRules.push(`/tags/${zolaSlug}  https://archive.maguro.dev/tags/${zolaSlug}/  301!`);
    generatedRules.push(`/tags/${zolaSlug}/  https://archive.maguro.dev/tags/${zolaSlug}/  301!`);
    processedTags.add(tag);
  }

  // Merge static and generated redirects
  const finalRedirects = [staticRedirects.trim(), '', ...generatedRules].join('\n');

  // Write to public/_redirects
  const outputPath = path.join(PUBLIC_DIR, '_redirects');
  fs.writeFileSync(outputPath, finalRedirects + '\n');

  console.log(`Generated ${outputPath}`);
  console.log(`  - ${preservedPosts.length} preserved post redirects`);
  console.log(`  - ${weeklyReports.length} weekly report redirects`);
  console.log(`  - ${processedTags.size} tag redirects`);

  // Validation
  let hasErrors = false;

  // Check all preserved posts have content files (if content dir exists)
  if (fs.existsSync(CONTENT_DIR)) {
    for (const slug of preservedPosts) {
      const mdxPath = path.join(CONTENT_DIR, `${slug}.mdx`);
      const mdPath = path.join(CONTENT_DIR, `${slug}.md`);
      if (!fs.existsSync(mdxPath) && !fs.existsSync(mdPath)) {
        console.error(`Error: Preserved post "${slug}" has no content file`);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

main();
