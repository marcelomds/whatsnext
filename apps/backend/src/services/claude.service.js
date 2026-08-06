/**
 * Claude Service
 * Integração com Claude API para extração de eventos
 */

const Anthropic = require("@anthropic-ai/sdk");
const logger = require("../utils/logger");
const Cache = require("node-cache");

class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Cache para respostas (30 minutos)
    this.cache = new Cache({ stdTTL: 1800 });
    this.model = process.env.CLAUDE_MODEL || "claude-opus-4.8";
    this.temperature = parseFloat(process.env.CLAUDE_TEMPERATURE) || 0.3;
    this.maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS) || 1024;
  }

  /**
   * System prompt principal para extração de eventos
   */
  getSystemPrompt(historyContext = "") {
    const basePrompt = `Você é um assistente inteligente especializado em extrair informações de eventos de calendário a partir de mensagens naturais em português.

SUAS RESPONSABILIDADES:
1. Analisar mensagens em linguagem natural
2. Extrair informações de eventos (data, hora, título, duração)
3. Inferir informações faltantes com inteligência
4. Validar dados antes de retornar
5. Se não houver informação suficiente, pedir esclarecimentos

REGRAS IMPORTANTES:
- SEMPRE responda em português
- Datas relativas devem ser convertidas para ISO 8601 (YYYY-MM-DDTHH:MM:SS)
- Use a data/hora atual como referência: ${new Date().toISOString()}
- Horas padrão: 1 hora (60 minutos) se não especificado
- Se hora não for especificada, usar 14:00 como padrão
- Títulos: máximo 100 caracteres, bem formatados
- Descrever o contexto completamente em "description"
- NÃO criar recorrências (apenas eventos únicos por enquanto)

FORMATO DE RESPOSTA (SEMPRE JSON):
{
  "success": boolean,
  "action": "create_event" | "request_clarification",
  "event": {
    "title": string,
    "startTime": string (ISO 8601),
    "endTime": string (ISO 8601),
    "description": string (opcional),
    "duration": number (minutos)
  },
  "clarification": string (se action = "request_clarification"),
  "confidence": number (0-1),
  "naturalResponse": string (resposta amigável em português)
}

Responda APENAS com JSON válido, sem markdown ou pré-ambuloradores.`;

    if (historyContext) {
      return (
        basePrompt +
        `\n\nCONTEXTO DE MENSAGENS ANTERIORES:\n${historyContext}`
      );
    }

    return basePrompt;
  }

  /**
   * Extrai evento da mensagem do usuário
   */
  async extractEvent(userMessage, history = []) {
    try {
      // Criar cache key
      const cacheKey = `extract:${userMessage}`;
      const cached = this.cache.get(cacheKey);

      if (cached) {
        logger.debug("cache_hit", { cacheKey });
        return cached;
      }

      // Preparar contexto de histórico
      const historyContext = this._formatHistoryContext(history);

      // Chamar Claude
      logger.debug("calling_claude", {
        model: this.model,
        temperature: this.temperature,
        messageLength: userMessage.length,
      });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: this.getSystemPrompt(historyContext),
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      // Processar resposta
      const content = response.content[0].text;
      const parsed = this._parseResponse(content);

      // Validar resposta
      this._validateEventResponse(parsed);

      // Cache resultado
      this.cache.set(cacheKey, parsed);

      logger.info("event_extracted", {
        action: parsed.action,
        confidence: parsed.confidence,
        inputLength: userMessage.length,
      });

      return parsed;
    } catch (error) {
      logger.error("claude_extract_error", {
        error: error.message,
        stack: error.stack,
      });

      throw new Error(`Falha ao processar com Claude: ${error.message}`);
    }
  }

  /**
   * Extrai evento usando tool use (function calling)
   * Mais estruturado e confiável
   */
  async extractEventWithTools(userMessage, history = []) {
    try {
      const historyContext = this._formatHistoryContext(history);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: this.getSystemPrompt(historyContext),
        tools: [
          {
            name: "create_calendar_event",
            description:
              "Cria um evento no calendário com as informações extraídas",
            input_schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Título do evento (máximo 100 caracteres)",
                },
                startTime: {
                  type: "string",
                  description: "Horário de início em ISO 8601",
                },
                endTime: {
                  type: "string",
                  description: "Horário de término em ISO 8601",
                },
                description: {
                  type: "string",
                  description: "Descrição detalhada do evento",
                },
              },
              required: ["title", "startTime", "endTime"],
            },
          },
          {
            name: "request_clarification",
            description:
              "Pede esclarecimento ao usuário quando informação falta",
            input_schema: {
              type: "object",
              properties: {
                question: {
                  type: "string",
                  description: "Pergunta clara para o usuário",
                },
              },
              required: ["question"],
            },
          },
        ],
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      // Processar tool use
      for (const block of response.content) {
        if (block.type === "tool_use") {
          if (block.name === "create_calendar_event") {
            return {
              success: true,
              action: "create_event",
              event: {
                title: block.input.title,
                startTime: block.input.startTime,
                endTime: block.input.endTime,
                description:
                  block.input.description ||
                  `Criado via WhatsApp - ${new Date().toLocaleString("pt-BR")}`,
              },
              confidence: 0.95,
              naturalResponse: `✅ Perfeito! Agendei "${block.input.title}" para ${this._formatDateBR(block.input.startTime)}`,
            };
          } else if (block.name === "request_clarification") {
            return {
              success: false,
              action: "request_clarification",
              clarification: block.input.question,
              confidence: 0.4,
              naturalResponse: block.input.question,
            };
          }
        }
      }

      throw new Error("Claude não retornou tool use esperado");
    } catch (error) {
      logger.error("claude_tools_error", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Parse resposta JSON do Claude
   * @private
   */
  _parseResponse(text) {
    // Tentar extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Claude não retornou JSON válido");
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`JSON inválido na resposta do Claude: ${error.message}`);
    }
  }

  /**
   * Valida resposta do Claude
   * @private
   */
  _validateEventResponse(response) {
    if (!response.success === undefined || !response.action) {
      throw new Error("Resposta do Claude sem campos obrigatórios");
    }

    if (
      response.action === "create_event" &&
      !response.event?.title &&
      !response.event?.startTime
    ) {
      throw new Error("Evento sem título ou data de início");
    }

    if (response.action === "create_event") {
      // Validar datas ISO
      try {
        new Date(response.event.startTime).toISOString();
        new Date(response.event.endTime).toISOString();
      } catch {
        throw new Error("Datas em formato ISO inválido");
      }
    }

    if (typeof response.confidence !== "number" || response.confidence < 0 || response.confidence > 1) {
      response.confidence = 0.5;
    }
  }

  /**
   * Formata histórico de mensagens como texto
   * @private
   */
  _formatHistoryContext(history) {
    if (!Array.isArray(history) || history.length === 0) {
      return "";
    }

    return history
      .slice(-5)
      .map(
        (msg) =>
          `${msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("pt-BR") : ""}: ${msg.content}`
      )
      .join("\n");
  }

  /**
   * Formata data ISO para português
   * @private
   */
  _formatDateBR(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Limpar cache manualmente
   */
  clearCache() {
    this.cache.flushAll();
    logger.info("cache_cleared");
  }

  /**
   * Obter estatísticas de cache
   */
  getCacheStats() {
    const keys = this.cache.keys();
    return {
      itemCount: keys.length,
      keys: keys.slice(0, 10), // Primeiras 10 chaves
    };
  }
}

module.exports = ClaudeService;
