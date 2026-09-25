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
  getIdToken: vi.fn().mockResolvedValue("verified-id-token"),
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function openSignUpForm() {
  fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
}

function getSignUpSubmitButton() {
  const createAccountButtons = screen.getAllByRole("button", { name: "Create Account" });
  return createAccountButtons[createAccountButtons.length - 1];
}

function submitSignUpForm() {
  fireEvent.click(getSignUpSubmitButton());
}

function fillSignUpForm() {
  fireEvent.change(screen.getByLabelText("First Name"), {
    target: { value: "Test" },
  });
  fireEvent.change(screen.getByLabelText("Last Name"), {
    target: { value: "User" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "ValidPass123!" },
  });
}

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
      { idToken: "verified-id-token" },
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

  it("syncs a successful Google sign-in, shows loading, and redirects", async () => {
    const popup = deferred<{ user: typeof firebaseUser }>();
    mocks.signInWithPopup.mockReturnValue(popup.promise);
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(200, { success: true, user: { id: 1 } }) as Response,
    );

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    expect(mocks.setLocation).not.toHaveBeenCalled();

    popup.resolve({ user: firebaseUser });
    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/dashboard"));

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/firebase-sync",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1].body)).toEqual(
      { idToken: "verified-id-token" },
    );
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it.each([
    ["popup closed", "auth/popup-closed-by-user", "The popup was closed."],
    ["popup blocked", "auth/popup-blocked", "The popup was blocked."],
    [
      "Google provider disabled",
      "auth/operation-not-allowed",
      "Google sign-in is not enabled for this project.",
    ],
  ])("reports Google provider failure when the %s", async (_caseName, code, message) => {
    mocks.signInWithPopup.mockRejectedValue({ code, message });

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Google sign-in failed",
          description: message,
          variant: "destructive",
        }),
      ),
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.setLocation).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });

  it("shows a sync error and does not redirect after Google provider success", async () => {
    mocks.signInWithPopup.mockResolvedValue({ user: firebaseUser });
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(500, { error: "Session creation failed" }) as Response,
    );

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Google sign-in failed",
          description: "Session creation failed",
          variant: "destructive",
        }),
      ),
    );

    expect(mocks.setLocation).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });

  it("syncs a created account, shows loading, and redirects", async () => {
    const accountCreation = deferred<{ user: typeof firebaseUser }>();
    mocks.createUserWithEmailAndPassword.mockReturnValue(accountCreation.promise);
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(200, { success: true, user: { id: 1 } }) as Response,
    );

    renderLogin();
    openSignUpForm();
    fillSignUpForm();
    submitSignUpForm();

    expect(screen.getByRole("button", { name: "Creating account…" })).toBeDisabled();
    expect(mocks.setLocation).not.toHaveBeenCalled();

    accountCreation.resolve({ user: { ...firebaseUser, emailVerified: false } });
    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/dashboard"));

    expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      "user@example.com",
      "ValidPass123!",
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/firebase-sync",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1].body)).toEqual(
      { idToken: "verified-id-token", firstName: "Test", lastName: "User" },
    );
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Account created!" }),
    );
    expect(getSignUpSubmitButton()).toBeEnabled();
  });

  it.each([
    [
      "email already in use",
      "auth/email-already-in-use",
      "An account with this email already exists.",
    ],
    ["weak password", "auth/weak-password", "Password must be at least 6 characters."],
    [
      "password policy failure",
      "auth/password-does-not-meet-requirements",
      "Password needs upper & lowercase letters, a number, and a special character.",
    ],
  ])("shows a useful account-creation error for %s", async (_caseName, code, description) => {
    mocks.createUserWithEmailAndPassword.mockRejectedValue({
      code,
      message: "Firebase internal message",
    });

    renderLogin();
    openSignUpForm();
    fillSignUpForm();
    submitSignUpForm();

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sign-up failed",
          description,
          variant: "destructive",
        }),
      ),
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.setLocation).not.toHaveBeenCalled();
    expect(getSignUpSubmitButton()).toBeEnabled();
  });

  it("does not redirect when account creation succeeds but session sync fails", async () => {
    mocks.createUserWithEmailAndPassword.mockResolvedValue({ user: firebaseUser });
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(500, { error: "Session creation failed" }) as Response,
    );

    renderLogin();
    openSignUpForm();
    fillSignUpForm();
    submitSignUpForm();

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sign-up failed",
          description: "Session creation failed",
          variant: "destructive",
        }),
      ),
    );

    expect(mocks.setLocation).not.toHaveBeenCalled();
    expect(getSignUpSubmitButton()).toBeEnabled();
  });
});