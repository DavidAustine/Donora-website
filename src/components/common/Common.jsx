import { useTheme } from "../../context/ThemeContext";
import styles from "./Common.module.css";

// ─── ICON ─────────────────────────────────────────────────────────────────────
const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
  requests:  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  matches:   <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  messages:  <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  inventory: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
  profile:   <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  bell:      <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  sun:       <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
  moon:      <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
  send:      <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  check:     <><polyline points="20 6 9 17 4 12"/></>,
  x:         <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  menu:      <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  edit:      <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  arrowRight:<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
  phone:     <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.44 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,
  location:  <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  droplet:   null,
  logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  refresh:   <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
};

export function Icon({ name, size = 18, color = "currentColor" }) {
  if (name === "droplet") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

// ─── BLOOD BADGE ──────────────────────────────────────────────────────────────
export function BloodBadge({ type }) {
  return <span className={styles.bloodBadge}>{type}</span>;
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  pending:   { cls: "statusWarning",   label: "Pending"   },
  active:    { cls: "statusSuccess",   label: "Active"    },
  completed: { cls: "statusMuted",     label: "Completed" },
  cancelled: { cls: "statusMuted",     label: "Cancelled" },
  critical:  { cls: "statusDanger",    label: "Critical"  },
  low:       { cls: "statusWarning",   label: "Low"       },
  adequate:  { cls: "statusSuccess",   label: "Adequate"  },
  matched:   { cls: "statusSuccess",   label: "Matched"   },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { cls: "statusMuted", label: status };
  return <span className={`${styles.statusBadge} ${styles[cfg.cls]}`}>{cfg.label}</span>;
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 32, label = "Loading…" }) {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinner} style={{ width: size, height: size }} />
      {label && <span className={styles.spinnerLabel}>{label}</span>}
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
export function EmptyState({ icon = "droplet", title = "Nothing here", message = "" }) {
  const { t } = useTheme();
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Icon name={icon} size={32} color={t.primary} />
      </div>
      <div className={styles.emptyTitle}>{title}</div>
      {message && <div className={styles.emptyMessage}>{message}</div>}
    </div>
  );
}

// ─── ERROR BANNER ─────────────────────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }) {
  return (
    <div className={styles.errorBanner}>
      <span>⚠️ {message}</span>
      {onRetry && <button className={styles.retryBtn} onClick={onRetry}>Retry</button>}
    </div>
  );
}
