import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useMatches, useChat } from "../../hooks/useApi";
import { userAPI } from "../../services/api";
import { Icon, Spinner, EmptyState } from "../common/Common";
import styles from "./Messages.module.css";

// ─── Location message protocol ────────────────────────────────────────────────
const LOCATION_PREFIX = "__LOC__:";
const isLocMsg  = (text) => text?.startsWith(LOCATION_PREFIX);
const parseLoc  = (text) => {
  try { return JSON.parse(text.replace(LOCATION_PREFIX, "")); }
  catch { return null; }
};

// ─── Deduplicate match list by participant pair ───────────────────────────────
// Keeps the newest active match per unique sorted participant-ID pair.
// This mirrors the deduplication now done on the backend, giving two layers
// of defence against the "duplicate chat" bug.
function deduplicateMatches(matches) {
  const seen = new Set();
  const out  = [];
  for (const m of matches) {
    if (m.status !== "active" && m.status !== "completed") continue;
    const key = (m.participants || [])
      .map((p) => (p._id || p).toString())
      .sort()
      .join("|");
    if (!seen.has(key)) { seen.add(key); out.push(m); }
  }
  return out;
}

// ─── Resolve other participant synchronously (if populated) ──────────────────
function resolveOther(match, currentUserId) {
  if (!match?.participants) return { name: null, role: "—", id: null };
  const other = match.participants.find((p) => {
    const id = p._id || p;
    return id && id.toString() !== currentUserId;
  });
  if (!other) return { name: null, role: "—", id: null };
  const name = other.firstname
    ? `${other.firstname} ${other.surname || ""}`.trim()
    : other.name || null;
  return { name, role: other.role || "—", id: other._id || (typeof other === "string" ? other : null) };
}

// ─── Hook: resolve other-user name (lazy fetch if not populated) ──────────────
function useOtherUser(match, currentUserId) {
  const [resolved, setResolved] = useState({ name: null, role: "—" });

  useEffect(() => {
    if (!match) return;
    const { name, role, id } = resolveOther(match, currentUserId);
    if (name) { setResolved({ name, role }); return; }
    if (!id) return;
    userAPI.getUserProfile(id)
      .then((data) => {
        const u = data?.user || data;
        if (u?.firstname) {
          setResolved({
            name: `${u.firstname} ${u.surname || ""}`.trim(),
            role: u.role || "—",
          });
        }
      })
      .catch(() => {});
  }, [match?._id, currentUserId]);

  return resolved;
}

