import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CountrySelectField from "./CountrySelectField";

describe("CountrySelectField", () => {
  it("shows a full country-name list while returning ISO alpha-2 codes", () => {
    const onChange = vi.fn();
    render(
      <CountrySelectField
        id="test-country"
        label="Country"
        value="GB"
        onChange={onChange}
        required
      />,
    );

    const select = screen.getByRole("combobox", { name: /Country/ }) as HTMLSelectElement;
    expect(select.value).toBe("GB");
    expect(select.options.length).toBeGreaterThan(240);
    expect(screen.getByRole("option", { name: "United Kingdom" }).getAttribute("value")).toBe("GB");
    expect(screen.getByRole("option", { name: "Nigeria" }).getAttribute("value")).toBe("NG");

    fireEvent.change(select, { target: { value: "NG" } });
    expect(onChange).toHaveBeenCalledWith("NG");
  });

  it("keeps a saved unlisted code visible so an existing record can still be edited", () => {
    render(
      <CountrySelectField
        id="legacy-country"
        label="Country"
        value="ZZ"
        onChange={() => undefined}
      />,
    );

    const select = screen.getByRole("combobox", { name: /Country/ }) as HTMLSelectElement;
    expect(select.value).toBe("ZZ");
    expect(screen.getByRole("option", { name: "Existing country code (ZZ)" })).toBeTruthy();
  });
});
