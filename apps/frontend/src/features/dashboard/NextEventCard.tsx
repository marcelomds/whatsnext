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
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  if (!upcoming) return null;

  const relative = daysUntil(upcoming.startTime, language);

  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
        {t("nextEventLabel")}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{upcoming.title}</p>
      <p className="mt-0.5 text-sm text-slate-500">
        {formatDate(upcoming.startTime)}
        {relative && <span className="ml-2 text-indigo-600">· {relative}</span>}
      </p>
    </section>
  );
}
