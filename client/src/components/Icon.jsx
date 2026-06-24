// Crisp line icons (Feather/Lucide style) — 20px, stroke=currentColor.
const PATHS = {
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  pipeline: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="9.5" y="4" width="5" height="11" rx="1.5" /><rect x="16" y="4" width="5" height="7" rx="1.5" /></>,
  capture: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M18 7v6M15 10h6" /></>,
  reports: <><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="7" rx="1" /><rect x="12" y="7" width="3" height="11" rx="1" /><rect x="17" y="13" width="3" height="5" rx="1" /></>,
  flow: <><circle cx="6" cy="6" r="2.4" /><circle cx="6" cy="18" r="2.4" /><circle cx="18" cy="12" r="2.4" /><path d="M8.4 6H13a3 3 0 0 1 3 3v.6M8.4 18H13a3 3 0 0 0 3-3v-.6" /></>,
  automation: <><path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  spark: <><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" /></>,
};

export default function Icon({ name, size = 18, strokeWidth = 1.7, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name] || null}
    </svg>
  );
}
