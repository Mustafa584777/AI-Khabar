/**
 * Tag Canonicalization, Anti-Duplicate & Anti-Similarity Normalization Engine
 * Ensures tags like "bike prompt", "bike photo prompt", "bike image prompt", "bike Prompts", "bikes"
 * are all strictly unified and deduplicated into a single, clean canonical root tag ("Bike").
 */

export function canonicalizeTag(rawTag: string): string {
  if (!rawTag || typeof rawTag !== 'string') return '';
  let tag = rawTag.trim().replace(/^#+/, '').trim();
  if (!tag) return '';

  // Remove surrounding quotes, brackets, and extra punctuation
  tag = tag.replace(/^["'\[`]+|["'\]`]+$/g, '').trim();

  // Normalize multiple spaces
  tag = tag.replace(/\s+/g, ' ');

  // Remove common leading prompt prefixes (case-insensitive)
  tag = tag.replace(
    /^(ai\s+prompt\s+(for|of)|photo\s+prompt\s+(for|of)|image\s+prompt\s+(for|of)|picture\s+of|photo\s+of|image\s+of|prompt\s+for|prompts\s+for)\s+/i,
    ''
  );

  // Remove common trailing prompt suffixes
  tag = tag.replace(
    /\s+(photo\s+prompts?|photos\s+prompts?|image\s+prompts?|images\s+prompts?|picture\s+prompts?|ai\s+prompts?|midjourney\s+prompts?|chatgpt\s+prompts?|gemini\s+prompts?|prompts?|prompting)$/i,
    ''
  );

  // Remove trailing media slop like "photo", "photos", "images" (except established style phrases like Street Photography)
  if (!/^(street|macro|fashion|wildlife|portrait|landscape|night|drone|aerial|fine\s+art)\s+photography$/i.test(tag)) {
    tag = tag.replace(/\s+(photos?|photograph|images?|pictures?|wallpapers?)$/i, '');
  }

  // Singularize common trailing plural nouns (e.g., "bikes" -> "bike", "portraits" -> "portrait")
  const words = tag.split(' ');
  const lastWord = words[words.length - 1];
  if (
    lastWord &&
    lastWord.length > 3 &&
    lastWord.endsWith('s') &&
    !lastWord.endsWith('ss') &&
    !lastWord.endsWith('us') &&
    !lastWord.endsWith('is') &&
    !lastWord.endsWith('as')
  ) {
    const singular = lastWord.slice(0, -1);
    const nonSingulars = ['glass', 'cloth', 'serie', 'specie', 'stat', 'new', 'lens'];
    if (!nonSingulars.includes(singular.toLowerCase())) {
      words[words.length - 1] = singular;
      tag = words.join(' ');
    }
  }

  tag = tag.trim();
  if (!tag || tag.length < 2) return '';

  // Clean title-casing
  return tag
    .split(' ')
    .map((word) => {
      const upper = word.toUpperCase();
      if (['3D', '8K', '4K', 'HD', 'UHD', 'AI', 'CGI', 'HDR', 'RAW', 'DSLR', 'B&W'].includes(upper)) {
        return upper;
      }
      if (word.length <= 2 && ['in', 'on', 'at', 'to', 'of', 'by', 'an', 'a', 'vs'].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Deduplicate an array of tags, removing similar & duplicate variants
 */
export function cleanTagsArray(tags: (string | undefined | null)[]): string[] {
  if (!Array.isArray(tags)) return [];
  const seenRoots = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    if (!raw) continue;
    const canonical = canonicalizeTag(String(raw));
    if (!canonical) continue;

    // Strict alphanumeric root key for similarity collision check
    // e.g. "Bike", "bike", "bikes" all resolve to "bike"
    const rootKey = canonical.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!rootKey) continue;

    if (!seenRoots.has(rootKey)) {
      seenRoots.add(rootKey);
      result.push(canonical);
    }
  }

  return result;
}

/**
 * Calculate popular tags dynamically from an array of published posts
 */
export function getDynamicPopularTags(
  posts: { status?: string; tags?: string[] }[],
  limit = 8
): string[] {
  const tagCountMap: Record<string, { count: number; canonical: string }> = {};

  posts.forEach((post) => {
    if (post.status === 'published' && Array.isArray(post.tags)) {
      const cleanPostTags = cleanTagsArray(post.tags);
      cleanPostTags.forEach((tag) => {
        const rootKey = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (rootKey) {
          if (!tagCountMap[rootKey]) {
            tagCountMap[rootKey] = { count: 0, canonical: tag };
          }
          tagCountMap[rootKey].count += 1;
        }
      });
    }
  });

  const sorted = Object.values(tagCountMap)
    .sort((a, b) => b.count - a.count)
    .map((item) => item.canonical);

  if (sorted.length > 0) {
    return sorted.slice(0, limit);
  }

  return ['Hyperrealistic', 'Portrait', 'Minimalist', 'Lifestyle', 'Aesthetic', 'Cinematic', 'Street Photography'];
}
