import { useTerminalStore } from "../store/terminalStore";

function formatShell(shell?: string): string {
  if (!shell || shell === "default") return "Default Shell";
  if (shell.includes("powershell")) return "PowerShell";
  if (shell.includes("cmd")) return "CMD";
  return shell;
}

export function StatusBar() {
  const terminals = useTerminalStore((s) => s.terminals);
  const activeTerminalId = useTerminalStore((s) => s.activeTerminalId);
  const activeShell = terminals.find((t) => t.id === activeTerminalId)?.shell;

  return (
    <div className="status-bar">
      <div className="status-bar__left">
        <span className="status-bar__indicator">
          <span className="status-bar__dot" />
          <span>{terminals.length} session{terminals.length !== 1 ? "s" : ""}</span>
        </span>
      </div>
      <div className="status-bar__right">
        {activeShell && <span>{formatShell(activeShell)}</span>}
      </div>
    </div>
  );
}
