/**
 * Claude Service
 * Integração com Claude API para extração de eventos
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming, Message } from "@anthropic-ai/sdk/resources/messages";
import logger from "../utils/logger";
import Cache from "node-cache";
import type { ClaudeExtractionResult } from "../types/domain";

export interface HistoryMessage {
  timestamp?: number;
  content: string;
}

/**
 * O SDK instalado (@anthropic-ai/sdk 0.16.x) é anterior ao suporte a tool
 * use nos seus tipos, mas a API do Claude aceita `tools` normalmente — os
 * tipos abaixo cobrem só o que a gente realmente lê da resposta.
 */
interface AnthropicToolUseBlock {
  type: "tool_use";
  name: string;
  input: unknown;
}

interface CreateEventToolInput {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}

interface ClarificationToolInput {
  question: string;
}

class ClaudeService {
  client: Anthropic;
  cache: Cache;
  model: string;
  temperature: number;
  maxTokens: number;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Cache para respostas (30 minutos)
    this.cache = new Cache({ stdTTL: 1800 });
    this.model = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";
    this.temperature = parseFloat(process.env.CLAUDE_TEMPERATURE || "") || 0.3;
    this.maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || "", 10) || 1024;
  }

  /**
   * System prompt principal para extração de eventos
   */
  getSystemPrompt(historyContext = ""): string {
    const basePrompt = `Você é um assistente inteligente especializado em extrair informações de eventos de calendário a partir de mensagens naturais em português.

SUAS RESPONSABILIDADES:
1. Analisar mensagens em linguagem natural
2. Extrair informações de eventos (data, hora, título, duração)
3. Inferir informações faltantes com inteligência
4. Validar dados antes de retornar
5. Se a mensagem claramente PEDE um agendamento mas falta um dado essencial (data ou hora), pedir esclarecimento
6. Se a mensagem NÃO tem nenhuma relação com agendar algo (conversa casual, saudação, apresentação, pergunta genérica, etc.), classificar como "not_an_event" — o usuário só quer ser respondido quando o assunto é agenda

REGRAS IMPORTANTES:
- SEMPRE responda em português
- Datas relativas devem ser convertidas para ISO 8601 (YYYY-MM-DDTHH:MM:SS)
- Use a data/hora atual como referência: ${new Date().toISOString()}
- Horas padrão: 1 hora (60 minutos) se não especificado
- Se hora não for especificada, usar 14:00 como padrão
- Títulos: máximo 100 caracteres, bem formatados
- Descrever o contexto completamente em "description"
- NÃO criar recorrências (apenas eventos únicos por enquanto)
- Na dúvida entre "request_clarification" e "not_an_event": só use "request_clarification" se a mensagem claramente tenta marcar/lembrar algo. Mensagens como "meu nome é X", "bom dia", "oi", perguntas sem relação com agenda → "not_an_event"

FORMATO DE RESPOSTA (SEMPRE JSON):
{
  "success": boolean,
  "action": "create_event" | "request_clarification" | "not_an_event",
  "event": {
    "title": string,
    "startTime": string (ISO 8601),
    "endTime": string (ISO 8601),
    "description": string (opcional),
    "duration": number (minutos)
  },
  "clarification": string (se action = "request_clarification"),
  "confidence": number (0-1),
  "naturalResponse": string (resposta amigável em português, deixe null/vazio se action = "not_an_event")
}

Responda APENAS com JSON válido, sem markdown ou pré-ambuloradores.`;

    if (historyContext) {
      return basePrompt + `\n\nCONTEXTO DE MENSAGENS ANTERIORES:\n${historyContext}`;
    }

    return basePrompt;
  }

  /**
   * Extrai evento da mensagem do usuário
   */
  async extractEvent(userMessage: string, history: HistoryMessage[] = []): Promise<ClaudeExtractionResult> {
    try {
      // Criar cache key
      const cacheKey = `extract:${userMessage}`;
      const cached = this.cache.get<ClaudeExtractionResult>(cacheKey);

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
        system: this.getSystemPrompt(historyContext),
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      // Processar resposta
      const firstBlock = response.content[0];
      if (!firstBlock) {
        throw new Error("Claude não retornou conteúdo");
      }
      const parsed = this._parseResponse(firstBlock.text);

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
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      throw new Error(`Falha ao processar com Claude: ${(error as Error).message}`);
    }
  }

  /**
   * Extrai evento usando tool use (function calling)
   * Mais estruturado e confiável
   */
  async extractEventWithTools(
    userMessage: string,
    history: HistoryMessage[] = []
  ): Promise<ClaudeExtractionResult> {
    try {
      const historyContext = this._formatHistoryContext(history);

      const params = {
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.getSystemPrompt(historyContext),
        tools: [
          {
            name: "create_calendar_event",
            description: "Cria um evento no calendário com as informações extraídas",
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
            description: "Pede esclarecimento ao usuário quando informação falta",
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
            role: "user" as const,
            content: userMessage,
          },
        ],
      };

      const response = (await this.client.messages.create(
        params as unknown as MessageCreateParamsNonStreaming
      )) as Message;

      // Processar tool use
      for (const block of response.content as unknown as Array<{ type: string } & Partial<AnthropicToolUseBlock>>) {
        if (block.type === "tool_use" && block.name === "create_calendar_event") {
          const input = block.input as CreateEventToolInput;
          return {
            success: true,
            action: "create_event",
            event: {
              title: input.title,
              startTime: input.startTime,
              endTime: input.endTime,
              description: input.description || `Criado via WhatsApp - ${new Date().toLocaleString("pt-BR")}`,
            },
            confidence: 0.95,
            naturalResponse: `✅ Perfeito! Agendei "${input.title}" para ${this._formatDateBR(input.startTime)}`,
          };
        } else if (block.type === "tool_use" && block.name === "request_clarification") {
          const input = block.input as ClarificationToolInput;
          return {
            success: false,
            action: "request_clarification",
            clarification: input.question,
            confidence: 0.4,
            naturalResponse: input.question,
          };
        }
      }

      throw new Error("Claude não retornou tool use esperado");
    } catch (error) {
      logger.error("claude_tools_error", {
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Parse resposta JSON do Claude
   * @private
   */
  _parseResponse(text: string): ClaudeExtractionResult {
    // Tentar extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Claude não retornou JSON válido");
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`JSON inválido na resposta do Claude: ${(error as Error).message}`);
    }
  }

  /**
   * Valida resposta do Claude
   * @private
   */
  _validateEventResponse(response: ClaudeExtractionResult): void {
    if (!response.success === undefined || !response.action) {
      throw new Error("Resposta do Claude sem campos obrigatórios");
    }

    if (response.action === "create_event" && !response.event?.title && !response.event?.startTime) {
      throw new Error("Evento sem título ou data de início");
    }

    if (response.action === "create_event" && response.event) {
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
  _formatHistoryContext(history: HistoryMessage[]): string {
    if (!Array.isArray(history) || history.length === 0) {
      return "";
    }

    return history
      .slice(-5)
      .map((msg) => `${msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("pt-BR") : ""}: ${msg.content}`)
      .join("\n");
  }

  /**
   * Formata data ISO para português
   * @private
   */
  _formatDateBR(isoDate: string): string {
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
  clearCache(): void {
    this.cache.flushAll();
    logger.info("cache_cleared");
  }

  /**
   * Obter estatísticas de cache
   */
  getCacheStats(): { itemCount: number; keys: string[] } {
    const keys = this.cache.keys();
    return {
      itemCount: keys.length,
      keys: keys.slice(0, 10), // Primeiras 10 chaves
    };
  }
}

export default ClaudeService;
