import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useMatches } from "../../hooks/useApi";
import { bloodBankAPI } from "../../services/api";
import { BloodBadge, StatusBadge, Icon, Spinner, EmptyState, ErrorBanner } from "../common/Common";
import styles from "./Matches.module.css";

export default function Matches() {
  const { t } = useTheme();
  const navigate = useNavigate();
  const { matches, loading, error, refetch, cancelMatch } = useMatches();
  const [fulfilling, setFulfilling] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const handleFulfill = async (requestId, matchId) => {
    if (!window.confirm("Mark this request as fulfilled? This will deduct stock.")) return;
    setFulfilling(matchId);
    try {
      await bloodBankAPI.fulfillRequest(requestId);
      refetch();
    } catch (err) {
      alert(err.message);
    } finally { setFulfilling(null); }
  };

  const handleCancel = async (matchId) => {
    if (!window.confirm("Cancel this match?")) return;
    setCancelling(matchId);
    try {
      await cancelMatch(matchId);
    } catch (err) {
      alert(err.message);
    } finally { setCancelling(null); }
  };

  const active    = matches.filter(m => m.status === "active");
  const completed = matches.filter(m => m.status === "completed");
  const cancelled = matches.filter(m => m.status === "cancelled");

  const renderMatch = (m) => {
    const req = m.request || {};
    const participants = m.participants || [];
    return (
      <div key={m._id} className={styles.card}
        style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className={styles.cardTop}>
          <div className={styles.cardLeft}>
            <BloodBadge type={req.requiredBloodType || "—"} />
            <div>
              <div className={styles.cardTitle} style={{ color: t.text }}>
                {req.unitsNeeded || "—"} unit{req.unitsNeeded > 1 ? "s" : ""} needed
              </div>
              <div className={styles.cardSub} style={{ color: t.textMuted }}>
                {req.isEmergency ? "⚡ Emergency · " : ""}
                {new Date(m.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
          <StatusBadge status={m.status} />
        </div>

        {/* See details row */}
        <div style={{ padding: "8px 0", color: t.textMuted, fontSize: 12, lineHeight: 1.6 }}>
          {req.requiredBloodType && <span style={{ marginRight: 12 }}>🩸 {req.requiredBloodType}</span>}
          {req.unitsNeeded && <span style={{ marginRight: 12 }}>📦 {req.unitsNeeded} units</span>}
          {req.isEmergency && <span style={{ color: t.primary, marginRight: 12 }}>⚡ Emergency</span>}
          {participants.length > 0 && <span>👥 {participants.length} participant{participants.length !== 1 ? "s" : ""}</span>}
        </div>

        {m.status === "active" && (
          <div className={styles.actions}>
            <button className={styles.chatBtn}
              style={{ background: `${t.blue}14`, color: t.blue, border: `1px solid ${t.blue}30` }}
              onClick={() => navigate("/messages", { state: { matchId: m._id } })}>
              <Icon name="messages" size={14} color={t.blue} /> Chat
            </button>
            <button className={styles.fulfillBtn}
              style={{ background: t.gradientRed }}
              onClick={() => handleFulfill(req._id || m.request, m._id)}
              disabled={fulfilling === m._id}>
              {fulfilling === m._id ? "Processing…" : "✓ Fulfill"}
            </button>
            <button className={styles.cancelBtn}
              style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.textMuted }}
              onClick={() => handleCancel(m._id)}
              disabled={cancelling === m._id}>
              {cancelling === m._id ? "…" : <Icon name="x" size={14} />}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <Spinner label="Loading matches…" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (matches.length === 0) return (
    <EmptyState icon="matches" title="No matches yet"
      message="Accept a blood request nearby to start a match." />
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle} style={{ color: t.text }}>Matches</h2>
        <div className={styles.summary} style={{ color: t.textMuted, fontSize: 13 }}>
          {active.length} active · {completed.length} completed · {cancelled.length} cancelled
        </div>
      </div>

      {active.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle} style={{ color: t.textMuted }}>Active</h3>
          <div className={styles.list}>{active.map(renderMatch)}</div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle} style={{ color: t.textMuted }}>Completed</h3>
          <div className={styles.list}>{completed.map(renderMatch)}</div>
        </section>
      )}

      {cancelled.length > 0 && (
        <section>
          <h3 className={styles.sectionTitle} style={{ color: t.textMuted }}>Cancelled</h3>
          <div className={styles.list}>{cancelled.map(renderMatch)}</div>
        </section>
      )}
    </div>
  );
}
