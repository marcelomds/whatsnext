import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider } from "./LanguageProvider";
import { useLanguage } from "../hooks/useLanguage";

function Consumer() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div>
      <p>language: {language}</p>
      <p>label: {t("dashboardTitle")}</p>
      <button onClick={() => setLanguage("en")}>use en</button>
      <button onClick={() => setLanguage("pt")}>use pt</button>
    </div>
  );
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detecta português pelo idioma do navegador quando não há preferência salva", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("pt-BR");

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    expect(screen.getByText("language: pt")).toBeInTheDocument();
  });

  it("usa inglês como fallback quando o navegador não é português", () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    expect(screen.getByText("language: en")).toBeInTheDocument();
  });

  it("usa o idioma salvo no localStorage", () => {
    localStorage.setItem("whatsnext_language", "en");

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    expect(screen.getByText("language: en")).toBeInTheDocument();
    expect(screen.getByText("label: Dashboard")).toBeInTheDocument();
  });

  it("troca o idioma e persiste no localStorage", async () => {
    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    await userEvent.click(screen.getByText("use en"));

    expect(screen.getByText("language: en")).toBeInTheDocument();
    expect(localStorage.getItem("whatsnext_language")).toBe("en");
  });
});
