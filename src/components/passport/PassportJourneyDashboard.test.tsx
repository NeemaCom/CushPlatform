import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PassportJourneyDashboard from "./PassportJourneyDashboard";

vi.mock("@/components/passport/CushVerifyConsentInbox", () => ({
  default: () => null,
}));

vi.mock("@/components/passport/PassportEvidenceIntake", () => ({
  default: ({ period, view, onSaved }: { period: string; view: string; onSaved?: () => void }) => (
    <div data-testid={`evidence-${period}-${view}`}>
      <label>
        Financial draft
        <input aria-label="Financial draft" defaultValue="" />
      </label>
      {onSaved && <button type="button" onClick={onSaved}>Save and continue</button>}
    </div>
  ),
}));

vi.mock("@/components/passport/PostArrivalPanel", () => ({
  default: ({ view }: { view: string }) => <div data-testid={`post-arrival-${view}`} />,
}));

vi.mock("@/components/passport/V2AssessmentPanel", () => ({
  default: () => <div data-testid="pre-arrival-connections" />,
}));

const passport = {
  score: null,
  provisionalScore: 640,
  scoreCoveragePercent: 35,
  confidenceScore: 48,
  assessmentStatus: "provisional" as const,
  missingRequirements: ["Connect a bank account"],
  mode: "pre_arrival",
  lastUpdated: null,
};

function renderDashboard(onModeChange = vi.fn()) {
  return {
    onModeChange,
    ...render(
      <PassportJourneyDashboard
        passport={passport}
        scoreSummary={<div>Score summary</div>}
        sharePanel={<div>Share panel</div>}
        modePending={false}
        monoCodePending={false}
        onModeChange={onModeChange}
      />,
    ),
  };
}

describe("PassportJourneyDashboard", () => {
  it("keeps the server-backed stage switch and exposes the outstanding assessment items", () => {
    const { onModeChange } = renderDashboard();

    fireEvent.click(screen.getByRole("tab", { name: "Post-arrival" }));

    expect(onModeChange).toHaveBeenCalledWith("post_arrival");
    expect(screen.getByText("1 outstanding item")).toBeTruthy();
  });

  it("clearly marks Post-arrival as selected and updates the stage heading", () => {
    const onModeChange = vi.fn();
    const props = {
      passport,
      scoreSummary: <div>Score summary</div>,
      sharePanel: <div>Share panel</div>,
      modePending: false,
      monoCodePending: false,
      onModeChange,
    };
    const { rerender } = render(<PassportJourneyDashboard {...props} />);

    fireEvent.click(screen.getByRole("tab", { name: "Post-arrival" }));
    expect(onModeChange).toHaveBeenCalledWith("post_arrival");

    rerender(
      <PassportJourneyDashboard
        {...props}
        passport={{ ...passport, mode: "post_arrival" }}
      />,
    );

    const selectedTab = screen.getByRole("tab", { name: /Post-arrival/ });
    expect(selectedTab.getAttribute("aria-selected")).toBe("true");
    expect(selectedTab.className).toContain("bg-teal-700");
    expect(screen.getByText("Build your new financial history")).toBeTruthy();
  });

  it("retains an unsaved financial draft while changing drawer sections", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /Financial information/ }));
    const draft = screen.getByLabelText("Financial draft") as HTMLInputElement;
    fireEvent.change(draft, { target: { value: "draft amount" } });
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    expect(screen.getByTestId("evidence-pre_arrival-documents")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close section" }));

    fireEvent.click(screen.getByRole("button", { name: /Financial information/ }));
    expect((screen.getByLabelText("Financial draft") as HTMLInputElement).value).toBe("draft amount");
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
  });
});
