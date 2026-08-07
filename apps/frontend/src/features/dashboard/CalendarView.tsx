import { useMemo, useState } from "react";
import { useEvents } from "../../hooks/useEvents";
import { useLanguage } from "../../hooks/useLanguage";
import { EventDetailsModal } from "./EventDetailsModal";
import type { CalendarEvent } from "../../types/event";

type Mode = "month" | "week" | "day";

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function buildMonthGrid(monthStart: Date): Date[] {
  const firstOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
}

function buildWeek(cursor: Date): Date[] {
  const start = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

function step(cursor: Date, mode: Mode, direction: 1 | -1): Date {
  if (mode === "month") return new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
  if (mode === "week") {
    const next = new Date(cursor);
    next.setDate(next.getDate() + direction * 7);
    return next;
  }
  const next = new Date(cursor);
  next.setDate(next.getDate() + direction);
  return next;
}

const MAX_VISIBLE_MONTH = 3;
const MAX_VISIBLE_WEEK = 6;

export function CalendarView() {
  const { events } = useEvents();
  const { language, t } = useLanguage();
  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const locale = language === "pt" ? "pt-BR" : "en-US";
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKey(new Date(event.startTime));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }
    return map;
  }, [events]);

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale]
  );

  const headerLabel = useMemo(() => {
    if (mode === "month") {
      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(cursor);
    }
    if (mode === "day") {
      return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
        cursor
      );
    }
    const week = buildWeek(cursor);
    const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    return `${fmt.format(week[0])} – ${fmt.format(week[6])}`;
  }, [mode, cursor, locale]);

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return buildWeek(cursor).map((day) => formatter.format(day));
  }, [cursor, locale]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold capitalize text-slate-900">{headerLabel}</h3>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            {(["month", "week", "day"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setMode(option)}
                className={`rounded-full px-2.5 py-1.5 transition ${
                  mode === option ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {option === "month" ? t("calendarModeMonth") : option === "week" ? t("calendarModeWeek") : t("calendarModeDay")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCursor((prev) => step(prev, mode, -1))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
            >
              ‹
            </button>
            <button
              onClick={() => setCursor(new Date())}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {t("calendarToday")}
            </button>
            <button
              onClick={() => setCursor((prev) => step(prev, mode, 1))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {mode === "month" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-xs font-medium uppercase text-slate-400">
            {weekdayLabels.map((label, i) => (
              <div key={i} className="px-2 py-2 text-center">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {buildMonthGrid(cursor).map((day, i) => {
              const isCurrentMonth = day.getMonth() === cursor.getMonth();
              const isToday = dayKey(day) === dayKey(today);
              const dayEvents = eventsByDay.get(dayKey(day)) ?? [];
              const overflow = dayEvents.length - MAX_VISIBLE_MONTH;

              return (
                <div
                  key={i}
                  className={`min-h-[92px] border-b border-r border-slate-100 p-1.5 last:border-r-0 ${
                    isCurrentMonth ? "bg-white" : "bg-slate-50/50"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-indigo-600 font-semibold text-white"
                        : isCurrentMonth
                          ? "text-slate-600"
                          : "text-slate-300"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, MAX_VISIBLE_MONTH).map((event) => (
                      <button
                        key={event.eventId}
                        title={event.title}
                        onClick={() => setSelectedEvent(event)}
                        className="block w-full truncate rounded bg-indigo-50 px-1.5 py-0.5 text-left text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        {event.title}
                      </button>
                    ))}
                    {overflow > 0 && (
                      <p className="px-1.5 text-[11px] text-slate-400">
                        +{overflow} {t("calendarMoreEvents")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "week" && (
        <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
          {buildWeek(cursor).map((day, i) => {
            const isToday = dayKey(day) === dayKey(today);
            const dayEvents = eventsByDay.get(dayKey(day)) ?? [];
            const overflow = dayEvents.length - MAX_VISIBLE_WEEK;

            return (
              <div key={i} className="min-h-[280px] border-r border-slate-100 p-2 last:border-r-0">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs uppercase text-slate-400">{weekdayLabels[i]}</span>
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday ? "bg-indigo-600 font-semibold text-white" : "text-slate-600"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, MAX_VISIBLE_WEEK).map((event) => (
                    <button
                      key={event.eventId}
                      onClick={() => setSelectedEvent(event)}
                      className="block w-full truncate rounded bg-indigo-50 px-1.5 py-1 text-left text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      {timeFormatter.format(new Date(event.startTime))} · {event.title}
                    </button>
                  ))}
                  {overflow > 0 && (
                    <p className="px-1.5 text-[11px] text-slate-400">
                      +{overflow} {t("calendarMoreEvents")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "day" && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/50">
          {(eventsByDay.get(dayKey(cursor)) ?? []).length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-slate-400">{t("calendarNoEventsDay")}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(eventsByDay.get(dayKey(cursor)) ?? []).map((event) => (
                <button
                  key={event.eventId}
                  onClick={() => setSelectedEvent(event)}
                  className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-slate-50"
                >
                  <span className="w-14 shrink-0 text-xs font-medium text-slate-400">
                    {timeFormatter.format(new Date(event.startTime))}
                  </span>
                  <span className="truncate text-sm font-medium text-slate-800">{event.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedEvent && (
        <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </section>
  );
}
