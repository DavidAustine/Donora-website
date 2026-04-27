import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Icon } from "../common/Common";
import styles from "./AppLayout.module.css";
import { useProfile } from "../../hooks/useApi";
import { matchAPI } from "../../services/api";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { path: "/request",   label: "Requests",  icon: "requests"  },
  { path: "/matches",   label: "Matches",   icon: "matches"   },
  { path: "/messages",  label: "Messages",  icon: "messages"  },
  { path: "/inventory", label: "Inventory", icon: "inventory" },
  { path: "/profile",   label: "Profile",   icon: "profile"   },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle, t } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { profile} = useProfile();
  const [unreadCount, setUnreadCount] = useState(0);

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
            Blood Bank Dashboard
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
      <nav className={styles.bottomNav} style={{ background: t.surface, borderTop: `1px solid ${t.border}` }}>
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
      </nav>
    </div>
  );
}
