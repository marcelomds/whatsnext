import { useEvents } from "../../hooks/useEvents";
import { useLanguage } from "../../hooks/useLanguage";
import { formatDate } from "./formatDate";

function daysUntil(startTime: string, language: "pt" | "en"): string {
  const now = new Date();
  const target = new Date(startTime);
  const diffMs = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (language === "pt") {
    if (days === 0) return "hoje";
    if (days === 1) return "amanhã";
    if (days > 1) return `em ${days} dias`;
    return "";
  }

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1) return `in ${days} days`;
  return "";
}

export function NextEventCard() {
  const { events, loading } = useEvents();
  const { language, t } = useLanguage();

  if (loading) return null;

  const now = Date.now();
  const upcoming = events
    .filter((event) => new Date(event.startTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 2);

  if (upcoming.length === 0) return null;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {upcoming.map((event, index) => {
        const relative = daysUntil(event.startTime, language);
        return (
          <div key={event.eventId} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
              {index === 0 ? t("nextEventLabel") : t("thenEventLabel")}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{event.title}</p>
            <p className="text-xs text-slate-500">
              {formatDate(event.startTime)}
              {relative && <span className="ml-1.5 text-indigo-600">· {relative}</span>}
            </p>
          </div>
        );
      })}
    </section>
  );
}
