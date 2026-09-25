import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const nextThemesMock = vi.hoisted(() => ({
  ThemeProvider: vi.fn(({ children }: { children: React.ReactNode }) => children),
}));

vi.mock("next-themes", () => ({
  ThemeProvider: nextThemesMock.ThemeProvider,
}));

import { ThemeProvider } from "@/components/theme-provider";

describe("ThemeProvider", () => {
  it("forwards supported next-themes options and preserves children", () => {
    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <span>Theme-aware content</span>
      </ThemeProvider>,
    );

    expect(screen.getByText("Theme-aware content")).toBeInTheDocument();
    expect(nextThemesMock.ThemeProvider).toHaveBeenCalledOnce();
    const [props] = nextThemesMock.ThemeProvider.mock.calls[0];
    expect(props).toEqual(expect.objectContaining({
      attribute: "class",
      defaultTheme: "light",
      enableSystem: false,
      disableTransitionOnChange: true,
    }));
    expect(props.children).toBeDefined();
  });
});