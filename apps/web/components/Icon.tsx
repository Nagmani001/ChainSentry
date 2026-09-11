import type { SVGProps } from "react";

export type IconName =
  | "menu"
  | "search"
  | "home"
  | "apps"
  | "chart"
  | "logs"
  | "traces"
  | "incident"
  | "help"
  | "chevronDown"
  | "chevronRight"
  | "sync"
  | "clock"
  | "plus"
  | "star"
  | "user"
  | "dock"
  | "close"
  | "send"
  | "edit"
  | "trash"
  | "grip"
  | "check"
  | "external"
  | "corner"
  | "warning"
  | "arrowRight";

const PATHS: Record<IconName, React.ReactNode> = {
  menu: (
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </>
  ),
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  apps: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v15a1 1 0 0 0 1 1h15" />
      <path d="M7.5 15l3.5-4 3 2.5L20 7" />
    </>
  ),
  logs: (
    <>
      <line x1="8" y1="7" x2="20" y2="7" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="4" y1="7" x2="4.01" y2="7" />
      <line x1="4" y1="12" x2="4.01" y2="12" />
      <line x1="4" y1="17" x2="4.01" y2="17" />
    </>
  ),
  traces: (
    <>
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <rect x="3" y="17" width="6" height="4" rx="1" />
      <rect x="15" y="17" width="6" height="4" rx="1" />
      <path d="M12 7v4M12 11H6v6M12 11h6v6" />
    </>
  ),
  incident: (
    <>
      <path d="M12 3l1.6 3.6L17 8l-3.4 1.4L12 13l-1.6-3.6L7 8l3.4-1.4z" />
      <path d="M18 14l.8 1.8L21 17l-2.2.9L18 20l-.8-2L15 17l2.2-1z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.5 2.5 0 0 1 4.7 1.1c0 1.7-2.2 2.1-2.2 3.5" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  sync: (
    <>
      <path d="M20 11a8 8 0 0 0-14-4.5L4 8" />
      <path d="M4 5v3h3" />
      <path d="M4 13a8 8 0 0 0 14 4.5L20 16" />
      <path d="M20 19v-3h-3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  star: <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.9 7.2 19l.9-5.4L4.2 9.7l5.4-.8z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  dock: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </>
  ),
  close: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  send: (
    <>
      <path d="M4 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.2z" />
      <line x1="14" y1="8.5" x2="16.5" y2="11" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  external: (
    <>
      <path d="M14 5h5v5" />
      <path d="M19 5l-8 8" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  corner: <path d="M6 4v10a2 2 0 0 0 2 2h10" />,
  warning: (
    <>
      <path d="M12 3.5 21 19H3z" />
      <line x1="12" y1="9.5" x2="12" y2="13.5" />
      <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
    </>
  ),
  arrowRight: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
