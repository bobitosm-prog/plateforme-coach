"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { RailOverlay } from "./RailOverlay";
import {
  BG_BASE, BG_CARD, BORDER, GOLD_RULE, RED,
  TEXT_PRIMARY, TEXT_MUTED, RADIUS_CARD, FONT_DISPLAY, FONT_ALT, FONT_BODY,
} from "@/lib/design-tokens";

type Props = {
  open: boolean;
  title: string;
  warning: string;
  instruction: ReactNode;
  inputLabel: ReactNode;
  placeholder: string;
  value: string;
  expectedValue: string;
  confirmLabel: string;
  busyLabel: string;
  cancelLabel: string;
  busy: boolean;
  onValueChange: (value: string) => void;
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

let bodyScrollLockCount = 0;
let previousBodyOverflow = "";

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
    element => element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("hidden"),
  );
}

export default function TypedConfirmDialog({
  open,
  title,
  warning,
  instruction,
  inputLabel,
  placeholder,
  value,
  expectedValue,
  confirmLabel,
  busyLabel,
  cancelLabel,
  busy,
  onValueChange,
  onConfirm,
  onCancel,
}: Props) {
  const reactId = useId();
  const titleId = `typed-confirm-dialog-title-${reactId}`;
  const warningId = `typed-confirm-dialog-warning-${reactId}`;
  const instructionId = `typed-confirm-dialog-instruction-${reactId}`;
  const inputId = `typed-confirm-dialog-input-${reactId}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const activeElement = document.activeElement as HTMLElement | null;
    previouslyFocusedRef.current = activeElement && typeof activeElement.focus === "function"
      ? activeElement
      : null;

    lockBodyScroll();
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
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
      if (dialog.contains(event.target as Node | null)) return;
      (getFocusableElements(dialog)[0] ?? dialog).focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      unlockBodyScroll();
      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused && previouslyFocused.isConnected !== false) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  const confirmed = value === expectedValue;
  const confirmDisabled = !confirmed || busy;

  return (
    <RailOverlay>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${warningId} ${instructionId}`}
        aria-busy={busy ? "true" : undefined}
        tabIndex={-1}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      >
        <div style={{ background: BG_CARD, border: `1px solid ${RED}`, borderRadius: RADIUS_CARD, padding: 24, maxWidth: 400, width: "100%" }}>
          <h3 id={titleId} style={{ fontFamily: FONT_DISPLAY, fontSize: "1.2rem", fontWeight: 700, letterSpacing: "2px", color: RED, margin: "0 0 12px" }}>{title}</h3>
          <p id={warningId} style={{ fontSize: "0.82rem", color: TEXT_MUTED, lineHeight: 1.6, margin: "0 0 16px", fontFamily: FONT_BODY, fontWeight: 300 }}>{warning}</p>
          <div id={instructionId} style={{ fontSize: "0.78rem", color: TEXT_MUTED, margin: "0 0 8px", fontFamily: FONT_BODY }}>{instruction}</div>
          <label htmlFor={inputId} style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 }}>{inputLabel}</label>
          <input
            ref={inputRef}
            id={inputId}
            value={value}
            onChange={event => onValueChange(event.target.value)}
            placeholder={placeholder}
            aria-describedby={`${warningId} ${instructionId}`}
            style={{ width: "100%", background: BG_BASE, border: `1px solid ${confirmed ? RED : BORDER}`, borderRadius: 12, padding: "10px 14px", color: TEXT_PRIMARY, fontSize: "0.9rem", outline: "none", marginBottom: 16, fontFamily: FONT_BODY }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onCancel} style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${GOLD_RULE}`, borderRadius: 12, color: TEXT_PRIMARY, fontFamily: FONT_ALT, fontSize: "0.85rem", cursor: "pointer" }}>{cancelLabel}</button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              aria-busy={busy ? "true" : undefined}
              style={{ flex: 1, padding: "12px", background: confirmed ? RED : "#333", borderRadius: 12, border: "none", color: "#fff", fontFamily: FONT_ALT, fontSize: "0.9rem", fontWeight: 700, cursor: confirmed && !busy ? "pointer" : "default", opacity: confirmed ? 1 : 0.5 }}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </RailOverlay>
  );
}
