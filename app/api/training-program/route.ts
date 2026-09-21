import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { followupDatabase } from "@/lib/training/followup-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { loadEffectiveEntitlementContext } from "@/lib/entitlements/server-context";
import { validateEditorDays } from "@/lib/training/program-editor";

const schema = z
  .object({
    operationId: z.string().uuid(),
    action: z.enum(["save", "activate", "archive", "restore"]),
    programId: z.string().uuid().nullable(),
    expected: z.record(z.string(), z.unknown()).nullable(),
    activeProgramId: z.string().uuid().nullable().optional(),
    versionId: z.string().uuid().optional(),
    candidate: z
      .object({
        name: z.string().trim().min(1).max(200),
        days: z.array(z.record(z.string(), z.unknown())).min(1).max(7),
        description: z.string().max(10000).optional(),
        source: z.enum(["manual", "ai", "import"]).optional(),
        total_weeks: z.number().int().min(1).max(104).optional(),
        phases: z.array(z.record(z.string(), z.unknown())).max(12).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export async function POST(req: NextRequest) {
  try {
    const auth = await createSupabaseRouteClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user)
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    if (!checkRateLimit(`program-edit:${user.id}`, 20, 60000).allowed)
      return NextResponse.json({ code: "rate_limit" }, { status: 429 });
    const body = await req.text();
    if (body.length > 250000)
      return NextResponse.json({ code: "too_large" }, { status: 413 });
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return NextResponse.json({ code: "invalid" }, { status: 400 });
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success)
      return NextResponse.json({ code: "invalid" }, { status: 400 });
    const { operationId, ...input } = parsed.data;
    if (
      input.action === "save" &&
      (!input.candidate || !validateEditorDays(input.candidate.days))
    )
      return NextResponse.json({ code: "invalid_program" }, { status: 422 });
    const db = followupDatabase();
    const profile = await db
      .from("profiles")
      .select("subscription_type")
      .eq("id", user.id)
      .single();
    if (profile.error) throw profile.error;
    const context = await loadEffectiveEntitlementContext(
      user.id,
      profile.data.subscription_type,
    );
    if (!context.capabilities.training)
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    const result = await db.rpc("edit_training_program_v1", {
      p_user_id: user.id,
      p_operation_id: operationId,
      p_request: input,
    });
    if (result.error)
      return NextResponse.json(
        { code: "changed_or_unavailable" },
        {
          status:
            result.error.code === "42501"
              ? 403
              : result.error.code === "PT404"
                ? 404
                : result.error.code === "PT409"
                  ? 409
                  : result.error.code === "PT422"
                    ? 422
                    : 503,
        },
      );
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ code: "unavailable" }, { status: 503 });
  }
}
