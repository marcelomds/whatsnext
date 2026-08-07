import { useEffect } from "react";
import type { CalendarEvent } from "../../types/event";
import { useLanguage } from "../../hooks/useLanguage";
import { formatDate } from "./formatDate";
import { eventStatusLabel } from "./eventStatusLabel";

interface EventDetailsModalProps {
  event: CalendarEvent;
  onClose: () => void;
}

export function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
          <button
            onClick={onClose}
            aria-label={t("modalClose")}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("modalStart")}
            </dt>
            <dd className="text-slate-700">{formatDate(event.startTime)}</dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("modalEnd")}
            </dt>
            <dd className="text-slate-700">{formatDate(event.endTime)}</dd>
          </div>

          {event.description && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t("modalDescription")}
              </dt>
              <dd className="whitespace-pre-wrap text-slate-700">{event.description}</dd>
            </div>
          )}

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("eventsColStatus")}
            </dt>
            <dd>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {eventStatusLabel(t, event.status)}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
