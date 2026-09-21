import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  user: { id: "owner" } as { id: string } | null,
  rate: vi.fn(),
  guard: vi.fn(),
  load: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseRouteClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
  }),
}));
vi.mock("@/lib/api-guard", () => ({
  guardCoachManagedCapabilities: mocks.guard,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.rate }));
vi.mock("@/lib/training/followup-server", () => ({
  loadFollowupState: mocks.load,
  followupAlternatives: async () => [],
}));
vi.mock("@/lib/training/generate-program", () => ({
  generateProgram: vi.fn(),
}));
vi.mock("@/lib/ai/heavy-reservation", () => ({ reserveHeavyAi: vi.fn() }));
import { GET, POST } from "@/app/api/training-followup/route";
const id = "77777777-7777-4777-8777-777777777771";
const request = (body: unknown) =>
  new NextRequest("https://app.example/api/training-followup", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "owner" };
  mocks.rate.mockReturnValue({ allowed: true });
  mocks.guard.mockResolvedValue(null);
  mocks.load.mockResolvedValue({
    preferences: { enabled: true, monthly_review: false },
    db: { rpc: mocks.rpc },
  });
  mocks.rpc.mockResolvedValue({
    data: { already_applied: false },
    error: null,
  });
});
describe("training follow-up HTTP boundary", () => {
  it("requires auth and rate/entitlement checks before accessing private state", async () => {
    mocks.user = null;
    expect((await GET()).status).toBe(401);
    mocks.user = { id: "owner" };
    mocks.rate.mockReturnValue({ allowed: false });
    expect((await POST(request({ action: "apply", id }))).status).toBe(429);
    mocks.rate.mockReturnValue({ allowed: true });
    mocks.guard.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await GET()).status).toBe(403);
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("rejects client-supplied ownership and candidates", async () => {
    expect(
      (
        await POST(
          request({ action: "apply", id, user_id: "other", candidate: {} }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("applies only an identified stored proposal with the authenticated owner", async () => {
    expect((await POST(request({ action: "apply", id }))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "apply_training_followup_v1",
      { p_user_id: "owner", p_proposal_id: id },
    );
  });
  it("fails closed for disabled follow-up and changed proposals", async () => {
    mocks.load.mockResolvedValueOnce({ preferences: { enabled: false } });
    expect((await POST(request({ action: "apply", id }))).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PT409" } });
    expect((await POST(request({ action: "apply", id }))).status).toBe(409);
  });
});
