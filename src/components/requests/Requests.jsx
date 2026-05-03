import { useState, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useNearbyRequests, useGeolocation } from "../../hooks/useApi";
import { bloodBankAPI } from "../../services/api";
import { BloodBadge, StatusBadge, Icon, Spinner, EmptyState, ErrorBanner } from "../common/Common";
import styles from "./Requests.module.css";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Requests() {
  const { t } = useTheme();
  const { lng, lat, geoError } = useGeolocation();
  const [filter, setFilter] = useState("all");
  const [radius, setRadius] = useState(10);
  const [accepting, setAccepting] = useState(null);
  const [successIds, setSuccessIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const { requests, loading, error, refetch } = useNearbyRequests(lng, lat, radius);

  const filtered = filter === "all" ? requests
    : filter === "emergency" ? requests.filter(r => r.isEmergency)
    : requests.filter(r => r.requiredBloodType === filter);

  const handleAccept = useCallback(async (requestId) => {
    setAccepting(requestId);
    try {
      await bloodBankAPI.acceptRequest(requestId);
      setSuccessIds(s => new Set([...s, requestId]));
    } catch (err) {
      alert(err.message);
    } finally {
      setAccepting(null);
    }
  }, []);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle} style={{ color: t.text }}>Nearby Requests</h2>
          <p className={styles.pageSub} style={{ color: t.textMuted }}>
            Blood requests within {radius}km · Excludes requests your facility submitted
          </p>
        </div>
        <div className={styles.headerActions}>
          <select
            className={styles.radiusSelect}
            style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
          <button className={styles.refreshBtn}
            style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
            onClick={refetch}>
            <Icon name="refresh" size={15} color={t.text} />
          </button>
        </div>
      </div>

      {geoError && (
        <ErrorBanner message={`Location error: ${geoError}. Enable location for nearby requests.`} />
      )}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {/* Filters */}
      <div className={styles.filters}>
        {["all", "emergency", ...BLOOD_TYPES].map(f => (
          <button key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
            style={{
              background: filter === f ? t.primary : t.surface,
              color: filter === f ? "#fff" : t.textMuted,
              border: `1px solid ${filter === f ? t.primary : t.border}`,
            }}
            onClick={() => setFilter(f)}>
            {f === "all" ? "All Types" : f === "emergency" ? "🚨 Emergency" : f}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <Spinner label="Fetching nearby requests…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="requests"
          title="No requests found"
          message={`No ${filter !== "all" ? filter + " " : ""}blood requests within ${radius}km right now.`}
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map(req => {
            const accepted = successIds.has(req._id);
            return (
              <div key={req._id}
                className={styles.card}
                style={{
                  background: req.isEmergency ? (t.bgDark === "#000000" ? "#E8192C0A" : "#FFF5F5") : t.surface,
                  border: `1px solid ${req.isEmergency ? t.primary + "40" : t.border}`,
                  boxShadow: req.isEmergency ? `0 4px 24px ${t.shadowRed}` : `0 2px 12px ${t.shadow}06`,
                }}>

                <div className={styles.cardTop}>
                  <div className={styles.cardBadges}>
                    <BloodBadge type={req.requiredBloodType} />
                    {req.isEmergency && (
                      <span className={styles.emergencyTag}>⚡ EMERGENCY</span>
                    )}
                  </div>
                  <StatusBadge status={accepted ? "matched" : req.status} />
                </div>

                <div className={styles.cardMeta}>
                  <span style={{ color: t.textMuted, fontSize: 12 }}>
                    🩸 {req.unitsNeeded} unit{req.unitsNeeded > 1 ? "s" : ""}
                  </span>
                  <span style={{ color: t.textMuted, fontSize: 12 }}>
                    🕐 {timeAgo(req.createdAt)}
                  </span>
                  {req.patient?.phone && (
                    <span style={{ color: t.textMuted, fontSize: 12 }}>
                      <Icon name="phone" size={11} color={t.textMuted} /> {req.patient.phone}
                    </span>
                  )}
                </div>

                {req.patient && (
                  <div className={styles.patientRow} style={{ color: t.textMuted, fontSize: 12 }}>
                    Patient: {req.patient.firstname} {req.patient.surname}
                    {req.patient.bloodType && (
                      <span> · Blood type: <strong style={{ color: t.text }}>{req.patient.bloodType}</strong></span>
                    )}
                  </div>
                )}

                {/* See details expandable section */}
                <button
                  onClick={() => setExpandedId(expandedId === req._id ? null : req._id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: t.textMuted, fontSize: 12, padding: "4px 0",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  {expandedId === req._id ? "▲ Hide details" : "▼ See details"}
                </button>

                {expandedId === req._id && (
                  <div style={{
                    background: t.bgDark, borderRadius: 8, padding: "10px 12px",
                    fontSize: 12, color: t.textMuted, lineHeight: 1.8,
                  }}>
                    <div><strong style={{ color: t.text }}>Blood Type:</strong> {req.requiredBloodType}</div>
                    <div><strong style={{ color: t.text }}>Units Needed:</strong> {req.unitsNeeded}</div>
                    <div><strong style={{ color: t.text }}>Status:</strong> {req.status}</div>
                    {req.patient && (
                      <div><strong style={{ color: t.text }}>Patient:</strong> {req.patient.firstname} {req.patient.surname}
                        {req.patient.bloodType ? ` (${req.patient.bloodType})` : ""}
                      </div>
                    )}
                    {req.patient?.phone && (
                      <div><strong style={{ color: t.text }}>Phone:</strong> {req.patient.phone}</div>
                    )}
                    <div><strong style={{ color: t.text }}>Posted:</strong> {timeAgo(req.createdAt)}</div>
                    {req.isEmergency && <div style={{ color: t.primary }}>⚡ Emergency Request</div>}
                  </div>
                )}

                {!accepted && req.status === "pending" && (
                  <div className={styles.cardActions}>
                    <button
                      className={styles.acceptBtn}
                      style={{ background: t.gradientRed }}
                      onClick={() => handleAccept(req._id)}
                      disabled={accepting === req._id}
                    >
                      {accepting === req._id ? "Accepting…" : "Accept Request"}
                    </button>
                  </div>
                )}

                {accepted && (
                  <div className={styles.acceptedNote} style={{ background: t.successBg, color: t.success }}>
                    ✓ Accepted — check Matches for details
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
