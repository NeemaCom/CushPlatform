import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import V2AssessmentPanel from "./V2AssessmentPanel";

vi.mock("@/components/passport/MonoBankDataPanel", () => ({
  default: () => <div data-testid="mono-options">Mono bank connection options</div>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("V2AssessmentPanel", () => {
  it("keeps bank and credit options visible when the assessment summary is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/passport/v2")) {
          return {
            ok: false,
            json: async () => ({
              code: "V2_SCHEMA_MISSING",
              error: "Assessment summary is unavailable.",
            }),
          } as Response;
        }
        if (url.endsWith("/api/interswitch/credit-history/status")) {
          return {
            ok: true,
            json: async () => ({
              configured: false,
              providerReadiness: { mode: "unconfigured", configured: false },
              consentSchemaReady: true,
              evidenceSchemaReady: true,
              latest: null,
            }),
          } as Response;
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <V2AssessmentPanel />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Assessment summary unavailable")).toBeTruthy();
    expect(screen.getByTestId("mono-options")).toBeTruthy();
    expect(screen.getByText("Credit Check")).toBeTruthy();
  });
});