// ─── Location Bubble ──────────────────────────────────────────────────────────
function LocationBubble({ text, isMine, t }) {
  const loc = parseLoc(text);
  if (!loc) return null;
  const { lat, lng, label } = loc;
  const osmThumb = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=260x120&markers=${lat},${lng},red-pushpin`;
  const gmaps    = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <a href={gmaps} target="_blank" rel="noopener noreferrer"
      style={{
        display: "block", borderRadius: 14, overflow: "hidden",
        width: 240, textDecoration: "none",
        border: "1px solid " + (isMine ? "rgba(255,255,255,0.3)" : t.border),
      }}
    >
      <img src={osmThumb} alt="Location" onError={(e) => { e.target.style.display = "none"; }}
        style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
        background: isMine ? "rgba(0,0,0,0.25)" : t.surface,
        color: isMine ? "rgba(255,255,255,0.9)" : t.textMuted, fontSize: 11,
      }}>
        📍 {label || "Shared Location"} · Click to open in Maps
      </div>
    </a>
  );
}

// ─── Chat list sidebar item ───────────────────────────────────────────────────
function ChatListItem({ match, isActive, currentUserId, t, onClick }) {
  const { name, role } = useOtherUser(match, currentUserId);
  const display    = name || "…";
  const initials   = display !== "…"
    ? display.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const unread     = match.unreadCount || 0;
  const dateStr    = new Date(match.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

  return (
    <button
      className={`${styles.chatListItem} ${isActive ? styles.chatListItemActive : ""}`}
      style={{
        background: isActive ? t.primary + "12" : "transparent",
        borderLeft: "3px solid " + (isActive ? t.primary : "transparent"),
        borderBottom: "1px solid " + t.border,
      }}
      onClick={onClick}
    >
      <div className={styles.chatItemAvatar} style={{ background: t.gradientRed }}>
        {initials}
      </div>
      <div className={styles.chatItemInfo}>
        <div className={styles.chatItemTitle} style={{ color: t.text }}>{display}</div>
        <div className={styles.chatItemSub} style={{ color: t.textMuted }}>
          {role !== "—" ? role.charAt(0).toUpperCase() + role.slice(1) + " · " : ""}
          {dateStr}
        </div>
      </div>
      {unread > 0 && (
        <div style={{
          minWidth: 20, height: 20, borderRadius: 10, background: t.primary,
          color: "#fff", fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px",
        }}>
          {unread}
        </div>
      )}
    </button>
  );
}

// ─── Chat window ──────────────────────────────────────────────────────────────
function ChatWindow({ match, t, currentUserId }) {
  const { messages, loading, sendMessage } = useChat(match?._id);
  const { name: otherName, role: otherRole } = useOtherUser(match, currentUserId);

  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [sendingLoc,  setSendingLoc]  = useState(false);
  const [ttsEnabled,  setTtsEnabled]  = useState(false);
  const [sttActive,   setSttActive]   = useState(false);

  const bottomRef      = useRef(null);
  const recognitionRef = useRef(null);
  const lastReadRef    = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // TTS: speak last incoming message when TTS is enabled
  useEffect(() => {
    if (!ttsEnabled || !messages.length || !window.speechSynthesis) return;
    const last = messages[messages.length - 1];
    if (!last || isLocMsg(last.message)) return;
    const senderId = last.sender?._id || last.sender;
    if (senderId?.toString() === currentUserId) return;       // don't speak own msgs
    if (last._id === lastReadRef.current) return;             // already spoken
    lastReadRef.current = last._id;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(last.message));
  }, [messages, ttsEnabled, currentUserId]);

  // ── STT via Web Speech API (Chrome/Edge) ─────────────────────────────────
  const startSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is only supported in Chrome or Edge."); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript || "";
      if (t) setInput((prev) => prev ? prev + " " + t : t);
    };
    rec.onend   = () => setSttActive(false);
    rec.onerror = () => setSttActive(false);
    recognitionRef.current = rec;
    rec.start();
    setSttActive(true);
  }, []);

  const stopSTT = useCallback(() => {
    recognitionRef.current?.stop();
    setSttActive(false);
  }, []);

  // ── Share location ────────────────────────────────────────────────────────
  const shareLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation is not supported in this browser."); return; }
    setSendingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const payload = JSON.stringify({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "My Location",
        });
        try { await sendMessage(LOCATION_PREFIX + payload); }
        catch (e) { alert(e.message); }
        finally { setSendingLoc(false); }
      },
      () => { alert("Could not get your location. Check browser permissions."); setSendingLoc(false); }
    );
  };

  // ── Send text ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !match?._id) return;
    setSending(true);
    setInput("");
    try {
      await sendMessage(trimmed);
      if (ttsEnabled && !isLocMsg(trimmed) && window.speechSynthesis) {
        window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(trimmed));
      }
    } catch (e) { alert(e.message); }
    finally { setSending(false); }
  };

  const req      = match?.request || {};
  const initials = otherName && otherName !== "…"
    ? otherName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className={styles.chatWindow}>
      {/* ── Header ── */}
      <div className={styles.chatHeader}
        style={{ borderBottom: "1px solid " + t.border, background: t.surface }}>
        <div className={styles.chatAvatar} style={{ background: t.gradientRed }}>
          {initials}
        </div>
        <div className={styles.chatHeaderInfo}>
          <div className={styles.chatHeaderTitle} style={{ color: t.text }}>
            {otherName || "Loading…"}
          </div>
          <div className={styles.chatHeaderSub} style={{ color: t.textMuted }}>
            <span className={styles.onlineDot} />
            {otherRole !== "—" ? otherRole.charAt(0).toUpperCase() + otherRole.slice(1) : "Participant"}
            {req.requiredBloodType ? " · " + req.requiredBloodType : ""}
            {req.unitsNeeded ? " · " + req.unitsNeeded + " units" : ""}
          </div>
        </div>

        {/* Hold-to-talk STT button */}
        <button
          title="Hold to dictate (Chrome/Edge)"
          onMouseDown={startSTT} onMouseUp={stopSTT}
          onTouchStart={startSTT} onTouchEnd={stopSTT}
          style={{
            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 18,
            padding: "6px 10px", transition: "background 0.15s",
            background: sttActive ? t.primary + "22" : t.bgDark,
            color:      sttActive ? t.primary : t.textMuted,
          }}
        >
          {sttActive ? "🎙️" : "🎤"}
        </button>

        {/* TTS toggle */}
        <button
          title={ttsEnabled ? "Disable read-aloud" : "Enable read-aloud"}
          onClick={() => { setTtsEnabled((v) => !v); window.speechSynthesis?.cancel(); }}
          style={{
            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 18,
            padding: "6px 10px", transition: "background 0.15s",
            background: ttsEnabled ? t.primary + "22" : t.bgDark,
            color:      ttsEnabled ? t.primary : t.textMuted,
          }}
        >
          {ttsEnabled ? "🔊" : "🔇"}
        </button>

        <div className={styles.chatHeaderBadge} style={{
          background: req.isEmergency ? t.primary + "18" : t.blue + "14",
          color:  req.isEmergency ? t.primary : t.blue,
          border: "1px solid " + (req.isEmergency ? t.primary + "30" : t.blue + "30"),
        }}>
          {req.isEmergency ? "⚡ Emergency" : "Standard"}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className={styles.messages}>
        {loading ? (
          <Spinner label="Loading messages…" />
        ) : messages.length === 0 ? (
          <EmptyState icon="messages" title="No messages yet" message="Be the first to say something!" />
        ) : (
          messages.map((msg, i) => {
            const senderId = msg.sender?._id || msg.sender;
            const isMine   = senderId && senderId.toString() === currentUserId;
            const sName    = !isMine && msg.sender?.firstname
              ? `${msg.sender.firstname} ${msg.sender.surname || ""}`.trim()
              : null;

            return (
              <div key={msg._id || i}
                className={`${styles.bubble} ${isMine ? styles.bubbleMe : styles.bubbleThem}`}>
                {sName && (
                  <div className={styles.senderName} style={{ color: t.textMuted }}>{sName}</div>
                )}
                {isLocMsg(msg.message) ? (
                  <LocationBubble text={msg.message} isMine={isMine} t={t} />
                ) : (
                  <div className={styles.bubbleInner} style={{
                    background: isMine ? t.gradientRed : t.bgDark,
                    color:      isMine ? "#fff"        : t.text,
                    borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  }}>
                    <div className={styles.bubbleText}>{msg.message}</div>
                    <div className={styles.bubbleTime} style={{ opacity: 0.6 }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* STT status bar */}
      {sttActive && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, padding: "4px 0", background: t.bgDark,
          fontSize: 12, color: t.textMuted,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%",
            background: t.primary, display: "inline-block" }} />
          Listening… release button to transcribe
        </div>
      )}

      {/* ── Input row ── */}
      <div className={styles.inputRow}
        style={{ borderTop: "1px solid " + t.border, background: t.surface }}>
        {/* Location share */}
        <button
          title="Share my location"
          onClick={shareLocation}
          disabled={sendingLoc}
          style={{
            border: "1px solid " + t.border, borderRadius: 10, cursor: "pointer",
            background: t.bgDark, color: t.primary, padding: "8px 10px",
            fontSize: 18, opacity: sendingLoc ? 0.5 : 1,
          }}
        >
          📍
        </button>

        <input
          className={styles.messageInput}
          style={{ background: t.bgDark, border: "1px solid " + t.border, color: t.text }}
          placeholder={sttActive ? "Listening…" : "Type a message…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={sending}
        />

        <button
          className={styles.sendBtn}
          style={{ background: t.gradientRed, boxShadow: "0 4px 12px " + t.shadowRed }}
          onClick={handleSend}
          disabled={sending || !input.trim()}
        >
          <Icon name="send" size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Messages page ───────────────────────────────────────────────────────
export default function Messages() {
  const { t }          = useTheme();
  const { user }       = useAuth();
  const location       = useLocation();
  const { matches, loading, refetch } = useMatches();

  const currentUserId  = user?._id || user?.id || "";

  // Deduplicate by participant pair (client-side second layer of defence)
  const chatMatches    = deduplicateMatches(matches);
  const totalUnread    = chatMatches.reduce((s, m) => s + (m.unreadCount || 0), 0);

  // activeId — driven by navigation state (clicking Chat from Matches page)
  // or defaults to first match.
  const [activeId, setActiveId] = useState(null);

  // React to navigation state changes (e.g., clicking "Chat" from Matches page
  // multiple times — each time we must pick up the new matchId)
  useEffect(() => {
    if (location.state?.matchId) {
      setActiveId(location.state.matchId);
    }
  }, [location.state?.matchId, location.key]); // location.key changes on every navigate()

  // Default to first match once data loads (only if nothing was set by nav state)
  useEffect(() => {
    if (!activeId && chatMatches.length > 0) {
      setActiveId(chatMatches[0]._id);
    }
  }, [chatMatches.length]); // eslint-disable-line

  const activeMatch = chatMatches.find((m) => m._id === activeId) || null;

  if (loading) return <Spinner label="Loading chats…" />;
  if (chatMatches.length === 0)
    return (
      <EmptyState
        icon="messages"
        title="No active chats"
        message="Match with a donor or blood bank to start chatting."
      />
    );

  return (
    <div className={styles.page}>
      <div className={styles.layout} style={{ border: "1px solid " + t.border }}>
        {/* Sidebar */}
        <div className={styles.chatList}
          style={{ background: t.surface, borderRight: "1px solid " + t.border }}>
          <div className={styles.chatListHeader}
            style={{ borderBottom: "1px solid " + t.border }}>
            <span style={{ color: t.text, fontWeight: 700, fontSize: 15 }}>Chats</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {totalUnread > 0 && (
                <span style={{
                  background: t.primary, color: "#fff",
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                }}>
                  {totalUnread}
                </span>
              )}
              <span className={styles.chatCount}
                style={{ background: t.primary + "18", color: t.primary }}>
                {chatMatches.length}
              </span>
            </div>
          </div>

          {chatMatches.map((m) => (
            <ChatListItem
              key={m._id}
              match={m}
              isActive={m._id === activeId}
              currentUserId={currentUserId}
              t={t}
              onClick={() => setActiveId(m._id)}
            />
          ))}
        </div>

        {/* Chat panel */}
        {activeMatch ? (
          <ChatWindow key={activeMatch._id} match={activeMatch} t={t} currentUserId={currentUserId} />
        ) : (
          <div className={styles.noChat} style={{ background: t.surface, color: t.textMuted }}>
            Select a conversation to open
          </div>
        )}
      </div>
    </div>
  );
}
