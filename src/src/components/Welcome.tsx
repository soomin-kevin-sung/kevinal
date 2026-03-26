interface WelcomeProps {
  onSelectShell: (shell?: string) => void;
}

const SHELLS = [
  { shell: undefined, icon: ">_", name: "Default", desc: "System shell" },
  { shell: "powershell.exe", icon: "PS", name: "PowerShell", desc: "Windows" },
  { shell: "cmd.exe", icon: "CMD", name: "CMD", desc: "Classic" },
];

export function Welcome({ onSelectShell }: WelcomeProps) {
  return (
    <div className="welcome">
      <div className="welcome__logo">K</div>
      <h1 className="welcome__title">Kevinal</h1>
      <p className="welcome__subtitle">Start a new terminal session</p>
      <div className="welcome__shells">
        {SHELLS.map((s) => (
          <button
            key={s.name}
            className="welcome__shell-btn"
            onClick={() => onSelectShell(s.shell)}
          >
            <span className="welcome__shell-icon">{s.icon}</span>
            <span className="welcome__shell-name">{s.name}</span>
            <span className="welcome__shell-desc">{s.desc}</span>
          </button>
        ))}
      </div>
      <div className="welcome__shortcut">
        <span className="welcome__kbd">Ctrl</span>
        <span>+</span>
        <span className="welcome__kbd">T</span>
        <span>to quickly open a new terminal</span>
      </div>
    </div>
  );
}
