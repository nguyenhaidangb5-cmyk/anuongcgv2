/**
 * Utility functions for Vietnamese text processing
 */

/**
 * Remove Vietnamese accents/diacritics from a string
 * Example: "Bún đậu mắm tôm" -> "bun dau mam tom"
 */
export function removeVietnameseAccents(str: string): string {
    if (!str) return '';

    return str
        .normalize('NFD') // Decompose combined characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
}

/**
 * Normalize Vietnamese string for search comparison
 * Removes accents, converts to lowercase, and removes extra spaces
 */
export function normalizeVietnameseString(str: string): string {
    return removeVietnameseAccents(str)
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
}

/**
 * Check if a Vietnamese string contains a search keyword (accent-insensitive)
 */
export function vietnameseIncludes(text: string, keyword: string): boolean {
    const normalizedText = normalizeVietnameseString(text);
    const normalizedKeyword = normalizeVietnameseString(keyword);
    return normalizedText.includes(normalizedKeyword);
}
