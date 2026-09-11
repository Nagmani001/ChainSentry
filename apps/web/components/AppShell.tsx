"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { CommandPalette } from "./CommandPalette";

interface NavLeaf {
  label: string;
  href: string;
  icon: IconName;
}
interface NavGroup {
  label: string;
  icon: IconName;
  href: string;
  children?: NavLeaf[];
}

const NAV: NavGroup[] = [
  { label: "Home", href: "/", icon: "home" },
  {
    label: "Dashboards",
    href: "/metrics",
    icon: "apps",
    children: [
      { label: "Metrics", href: "/metrics", icon: "chart" },
      { label: "Logs", href: "/logs", icon: "logs" },
      { label: "Traces", href: "/traces", icon: "traces" },
    ],
  },
  { label: "Incident agent", href: "/incident", icon: "incident" },
];

const CRUMBS: Record<string, string[]> = {
  "/": ["Home"],
  "/metrics": ["Dashboards", "Metrics"],
  "/logs": ["Dashboards", "Logs"],
  "/traces": ["Dashboards", "Traces"],
  "/incident": ["Incident agent"],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [docked, setDocked] = useState(true);
  const [dashOpen, setDashOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const crumbs = CRUMBS[pathname] ?? ["Home"];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;

  return (
    <div className={`shell ${docked ? "" : "shell-collapsed"}`}>
      <aside className="nav-rail">
        <div className="nav-brand">
          <Link href="/" className="brand" aria-label="ChainSentry home">
            <span className="brand-mark">
              <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
                <defs>
                  <linearGradient id="cs-mark" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ff9830" />
                    <stop offset="1" stopColor="#f2495c" />
                  </linearGradient>
                </defs>
                <path
                  d="M16 3l11 6v7c0 6.6-4.5 11.7-11 13-6.5-1.3-11-6.4-11-13V9z"
                  fill="none"
                  stroke="url(#cs-mark)"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 16.5l3.2 3.2L21 12.5"
                  fill="none"
                  stroke="url(#cs-mark)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="brand-name">ChainSentry</span>
          </Link>
          <button
            className="icon-btn nav-dock"
            onClick={() => setDocked((v) => !v)}
            title={docked ? "Collapse menu" : "Expand menu"}
            aria-label="Toggle menu"
          >
            <Icon name="dock" size={18} />
          </button>
        </div>

        <button className="nav-search" onClick={() => setPaletteOpen(true)}>
          <Icon name="search" size={16} />
          <span className="nav-search-label">Search or jump to…</span>
          <kbd className="kbd">⌘K</kbd>
        </button>

        <nav className="nav-groups">
          {NAV.map((g) =>
            g.children ? (
              <div className="nav-group" key={g.label}>
                <div className="nav-parent">
                  <Link
                    href={g.href}
                    className={`nav-item ${
                      g.children.some((c) => isActive(c.href)) ? "active" : ""
                    }`}
                  >
                    <span className="nav-item-icon">
                      <Icon name={g.icon} size={18} />
                    </span>
                    <span className="nav-item-label">{g.label}</span>
                  </Link>
                  <button
                    className="nav-expand"
                    onClick={() => setDashOpen((v) => !v)}
                    aria-label="Toggle Dashboards"
                    aria-expanded={dashOpen}
                  >
                    <Icon name={dashOpen ? "chevronDown" : "chevronRight"} size={16} />
                  </button>
                </div>
                {dashOpen ? (
                  <div className="nav-children">
                    {g.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className={`nav-child ${isActive(c.href) ? "active" : ""}`}
                      >
                        <span className="nav-item-icon">
                          <Icon name={c.icon} size={16} />
                        </span>
                        <span className="nav-item-label">{c.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                key={g.href}
                href={g.href}
                className={`nav-item ${isActive(g.href) ? "active" : ""}`}
              >
                <span className="nav-item-icon">
                  <Icon name={g.icon} size={18} />
                </span>
                <span className="nav-item-label">{g.label}</span>
              </Link>
            ),
          )}
        </nav>

        <div className="nav-bottom">
          <button
            className="nav-item"
            title="Help"
            onClick={() => setPaletteOpen(true)}
          >
            <span className="nav-item-icon">
              <Icon name="help" size={18} />
            </span>
            <span className="nav-item-label">Help</span>
          </button>
          <div className="nav-user">
            <span className="nav-avatar">
              <Icon name="user" size={16} />
            </span>
            <span className="nav-item-label">Operator</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn topbar-menu"
            onClick={() => setDocked((v) => !v)}
            aria-label="Toggle menu"
          >
            <Icon name="menu" size={18} />
          </button>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span className="crumb-part" key={c}>
                {i > 0 ? <span className="crumb-sep">/</span> : null}
                <span className={`crumb ${i === crumbs.length - 1 ? "current" : ""}`}>
                  {c}
                </span>
              </span>
            ))}
          </nav>

          <button className="cmdk-trigger" onClick={() => setPaletteOpen(true)}>
            <Icon name="search" size={16} />
            <span>Search or jump to…</span>
            <kbd className="kbd">⌘K</kbd>
          </button>

          <div className="topbar-right">
            <button
              className="icon-btn"
              title="Help"
              onClick={() => setPaletteOpen(true)}
            >
              <Icon name="help" size={18} />
            </button>
            <span className="topbar-avatar" title="Operator">
              <Icon name="user" size={16} />
            </span>
          </div>
        </header>

        <div className="page">{children}</div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
