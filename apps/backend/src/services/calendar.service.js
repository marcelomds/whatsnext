/**
 * Calendar Service
 * Integração com Google Calendar API
 */

const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const logger = require("../utils/logger");

class CalendarService {
  constructor() {
    // Configurar OAuth2
    this.oauth2Client = new OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
        "http://localhost:3000/callback"
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

    this.calendarId =
      process.env.GOOGLE_CALENDAR_ID || "primary";
  }

  /**
   * Criar evento no Google Calendar
   */
  async createEvent(eventData) {
    try {
      logger.debug("creating_calendar_event", {
        title: eventData.title,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
      });

      // Preparar event object
      const event = {
        summary: eventData.title,
        description:
          eventData.description ||
          `Criado via WhatsApp em ${new Date().toLocaleString("pt-BR")}`,
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
            { method: "notification", minutes: 10 },
            { method: "email", minutes: 24 * 60 },
          ],
        },
        transparency: "opaque",
      };

      // Criar evento
      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });

      logger.info("calendar_event_created", {
        eventId: response.data.id,
        title: event.summary,
        startTime: event.start.dateTime,
        htmlLink: response.data.htmlLink,
      });

      return {
        id: response.data.id,
        title: response.data.summary,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
        htmlLink: response.data.htmlLink,
      };
    } catch (error) {
      logger.error("calendar_create_error", {
        error: error.message,
        code: error.code,
        status: error.status,
      });

      throw new Error(
        `Falha ao criar evento no Google Calendar: ${error.message}`
      );
    }
  }

  /**
   * Obter evento do Google Calendar
   */
  async getEvent(eventId) {
    try {
      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      logger.debug("calendar_event_retrieved", {
        eventId: response.data.id,
        title: response.data.summary,
      });

      return {
        id: response.data.id,
        title: response.data.summary,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
      };
    } catch (error) {
      logger.error("calendar_get_error", {
        error: error.message,
        eventId,
      });

      throw error;
    }
  }

  /**
   * Atualizar evento no Google Calendar
   */
  async updateEvent(eventId, eventData) {
    try {
      logger.debug("updating_calendar_event", {
        eventId,
        title: eventData.title,
      });

      const event = {
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
        eventId: eventId,
        resource: event,
      });

      logger.info("calendar_event_updated", {
        eventId: response.data.id,
        title: response.data.summary,
      });

      return {
        id: response.data.id,
        title: response.data.summary,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
      };
    } catch (error) {
      logger.error("calendar_update_error", {
        error: error.message,
        eventId,
      });

      throw error;
    }
  }

  /**
   * Deletar evento do Google Calendar
   */
  async deleteEvent(eventId) {
    try {
      logger.debug("deleting_calendar_event", { eventId });

      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      logger.info("calendar_event_deleted", { eventId });

      return { success: true };
    } catch (error) {
      logger.error("calendar_delete_error", {
        error: error.message,
        eventId,
      });

      throw error;
    }
  }

  /**
   * Listar eventos em um período
   */
  async listEvents(options = {}) {
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

      logger.info("calendar_events_listed", {
        count: response.data.items.length,
      });

      return response.data.items.map((event) => ({
        id: event.id,
        title: event.summary,
        startTime: event.start.dateTime || event.start.date,
        endTime: event.end.dateTime || event.end.date,
        description: event.description,
      }));
    } catch (error) {
      logger.error("calendar_list_error", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Buscar evento por título (próximos 30 dias)
   */
  async searchEvents(title, options = {}) {
    try {
      const events = await this.listEvents({
        timeMin: new Date().toISOString(),
        timeMax: new Date(
          Date.now() + (options.daysAhead || 30) * 24 * 60 * 60 * 1000
        ).toISOString(),
        maxResults: 50,
      });

      // Filtrar por título (case-insensitive)
      const matches = events.filter((event) =>
        event.title.toLowerCase().includes(title.toLowerCase())
      );

      logger.debug("events_searched", {
        title,
        matches: matches.length,
      });

      return matches;
    } catch (error) {
      logger.error("calendar_search_error", {
        error: error.message,
        title,
      });

      throw error;
    }
  }

  /**
   * Verificar disponibilidade de horário
   */
  async isTimeAvailable(startTime, endTime) {
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
      logger.error("calendar_availability_check_error", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Atualizar tokens (se expirou)
   */
  async refreshAccessToken() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);

      logger.info("google_token_refreshed");

      return credentials;
    } catch (error) {
      logger.error("google_token_refresh_error", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Obter calendários disponíveis
   */
  async getAvailableCalendars() {
    try {
      const response = await this.calendar.calendarList.list();

      logger.debug("calendars_retrieved", {
        count: response.data.items.length,
      });

      return response.data.items.map((cal) => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary,
      }));
    } catch (error) {
      logger.error("calendar_list_all_error", {
        error: error.message,
      });

      throw error;
    }
  }
}

module.exports = CalendarService;
