import { useState } from "react";
import { EventsTable } from "./EventsTable";
import { CalendarView } from "./CalendarView";
import { NextEventCard } from "./NextEventCard";
import { useLanguage } from "../../hooks/useLanguage";

type View = "list" | "calendar";

export function DashboardScreen() {
  const { t } = useLanguage();
  const [view, setView] = useState<View>("list");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">{t("dashboardTitle")}</h2>

        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 text-sm">
          {(["list", "calendar"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setView(option)}
              className={`rounded-full px-3 py-1.5 font-medium transition ${
                view === option ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {option === "list" ? t("viewList") : t("viewCalendar")}
            </button>
          ))}
        </div>
      </div>

      <NextEventCard />
      {view === "list" ? <EventsTable /> : <CalendarView />}
    </div>
  );
}
