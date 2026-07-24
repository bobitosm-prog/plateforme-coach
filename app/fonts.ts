import localFont from "next/font/local";

export const bebasNeue = localFont({
  src: "../public/fonts/moovx/BebasNeue-Regular.ttf",
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
      path: "../public/fonts/moovx/BarlowCondensed-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/moovx/BarlowCondensed-ExtraBold.ttf",
      weight: "800",
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
  src: "../public/fonts/moovx/Outfit-Variable.ttf",
  weight: "300 600",
  style: "normal",
  variable: "--font-body",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});

export const dmSans = localFont({
  src: "../public/fonts/moovx/DMSans-Variable.ttf",
  weight: "400 700",
  style: "normal",
  variable: "--font-dm-sans",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});

export const anton = localFont({
  src: "../public/fonts/moovx/Anton-Regular.ttf",
  weight: "400",
  style: "normal",
  variable: "--font-impact",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
});
