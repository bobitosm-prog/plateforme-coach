"use client";
import { useEffect, useState } from "react";
import {
  DEFAULT_FOLLOWUP,
  followupPreferencesSchema,
  type FollowupPreferences,
} from "@/lib/training/followup-preferences";

export function useTrainingFollowup() {
  const [preferences, setPreferences] =
    useState<FollowupPreferences>(DEFAULT_FOLLOWUP);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/training-followup/preferences", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("unavailable");
        const data = followupPreferencesSchema.parse(await response.json());
        if (active) {
          setPreferences(data);
          setState("ready");
        }
      } catch {
        if (active) {
          setPreferences(DEFAULT_FOLLOWUP);
          setState("error");
        }
      }
    };
    void load();
    const changed = (event: Event) => {
      const result = followupPreferencesSchema.safeParse(
        (event as CustomEvent).detail,
      );
      if (result.success) {
        setPreferences(result.data);
        setState("ready");
      } else void load();
    };
    window.addEventListener("training-followup-changed", changed);
    return () => {
      active = false;
      window.removeEventListener("training-followup-changed", changed);
    };
  }, []);
  return { preferences, state };
}
