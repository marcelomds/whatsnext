/**
 * Testes para o Transcription Service
 */

import TranscriptionService from "./transcription.service";

describe("TranscriptionService", () => {
  let service: TranscriptionService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test-key";
    service = new TranscriptionService();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("manda o áudio pro Whisper e retorna o texto transcrito", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ text: "dia 19 de agosto médico com meu pai às 9 da manhã" }),
    });

    const result = await service.transcribeAudio(
      Buffer.from("audio-fake").toString("base64"),
      "audio/ogg; codecs=opus"
    );

    expect(result).toBe("dia 19 de agosto médico com meu pai às 9 da manhã");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer sk-test-key" },
      })
    );
  });

  it("lança erro em português quando a OpenAI responde com falha", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid api key",
    });

    await expect(service.transcribeAudio("AAAA", "audio/ogg")).rejects.toThrow("Falha ao transcrever áudio");
  });

  it("lança erro em português quando a chamada falha de vez (rede)", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("network down"));

    await expect(service.transcribeAudio("AAAA", "audio/ogg")).rejects.toThrow(
      "Falha ao transcrever áudio: network down"
    );
  });
});
