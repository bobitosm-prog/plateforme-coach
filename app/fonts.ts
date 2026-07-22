import localFont from "next/font/local";

export const bebasNeue = localFont({
  src: "./fonts/bebas-neue/BebasNeue-Regular.ttf",
  weight: "400",
  style: "normal",
  variable: "--font-display",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});

export const barlowCondensed = localFont({
  src: [
    {
      path: "./fonts/barlow-condensed/BarlowCondensed-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/barlow-condensed/BarlowCondensed-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/barlow-condensed/BarlowCondensed-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-alt",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});

export const outfit = localFont({
  src: "./fonts/outfit/Outfit-Variable.ttf",
  weight: "300 600",
  style: "normal",
  variable: "--font-body",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});

export const dmSans = localFont({
  src: "./fonts/dm-sans/DMSans-Variable.ttf",
  weight: "400 700",
  style: "normal",
  variable: "--font-dm-sans",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});

export const anton = localFont({
  src: "./fonts/anton/Anton-Regular.ttf",
  weight: "400",
  style: "normal",
  variable: "--font-impact",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});
