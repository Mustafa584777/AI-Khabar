import { PromptPost } from '@/types/prompt';

// Multilingual, Hinglish, typo & synonym map for AI prompts
const SYNONYM_DICTIONARY: Record<string, string[]> = {
  // Saree / Traditional / Indian outfits
  'sadi': ['saree', 'sari', 'traditional', 'indian', 'ethnic', 'silk', 'zari', 'gold', 'drape', 'lehenga', 'desi', 'fashion'],
  'sadiyan': ['saree', 'sari', 'traditional', 'indian', 'ethnic', 'silk'],
  'saadi': ['saree', 'sari', 'traditional', 'indian', 'ethnic', 'silk'],
  'shadi': ['wedding', 'marriage', 'bridal', 'groom', 'saree', 'lehenga', 'sherwani', 'traditional', 'celebration'],
  'shaadi': ['wedding', 'marriage', 'bridal', 'groom', 'saree', 'lehenga', 'sherwani', 'traditional'],
  'saree': ['saree', 'sari', 'indian', 'ethnic', 'traditional', 'silk', 'zari', 'fashion', 'portrait'],
  'sari': ['saree', 'sari', 'indian', 'ethnic', 'traditional', 'silk', 'zari'],
  'tradishnal': ['traditional', 'ethnic', 'cultural', 'heritage', 'classic', 'indian', 'vintage', 'folk'],
  'tradisanl': ['traditional', 'ethnic', 'cultural', 'heritage', 'classic', 'indian'],
  'traditional': ['traditional', 'ethnic', 'cultural', 'heritage', 'classic', 'vintage', 'desi'],
  'ethnic': ['ethnic', 'traditional', 'cultural', 'indian', 'desi', 'heritage', 'saree'],
  'desi': ['indian', 'south asian', 'traditional', 'ethnic', 'saree', 'kurti', 'lehenga', 'desi'],
  'indian': ['indian', 'south asian', 'desi', 'traditional', 'saree', 'lehenga', 'hindu', 'bollywood'],
  'lehenga': ['lehenga', 'lehnga', 'choli', 'bridal', 'ethnic', 'traditional', 'indian', 'wedding'],
  'lehnga': ['lehenga', 'choli', 'bridal', 'ethnic', 'traditional', 'indian', 'wedding'],
  'kurti': ['kurti', 'kurta', 'ethnic', 'indian', 'traditional', 'dress'],
  'sherwani': ['sherwani', 'groom', 'menswear', 'royal', 'traditional', 'indian', 'wedding'],
  'bridal': ['bridal', 'bride', 'wedding', 'jewelry', 'mehendi', 'dulhan', 'saree', 'lehenga'],
  'dulhan': ['bridal', 'bride', 'wedding', 'saree', 'lehenga', 'mehendi', 'traditional', 'indian'],
  'dulha': ['groom', 'wedding', 'sherwani', 'traditional', 'indian'],

  // Gender & Subjects
  'ladki': ['woman', 'girl', 'female', 'model', 'portrait', 'lady', 'feminine', 'beauty'],
  'kudi': ['woman', 'girl', 'female', 'model', 'portrait', 'lady'],
  'aurat': ['woman', 'female', 'lady', 'mother', 'portrait'],
  'nari': ['woman', 'female', 'lady', 'divine', 'portrait'],
  'girl': ['girl', 'woman', 'female', 'model', 'portrait', 'lady'],
  'woman': ['woman', 'girl', 'female', 'model', 'portrait', 'lady'],
  'female': ['female', 'woman', 'girl', 'model', 'portrait', 'lady'],
  'ladka': ['man', 'boy', 'male', 'guy', 'model', 'portrait', 'masculine'],
  'munda': ['man', 'boy', 'male', 'guy', 'model', 'portrait'],
  'aadmi': ['man', 'male', 'gentleman', 'portrait'],
  'purush': ['man', 'male', 'masculine', 'portrait'],
  'boy': ['boy', 'man', 'male', 'guy', 'model', 'portrait'],
  'man': ['man', 'boy', 'male', 'guy', 'model', 'portrait', 'masculine'],
  'couple': ['couple', 'romantic', 'love', 'together', 'duo', 'two people', 'lovers', 'picnic'],
  'jodi': ['couple', 'romantic', 'love', 'together', 'duo', 'lovers'],

  // Vehicles & Machines
  'gadi': ['car', 'supercar', 'vehicle', 'automotive', 'bmw', 'suv', 'wagon', 'fortuner', 'thar'],
  'gaadi': ['car', 'supercar', 'vehicle', 'automotive', 'bmw', 'suv', 'wagon', 'fortuner', 'thar'],
  'car': ['car', 'automobile', 'vehicle', 'supercar', 'bmw', 'gwagon', 'g wagon', 'sports car', 'suv', 'fortuner'],
  'bike': ['motorcycle', 'biker', 'rider', 'royal enfield', 'bullet', 'roadtrip'],
  'bullet': ['royal enfield', 'motorcycle', 'bike', 'rider', 'vintage', 'roadtrip'],
  'gwagon': ['g wagon', 'g-wagon', 'mercedes', 'luxury', 'suv', 'car', 'vehicle'],
  'fortuner': ['fortuner', 'suv', 'toyota', 'roadtrip', 'mountain', 'car'],

  // Nature, Scenery & Places
  'pahar': ['mountain', 'hills', 'valley', 'nature', 'alpine', 'adventure', 'hiking'],
  'pahad': ['mountain', 'hills', 'valley', 'nature', 'alpine', 'adventure', 'hiking'],
  'mountain': ['mountain', 'hills', 'valley', 'nature', 'adventure', 'alpine', 'hiking'],
  'jungle': ['forest', 'woods', 'wildlife', 'nature', 'greenery', 'trees'],
  'forest': ['forest', 'jungle', 'woods', 'nature', 'trees', 'mist'],
  'beach': ['beach', 'ocean', 'sea', 'sand', 'coastal', 'sunset', 'water'],
  'samundar': ['ocean', 'sea', 'beach', 'water', 'waves'],
  'chhat': ['rooftop', 'roof', 'terrace', 'skyline', 'sunset'],

  // Aesthetics & Moods
  'sunder': ['beautiful', 'aesthetic', 'gorgeous', 'stunning', 'ethereal', 'elegant'],
  'khubsurat': ['beautiful', 'aesthetic', 'gorgeous', 'stunning', 'ethereal', 'elegant'],
  'cute': ['cute', 'charming', 'adorable', 'sweet', 'kawaii'],
  'aesthetic': ['aesthetic', 'artistic', 'cinematic', 'moody', 'warm-tone', 'vintage', 'minimalist'],
  'dark': ['dark luxury', 'moody', 'shadows', 'dramatic', 'gothic', 'noir'],
  'neon': ['cyberpunk', 'neon lights', 'tokyo', 'glowing', 'night', 'futuristic'],
  'anime': ['anime', 'manga', 'ghibli', 'cosplay', 'demon slayer', 'naruto', 'japanese', 'cel-shaded'],
  'animie': ['anime', 'manga', 'ghibli', 'cosplay', 'japanese'],
  'cinamatic': ['cinematic', '8k', 'movie', 'film', 'dramatic', 'lighting'],
  'cinematic': ['cinematic', '8k', 'movie', 'film', 'dramatic', 'lighting', 'lens'],
  'potrait': ['portrait', 'face', 'headshot', 'model', 'photography'],
  'portrait': ['portrait', 'face', 'headshot', 'model', 'photography', 'candid'],
  'selfie': ['selfie', 'mirror selfie', 'iphone selfie', 'candid', 'instagram'],
  'photo': ['photography', 'portrait', 'shot', 'picture', 'photorealistic'],
  'tasveer': ['photo', 'photography', 'portrait', 'picture', 'image'],
  'pic': ['photo', 'picture', 'photography', 'portrait'],
};

