import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/pages/Login";

const mocks = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  setLocation: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/firebase.js", () => ({
  auth: {},
  googleProvider: {},
  signInWithPopup: mocks.signInWithPopup,
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/login", mocks.setLocation],
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Login />
    </QueryClientProvider>,
  );
}

function syncResponse(status: number, body: Record<string, unknown>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

const firebaseUser = {
  uid: "firebase-user-1",
  email: "user@example.com",
  displayName: "Test User",
  photoURL: null,
  emailVerified: true,
};

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("syncs a successful Firebase sign-in and redirects to the dashboard", async () => {
    mocks.signInWithEmailAndPassword.mockResolvedValue({ user: firebaseUser });
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(200, { success: true, user: { id: 1 } }) as Response,
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" })[1]);

    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/dashboard"));
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/firebase-sync",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ uid: firebaseUser.uid, email: firebaseUser.email }),
    );
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("shows a session error when Firebase sync fails after authentication", async () => {
    mocks.signInWithEmailAndPassword.mockResolvedValue({ user: firebaseUser });
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(500, { error: "Session creation failed" }) as Response,
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" })[1]);

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sign-in failed",
          description: "Session creation failed",
          variant: "destructive",
        }),
      ),
    );
    expect(mocks.setLocation).not.toHaveBeenCalled();
  });

  it("maps a failed Firebase credential check to a safe error", async () => {
    mocks.signInWithEmailAndPassword.mockRejectedValue({
      code: "auth/invalid-credential",
      message: "Firebase credential details",
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" })[1]);

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sign-in failed",
          description: "Invalid email or password.",
          variant: "destructive",
        }),
      ),
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.setLocation).not.toHaveBeenCalled();
  });
});