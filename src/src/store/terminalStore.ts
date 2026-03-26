import { create } from "zustand";
import type { TerminalInfo } from "../types";

interface TerminalState {
  terminals: TerminalInfo[];
  nextIndex: number;
  activeTerminalId: string | null;
  addTerminal: (id: string, shell: string) => TerminalInfo;
  removeTerminal: (id: string) => void;
  getTerminal: (id: string) => TerminalInfo | undefined;
  setActiveTerminalId: (id: string | null) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  nextIndex: 1,
  activeTerminalId: null,

  addTerminal: (id: string, shell: string) => {
    const index = get().nextIndex;
    const info: TerminalInfo = {
      id,
      title: `Terminal ${index}`,
      shell,
    };
    set((state) => ({
      terminals: [...state.terminals, info],
      nextIndex: state.nextIndex + 1,
    }));
    return info;
  },

  removeTerminal: (id: string) => {
    set((state) => ({
      terminals: state.terminals.filter((t) => t.id !== id),
      activeTerminalId:
        state.activeTerminalId === id ? null : state.activeTerminalId,
    }));
  },

  getTerminal: (id: string) => {
    return get().terminals.find((t) => t.id === id);
  },

  setActiveTerminalId: (id: string | null) => {
    set({ activeTerminalId: id });
  },
}));
