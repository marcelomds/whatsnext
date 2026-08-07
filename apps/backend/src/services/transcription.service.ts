/**
 * Transcription Service
 * Transcreve áudio (voice notes do WhatsApp) usando a API Whisper da OpenAI
 */

import logger from "../utils/logger";

class TranscriptionService {
  apiKey: string | undefined;
  model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
  }

  /**
   * Transcreve áudio em base64 pra texto
   * @param mimetype ex: "audio/ogg; codecs=opus"
   * @returns texto transcrito
   */
  async transcribeAudio(base64Audio: string, mimetype = "audio/ogg"): Promise<string> {
    try {
      const buffer = Buffer.from(base64Audio, "base64");
      const extension = mimetype.includes("ogg") ? "ogg" : mimetype.split("/")[1]?.split(";")[0] || "ogg";

      const form = new FormData();
      form.append("file", new Blob([buffer], { type: mimetype }), `audio.${extension}`);
      form.append("model", this.model);

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI respondeu ${response.status}: ${errorBody}`);
      }

      const data = (await response.json()) as { text: string };

      logger.info("audio_transcribed", { textLength: data.text?.length || 0 });

      return data.text;
    } catch (error) {
      logger.error("transcription_error", { error: (error as Error).message });
      throw new Error(`Falha ao transcrever áudio: ${(error as Error).message}`);
    }
  }
}

export default TranscriptionService;
