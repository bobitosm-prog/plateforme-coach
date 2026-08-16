"use client";

import { useEffect, useId, useRef } from "react";
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
  confirmDisabled?: boolean;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

const openDialogs: HTMLElement[] = [];
let bodyScrollLockCount = 0;
let previousBodyOverflow = "";
let stackInitialFocus: HTMLElement | null = null;

function getTopDialog() {
  return openDialogs.at(-1) ?? null;
}

function refreshDialogStack() {
  const topDialog = getTopDialog();
  for (const dialog of openDialogs) {
    if (dialog === topDialog) {
      dialog.removeAttribute("aria-hidden");
      dialog.removeAttribute("inert");
    } else {
      dialog.setAttribute("aria-hidden", "true");
      dialog.setAttribute("inert", "");
    }
  }
}

function registerDialog(dialog: HTMLElement, previouslyFocused: HTMLElement | null) {
  if (openDialogs.length === 0) stackInitialFocus = previouslyFocused;
  openDialogs.push(dialog);
  refreshDialogStack();
}

function unregisterDialog(dialog: HTMLElement) {
  const index = openDialogs.lastIndexOf(dialog);
  if (index !== -1) openDialogs.splice(index, 1);
  dialog.removeAttribute("aria-hidden");
  dialog.removeAttribute("inert");
  refreshDialogStack();
  if (openDialogs.length !== 0) return null;
  const focusToRestore = stackInitialFocus;
  stackInitialFocus = null;
  return focusToRestore;
}

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) previousBodyOverflow = document.body.style.overflow;
  bodyScrollLockCount += 1;
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount === 0) document.body.style.overflow = previousBodyOverflow;
}

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("hidden"),
  );
}

/**
 * Modale de confirmation générique et accessible.
 * - Fermeture via Escape
 * - Focus initial sur le bouton d'annulation (safer default)
 * - Focus trap cyclique et restitution au déclencheur
 * - Backdrop cliquable pour annuler
 * - ARIA role="dialog" + aria-modal
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  confirmDisabled = false,
  variant = "default",
  onConfirm,
  onCancel,
}: Props) {
  const reactId = useId();
  const titleId = `confirm-dialog-title-${reactId}`;
  const messageId = `confirm-dialog-message-${reactId}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const activeElement = document.activeElement as HTMLElement | null;
    previouslyFocusedRef.current = activeElement && typeof activeElement.focus === "function"
      ? activeElement
      : null;

    registerDialog(dialog, previouslyFocusedRef.current);
    lockBodyScroll();
    cancelBtnRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (getTopDialog() !== dialog) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusableElements = getFocusableElements(dialog);
      const firstElement = focusableElements[0] ?? dialog;
      const lastElement = focusableElements.at(-1) ?? dialog;
      const currentElement = document.activeElement;

      if (event.shiftKey && (currentElement === firstElement || !dialog.contains(currentElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (currentElement === lastElement || !dialog.contains(currentElement))) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (getTopDialog() !== dialog || dialog.contains(event.target as Node | null)) return;
      (getFocusableElements(dialog)[0] ?? dialog).focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      const stackFocusToRestore = unregisterDialog(dialog);
      unlockBodyScroll();

      const previouslyFocused = previouslyFocusedRef.current;
      const topDialog = getTopDialog();
      if (topDialog) {
        if (previouslyFocused && previouslyFocused.isConnected !== false && topDialog.contains(previouslyFocused)) {
          previouslyFocused.focus();
        } else {
          (getFocusableElements(topDialog)[0] ?? topDialog).focus();
        }
      } else if (stackFocusToRestore && stackFocusToRestore.isConnected !== false) {
        stackFocusToRestore.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      ref={dialogRef}
      role={isDanger ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      tabIndex={-1}
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
          id={titleId}
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
          id={messageId}
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
            disabled={confirmDisabled}
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
              cursor: confirmDisabled ? "not-allowed" : "pointer",
              opacity: confirmDisabled ? 0.65 : 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
