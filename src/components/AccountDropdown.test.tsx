import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountDropdown } from "./AccountDropdown";

describe("AccountDropdown verification status", () => {
  it("shows an email-verified Google user as verified without requiring a phone", async () => {
    render(
      <AccountDropdown
        user={{
          firstName: "Ari",
          email: "ari@example.com",
          isEmailVerified: true,
          isPhoneVerified: false,
        }}
        onSignOut={vi.fn()}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Account menu for Ari" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("Email verified");
    expect(screen.queryByText("Partially verified")).toBeNull();
  });

  it("reports email verification as pending when the email is not verified", async () => {
    render(
      <AccountDropdown
        user={{
          email: "ari@example.com",
          phoneNumber: "+447700900123",
          isEmailVerified: false,
          isPhoneVerified: true,
        }}
        onSignOut={vi.fn()}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Account menu for ari" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("Phone verified · email pending");
  });
});
