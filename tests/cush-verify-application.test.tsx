import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import CushVerifyApplication from "@/pages/CushVerifyApplication";
import { CushVerifyActivation } from "@/pages/CushVerifyAuth";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  setLocation: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: mocks.apiRequest,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/verify/activate", mocks.setLocation],
  Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("Cush Verify application guidance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows missing organisation details and explains what remains before continuing", () => {
    render(<CushVerifyApplication />);

    expect(screen.getByText("4 items still needed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Institution legal name; Institution type; Country of registration; A valid website",
    );
    expect(screen.getByText("About your organisation")).toBeInTheDocument();
  });

  it("keeps account submission clickable and offers show/hide password controls", () => {
    render(<CushVerifyApplication />);

    fireEvent.change(screen.getByLabelText("Institution legal name"), {
      target: { value: "Example University" },
    });
    fireEvent.change(screen.getByLabelText("Institution type"), {
      target: { value: "university" },
    });
    fireEvent.change(screen.getByLabelText("Country of registration"), {
      target: { value: "Nigeria" },
    });
    fireEvent.change(screen.getByLabelText("Official website"), {
      target: { value: "https://example.edu.ng" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Your contact and sign-in")).toBeInTheDocument();
    const createAccountButton = screen.getByRole("button", { name: /create account/i });
    expect(createAccountButton).toBeEnabled();

    const passwordInput = screen.getByLabelText(/Create password/) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(createAccountButton);
    expect(screen.getByRole("alert")).toHaveTextContent("A valid official business email");
    expect(mocks.apiRequest).not.toHaveBeenCalled();
  });

  it("offers a retry and fresh activation link after activation fails", async () => {
    const validToken = "a".repeat(64);
    window.history.replaceState(null, "", `/verify/activate?token=${validToken}`);
    mocks.apiRequest.mockImplementation(async (_method: string, path: string) => {
      if (path === "/api/verify/activations/lookup") {
        return {
          json: async () => ({
            email: "admin@example.org",
            contactName: "Admin Example",
            institutionName: "Example University",
          }),
        };
      }
      if (path === "/api/verify/activations/complete") {
        throw new Error('503: {"error":"We could not activate the account. Try again or request a fresh activation link."}');
      }
      if (path === "/api/verify/applications/resend-activation") {
        return {
          json: async () => ({ message: "If the application is waiting, a fresh link has been sent." }),
        };
      }
      throw new Error(`Unexpected API path: ${path}`);
    });

    render(<CushVerifyActivation />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not activate the account");
    expect(screen.getByRole("button", { name: "Try activation again" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request a fresh activation link" }));

    expect(await screen.findByRole("status")).toHaveTextContent("a fresh link has been sent");
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/verify/applications/resend-activation",
      { businessEmail: "admin@example.org" },
    );
  });
});
