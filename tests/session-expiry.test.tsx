import { render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/hooks/useAuth";
import { QueryProvider } from "@/lib/query-provider";
import { getQueryFn } from "@/lib/queryClient";

function ProtectedRequest() {
  useQuery({
    queryKey: ["/api/protected/resource"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  return <div data-testid="protected-content">Protected content</div>;
}

function SessionAwarePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading session</div>;
  if (!user) return <div data-testid="sign-in">Sign in</div>;
  return <ProtectedRequest />;
}

describe("session expiry in the frontend", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/me")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 7,
              username: "test-user",
              email: "user@example.com",
              role: "customer",
              firstName: "Test",
              lastName: "User",
            }),
          } as Response;
        }

        const body = JSON.stringify({ error: "Session expired" });
        return {
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          text: async () => body,
        } as Response;
      }),
    );
  });

  it("clears stale auth state after a protected request gets a session-expired response", async () => {
    render(
      <QueryProvider>
        <SessionAwarePage />
      </QueryProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("sign-in")).toBeInTheDocument());
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
