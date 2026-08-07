/**
 * Calendar Service
 * Integração com Google Calendar API
 */

import { google } from "googleapis";
import type { calendar_v3, Auth } from "googleapis";
import logger from "../utils/logger";

type OAuth2Client = Auth.OAuth2Client;

const { OAuth2 } = google.auth;

export interface CalendarEventInput {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface NormalizedEvent {
  id?: string | null;
  title?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  htmlLink?: string | null;
}

export interface ListEventsOptions {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: NormalizedEvent[];
}

export interface CalendarSummary {
  id?: string | null;
  summary?: string | null;
  primary?: boolean | null;
}

class CalendarService {
  oauth2Client: OAuth2Client;
  calendar: calendar_v3.Calendar;
  calendarId: string;

  constructor() {
    // Configurar OAuth2
    this.oauth2Client = new OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:3000/callback"
    );

    // Definir credenciais
    this.oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
    });

    // Criar cliente do Calendar
    this.calendar = google.calendar({
      version: "v3",
      auth: this.oauth2Client,
    });

    this.calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  }

  /**
   * Criar evento no Google Calendar
   */
  async createEvent(eventData: CalendarEventInput): Promise<NormalizedEvent> {
    try {
      logger.debug("creating_calendar_event", {
        title: eventData.title,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
      });

      // Preparar event object
      const event: calendar_v3.Schema$Event = {
        summary: eventData.title,
        description: eventData.description || `Criado via WhatsApp em ${new Date().toLocaleString("pt-BR")}`,
        start: {
          dateTime: eventData.startTime,
          timeZone: process.env.TIMEZONE || "America/Sao_Paulo",
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: process.env.TIMEZONE || "America/Sao_Paulo",
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 10 },
            { method: "email", minutes: 24 * 60 },
          ],
        },
        transparency: "opaque",
      };

      // Criar evento
      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: event,
      });

      logger.info("calendar_event_created", {
        eventId: response.data.id,
        title: event.summary,
        startTime: event.start?.dateTime,
        htmlLink: response.data.htmlLink,
      });

      return {
        id: response.data.id,
        title: response.data.summary,
        startTime: response.data.start?.dateTime,
        endTime: response.data.end?.dateTime,
        htmlLink: response.data.htmlLink,
      };
    } catch (error) {
      const err = error as Error;
      logger.error("calendar_create_error", {
        error: err.message,
      });

      throw new Error(`Falha ao criar evento no Google Calendar: ${err.message}`);
    }
  }

  /**
   * Obter evento do Google Calendar
   */
  async getEvent(eventId: string): Promise<NormalizedEvent> {
    try {
      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });

      logger.debug("calendar_event_retrieved", {
        eventId: response.data.id,
        title: response.data.summary,
      });

      return {
        id: response.data.id,
        title: response.data.summary,
        startTime: response.data.start?.dateTime,
        endTime: response.data.end?.dateTime,
      };
    } catch (error) {
      const err = error as Error;
      logger.error("calendar_get_error", {
        error: err.message,
        eventId,
      });

      throw error;
    }
  }

  /**
   * Atualizar evento no Google Calendar
   */
  async updateEvent(eventId: string, eventData: CalendarEventInput): Promise<NormalizedEvent> {
    try {
      logger.debug("updating_calendar_event", {
        eventId,
        title: eventData.title,
      });

      const event: calendar_v3.Schema$Event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: process.env.TIMEZONE || "America/Sao_Paulo",
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: process.env.TIMEZONE || "America/Sao_Paulo",
        },
      };

      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId,
        requestBody: event,
      });

      logger.info("calendar_event_updated", {
        eventId: response.data.id,
        title: response.data.summary,
      });

      return {
        id: response.data.id,
        title: response.data.summary,
        startTime: response.data.start?.dateTime,
        endTime: response.data.end?.dateTime,
      };
    } catch (error) {
      const err = error as Error;
      logger.error("calendar_update_error", {
        error: err.message,
        eventId,
      });

      throw error;
    }
  }

  /**
   * Deletar evento do Google Calendar
   */
  async deleteEvent(eventId: string): Promise<{ success: boolean }> {
    try {
      logger.debug("deleting_calendar_event", { eventId });

      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
      });

      logger.info("calendar_event_deleted", { eventId });

      return { success: true };
    } catch (error) {
      const err = error as Error;
      logger.error("calendar_delete_error", {
        error: err.message,
        eventId,
      });

      throw error;
    }
  }

  /**
   * Listar eventos em um período
   */
  async listEvents(options: ListEventsOptions = {}): Promise<NormalizedEvent[]> {
    try {
      const {
        timeMin = new Date().toISOString(),
        timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults = 10,
      } = options;

      logger.debug("listing_calendar_events", {
        timeMin,
        timeMax,
        maxResults,
      });

      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      const items = response.data.items || [];

      logger.info("calendar_events_listed", {
        count: items.length,
      });

      return items.map((event) => ({
        id: event.id,
        title: event.summary,
        startTime: event.start?.dateTime || event.start?.date,
        endTime: event.end?.dateTime || event.end?.date,
        description: event.description,
      }));
    } catch (error) {
      const err = error as Error;
      logger.error("calendar_list_error", {
        error: err.message,
      });

      throw error;
    }
  }

  /**
   * Buscar evento por título (próximos 30 dias)
   */
  async searchEvents(title: string, options: { daysAhead?: number } = {}): Promise<NormalizedEvent[]> {
    try {
      const events = await this.listEvents({
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + (options.daysAhead || 30) * 24 * 60 * 60 * 1000).toISOString(),
        maxResults: 50,
      });

      // Filtrar por título (case-insensitive)
      const matches = events.filter((event) => (event.title || "").toLowerCase().includes(title.toLowerCase()));

      logger.debug("events_searched", {
        title,
        matches: matches.length,
      });

      return matches;
    } catch (error) {
      const err = error as Error;
      logger.error("calendar_search_error", {
        error: err.message,
        title,
      });

      throw error;
    }
  }

  /**
   * Verificar disponibilidade de horário
   */
  async isTimeAvailable(startTime: string, endTime: string): Promise<AvailabilityResult> {
    try {
      const events = await this.listEvents({
        timeMin: startTime,
        timeMax: endTime,
        maxResults: 1,
      });

      const available = events.length === 0;

      logger.debug("availability_checked", {
        available,
        startTime,
        endTime,
        conflictCount: events.length,
      });

      return {
        available,
        conflicts: events,
      };
    } catch (error) {
      const err = error as Error;
      logger.error("calendar_availability_check_error", {
        error: err.message,
      });

      throw error;
    }
  }

  /**
   * Atualizar tokens (se expirou)
   */
  async refreshAccessToken(): Promise<Auth.Credentials> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);

      logger.info("google_token_refreshed");

      return credentials;
    } catch (error) {
      const err = error as Error;
      logger.error("google_token_refresh_error", {
        error: err.message,
      });

      throw error;
    }
  }

  /**
   * Obter calendários disponíveis
   */
  async getAvailableCalendars(): Promise<CalendarSummary[]> {
    try {
      const response = await this.calendar.calendarList.list();
      const items = response.data.items || [];

      logger.debug("calendars_retrieved", {
        count: items.length,
      });

      return items.map((cal) => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary,
      }));
    } catch (error) {
      const err = error as Error;
      logger.error("calendar_list_all_error", {
        error: err.message,
      });

      throw error;
    }
  }
}

export default CalendarService;
