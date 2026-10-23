import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRoute } from "@/App";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  setLocation: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wouter")>()),
  useLocation: () => ["/dashboard", mocks.setLocation],
}));

vi.mock("@/pages/Login", () => ({
  default: () => <div data-testid="login-screen">Sign in screen</div>,
}));

describe("AuthRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the protected content behind a loading state", () => {
    mocks.useAuth.mockReturnValue({ user: undefined, isLoading: true });

    render(
      <AuthRoute>
        <div data-testid="protected-content">Protected content</div>
      </AuthRoute>,
    );

    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login-screen")).not.toBeInTheDocument();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders protected content for an authenticated session", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: 1, email: "user@example.com" },
      isLoading: false,
    });

    render(
      <AuthRoute>
        <div data-testid="protected-content">Protected content</div>
      </AuthRoute>,
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.queryByTestId("login-screen")).not.toBeInTheDocument();
  });

  it("returns unauthenticated visitors to the sign-in screen", async () => {
    mocks.useAuth.mockReturnValue({ user: null, isLoading: false });

    render(
      <AuthRoute>
        <div data-testid="protected-content">Protected content</div>
      </AuthRoute>,
    );

    expect(screen.getByTestId("login-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/login"));
  });
});