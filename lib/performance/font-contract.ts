export const FONT_CHARACTER_CORPUS = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ àâäçéèêëîïôöùûüÿœæ",
  "ÁÀÂÃÄÇÉÊÍÓÔÕÖÚÜ áàâãäçéêíóôõöúü",
  "ßẞ",
  "0123456789",
  ".,;:!?… '’ \" «» () [] {} / \\ + − – — = % ‰ °",
  "€ $ £ ¥ ₣ CHF",
  "kg kcal cm ml",
].join("\n");

export const FONT_SPECIMEN_LINES = [
  "MOOVX — COACHING FITNESS",
  "Équilibre, récupération, progrès",
  "Größe · Ernährung · Straße · 1’234,50 CHF",
  "Ação · alimentação · evolução",
  "Poids 82,5 kg · 2 450 kcal · 180 cm · 750 ml",
  "« Aujourd’hui » — L’effort paie !",
] as const;

export const FONT_FALLBACK_CONTRACT = Object.freeze({
  coveredScripts: ["Latin", "Latin-1 Supplement", "Latin Extended-A"],
  excludedScripts: ["Arabic", "Cyrillic", "CJK", "Devanagari"],
  systemFallback: "Arial, sans-serif",
});
