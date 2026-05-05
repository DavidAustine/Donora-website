/**
 * src/components/layout/AppLayout.jsx
 *
 * Changes vs original:
 *  - Added socket.io-client connection (connects once on login, disconnects on logout).
 *  - Listens for "newEmergencyRequest" events emitted by the backend when a
 *    patient creates a request with isEmergency=true.
 *  - Shows a red toast notification at the top of the screen with the blood
 *    type and a "View Requests" link.
 *  - Toasts auto-dismiss after 8 seconds or can be closed manually.
 *  - Multiple toasts stack and each can be dismissed independently.
 *  - No new dependencies beyond socket.io-client (see package.json).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Icon } from "../common/Common";
import styles from "./AppLayout.module.css";
import { useProfile } from "../../hooks/useApi";
import { matchAPI, getToken } from "../../services/api";
import { io } from "socket.io-client";

const BASE_SOCKET_URL = "https://donorabackend.onrender.com"; // same host, no /api

const NAV_ITEMS = [
  { path: "/dashboard",   label: "Dashboard",   icon: "dashboard" },
  { path: "/request",     label: "Requests",    icon: "requests"  },
  { path: "/my-requests", label: "My Requests", icon: "check"     },
  { path: "/nearby",      label: "Nearby",      icon: "matches"   },
  { path: "/matches",     label: "Matches",     icon: "matches"   },
  { path: "/messages",    label: "Messages",    icon: "messages"  },
  { path: "/inventory",   label: "Inventory",   icon: "inventory" },
  { path: "/profile",     label: "Profile",     icon: "profile"   },
];

// ─── Emergency Toast ──────────────────────────────────────────────────────────
function EmergencyToast({ toasts, onDismiss, onView }) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed",
      top: 16,
      right: 16,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      maxWidth: 360,
      width: "calc(100vw - 32px)",
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: "linear-gradient(135deg, #E8192C 0%, #c0102a 100%)",
            color: "#fff",
            borderRadius: 14,
            padding: "14px 16px",
            boxShadow: "0 8px 32px rgba(232,25,44,0.45)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            animation: "slideInToast 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
        >
          {/* Icon */}
          <div style={{
            fontSize: 22,
            flexShrink: 0,
            lineHeight: 1,
            marginTop: 1,
          }}>
            🚨
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>
              Emergency Blood Request
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
              {toast.bloodType
                ? `Blood type ${toast.bloodType} needed urgently`
                : "Urgent blood request nearby"}
              {toast.distance ? ` · ${toast.distance}` : ""}
            </div>
            <button
              onClick={() => onView(toast)}
              style={{
                marginTop: 8,
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff",
                borderRadius: 8,
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              View Requests →
            </button>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(toast.id)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              width: 24,
              height: 24,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "inherit",
            }}
          >
            ×
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateX(60px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0)    scale(1);   }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle, t } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Emergency toasts ──────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);
  const toastTimerRefs = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (toastTimerRefs.current[id]) {
      clearTimeout(toastTimerRefs.current[id]);
      delete toastTimerRefs.current[id];
    }
  }, []);

  const addToast = useCallback((data) => {
    const id = Date.now() + Math.random();
    const toast = { id, ...data };
    setToasts((prev) => [toast, ...prev].slice(0, 5)); // max 5 stacked

    // Auto-dismiss after 8 s
    toastTimerRefs.current[id] = setTimeout(() => dismissToast(id), 8000);
  }, [dismissToast]);

  const handleViewToast = useCallback((toast) => {
    dismissToast(toast.id);
    navigate("/request");
  }, [dismissToast, navigate]);

  // ── Suppress own-submitted emergency toast ───────────────────────────────
  // When this blood bank submits an emergency request, suppress the socket
  // toast that bounces back to them for 8 seconds.
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    const handler = () => {
      suppressUntilRef.current = Date.now() + 8000;
    };
    window.addEventListener("donora:ownEmergencySubmitted", handler);
    return () => window.removeEventListener("donora:ownEmergencySubmitted", handler);
  }, []);

  // ── Socket connection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const token = getToken();
    if (!token) return;

    const socket = io(BASE_SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[AppLayout] socket connected");
    });

    // ── Emergency request event ───────────────────────────────────────────
    // Backend should emit this from requestController when isEmergency=true.
    // See note at the bottom of this file for the backend emit snippet.
    socket.on("emergencyRequest", (data) => {
      // Skip if this blood bank just submitted this emergency themselves
      if (Date.now() < suppressUntilRef.current) return;
      addToast({
        bloodType: data.requiredBloodType || data.bloodType || null,
        distance: data.distance || null,
        requestId: data._id || data.requestId || null,
      });
    });

    socket.on("disconnect", () => {
      console.log("[AppLayout] socket disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      // Clear all toast timers on unmount
      Object.values(toastTimerRefs.current).forEach(clearTimeout);
    };
  }, [user?.id, addToast]);

  // ── Unread message badge ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const matches = await matchAPI.getMyMatches();
        const count = (matches || []).reduce((sum, m) => sum + (m.unreadCount || 0), 0);
        setUnreadCount(count);
      } catch (_) {}
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 15000);
    return () => clearInterval(iv);
  }, []);

  const initials = (profile?.name || profile?.user?.firstname || "BB")
    .slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const sidebarStyle = {
    "--surface": t.surface,
    "--border": t.border,
    "--text": t.text,
    "--textMuted": t.textMuted,
    "--primary": t.primary,
    "--bgDark": t.bgDark,
    "--shadow": t.shadow,
  };

  return (
    <div className={styles.root} style={{ background: t.bgDark, color: t.text, ...sidebarStyle }}>
      {/* Emergency toasts */}
      <EmergencyToast
        toasts={toasts}
        onDismiss={dismissToast}
        onView={handleViewToast}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        {/* Logo */}
        <div className={styles.logo} style={{ background: t.gradientRedStrip }}>
          <Icon name="droplet" size={26} color="#fff" />
          <div>
            <div className={styles.logoName}>Donora</div>
            <div className={styles.logoSub}>OFFICE PORTAL</div>
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <Icon name={item.icon} size={17} />
                {item.path === "/messages" && unreadCount > 0 && (
                  <span style={{
                    position: "absolute", top: -5, right: -8,
                    background: "#E8192C", color: "#fff",
                    fontSize: 9, fontWeight: 800,
                    borderRadius: 999, padding: "1px 4px",
                    minWidth: 14, textAlign: "center",
                  }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <Icon name="logout" size={16} />
          Sign Out
        </button>

        {/* Status */}
        <div className={styles.sidebarFooter}>
          <span className={styles.onlineDot} />
          <span className={styles.onlineLabel}>System Online</span>
        </div>
      </aside>

      {/* Main area */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar} style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(s => !s)}>
            <Icon name="menu" color={t.text} />
          </button>

          <div className={styles.topbarTitle} style={{ color: t.text }}>
            Medical Facility Dashboard
          </div>

          <div className={styles.topbarActions}>
            {/* Theme toggle */}
            <button
              className={styles.themeBtn}
              style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.text }}
              onClick={toggle}
            >
              <Icon name={dark ? "sun" : "moon"} size={14} color={t.text} />
              {dark ? "Light" : "Dark"}
            </button>

            {/* Avatar */}
            <div className={styles.avatar} style={{ background: t.gradientRed }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      {/* <nav className={styles.bottomNav} style={{ background: t.surface, borderTop: `1px solid ${t.border}` }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ""}`
            }
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav> */}
    </div>
  );
}

/*
 * ─── BACKEND SNIPPET ─────────────────────────────────────────────────────────
 * In Backend/controller/requestController.js, inside createRequest(), after
 * saving the new request, add the following lines to emit the emergency event
 * to ALL connected blood bank sockets so they receive the toast:
 *
 *   if (newRequest.isEmergency) {
 *     const io = req.app.get("io");
 *     if (io) {
 *       // Broadcast to all connected clients (blood banks will receive it)
 *       io.emit("emergencyRequest", {
 *         _id: newRequest._id,
 *         requiredBloodType: newRequest.requiredBloodType,
 *         unitsNeeded: newRequest.unitsNeeded,
 *       });
 *     }
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
