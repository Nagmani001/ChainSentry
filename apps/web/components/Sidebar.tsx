"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { key: "metrics", label: "Metrics", href: "/", enabled: true },
  { key: "logs", label: "Logs", href: "/logs", enabled: true },
  { key: "traces", label: "Traces", href: "#", enabled: false },
  { key: "ai", label: "AI incident agent", href: "#", enabled: false },
  { key: "bridge", label: "web2 <-> web3", href: "#", enabled: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const activeKey = pathname === "/logs" ? "logs" : "metrics";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">CS</div>
        <div className="brand-name">ChainSentry</div>
      </div>
      <nav className="nav">
        {NAV.map((n) =>
          n.enabled ? (
            <Link
              key={n.key}
              href={n.href}
              className={`nav-item ${n.key === activeKey ? "active" : ""}`}
            >
              {n.label}
            </Link>
          ) : (
            <button
              key={n.key}
              className="nav-item disabled"
              disabled
              title="Coming soon"
            >
              {n.label}
            </button>
          ),
        )}
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item">Theme</button>
        <button className="nav-item">Settings</button>
      </div>
    </aside>
  );
}
