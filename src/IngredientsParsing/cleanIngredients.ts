const CLEANING_RULES = [
  { pattern: /.*? chứa: /gi, replacement: "" }, // Remove "Mỗi ... chứa:"
  { pattern: /\(dưới dạng .*?\)/gi, replacement: "" }, // Remove "(dưới dạng ...)"
  { pattern: /\d+(mg|g|ml|iu|mcg|%)\b/gi, replacement: "" }, // Remove dosage units
  { pattern: /\d+\/\d+/g, replacement: "" }, // Remove fraction-based dosages like "500mg/5ml"
  { pattern: /\b\d+\b/g, replacement: "" }, // Remove standalone numbers
];

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
