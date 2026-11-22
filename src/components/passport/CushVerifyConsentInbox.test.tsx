import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CushVerifyConsentInbox from "./CushVerifyConsentInbox";

const pendingRequest = {
  id: "request-1",
  institutionName: "Northstar Housing",
  purpose: "Review a rental application",
  requestedCategories: ["income_employment"],
  requestedAuthorizationDays: 14,
  status: "awaiting_consent",
  requestExpiresAt: "2026-12-01T12:00:00.000Z",
  authorizationExpiresAt: null,
  createdAt: "2026-11-22T12:00:00.000Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CushVerifyConsentInbox", () => {
  it("starts collapsed and records only the categories the user selects", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return { ok: true, json: async () => ({ ok: true }) } as Response;
      return { ok: true, json: async () => ({ requests: [pendingRequest] }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CushVerifyConsentInbox />
      </QueryClientProvider>,
    );

    const heading = await screen.findByText("Cush Verify requests");
    const details = heading.closest("section")?.querySelector("details");
    expect(details?.open).toBe(false);
    expect(screen.getByText("1 request need your decision")).toBeTruthy();

    fireEvent.click(heading.closest("summary")!);
    expect(details?.open).toBe(true);
    await screen.findByText("Northstar Housing");

    fireEvent.click(screen.getByLabelText("Income and employment"));
    fireEvent.click(screen.getByRole("button", { name: "Approve selected" }));

    await waitFor(() => {
      const decisionCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(decisionCall).toBeTruthy();
      expect(JSON.parse(String(decisionCall?.[1]?.body))).toEqual({
        decision: "approve",
        categories: ["income_employment"],
        authorizationDays: 14,
      });
    });
  });
});
