import { useState, useEffect, useRef } from "react";

const CATS = [
  { id: 1,  name: "Health & Fitness",  icon: "◎", color: "#E8A87C" },
  { id: 2,  name: "Intellectual Life", icon: "◈", color: "#7CB9E8" },
  { id: 3,  name: "Emotional Life",    icon: "◉", color: "#C9A7E8" },
  { id: 4,  name: "Character",         icon: "◆", color: "#E8D07C" },
  { id: 5,  name: "Spiritual Life",    icon: "✦", color: "#7CE8C3" },
  { id: 6,  name: "Love Relationship", icon: "◯", color: "#E87CA0" },
  { id: 7,  name: "Parenting",         icon: "◑", color: "#A0E87C" },
  { id: 8,  name: "Social Life",       icon: "◐", color: "#E8B87C" },
  { id: 9,  name: "Financial Life",    icon: "◇", color: "#7CE8A0" },
  { id: 10, name: "Career",            icon: "▲", color: "#E87C7C" },
  { id: 11, name: "Quality of Life",   icon: "◬", color: "#7CC3E8" },
  { id: 12, name: "Life Vision",       icon: "★", color: "#FFD700" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStr = () => new Date().toISOString().slice(0, 7);
const cat = (id) => CATS.find(c => c.id === id);

const store = {
  async get(key) {
    try {
      if (window.storage) {
        const r = await window.storage.get(key);
        return r ? JSON.parse(r.value) : null;
      }
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  async set(key, val) {
    try {
      const s = JSON.stringify(val);
      if (window.storage) await window.storage.set(key, s);
      else localStorage.setItem(key, s);
    } catch {}
  },
};

const callClaude = async (messages, system) => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: system || "You are a helpful life coach assistant.",
        messages: messages,
      }),
    });
    const data = await response.json();
    if (data.error) {
      console.error("API error:", data.error.message);
      return "I'm having trouble connecting right now. Please try again.";
    }
    return data.content?.[0]?.text || "No response received.";
  } catch (err) {
    console.error("Network error:", err);
    return "Connection error. Please check your internet and try again.";
  }
};

function getStreak(logs) {
  if (!logs.length) return 0;
  const dates = [...new Set(logs.map(l => l.date))].sort().reverse();
  let streak = 0, cur = new Date();
  for (const d of dates) {
    const diff = Math.round((cur - new Date(d)) / 86400000);
    if (diff <= 1) { streak++; cur = new Date(d); } else break;
  }
  return streak;
}
function formatMonth(m) {
  const [y, mo] = m.split("-");
  return new Date(y, mo - 1).toLocaleString("default", { month: "long", year: "numeric" });
}
function timeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}
function hexRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "255,215,0";
}
const PGQ = ["Make good new things.", "Greatness compounds over time.", "The first steps are most rare and valuable.", "Stay on one thing long enough.", "Curiosity becomes competitive advantage."];

