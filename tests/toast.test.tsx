import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

describe("toast styling", () => {
  it("uses the Cush-branded high-contrast style for errors", () => {
    render(
      <ToastProvider>
        <Toast open variant="destructive" data-testid="branded-error-toast">
          <div>
            <ToastTitle>Sign-in not completed</ToastTitle>
            <ToastDescription>Please try again.</ToastDescription>
          </div>
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );

    expect(screen.getByTestId("branded-error-toast")).toHaveClass(
      "bg-gradient-to-br",
      "text-white",
    );
    expect(screen.getByText("Please try again.")).toBeInTheDocument();
  });
});
