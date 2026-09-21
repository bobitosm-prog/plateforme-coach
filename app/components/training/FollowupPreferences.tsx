"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTrainingFollowup } from "@/app/hooks/useTrainingFollowup";
import {
  followupPreferencesSchema,
  type FollowupPreferences as Preferences,
} from "@/lib/training/followup-preferences";

export default function FollowupPreferences() {
  const t = useTranslations("trainingFollowup");
  const { preferences, state } = useTrainingFollowup();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  async function toggle(key: keyof Preferences) {
    if (saving || state !== "ready") return;
    setSaving(true);
    setError(false);
    try {
      const response = await fetch("/api/training-followup/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...preferences, [key]: !preferences[key] }),
      });
      if (!response.ok) throw new Error("unavailable");
      const saved = followupPreferencesSchema.parse(await response.json());
      window.dispatchEvent(
        new CustomEvent("training-followup-changed", { detail: saved }),
      );
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section aria-labelledby="followup-title" style={{ marginBottom: 24 }}>
      <h2 id="followup-title">{t("title")}</h2>
      <p>{t("description")}</p>
      {state === "loading" && <p role="status">{t("loading")}</p>}
      {state === "error" && <p role="alert">{t("error")}</p>}
      {state === "ready" &&
        (["enabled", "monthly_review", "advanced_techniques"] as const).map(
          (key) => (
            <label
              key={key}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 0",
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                role="switch"
                checked={preferences[key]}
                disabled={saving || (key !== "enabled" && !preferences.enabled)}
                onChange={() => void toggle(key)}
              />
              <span>{t(key)}</span>
            </label>
          ),
        )}
      {error && <p role="alert">{t("error")}</p>}
    </section>
  );
}
