/**
 * TokenJuice Compression Layer
 * Reduces prompt token length by stripping out redundant filler text,
 * minifying JSON payloads, collapsing whitespace, and stripping unnecessary HTML.
 */
export const TokenJuice = {
  /**
   * Compresses an array of messages or a single text string
   */
  compress(input) {
    if (typeof input === 'string') {
      return this.compressText(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(msg => ({
        ...msg,
        content: this.compressText(msg.content)
      }));
    }
    
    return input;
  },

  /**
   * Core text compression algorithm
   */
  compressText(text) {
    if (!text) return '';

    let compressed = text;

    // 1. Strip HTML tags but keep inner text
    compressed = compressed.replace(/<[^>]*>?/gm, ' ');

    // 2. Collapse excessive whitespace and newlines
    compressed = compressed.replace(/[\r\n]+/g, '\n');
    compressed = compressed.replace(/[ \t]{2,}/g, ' ');

    // 3. Minify any embedded JSON objects
    compressed = this.minifyEmbeddedJSON(compressed);

    // 4. Remove generic filler words (optional/lightweight implementation)
    const stopWords = [' please ', ' could you ', ' would you ', ' kind regards ', ' thank you ', ' thanks '];
    stopWords.forEach(word => {
      compressed = compressed.replace(new RegExp(word, 'gi'), ' ');
    });

    return compressed.trim();
  },

  /**
   * Naive approach to find and minify JSON blocks inside text
   */
  minifyEmbeddedJSON(text) {
    try {
      // Find texts that look like JSON blocks
      return text.replace(/```json\n([\s\S]*?)\n```/g, (match, jsonString) => {
        try {
          const parsed = JSON.parse(jsonString);
          return '```json\n' + JSON.stringify(parsed) + '\n```';
        } catch (e) {
          return match; // If it fails to parse, leave it alone
        }
      });
    } catch (e) {
      return text;
    }
  }
};
