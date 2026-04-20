"use client";

import { useState, useEffect, InputHTMLAttributes } from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Valeur à appliquer si l'utilisateur laisse le champ vide (défaut : min) */
  fallback?: number;
};

/**
 * Input numérique qui autorise le champ VIDE pendant la saisie.
 * - Stocke un draft string local → value="" possible
 * - Commit le nombre au blur ou à Enter
 * - Clavier numérique natif sur mobile (inputMode="numeric")
 * - Pas de spinners, pas de scroll-wheel qui incrémente
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  max = 9999,
  fallback,
  onBlur,
  onKeyDown,
  ...rest
}: Props) {
  const [draft, setDraft] = useState<string>(String(value));

  // Resync si la valeur externe change (ex : reset de formulaire)
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    if (draft.trim() === "") {
      const finalValue = fallback ?? min;
      onChange(finalValue);
      setDraft(String(finalValue));
      return;
    }
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(String(value)); // rollback
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    onChange(clamped);
    setDraft(String(clamped));
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={draft}
      onChange={(e) => {
        const v = e.target.value;
        // Autorise vide OU uniquement chiffres
        if (v === "" || /^\d+$/.test(v)) {
          setDraft(v);
        }
      }}
      onBlur={(e) => {
        commit();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
}
