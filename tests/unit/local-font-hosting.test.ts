import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const fontModulePath = join(root, "app/fonts.ts");
const fontModule = readFileSync(fontModulePath, "utf8");
const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
const publicFontCss = readFileSync(
  join(root, "public/fonts/moovx-fonts.css"),
  "utf8",
);
const staticPages = [
  "public/guide-musculation.html",
  "public/guide-nutrition.html",
  "public/index-vitrine.html",
  "public/vitrine.html",
].map((path) => readFileSync(join(root, path), "utf8"));

const assets = {
  "public/fonts/moovx/Anton-Regular.ttf":
    "a4ba3a92350ebb031da0cb47630ac49eb265082ca1bc0450442f4a83ab947cab",
  "public/fonts/moovx/BarlowCondensed-Bold.ttf":
    "e476562ec9c1e16cf16475895b511f08c804f438cc9a9f80a44ea50a0eeb5b65",
  "public/fonts/moovx/BarlowCondensed-ExtraBold.ttf":
    "724c9c25952d5f4a2d87185d9767aa006144c5f0d944dc05bf7d5d603551c260",
  "public/fonts/moovx/BarlowCondensed-Black.ttf":
    "e74b750df582c608f35db467b711b2b60d2217618e85e60b72b42dfd00446cab",
  "public/fonts/moovx/BebasNeue-Regular.ttf":
    "08e4623805102d819f58601e46e345648846075e363b2ceb23313c2d1c83ec73",
  "public/fonts/moovx/DMSans-Variable.ttf":
    "8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d",
  "public/fonts/moovx/Outfit-Variable.ttf":
    "fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade",
} as const;

const licenses = {
  "app/fonts/anton/OFL.txt":
    "ee67e6ee22790b7929f1a3769ca2801d565c64b5a9096942c1adf5596de9c9e4",
  "app/fonts/barlow-condensed/OFL.txt":
    "186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f",
  "app/fonts/bebas-neue/OFL.txt":
    "72082f6cb4d04be2ecf7cc7d9e1e7d73787f0af8a5a278a47cade70c16b78341",
  "app/fonts/dm-sans/OFL.txt":
    "9af36190332437f5ecd09974de43c1f7c77a310a996cdd8ceb25628b458840e1",
  "app/fonts/outfit/OFL.txt":
    "c676351bf8576b9aba743cd5eaa8c0e7ee0d51f805d720447b4df4ddb6a2e416",
} as const;

describe("local application fonts", () => {
  it("declares the five historical CSS variables with localFont", () => {
    expect(fontModule).toContain('from "next/font/local"');
    for (const variable of [
      "--font-display",
      "--font-alt",
      "--font-body",
      "--font-dm-sans",
      "--font-impact",
    ]) {
      expect(fontModule).toContain(`variable: "${variable}"`);
    }
    expect(layout).toContain(
      "bebasNeue.variable} ${barlowCondensed.variable} ${outfit.variable} ${dmSans.variable} ${anton.variable}",
    );
  });

  it("preserves the requested normal styles and weight ranges", () => {
    for (const weight of ["400", "700", "800", "300 600", "400 700"]) {
      expect(fontModule).toContain(`weight: "${weight}"`);
    }
    expect(fontModule).not.toContain('weight: "900"');
    expect(fontModule.match(/style: "normal"/g)).toHaveLength(6);
    expect(fontModule.match(/display: "swap"/g)).toHaveLength(5);
    expect(fontModule.match(/preload: true/g)).toHaveLength(5);
  });

  it("pins every font asset to its documented SHA-256", () => {
    for (const [path, expectedHash] of Object.entries(assets)) {
      const actualHash = createHash("sha256")
        .update(readFileSync(join(root, path)))
        .digest("hex");
      expect(actualHash, path).toBe(expectedHash);
    }
  });

  it("ships one SIL Open Font License for each family", () => {
    for (const [path, expectedHash] of Object.entries(licenses)) {
      const licenseBuffer = readFileSync(join(root, path));
      const license = licenseBuffer.toString("utf8");
      expect(license, path).toContain("SIL OPEN FONT LICENSE Version 1.1");
      expect(
        createHash("sha256").update(licenseBuffer).digest("hex"),
        path,
      ).toBe(expectedHash);
    }
  });

  it("contains no Google Fonts runtime import or URL", () => {
    const runtimeSources = [
      fontModule,
      layout,
      nextConfig,
      publicFontCss,
      ...staticPages,
    ].join("\n");
    expect(runtimeSources).not.toContain("next/font/google");
    expect(runtimeSources).not.toMatch(/fonts\.(?:googleapis|gstatic)\.com/);
    for (const page of staticPages) {
      expect(page).toContain('href="/fonts/moovx-fonts.css"');
    }
  });

  it("serves the same verified assets to standalone public pages", () => {
    for (const [publicPath, expectedHash] of Object.entries(assets)) {
      if (publicPath.endsWith("Anton-Regular.ttf")) continue;
      const actualHash = createHash("sha256")
        .update(readFileSync(join(root, publicPath)))
        .digest("hex");
      expect(actualHash, publicPath).toBe(expectedHash);
    }
    expect(publicFontCss.match(/@font-face/g)).toHaveLength(6);
  });

  it("shares one source copy and keeps weight 900 out of the global Next preload", () => {
    expect(fontModule).toContain("../public/fonts/moovx/");
    expect(fontModule).not.toContain("BarlowCondensed-Black.ttf");
    expect(publicFontCss).toContain("BarlowCondensed-Black.ttf");
  });

  it("supports an isolated production build directory", () => {
    expect(nextConfig).toContain("process.env.MOOVX_BUILD_DIR");
    expect(nextConfig).toContain("...(distDir ? { distDir } : {})");
  });
});
