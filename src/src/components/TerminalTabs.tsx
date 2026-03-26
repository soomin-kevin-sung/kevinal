import { useCallback, useEffect } from "react";
import { useTerminalStore } from "../store/terminalStore";
import { TerminalInstance } from "./TerminalInstance";
import { closeTerminal as closePty } from "../lib/tauri";

interface TerminalTabsProps {
  onAllClosed: () => void;
  onNewTerminal: (shell?: string) => void;
}

function getShellLabel(shell: string): string {
  if (shell.includes("powershell")) return "PS";
  if (shell.includes("cmd")) return "CMD";
  return ">_";
}

export function TerminalTabs({ onAllClosed, onNewTerminal }: TerminalTabsProps) {
  const terminals = useTerminalStore((s) => s.terminals);
  const activeTerminalId = useTerminalStore((s) => s.activeTerminalId);
  const removeTerminal = useTerminalStore((s) => s.removeTerminal);
  const setActiveTerminalId = useTerminalStore((s) => s.setActiveTerminalId);

  const handleClose = useCallback(
    (id: string) => {
      closePty(id).catch(() => {});
      removeTerminal(id);
      const state = useTerminalStore.getState();
      if (state.terminals.length === 0) {
        onAllClosed();
      } else if (state.activeTerminalId === null) {
        setActiveTerminalId(state.terminals[state.terminals.length - 1].id);
      }
    },
    [removeTerminal, setActiveTerminalId, onAllClosed]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "w") {
        e.preventDefault();
        const { activeTerminalId: id } = useTerminalStore.getState();
        if (id) handleClose(id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  return (
    <div className="tabs-layout">
      <div className="tabs-bar">
        {terminals.map((t) => (
          <div
            key={t.id}
            className={`tabs-tab${activeTerminalId === t.id ? " tabs-tab--active" : ""}`}
            onClick={() => setActiveTerminalId(t.id)}
          >
            <span className="tabs-tab__icon">{getShellLabel(t.shell)}</span>
            <span className="tabs-tab__title">{t.title}</span>
            <button
              className="tabs-tab__close"
              onClick={(e) => {
                e.stopPropagation();
                handleClose(t.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="tabs-add" onClick={() => onNewTerminal()}>
          +
        </button>
      </div>

      <div className="tabs-panels">
        {terminals.map((t) => (
          <div
            key={t.id}
            className="tabs-panel"
            style={{
              visibility: activeTerminalId === t.id ? "visible" : "hidden",
            }}
          >
            <TerminalInstance terminalId={t.id} onExit={() => handleClose(t.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
