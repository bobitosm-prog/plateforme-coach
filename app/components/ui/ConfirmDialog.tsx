"use client";

import { useEffect, useRef } from "react";
import {
  BG_CARD, BORDER, GOLD, GOLD_RULE, RED,
  TEXT_PRIMARY, TEXT_MUTED, FONT_ALT, FONT_BODY,
} from "@/lib/design-tokens";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Modale de confirmation générique et accessible.
 * - Fermeture via Escape
 * - Focus trap sur le bouton d'annulation (safer default)
 * - Backdrop cliquable pour annuler
 * - ARIA role="dialog" + aria-modal
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  onConfirm,
  onCancel,
}: Props) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && cancelBtnRef.current) cancelBtnRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: BG_CARD,
          border: `1px solid ${GOLD_RULE}`,
          borderRadius: 16,
          padding: 24,
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          style={{
            fontFamily: FONT_ALT,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontSize: "0.95rem",
            fontWeight: 800,
            color: isDanger ? RED : GOLD,
            marginBottom: 12,
            margin: "0 0 12px",
          }}
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-message"
          style={{
            fontFamily: FONT_BODY,
            fontSize: "0.875rem",
            color: TEXT_MUTED,
            lineHeight: 1.55,
            marginBottom: 24,
            margin: "0 0 24px",
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            style={{
              background: "transparent",
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "9px 18px",
              color: TEXT_PRIMARY,
              fontFamily: FONT_ALT,
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: isDanger ? RED : GOLD,
              border: "none",
              borderRadius: 12,
              padding: "9px 18px",
              color: isDanger ? "#fff" : "#0D0B08",
              fontFamily: FONT_ALT,
              fontSize: "0.78rem",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
