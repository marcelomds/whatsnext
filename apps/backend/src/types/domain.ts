/**
 * Tipos de domínio compartilhados entre services, controllers e handlers.
 */

import type { APIGatewayProxyEvent } from "aws-lambda";

export interface User {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  evolutionInstance: string;
  createdAt?: number;
}

export interface CreateUserInput {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  evolutionInstance: string;
}

export interface StoredMessage {
  messageId: string;
  timestamp: number;
  phoneNumber: string;
  content: string;
  status: string;
  source: string;
  correlationId?: string;
  ttl?: number;
  error?: string;
  eventId?: string;
  claudeResponse?: string;
  clarification?: string;
  updatedAt?: number;
}

export interface SaveMessageInput {
  messageId: string;
  timestamp: number;
  phoneNumber: string;
  content: string;
  status?: string;
  source?: string;
  correlationId?: string;
}

export interface StoredEvent {
  eventId: string;
  timestamp: number;
  messageId: string;
  phoneNumber: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  googleCalendarId?: string;
  status: string;
  correlationId?: string;
}

export interface SaveEventInput {
  eventId: string;
  timestamp: number;
  messageId: string;
  phoneNumber: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  googleCalendarId?: string;
  status?: string;
  correlationId?: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  evolutionInstance: string;
  iat?: number;
  exp?: number;
}

/**
 * Evento de API Gateway após passar pelo middleware withAuth, que decodifica
 * o JWT do header Authorization e injeta o payload em event.authUser.
 */
export type AuthenticatedEvent = APIGatewayProxyEvent & { authUser: AuthTokenPayload };

export interface AuthResult {
  token: string;
  user: {
    userId: string;
    email: string;
    name: string;
    evolutionInstance: string;
  };
}

/**
 * Evento extraído/estruturado pelo Claude a partir da mensagem em linguagem natural.
 */
export interface ClaudeEvent {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  duration?: number;
}

export type ClaudeAction = "create_event" | "request_clarification" | "not_an_event";

export interface ClaudeExtractionResult {
  success: boolean;
  action: ClaudeAction;
  event?: ClaudeEvent;
  clarification?: string;
  confidence: number;
  naturalResponse: string | null;
}

/**
 * Mensagem normalizada a partir do webhook da Evolution API (ou do formato
 * simples {from, message, timestamp} usado em testes manuais).
 */
export interface EvolutionTextMessage {
  from: string;
  message: string;
  timestamp: number;
  audio?: undefined;
}

export interface EvolutionAudioMessage {
  from: string;
  timestamp: number;
  message?: undefined;
  audio: {
    key: Record<string, unknown>;
    mimetype: string;
  };
}

export type EvolutionParsedMessage = EvolutionTextMessage | EvolutionAudioMessage;
