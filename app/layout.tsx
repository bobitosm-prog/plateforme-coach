import type { Metadata } from "next";
import { Bebas_Neue, Barlow_Condensed, Outfit, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-alt",
  display: "swap",
});

const outfit = Outfit({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MoovX",
  description: "Coaching fitness Swiss Made · Swiss Quality",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${bebasNeue.variable} ${barlowCondensed.variable} ${outfit.variable} ${dmSans.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4A843" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MoovX" />
        <link rel="icon" href="/logo-moovx-32.png" sizes="32x32" />
        <link rel="icon" href="/logo-moovx-16.png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:image" content="https://app.moovx.ch/logo-moovx.png" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script dangerouslySetInnerHTML={{ __html: `
          if('serviceWorker' in navigator){
            navigator.serviceWorker.register('/sw.js').then(function(reg){
              reg.update();
              reg.addEventListener('updatefound',function(){
                var w=reg.installing;
                if(w)w.addEventListener('statechange',function(){
                  if(w.state==='activated')window.location.reload();
                });
              });
            });
            if(window.caches){caches.keys().then(function(n){for(var i=0;i<n.length;i++){caches.delete(n[i])}})}
          }
        ` }} />
      </head>
      <body className="antialiased" style={{ fontFamily: "var(--font-body), 'Outfit', sans-serif" }}>
        {children}
        <Toaster position="top-center" richColors theme="dark" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
