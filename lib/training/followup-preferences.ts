import { z } from "zod";

export const followupPreferencesSchema = z
  .object({
    enabled: z.boolean(),
    monthly_review: z.boolean(),
    advanced_techniques: z.boolean(),
  })
  .strict();
export type FollowupPreferences = z.infer<typeof followupPreferencesSchema>;
export const DEFAULT_FOLLOWUP: FollowupPreferences = {
  enabled: false,
  monthly_review: false,
  advanced_techniques: false,
};
