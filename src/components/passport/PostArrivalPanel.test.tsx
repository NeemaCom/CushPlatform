import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PostArrivalPanel from "./PostArrivalPanel";

vi.mock("@/components/passport/PassportEvidenceIntake", () => ({
  default: () => <div data-testid="financial-profile" />,
}));

vi.mock("@/components/passport/PlaidConnectionPanel", () => ({
  default: () => <div data-testid="plaid-panel" />,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PostArrivalPanel saved details", () => {
  it("starts saved account-holder details collapsed and lets the user reopen them", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/passport/post-arrival") {
        return {
          ok: true,
          json: async () => ({
            profile: {
              arrivalStatus: "arrived",
              arrivalDate: "2026-11-01",
              arrivalConfirmedAt: "2026-11-01T10:00:00.000Z",
              data: {
                accountHolderName: "Amina Example",
                accountHolderEmail: "amina@example.test",
                accountHolderPhone: "+44 7000 000000",
              },
              updatedAt: "2026-11-22T00:00:00.000Z",
            },
            records: [],
          }),
        } as Response;
      }
      if (path === "/api/passport/currencies") {
        return { ok: true, json: async () => ({ currencies: [] }) } as Response;
      }
      throw new Error(`Unexpected request: ${path}`);
    }));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <PostArrivalPanel view="information" />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Arrival and personal circumstances")).toBeTruthy();
    const detailsToggle = screen.getByRole("button", { name: /Edit details/ });
    expect(detailsToggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(detailsToggle);
    expect(detailsToggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Account holder contact details")).toBeTruthy();
  });
});
