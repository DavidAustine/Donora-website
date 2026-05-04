import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useGeolocation } from "../../hooks/useApi";
import { bloodBankAPI, donorAPI, chatAPI } from "../../services/api";
import { BloodBadge, Icon, Spinner, EmptyState, ErrorBanner } from "../common/Common";
import styles from "./NearbyFacilities.module.css";

// ─── Stock badge ──────────────────────────────────────────────────────────────
function StockPill({ bloodType, units, t }) {
  const level = units < 5 ? "critical" : units < 20 ? "low" : "ok";
  const colors = {
    critical: { bg: "#E8192C18", text: "#E8192C", border: "#E8192C30" },
    low:      { bg: "#f59e0b18", text: "#f59e0b", border: "#f59e0b30" },
    ok:       { bg: "#22c55e18", text: "#22c55e", border: "#22c55e30" },
  };
  const c = colors[level];

  return (
    <span
      className={styles.stockPill}
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
      title={`${units} units of ${bloodType}`}
    >
      {bloodType} · {units}u
    </span>
  );
}

// ─── Facility card ────────────────────────────────────────────────────────────
function FacilityCard({ facility, onChat, chatting, t }) {
  const [expanded, setExpanded] = useState(false);
  const stock = facility.stock || [];
  const hasStock = stock.length > 0;
  const totalUnits = stock.reduce((s, i) => s + i.unitsAvailable, 0);
  const criticalCount = stock.filter((s) => s.unitsAvailable < 5).length;

  return (
    <div
      className={styles.facilityCard}
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      {/* Top row */}
      <div className={styles.cardTop}>
        <div className={styles.facilityIcon} style={{ background: "#E8192C18" }}>
          <Icon name="inventory" size={18} color="#E8192C" />
        </div>
        <div className={styles.facilityInfo}>
          <div className={styles.facilityName} style={{ color: t.text }}>
            {facility.name}
            {facility.isVerified && (
              <span className={styles.verifiedBadge} title="Verified facility">✓</span>
            )}
          </div>
          {facility.phone && (
            <div className={styles.facilityPhone} style={{ color: t.textMuted }}>
              <Icon name="phone" size={11} color={t.textMuted} /> {facility.phone}
            </div>
          )}
        </div>
        <button
          className={styles.chatBtn}
          style={{ background: "#E8192C", color: "#fff" }}
          onClick={() => onChat(facility.user)}
          disabled={chatting === facility.user}
        >
          {chatting === facility.user ? (
            <span className={styles.miniSpinner} />
          ) : (
            <Icon name="messages" size={14} color="#fff" />
          )}
          {chatting === facility.user ? "Opening…" : "Chat"}
        </button>
      </div>

      {/* Stock summary */}
      {hasStock ? (
        <>
          <div className={styles.stockSummary} style={{ color: t.textMuted }}>
            {totalUnits} total units
            {criticalCount > 0 && (
              <span style={{ color: "#E8192C", marginLeft: 6 }}>
                · {criticalCount} type{criticalCount > 1 ? "s" : ""} critical
              </span>
            )}
          </div>

          {/* Stock pills */}
          <div className={styles.stockPills}>
            {stock.map((s) => (
              <StockPill
                key={s.bloodType}
                bloodType={s.bloodType}
                units={s.unitsAvailable}
                t={t}
              />
            ))}
          </div>
        </>
      ) : (
        <div className={styles.noStock} style={{ color: t.textMuted }}>
          No inventory data available
        </div>
      )}

      {/* Expand for details */}
      {hasStock && (
        <>
          <button
            className={styles.expandBtn}
            style={{ color: t.textMuted }}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "▲ Less" : "▼ Full inventory"}
          </button>

          {expanded && (
            <div className={styles.stockTable}>
              {stock.map((s) => {
                const level = s.unitsAvailable < 5 ? "critical" : s.unitsAvailable < 20 ? "low" : "ok";
                const barColors = { critical: "#E8192C", low: "#f59e0b", ok: "#22c55e" };
                return (
                  <div key={s.bloodType} className={styles.stockRow} style={{ borderBottom: `1px solid ${t.border}08` }}>
                    <BloodBadge type={s.bloodType} />
                    <div className={styles.barWrap}>
                      <div className={styles.barBg} style={{ background: t.bgDark }}>
                        <div
                          className={styles.barFill}
                          style={{
                            width: `${Math.min(100, (s.unitsAvailable / 70) * 100)}%`,
                            background: barColors[level],
                          }}
                        />
                      </div>
                    </div>
                    <span style={{ color: t.text, fontSize: 12, fontWeight: 600, minWidth: 32, textAlign: "right" }}>
                      {s.unitsAvailable}<span style={{ color: t.textMuted, fontWeight: 400 }}> u</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Donor card ───────────────────────────────────────────────────────────────
function DonorCard({ donor, onChat, chatting, t }) {
  const user = donor.user || {};
  const bloodType = user.bloodType || "—";

  return (
    <div
      className={styles.facilityCard}
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      <div className={styles.cardTop}>
        <div className={styles.facilityIcon} style={{ background: "#3b82f618" }}>
          <Icon name="droplet" size={18} color="#3b82f6" />
        </div>
        <div className={styles.facilityInfo}>
          <div className={styles.facilityName} style={{ color: t.text }}>
            {user.firstname} {user.surname}
          </div>
          <div style={{ color: t.textMuted, fontSize: 12 }}>
            Blood type: <strong style={{ color: t.text }}>{bloodType}</strong>
            {user.phone && (
              <span style={{ marginLeft: 8 }}>
                <Icon name="phone" size={10} color={t.textMuted} /> {user.phone}
              </span>
            )}
          </div>
        </div>
        <button
          className={styles.chatBtn}
          style={{ background: "#3b82f6", color: "#fff" }}
          onClick={() => onChat(user._id)}
          disabled={chatting === user._id}
        >
          {chatting === user._id ? <span className={styles.miniSpinner} /> : <Icon name="messages" size={14} color="#fff" />}
          {chatting === user._id ? "Opening…" : "Chat"}
        </button>
      </div>

      <div className={styles.donorMeta}>
        <span className={styles.availableBadge}>
          ✓ Available
        </span>
        {donor.donationCount > 0 && (
          <span style={{ color: t.textMuted, fontSize: 12 }}>
            {donor.donationCount} donation{donor.donationCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NearbyFacilities() {
  const { t } = useTheme();
  const navigate = useNavigate();
  const { lng, lat, geoError } = useGeolocation();
  const [tab, setTab] = useState("facilities");
  const [radius, setRadius] = useState(20);
  const [facilities, setFacilities] = useState([]);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatting, setChatting] = useState(null);
  const [chatSuccess, setChatSuccess] = useState(null);

  const fetchData = useCallback(async () => {
    if (!lng || !lat) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "facilities") {
        const data = await bloodBankAPI.getNearbyWithStock(lng, lat, radius);
        setFacilities(data || []);
      } else {
        const data = await donorAPI.getNearbyDonors(lng, lat, radius);
        setDonors(data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lng, lat, tab, radius]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChat = async (userId) => {
    setChatting(userId);
    setChatSuccess(null);
    try {
      // Start or resume a direct thread with this user
      await chatAPI.startDirectThread(userId);
      // Navigate to Messages so the user can continue the conversation
      navigate("/messages");
    } catch (err) {
      alert(err.message);
    } finally {
      setChatting(null);
    }
  };

  const items = tab === "facilities" ? facilities : donors;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle} style={{ color: t.text }}>Nearby Facilities & Donors</h2>
          <p className={styles.pageSub} style={{ color: t.textMuted }}>
            Browse inventory before reaching out — saves time for everyone
          </p>
        </div>
        <div className={styles.headerRight}>
          <select
            className={styles.radiusSelect}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
          >
            {[5, 10, 20, 50].map((r) => (
              <option key={r} value={r}>{r} km</option>
            ))}
          </select>
          <button
            className={styles.refreshBtn}
            style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
            onClick={fetchData}
          >
            <Icon name="refresh" size={15} color={t.text} />
          </button>
        </div>
      </div>

      {geoError && (
        <ErrorBanner message={`Location: ${geoError}. Enable location access to see nearby facilities.`} />
      )}
      {!lng && !geoError && (
        <div className={styles.locating} style={{ color: t.textMuted }}>
          📍 Detecting your location…
        </div>
      )}
      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {chatSuccess && (
        <div className={styles.successBanner} style={{ background: "#22c55e18", color: "#22c55e", border: "1px solid #22c55e30" }}>
          ✓ {chatSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          { key: "facilities", label: "🏥 Medical Facilities", count: facilities.length },
          { key: "donors", label: "🩸 Donors", count: donors.length },
        ].map(({ key, label, count }) => (
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
            {count > 0 && (
              <span className={styles.tabCount} style={{
                background: tab === key ? "rgba(255,255,255,0.25)" : t.bgDark,
                color: tab === key ? "#fff" : t.text,
              }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Legend for stock colours */}
      {tab === "facilities" && (
        <div className={styles.legend} style={{ color: t.textMuted }}>
          <span>Stock levels:</span>
          <span className={styles.legendDot} style={{ background: "#22c55e" }} /> Adequate (20+u)
          <span className={styles.legendDot} style={{ background: "#f59e0b" }} /> Low (5–19u)
          <span className={styles.legendDot} style={{ background: "#E8192C" }} /> Critical (&lt;5u)
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Spinner label={`Finding nearby ${tab}…`} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={tab === "facilities" ? "inventory" : "droplet"}
          title={`No ${tab} found within ${radius}km`}
          message={`Try increasing the radius or check back later.`}
        />
      ) : (
        <div className={styles.grid}>
          {tab === "facilities"
            ? facilities.map((f) => (
                <FacilityCard key={f._id} facility={f} onChat={handleChat} chatting={chatting} t={t} />
              ))
            : donors.map((d) => (
                <DonorCard key={d._id} donor={d} onChat={handleChat} chatting={chatting} t={t} />
              ))
          }
        </div>
      )}
    </div>
  );
}
