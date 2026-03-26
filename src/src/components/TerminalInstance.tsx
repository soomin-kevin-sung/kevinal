import { useRef } from "react";
import { useTerminal } from "../hooks/useTerminal";
import "@xterm/xterm/css/xterm.css";

interface TerminalInstanceProps {
  terminalId: string;
  onExit?: () => void;
}

export function TerminalInstance({ terminalId, onExit }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useTerminal({
    terminalId,
    containerRef,
    onExit,
  });

  return (
    <div
      ref={containerRef}
      className="terminal-container"
    />
  );
}
