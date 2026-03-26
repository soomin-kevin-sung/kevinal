import { useState, useCallback, useEffect } from "react";
import { TitleBar } from "./components/TitleBar";
import { TerminalTabs } from "./components/TerminalTabs";
import { Welcome } from "./components/Welcome";
import { StatusBar } from "./components/StatusBar";
import { useTerminalStore } from "./store/terminalStore";
import { createTerminal as createPty } from "./lib/tauri";
import "./App.css";

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const addTerminal = useTerminalStore((s) => s.addTerminal);

  const handleNewTerminal = useCallback(
    async (shell?: string) => {
      try {
        const id = await createPty(shell);
        addTerminal(id, shell || "default");
        useTerminalStore.getState().setActiveTerminalId(id);
        setShowWelcome(false);
      } catch (err) {
        console.error("Failed to create terminal:", err);
      }
    },
    [addTerminal]
  );

  const handleAllClosed = useCallback(() => {
    setShowWelcome(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        handleNewTerminal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNewTerminal]);

  return (
    <div className="app-layout">
      <TitleBar />
      <div className="terminal-content">
        {showWelcome ? (
          <Welcome onSelectShell={handleNewTerminal} />
        ) : (
          <TerminalTabs onAllClosed={handleAllClosed} onNewTerminal={handleNewTerminal} />
        )}
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
