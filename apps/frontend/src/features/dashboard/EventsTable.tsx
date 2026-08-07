import { useState } from "react";
import { useEvents } from "../../hooks/useEvents";
import { useLanguage } from "../../hooks/useLanguage";
import { formatDate } from "./formatDate";
import { eventStatusLabel } from "./eventStatusLabel";
import { EventDetailsModal } from "./EventDetailsModal";
import type { CalendarEvent } from "../../types/event";

export function EventsTable() {
  const { events, loading, error } = useEvents();
  const { t } = useLanguage();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">
        {t("eventsTitle")} {!loading && `(${events.length})`}
      </h3>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">{t("eventsColTitle")}</th>
              <th className="px-4 py-2.5 font-medium">{t("eventsColStart")}</th>
              <th className="px-4 py-2.5 font-medium">{t("eventsColStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => (
              <tr
                key={event.eventId}
                onClick={() => setSelectedEvent(event)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="px-4 py-2.5 text-slate-800">{event.title}</td>
                <td className="px-4 py-2.5 text-slate-500">{formatDate(event.startTime)}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {eventStatusLabel(t, event.status)}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && events.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-slate-400">
                  {t("eventsEmpty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedEvent && (
        <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </section>
  );
}
