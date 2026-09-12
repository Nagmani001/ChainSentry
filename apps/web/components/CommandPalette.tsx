"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./Icon";

interface Command {
  label: string;
  hint: string;
  href: string;
  icon: IconName;
  group: string;
}

const COMMANDS: Command[] = [
  {
    label: "Home",
    hint: "Connect a contract",
    href: "/",
    icon: "home",
    group: "Navigation",
  },
  {
    label: "Metrics",
    hint: "Time-series dashboards",
    href: "/metrics",
    icon: "chart",
    group: "Dashboards",
  },
  {
    label: "Logs",
    hint: "Decoded event stream",
    href: "/logs",
    icon: "logs",
    group: "Dashboards",
  },
  {
    label: "Traces",
    hint: "Internal call trees",
    href: "/traces",
    icon: "traces",
    group: "Dashboards",
  },
  {
    label: "Alerting",
    hint: "Rules and on-call",
    href: "/alerts",
    icon: "bell",
    group: "Operations",
  },
  {
    label: "Issues",
    hint: "Resolve triggered alerts",
    href: "/issues",
    icon: "issues",
    group: "Operations",
  },
  {
    label: "Incident agent",
    hint: "Ask about anomalies",
    href: "/incident",
    icon: "incident",
    group: "Navigation",
  },
  {
    label: "Connect a contract",
    hint: "Add a data source",
    href: "/",
    icon: "plus",
    group: "Actions",
  },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    onClose();
    router.push(cmd.href);
  };

  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div
        className="cmdk"
        role="dialog"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cmdk-input-row">
          <Icon name="search" size={18} className="cmdk-input-icon" />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Search or jump to…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(results[active]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
          />
          <kbd className="kbd">esc</kbd>
        </div>
        <div className="cmdk-list">
          {results.length === 0 ? (
            <div className="cmdk-empty">No results for “{query}”.</div>
          ) : (
            results.map((c, i) => (
              <button
                key={c.label + c.href}
                className={`cmdk-item ${i === active ? "active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
              >
                <span className="cmdk-item-icon">
                  <Icon name={c.icon} size={16} />
                </span>
                <span className="cmdk-item-label">{c.label}</span>
                <span className="cmdk-item-hint">{c.hint}</span>
                <span className="cmdk-item-group">{c.group}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
