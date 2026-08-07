import { describe, it, expect } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it("retorna '-' quando não há timestamp", () => {
    expect(formatDate(undefined)).toBe("-");
    expect(formatDate(0)).toBe("-");
  });

  it("formata timestamp numérico em pt-BR", () => {
    const result = formatDate(1723000000000);
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("formata string ISO em pt-BR", () => {
    const result = formatDate("2026-08-10T14:00:00.000Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
