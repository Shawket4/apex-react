/**
 * Comprehensive text normalization for search — handles Arabic and English
 * with extensive edge case coverage including letter variants, diacritics,
 * phonetically similar characters, and common search patterns.
 */

/**
 * Normalizes text for searching by:
 * - Lowercasing
 * - Stripping all diacritics (Arabic tashkeel, Latin accents)
 * - Normalizing Arabic letter variants (alef, yaa, taa marbuta, waw, etc.)
 * - Normalizing Arabic numbers to Western digits
 * - Normalizing whitespace
 * - Handling common Arabic ligatures
 * - Normalizing punctuation variants
 */
export function normalize(text: string | null | undefined): string {
  if (!text) return '';

  let normalized = text.toString().toLowerCase();

  // Unicode normalization (NFKD = compatibility decomposition)
  normalized = normalized.normalize('NFKD');

  // === ARABIC NORMALIZATION ===

  // Remove all Arabic diacritical marks (tashkeel/harakat)
  // Range includes: fathatan, dammatan, kasratan, fatha, damma, kasra,
  // shadda, sukun, maddah, hamza above/below, superscript alef, etc.
  normalized = normalized.replace(/[\u064B-\u065F]/g, ''); // Main tashkeel range
  normalized = normalized.replace(/\u0670/g, '');          // Superscript alef
  normalized = normalized.replace(/[\u06D6-\u06DC]/g, ''); // Additional Arabic marks
  normalized = normalized.replace(/[\u06DF-\u06E4]/g, ''); // More Arabic marks
  normalized = normalized.replace(/[\u06E7-\u06E8]/g, ''); // Quranic marks
  normalized = normalized.replace(/[\u06EA-\u06ED]/g, ''); // Various marks

  // Normalize ALEF variants → basic alef (ا)
  // Covers: alef with hamza above (أ), hamza below (إ), madda (آ), wasla (ٱ)
  normalized = normalized.replace(/[إأآٱ]/g, 'ا');

  // Normalize YAA variants
  // ى (alef maksura) → ي (yaa) - these sound identical in most dialects
  // ئ (yaa with hamza) → ي (yaa)
  normalized = normalized.replace(/[ىئ]/g, 'ي');

  // Normalize TAA MARBUTA → HAA
  // ة (taa marbuta) → ه (haa) - commonly confused in search
  normalized = normalized.replace(/ة/g, 'ه');

  // Normalize WAW with hamza → basic waw
  // ؤ (waw with hamza) → و (waw)
  normalized = normalized.replace(/ؤ/g, 'و');

  // Normalize HAA variants (final vs medial forms that sometimes appear)
  normalized = normalized.replace(/ۀ/g, 'ه'); // Persian/Urdu haa variant

  // Normalize KAF variants
  normalized = normalized.replace(/ك/g, 'ک'); // Arabic kaf → Persian/Urdu kaf (or vice versa based on preference)
  // Alternative: normalize both to one form
  normalized = normalized.replace(/[كک]/g, 'ك'); // Normalize to Arabic kaf

  // Normalize Arabic/Persian YAA variants
  normalized = normalized.replace(/ی/g, 'ي'); // Persian yaa → Arabic yaa

  // Handle Arabic ligatures (these can appear in some texts)
  normalized = normalized.replace(/ﻻ/g, 'لا'); // Lam-alef ligature
  normalized = normalized.replace(/ﷲ/g, 'الله'); // Allah ligature

  // Normalize Arabic-Indic numerals to Western (0-9)
  const arabicNumerals: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  normalized = normalized.replace(/[٠-٩]/g, (match) => arabicNumerals[match] || match);

  // Normalize Persian/Extended Arabic-Indic numerals
  const persianNumerals: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };
  normalized = normalized.replace(/[۰-۹]/g, (match) => persianNumerals[match] || match);

  // Remove kashida (tatweel) - Arabic elongation character
  normalized = normalized.replace(/ـ/g, '');

  // === LATIN/ENGLISH NORMALIZATION ===

  // Remove combining diacritical marks (accents, umlauts, etc.)
  // This handles: café→cafe, naïve→naive, résumé→resume, etc.
  normalized = normalized.replace(/[\u0300-\u036f]/g, '');

  // Normalize common Latin letter variants with diacritics that might survive
  // (some characters are precomposed and need explicit mapping)
  const latinVariants: Record<string, string> = {
    // A variants
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'ā': 'a', 'ă': 'a', 'ą': 'a',
    'æ': 'ae',
    // C variants
    'ç': 'c', 'ć': 'c', 'č': 'c', 'ĉ': 'c', 'ċ': 'c',
    // E variants
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ē': 'e', 'ĕ': 'e', 'ė': 'e', 'ę': 'e', 'ě': 'e',
    // I variants
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i', 'ĭ': 'i', 'į': 'i', 'ı': 'i',
    // N variants
    'ñ': 'n', 'ń': 'n', 'ň': 'n', 'ņ': 'n',
    // O variants
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ō': 'o', 'ŏ': 'o', 'ő': 'o', 'ø': 'o',
    'œ': 'oe',
    // S variants
    'ś': 's', 'š': 's', 'ş': 's', 'ș': 's', 'ŝ': 's',
    // T variants
    'ț': 't', 'ť': 't', 'ţ': 't',
    // U variants
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ū': 'u', 'ŭ': 'u', 'ů': 'u', 'ű': 'u', 'ų': 'u',
    // Y variants
    'ý': 'y', 'ÿ': 'y', 'ŷ': 'y',
    // Z variants
    'ź': 'z', 'ž': 'z', 'ż': 'z',
    // German sharp s
    'ß': 'ss'
  };

  normalized = normalized.replace(/[àáâãäåāăąæçćčĉċèéêëēĕėęěìíîïīĭįıñńňņòóôõöōŏőøœśšşșŝțťţùúûüūŭůűųýÿŷźžżß]/g,
    (match) => latinVariants[match] || match
  );

  // === PUNCTUATION & WHITESPACE ===

  // Normalize various quotation marks to standard single quote
  normalized = normalized.replace(/['''‛]/g, "'");
  normalized = normalized.replace(/["""„‟]/g, '"');

  // Normalize various dashes and hyphens
  normalized = normalized.replace(/[‐‑‒–—―−]/g, '-');

  // Normalize whitespace (tabs, newlines, multiple spaces → single space)
  normalized = normalized.replace(/\s+/g, ' ');

  // === FINAL CLEANUP ===

  return normalized.trim();
}

/**
 * Checks if a haystack contains a needle using normalized search.
 * Empty/null needles always return true (match everything).
 * 
 * @param haystack - The text to search in
 * @param needle - The text to search for
 * @returns true if normalized needle is found in normalized haystack
 */
export function matches(haystack: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  return normalize(haystack).includes(normalize(needle));
}

/**
 * Advanced: Checks if text matches any of multiple search terms.
 * Useful for multi-word or OR-based search.
 * 
 * @param haystack - The text to search in
 * @param needles - Array of search terms (OR logic)
 * @returns true if any needle matches
 */
export function matchesAny(haystack: string | null | undefined, needles: string[]): boolean {
  if (!needles || needles.length === 0) return true;
  const normalizedHaystack = normalize(haystack);
  return needles.some(needle => normalizedHaystack.includes(normalize(needle)));
}

/**
 * Advanced: Checks if text matches all search terms.
 * Useful for multi-word AND-based search.
 * 
 * @param haystack - The text to search in
 * @param needles - Array of search terms (AND logic)
 * @returns true if all needles match
 */
export function matchesAll(haystack: string | null | undefined, needles: string[]): boolean {
  if (!needles || needles.length === 0) return true;
  const normalizedHaystack = normalize(haystack);
  return needles.every(needle => normalizedHaystack.includes(normalize(needle)));
}

/**
 * Highlights matching portions of text (case-insensitive, diacritic-insensitive).
 * Returns the original text with match positions, useful for search UIs.
 * 
 * @param text - The original text
 * @param searchTerm - The term to highlight
 * @returns Array of {text: string, isMatch: boolean} segments
 */
export function highlightMatches(
  text: string,
  searchTerm: string
): Array<{ text: string; isMatch: boolean }> {
  if (!text || !searchTerm) {
    return [{ text: text || '', isMatch: false }];
  }

  const normalized = normalize(text);
  const normalizedSearch = normalize(searchTerm);

  if (!normalized.includes(normalizedSearch)) {
    return [{ text, isMatch: false }];
  }

  const segments: Array<{ text: string; isMatch: boolean }> = [];
  let currentIndex = 0;
  let searchIndex = normalized.indexOf(normalizedSearch);

  while (searchIndex !== -1) {
    // Add non-matching text before this match
    if (searchIndex > currentIndex) {
      segments.push({
        text: text.substring(currentIndex, searchIndex),
        isMatch: false
      });
    }

    // Add matching text
    segments.push({
      text: text.substring(searchIndex, searchIndex + normalizedSearch.length),
      isMatch: true
    });

    currentIndex = searchIndex + normalizedSearch.length;
    searchIndex = normalized.indexOf(normalizedSearch, currentIndex);
  }

  // Add remaining non-matching text
  if (currentIndex < text.length) {
    segments.push({
      text: text.substring(currentIndex),
      isMatch: false
    });
  }

  return segments;
}