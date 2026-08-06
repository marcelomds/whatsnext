import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Connect from "./pages/Connect";
import "./App.css";

const TABS = {
  dashboard: { label: "Dashboard", component: Dashboard },
  connect: { label: "Conectar WhatsApp", component: Connect },
};

function App() {
  const [tab, setTab] = useState("dashboard");
  const ActiveTab = TABS[tab].component;

  return (
    <div className="app">
      <header>
        <h1>WhatsNext</h1>
        <nav>
          {Object.entries(TABS).map(([key, { label }]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        <ActiveTab />
      </main>
    </div>
  );
}

export default App;
