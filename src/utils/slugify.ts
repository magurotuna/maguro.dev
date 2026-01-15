/**
 * Slugify a tag name for use in URLs.
 *
 * Rules:
 * - Unicode normalization: Apply NFC first
 * - Lowercase ASCII: 'Rust' → 'rust'
 * - Spaces → hyphens: 'Weekly Report' → 'weekly-report'
 * - Japanese tags: kept as raw Unicode (e.g., '競技プログラミング')
 * - Special characters are converted to text:
 *   - '+' → 'plus' (e.g., 'C++' → 'c-plus-plus')
 *   - '#' → 'sharp' (e.g., 'C#' → 'c-sharp')
 *   - '.' → 'dot' (e.g., '.NET' → 'dot-net')
 *   - '&' → 'and' (e.g., 'C & A' → 'c-and-a')
 * - Unsafe characters removed: '/', '?', '\', control chars
 */
export function slugifyTag(tag: string): string {
  // NFC normalization
  let slug = tag.normalize("NFC");

  // Replace special characters with text equivalents
  const replacements: [string | RegExp, string][] = [
    [/\+/g, "-plus-"],
    [/#/g, "-sharp-"],
    [/\./g, "-dot-"],
    [/&/g, "-and-"],
    [/@/g, "-at-"],
    [/!/g, "-bang-"],
    [/\*/g, "-star-"],
    [/\^/g, "-caret-"],
    [/~/g, "-tilde-"],
    [/%/g, "-pct-"],
    [/\$/g, "-dollar-"],
    [/=/g, "-eq-"],
    [/:/g, "-colon-"],
    [/;/g, "-semi-"],
  ];

  for (const [pattern, replacement] of replacements) {
    slug = slug.replace(pattern, replacement);
  }

  // Remove unsafe characters
  slug = slug.replace(/[/?\\]/g, "");
  // Remove control characters
  slug = slug.replace(/[\x00-\x1f\x7f]/g, "");

  // Convert spaces to hyphens
  slug = slug.replace(/\s+/g, "-");

  // Lowercase ASCII only (preserve non-ASCII case)
  slug = slug.replace(/[A-Z]/g, (char) => char.toLowerCase());

  // Clean up multiple consecutive hyphens
  slug = slug.replace(/-+/g, "-");

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, "");

  // Check for empty or degenerate slug
  if (!slug || slug === "-") {
    throw new Error(`Tag "${tag}" produces empty or invalid slug`);
  }

  return slug;
}
