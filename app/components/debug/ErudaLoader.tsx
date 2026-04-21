"use client";

import { useEffect } from "react";

/**
 * Charge la console mobile eruda uniquement sur les deploys Vercel Preview.
 * Affiche un bouton flottant en bas à droite permettant d'ouvrir une
 * console DevTools directement sur l'iPhone.
 */
export default function ErudaLoader() {
  useEffect(() => {
    // Condition : on n'active QUE sur les URLs Vercel preview
    const host = window.location.hostname;
    const isPreview =
      host.includes("vercel.app") ||
      host.includes("localhost") ||
      host.includes("127.0.0.1");

    if (!isPreview) return;

    // Charge eruda depuis CDN
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/eruda";
    script.async = true;
    script.onload = () => {
      // @ts-expect-error eruda is injected globally
      if (window.eruda) window.eruda.init();
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
