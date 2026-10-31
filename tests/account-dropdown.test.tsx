import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Router, useLocation } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import AccountDropdown from "@/components/AccountDropdown";

function CurrentPath() {
  const [location] = useLocation();
  return <output data-testid="current-path">{location}</output>;
}

function renderMenu(onSignOut = vi.fn()) {
  const { hook } = memoryLocation({ path: "/dashboard" });
  render(
    <Router hook={hook}>
      <AccountDropdown
        user={{
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          isEmailVerified: true,
          isPhoneVerified: false,
        }}
        onSignOut={onSignOut}
      />
      <CurrentPath />
    </Router>,
  );
  return onSignOut;
}

function openMenu() {
  fireEvent.keyDown(screen.getByRole("button", { name: /Account menu for Ada Lovelace/i }), { key: "Enter" });
}

describe("AccountDropdown", () => {
  it("shows the authenticated user's identity and an accurate partial verification status", () => {
    renderMenu();
    openMenu();

    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ada@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("Partially verified")).toBeInTheDocument();
  });

  it("navigates to account sections and closes after a section is selected", () => {
    renderMenu();
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Personal Profile" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/account/profile");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("offers every requested account and help destination", () => {
    renderMenu();
    openMenu();

    const destinations = screen.getAllByRole("menuitem")
      .map((item) => item.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
    expect(new Set(destinations)).toEqual(new Set([
      "/account/profile",
      "/account/financial-identity",
      "/account/documents",
      "/account/verification",
      "/account/connected-accounts",
      "/account/security",
      "/account/preferences",
      "/support",
      "/contact",
    ]));
  });

  it("calls the existing sign-out action from the menu", () => {
    const onSignOut = renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign Out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
