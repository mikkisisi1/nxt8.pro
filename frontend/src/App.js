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
import OpsView from "./components/views/OpsView";
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
      case "ops":
        return <OpsView />;
      case "home":
      default:
        return <HomeView />;
    }
  };

  return (
    <div
      className="App led-matrix h-screen flex flex-col relative overflow-hidden"
      data-testid="app-root"
    >
      <div className="fixed inset-0 led-matrix pointer-events-none -z-10"></div>
      <div className="shrink-0 z-20" data-testid="app-shell-top">
        <TopTicker />
        <div className="max-w-md w-full mx-auto px-4 pt-3">
          <Header aiIndex={8.1} streakDays={14} />
          {seedStatus === "error" && (
            <div
              className="text-[10px] text-red-400 border border-red-500/30 bg-red-500/5 rounded-md p-2 mt-2"
              data-testid="seed-error"
            >
              backend unreachable — проверьте сервер
            </div>
          )}
        </div>
      </div>
      <main
        className="relative z-10 flex-1 overflow-y-auto overscroll-contain max-w-md w-full mx-auto px-4"
        data-testid="main-scroll"
      >
        <div
          className="space-y-4 py-4"
          data-testid={`view-${view}`}
        >
          {renderView()}
        </div>
      </main>
      <div
        className="shrink-0 max-w-md w-full mx-auto px-4 pb-2 z-20"
        data-testid="app-shell-bottom"
      >
        <BottomNav active={view} onChange={setView} alertCount={alertCount} />
      </div>
    </div>
  );
}

export default App;
