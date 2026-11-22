import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PassportEvidenceIntake from "./PassportEvidenceIntake";

const { toastSpy } = vi.hoisted(() => ({ toastSpy: vi.fn() }));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  toastSpy.mockClear();
});

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response;
}

function AssessmentQuerySubscriber() {
  useQuery({
    queryKey: ["/api/passport/me"],
    queryFn: async () => {
      const response = await fetch("/api/passport/me");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Assessment refresh failed.");
      return payload;
    },
    retry: false,
    staleTime: Infinity,
  });
  return null;
}

function renderIntake(view: "profile" | "documents" = "profile", subscribeToAssessment = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <>
        <PassportEvidenceIntake period="pre_arrival" view={view} />
        {subscribeToAssessment && <AssessmentQuerySubscriber />}
      </>
    </QueryClientProvider>,
  );
}

describe("PassportEvidenceIntake disclosures", () => {
  it("starts saved sections collapsed and keeps them closed after saving", async () => {
    const savedProfile = {
      countryCode: "GB",
      currencyCode: "GBP",
      employmentStatus: "Employed",
      employer: "Example employer",
      jobTitle: "Analyst",
      incomeAmount: "2500",
      incomeFrequency: "monthly",
      incomeCategory: "salary",
      housingStatus: "Renting",
      housingCost: "800",
      savingsAmount: "5000",
      savingsLabel: "Savings",
      commitmentsAmount: "200",
      completeCashFlow: true,
      financialHistorySummary: "Saved history",
      financialHistory: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/passport/financial-profile") {
        return jsonResponse({
          profile: savedProfile,
          draft: null,
          draftUpdatedAt: null,
          progress: { completed: 6, total: 6, percent: 100, steps: [] },
          updatedAt: "2026-11-22T00:00:00.000Z",
        });
      }
      if (path === "/api/passport/evidence-submissions") return jsonResponse({ submissions: [] });
      if (path === "/api/passport/currencies") return jsonResponse({ currencies: [{ code: "GBP", label: "GBP — British Pound" }] });
      if (path === "/api/passport/evidence-history") return jsonResponse({ events: [] });
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${path}`);
    }));

    renderIntake();
    expect(await screen.findByText("Profile completeness")).toBeTruthy();

    const details = ["Income and employment", "Housing and rent", "Savings and commitments", "Monthly history across countries"]
      .map((title) => screen.getByText(title).closest("details") as HTMLDetailsElement);
    expect(details.every((element) => !element.open)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(details.every((element) => !element.open)).toBe(true));

    fireEvent.click(screen.getByText("Income and employment"));
    expect(details[0].open).toBe(true);
  });

  it("does not report a refreshed Score when the assessment request fails after saving", async () => {
    let passportRequests = 0;
    const requestedPaths: string[] = [];
    const savedProfile = {
      countryCode: "NG",
      currencyCode: "NGN",
      employmentStatus: "Employed",
      employer: "",
      jobTitle: "",
      incomeAmount: "300000",
      incomeFrequency: "monthly",
      incomeCategory: "salary",
      housingStatus: "",
      housingCost: "",
      savingsAmount: "",
      savingsLabel: "",
      commitmentsAmount: "",
      completeCashFlow: false,
      financialHistorySummary: "",
      financialHistory: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), "http://localhost").pathname;
      requestedPaths.push(`${init?.method ?? "GET"} ${path}`);
      if (path === "/api/passport/me") {
        passportRequests += 1;
        return passportRequests === 1
          ? jsonResponse({ passport: { score: 0, provisionalScore: null } })
          : jsonResponse({ error: "Assessment refresh failed." }, 503);
      }
      if (path === "/api/passport/financial-profile" && init?.method === "PUT") {
        return jsonResponse({ profile: savedProfile });
      }
      if (path === "/api/passport/financial-profile") {
        return jsonResponse({
          profile: savedProfile,
          draft: null,
          draftUpdatedAt: null,
          progress: { completed: 0, total: 6, percent: 0, steps: [] },
          updatedAt: null,
        });
      }
      if (path === "/api/passport/evidence-submissions") return jsonResponse({ submissions: [] });
      if (path === "/api/passport/currencies") return jsonResponse({ currencies: [{ code: "NGN", label: "NGN — Nigerian Naira" }] });
      if (path === "/api/passport/evidence-history") return jsonResponse({ events: [] });
      if (path === "/api/passport/v2") return jsonResponse({ calculation: {} });
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${path}`);
    }));

    renderIntake("profile", true);
    await screen.findByText("Profile completeness");
    await waitFor(() => expect(passportRequests).toBe(1));

    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(passportRequests).toBe(2));
    expect(requestedPaths).toContain("PUT /api/passport/financial-profile");
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: "Profile saved; Score not refreshed",
      }));
    });
  });

  it("starts the upload panel collapsed when a document is already on file", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/passport/financial-profile") {
        return jsonResponse({
          profile: null,
          draft: null,
          draftUpdatedAt: null,
          progress: { completed: 0, total: 6, percent: 0, steps: [] },
          updatedAt: null,
        });
      }
      if (path === "/api/passport/evidence-submissions") {
        return jsonResponse({
          submissions: [{
            id: 1,
            period: "pre_arrival",
            documentType: "payslip",
            label: "October payslip",
            fileName: "payslip.pdf",
            mimeType: "application/pdf",
            fileSize: 1024,
            countryCode: "GB",
            currencyCode: "GBP",
            reviewStatus: "submitted",
            evidenceClassification: "self_declared",
            submittedAt: "2026-11-20T10:00:00.000Z",
            reviewedAt: null,
            createdAt: "2026-11-20T10:00:00.000Z",
            updatedAt: "2026-11-20T10:00:00.000Z",
          }],
        });
      }
      if (path === "/api/passport/currencies") return jsonResponse({ currencies: [] });
      if (path === "/api/passport/evidence-history") return jsonResponse({ events: [] });
      throw new Error(`Unexpected request: ${path}`);
    }));

    renderIntake("documents");
    expect(await screen.findByText("October payslip")).toBeTruthy();
    const uploadDetails = screen.getByText("Add a supporting document").closest("details") as HTMLDetailsElement;
    expect(uploadDetails.open).toBe(false);

    fireEvent.click(screen.getByText("Add a supporting document"));
    expect(uploadDetails.open).toBe(true);
    expect(screen.getByRole("button", { name: "Upload privately" })).toBeTruthy();
  });

  it("restores a private financial draft separately from the confirmed profile", async () => {
    const draft = {
      countryCode: "GB",
      currencyCode: "GBP",
      employmentStatus: "",
      employer: "Draft employer",
      jobTitle: "",
      incomeAmount: "",
      incomeFrequency: "",
      incomeCategory: "other",
      housingStatus: "",
      housingCost: "",
      savingsAmount: "",
      savingsLabel: "",
      commitmentsAmount: "",
      completeCashFlow: false,
      financialHistorySummary: "",
      financialHistory: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input), "http://localhost").pathname;
      if (path === "/api/passport/financial-profile") {
        return jsonResponse({
          profile: null,
          draft,
          draftUpdatedAt: "2026-11-22T00:00:00.000Z",
          progress: { completed: 0, total: 6, percent: 0, steps: [] },
          updatedAt: null,
        });
      }
      if (path === "/api/passport/evidence-submissions") return jsonResponse({ submissions: [] });
      if (path === "/api/passport/currencies") return jsonResponse({ currencies: [] });
      if (path === "/api/passport/evidence-history") return jsonResponse({ events: [] });
      throw new Error(`Unexpected request: ${path}`);
    }));

    renderIntake();
    expect(await screen.findByText("Profile completeness")).toBeTruthy();
    fireEvent.click(screen.getByText("Income and employment"));
    expect((screen.getByLabelText("Employer") as HTMLInputElement).value).toBe("Draft employer");
    expect(await screen.findByRole("button", { name: "Discard draft" })).toBeTruthy();
    expect(await screen.findByText(/Draft saved privately/)).toBeTruthy();
  });

  it("autosaves edits as a draft without submitting confirmed financial data", async () => {
    const requests: Array<{ path: string; method: string; body: unknown }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const path = url.pathname;
      requests.push({
        path,
        method: init?.method ?? "GET",
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      if (path === "/api/passport/financial-profile") {
        return jsonResponse({
          profile: null,
          draft: null,
          draftUpdatedAt: null,
          progress: { completed: 0, total: 6, percent: 0, steps: [] },
          updatedAt: null,
        });
      }
      if (path === "/api/passport/financial-profile/draft") return jsonResponse({ saved: true, updatedAt: "2026-11-22T00:00:00.000Z" });
      if (path === "/api/passport/evidence-submissions") return jsonResponse({ submissions: [] });
      if (path === "/api/passport/currencies") return jsonResponse({ currencies: [] });
      if (path === "/api/passport/evidence-history") return jsonResponse({ events: [] });
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${path}`);
    }));

    renderIntake();
    expect(await screen.findByText("Profile completeness")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Employer"), { target: { value: "Draft employer" } });
    await waitFor(() => {
      expect(requests.some((request) => request.path === "/api/passport/financial-profile/draft" && request.method === "PUT")).toBe(true);
    }, { timeout: 3000 });
    expect(requests.some((request) => request.path === "/api/passport/financial-profile" && request.method === "PUT")).toBe(false);
    const savedDraft = requests.find((request) => request.path === "/api/passport/financial-profile/draft" && request.method === "PUT");
    expect(savedDraft?.body).toMatchObject({ employer: "Draft employer" });
  });
});
