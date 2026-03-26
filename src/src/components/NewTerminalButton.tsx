import { useState, useRef, useEffect } from "react";

const SHELL_OPTIONS = [
  { shell: undefined as string | undefined, icon: ">_", name: "Default", desc: "System default shell" },
  { shell: "powershell.exe", icon: "PS", name: "PowerShell", desc: "Windows PowerShell" },
  { shell: "cmd.exe", icon: "CMD", name: "CMD", desc: "Command Prompt" },
];

interface NewTerminalButtonProps {
  onNew: (shell?: string) => void;
}

export function NewTerminalButton({ onNew }: NewTerminalButtonProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className="dock-panel-extra-btn"
        onClick={toggle}
        title="New terminal"
      >
        +
      </button>
      {open && (
        <div
          ref={dropdownRef}
          className="shell-dropdown"
          style={{ top: pos.top, left: pos.left }}
        >
          {SHELL_OPTIONS.map((opt) => (
            <button
              key={opt.name}
              className="shell-dropdown__item"
              onClick={() => {
                onNew(opt.shell);
                setOpen(false);
              }}
            >
              <span className="shell-dropdown__item-icon">{opt.icon}</span>
              <span className="shell-dropdown__item-info">
                <span className="shell-dropdown__item-name">{opt.name}</span>
                <span className="shell-dropdown__item-desc">{opt.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
