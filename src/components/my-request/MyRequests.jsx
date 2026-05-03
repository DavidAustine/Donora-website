

import { useState, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useGeolocation } from "../../hooks/useApi";
import { requestAPI } from "../../services/api";
import { BloodBadge, StatusBadge, Icon, Spinner, EmptyState, ErrorBanner } from "../common/Common";
import styles from "./MyRequests.module.css";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ─── New Request Form ─────────────────────────────────────────────────────────
function NewRequestForm({ onSubmitted, lng, lat }) {
  const { t } = useTheme();
  const [form, setForm] = useState({
    requiredBloodType: "",
    unitsNeeded: "",
    patientNote: "",
    isEmergency: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.requiredBloodType || !form.unitsNeeded) {
      setError("Blood type and units are required.");
      return;
    }
    if (!lng || !lat) {
      setError("Location not available. Please allow location access.");
      return;
    }
    setLoading(true);
    try {
      await requestAPI.createRequest({
        requiredBloodType: form.requiredBloodType,
        unitsNeeded: parseInt(form.unitsNeeded, 10),
        patientNote: form.patientNote,
        isEmergency: form.isEmergency,
        lng,
        lat,
      });
      setForm({ requiredBloodType: "", unitsNeeded: "", patientNote: "", isEmergency: false });
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formCard} style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className={styles.formTitle} style={{ color: t.text }}>
        <Icon name="requests" size={16} color={t.primary} />
        Submit Blood Request
      </div>
      <p className={styles.formDesc} style={{ color: t.textMuted }}>
        Request blood on behalf of a patient. This request will be visible to donors and other
        medical facilities, but not to your own facility on the Requests feed.
      </p>

      {error && <ErrorBanner message={error} />}

      <div className={styles.formGrid}>
        {/* Blood type */}
        <div className={styles.formField}>
          <label className={styles.label} style={{ color: t.textMuted }}>Blood Type Required *</label>
          <select
            name="requiredBloodType"
            value={form.requiredBloodType}
            onChange={handleChange}
            className={styles.select}
            style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
          >
            <option value="">Select blood type</option>
            {BLOOD_TYPES.map((bt) => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
        </div>

        {/* Units */}
        <div className={styles.formField}>
          <label className={styles.label} style={{ color: t.textMuted }}>Units Needed *</label>
          <input
            type="number"
            name="unitsNeeded"
            min="1"
            max="50"
            value={form.unitsNeeded}
            onChange={handleChange}
            placeholder="e.g. 2"
            className={styles.input}
            style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
          />
        </div>

        {/* Patient note */}
        <div className={styles.formField} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.label} style={{ color: t.textMuted }}>Patient Note (optional)</label>
          <input
            type="text"
            name="patientNote"
            value={form.patientNote}
            onChange={handleChange}
            placeholder="e.g. Patient in ICU, surgical prep"
            className={styles.input}
            style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
          />
        </div>

        {/* Emergency toggle */}
        <div className={styles.emergencyToggle} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.toggleLabel} style={{ color: t.text }}>
            <input
              type="checkbox"
              name="isEmergency"
              checked={form.isEmergency}
              onChange={handleChange}
              className={styles.checkbox}
            />
            <span className={styles.toggleText}>
              🚨 Mark as Emergency
              <span style={{ color: t.textMuted, fontSize: 11, marginLeft: 6 }}>
                (notifies all connected facilities immediately)
              </span>
            </span>
          </label>
        </div>
      </div>

      <button
        className={styles.submitBtn}
        style={{
          background: form.isEmergency ? t.gradientRed : t.gradientPrimary || t.gradientRed,
          opacity: loading ? 0.7 : 1,
        }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <><span className={styles.spinnerDot} /> Submitting…</>
        ) : (
          <><Icon name="requests" size={14} color="#fff" /> Submit Request</>
        )}
      </button>
    </div>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ req, onCancel, cancelling }) {
  const { t } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const statusColor = {
    pending: t.warning || "#f59e0b",
    matched: t.blue || "#3b82f6",
    completed: t.success || "#22c55e",
    cancelled: t.textMuted,
  };

  return (
    <div
      className={styles.reqCard}
      style={{
        background: req.isEmergency ? (t.redMuted2 || "#fff5f5") : t.surface,
        border: `1px solid ${req.isEmergency ? (t.primary + "40") : t.border}`,
        boxShadow: req.isEmergency ? `0 4px 20px ${t.primary}18` : `0 2px 8px ${t.shadow}08`,
      }}
    >
      <div className={styles.cardRow}>
        <div className={styles.cardLeft}>
          <BloodBadge type={req.requiredBloodType} />
          {req.isEmergency && (
            <span className={styles.emergencyTag}>⚡ Emergency</span>
          )}
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className={styles.cardMeta} style={{ color: t.textMuted }}>
        <span>🩸 {req.unitsNeeded} unit{req.unitsNeeded > 1 ? "s" : ""}</span>
        <span>🕐 {timeAgo(req.createdAt)}</span>
        {req.patientNote && (
          <span style={{ fontStyle: "italic" }}>📝 {req.patientNote}</span>
        )}
      </div>

      {req.status === "matched" && (
        <div className={styles.matchedNote} style={{ background: t.bgDark, color: t.blue || "#3b82f6" }}>
          ✓ Accepted by a donor or facility — check Matches for details
        </div>
      )}
      {req.status === "completed" && (
        <div className={styles.matchedNote} style={{ background: t.bgDark, color: t.success || "#22c55e" }}>
          ✓ Fulfilled successfully
        </div>
      )}

      <button
        className={styles.expandBtn}
        style={{ color: t.textMuted }}
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? "▲ Hide details" : "▼ See details"}
      </button>

      {expanded && (
        <div className={styles.expandedBlock} style={{ background: t.bgDark, color: t.textMuted }}>
          <div><strong style={{ color: t.text }}>Blood Type:</strong> {req.requiredBloodType}</div>
          <div><strong style={{ color: t.text }}>Units:</strong> {req.unitsNeeded}</div>
          <div><strong style={{ color: t.text }}>Status:</strong> {req.status}</div>
          <div><strong style={{ color: t.text }}>Submitted:</strong> {timeAgo(req.createdAt)}</div>
          {req.patientNote && (
            <div><strong style={{ color: t.text }}>Note:</strong> {req.patientNote}</div>
          )}
        </div>
      )}

      {req.status === "pending" && (
        <button
          className={styles.cancelBtn}
          style={{ color: t.primary, borderColor: t.primary + "40" }}
          onClick={() => onCancel(req._id)}
          disabled={cancelling === req._id}
        >
          {cancelling === req._id ? "Cancelling…" : "Cancel Request"}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MyRequests() {
  const { t } = useTheme();
  const { lng, lat, geoError } = useGeolocation();
  const [requests, setRequests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [tab, setTab] = useState("submitted"); // "submitted" | "accepted"

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestAPI.getMyRequests();
      // Backend returns { submitted, accepted } for bloodbank role
      if (data && typeof data === "object" && !Array.isArray(data)) {
        setRequests(data);
      } else {
        // Fallback for patient/donor (returns flat array)
        setRequests({ submitted: data, accepted: [] });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useState(() => { fetchRequests(); }, []);

  const handleCancel = async (requestId) => {
    setCancelling(requestId);
    try {
      await requestAPI.cancelRequest(requestId);
      setRequests((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          submitted: (prev.submitted || []).map((r) =>
            r._id === requestId ? { ...r, status: "cancelled" } : r
          ),
        };
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(null);
    }
  };

  const submitted = requests?.submitted || [];
  const accepted = requests?.accepted || [];
  const current = tab === "submitted" ? submitted : accepted;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle} style={{ color: t.text }}>My Requests</h2>
          <p className={styles.pageSub} style={{ color: t.textMuted }}>
            Blood requests submitted by your facility — not visible to you on the Requests feed
          </p>
        </div>
        <button
          className={styles.refreshBtn}
          style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
          onClick={fetchRequests}
        >
          <Icon name="refresh" size={15} color={t.text} />
        </button>
      </div>

      {geoError && (
        <ErrorBanner message={`Location: ${geoError}. Enable location to submit requests.`} />
      )}
      {error && <ErrorBanner message={error} onRetry={fetchRequests} />}

      {/* New Request Form */}
      <NewRequestForm onSubmitted={fetchRequests} lng={lng} lat={lat} />

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          { key: "submitted", label: `Submitted (${submitted.length})` },
          { key: "accepted", label: `Accepted by Us (${accepted.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ""}`}
            style={{
              background: tab === key ? t.primary : t.surface,
              color: tab === key ? "#fff" : t.textMuted,
              border: `1px solid ${tab === key ? t.primary : t.border}`,
            }}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <Spinner label="Loading requests…" />
      ) : current.length === 0 ? (
        <EmptyState
          icon="requests"
          title={tab === "submitted" ? "No requests submitted yet" : "No accepted requests"}
          message={
            tab === "submitted"
              ? "Use the form above to submit a blood request on behalf of a patient."
              : "Requests you accept from the Requests page will appear here."
          }
        />
      ) : (
        <div className={styles.grid}>
          {current.map((req) => (
            <RequestCard
              key={req._id}
              req={req}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
