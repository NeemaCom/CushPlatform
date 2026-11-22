import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
            profileDraft: null,
            profileDraftUpdatedAt: null,
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

  it("restores an encrypted Post-Arrival draft and opens it for editing", async () => {
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
              data: {},
              updatedAt: "2026-11-22T00:00:00.000Z",
            },
            profileDraft: { accountHolderName: "Draft name", accountHolderEmail: "name@" },
            profileDraftUpdatedAt: "2026-11-22T00:10:00.000Z",
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

    expect(await screen.findByText("Draft saved privately. It does not affect your Score or Confidence.")).toBeTruthy();
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Draft name");
    expect(screen.getByRole("button", { name: "Discard draft" })).toBeTruthy();
  });

  it("autosaves unfinished Post-Arrival contact edits without confirming them", async () => {
    const requests: Array<{ path: string; method: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), "http://localhost").pathname;
      requests.push({ path, method: init?.method ?? "GET" });
      if (path === "/api/passport/post-arrival") {
        return {
          ok: true,
          json: async () => ({
            profile: {
              arrivalStatus: "arrived",
              arrivalDate: "2026-11-01",
              arrivalConfirmedAt: "2026-11-01T10:00:00.000Z",
              data: {},
              updatedAt: "2026-11-22T00:00:00.000Z",
            },
            profileDraft: null,
            profileDraftUpdatedAt: null,
            records: [],
          }),
        } as Response;
      }
      if (path === "/api/passport/post-arrival/profile/draft") {
        return { ok: true, json: async () => ({ saved: true, updatedAt: "2026-11-22T00:10:00.000Z" }) } as Response;
      }
      if (path === "/api/passport/currencies") {
        return { ok: true, json: async () => ({ currencies: [] }) } as Response;
      }
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${path}`);
    }));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <PostArrivalPanel view="information" />
      </QueryClientProvider>,
    );

    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Unfinished name" } });
    await waitFor(() => {
      expect(requests.some((request) => request.path === "/api/passport/post-arrival/profile/draft" && request.method === "PUT")).toBe(true);
    }, { timeout: 3000 });
    expect(requests.some((request) => request.path === "/api/passport/post-arrival/profile" && request.method === "PUT")).toBe(false);
  });
});
