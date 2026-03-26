import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
} from "react";
import {
  DockLayout,
  type LayoutBase,
  type LayoutData,
  type TabData,
  type TabBase,
  type PanelData,
  type BoxData,
} from "rc-dock";
import { TerminalInstance } from "./TerminalInstance";
import { NewTerminalButton } from "./NewTerminalButton";
import { useTerminalStore } from "../store/terminalStore";
import { closeTerminal as closePty } from "../lib/tauri";

export interface DockAreaHandle {
  addTab: (id: string, title: string, shell: string) => void;
  removeTab: (id: string) => void;
  hasPanel: () => boolean;
}

interface DockAreaProps {
  onNewTerminal: (shell?: string) => void;
  onEmpty: () => void;
}

function getShellIcon(shell: string): string {
  if (shell.includes("powershell")) return "PS";
  if (shell.includes("cmd")) return "CMD";
  if (shell.includes("bash") || shell.includes("zsh")) return "$_";
  return ">_";
}

function collectTabIds(node: BoxData | PanelData): Set<string> {
  const ids = new Set<string>();
  if ("tabs" in node && Array.isArray(node.tabs)) {
    for (const tab of node.tabs) {
      if (tab.id) ids.add(tab.id);
    }
  }
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      for (const id of collectTabIds(child as BoxData | PanelData)) {
        ids.add(id);
      }
    }
  }
  return ids;
}

function collectAllTabIds(layout: LayoutData): Set<string> {
  const ids = new Set<string>();
  if (layout.dockbox) {
    for (const id of collectTabIds(layout.dockbox)) ids.add(id);
  }
  if (layout.floatbox) {
    for (const id of collectTabIds(layout.floatbox)) ids.add(id);
  }
  return ids;
}

const DEFAULT_LAYOUT: LayoutData = {
  dockbox: {
    mode: "horizontal",
    children: [],
  },
};

export const DockArea = forwardRef<DockAreaHandle, DockAreaProps>(
  ({ onNewTerminal, onEmpty }, ref) => {
    const dockRef = useRef<DockLayout>(null);
    const knownTabIdsRef = useRef<Set<string>>(new Set());

    const loadTab = useCallback(
      (tab: TabBase): TabData => {
        const store = useTerminalStore.getState();
        const info = store.getTerminal(tab.id!);
        const shell = info?.shell || "default";
        const title = info?.title || "Terminal";

        return {
          id: tab.id,
          title: (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ opacity: 0.6 }}>{getShellIcon(shell)}</span>
              {title}
            </span>
          ),
          content: <TerminalInstance terminalId={tab.id!} />,
          closable: true,
          cached: true,
          group: "terminal",
        };
      },
      []
    );

    const onLayoutChange = useCallback(
      (newLayout: LayoutBase) => {
        const currentIds = collectAllTabIds(newLayout as LayoutData);
        const store = useTerminalStore.getState();

        // Find removed tabs
        for (const id of knownTabIdsRef.current) {
          if (!currentIds.has(id)) {
            store.removeTerminal(id);
            closePty(id).catch(() => {});
          }
        }

        knownTabIdsRef.current = currentIds;

        // Notify parent if no tabs remain
        if (currentIds.size === 0) {
          onEmpty();
        }
      },
      [onEmpty]
    );

    useImperativeHandle(
      ref,
      () => ({
        addTab: (id: string, title: string, shell: string) => {
          if (!dockRef.current) return;

          const tabData: TabData = {
            id,
            title: (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ opacity: 0.6 }}>{getShellIcon(shell)}</span>
                {title}
              </span>
            ),
            content: <TerminalInstance terminalId={id} />,
            closable: true,
            cached: true,
            group: "terminal",
          };

          // Find the first panel to add into
          const layout = dockRef.current.getLayout();
          let targetPanel: PanelData | null = null;

          const findPanel = (node: BoxData | PanelData): boolean => {
            if ("tabs" in node && Array.isArray(node.tabs)) {
              targetPanel = node as PanelData;
              return true;
            }
            if ("children" in node && Array.isArray(node.children)) {
              for (const child of node.children) {
                if (findPanel(child as BoxData | PanelData)) return true;
              }
            }
            return false;
          };

          if (layout.dockbox) {
            findPanel(layout.dockbox);
          }

          if (targetPanel) {
            dockRef.current.dockMove(tabData, targetPanel, "middle");
          } else {
            // No panel exists — loadLayout directly to create the first panel
            dockRef.current.loadLayout({
              dockbox: {
                mode: "horizontal",
                children: [{ tabs: [tabData] }],
              },
            });
          }

          knownTabIdsRef.current.add(id);
        },
        removeTab: (id: string) => {
          if (!dockRef.current) return;
          const tab = dockRef.current.find(id);
          if (tab) {
            dockRef.current.dockMove(tab as TabData, null, "remove");
          }
        },
        hasPanel: () => {
          if (!dockRef.current) return false;
          const layout = dockRef.current.getLayout();
          return collectAllTabIds(layout).size > 0;
        },
      }),
      []
    );

    return (
      <DockLayout
        ref={dockRef}
        defaultLayout={DEFAULT_LAYOUT}
        loadTab={loadTab}
        onLayoutChange={onLayoutChange}
        groups={{
          terminal: {
            floatable: true,
            animated: false,
            panelExtra: () => (
              <NewTerminalButton onNew={onNewTerminal} />
            ),
          },
        }}
        dropMode="edge"
        style={{ position: "absolute", inset: 0 }}
      />
    );
  }
);

DockArea.displayName = "DockArea";
