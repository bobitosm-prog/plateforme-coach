// @vitest-environment jsdom
import * as React from "react";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ enabled: true }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/app/hooks/useTrainingFollowup", () => ({
  useTrainingFollowup: () => ({ preferences: state }),
}));
import FollowupPanel from "@/app/components/training/FollowupPanel";
const view = {
  enabled: true,
  monthlyDue: true,
  historyTruncated: false,
  trends: [],
  alternatives: [],
  proposals: [
    {
      id: "proposal",
      kind: "monthly",
      explanation: "Review",
      candidate: {
        name: "Next plan",
        days: [
          {
            name: "Monday",
            exercises: [
              { name: "Planche", sets: 3, reps: 0, duration_seconds: 35 },
            ],
          },
        ],
      },
    },
  ],
};
beforeEach(() => {
  state.enabled = true;
  vi.stubGlobal("React", React);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(JSON.stringify(view), {
            headers: { "Content-Type": "application/json" },
          }),
      ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("follow-up proposal review", () => {
  it("loads previews without applying a program and displays holds as seconds", async () => {
    render(
      React.createElement(FollowupPanel, {
        programId: "program",
        hasActiveDraft: false,
      }),
    );
    await screen.findByText("Next plan");
    expect(screen.getByText(/3 × 35 s/)).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init?.method)).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "decline" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/training-followup",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "decline", id: "proposal" }),
        }),
      ),
    );
  });
  it("disables program replacement during an active workout", async () => {
    render(
      React.createElement(FollowupPanel, {
        programId: "program",
        hasActiveDraft: true,
      }),
    );
    const approve = await screen.findByRole("button", { name: "approve" });
    expect((approve as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(approve);
    expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init?.method)).toBe(
      true,
    );
  });
  it("does not fetch or render follow-up before opt-in", () => {
    state.enabled = false;
    const rendered = render(
      React.createElement(FollowupPanel, {
        programId: "program",
        hasActiveDraft: false,
      }),
    );
    expect(rendered.container.textContent).toBe("");
    expect(fetch).not.toHaveBeenCalled();
  });
});
