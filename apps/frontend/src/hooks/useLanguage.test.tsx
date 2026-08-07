import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLanguage } from "./useLanguage";

describe("useLanguage", () => {
  it("lança erro quando usado fora de um LanguageProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useLanguage())).toThrow(
      "useLanguage must be used within a LanguageProvider"
    );

    consoleError.mockRestore();
  });
});
