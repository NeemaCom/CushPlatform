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
      {onSaved && <button type="button" onClick={onSaved}>Save and close</button>}
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
  it("shows the same three expandable journey steps for both arrival stages", () => {
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

    const informationStep = screen.getByRole("button", { name: /Self-provided information/ });
    const documentStep = screen.getByRole("button", { name: /Document upload/ });
    const connectionStep = screen.getByRole("button", { name: /Bank connection/ });
    expect(informationStep.className).toContain("from-indigo-50");
    expect(documentStep.className).toContain("from-violet-50");
    expect(connectionStep.className).toContain("from-teal-50");
    expect(informationStep.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(informationStep);
    expect(informationStep.getAttribute("aria-expanded")).toBe("true");
    expect(informationStep.className).toContain("from-indigo-100");
    expect(screen.getByTestId("evidence-pre_arrival-profile")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close section" }));

    fireEvent.click(documentStep);
    expect(documentStep.className).toContain("from-violet-100");
    expect(screen.getByTestId("evidence-pre_arrival-documents")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close section" }));

    fireEvent.click(connectionStep);
    expect(connectionStep.className).toContain("from-teal-100");
    expect(screen.getByTestId("pre-arrival-connections")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close section" }));

    rerender(<PassportJourneyDashboard {...props} passport={{ ...passport, mode: "post_arrival" }} />);
    expect(screen.getByRole("tabpanel", { name: "Post-arrival steps" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Self-provided information/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Document upload/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bank connection/ })).toBeTruthy();
  });

  it("keeps the server-backed stage switch and exposes the outstanding assessment items", () => {
    const { onModeChange } = renderDashboard();

    fireEvent.click(screen.getByRole("tab", { name: "Post-arrival" }));

    expect(onModeChange).toHaveBeenCalledWith("post_arrival");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("1 outstanding item")).toBeTruthy();
  });

  it("switches to Post-arrival options without opening the information drawer", () => {
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
    expect(screen.queryByRole("dialog")).toBeNull();

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
    expect(screen.getByRole("tabpanel", { name: "Post-arrival steps" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Self-provided information/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Document upload/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bank connection/ })).toBeTruthy();
  });

  it("closes after saving and preserves the financial draft when reopened", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /Self-provided information/ }));
    const draft = screen.getByLabelText("Financial draft") as HTMLInputElement;
    fireEvent.change(draft, { target: { value: "draft amount" } });
    fireEvent.click(screen.getByRole("button", { name: "Save and close" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Self-provided information/ }));
    expect((screen.getByLabelText("Financial draft") as HTMLInputElement).value).toBe("draft amount");
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
  });
});