// Calculate normalized Levenshtein edit distance
function editDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Clean and tokenize query into normalized keywords
export function expandSearchQuery(query: string): string[] {
  if (!query || typeof query !== 'string') return [];
  const clean = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  const terms = new Set<string>(words);

  // Add synonyms and phonetic variations
  words.forEach((word) => {
    // Exact dictionary match
    if (SYNONYM_DICTIONARY[word]) {
      SYNONYM_DICTIONARY[word].forEach((syn) => terms.add(syn));
    }

    // Fuzzy dictionary check (handles misspellings like 'tradishnal', 'saadi', 'animie')
    Object.keys(SYNONYM_DICTIONARY).forEach((dictKey) => {
      if (Math.abs(dictKey.length - word.length) <= 2) {
        const dist = editDistance(word, dictKey);
        if (dist <= 2) {
          terms.add(dictKey);
          SYNONYM_DICTIONARY[dictKey].forEach((syn) => terms.add(syn));
        }
      }
    });
  });

  return Array.from(terms);
}

// Rank & filter posts using semantic fuzzy scoring
export function semanticSearchPosts(
  posts: PromptPost[],
  query: string
): PromptPost[] {
  if (!query || !query.trim()) return posts;

  const rawQuery = query.trim().toLowerCase();
  const expandedTerms = expandSearchQuery(rawQuery);

  const scoredPosts: { post: PromptPost; score: number }[] = [];

  posts.forEach((post) => {
    const title = (post.title || '').toLowerCase();
    const promptText = (post.promptText || '').toLowerCase();
    const category = (post.category || '').toLowerCase();
    const article = (post.articleContent || '').toLowerCase();
    const tags = Array.isArray(post.tags) ? post.tags.map((t) => t.toLowerCase()) : [];
    const requestedDesc = (post.requestedPromptDescription || '').toLowerCase();
    const requester = (post.requestedByName || '').toLowerCase();

    let score = 0;

    // 1. Direct exact phrase match (highest weight)
    if (title.includes(rawQuery)) score += 50;
    if (promptText.includes(rawQuery)) score += 35;
    if (category.includes(rawQuery)) score += 30;
    if (tags.some((t) => t.includes(rawQuery))) score += 40;
    if (requestedDesc.includes(rawQuery)) score += 25;
    if (article.includes(rawQuery)) score += 15;

    // 2. Multi-term semantic matching
    expandedTerms.forEach((term) => {
      const isOriginal = rawQuery.includes(term);
      const weightMultiplier = isOriginal ? 1.5 : 1.0;

      // Title match
      if (title.includes(term)) {
        score += 20 * weightMultiplier;
      }
      // Tag match
      if (tags.some((t) => t.includes(term) || term.includes(t))) {
        score += 18 * weightMultiplier;
      }
      // Category match
      if (category.includes(term)) {
        score += 15 * weightMultiplier;
      }
      // Prompt text match
      if (promptText.includes(term)) {
        score += 12 * weightMultiplier;
      }
      // Requested description
      if (requestedDesc.includes(term)) {
        score += 14 * weightMultiplier;
      }
      // Requester name
      if (requester.includes(term)) {
        score += 10 * weightMultiplier;
      }
      // Article content match
      if (article.includes(term)) {
        score += 6 * weightMultiplier;
      }

      // Fuzzy match on tags and title words if word length >= 4
      if (term.length >= 4) {
        tags.forEach((tag) => {
          tag.split(/\s+/).forEach((tWord) => {
            if (Math.abs(tWord.length - term.length) <= 1 && editDistance(tWord, term) <= 1) {
              score += 10;
            }
          });
        });
        title.split(/\s+/).forEach((titleWord) => {
          if (Math.abs(titleWord.length - term.length) <= 1 && editDistance(titleWord, term) <= 1) {
            score += 10;
          }
        });
      }
    });

    if (score > 0) {
      scoredPosts.push({ post, score });
    }
  });

  // Sort by highest score first
  scoredPosts.sort((a, b) => b.score - a.score);

  return scoredPosts.map((sp) => sp.post);
}
