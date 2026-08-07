/**
 * Testes para Validators
 */

import {
  validateMessage,
  validateEvent,
  validateQuery,
  validatePhoneNumber,
  validateEmail,
  validateISODate,
} from "./validators";

describe("validateMessage", () => {
  it("aceita mensagem válida", () => {
    const result = validateMessage({
      from: "5511999999999",
      message: "Amanhã 14h reunião",
      timestamp: Date.now(),
    });

    expect(result.isValid).toBe(true);
    expect(result.value?.from).toBe("5511999999999");
  });

  it("rejeita telefone fora do padrão", () => {
    const result = validateMessage({
      from: "abc",
      message: "Amanhã 14h",
      timestamp: Date.now(),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "from")).toBe(true);
  });

  it("rejeita mensagem ausente", () => {
    const result = validateMessage({ from: "5511999999999", timestamp: Date.now() });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "message")).toBe(true);
  });

  it("rejeita mensagem acima de 4096 caracteres", () => {
    const result = validateMessage({
      from: "5511999999999",
      message: "a".repeat(4097),
      timestamp: Date.now(),
    });

    expect(result.isValid).toBe(false);
  });

  it("rejeita timestamp ausente", () => {
    const result = validateMessage({ from: "5511999999999", message: "oi" });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "timestamp")).toBe(true);
  });
});

describe("validateEvent", () => {
  const base = {
    title: "Reunião com João",
    startTime: "2026-08-10T14:00:00.000Z",
    endTime: "2026-08-10T15:00:00.000Z",
  };

  it("aceita evento válido", () => {
    expect(validateEvent(base).isValid).toBe(true);
  });

  it("rejeita título acima de 100 caracteres", () => {
    const result = validateEvent({ ...base, title: "a".repeat(101) });
    expect(result.isValid).toBe(false);
  });

  it("rejeita quando endTime é anterior ou igual a startTime", () => {
    const result = validateEvent({
      ...base,
      startTime: "2026-08-10T15:00:00.000Z",
      endTime: "2026-08-10T14:00:00.000Z",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]?.field).toBe("endTime");
  });

  it("rejeita data em formato inválido", () => {
    const result = validateEvent({ ...base, startTime: "10 de agosto" });
    expect(result.isValid).toBe(false);
  });
});

describe("validateQuery", () => {
  it("aplica defaults de limit e offset", () => {
    const result = validateQuery({});

    expect(result.isValid).toBe(true);
    expect(result.value?.limit).toBe(50);
    expect(result.value?.offset).toBe(0);
  });

  it("rejeita limit acima de 100", () => {
    const result = validateQuery({ limit: 500 });
    expect(result.isValid).toBe(false);
  });
});

describe("validatePhoneNumber", () => {
  it.each(["5511999999999", "1234567890"])("aceita %s", (phone) => {
    expect(validatePhoneNumber(phone)).toBe(true);
  });

  it.each(["123", "abc12345678", ""])("rejeita %s", (phone) => {
    expect(validatePhoneNumber(phone)).toBe(false);
  });
});

describe("validateEmail", () => {
  it("aceita e-mail válido", () => {
    expect(validateEmail("marcelo@example.com")).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    expect(validateEmail("nao-e-email")).toBe(false);
  });
});

describe("validateISODate", () => {
  it("aceita data ISO válida", () => {
    expect(validateISODate("2026-08-10T14:00:00.000Z")).toBe(true);
  });

  it("rejeita string que não é data", () => {
    expect(validateISODate("não é data")).toBe(false);
  });
});
