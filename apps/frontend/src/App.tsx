import { useState } from "react";
import { useHealth } from "./hooks/useHealth";
import { DashboardScreen } from "./features/dashboard/DashboardScreen";
import { ConnectScreen } from "./features/connect/ConnectScreen";

type Tab = "dashboard" | "connect";

const TABS: { value: Tab; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "connect", label: "Conectar WhatsApp" },
];

function App() {
  const { status } = useHealth();
  const [tab, setTab] = useState<Tab>("dashboard");

  const statusConfig = {
    loading: { label: "Verificando...", dot: "bg-yellow-400" },
    online: { label: "API online", dot: "bg-green-500" },
    offline: { label: "API offline", dot: "bg-red-500" },
  }[status];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between gap-6 border-b border-neutral-800 bg-neutral-900/80 px-8 backdrop-blur">
        <div className="flex items-center gap-8">
          <span className="text-sm font-semibold tracking-wide text-green-400">WhatsNext</span>

          <nav className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-950/60 p-1.5 text-sm">
            {TABS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTab(option.value)}
                className={`rounded-full px-4 py-2 font-medium transition ${
                  tab === option.value
                    ? "bg-green-500 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs">
          <span className={`h-2 w-2 rounded-full ${statusConfig.dot} animate-pulse`} />
          <span className="text-neutral-400">{statusConfig.label}</span>
        </div>
      </header>

      <main className="px-8 pt-24 pb-12">
        {tab === "dashboard" && <DashboardScreen />}
        {tab === "connect" && <ConnectScreen />}
      </main>
    </div>
  );
}

export default App;
