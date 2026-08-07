import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./useAuth";

describe("useAuth", () => {
  it("lança erro quando usado fora de um AuthProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider"
    );

    consoleError.mockRestore();
  });
});
