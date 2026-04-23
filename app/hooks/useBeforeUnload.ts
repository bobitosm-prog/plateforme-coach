"use client";

import { useEffect } from "react";

/**
 * Affiche un popup natif de confirmation quand l'utilisateur tente
 * de quitter la page (refresh, fermeture onglet, navigation externe)
 * pendant qu'une action importante est en cours.
 *
 * Limitations connues :
 * - Le texte du popup ne peut pas être personnalisé (sécurité browsers).
 * - Ne fonctionne PAS pour la navigation interne Next.js (pas de reload).
 * - iOS Safari PWA peut l'ignorer dans certains contextes.
 *
 * @param active - Si true, le warning est actif. Si false, l'évent est
 *                 désactivé. Pass le state qui indique "session active".
 *
 * @example
 * useBeforeUnload(workoutStarted !== null);
 */
export function useBeforeUnload(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const handler = (e: BeforeUnloadEvent) => {
      // preventDefault + returnValue : combo requis pour compat cross-browser
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
