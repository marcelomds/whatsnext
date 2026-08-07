import { useState } from "react";
import { useHealth } from "./hooks/useHealth";
import { useAuth } from "./hooks/useAuth";
import { useLanguage } from "./hooks/useLanguage";
import { DashboardScreen } from "./features/dashboard/DashboardScreen";
import { ConnectScreen } from "./features/connect/ConnectScreen";
import { LoginScreen } from "./features/auth/LoginScreen";
import { RegisterScreen } from "./features/auth/RegisterScreen";

type Tab = "dashboard" | "connect";

function App() {
  const { status } = useHealth();
  const { user, loading, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const TABS: { value: Tab; label: string }[] = [
    { value: "dashboard", label: t("tabDashboard") },
    { value: "connect", label: t("tabConnect") },
  ];

  const statusConfig = {
    loading: { label: t("apiChecking"), dot: "bg-amber-400" },
    online: { label: t("apiOnline"), dot: "bg-emerald-500" },
    offline: { label: t("apiOffline"), dot: "bg-red-500" },
  }[status];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-900">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen bg-slate-100 text-slate-900">
        <div className="absolute right-6 top-6">
          <LanguageToggle language={language} setLanguage={setLanguage} />
        </div>
        {authMode === "login" ? (
          <LoginScreen onSwitchToRegister={() => setAuthMode("register")} />
        ) : (
          <RegisterScreen onSwitchToLogin={() => setAuthMode("login")} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between gap-6 border-b border-slate-200 bg-white/90 px-8 backdrop-blur">
        <div className="flex items-center gap-8">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-900">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
              W
            </span>
            WhatsNext
          </span>

          <nav className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 p-1.5 text-sm">
            {TABS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTab(option.value)}
                className={`rounded-full px-4 py-2 font-medium transition ${
                  tab === option.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <LanguageToggle language={language} setLanguage={setLanguage} />

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${statusConfig.dot} animate-pulse`} />
            <span className="text-slate-500">{statusConfig.label}</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pr-1.5 pl-3">
            <span className="text-slate-600">{user.name}</span>
            <button
              onClick={() => logout()}
              className="rounded-full border border-slate-300 px-2.5 py-1 font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="px-8 pt-24 pb-12">
        {tab === "dashboard" && <DashboardScreen />}
        {tab === "connect" && <ConnectScreen />}
      </main>
    </div>
  );
}

function LanguageToggle({
  language,
  setLanguage,
}: {
  language: "pt" | "en";
  setLanguage: (language: "pt" | "en") => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
      {(["pt", "en"] as const).map((option) => (
        <button
          key={option}
          onClick={() => setLanguage(option)}
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            language === option ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default App;
