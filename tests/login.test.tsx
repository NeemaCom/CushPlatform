import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/pages/Login";

const mocks = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  reload: vi.fn(),
  signOut: vi.fn(),
  setLocation: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/firebase.js", () => ({
  auth: {},
  googleProvider: {},
  signInWithPopup: mocks.signInWithPopup,
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
  sendEmailVerification: mocks.sendEmailVerification,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  reload: mocks.reload,
  signOut: mocks.signOut,
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

function fillSignUpForm(includeConsent = true) {
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
  if (includeConsent) {
    fireEvent.click(screen.getByRole("checkbox", { name: /Terms of Service/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Privacy Policy/ }));
  }
}

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    mocks.sendEmailVerification.mockResolvedValue(undefined);
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
    mocks.reload.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue(undefined);
  });

  it("creates a server session for a successful password sign-in", async () => {
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
      "/api/auth/password-signin",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "user@example.com", password: "correct-password" }),
      }),
    );
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it("shows a server sign-in error and does not redirect", async () => {
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(500, { message: "Session creation failed" }) as Response,
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" })[1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Session creation failed");
    expect(mocks.setLocation).not.toHaveBeenCalled();
  });

  it("shows the number of attempts remaining after an incorrect password", async () => {
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(401, {
        code: "INVALID_CREDENTIALS",
        attemptsRemaining: 2,
        message: "Invalid email or password. 2 more attempts before a five-minute lockout.",
      }) as Response,
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" })[1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("2 more attempts");
    expect(fetch).toHaveBeenCalledWith("/api/auth/password-signin", expect.any(Object));
    expect(mocks.setLocation).not.toHaveBeenCalled();
  });

  it("shows a support link after a permanent account lock", async () => {
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(423, {
        code: "PERMANENT_ACCOUNT_LOCK",
        message: "This account is locked. Contact support@we-cush.com to restore access.",
      }) as Response,
    );

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" })[1]);

    const supportLink = await screen.findByRole("link", { name: "Contact support" });
    expect(supportLink).toHaveAttribute("href", "mailto:support@we-cush.com");
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

  it("creates a pending account, sends an activation link, and blocks dashboard access", async () => {
    const accountCreation = deferred<{ user: typeof firebaseUser }>();
    mocks.createUserWithEmailAndPassword.mockReturnValue(accountCreation.promise);
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(200, { success: true, requiresEmailVerification: true }) as Response,
    );

    renderLogin();
    openSignUpForm();
    fillSignUpForm();
    submitSignUpForm();

    expect(screen.getByRole("button", { name: "Creating account…" })).toBeDisabled();
    expect(mocks.setLocation).not.toHaveBeenCalled();

    accountCreation.resolve({ user: { ...firebaseUser, emailVerified: false } });
    expect(await screen.findByText("Verify your email to activate your account")).toBeInTheDocument();

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
      {
        idToken: "verified-id-token",
        firstName: "Test",
        lastName: "User",
        acceptTerms: true,
        acceptPrivacy: true,
        marketingConsent: false,
      },
    );
    expect(mocks.sendEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerified: false }),
      expect.objectContaining({ url: expect.stringContaining("emailVerified=1") }),
    );
    expect(mocks.setLocation).not.toHaveBeenCalled();
  });

  it("shows the server email-verification step and can resend the activation link", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(syncResponse(200, {
        success: true,
        requiresEmailVerification: true,
        verificationEmailSent: true,
        email: "user@example.com",
      }) as Response)
      .mockResolvedValueOnce(syncResponse(200, {
        success: true,
        requiresEmailVerification: true,
        verificationEmailSent: true,
        email: "user@example.com",
      }) as Response);

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" })[1]);

    expect(await screen.findByText("Verify your email to activate your account")).toBeInTheDocument();
    expect(mocks.setLocation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Verify your email" }),
    );
    expect(mocks.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("creates the server session after an unverified password account is activated", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(syncResponse(200, {
        success: true,
        requiresEmailVerification: true,
        verificationEmailSent: true,
        email: "user@example.com",
      }) as Response)
      .mockResolvedValueOnce(
        syncResponse(200, { success: true, user: { id: 1 } }) as Response,
      );

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Sign In" })[1]);
    fireEvent.click(await screen.findByRole("button", { name: "I’ve verified my email" }));

    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/dashboard"));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
      "/api/auth/password-signin",
      "/api/auth/password-signin",
    ]);
  });

  it("sends a Firebase password reset link with a generic response", async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText(
      "If an account exists for that email, a password reset link has been sent.",
    )).toBeInTheDocument();
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      {},
      "user@example.com",
      expect.objectContaining({ url: expect.stringContaining("passwordReset=1") }),
    );
  });

  it("does not reveal whether an email has a Firebase account during password reset", async () => {
    mocks.sendPasswordResetEmail.mockRejectedValue({ code: "auth/user-not-found" });

    renderLogin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "unknown@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText(
      "If an account exists for that email, a password reset link has been sent.",
    )).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();
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

  it("requires both agreements before creating an email account", async () => {
    renderLogin();
    openSignUpForm();
    fillSignUpForm(false);
    submitSignUpForm();

    expect(mocks.createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.setLocation).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Consent required",
        description: expect.stringContaining("accept the Terms of Service and Privacy Policy"),
        variant: "destructive",
      }),
    );
  });

  it("requires both agreements before Google account creation", async () => {
    renderLogin();
    openSignUpForm();
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(mocks.signInWithPopup).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Consent required",
        variant: "destructive",
      }),
    );
  });

  it("allows email signup with required policies accepted but marketing left unchecked", async () => {
    mocks.createUserWithEmailAndPassword.mockResolvedValue({
      user: { ...firebaseUser, emailVerified: false },
    });
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(200, { success: true, requiresEmailVerification: true }) as Response,
    );

    renderLogin();
    openSignUpForm();
    fillSignUpForm();

    const marketingCheckbox = screen.getByRole("checkbox", {
      name: /Email me product updates and offers/,
    });
    expect(marketingCheckbox).not.toBeChecked();
    expect(marketingCheckbox).not.toBeRequired();

    submitSignUpForm();
    expect(await screen.findByText("Verify your email to activate your account")).toBeInTheDocument();

    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1].body)).toMatchObject({
      acceptTerms: true,
      acceptPrivacy: true,
      marketingConsent: false,
    });
  });

  it("sends marketing consent when the user opts in during email signup", async () => {
    mocks.createUserWithEmailAndPassword.mockResolvedValue({
      user: { ...firebaseUser, emailVerified: false },
    });
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(200, { success: true, requiresEmailVerification: true }) as Response,
    );

    renderLogin();
    openSignUpForm();
    fillSignUpForm();
    fireEvent.click(screen.getByRole("checkbox", { name: /Email me product updates and offers/ }));
    submitSignUpForm();

    expect(await screen.findByText("Verify your email to activate your account")).toBeInTheDocument();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1].body)).toMatchObject({
      acceptTerms: true,
      acceptPrivacy: true,
      marketingConsent: true,
    });
  });

  it("sends consent for new Google accounts when using the create-account tab", async () => {
    mocks.signInWithPopup.mockResolvedValue({ user: firebaseUser });
    vi.mocked(fetch).mockResolvedValue(
      syncResponse(200, { success: true, user: { id: 1 }, isNewUser: true }) as Response,
    );

    renderLogin();
    openSignUpForm();
    fireEvent.click(screen.getByRole("checkbox", { name: /Terms of Service/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Privacy Policy/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/dashboard"));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1].body)).toEqual({
      idToken: "verified-id-token",
      acceptTerms: true,
      acceptPrivacy: true,
      marketingConsent: false,
    });
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