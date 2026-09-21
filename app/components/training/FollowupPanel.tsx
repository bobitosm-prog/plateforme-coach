"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTrainingFollowup } from "@/app/hooks/useTrainingFollowup";
import type { ExerciseTrend } from "@/lib/training/followup-analysis";
import { prescribedDuration } from "@/lib/training/exercise-measurement";

type View = {
  enabled: boolean;
  monthlyDue: boolean;
  historyTruncated: boolean;
  trends: ExerciseTrend[];
  alternatives: (ExerciseTrend & {
    alternatives: { id: string; name: string }[];
  })[];
  proposals: {
    id: string;
    kind: string;
    explanation: string;
    candidate: {
      name: string;
      days: {
        name?: string;
        is_rest?: boolean;
        repos?: boolean;
        exercises?: {
          name?: string;
          custom_name?: string;
          sets: number;
          reps: string | number;
          rest_seconds?: number;
          technique?: string;
          technique_details?: string;
        }[];
      }[];
    };
  }[];
};
export default function FollowupPanel({
  programId,
  hasActiveDraft,
}: {
  programId: string | null;
  hasActiveDraft: boolean;
}) {
  const t = useTranslations("trainingFollowup");
  const { preferences } = useTrainingFollowup();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!preferences.enabled) return;
    try {
      const response = await fetch("/api/training-followup", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setView(await response.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, [preferences.enabled]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, programId]);
  async function act(input: unknown) {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/training-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error();
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame
              .split("\n")
              .find((row) => row.startsWith("data: "));
            if (!line) continue;
            const event = JSON.parse(line.slice(6));
            if (event.type === "error") throw new Error();
            if (event.type === "done") done = true;
          }
        }
        if (!done) throw new Error();
      }
      if ((input as { action: string }).action === "apply") {
        window.location.reload();
        return;
      }
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  if (!preferences.enabled) return null;
  return (
    <section
      aria-labelledby="athena-followup-heading"
      aria-busy={busy}
      style={{
        margin: 16,
        padding: 16,
        border: "1px solid #8c773f",
        borderRadius: 12,
      }}
    >
      <h2 id="athena-followup-heading">{t("title")}</h2>
      <p>{t("analysisLimit")}</p>
      {error && (
        <p role="alert">
          {t("error")}{" "}
          <button type="button" onClick={() => void load()}>
            {t("retry")}
          </button>
        </p>
      )}
      {busy && <p role="status">{t("preparing")}</p>}
      {view?.historyTruncated && <p>{t("partial")}</p>}
      {view?.trends?.map((item) => (
        <p key={`${item.dayIndex}:${item.exerciseIndex}`}>
          <strong>{item.name}</strong> — {t(`trend.${item.status}`)} (
          {item.sessions})
        </p>
      ))}
      {view?.monthlyDue && (
        <button
          type="button"
          disabled={busy || hasActiveDraft}
          onClick={() => void act({ action: "monthly" })}
        >
          {t("prepareMonthly")}
        </button>
      )}
      {view?.alternatives?.map((item) => (
        <div key={`${item.dayIndex}:${item.exerciseIndex}`}>
          {item.alternatives.map((alternative) => (
            <button
              key={alternative.id}
              type="button"
              disabled={busy || hasActiveDraft}
              onClick={() =>
                void act({
                  action: "alternative",
                  dayIndex: item.dayIndex,
                  exerciseIndex: item.exerciseIndex,
                  alternativeId: alternative.id,
                })
              }
            >
              {t("previewAlternative", {
                from: item.name,
                to: alternative.name,
              })}
            </button>
          ))}
        </div>
      ))}
      {hasActiveDraft && <p>{t("finishFirst")}</p>}
      {view?.proposals?.map((proposal) => (
        <article
          key={proposal.id}
          style={{
            borderTop: "1px solid #8c773f",
            marginTop: 16,
            paddingTop: 12,
          }}
        >
          <h3>{proposal.candidate.name}</h3>
          <p>{proposal.explanation}</p>
          <p>{t("unchanged")}</p>
          <details>
            <summary>{t("preview")}</summary>
            {proposal.candidate.days.map((day, index) => (
              <div key={index}>
                <h4>{day.name}</h4>
                <ul>
                  {day.exercises?.map((ex, i) => (
                    <li key={i}>
                      {ex.name ?? ex.custom_name} — {ex.sets} ×{" "}
                      {prescribedDuration(ex)
                        ? `${prescribedDuration(ex)} s`
                        : ex.reps}{" "}
                      · {ex.rest_seconds ?? "—"} s{" "}
                      {ex.technique
                        ? `· ${ex.technique} ${ex.technique_details ?? ""}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
          <button
            type="button"
            disabled={busy || hasActiveDraft}
            onClick={() => void act({ action: "apply", id: proposal.id })}
          >
            {t("approve")}
          </button>{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => void act({ action: "decline", id: proposal.id })}
          >
            {t("decline")}
          </button>
        </article>
      ))}
    </section>
  );
}
