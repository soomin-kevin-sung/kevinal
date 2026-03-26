import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import {
  writeTerminal,
  resizeTerminal,
  onPtyOutput,
  onPtyExit,
} from "../lib/tauri";
import { useTerminalStore } from "../store/terminalStore";

interface UseTerminalOptions {
  terminalId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onExit?: () => void;
}

export function useTerminal({
  terminalId,
  containerRef,
  onExit,
}: UseTerminalOptions) {
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);

  const doFit = useCallback(() => {
    const fitAddon = fitAddonRef.current;
    const term = termRef.current;
    if (!fitAddon || !term || !containerRef.current) return;

    try {
      fitAddon.fit();
      resizeTerminal(terminalId, term.cols, term.rows).catch(() => {});
    } catch {
      // ignore fit errors when container is not visible
    }
  }, [terminalId, containerRef]);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!containerRef.current) return;

    initializedRef.current = true;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 14,
      lineHeight: 1.35,
      fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      theme: {
        background: "#0c0c14",
        foreground: "#e8e8f0",
        cursor: "#7c5cfc",
        cursorAccent: "#0c0c14",
        selectionBackground: "rgba(124, 92, 252, 0.3)",
        selectionForeground: "#ffffff",
        black: "#3a3a52",
        red: "#ff6b8a",
        green: "#6bffb8",
        yellow: "#ffd866",
        blue: "#7c9cff",
        magenta: "#c084fc",
        cyan: "#6be5ff",
        white: "#e8e8f0",
        brightBlack: "#555570",
        brightRed: "#ff8fa3",
        brightGreen: "#8affcc",
        brightYellow: "#ffe08a",
        brightBlue: "#9cb4ff",
        brightMagenta: "#d4a4ff",
        brightCyan: "#8aedff",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    term.open(containerRef.current);

    // Fit after open
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        // ignore
      }
    });

    // Track focus for active terminal
    const onFocusDisposable = term.textarea?.addEventListener("focus", () => {
      useTerminalStore.getState().setActiveTerminalId(terminalId);
    });

    // Handle user input -> PTY
    const onDataDisposable = term.onData((data) => {
      writeTerminal(terminalId, data).catch(() => {});
    });

    // Handle PTY output -> terminal
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    onPtyOutput(terminalId, (base64Data) => {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const text = new TextDecoder().decode(bytes);
      term.write(text);
    }).then((fn) => {
      unlistenOutput = fn;
    });

    onPtyExit(terminalId, () => {
      term.write("\r\n\x1b[90m[Process exited]\x1b[0m\r\n");
      onExit?.();
    }).then((fn) => {
      unlistenExit = fn;
    });

    // ResizeObserver for auto-fit
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          resizeTerminal(terminalId, term.cols, term.rows).catch(() => {});
        } catch {
          // ignore
        }
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      onDataDisposable.dispose();
      if (term.textarea) {
        term.textarea.removeEventListener("focus", onFocusDisposable as any);
      }
      unlistenOutput?.();
      unlistenExit?.();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
    };
  }, [terminalId, containerRef, onExit, doFit]);

  return { terminal: termRef, fit: doFit };
}
