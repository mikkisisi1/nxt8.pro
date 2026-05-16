import React, { useEffect, useState } from "react";
import "./App.css";
import TopTicker from "./components/TopTicker";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import HomeView from "./components/views/HomeView";
import ChatView from "./components/views/ChatView";
import AgentsView from "./components/views/AgentsView";
import MapView from "./components/views/MapView";
import AlertsView from "./components/views/AlertsView";
import MicView from "./components/views/MicView";
import api from "./lib/api";

function App() {
  const [view, setView] = useState("home");
  const [alertCount, setAlertCount] = useState(0);
  const [seedStatus, setSeedStatus] = useState("idle");

  useEffect(() => {
    // Auto-seed on first load (idempotent on backend side)
    setSeedStatus("seeding");
    api
      .seed()
      .then(() => setSeedStatus("ready"))
      .catch(() => setSeedStatus("error"));
  }, []);

  useEffect(() => {
    let mounted = true;
    const poll = () => {
      api
        .alerts(50)
        .then((d) => {
          if (!mounted) return;
          setAlertCount((d.alerts || []).length);
        })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const renderView = () => {
    switch (view) {
      case "cmd":
        return <ChatView />;
      case "agents":
        return <AgentsView />;
      case "map":
        return <MapView />;
      case "alerts":
        return <AlertsView />;
      case "mic":
        return <MicView />;
      case "home":
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="App led-matrix min-h-screen relative" data-testid="app-root">
      <div className="fixed inset-0 led-matrix pointer-events-none -z-10"></div>
      <TopTicker />
      <main className="relative z-10 p-4 space-y-4 max-w-md mx-auto">
        <Header aiIndex={8.1} streakDays={14} />
        {seedStatus === "error" && (
          <div
            className="text-[10px] text-red-400 border border-red-500/30 bg-red-500/5 rounded-md p-2"
            data-testid="seed-error"
          >
            backend unreachable — проверьте сервер
          </div>
        )}
        <div data-testid={`view-${view}`}>{renderView()}</div>
        <BottomNav active={view} onChange={setView} alertCount={alertCount} />
      </main>
    </div>
  );
}

export default App;
