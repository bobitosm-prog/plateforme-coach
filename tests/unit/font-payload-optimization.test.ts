import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  FONT_CHARACTER_CORPUS,
  FONT_FALLBACK_CONTRACT,
  FONT_SPECIMEN_LINES,
} from "../../lib/performance/font-contract";

interface FontFace {
  readonly characterSet: readonly number[];
  hasGlyphForCodePoint(codePoint: number): boolean;
}

type FontParser = (buffer: Buffer) => FontFace;

const root = process.cwd();
const require = createRequire(import.meta.url);
const parseFont = (
  require("next/dist/compiled/@next/font/dist/fontkit") as {
    default: FontParser;
  }
).default;

const expected = {
  "Anton-Regular.ttf": [170812, "a4ba3a92350ebb031da0cb47630ac49eb265082ca1bc0450442f4a83ab947cab"],
  "BarlowCondensed-Black.ttf": [110828, "e74b750df582c608f35db467b711b2b60d2217618e85e60b72b42dfd00446cab"],
  "BarlowCondensed-Bold.ttf": [109912, "e476562ec9c1e16cf16475895b511f08c804f438cc9a9f80a44ea50a0eeb5b65"],
  "BarlowCondensed-ExtraBold.ttf": [110296, "724c9c25952d5f4a2d87185d9767aa006144c5f0d944dc05bf7d5d603551c260"],
  "BebasNeue-Regular.ttf": [61400, "08e4623805102d819f58601e46e345648846075e363b2ceb23313c2d1c83ec73"],
  "DMSans-Variable.ttf": [240164, "8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d"],
  "Outfit-Variable.ttf": [110884, "fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade"],
} as const;

describe("optimized local font payload", () => {
  it("pins the single shared source copy of every font", () => {
    expect(
      readdirSync(join(root, "public/fonts/moovx"))
        .filter((name) => name.endsWith(".ttf"))
        .sort(),
    ).toEqual(Object.keys(expected).sort());

    for (const [name, [bytes, sha256]] of Object.entries(expected)) {
      const buffer = readFileSync(join(root, "public/fonts/moovx", name));
      expect(buffer.byteLength, name).toBe(bytes);
      expect(createHash("sha256").update(buffer).digest("hex"), name).toBe(sha256);
    }

    for (const legacyPath of [
      "app/fonts/anton/Anton-Regular.ttf",
      "app/fonts/barlow-condensed/BarlowCondensed-Bold.ttf",
      "app/fonts/barlow-condensed/BarlowCondensed-ExtraBold.ttf",
      "app/fonts/barlow-condensed/BarlowCondensed-Black.ttf",
      "app/fonts/bebas-neue/BebasNeue-Regular.ttf",
      "app/fonts/dm-sans/DMSans-Variable.ttf",
      "app/fonts/outfit/Outfit-Variable.ttf",
    ]) {
      expect(existsSync(join(root, legacyPath)), legacyPath).toBe(false);
    }
  });

  it("keeps the explicit Latin corpus and deterministic specimens", () => {
    expect(FONT_CHARACTER_CORPUS).toContain("ÀÂÄÇÉÈÊË");
    expect(FONT_CHARACTER_CORPUS).toContain("ßẞ");
    expect(FONT_CHARACTER_CORPUS).toContain("ÁÀÂÃÄÇÉÊ");
    expect(FONT_CHARACTER_CORPUS).toContain("€ $ £ ¥ ₣ CHF");
    expect(FONT_CHARACTER_CORPUS).toContain("kg kcal cm ml");
    expect(FONT_SPECIMEN_LINES).toHaveLength(6);
  });

  it("has a real glyph in at least one local family for each corpus character", () => {
    const fonts = Object.keys(expected).map((name) =>
      parseFont(readFileSync(join(root, "public/fonts/moovx", name))),
    );
    const missing = [...new Set([...FONT_CHARACTER_CORPUS]
      .filter((character) => character.trim())
      .filter((character) =>
        !fonts.some((font) => font.hasGlyphForCodePoint(character.codePointAt(0)!)),
      ))];
    expect(missing).toEqual([]);
  });

  it("documents scripts delegated to the safe system fallback", () => {
    expect(FONT_FALLBACK_CONTRACT.systemFallback).toBe("Arial, sans-serif");
    expect(FONT_FALLBACK_CONTRACT.excludedScripts).toEqual([
      "Arabic",
      "Cyrillic",
      "CJK",
      "Devanagari",
    ]);
  });
});
