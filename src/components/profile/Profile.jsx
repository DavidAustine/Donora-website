import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useProfile } from "../../hooks/useApi";
import { authAPI, clearTokens } from "../../services/api";
import { Icon, Spinner, ErrorBanner } from "../common/Common";
import styles from "./Profile.module.css";

export default function Profile() {
  const { t } = useTheme();
  const { user, logout } = useAuth();
  const { profile, loading, error, updateProfile } = useProfile();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [savedOk, setSavedOk] = useState(false);
  const [form, setForm] = useState({ firstname: "", phone: "", email: "" });

  // Delete account state
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  useEffect(() => {
    if (profile) {
      setForm({
        firstname: profile.name || "",
        phone: profile.phone || "",
        email: user?.email || "",
      });
    }
  }, [profile, user]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveErr(""); setSavedOk(false);
    setSaving(true);
    try {
      await updateProfile({ phone: form.phone });
      setSavedOk(true);
      setEditing(false);
      setTimeout(() => setSavedOk(false), 3000);
    } catch (err) {
      setSaveErr(err.message);
    } finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteErr("");
    try {
      await authAPI.deleteAccount();
      clearTokens();
      window.location.href = "/login";
    } catch (err) {
      setDeleteErr(err.message);
      setDeleting(false);
    }
  };

  const initials = (profile?.name || profile?.user?.firstname || "BB")
    .slice(0, 2).toUpperCase();

  const displayName =
    profile?.name || profile?.user?.firstname || user?.firstname || "Blood Bank";

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle} style={{ color: t.text }}>Profile</h2>

      {error && <ErrorBanner message={error} />}

      <div className={styles.layout}>
        {/* Profile card */}
        <div className={styles.profileCard}
          style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className={styles.cardTop} style={{ background: t.gradientRedStrip }}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.avatarName}>{displayName}</div>
            <div className={styles.avatarRole}>Medical Facility</div>
            <div className={styles.verifiedBadge}>
              <span className={styles.verifiedDot} />
              Verified Facility
            </div>
          </div>

          <div className={styles.cardDetails}>
            {[
              { label: "Email", value: user?.email || "—" },
              { label: "Phone", value: profile?.phone || "Not set" },
              { label: "Role", value: user?.role || "Medical Facility" },
              { label: "Member since", value: "—" },
            ].map(f => (
              <div key={f.label} className={styles.detailRow}
                style={{ borderBottom: `1px solid ${t.border}` }}>
                <div className={styles.detailLabel} style={{ color: t.textMuted }}>{f.label}</div>
                <div className={styles.detailValue} style={{ color: t.text }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit form */}
        <div className={styles.formCard}
          style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className={styles.formHeader}
            style={{ borderBottom: `1px solid ${t.border}` }}>
            <span className={styles.formTitle} style={{ color: t.text }}>
              Medical Facility Information
            </span>
            <button
              className={`${styles.editToggle} ${editing ? styles.editToggleCancel : ""}`}
              style={editing
                ? { background: t.bgDark, border: `1px solid ${t.border}`, color: t.textMuted }
                : { background: t.gradientRed, border: "none", color: "#fff" }}
              onClick={() => { setEditing(e => !e); setSaveErr(""); }}>
              {editing ? "Cancel" : <><Icon name="edit" size={13} color="#fff" /> Edit Profile</>}
            </button>
          </div>

          {loading ? <Spinner label="Loading profile…" /> : (
            <form className={styles.formBody} onSubmit={handleSave}>
              {savedOk && (
                <div className={styles.successBanner}
                  style={{ background: t.successBg, color: t.success }}>
                  ✓ Profile updated successfully
                </div>
              )}

              <div className={styles.grid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} style={{ color: t.textMuted }}>
                    Facility Name
                  </label>
                  <input className={styles.input}
                    style={{ background: t.bgDark === "#000000" ? "#111" : "#F8F8F8", border: `1px solid ${t.border}`, color: t.text }}
                    value={form.firstname} disabled readOnly />
                  <span className={styles.fieldHint} style={{ color: t.textMuted }}>
                    Name set at registration
                  </span>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} style={{ color: t.textMuted }}>
                    Email Address
                  </label>
                  <input className={styles.input}
                    style={{ background: t.bgDark === "#000000" ? "#111" : "#F8F8F8", border: `1px solid ${t.border}`, color: t.text }}
                    value={form.email} disabled readOnly />
                  <span className={styles.fieldHint} style={{ color: t.textMuted }}>
                    Contact support to change email
                  </span>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} style={{ color: t.textMuted }}>
                    Phone Number
                  </label>
                  <div className={styles.inputWrap}>
                    <span className={styles.inputIcon}>
                      <Icon name="phone" size={15} color={t.textMuted} />
                    </span>
                    <input name="phone" type="tel" className={styles.input}
                      style={{
                        background: editing ? t.bgDark : (t.bgDark === "#000000" ? "#111" : "#F8F8F8"),
                        border: `1px solid ${editing ? t.primary + "60" : t.border}`,
                        color: t.text, paddingLeft: 36,
                      }}
                      value={form.phone} onChange={handleChange}
                      disabled={!editing} placeholder="+234 800 000 0000" />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} style={{ color: t.textMuted }}>
                    Account Role
                  </label>
                  <div className={styles.roleDisplay}
                    style={{ background: `${t.primary}12`, border: `1px solid ${t.primary}20`, color: t.primary }}>
                    🏥 Medical Facility
                  </div>
                </div>
              </div>

              {saveErr && <div className={styles.formErr}>{saveErr}</div>}

              {editing && (
                <div className={styles.formFooter}>
                  <button type="submit" className={styles.saveBtn}
                    style={{ background: t.gradientRed }} disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className={styles.dangerZone}
        style={{ background: t.surface, border: `1px solid ${t.borderRed}` }}>
        <div className={styles.dangerTitle} style={{ color: t.danger }}>Danger Zone</div>

        {/* Sign out row */}
        <div className={styles.dangerRow} style={{marginBottom: 12 }}>
          <div>
            <div style={{ color: t.text, fontWeight: 600, fontSize: 14 }}>Sign out</div>
            <div style={{ color: t.textMuted, fontSize: 12 }}>End your current session</div>
          </div>
          <button className={styles.signOutBtn}
            style={{ background: t.bgDark, border: `1px solid ${t.border}`, color: t.textMuted }}
            onClick={logout}>
            <Icon name="logout" size={15} color={t.textMuted} /> Sign Out
          </button>
        </div>
          <hr style={{ borderBottom: `1px solid ${t.borderRed}`}}/>
        {/* Delete account row */}
        <div className={styles.dangerRow} style={{marginTop: 12}}>
          <div>
            <div style={{ color: t.danger, fontWeight: 600, fontSize: 14 }}>Delete Account</div>
            <div style={{ color: t.textMuted, fontSize: 12 }}>
              Permanently remove your account and all data
            </div>
          </div>
          <button
            className={styles.signOutBtn}
            style={{ background: "#E8192C15", border: `1px solid ${t.borderRed}`, color: t.danger }}
            onClick={() => { setShowDeleteToast(true); setDeleteErr(""); }}>
            🗑 Delete
          </button>
        </div>
      </div>

      {/* Delete confirmation toast */}
      {showDeleteToast && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => !deleting && setShowDeleteToast(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 999,
              backdropFilter: "blur(2px)",
            }}
          />

          {/* Toast card */}
          <div style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: t.surface,
            border: `1px solid ${t.borderRed}`,
            borderRadius: 16,
            padding: "24px 28px",
            width: "min(420px, 90vw)",
            boxShadow: `0 8px 40px rgba(0,0,0,0.3)`,
          }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>⚠️</div>
            <div style={{ color: t.text, fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 6 }}>
              Are you sure?
            </div>
            <div style={{ color: t.textMuted, fontSize: 13, textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
              This will permanently delete your account, blood bank profile, and all associated data.
              This action <strong style={{ color: t.danger }}>cannot be undone</strong>.
            </div>

            {deleteErr && (
              <div style={{
                background: "#E8192C15", border: `1px solid ${t.borderRed}`,
                color: t.danger, borderRadius: 8, padding: "8px 12px",
                fontSize: 13, marginBottom: 16, textAlign: "center",
              }}>
                {deleteErr}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowDeleteToast(false)}
                disabled={deleting}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10,
                  background: t.bgDark, border: `1px solid ${t.border}`,
                  color: t.textMuted, fontWeight: 600, fontSize: 14,
                  cursor: "pointer",
                }}>
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10,
                  background: "#E8192C", border: "none",
                  color: "#fff", fontWeight: 600, fontSize: 14,
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}>
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}