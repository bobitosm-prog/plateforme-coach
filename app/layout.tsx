import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import AnalyticsGate from "@/components/AnalyticsGate";
import { WebVitals } from "./web-vitals";
import AppErrorBoundary from "./components/ui/AppErrorBoundary";
import { anton, barlowCondensed, bebasNeue, dmSans, outfit } from "./fonts";

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
    <html lang="fr" className={`${bebasNeue.variable} ${barlowCondensed.variable} ${outfit.variable} ${dmSans.variable} ${anton.variable}`}>
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
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background:#0D0B08!important;margin:0}' }} />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script dangerouslySetInnerHTML={{ __html: `
          if('serviceWorker' in navigator){
            navigator.serviceWorker.register('/sw.js').catch(function(){});
          }
          try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('portrait').catch(function(){})}catch(e){}
        ` }} />
      </head>
      <body className="antialiased" style={{ fontFamily: "var(--font-body), 'Outfit', sans-serif", backgroundColor: '#0D0B08', margin: 0 }}>
        <AppErrorBoundary>
          {children}
        </AppErrorBoundary>
        <Toaster position="top-center" richColors theme="dark" />
        <AnalyticsGate />
        <WebVitals />
      </body>
    </html>
  );
}
