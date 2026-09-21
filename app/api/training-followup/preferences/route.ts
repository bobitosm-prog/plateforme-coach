import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { guardCoachManagedCapabilities } from "@/lib/api-guard";
import {
  DEFAULT_FOLLOWUP,
  followupPreferencesSchema,
} from "@/lib/training/followup-preferences";

export async function GET() {
  try {
    const db = await createSupabaseRouteClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    if (!checkRateLimit(`followup-read:${user.id}`, 60, 60000).allowed)
      return NextResponse.json({ code: "rate_limit" }, { status: 429 });
    const { data, error } = await db
      .from("training_followup_preferences")
      .select("enabled,monthly_review,advanced_techniques")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json(data ?? DEFAULT_FOLLOWUP, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ code: "unavailable" }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await createSupabaseRouteClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user)
      return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    if (!checkRateLimit(`followup-write:${user.id}`, 10, 60000).allowed)
      return NextResponse.json({ code: "rate_limit" }, { status: 429 });
    const parsed = followupPreferencesSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json({ code: "invalid_input" }, { status: 400 });
    // Disabling stays available, including after an entitlement change.
    if (parsed.data.enabled) {
      const denied = await guardCoachManagedCapabilities(user.id);
      if (denied) return denied;
    }
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await db
      .from("training_followup_preferences")
      .upsert(
        {
          user_id: user.id,
          ...parsed.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) throw error;
    return NextResponse.json(parsed.data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ code: "unavailable" }, { status: 503 });
  }
}
