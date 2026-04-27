import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useStock } from "../../hooks/useApi";
import { useMatches } from "../../hooks/useApi";
import { useNearbyRequests, useGeolocation } from "../../hooks/useApi";
import { BloodBadge, Icon, Spinner, ErrorBanner } from "../common/Common";
import styles from "./Dashboard.module.css";
import { useProfile } from "../../hooks/useApi";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTheme();
  const navigate = useNavigate();
  const { lng, lat } = useGeolocation();
  const { profile } = useProfile();

  const { stock, loading: stockLoading, error: stockError, refetch: refetchStock } = useStock();
  const { matches, loading: matchLoading, refetch: refetchMatches } = useMatches();
  const { requests, loading: reqLoading, refetch: refetchRequests } = useNearbyRequests(lng, lat);

  // Dashboard polling every 30s for real-time overview
  useEffect(() => {
    const iv = setInterval(() => {
      refetchStock(true);
      refetchMatches(true);
      if (lng && lat) refetchRequests(true);
    }, 30000);
    return () => clearInterval(iv);
  }, [lng, lat, refetchStock, refetchMatches, refetchRequests]);

  const loading = stockLoading || matchLoading || reqLoading;

  const totalUnits = stock.reduce((s, i) => s + (i.units || 0), 0);
  const pendingRequests = requests.filter(r => r.status === "pending").length;
  const activeMatches = matches.filter(m => m.status === "active").length;
  const completedToday = matches.filter(m => m.status === "completed").length;

  const emergencies = requests.filter(r => r.isEmergency && r.status === "pending");
  const criticalStock = stock.filter(s => s.status === "critical");

  const stats = [
    { label: "Total Blood Units",  value: totalUnits,      gradient: t.gradientPrimary, accent: t.primary, icon: "droplet" },
    { label: "Pending Requests",   value: pendingRequests, gradient: t.gradientBlue,    accent: t.blue,    icon: "requests" },
    { label: "Active Matches",     value: activeMatches,   gradient: t.gradientGreen,   accent: t.green,   icon: "matches" },
    { label: "Completed",    value: completedToday,  gradient: t.gradientCard,    accent: t.textMuted,icon: "check" },
  ];

  const bankName =
  profile?.name ||
  profile?.bloodBank?.name ||
  user?.firstname ||
  user?.email?.split("@")[0] ||
  "Blood Bank";

  return (
    <div className={styles.page}>
      <div className={styles.welcome} style={{ color: t.text }}>
        <h1>Welcome back, <span style={{ color: t.primary }}>{bankName}</span></h1>
        <p style={{ color: t.textMuted }}>Here's your real-time overview</p>
      </div>

      {emergencies.length > 0 && (
        <div className={styles.emergencyBanner} style={{ background: t.gradientRedStrip }}>
          <div>
            <div className={styles.emergencyTitle}>⚡ {emergencies.length} Emergency Request{emergencies.length > 1 ? "s" : ""} Active</div>
            <div className={styles.emergencyDesc}>
              {emergencies.slice(0, 2).map(r => `${r.requiredBloodType} needed`).join(" · ")}
            </div>
          </div>
          <button className={styles.emergencyBtn} onClick={() => navigate("/request")}>
            View Now
          </button>
        </div>
      )}

      {criticalStock.length > 0 && (
        <div className={styles.alertBanner} style={{ background: t.redMuted2, border: `1px solid ${t.borderRed}`, color: t.danger }}>
          ⚠️ {criticalStock.length} blood type{criticalStock.length > 1 ? "s" : ""} critically low —{" "}
          <button className={styles.alertLink} onClick={() => navigate("/inventory")} style={{ color: t.danger }}>
            update inventory
          </button>
        </div>
      )}

      {stockError && <ErrorBanner message={stockError} />}

      {/* Stat cards */}
      <div className={styles.statGrid}>
        {stats.map((s, i) => (
          <div key={i} className={styles.statCard}
            style={{ background: s.gradient, border: `1px solid ${t.border}` }}>
            <div className={styles.statBody}>
              <div>
                <div className={styles.statLabel} style={{ color: t.textMuted }}>{s.label}</div>
                <div className={styles.statValue} style={{ color: t.text }}>
                  {loading ? "—" : s.value}
                </div>
              </div>
              <div className={styles.statIconWrap} style={{ background: `${s.accent}18` }}>
                <Icon name={s.icon} size={20} color={s.accent} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lower grid */}
      <div className={styles.lowerGrid}>
        {/* Blood stock preview */}
        <div className={styles.card} style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className={styles.cardHeader} style={{ borderBottom: `1px solid ${t.border}` }}>
            <span className={styles.cardTitle} style={{ color: t.text }}>Blood Stock</span>
            <button className={styles.cardAction} style={{ color: t.primary }}
              onClick={() => navigate("/inventory")}>
              Manage <Icon name="arrowRight" size={14} color={t.primary} />
            </button>
          </div>
          {stockLoading ? <Spinner label="Loading stock…" /> : (
            <div className={styles.stockList}>
              {stock.length === 0 ? (
                <div className={styles.emptyNote} style={{ color: t.textMuted }}>
                  No stock recorded yet. Add your inventory.
                </div>
              ) : stock.map(item => (
                <div key={item.bloodType || item.type} className={styles.stockRow}
                  style={{ borderBottom: `1px solid ${t.border}08` }}>
                  <BloodBadge type={item.bloodType || item.type} />
                  <div className={styles.stockBarWrap}>
                    <div className={styles.stockBarBg} style={{ background: t.bgDark }}>
                      <div className={styles.stockBarFill} style={{
                        width: `${Math.min(100, ((item.units || 0) / 70) * 100)}%`,
                        background: item.status === "critical" ? t.danger : item.status === "low" ? t.warning : t.success,
                      }} />
                    </div>
                  </div>
                  <span className={styles.stockUnits} style={{ color: t.text }}>
                    {item.units}<span style={{ color: t.textMuted, fontSize: 11 }}> u</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matches activity */}
        <div className={styles.card} style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className={styles.cardHeader} style={{ borderBottom: `1px solid ${t.border}` }}>
            <span className={styles.cardTitle} style={{ color: t.text }}>Recent Matches</span>
            <button className={styles.cardAction} style={{ color: t.primary }}
              onClick={() => navigate("/matches")}>
              All <Icon name="arrowRight" size={14} color={t.primary} />
            </button>
          </div>

          {matchLoading ? <Spinner label="Loading matches…" /> : (
            <div className={styles.matchList}>
              {matches.length === 0 ? (
                <div className={styles.emptyNote} style={{ color: t.textMuted }}>
                  No matches yet. Accept a nearby request to get started.
                </div>
              ) : matches.slice(0, 5).map(m => (
                <div key={m._id} className={styles.matchRow} style={{ borderBottom: `1px solid ${t.border}08` }}>
                  <div className={styles.matchDot} style={{
                    background: m.status === "active" ? t.success : m.status === "completed" ? t.blue : t.textMuted,
                    boxShadow: m.status === "active" ? `0 0 6px ${t.success}` : "none",
                  }} />
                  <div className={styles.matchInfo}>
                    <div style={{ color: t.text, fontSize: 13, fontWeight: 500 }}>
                      {m.request?.requiredBloodType || "—"} · {m.request?.unitsNeeded || "—"} units
                    </div>
                    <div style={{ color: t.textMuted, fontSize: 11 }}>
                      {m.status} · {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className={styles.quickActions} style={{ borderTop: `1px solid ${t.border}` }}>
            <div className={styles.qaLabel} style={{ color: t.textMuted }}>Quick Actions</div>
            {[
              { label: "View Requests",    path: "/request",   color: t.primary },
              { label: "Update Inventory", path: "/inventory", color: t.blue },
            ].map(a => (
              <button key={a.path} className={styles.qaBtn} onClick={() => navigate(a.path)}
                style={{ background: `${a.color}12`, border: `1px solid ${a.color}30`, color: a.color }}>
                {a.label} <Icon name="arrowRight" size={14} color={a.color} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
