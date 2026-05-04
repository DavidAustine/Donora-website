import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import { Icon } from "../common/Common";
import styles from "./Login.module.css";

const STEP = { MAIN: 0, FORGOT_EMAIL: 1, OTP: 2, RESET: 3 };

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin]     = useState(true);
  const [step, setStep]           = useState(STEP.MAIN);
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [message, setMessage]     = useState({ text: "", ok: false });
  const [geoLoading, setGeoLoading] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [otp, setOtp]           = useState("");
  const [newPwd, setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const msg = (text, ok = false) => setMessage({ text, ok });
  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // ─── Register ──────────────────────────────────────────────────────────────
  const handleRegister = (e) => {
    e.preventDefault();
    msg("");
    if (!form.name || !form.email || !form.phone || !form.password) {
      msg("All fields are required.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoLoading(false);
        setLoading(true);
        try {
          await register({
            email:    form.email,
            password: form.password,
            role:     "bloodbank",
            name:     form.name,
            phone:    form.phone,
            lat:      pos.coords.latitude,
            lng:      pos.coords.longitude,
          });
          navigate("/dashboard");
        } catch (err) {
          msg(err.message);
        } finally { setLoading(false); }
      },
      (err) => {
        setGeoLoading(false);
        msg("Location access is required to register. Please allow location and try again.");
      }
    );
  };

  // ─── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    msg("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      msg(err.message);
    } finally { setLoading(false); }
  };

  // ─── Forgot password ───────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();
    msg(""); setLoading(true);
    try {
      const data = await authAPI.forgotPassword(form.email);
      msg(data.message || "OTP sent to your email.", true);
      setStep(STEP.OTP);
    } catch (err) { msg(err.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    msg(""); setLoading(true);
    try {
      const data = await authAPI.verifyOTP(form.email, otp);
      msg(data.message || "OTP verified.", true);
      setStep(STEP.RESET);
    } catch (err) { msg(err.message); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { msg("Passwords do not match."); return; }
    msg(""); setLoading(true);
    try {
      const data = await authAPI.resetPassword(form.email, otp, newPwd);
      msg(data.message || "Password reset. Please log in.", true);
      setStep(STEP.MAIN);
      setIsLogin(true);
    } catch (err) { msg(err.message); }
    finally { setLoading(false); }
  };

  const switchMode = (toLogin) => {
    setIsLogin(toLogin);
    setStep(STEP.MAIN);
    setMessage({ text: "", ok: false });
    setForm({ name: "", email: "", phone: "", password: "" });
  };

  const headerTitle = step > 0 ? "Reset Password"
    : isLogin ? "Welcome Back" : "Create Account";
  const headerSub = step > 0
    ? "We'll get you back in"
    : isLogin
    ? "Sign in to your medical facility portal"
    : "Register your medical institution";

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.logoRow}>
            <div className={styles.logoIcon}>
              <Icon name="droplet" size={28} color="#fff" />
            </div>
            <div className={styles.logoText}>
              Donora
              <span>Blood Network</span>
            </div>
          </div>
          <div className={styles.headerTitle}>{headerTitle}</div>
          <div className={styles.headerSub}>{headerSub}</div>
        </div>

        {/* Body */}
        <div className={styles.cardBody}>

          {/* ─ MAIN: Login / Register ─ */}
          {step === STEP.MAIN && (
            <form className={styles.form}
              onSubmit={isLogin ? handleLogin : handleRegister}>

              {!isLogin && (
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>Medical Facility Name</label>
                    <div className={styles.inputWrap}>
                      <span className={styles.inputIcon}>🏥</span>
                      <input name="name" className={styles.input}
                        placeholder="e.g. Nizamiye Hospital"
                        value={form.name} onChange={handle} required />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Phone Number</label>
                    <div className={styles.inputWrap}>
                      <span className={styles.inputIcon}>📞</span>
                      <input name="phone" type="tel" className={styles.input}
                        placeholder="+234 800 000 0000"
                        value={form.phone} onChange={handle} />
                    </div>
                  </div>
                </>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>✉️</span>
                  <input name="email" type="email" className={styles.input}
                    placeholder="contact@bloodbank.org"
                    value={form.email} onChange={handle} required />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Password</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>🔒</span>
                  <input name="password" type={showPwd ? "text" : "password"}
                    className={styles.input}
                    placeholder="Minimum 8 characters"
                    value={form.password} onChange={handle} required />
                  <button type="button" className={styles.eyeBtn}
                    onClick={() => setShowPwd(s => !s)}>
                    <Icon name={showPwd ? "x" : "check"} size={14} />
                  </button>
                </div>
              </div>

              {isLogin && (
                <button type="button" className={styles.forgotLink}
                  onClick={() => { setStep(STEP.FORGOT_EMAIL); msg(""); }}>
                  Forgot Password?
                </button>
              )}

              {message.text && (
                <div className={`${styles.msg} ${message.ok ? styles.msgOk : styles.msgErr}`}>
                  {message.text}
                </div>
              )}

              {!isLogin && (
                <div className={styles.geoNote}>
                  📍 Your location will be used to appear in nearby searches
                </div>
              )}

              <button type="submit" className={styles.submitBtn}
                disabled={loading || geoLoading}>
                {geoLoading ? "Getting location…"
                  : loading ? "Please wait…"
                  : isLogin ? "Sign In →" : "Register Medical Facility →"}
              </button>
            </form>
          )}

          {/* ─ STEP 1: Email for OTP ─ */}
          {step === STEP.FORGOT_EMAIL && (
            <form className={styles.form} onSubmit={handleForgot}>
              <div className={styles.stepInfo}>Enter your registered email to receive a one-time PIN.</div>
              <div className={styles.field}>
                <label className={styles.label}>Email Address</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>✉️</span>
                  <input name="email" type="email" className={styles.input}
                    placeholder="your@email.com"
                    value={form.email} onChange={handle} required />
                </div>
              </div>
              {message.text && (
                <div className={`${styles.msg} ${message.ok ? styles.msgOk : styles.msgErr}`}>
                  {message.text}
                </div>
              )}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? "Sending…" : "Send OTP →"}
              </button>
              <button type="button" className={styles.backLink}
                onClick={() => { setStep(STEP.MAIN); msg(""); }}>
                ← Back to login
              </button>
            </form>
          )}

          {/* ─ STEP 2: Verify OTP ─ */}
          {step === STEP.OTP && (
            <form className={styles.form} onSubmit={handleVerify}>
              <div className={styles.stepInfo}>Check your email for a 6-digit OTP code.</div>
              <div className={styles.field}>
                <label className={styles.label}>OTP Code</label>
                <input className={`${styles.input} ${styles.otpInput}`}
                  placeholder="000000" maxLength={6}
                  value={otp} onChange={e => setOtp(e.target.value)} required />
              </div>
              {message.text && (
                <div className={`${styles.msg} ${message.ok ? styles.msgOk : styles.msgErr}`}>
                  {message.text}
                </div>
              )}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? "Verifying…" : "Verify OTP →"}
              </button>
            </form>
          )}

          {/* ─ STEP 3: New password ─ */}
          {step === STEP.RESET && (
            <form className={styles.form} onSubmit={handleReset}>
              <div className={styles.field}>
                <label className={styles.label}>New Password</label>
                <input type="password" className={styles.input}
                  placeholder="Minimum 8 characters"
                  value={newPwd} onChange={e => setNewPwd(e.target.value)} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirm Password</label>
                <input type="password" className={styles.input}
                  placeholder="Repeat new password"
                  value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required />
              </div>
              {message.text && (
                <div className={`${styles.msg} ${message.ok ? styles.msgOk : styles.msgErr}`}>
                  {message.text}
                </div>
              )}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? "Resetting…" : "Reset Password →"}
              </button>
            </form>
          )}

          {/* Toggle login/register */}
          {step === STEP.MAIN && (
            <div className={styles.footer}>
              <span className={styles.divider}>or</span>
              <div className={styles.switchRow}>
                {isLogin ? (
                  <>Not registered?{" "}
                    <button className={styles.switchLink} onClick={() => switchMode(false)}>
                      Create account
                    </button>
                  </>
                ) : (
                  <>Already registered?{" "}
                    <button className={styles.switchLink} onClick={() => switchMode(true)}>
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
