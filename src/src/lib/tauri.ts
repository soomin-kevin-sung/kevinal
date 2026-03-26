import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export async function createTerminal(
  shell?: string,
  cols?: number,
  rows?: number
): Promise<string> {
  return invoke<string>("create_terminal", { shell, cols, rows });
}

export async function writeTerminal(
  terminalId: string,
  data: string
): Promise<void> {
  return invoke("write_terminal", { terminalId, data });
}

export async function resizeTerminal(
  terminalId: string,
  cols: number,
  rows: number
): Promise<void> {
  return invoke("resize_terminal", { terminalId, cols, rows });
}

export async function closeTerminal(terminalId: string): Promise<void> {
  return invoke("close_terminal", { terminalId });
}

export async function createWindow(terminalId: string): Promise<string> {
  return invoke<string>("create_window", { terminalId });
}

export async function closeWindow(windowLabel: string): Promise<void> {
  return invoke("close_window", { windowLabel });
}

export function onPtyOutput(
  terminalId: string,
  callback: (data: string) => void
): Promise<UnlistenFn> {
  return listen<string>(`pty-output-${terminalId}`, (event) => {
    callback(event.payload);
  });
}

export function onPtyExit(
  terminalId: string,
  callback: () => void
): Promise<UnlistenFn> {
  return listen(`pty-exit-${terminalId}`, () => {
    callback();
  });
}