function Ring({ pct, color, size, stroke }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

function Bar({ val, color }) {
  return (
    <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.max(0,Math.min(100,val))}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── LANDING PAGE ────────────────────────────────────────────────────────────
function LandingPage({ onEnter }) {
  const [nameInput, setNameInput] = useState("");
  const [showName, setShowName] = useState(false);

  const principles = [
    { icon: "◎", text: "Most people fail not from lack of effort, but from divided attention." },
    { icon: "◈", text: "One goal, compounded daily, beats ten goals pursued half-heartedly." },
    { icon: "★", text: "The life you want is built in the ordinary moments you track." },
  ];

  const features = [
    { icon: "◎", label: "12 Life Categories", desc: "Every dimension of a complete human life, from health to spirit to wealth." },
    { icon: "📊", label: "Daily Check-in", desc: "Log what happened, get AI feedback, watch your score move in real time." },
    { icon: "🧠", label: "AI Coach", desc: "A coach that knows your goals, your history, and what you need to hear." },
    { icon: "★", label: "Life Vision", desc: "An AI-generated manifesto that ties all your goals into one north star." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "Georgia, serif", color: "#e0e0e0" }}>

      {/* Nav */}
      <div style={{ padding: "22px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#FFD700", fontSize: 20 }}>★</span>
          <span style={{ fontSize: 16, color: "#fff" }}>Stay on One</span>
        </div>
        <button onClick={() => setShowName(true)} style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 8, padding: "8px 20px", fontSize: 13, color: "#FFD700", cursor: "pointer", fontFamily: "Georgia,serif" }}>
          Begin →
        </button>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "100px 40px 80px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 28 }}>Inspired by Paul Graham</div>
        <h1 style={{ fontSize: 52, fontWeight: 400, color: "#fff", lineHeight: 1.2, margin: "0 0 28px" }}>
          The only thing that<br />
          <span style={{ color: "#FFD700" }}>compounds is consistency.</span>
        </h1>
        <p style={{ fontSize: 18, color: "#888", lineHeight: 1.8, margin: "0 0 48px", maxWidth: 540, marginLeft: "auto", marginRight: "auto" }}>
          Most productivity systems fail because they ask you to track everything. Stay on One asks you to track one thing per life area — and actually do it every day.
        </p>
        {!showName ? (
          <button onClick={() => setShowName(true)} style={{ background: "#FFD700", color: "#000", border: "none", borderRadius: 10, padding: "16px 40px", fontSize: 17, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 30px rgba(255,215,0,0.3)" }}>
            Start Building Your Life
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto" }}>
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && nameInput.trim() && onEnter(nameInput.trim())}
              placeholder="What's your name?"
              style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "14px 18px", fontSize: 16, color: "#fff", fontFamily: "Georgia,serif", outline: "none" }} />
            <button onClick={() => nameInput.trim() && onEnter(nameInput.trim())} disabled={!nameInput.trim()}
              style={{ background: nameInput.trim() ? "#FFD700" : "rgba(255,215,0,0.2)", color: nameInput.trim() ? "#000" : "#666", border: "none", borderRadius: 10, padding: "14px 24px", fontSize: 16, fontFamily: "Georgia,serif", fontWeight: 700, cursor: nameInput.trim() ? "pointer" : "default" }}>
              Begin
            </button>
          </div>
        )}
      </div>

      {/* Divider quote */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "40px", textAlign: "center", background: "rgba(255,215,0,0.02)" }}>
        <p style={{ fontSize: 20, color: "#aaa", fontStyle: "italic", margin: 0, maxWidth: 640, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>
          "The way to do really good work is to stay on one thing long enough that you go from knowing nothing to knowing something, and from knowing something to knowing more than anyone else."
        </p>
        <div style={{ fontSize: 13, color: "#555", marginTop: 16 }}>— Paul Graham</div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "90px 40px" }}>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>The Concept</div>
        <h2 style={{ fontSize: 32, fontWeight: 400, color: "#fff", textAlign: "center", margin: "0 0 60px" }}>Why one goal per area works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 40 }}>
          {principles.map((p, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, color: "#FFD700", marginBottom: 16 }}>{p.icon}</div>
              <p style={{ fontSize: 15, color: "#999", lineHeight: 1.7, margin: 0 }}>{p.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Psychology section */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "90px 40px" }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>The Psychology</div>
          <h2 style={{ fontSize: 32, fontWeight: 400, color: "#fff", textAlign: "center", margin: "0 0 50px" }}>Built on how humans actually change</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
            {[
              { title: "Identity-based habits", body: "Every time you check in, you cast a vote for the person you want to become. The score isn't vanity — it's evidence of identity shift. James Clear calls this the most powerful driver of lasting change." },
              { title: "Compounding feedback loops", body: "Kahneman showed that we make better decisions when we slow down and reflect. The daily check-in forces System 2 thinking — deliberate, honest, and forward-looking — instead of drifting through days on autopilot." },
              { title: "Specificity over motivation", body: "Vague goals like 'get healthy' fail because the brain cannot act on them. One specific goal per life area gives your mind a clear target. Specificity activates the prefrontal cortex — your planning brain." },
              { title: "Accountability changes behaviour", body: "Research consistently shows that people who track their progress and report it to someone — even an AI — are significantly more likely to follow through. Observation creates intention." },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px 26px" }}>
                <div style={{ fontSize: 15, color: "#FFD700", marginBottom: 10 }}>{item.title}</div>
                <p style={{ fontSize: 14, color: "#888", lineHeight: 1.75, margin: 0 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "90px 40px" }}>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>What's Inside</div>
        <h2 style={{ fontSize: 32, fontWeight: 400, color: "#fff", textAlign: "center", margin: "0 0 50px" }}>Everything you need. Nothing you don't.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "22px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
              <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 15, color: "#ddd", marginBottom: 6 }}>{f.label}</div>
                <div style={{ fontSize: 13, color: "#777", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 12 Categories */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "90px 40px" }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>The Framework</div>
          <h2 style={{ fontSize: 32, fontWeight: 400, color: "#fff", textAlign: "center", margin: "0 0 50px" }}>12 dimensions of a complete life</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {CATS.map(c => (
              <div key={c.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${c.color}33`, borderRadius: 12, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, color: c.color, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontSize: 13, color: "#ccc" }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "100px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 42, color: "#FFD700", marginBottom: 24 }}>★</div>
        <h2 style={{ fontSize: 34, fontWeight: 400, color: "#fff", margin: "0 0 18px" }}>You already know what to work on.</h2>
        <p style={{ fontSize: 17, color: "#888", lineHeight: 1.7, margin: "0 0 40px" }}>The question is whether you will show up for it tomorrow. And the day after. And the day after that.</p>
        {!showName ? (
          <button onClick={() => setShowName(true)} style={{ background: "#FFD700", color: "#000", border: "none", borderRadius: 10, padding: "16px 40px", fontSize: 17, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 30px rgba(255,215,0,0.3)" }}>
            Start Today
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto" }}>
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && nameInput.trim() && onEnter(nameInput.trim())}
              placeholder="What's your name?"
              style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "14px 18px", fontSize: 16, color: "#fff", fontFamily: "Georgia,serif", outline: "none" }} />
            <button onClick={() => nameInput.trim() && onEnter(nameInput.trim())} disabled={!nameInput.trim()}
              style={{ background: nameInput.trim() ? "#FFD700" : "rgba(255,215,0,0.2)", color: nameInput.trim() ? "#000" : "#666", border: "none", borderRadius: 10, padding: "14px 24px", fontSize: 16, fontFamily: "Georgia,serif", fontWeight: 700, cursor: nameInput.trim() ? "pointer" : "default" }}>
              Begin
            </button>
          </div>
        )}
        <div style={{ fontSize: 12, color: "#444", marginTop: 20 }}>Free. Private. No sign-up required.</div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "30px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#FFD700" }}>★</span>
          <span style={{ fontSize: 14, color: "#444" }}>Stay on One</span>
        </div>
        <div style={{ fontSize: 13, color: "#444" }}>Built for people who finish things.</div>
      </div>

      <style>{`@keyframes sooSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── COACH ───────────────────────────────────────────────────────────────────
function Coach({ userName, goals, scores, logs, lifeVision, currentPage }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { const t = setTimeout(() => setShowTip(false), 5000); return () => clearTimeout(t); }, []);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    if (!open || msgs.length > 0) return;
    const completedGoals = Object.keys(goals).filter(k => goals[k]?.goal?.trim());
    const pageCtx = {
      vision: "I see you've been working on your Life Vision — ask me anything about it.",
      checkin: "You're doing your daily check-in — great habit.",
      dailycheckin: "You're reviewing all your goals today — I'm here to help.",
      progress: "You're reviewing your progress — I can help you interpret it.",
      dashboard: "How can I help you stay focused today?",
    }[currentPage] || "How can I help?";
    const greeting = completedGoals.length === 0
      ? `Hey ${userName || "there"}, I'm Coach. Start by setting a goal in any life area and I'll help you think it through.`
      : `Hey ${userName || "there"}, I'm Coach — I know all ${completedGoals.length} of your goals. ${pageCtx}`;
    setMsgs([{ role: "assistant", content: greeting }]);
  }, [open]);

  const buildSystem = () => {
    const completedGoals = Object.keys(goals).filter(k => goals[k]?.goal?.trim());
    const goalsCtx = completedGoals.length
      ? completedGoals.map(id => {
          const c = cat(parseInt(id));
          return `- ${c?.name}: "${goals[id].goal}" (score: ${scores[parseInt(id)] ?? 50}/100)`;
        }).join("\n")
      : "No goals set yet.";
    const visionCtx = lifeVision ? `\n\nLife Vision:\n${lifeVision.slice(0, 500)}...` : "";
    const pageCtx = { vision: "Viewing Life Vision.", checkin: "Doing single goal check-in.", dailycheckin: "Doing full daily check-in across all goals.", progress: "Reviewing progress history.", dashboard: "On the main dashboard.", setup: "Setting up goals." }[currentPage] || "";
    return `You are Coach inside "Stay on One" — a life accountability app inspired by Paul Graham's philosophy that greatness comes from compounding one thing long enough.\n\nUser: ${userName || "this person"}\nGoals:\n${goalsCtx}${visionCtx}\nContext: ${pageCtx}\n\nBe warm but direct. Reference actual goals by name. Keep responses to 2-4 sentences. If they want to chase something new, redirect to their one thing.`;
  };

  const QUICK = {
    vision: ["What does my vision mean for today?", "I have doubts about this", "Which goal first?"],
    checkin: ["I had a bad day", "How do I stay consistent?", "I want to quit"],
    dailycheckin: ["How am I doing overall?", "Which area needs most work?", "I'm feeling overwhelmed"],
    progress: ["Am I improving?", "What's holding me back?", "What should I focus on?"],
  }[currentPage] || ["Am I on the right track?", "I'm feeling distracted", "Help me prioritize"];

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const updated = [...msgs, userMsg];
    setMsgs(updated);
    setInput("");
    setLoading(true);
    const reply = await callClaude(updated.map(m => ({ role: m.role, content: m.content })), buildSystem());
    setMsgs(m => [...m, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, fontFamily: "Georgia, serif" }}>
      {showTip && !open && (
        <div style={{ position: "absolute", bottom: 66, right: 0, background: "#111", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#ddd", whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          Ask Coach anything
        </div>
      )}
      {open && (
        <div style={{ position: "absolute", bottom: 66, right: 0, width: 360, height: 500, background: "#0d0d0d", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 18, display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,150,0,0.05))", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#FFD700,#FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#000", fontWeight: 700, flexShrink: 0 }}>C</div>
            <div>
              <div style={{ fontSize: 14, color: "#fff" }}>Coach</div>
              <div style={{ fontSize: 11, color: "#7CE8A0", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7CE8A0", display: "inline-block" }} />
                Always here for you
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 8 }}>
                {m.role === "assistant" && (
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#FFD700,#FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#000", flexShrink: 0, marginTop: 2 }}>C</div>
                )}
                <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.06)", border: m.role === "user" ? "1px solid rgba(255,215,0,0.3)" : "1px solid rgba(255,255,255,0.08)", fontSize: 13, color: "#ddd", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#FFD700,#FF9500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#000" }}>C</div>
                <div style={{ padding: "9px 13px", background: "rgba(255,255,255,0.06)", borderRadius: "14px 14px 14px 4px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#FFD700", opacity: 0.7, animation: `coachBounce 1s ease ${i*0.15}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          {msgs.length <= 1 && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 5 }}>
              {QUICK.map(q => (
                <button key={q} onClick={() => setInput(q)} style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 20, padding: "4px 11px", fontSize: 11, color: "#FFD700", cursor: "pointer", fontFamily: "Georgia,serif" }}>{q}</button>
              ))}
            </div>
          )}
          <div style={{ padding: "10px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.4)", display: "flex", gap: 8 }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask Coach anything..."
              style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "8px 13px", fontSize: 13, color: "#fff", fontFamily: "Georgia,serif", outline: "none" }} />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ background: input.trim() ? "linear-gradient(135deg,#FFD700,#FF9500)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 15, color: input.trim() ? "#000" : "#555", cursor: input.trim() ? "pointer" : "default", transition: "all 0.2s" }}>→</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} style={{ width: 52, height: 52, borderRadius: "50%", background: open ? "#1a1a1a" : "linear-gradient(135deg,#FFD700,#FF9500)", border: open ? "1px solid rgba(255,255,255,0.15)" : "none", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: open ? "0 2px 12px rgba(0,0,0,0.5)" : "0 4px 20px rgba(255,215,0,0.4)", transition: "all 0.2s", color: open ? "#aaa" : "#000" }}>
        {open ? "×" : "C"}
      </button>
      <style>{`@keyframes coachBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ tab, setTab, hasGoals, userName }) {
  const items = hasGoals
    ? [["dashboard","Dashboard"],["dailycheckin","Daily Check-in"],["progress","Progress"],["vision","Vision"],["setup","Goals"]]
    : [["setup","Goals"]];
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 100, height: 58, display: "flex", alignItems: "center", padding: "0 26px", gap: 4, background: "rgba(8,8,8,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <span style={{ color: "#FFD700", fontSize: 17, marginRight: 14 }}>★</span>
      <span style={{ fontSize: 15, color: "#fff", fontFamily: "Georgia,serif", marginRight: 22, whiteSpace: "nowrap" }}>Stay on One</span>
      {items.map(([id, label]) => (
        <button key={id} onClick={() => setTab(id)} style={{ background: "none", border: "none", borderBottom: tab === id ? "2px solid #FFD700" : "2px solid transparent", color: tab === id ? "#FFD700" : "#666", cursor: "pointer", fontSize: 13, fontFamily: "Georgia,serif", padding: "4px 10px", transition: "color 0.15s" }}>
          {label}
        </button>
      ))}
      <div style={{ marginLeft: "auto", fontSize: 13, color: "#444" }}>{userName}</div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [loaded, setLoaded]           = useState(false);
  const [screen, setScreen]           = useState("landing"); // landing | app
  const [tab, setTab]                 = useState("setup");
  const [activeId, setActiveId]       = useState(null);
  const [userName, setUserName]       = useState("");
  const [goals, setGoals]             = useState({});
  const [scores, setScores]           = useState({});
  const [logs, setLogs]               = useState({});
  const [chats, setChats]             = useState({});
  const [vision, setVision]           = useState("");
  const [editGoal, setEditGoal]       = useState({ goal: "", metrics: "" });
  const [ciNote, setCiNote]           = useState("");
  const [ciMood, setCiMood]           = useState(3);
  const [ciLoading, setCiLoading]     = useState(false);
  const [ciFeedback, setCiFeedback]   = useState({});
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [dailyActive, setDailyActive] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    (async () => {
      const d = await store.get("soo3");
      if (d) {
        setUserName(d.userName || "");
        setGoals(d.goals || {}); setScores(d.scores || {});
        setLogs(d.logs || {}); setChats(d.chats || {});
        setVision(d.vision || "");
        if (d.userName) {
          setScreen("app");
          setTab(Object.keys(d.goals || {}).length ? "dashboard" : "setup");
        }
      }
      setLoaded(true);
    })();
  }, []);

  const save = (patch = {}) => {
    store.set("soo3", { userName, goals, scores, logs, chats, vision, ...patch });
  };

  const handleEnter = (name) => {
    setUserName(name);
    setScreen("app");
    setTab("setup");
    save({ userName: name });
  };

  const doneIds = Object.keys(goals).filter(k => goals[k]?.goal?.trim()).map(Number);
  const sc = (id) => scores[id] ?? 50;
  const todayLogged = (id) => (logs[id] || []).some(l => l.date === todayStr());

  const saveGoal = () => {
    if (!editGoal.goal.trim()) return;
    const ng = { ...goals, [activeId]: { goal: editGoal.goal, metrics: editGoal.metrics } };
    const ns = { ...scores }; if (!ns[activeId]) ns[activeId] = 50;
    setGoals(ng); setScores(ns); save({ goals: ng, scores: ns }); setTab("setup");
  };

  const removeGoal = () => {
    const ng = { ...goals }; delete ng[activeId];
    setGoals(ng); save({ goals: ng }); setTab("setup");
  };

  const submitCheckin = async (id, note, mood) => {
    const targetId = id || activeId;
    setCiLoading(true);
    const recent = (logs[targetId] || []).slice(-5).map(l => `${l.date}: ${l.note} (mood ${l.mood}/5)`).join("\n");
    const reply = await callClaude(
      [{ role: "user", content: `Goal: ${goals[targetId]?.goal}\nRecent:\n${recent || "First check-in"}\n\nToday ${todayStr()}, mood ${mood}/5:\n${note}` }],
      `You are an accountability coach. In 2-3 sentences: acknowledge what they did, assess if it moved them toward or away from their goal, give one sharp insight. End with exactly: DELTA:+8 or DELTA:-5 (range -20 to +20). Nothing after.`
    );
    const match = reply.match(/DELTA:([+-]?\d+)/);
    const delta = match ? parseInt(match[1]) : 0;
    const clean = reply.replace(/DELTA:[+-]?\d+/, "").trim();
    const newScore = Math.max(0, Math.min(100, sc(targetId) + delta));
    const entry = { date: todayStr(), note, mood, delta, aiReply: clean };
    const nl = { ...logs, [targetId]: [...(logs[targetId] || []), entry] };
    const ns = { ...scores, [targetId]: newScore };
    setLogs(nl); setScores(ns);
    setCiFeedback(prev => ({ ...prev, [targetId]: `${clean}\n\n${delta >= 0 ? "+" : ""}${delta} pts → ${newScore}/100` }));
    setCiLoading(false);
    save({ logs: nl, scores: ns });
  };

  const sendGoalChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const c = cat(activeId);
    const prev = chats[activeId] || [];
    const msg = { role: "user", content: chatInput };
    const updated = [...prev, msg];
    setChats(h => ({ ...h, [activeId]: updated }));
    setChatInput(""); setChatLoading(true);
    const reply = await callClaude(
      updated.map(m => ({ role: m.role, content: m.content })),
      `You are a focused coach for ${userName}'s goal in ${c?.name}: "${goals[activeId]?.goal}". Score: ${sc(activeId)}/100. Be specific and direct.`
    );
    const nc = { ...chats, [activeId]: [...updated, { role: "assistant", content: reply }] };
    setChats(nc); setChatLoading(false); save({ chats: nc });
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const generateVision = async () => {
    setVisionLoading(true);
    const goalsText = doneIds.map(id => `${cat(id)?.name} (score ${sc(id)}/100, ${(logs[id]||[]).length} check-ins): ${goals[id].goal}`).join("\n");
    const reply = await callClaude(
      [{ role: "user", content: `Name: ${userName}\nGoals:\n${goalsText}\n\nWrite their Life Vision.` }],
      `You are a master life architect. Create a profound personal Life Vision manifesto in second person. Inspired by Paul Graham: greatness compounds. Structure: opening identity, key themes, ONE core thread, 90-day challenge, closing commitment. Bold, specific, poetic.`
    );
    setVision(reply); setVisionLoading(false); save({ vision: reply });
  };

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "2px solid rgba(255,215,0,0.2)", borderTop: "2px solid #FFD700", borderRadius: "50%", animation: "sooSpin 1s linear infinite" }} />
      <style>{`@keyframes sooSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (screen === "landing") return <LandingPage onEnter={handleEnter} />;

  // ── DAILY CHECK-IN PAGE ──────────────────────────────────────────────────
  const DailyCheckin = () => {
    const [notes, setNotes] = useState({});
    const [moods, setMoods] = useState({});
    const pending = doneIds.filter(id => !todayLogged(id));
    const done = doneIds.filter(id => todayLogged(id));
    const current = dailyActive || (pending.length > 0 ? pending[0] : null);

    if (doneIds.length === 0) return (
      <div style={{ padding: "80px 26px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>◎</div>
        <h2 style={{ fontSize: 22, fontWeight: 400, color: "#fff", margin: "0 0 10px" }}>No goals set yet</h2>
        <p style={{ color: "#666", fontSize: 15, margin: "0 0 24px" }}>Set at least one goal to start your daily check-in.</p>
        <button onClick={() => setTab("setup")} style={{ background: "#FFD700", color: "#000", border: "none", borderRadius: 9, padding: "12px 24px", fontSize: 15, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer" }}>Set Goals →</button>
      </div>
    );

    return (
      <div style={{ padding: "34px 26px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 30 }}>
          <h2 style={{ fontSize: 26, fontWeight: 400, color: "#fff", margin: "0 0 6px" }}>Daily Check-in · {todayStr()}</h2>
          <p style={{ color: "#666", fontSize: 14, margin: 0 }}>{pending.length} remaining · {done.length} completed today</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24 }}>
          {/* Sidebar — all goals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Your Goals</div>
            {doneIds.map(id => {
              const c = cat(id);
              const logged = todayLogged(id);
              const isActive = current === id;
              return (
                <div key={id} onClick={() => setDailyActive(id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, cursor: "pointer", background: isActive ? `rgba(${hexRgb(c?.color||"#FFD700")},0.1)` : "rgba(255,255,255,0.02)", border: `1px solid ${isActive ? c?.color+"55" : "rgba(255,255,255,0.06)"}`, transition: "all 0.15s" }}>
                  <span style={{ color: c?.color, fontSize: 16 }}>{c?.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: isActive ? "#fff" : "#aaa" }}>{c?.name}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{sc(id)}/100</div>
                  </div>
                  {logged
                    ? <span style={{ fontSize: 14, color: "#7CE8A0" }}>✓</span>
                    : <span style={{ fontSize: 10, color: "#E8D07C", background: "rgba(232,208,124,0.1)", border: "1px solid rgba(232,208,124,0.2)", borderRadius: 10, padding: "2px 7px" }}>due</span>
                  }
                </div>
              );
            })}
            {done.length === doneIds.length && (
              <div style={{ marginTop: 12, padding: "14px", background: "rgba(124,232,160,0.08)", border: "1px solid rgba(124,232,160,0.2)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>🎉</div>
                <div style={{ fontSize: 13, color: "#7CE8A0" }}>All done for today!</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Come back tomorrow</div>
              </div>
            )}
          </div>

          {/* Main area */}
          {current ? (() => {
            const c = cat(current);
            const logged = todayLogged(current);
            const feedback = ciFeedback[current];
            const note = notes[current] || "";
            const mood = moods[current] || 3;
            const lastLogs = (logs[current] || []).slice(-3).reverse();

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 24px", background: `rgba(${hexRgb(c?.color||"#FFD700")},0.06)`, border: `1px solid ${c?.color}33`, borderRadius: 16 }}>
                  <span style={{ fontSize: 28, color: c?.color }}>{c?.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, color: c?.color }}>{c?.name}</div>
                    <div style={{ fontSize: 13, color: "#777", marginTop: 2 }}>{goals[current]?.goal}</div>
                  </div>
                  <div style={{ position: "relative", width: 58, height: 58, flexShrink: 0 }}>
                    <Ring pct={sc(current)} color={c?.color || "#FFD700"} size={58} stroke={5} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: c?.color }}>{sc(current)}</div>
                  </div>
                </div>

                {/* Past logs snippet */}
                {lastLogs.length > 0 && (
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 18px" }}>
                    <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Recent History</div>
                    {lastLogs.map((l, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: i < lastLogs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <span style={{ fontSize: 12, color: "#555", minWidth: 70 }}>{l.date}</span>
                        <span style={{ fontSize: 12, color: l.delta >= 0 ? "#7CE8A0" : "#E87C7C", minWidth: 30 }}>{l.delta >= 0 ? "+" : ""}{l.delta}</span>
                        <span style={{ fontSize: 13, color: "#888", lineHeight: 1.4 }}>{l.note.slice(0, 80)}{l.note.length > 80 ? "..." : ""}</span>
                      </div>
                    ))}
                  </div>
                )}

                {logged && !feedback ? (
                  <div style={{ padding: "30px", textAlign: "center", background: "rgba(124,232,160,0.05)", border: "1px solid rgba(124,232,160,0.2)", borderRadius: 14 }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
                    <div style={{ fontSize: 15, color: "#7CE8A0" }}>Logged today</div>
                    <div style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
                      {(logs[current]||[]).slice(-1)[0]?.aiReply?.slice(0, 120)}
                    </div>
                  </div>
                ) : feedback ? (
                  <div style={{ background: `rgba(${hexRgb(c?.color||"#FFD700")},0.06)`, border: `1px solid ${c?.color}33`, borderRadius: 14, padding: "22px 24px" }}>
                    <div style={{ fontSize: 11, color: c?.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Coach Feedback</div>
                    <p style={{ fontSize: 14, color: "#ddd", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: "0 0 16px" }}>{feedback}</p>
                    <Bar val={sc(current)} color={c?.color || "#FFD700"} />
                    {pending.filter(id => id !== current).length > 0 && (
                      <button onClick={() => { setDailyActive(pending.filter(id => id !== current)[0]); setCiFeedback(p => ({ ...p, [current]: undefined })); setNotes(n => ({ ...n, [current]: "" })); setMoods(m => ({ ...m, [current]: 3 })); }}
                        style={{ marginTop: 16, background: "#FFD700", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer" }}>
                        Next Goal →
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Mood */}
                    <div>
                      <div style={{ fontSize: 11, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>How are you feeling about this goal today?</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {["😔","😐","🙂","😊","🔥"].map((emoji, i) => (
                          <button key={i} onClick={() => setMoods(m => ({ ...m, [current]: i+1 }))}
                            style={{ flex: 1, border: `1px solid ${mood === i+1 ? (c?.color||"#FFD700") : "rgba(255,255,255,0.1)"}`, background: mood === i+1 ? `rgba(${hexRgb(c?.color||"#FFD700")},0.15)` : "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 0", fontSize: 20, cursor: "pointer" }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <div style={{ fontSize: 11, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>What happened toward this goal today?</div>
                      <textarea rows={4} value={note} onChange={e => setNotes(n => ({ ...n, [current]: e.target.value }))}
                        placeholder="Be specific. What did you do, skip, or decide? The more honest, the better the feedback."
                        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "13px 16px", fontSize: 14, color: "#fff", fontFamily: "Georgia,serif", outline: "none", resize: "vertical" }} />
                    </div>

                    <button onClick={() => submitCheckin(current, note, mood)} disabled={!note.trim() || ciLoading}
                      style={{ background: note.trim() ? "#FFD700" : "rgba(255,215,0,0.15)", color: note.trim() ? "#000" : "#666", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontFamily: "Georgia,serif", fontWeight: 700, cursor: note.trim() ? "pointer" : "default" }}>
                      {ciLoading ? "Analyzing..." : "Log & Get AI Feedback"}
                    </button>
                  </>
                )}

                {/* Analyse with Coach CTA */}
                <div style={{ padding: "16px 20px", background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.12)", borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 22 }}>C</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: "#ddd" }}>Want to go deeper?</div>
                    <div style={{ fontSize: 12, color: "#666" }}>Open Coach in the bottom-right to analyse your {c?.name} journey, patterns, and next steps — like having a Whoop coach for your life.</div>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
              <div style={{ fontSize: 14 }}>Select a goal from the left to check in</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderScreen = () => {

    if (tab === "goalEntry") {
      const c = cat(activeId);
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: "36px 20px" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, padding: 34, maxWidth: 540, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            <button onClick={() => setTab("setup")} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14, fontFamily: "Georgia,serif", padding: 0, textAlign: "left" }}>← Back</button>
            <div style={{ fontSize: 32, color: c?.color }}>{c?.icon}</div>
            <h2 style={{ fontSize: 24, fontWeight: 400, color: c?.color, margin: 0 }}>{c?.name}</h2>
            <label style={{ fontSize: 11, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>Your ONE long-term goal</label>
            <textarea rows={3} placeholder="Be specific. Vague goals create vague lives."
              value={editGoal.goal} onChange={e => setEditGoal(g => ({ ...g, goal: e.target.value }))} autoFocus
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 15px", fontSize: 15, color: "#fff", fontFamily: "Georgia,serif", outline: "none", resize: "vertical", width: "100%" }} />
            <label style={{ fontSize: 11, color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>How will you measure it? (optional)</label>
            <input placeholder="e.g. workout 5x/week, body fat %, revenue..."
              value={editGoal.metrics} onChange={e => setEditGoal(g => ({ ...g, metrics: e.target.value }))}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 15px", fontSize: 15, color: "#fff", fontFamily: "Georgia,serif", outline: "none" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveGoal} disabled={!editGoal.goal.trim()}
                style={{ flex: 1, background: editGoal.goal.trim() ? "#FFD700" : "rgba(255,215,0,0.15)", color: editGoal.goal.trim() ? "#000" : "#666", border: "none", borderRadius: 9, padding: "12px", fontSize: 15, fontFamily: "Georgia,serif", fontWeight: 700, cursor: editGoal.goal.trim() ? "pointer" : "default" }}>
                Save Goal
              </button>
              {goals[activeId] && (
                <button onClick={removeGoal} style={{ background: "none", border: "1px solid rgba(232,124,124,0.3)", borderRadius: 9, padding: "12px 16px", fontSize: 13, color: "#E87C7C", cursor: "pointer", fontFamily: "Georgia,serif" }}>Remove</button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (tab === "setup") return (
      <div style={{ padding: "34px 26px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 26, fontWeight: 400, color: "#fff", margin: "0 0 8px" }}>Your Life Goals</h2>
        <p style={{ color: "#666", fontSize: 15, margin: "0 0 26px" }}>Define your ONE goal per life area. Each becomes a dedicated tracking and coaching space.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10 }}>
          {CATS.map(c => {
            const has = !!goals[c.id]?.goal;
            const s = sc(c.id);
            return (
              <div key={c.id} onClick={() => { setActiveId(c.id); setEditGoal({ goal: goals[c.id]?.goal || "", metrics: goals[c.id]?.metrics || "" }); setTab("goalEntry"); }}
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${has ? c.color+"55" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: c.color, fontSize: 20 }}>{c.icon}</span>
                  {has && <span style={{ fontSize: 12, color: c.color, fontWeight: 700 }}>{s}/100</span>}
                </div>
                <div style={{ fontSize: 14, color: "#ddd" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: has ? "#888" : "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{has ? goals[c.id].goal : "+ Set goal"}</div>
                {has && <Bar val={s} color={c.color} />}
              </div>
            );
          })}
        </div>
        {doneIds.length > 0 && (
          <button onClick={() => setTab("dashboard")} style={{ marginTop: 24, background: "#FFD700", color: "#000", border: "none", borderRadius: 9, padding: "12px 28px", fontSize: 15, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer" }}>
            Go to Dashboard →
          </button>
        )}
      </div>
    );

    if (tab === "dailycheckin") return <DailyCheckin />;

    if (tab === "dashboard") {
      const avg = doneIds.length ? Math.round(doneIds.reduce((a, id) => a + sc(id), 0) / doneIds.length) : 0;
      const needCheckin = doneIds.filter(id => !todayLogged(id));
      return (
        <div style={{ padding: "34px 26px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 400, color: "#fff", margin: "0 0 6px" }}>Good {timeOfDay()}, {userName}.</h2>
              <p style={{ color: "#666", fontSize: 15, margin: 0, fontStyle: "italic" }}>"{PGQ[new Date().getDay() % PGQ.length]}"</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#555" }}>overall score</div>
              <div style={{ fontSize: 38, color: "#FFD700", lineHeight: 1 }}>{avg}</div>
              <div style={{ fontSize: 12, color: "#555" }}>{doneIds.length} goals</div>
            </div>
          </div>
          {needCheckin.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,215,0,0.07)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 22 }}>
              <span style={{ color: "#FFD700" }}>★</span>
              <span style={{ fontSize: 14, color: "#ddd" }}>{needCheckin.length} goal{needCheckin.length > 1 ? "s" : ""} awaiting today's check-in</span>
              <button onClick={() => { setDailyActive(needCheckin[0]); setTab("dailycheckin"); }}
                style={{ marginLeft: "auto", background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 7, padding: "6px 14px", fontSize: 13, color: "#FFD700", cursor: "pointer", fontFamily: "Georgia,serif" }}>
                Start Daily Check-in
              </button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(285px,1fr))", gap: 15 }}>
            {doneIds.map(id => {
              const c = cat(id);
              const s = sc(id);
              const logList = logs[id] || [];
              const logged = todayLogged(id);
              const last7 = logList.slice(-7);
              const trend = last7.length ? (last7[last7.length-1].delta > 0 ? "↑" : last7[last7.length-1].delta < 0 ? "↓" : "—") : "—";
              return (
                <div key={id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${c?.color}33`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: c?.color, fontSize: 20 }}>{c?.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, color: c?.color }}>{c?.name}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>{logList.length} check-ins</div>
                      </div>
                    </div>
                    <div style={{ position: "relative", width: 50, height: 50, flexShrink: 0 }}>
                      <Ring pct={s} color={c?.color || "#FFD700"} size={50} stroke={4} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#888" }}>{s}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "#999", lineHeight: 1.5, margin: 0 }}>{goals[id].goal}</p>
                  {last7.length > 0 && (
                    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 22 }}>
                      {last7.map((l, i) => (
                        <div key={i} style={{ flex: 1, minHeight: 3, height: `${Math.max(12,Math.abs(l.delta)/20*100)}%`, background: l.delta >= 0 ? (c?.color||"#FFD700")+"88" : "#E87C7C88", borderRadius: 2 }} />
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 7 }}>
                    {!logged
                      ? <button onClick={() => { setDailyActive(id); setTab("dailycheckin"); }}
                          style={{ flex: 1, background: `rgba(${hexRgb(c?.color||"#FFD700")},0.1)`, border: `1px solid ${c?.color}44`, borderRadius: 7, padding: "6px", fontSize: 12, color: c?.color, cursor: "pointer", fontFamily: "Georgia,serif" }}>
                          + Check in today
                        </button>
                      : <span style={{ fontSize: 12, color: (c?.color||"#FFD700")+"aa", padding: "6px 0", flex: 1 }}>Logged {trend}</span>
                    }
                    <button onClick={() => { setActiveId(id); setTab("chat"); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "Georgia,serif" }}>Coach</button>
                    <button onClick={() => { setActiveId(id); setTab("progress"); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "6px 10px", fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "Georgia,serif" }}>History</button>
                  </div>
                </div>
              );
            })}
          </div>
          {vision
            ? <div onClick={() => setTab("vision")} style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 14, background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 12, padding: "15px 20px", cursor: "pointer" }}>
                <span style={{ fontSize: 20, color: "#FFD700" }}>★</span>
                <div><div style={{ fontSize: 14, color: "#ddd" }}>Your Life Vision</div><div style={{ fontSize: 12, color: "#666" }}>Click to view or regenerate</div></div>
                <span style={{ marginLeft: "auto", color: "#FFD700" }}>→</span>
              </div>
            : doneIds.length > 0
              ? <button onClick={() => { setTab("vision"); generateVision(); }} style={{ marginTop: 26, background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 10, padding: "13px 26px", fontSize: 15, color: "#FFD700", cursor: "pointer", fontFamily: "Georgia,serif" }}>
                  Generate Life Vision
                </button>
              : null
          }
        </div>
      );
    }

    if (tab === "progress") {
      const c = cat(activeId);
      const logList = logs[activeId] || [];
      const byMonth = {};
      logList.forEach(l => { const m = l.date.slice(0,7); if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(l); });
      const s = sc(activeId);
      if (!activeId) return (
        <div style={{ padding: "60px 26px", textAlign: "center" }}>
          <p style={{ color: "#666" }}>Select a goal from the dashboard to view progress.</p>
          <button onClick={() => setTab("dashboard")} style={{ marginTop: 14, background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, padding: "10px 20px", fontSize: 14, color: "#FFD700", cursor: "pointer", fontFamily: "Georgia,serif" }}>Go to Dashboard</button>
        </div>
      );
      return (
        <div style={{ padding: "34px 26px", maxWidth: 900, margin: "0 auto" }}>
          <button onClick={() => setTab("dashboard")} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14, fontFamily: "Georgia,serif", padding: "0 0 18px", display: "block" }}>← Back to Dashboard</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
            <span style={{ color: c?.color, fontSize: 28 }}>{c?.icon}</span>
            <div><h2 style={{ fontSize: 24, fontWeight: 400, color: "#fff", margin: "0 0 4px" }}>{c?.name} Progress</h2><p style={{ color: "#888", fontSize: 13, margin: 0 }}>{goals[activeId]?.goal}</p></div>
            <div style={{ marginLeft: "auto", position: "relative", width: 76, height: 76 }}>
              <Ring pct={s} color={c?.color || "#FFD700"} size={76} stroke={6} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: c?.color }}>{s}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 26, flexWrap: "wrap" }}>
            {[{l:"Total Logs",v:logList.length},{l:"This Month",v:(byMonth[monthStr()]||[]).length},{l:"Streak",v:`${getStreak(logList)}d`},{l:"Best",v:logList.length?`+${Math.max(...logList.map(l=>l.delta))}`:"--"},{l:"Avg Mood",v:logList.length?`${(logList.reduce((a,l)=>a+l.mood,0)/logList.length).toFixed(1)}/5`:"--"}].map(st => (
              <div key={st.l} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 80, textAlign: "center" }}>
                <div style={{ fontSize: 22, color: c?.color }}>{st.v}</div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{st.l}</div>
              </div>
            ))}
          </div>
          {logList.length === 0 && <div style={{ color: "#555", fontSize: 15, textAlign: "center", padding: "60px 0" }}>No logs yet. Start your first check-in!</div>}
          {Object.keys(byMonth).sort().reverse().map(m => (
            <div key={m} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: c?.color }}>{formatMonth(m)}</div>
                <div style={{ fontSize: 13, color: "#888" }}>{byMonth[m].length} logs · net {byMonth[m].reduce((a,l)=>a+l.delta,0)>=0?"+":""}{byMonth[m].reduce((a,l)=>a+l.delta,0)}</div>
              </div>
              <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 38, marginBottom: 12 }}>
                {byMonth[m].map((l, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 4, height: `${Math.max(10,Math.abs(l.delta)/20*100)}%`, background: l.delta>=0?(c?.color||"#FFD700")+"99":"#E87C7C99", borderRadius: 2 }} />
                ))}
              </div>
              {byMonth[m].slice().reverse().map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: 12, color: "#666", whiteSpace: "nowrap", minWidth: 48 }}>{l.date.slice(5)}</span>
                  <span style={{ fontSize: 12, color: l.delta>=0?"#7CE8A0":"#E87C7C", whiteSpace: "nowrap" }}>{l.delta>=0?"+":""}{l.delta}</span>
                  <span style={{ fontSize: 13, color: "#aaa", lineHeight: 1.5 }}>{l.note}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (tab === "chat") {
      const c = cat(activeId);
      const msgs = chats[activeId] || [];
      if (!activeId) return (
        <div style={{ padding: "60px 26px", textAlign: "center" }}>
          <p style={{ color: "#666" }}>Select a goal from the dashboard to open its coach.</p>
          <button onClick={() => setTab("dashboard")} style={{ marginTop: 14, background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 8, padding: "10px 20px", fontSize: 14, color: "#FFD700", cursor: "pointer", fontFamily: "Georgia,serif" }}>Go to Dashboard</button>
        </div>
      );
      return (
        <div style={{ display: "flex", height: "calc(100vh - 58px)" }}>
          <div style={{ width: 240, borderRight: "1px solid rgba(255,255,255,0.07)", padding: 20, flexShrink: 0, overflowY: "auto" }}>
            <button onClick={() => setTab("dashboard")} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14, fontFamily: "Georgia,serif", padding: "0 0 14px", display: "block" }}>← Back</button>
            <div style={{ color: c?.color, fontSize: 24, marginBottom: 6 }}>{c?.icon}</div>
            <div style={{ fontSize: 14, color: c?.color, marginBottom: 8 }}>{c?.name}</div>
            <div style={{ fontSize: 12, color: "#777", lineHeight: 1.5, marginBottom: 14 }}>{goals[activeId]?.goal}</div>
            <div style={{ position: "relative", width: 60, height: 60, marginBottom: 16 }}>
              <Ring pct={sc(activeId)} color={c?.color || "#FFD700"} size={60} stroke={5} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: c?.color }}>{sc(activeId)}</div>
            </div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Other Goals</div>
            {doneIds.filter(id => id !== activeId).map(id => {
              const cc = cat(id);
              return (
                <div key={id} onClick={() => setActiveId(id)} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 0", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: cc?.color }}>{cc?.icon}</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{cc?.name}</span>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "26px 34px", display: "flex", flexDirection: "column", gap: 13 }}>
              {msgs.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
                  <div style={{ fontSize: 38, color: c?.color, marginBottom: 10 }}>{c?.icon}</div>
                  <div style={{ fontSize: 16, color: "#ddd", marginBottom: 8 }}>Coaching for {c?.name}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>Ask anything. Explore your why. Remove what does not serve your one goal.</div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? `rgba(${hexRgb(c?.color||"#FFD700")},0.15)` : "rgba(255,255,255,0.05)", border: m.role === "user" ? `1px solid ${c?.color}44` : "1px solid rgba(255,255,255,0.08)", fontSize: 14, color: "#ddd", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    <div style={{ fontSize: 11, color: m.role === "user" ? c?.color : "#555", marginBottom: 5 }}>{m.role === "user" ? "You" : "Coach"}</div>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex" }}>
                  <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "14px 14px 14px 4px", border: "1px solid rgba(255,255,255,0.08)", color: "#666", fontSize: 14 }}>thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: "13px 26px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)", display: "flex", gap: 10 }}>
              <input style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "10px 14px", fontSize: 14, color: "#fff", fontFamily: "Georgia,serif", outline: "none" }}
                placeholder={`Ask about your ${c?.name} goal...`}
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendGoalChat()} />
              <button onClick={sendGoalChat} disabled={!chatInput.trim() || chatLoading}
                style={{ background: c?.color || "#FFD700", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 16, color: "#000", cursor: "pointer" }}>→</button>
            </div>
          </div>
        </div>
      );
    }

    if (tab === "vision") {
      const avgScore = doneIds.length ? Math.round(doneIds.reduce((a, id) => a + sc(id), 0) / doneIds.length) : 0;
      const totalLogs = doneIds.reduce((a, id) => a + (logs[id]?.length || 0), 0);
      const topGoals = [...doneIds].sort((a,b) => sc(b) - sc(a));
      const needsWork = [...doneIds].sort((a,b) => sc(a) - sc(b)).slice(0, 3);

      const LifeWheel = () => {
        const size = 280, cx = 140, cy = 140, maxR = 110;
        const n = doneIds.length;
        if (n < 3) return null;
        const pts = doneIds.map((id, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          const r = (sc(id) / 100) * maxR;
          return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), id };
        });
        const gridPts = (pct) => doneIds.map((_, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          const r = (pct / 100) * maxR;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(" ");
        const poly = pts.map(p => `${p.x},${p.y}`).join(" ");
        return (
          <svg width={size} height={size} style={{ overflow: "visible" }}>
            {[25,50,75,100].map(pct => <polygon key={pct} points={gridPts(pct)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />)}
            {doneIds.map((id, i) => {
              const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
              return <line key={id} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
            })}
            <polygon points={poly} fill="rgba(255,215,0,0.12)" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round" />
            {pts.map((p, i) => { const c = cat(p.id); return <circle key={i} cx={p.x} cy={p.y} r={4} fill={c?.color || "#FFD700"} stroke="#080808" strokeWidth="2" />; })}
            {doneIds.map((id, i) => {
              const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
              const lx = cx + (maxR + 22) * Math.cos(angle);
              const ly = cy + (maxR + 22) * Math.sin(angle);
              const c = cat(id);
              return <g key={id}><text x={lx} y={ly - 4} textAnchor="middle" fill={c?.color || "#888"} fontSize="10" fontFamily="Georgia,serif">{c?.icon}</text><text x={lx} y={ly + 10} textAnchor="middle" fill="#666" fontSize="8" fontFamily="Georgia,serif">{sc(id)}</text></g>;
            })}
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#FFD700" fontSize="22" fontFamily="Georgia,serif" fontWeight="bold">{avgScore}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="#666" fontSize="9" fontFamily="Georgia,serif">overall</text>
          </svg>
        );
      };

      return (
        <div style={{ padding: "34px 26px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 46, color: "#FFD700" }}>★</div>
            <h2 style={{ fontSize: 30, fontWeight: 400, color: "#fff", margin: "12px 0 8px" }}>{userName}'s Life Vision</h2>
            <p style={{ color: "#666", fontSize: 14, margin: 0 }}>Synthesized from {doneIds.length} goals · {totalLogs} check-ins logged</p>
          </div>
          {visionLoading && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 34, height: 34, border: "2px solid rgba(255,215,0,0.2)", borderTop: "2px solid #FFD700", borderRadius: "50%", animation: "sooSpin 1s linear infinite", margin: "0 auto" }} />
              <p style={{ color: "#888", marginTop: 18 }}>Weaving your life vision...</p>
            </div>
          )}
          {!visionLoading && doneIds.length > 0 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, marginBottom: 36, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "#666", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Life Wheel</div>
                  {doneIds.length >= 3 ? <LifeWheel /> : <div style={{ width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 13, textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12 }}>Set 3+ goals to see your wheel</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: "#ddd" }}>Overall Life Progress</span>
                      <span style={{ fontSize: 22, color: "#FFD700", fontWeight: 700 }}>{avgScore}%</span>
                    </div>
                    <div style={{ height: 10, background: "rgba(255,255,255,0.07)", borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${avgScore}%`, background: "linear-gradient(90deg, #FFD700, #FF9500)", borderRadius: 5, transition: "width 1s ease" }} />
                    </div>
                  </div>
                  {doneIds.map(id => {
                    const c = cat(id); const s = sc(id);
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: c?.color, fontSize: 16, width: 20, flexShrink: 0 }}>{c?.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: "#ccc" }}>{c?.name}</span>
                            <span style={{ fontSize: 12, color: c?.color }}>{s}/100</span>
                          </div>
                          <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${s}%`, background: c?.color, borderRadius: 3, transition: "width 0.8s ease" }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: "#555", minWidth: 36, textAlign: "right" }}>{(logs[id]||[]).length} logs</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 36 }}>
                <div style={{ background: "rgba(124,232,160,0.05)", border: "1px solid rgba(124,232,160,0.15)", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 11, color: "#7CE8A0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Strongest Areas</div>
                  {topGoals.slice(0, 3).map(id => { const c = cat(id); return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 14, color: c?.color }}>{c?.icon}</span>
                      <span style={{ fontSize: 13, color: "#ccc", flex: 1 }}>{c?.name}</span>
                      <span style={{ fontSize: 12, color: "#7CE8A0" }}>{sc(id)}</span>
                    </div>
                  ); })}
                </div>
                <div style={{ background: "rgba(232,124,124,0.05)", border: "1px solid rgba(232,124,124,0.15)", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 11, color: "#E87C7C", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Needs Attention</div>
                  {needsWork.map(id => { const c = cat(id); return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 14, color: c?.color }}>{c?.icon}</span>
                      <span style={{ fontSize: 13, color: "#ccc", flex: 1 }}>{c?.name}</span>
                      <span style={{ fontSize: 11, color: "#E87C7C" }}>+{100 - sc(id)} to go</span>
                    </div>
                  ); })}
                </div>
              </div>
              {vision && (
                <div style={{ marginBottom: 36 }}>
                  <div style={{ fontSize: 11, color: "#666", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                    Your Life Vision Manifesto
                    <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  </div>
                  <div style={{ background: "rgba(255,215,0,0.03)", border: "1px solid rgba(255,215,0,0.12)", borderRadius: 16, padding: "34px 38px" }}>
                    {vision.split("\n").map((line, i) =>
                      line.trim() ? <p key={i} style={{ fontSize: 17, lineHeight: 1.85, color: "#ddd", margin: "0 0 14px" }}>{line}</p> : <br key={i} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 8, marginBottom: 26 }}>
            <button onClick={generateVision} style={{ background: "#FFD700", color: "#000", border: "none", borderRadius: 9, padding: "12px 22px", fontSize: 14, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer" }}>
              {vision ? "Regenerate Vision" : "Generate Life Vision"}
            </button>
            {vision && <button onClick={() => navigator.clipboard?.writeText(vision)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 9, padding: "12px 18px", fontSize: 14, color: "#aaa", cursor: "pointer", fontFamily: "Georgia,serif" }}>Copy Text</button>}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#e0e0e0", fontFamily: "Georgia,serif" }}>
      <Nav tab={tab} setTab={setTab} hasGoals={doneIds.length > 0} userName={userName} />
      {renderScreen()}
      <Coach userName={userName} goals={goals} scores={scores} logs={logs} lifeVision={vision} currentPage={tab} />
      <style>{`
        *{box-sizing:border-box}body{margin:0}
        @keyframes sooSpin{to{transform:rotate(360deg)}}
        textarea,input{color-scheme:dark}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>
    </div>
  );
}
