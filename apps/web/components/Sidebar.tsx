"use client";

const NAV = [
  { key: "metrics", label: "Metrics", enabled: true },
  { key: "logs", label: "Logs", enabled: false },
  { key: "traces", label: "Traces", enabled: false },
  { key: "ai", label: "AI incident agent", enabled: false },
  { key: "bridge", label: "web2 <-> web3", enabled: false },
];

export function Sidebar({ active }: { active: string }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">CS</div>
        <div className="brand-name">ChainSentry</div>
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`nav-item ${n.key === active ? "active" : ""} ${
              n.enabled ? "" : "disabled"
            }`}
            disabled={!n.enabled}
            title={n.enabled ? "" : "Coming soon"}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item">Theme</button>
        <button className="nav-item">Settings</button>
      </div>
    </aside>
  );
}
