const CLEANING_RULES = [
  {
    pattern: /.*? chứa: /gi,
    replacement: ""
    // This pattern matches any text followed by " chứa: " (case-insensitive).
    // .*? - Matches any character (except for line terminators) between zero and unlimited times, as few times as possible.
    // chứa: - Matches the literal string " chứa: ".
    // /gi - 'g' for global match (find all matches rather than stopping after the first match), 'i' for case-insensitive match.
    // This rule removes phrases like "Mỗi ... chứa:".
  },
  {
    pattern: /\(dưới dạng .*?\)/gi,
    replacement: ""
    // This pattern matches text within parentheses starting with "dưới dạng " (case-insensitive).
    // \( - Escapes the opening parenthesis.
    // dưới dạng - Matches the literal string "dưới dạng ".
    // .*? - Matches any character (except for line terminators) between zero and unlimited times, as few times as possible.
    // \) - Escapes the closing parenthesis.
    // /gi - 'g' for global match, 'i' for case-insensitive match.
    // This rule removes phrases like "(dưới dạng ...)".
  },
  {
    pattern: /\d+(mg|g|ml|iu|mcg|%)\b/gi,
    replacement: ""
    // This pattern matches numbers followed by specific units (case-insensitive).
    // \d+ - Matches one or more digits.
    // (mg|g|ml|iu|mcg|%) - Matches any of the units "mg", "g", "ml", "iu", "mcg", or "%".
    // \b - Asserts a word boundary to ensure the unit is not part of a larger word.
    // /gi - 'g' for global match, 'i' for case-insensitive match.
    // This rule removes dosage units like "500mg", "5ml", etc.
  },
  {
    pattern: /\d+\/\d+/g,
    replacement: ""
    // This pattern matches fraction-based dosages.
    // \d+ - Matches one or more digits.
    // \/ - Matches the literal forward slash.
    // \d+ - Matches one or more digits.
    // /g - 'g' for global match.
    // This rule removes fraction-based dosages like "500mg/5ml".
  },
  {
    pattern: /\b\d+\b/g,
    replacement: ""
    // This pattern matches standalone numbers.
    // \b - Asserts a word boundary.
    // \d+ - Matches one or more digits.
    // \b - Asserts a word boundary.
    // /g - 'g' for global match.
    // This rule removes standalone numbers.
  }
]

export function cleanIngredients(rawText: string): string[] {
  // /**
  //  * Cleans and parses a string of ingredients
  //  *
  //  * @param {string} ingredients - string containing a list of ingredients
  //  *
  //  */
  if (!rawText || typeof rawText !== "string") return [];

  let cleanedText = rawText.toLowerCase().trim();

  // Apply all cleaning rules dynamically
  CLEANING_RULES.forEach((rule) => {
    cleanedText = cleanedText.replace(rule.pattern, rule.replacement);
  });

  // Split multiple ingredients (common separators: ; , - \n)
  let ingredients = cleanedText
    .split(/[;,\-\n]/)
    .map((item) => item.replace(/[\/\\,]/g, "").trim()) // Final removal of special characters
    .filter((item) => item.length > 0); // Remove empty values

  ingredients = ingredients.map((ingredient) =>
    ingredient
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  ); // Capitalize first letter of each word for consistency

  return ingredients;
}
