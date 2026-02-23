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

const SUGGESTED_GOALS = {
  1: "Work out 4 times a week and track my energy levels daily",
  2: "Read one book per month and apply one idea to my life",
  3: "Journal for 10 minutes every morning to process my emotions",
  4: "Do one thing each week that my future self would be proud of",
  5: "Spend 15 minutes daily in silence, reflection, or prayer",
  6: "Plan one intentional date or deep conversation with my partner weekly",
  7: "Be fully present with my children for at least 1 hour daily without my phone",
  8: "Reach out to one friend I care about every week",
  9: "Save 20% of income and track every expense",
  10: "Ship one meaningful piece of work every week in my career",
  11: "Design my environment so my daily life feels like the life I want",
  12: "Write down my core values and the person I am becoming",
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStr = () => new Date().toISOString().slice(0, 7);
const cat = (id) => CATS.find(c => c.id === id);

const store = {
  async get(key) {
    try {
      if (window.storage) { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
      const v = localStorage.getItem(key); return v ? JSON.parse(v) : null;
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
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1000, system: system || "You are a helpful life coach assistant.", messages }),
    });
    const data = await response.json();
    if (data.error) { console.error("API error:", data.error.message); return "I'm having trouble connecting right now. Please try again."; }
    return data.content?.[0]?.text || "No response received.";
  } catch (err) { console.error("Network error:", err); return "Connection error. Please check your internet and try again."; }
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
function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date() - new Date(dateStr)) / 86400000);
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

function AnimatedRing({ pct, prevPct, color, size, stroke }) {
  const [display, setDisplay] = useState(prevPct ?? pct);
  useEffect(() => {
    const start = prevPct ?? pct;
    const end = pct;
    if (start === end) { setDisplay(end); return; }
    const duration = 1200;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [pct]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <Ring pct={display} color={color} size={size} stroke={stroke} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.22, color }}>{display}</div>
    </div>
  );
}

// ─── LANDING PAGE ────────────────────────────────────────────────────────────
function LandingPage({ onEnter }) {
  const [nameInput, setNameInput] = useState("");
  const [showName, setShowName] = useState(false);
  const [animatedPcts, setAnimatedPcts] = useState([0, 0, 0, 0]);
  const [curveVisible, setCurveVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const curveRef = useRef(null);

  // Hero rings animate on load
  useEffect(() => {
    const targets = [72, 48, 85, 61];
    const timers = targets.map((t, i) =>
      setTimeout(() => {
        setAnimatedPcts(prev => { const n = [...prev]; n[i] = t; return n; });
      }, 300 + i * 180)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // 3-step animation cycles
  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 3), 2000);
    return () => clearInterval(t);
  }, []);

  // Score curve animates on scroll into view
  useEffect(() => {
    const el = curveRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setCurveVisible(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const heroRings = [
    { label: "Health", color: "#E8A87C", icon: "◎" },
    { label: "Career", color: "#E87C7C", icon: "▲" },
    { label: "Finance", color: "#7CE8A0", icon: "◇" },
    { label: "Relationships", color: "#E87CA0", icon: "◯" },
  ];

  // Life Wheel demo (static 50% for all)
  const DemoWheel = () => {
    const size = 320, cx = 160, cy = 160, maxR = 120;
    const demoPcts = [72, 48, 85, 61, 55, 78, 42, 66, 53, 70, 58, 80];
    const pts = CATS.map((c, i) => {
      const angle = (i / CATS.length) * 2 * Math.PI - Math.PI / 2;
      const r = (demoPcts[i] / 100) * maxR;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
    const gridPts = (pct) => CATS.map((_, i) => {
      const angle = (i / CATS.length) * 2 * Math.PI - Math.PI / 2;
      const r = (pct / 100) * maxR;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
    const poly = pts.map(p => `${p.x},${p.y}`).join(" ");
    return (
      <svg width={size} height={size} style={{ overflow: "visible", filter: "drop-shadow(0 0 40px rgba(255,215,0,0.15))" }}>
        {[25, 50, 75, 100].map(pct => (
          <polygon key={pct} points={gridPts(pct)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {CATS.map((c, i) => {
          const angle = (i / CATS.length) * 2 * Math.PI - Math.PI / 2;
          return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
        })}
        <polygon points={poly} fill="rgba(255,215,0,0.1)" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round" />
        {CATS.map((c, i) => {
          const angle = (i / CATS.length) * 2 * Math.PI - Math.PI / 2;
          const lx = cx + (maxR + 26) * Math.cos(angle);
          const ly = cy + (maxR + 26) * Math.sin(angle);
          return (
            <g key={i}>
              <text x={lx} y={ly - 3} textAnchor="middle" fill={c.color} fontSize="11" fontFamily="Georgia,serif">{c.icon}</text>
              <text x={lx} y={ly + 11} textAnchor="middle" fill="#555" fontSize="8" fontFamily="Georgia,serif">{demoPcts[i]}</text>
            </g>
          );
        })}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={CATS[i].color} stroke="#080808" strokeWidth="2" />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#FFD700" fontSize="24" fontFamily="Georgia,serif" fontWeight="bold">64</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#555" fontSize="9" fontFamily="Georgia,serif">overall</text>
      </svg>
    );
  };

  // 90-day score curve
  const ScoreCurve = () => {
    const w = 500, h = 120;
    const rawPoints = [50,48,51,49,52,54,51,53,56,54,57,55,58,60,57,59,62,61,63,65,62,64,67,65,68,70,67,69,72,71,73,75,72,74,77,75,78,80,77,79,82,80,83,85,82,84,87,85,88,90];
    const n = rawPoints.length;
    const pts = rawPoints.map((v, i) => ({
      x: (i / (n - 1)) * w,
      y: h - ((v - 44) / 50) * h,
    }));
    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;
    const visiblePts = curveVisible ? pts : pts.slice(0, 1);
    const visiblePath = visiblePts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </linearGradient>
          <clipPath id="curveClip">
            <rect x="0" y="0" width={curveVisible ? w : 0} height={h} style={{ transition: "width 2.5s ease" }} />
          </clipPath>
        </defs>
        <path d={areaD} fill="url(#curveGrad)" clipPath="url(#curveClip)" />
        <path d={pathD} fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" clipPath="url(#curveClip)" style={{ transition: "all 2.5s ease" }} />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={5} fill="#FFD700" style={{ opacity: curveVisible ? 1 : 0, transition: "opacity 0.5s ease 2.3s" }} />
      </svg>
    );
  };

  const NameInput = () => (
    <div style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto" }}>
      <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && nameInput.trim() && onEnter(nameInput.trim())}
        placeholder="What's your name?"
        style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "14px 18px", fontSize: 16, color: "#fff", fontFamily: "Georgia,serif", outline: "none" }} />
      <button onClick={() => nameInput.trim() && onEnter(nameInput.trim())} disabled={!nameInput.trim()}
        style={{ background: nameInput.trim() ? "#FFD700" : "rgba(255,215,0,0.2)", color: nameInput.trim() ? "#000" : "#666", border: "none", borderRadius: 10, padding: "14px 24px", fontSize: 16, fontFamily: "Georgia,serif", fontWeight: 700, cursor: nameInput.trim() ? "pointer" : "default", transition: "all 0.2s" }}>
        Begin
      </button>
    </div>
  );

  const steps = [
    { num: "01", label: "Set your goals", desc: "One goal per life area. Specific, measurable, yours.", icon: "◆" },
    { num: "02", label: "Check in daily", desc: "Two minutes. What happened. How you feel. Done.", icon: "◎" },
    { num: "03", label: "Get coached", desc: "AI feedback that knows your history and patterns.", icon: "★" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "Georgia, serif", color: "#e0e0e0" }}>
      <style>{`
        html, body { background: #080808 !important; margin: 0; padding: 0; }
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sooSpin { to{transform:rotate(360deg)} }
        .landing-section { background: #080808; }
        .landing-section-alt { background: #0d0d0d; }
      `}</style>

      {/* ── NAV ── */}
      <div className="landing-section" style={{ padding: "22px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#FFD700", fontSize: 20 }}>★</span>
          <span style={{ fontSize: 16, color: "#fff" }}>Stay on One</span>
        </div>
        <button onClick={() => setShowName(true)} style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 8, padding: "8px 22px", fontSize: 13, color: "#FFD700", cursor: "pointer", fontFamily: "Georgia,serif", transition: "all 0.2s" }}>
          Begin →
        </button>
      </div>

      {/* ── HERO ── */}
      <div className="landing-section" style={{ padding: "80px 40px 70px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          {/* Left — copy */}
          <div style={{ animation: "fadeUp 0.8s ease both" }}>
            <div style={{ fontSize: 11, color: "#FFD700", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 22, opacity: 0.7 }}>For the ones doing it alone</div>
            <h1 style={{ fontSize: 50, fontWeight: 400, color: "#fff", lineHeight: 1.18, margin: "0 0 26px" }}>
              You're not lazy.<br />
              <span style={{ color: "#FFD700" }}>You just have no one<br />to be accountable to.</span>
            </h1>
            <p style={{ fontSize: 17, color: "#888", lineHeight: 1.85, margin: "0 0 16px" }}>
              Your partner has their own problems. Your friends don't want to hear it every day. Your goals sit in your head with nowhere to go — and slowly, quietly, you start drifting.
            </p>
            <p style={{ fontSize: 17, color: "#aaa", lineHeight: 1.85, margin: "0 0 40px" }}>
              Stay on One is the accountability partner that shows up every single day. It remembers what you said yesterday. It notices when you're slipping. It tells you the truth — without judgment, without distraction, without its own agenda.
            </p>
            {!showName ? (
              <button onClick={() => setShowName(true)} style={{ background: "#FFD700", color: "#000", border: "none", borderRadius: 10, padding: "16px 38px", fontSize: 17, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 30px rgba(255,215,0,0.25)", transition: "all 0.2s" }}>
                Meet your accountability partner →
              </button>
            ) : (
              <NameInput />
            )}
            <div style={{ fontSize: 12, color: "#444", marginTop: 16 }}>Free · Private · No sign-up required · Your data stays on your device</div>
          </div>
          {/* Right — animated rings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeUp 0.8s ease 0.2s both" }}>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center", marginBottom: 4 }}>Your life, scored daily</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {heroRings.map((ring, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${ring.color}33`, borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", width: 72, height: 72 }}>
                    <svg width={72} height={72} style={{ transform: "rotate(-90deg)", display: "block" }}>
                      <circle cx={36} cy={36} r={30} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
                      <circle cx={36} cy={36} r={30} fill="none" stroke={ring.color} strokeWidth={5}
                        strokeDasharray={2 * Math.PI * 30}
                        strokeDashoffset={2 * Math.PI * 30 - (animatedPcts[i] / 100) * 2 * Math.PI * 30}
                        strokeLinecap="round"
                        style={{ transition: `stroke-dashoffset 1.2s ease ${0.4 + i * 0.2}s` }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 14, color: ring.color, lineHeight: 1 }}>{animatedPcts[i]}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa", textAlign: "center" }}>{ring.icon} {ring.label}</div>
                  <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${animatedPcts[i]}%`, background: ring.color, borderRadius: 2, transition: `width 1.2s ease ${0.4 + i * 0.2}s` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: "#444", fontStyle: "italic" }}>Scores move based on what you actually do — not what you plan to do</div>
          </div>
        </div>
      </div>

      {/* ── SOCIAL PROOF QUOTE BAR ── */}
      <div style={{ background: "rgba(255,215,0,0.04)", borderTop: "1px solid rgba(255,215,0,0.1)", borderBottom: "1px solid rgba(255,215,0,0.1)", padding: "24px 40px", textAlign: "center" }}>
        <p style={{ fontSize: 16, color: "#888", fontStyle: "italic", margin: 0 }}>
          "The most honest conversation you'll have today might be with your Coach."
        </p>
      </div>

      {/* ── THE PROBLEM ── */}
      <div className="landing-section-alt" style={{ padding: "90px 40px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 18 }}>The Problem</div>
            <h2 style={{ fontSize: 36, fontWeight: 400, color: "#fff", margin: "0 0 24px", lineHeight: 1.25 }}>Everyone around you<br />is distracted.</h2>
            <p style={{ fontSize: 16, color: "#888", lineHeight: 1.85, margin: "0 0 18px" }}>
              We live in the age of infinite content and zero accountability. You can watch 4 hours of someone else's life while your own goals quietly die.
            </p>
            <p style={{ fontSize: 16, color: "#888", lineHeight: 1.85, margin: "0 0 18px" }}>
              You know exactly what you need to do. The problem is there's no one standing with you while you do it. Not every day. Not with patience. Not with memory of what you said last Tuesday.
            </p>
            <p style={{ fontSize: 17, color: "#ddd", lineHeight: 1.85, margin: 0, fontStyle: "italic" }}>
              Until now.
            </p>
          </div>
          {/* Distraction visual */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Instagram scroll", time: "2h 14m", color: "#E87C7C", pct: 85 },
              { label: "Working on your goal", time: "0m", color: "#7CE8A0", pct: 2 },
              { label: "YouTube autoplay", time: "1h 42m", color: "#E8A87C", pct: 68 },
              { label: "Daily check-in", time: "2 min", color: "#FFD700", pct: 8 },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#ccc" }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: item.color }}>{item.time}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.pct}%`, background: item.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: "#444", textAlign: "center", fontStyle: "italic" }}>The average person's day</div>
          </div>
        </div>
      </div>

      {/* ── WHAT IT IS — 3 STEPS ── */}
      <div className="landing-section" style={{ padding: "90px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>What is Stay on One</div>
          <h2 style={{ fontSize: 36, fontWeight: 400, color: "#fff", textAlign: "center", margin: "0 0 16px" }}>A daily ritual for every area of your life.</h2>
          <p style={{ fontSize: 16, color: "#888", textAlign: "center", margin: "0 auto 60px", maxWidth: 560, lineHeight: 1.75 }}>
            12 life areas. One goal each. Two minutes a day. An AI Coach that knows your full story and tells you the truth.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ background: activeStep === i ? "rgba(255,215,0,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${activeStep === i ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "28px 24px", transition: "all 0.4s ease", position: "relative", overflow: "hidden" }}>
                {activeStep === i && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #FFD700, transparent)" }} />}
                <div style={{ fontSize: 11, color: activeStep === i ? "#FFD700" : "#444", letterSpacing: "0.15em", marginBottom: 16 }}>{s.num}</div>
                <div style={{ fontSize: 28, color: activeStep === i ? "#FFD700" : "#555", marginBottom: 14, transition: "color 0.4s" }}>{s.icon}</div>
                <div style={{ fontSize: 16, color: activeStep === i ? "#fff" : "#aaa", marginBottom: 10, transition: "color 0.4s" }}>{s.label}</div>
                <div style={{ fontSize: 13, color: "#666", lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── EMOTIONAL HOOK — 4 CARDS ── */}
      <div className="landing-section-alt" style={{ padding: "90px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>Your Accountability Partner</div>
          <h2 style={{ fontSize: 36, fontWeight: 400, color: "#fff", textAlign: "center", margin: "0 0 16px" }}>What no one else in your life will do.</h2>
          <p style={{ fontSize: 16, color: "#888", textAlign: "center", margin: "0 auto 56px", maxWidth: 540, lineHeight: 1.75 }}>
            Not therapy. Not a journal. Not a productivity app. Something that actually shows up for you — every day, without fail.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {[
              {
                icon: "◈", color: "#7CB9E8", title: "It remembers everything",
                body: "Every check-in you've ever done. Every promise you made to yourself. Every time you said \"I'll do better tomorrow.\" Your Coach holds all of it — and brings it up when it matters.",
                visual: (
                  <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                    {["Jan 14", "Jan 15", "Jan 16", "Today"].map((d, i) => (
                      <div key={i} style={{ flex: 1, background: i === 3 ? "rgba(124,185,232,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 3 ? "rgba(124,185,232,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 6, padding: "6px 4px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: i === 3 ? "#7CB9E8" : "#555" }}>{d}</div>
                        <div style={{ fontSize: 14, marginTop: 3 }}>{i === 3 ? "📝" : "✓"}</div>
                      </div>
                    ))}
                  </div>
                )
              },
              {
                icon: "◉", color: "#C9A7E8", title: "It tells you the truth",
                body: "No one in your life will tell you that you've been making the same excuse for three weeks. Your Coach will. Not to make you feel bad — to help you see the pattern you can't see from inside it.",
                visual: (
                  <div style={{ marginTop: 16, background: "rgba(201,167,232,0.08)", border: "1px solid rgba(201,167,232,0.2)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: "#C9A7E8", marginBottom: 4 }}>Coach · 3 weeks of data</div>
                    <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, fontStyle: "italic" }}>"This is the fourth time you've mentioned being tired. Let's talk about what's actually going on."</div>
                  </div>
                )
              },
              {
                icon: "✦", color: "#7CE8C3", title: "It never has a bad day",
                body: "It doesn't cancel. It doesn't get tired of hearing about your fitness goal. It doesn't have its own stress bleeding into your session. It shows up every day exactly the same way — fully present, fully focused on you.",
                visual: (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, padding: "10px 14px", background: "rgba(124,232,195,0.06)", border: "1px solid rgba(124,232,195,0.15)", borderRadius: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7CE8A0", animation: "pulse 2s infinite", flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: "#7CE8C3" }}>Coach is online · Day 1 or Day 180, same presence.</div>
                  </div>
                )
              },
              {
                icon: "★", color: "#FFD700", title: "It's not therapy. It's not a journal.",
                body: "Therapy looks backward. A journal doesn't talk back. Stay on One looks at where you are today and helps you take one step forward. Every single day.",
                visual: (
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    {[{ l: "Therapy", s: "Past focused", x: true }, { l: "Journal", s: "No feedback", x: true }, { l: "Stay on One", s: "Daily action", x: false }].map((item, i) => (
                      <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 6px", background: item.x ? "rgba(255,255,255,0.02)" : "rgba(255,215,0,0.08)", border: `1px solid ${item.x ? "rgba(255,255,255,0.06)" : "rgba(255,215,0,0.25)"}`, borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: item.x ? "#555" : "#FFD700", marginBottom: 3 }}>{item.x ? "✗" : "✓"}</div>
                        <div style={{ fontSize: 10, color: item.x ? "#555" : "#ddd" }}>{item.l}</div>
                        <div style={{ fontSize: 9, color: "#444", marginTop: 2 }}>{item.s}</div>
                      </div>
                    ))}
                  </div>
                )
              },
            ].map((card, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "26px 28px" }}>
                <div style={{ fontSize: 26, color: card.color, marginBottom: 14 }}>{card.icon}</div>
                <div style={{ fontSize: 16, color: "#ddd", marginBottom: 12 }}>{card.title}</div>
                <p style={{ fontSize: 14, color: "#777", lineHeight: 1.75, margin: 0 }}>{card.body}</p>
                {card.visual}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LIFE WHEEL ── */}
      <div className="landing-section" style={{ padding: "90px 40px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 70, alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <DemoWheel />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 18 }}>The Framework</div>
            <h2 style={{ fontSize: 36, fontWeight: 400, color: "#fff", margin: "0 0 20px", lineHeight: 1.25 }}>12 areas. One goal each.<br />Your whole life, finally in one place.</h2>
            <p style={{ fontSize: 15, color: "#888", lineHeight: 1.85, margin: "0 0 18px" }}>
              Most people have never looked at all 12 dimensions of their life at the same time. When you do, you notice things — that you've been crushing it at work while your health is a 3/10.
            </p>
            <p style={{ fontSize: 15, color: "#888", lineHeight: 1.85, margin: "0 0 28px" }}>
              The Life Wheel shows you the full picture. The daily check-in helps you do something about it.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {CATS.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(255,255,255,0.02)", border: `1px solid ${c.color}22`, borderRadius: 8 }}>
                  <span style={{ color: c.color, fontSize: 14 }}>{c.icon}</span>
                  <span style={{ fontSize: 12, color: "#aaa" }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 90-DAY CURVE ── */}
      <div className="landing-section-alt" style={{ padding: "90px 40px" }} ref={curveRef}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>The Compound Effect</div>
          <h2 style={{ fontSize: 36, fontWeight: 400, color: "#fff", margin: "0 0 16px" }}>What 90 days of showing up looks like.</h2>
          <p style={{ fontSize: 15, color: "#888", margin: "0 auto 48px", maxWidth: 500, lineHeight: 1.75 }}>
            Not a straight line. Not overnight. Just one honest check-in per day, compounding into something you couldn't have imagined on day one.
          </p>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "32px 36px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, color: "#555" }}>Day 1</div>
                <div style={{ fontSize: 22, color: "#888" }}>50</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#555" }}>Overall Score Journey</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#555" }}>Day 90</div>
                <div style={{ fontSize: 22, color: "#FFD700" }}>90</div>
              </div>
            </div>
            <ScoreCurve />
            <div style={{ fontSize: 12, color: "#444", marginTop: 16, fontStyle: "italic" }}>Fictional example. Your curve will be uniquely yours.</div>
          </div>
        </div>
      </div>

      {/* ── PSYCHOLOGY ── */}
      <div className="landing-section" style={{ padding: "90px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "center", marginBottom: 14 }}>Why It Works</div>
          <h2 style={{ fontSize: 36, fontWeight: 400, color: "#fff", textAlign: "center", margin: "0 0 50px" }}>Built on how humans actually change.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {[
              { title: "Identity over motivation", body: "Motivation fades. Identity compounds. Every time you check in, you cast a vote for who you're becoming. James Clear calls this the most powerful driver of lasting behaviour change." },
              { title: "The observer effect", body: "Kahneman showed that when we slow down and reflect, we make dramatically better decisions. The daily check-in forces exactly that — instead of drifting through another day on autopilot." },
              { title: "Specificity activates action", body: "Vague goals like \"get healthy\" fail because the brain cannot act on them. One specific goal per life area gives your mind a precise target and activates your planning brain." },
              { title: "Accountability changes behaviour", body: "People who track progress and report it to someone — even an AI — are significantly more likely to follow through. The simple act of being witnessed changes how you show up." },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "26px 28px" }}>
                <div style={{ fontSize: 15, color: "#FFD700", marginBottom: 12 }}>{item.title}</div>
                <p style={{ fontSize: 14, color: "#777", lineHeight: 1.8, margin: 0 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PAUL GRAHAM ── */}
      <div style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "80px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.04, pointerEvents: "none" }}>
          <span style={{ fontSize: 400, color: "#FFD700", lineHeight: 1 }}>★</span>
        </div>
        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <p style={{ fontSize: 22, color: "#bbb", fontStyle: "italic", lineHeight: 1.75, margin: "0 0 24px" }}>
            "The way to do really good work is to stay on one thing long enough that you go from knowing nothing to knowing something, and from knowing something to knowing more than anyone else."
          </p>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 28 }}>— Paul Graham</div>
          <div style={{ fontSize: 15, color: "#666", lineHeight: 1.7 }}>
            This app is built on that idea. Not hustle. Not hacks.<br />Just one thing, every day, long enough to matter.
          </div>
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div className="landing-section" style={{ padding: "100px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 580, margin: "0 auto" }}>
          <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 32px" }}>
            <svg width={90} height={90} style={{ transform: "rotate(-90deg)", display: "block" }}>
              <circle cx={45} cy={45} r={38} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
              <circle cx={45} cy={45} r={38} fill="none" stroke="#FFD700" strokeWidth={5}
                strokeDasharray={2 * Math.PI * 38}
                strokeDashoffset={2 * Math.PI * 38 * 0.35}
                strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 13, color: "#FFD700" }}>Day 1</span>
            </div>
          </div>
          <h2 style={{ fontSize: 38, fontWeight: 400, color: "#fff", margin: "0 0 18px", lineHeight: 1.2 }}>You already know what to work on.</h2>
          <p style={{ fontSize: 18, color: "#888", lineHeight: 1.75, margin: "0 0 14px" }}>The question is whether you'll have someone standing with you while you do it.</p>
          <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7, margin: "0 0 44px" }}>Start for free. No account needed. Just your name and the goal you've been putting off.</p>
          {!showName ? (
            <button onClick={() => setShowName(true)} style={{ background: "#FFD700", color: "#000", border: "none", borderRadius: 10, padding: "18px 44px", fontSize: 18, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 40px rgba(255,215,0,0.3)", transition: "all 0.2s" }}>
              Begin today →
            </button>
          ) : (
            <NameInput />
          )}
          <div style={{ fontSize: 12, color: "#444", marginTop: 18 }}>Free · Private · No sign-up required · Your data stays on your device</div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: "#080808", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "28px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#FFD700" }}>★</span>
          <span style={{ fontSize: 14, color: "#444" }}>Stay on One</span>
        </div>
        <div style={{ fontSize: 13, color: "#444" }}>Built for people who finish things.</div>
      </div>

    </div>
  );
}


// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ userName, onComplete }) {
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState([]);
  const [goalInputs, setGoalInputs] = useState({});
  const [currentGoalIdx, setCurrentGoalIdx] = useState(0);

  const togglePick = (id) => {
    if (picked.includes(id)) setPicked(picked.filter(p => p !== id));
    else if (picked.length < 3) setPicked([...picked, id]);
  };

  const handleGoalNext = () => {
    if (currentGoalIdx < picked.length - 1) {
      setCurrentGoalIdx(i => i + 1);
    } else {
      const finalGoals = {};
      const finalScores = {};
      picked.forEach(id => {
        const val = goalInputs[id]?.trim() || SUGGESTED_GOALS[id] || "";
        finalGoals[id] = { goal: val, metrics: "" };
        finalScores[id] = 50;
      });
      onComplete(finalGoals, finalScores);
    }
  };

  const currentCatId = picked[currentGoalIdx];
  const currentCat = cat(currentCatId);

  return (
    <div style={{ minHeight:"100vh",background:"#080808",fontFamily:"Georgia,serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px" }}>
      <style>{`html,body{background:#080808!important;margin:0;padding:0}*{box-sizing:border-box}`}</style>
      <div style={{ display:"flex",gap:8,marginBottom:48 }}>
        {[1,2].map(s => (
          <div key={s} style={{ width:s===step?28:8,height:8,borderRadius:4,background:s===step?"#FFD700":s<step?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.1)",transition:"all 0.3s ease" }} />
        ))}
      </div>

      {step === 1 && (
        <div style={{ maxWidth:700,width:"100%",textAlign:"center" }}>
          <div style={{ fontSize:11,color:"#FFD700",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:16,opacity:0.7 }}>Welcome, {userName}</div>
          <h2 style={{ fontSize:34,fontWeight:400,color:"#fff",margin:"0 0 14px" }}>Pick your top 3 life areas to start.</h2>
          <p style={{ fontSize:16,color:"#666",margin:"0 0 36px",lineHeight:1.7 }}>Don't try to fix everything at once. Pick the 3 areas that, if improved, would change everything else.</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:32 }}>
            {CATS.map(c => {
              const sel = picked.includes(c.id);
              const disabled = !sel && picked.length >= 3;
              return (
                <div key={c.id} onClick={() => !disabled && togglePick(c.id)}
                  style={{ background:sel?`rgba(${hexRgb(c.color)},0.15)`:"rgba(255,255,255,0.02)",border:`1px solid ${sel?c.color:"rgba(255,255,255,0.07)"}`,borderRadius:12,padding:"16px 10px",cursor:disabled?"default":"pointer",opacity:disabled?0.35:1,transition:"all 0.2s",textAlign:"center",position:"relative" }}>
                  {sel && <div style={{ position:"absolute",top:6,right:8,fontSize:11,color:c.color }}>✓</div>}
                  <div style={{ fontSize:22,color:c.color,marginBottom:8 }}>{c.icon}</div>
                  <div style={{ fontSize:12,color:sel?"#fff":"#aaa" }}>{c.name}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:13,color:"#555",marginBottom:20 }}>{picked.length}/3 selected</div>
          <button onClick={() => { if (picked.length > 0) setStep(2); }} disabled={picked.length === 0}
            style={{ background:picked.length>0?"#FFD700":"rgba(255,215,0,0.15)",color:picked.length>0?"#000":"#666",border:"none",borderRadius:10,padding:"14px 36px",fontSize:16,fontFamily:"Georgia,serif",fontWeight:700,cursor:picked.length>0?"pointer":"default" }}>
            {picked.length === 0 ? "Select at least 1" : `Continue with ${picked.length} area${picked.length>1?"s":""} \u2192`}
          </button>
          <p style={{ fontSize:12,color:"#444",marginTop:14 }}>You can add more goals later from the Goals page</p>
        </div>
      )}

      {step === 2 && currentCat && (
        <div style={{ maxWidth:540,width:"100%" }}>
          <div style={{ fontSize:12,color:"#555",textAlign:"center",marginBottom:24 }}>Goal {currentGoalIdx+1} of {picked.length}</div>
          <div style={{ background:`rgba(${hexRgb(currentCat.color)},0.06)`,border:`1px solid ${currentCat.color}44`,borderRadius:18,padding:"32px 34px",display:"flex",flexDirection:"column",gap:18 }}>
            <div style={{ display:"flex",alignItems:"center",gap:14 }}>
              <span style={{ fontSize:32,color:currentCat.color }}>{currentCat.icon}</span>
              <div>
                <div style={{ fontSize:20,color:currentCat.color }}>{currentCat.name}</div>
                <div style={{ fontSize:13,color:"#555",marginTop:2 }}>Set your one goal for this area</div>
              </div>
            </div>
            <div style={{ fontSize:12,color:"#555",fontStyle:"italic",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,padding:"10px 14px" }}>
              Suggested: {SUGGESTED_GOALS[currentCatId]}
            </div>
            <textarea rows={3}
              value={goalInputs[currentCatId] || ""}
              onChange={e => setGoalInputs(g => ({ ...g, [currentCatId]: e.target.value }))}
              placeholder={SUGGESTED_GOALS[currentCatId]}
              autoFocus
              style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 15px",fontSize:15,color:"#fff",fontFamily:"Georgia,serif",outline:"none",resize:"vertical",width:"100%" }} />
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={() => { setGoalInputs(g => ({ ...g, [currentCatId]: SUGGESTED_GOALS[currentCatId] })); handleGoalNext(); }}
                style={{ flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"12px",fontSize:13,color:"#aaa",cursor:"pointer",fontFamily:"Georgia,serif" }}>
                Use suggestion
              </button>
              <button onClick={() => { if (!goalInputs[currentCatId]?.trim()) setGoalInputs(g => ({ ...g, [currentCatId]: SUGGESTED_GOALS[currentCatId] })); handleGoalNext(); }}
                style={{ flex:2,background:"#FFD700",color:"#000",border:"none",borderRadius:9,padding:"12px",fontSize:15,fontFamily:"Georgia,serif",fontWeight:700,cursor:"pointer" }}>
                {currentGoalIdx < picked.length-1 ? "Next \u2192" : "Done \u2014 Let\u2019s go \u2192"}
              </button>
            </div>
          </div>
          {currentGoalIdx > 0 && (
            <button onClick={() => setCurrentGoalIdx(i => i-1)} style={{ background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:13,fontFamily:"Georgia,serif",marginTop:16,display:"block" }}>\u2190 Back</button>
          )}
        </div>
      )}
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
    let greeting = "";
    if (completedGoals.length === 0) {
      greeting = `Hey ${userName || "there"}, I'm Coach. Start by setting a goal in any life area and I'll help you think it through.`;
    } else {
      const allLogs = completedGoals.flatMap(id => (logs[parseInt(id)] || []).map(l => ({ ...l, catId: parseInt(id) })));
      const recentLogs = allLogs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
      const lastLogDays = recentLogs.length ? daysSince(recentLogs[0].date) : null;
      const streaks = completedGoals.map(id => ({ id, streak: getStreak(logs[parseInt(id)] || []) }));
      const bestStreak = streaks.sort((a, b) => b.streak - a.streak)[0];
      const coldGoals = completedGoals.filter(id => { const ls = logs[parseInt(id)] || []; return ls.length === 0 || daysSince(ls[ls.length-1]?.date) > 3; });
      if (lastLogDays === 0) {
        const last = recentLogs[0];
        const c = cat(last.catId);
        greeting = `Hey ${userName} — you checked in on ${c?.name} today. ${last.delta >= 0 ? `+${last.delta} pts.` : `${last.delta} pts.`} ${coldGoals.length > 0 ? `${cat(parseInt(coldGoals[0]))?.name} hasn\'t been touched in a while though. Want to talk about it?` : "What else is on your mind?"}`;
      } else if (bestStreak && bestStreak.streak >= 3) {
        const c = cat(parseInt(bestStreak.id));
        greeting = `Hey ${userName} — you\'re on a ${bestStreak.streak}-day streak on ${c?.name}. That\'s real momentum. ${coldGoals.length > 0 ? `But ${cat(parseInt(coldGoals[0]))?.name} needs attention.` : "How can I help today?"}`;
      } else if (coldGoals.length > 0) {
        const c = cat(parseInt(coldGoals[0]));
        greeting = `Hey ${userName} — ${c?.name} hasn\'t had a check-in in a while. I\'m not judging, but I notice. What\'s been going on there?`;
      } else {
        greeting = `Hey ${userName}, I know all ${completedGoals.length} of your goals. What do you want to work through today?`;
      }
    }
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


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loaded, setLoaded]         = useState(false);
  const [screen, setScreen]         = useState("landing");
  const [tab, setTab]               = useState("setup");
  const [activeId, setActiveId]     = useState(null);
  const [userName, setUserName]     = useState("");
  const [goals, setGoals]           = useState({});
  const [scores, setScores]         = useState({});
  const [logs, setLogs]             = useState({});
  const [chats, setChats]           = useState({});
  const [vision, setVision]         = useState("");
  const [editGoal, setEditGoal]     = useState({ goal: "", metrics: "" });
  const [ciLoading, setCiLoading]   = useState(false);
  const [ciFeedback, setCiFeedback] = useState({});
  const [prevScores, setPrevScores] = useState({});
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [dailyActive, setDailyActive] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    (async () => {
      const d = await store.get("soo3");
      if (d) {
        setUserName(d.userName || ""); setGoals(d.goals || {}); setScores(d.scores || {});
        setLogs(d.logs || {}); setChats(d.chats || {}); setVision(d.vision || "");
        if (d.userName) { setScreen("app"); setTab(Object.keys(d.goals || {}).length ? "dashboard" : "setup"); }
      }
      setLoaded(true);
    })();
  }, []);

  const save = (patch = {}) => store.set("soo3", { userName, goals, scores, logs, chats, vision, ...patch });
  const handleEnter = (name) => { setUserName(name); setScreen("onboarding"); save({ userName: name }); };
  const handleOnboardComplete = (newGoals, newScores) => {
    setGoals(newGoals); setScores(newScores); setScreen("app"); setTab("dailycheckin");
    setDailyActive(Object.keys(newGoals).map(Number)[0]);
    save({ goals: newGoals, scores: newScores });
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
  const removeGoal = () => { const ng = { ...goals }; delete ng[activeId]; setGoals(ng); save({ goals: ng }); setTab("setup"); };

  const submitCheckin = async (id, note, mood) => {
    const targetId = id || activeId;
    setCiLoading(true);
    const recent = (logs[targetId] || []).slice(-5).map(l => `${l.date}: ${l.note} (mood ${l.mood}/5)`).join("\n");
    const reply = await callClaude(
      [{ role: "user", content: `Goal: ${goals[targetId]?.goal}\nRecent history:\n${recent || "First check-in"}\n\nToday ${todayStr()}, mood ${mood}/5:\n${note}` }],
      `You are an accountability coach. In 2-3 sentences: acknowledge what they did, assess if it moved them toward or away from their goal, give one sharp insight. Reference their history if relevant. End with exactly: DELTA:+8 or DELTA:-5 (range -20 to +20). Nothing after.`
    );
    const match = reply.match(/DELTA:([+-]?\d+)/);
    const delta = match ? parseInt(match[1]) : 0;
    const clean = reply.replace(/DELTA:[+-]?\d+/, "").trim();
    const oldScore = sc(targetId);
    const newScore = Math.max(0, Math.min(100, oldScore + delta));
    const entry = { date: todayStr(), note, mood, delta, aiReply: clean };
    const nl = { ...logs, [targetId]: [...(logs[targetId] || []), entry] };
    const ns = { ...scores, [targetId]: newScore };
    setPrevScores(p => ({ ...p, [targetId]: oldScore }));
    setLogs(nl); setScores(ns);
    setCiFeedback(prev => ({ ...prev, [targetId]: { text: clean, delta, newScore, oldScore } }));
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
    const reply = await callClaude(updated.map(m => ({ role: m.role, content: m.content })), `You are a focused coach for ${userName}'s goal in ${c?.name}: "${goals[activeId]?.goal}". Score: ${sc(activeId)}/100. Be specific and direct.`);
    const nc = { ...chats, [activeId]: [...updated, { role: "assistant", content: reply }] };
    setChats(nc); setChatLoading(false); save({ chats: nc });
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const generateVision = async () => {
    setVisionLoading(true);
    const goalsText = doneIds.map(id => `${cat(id)?.name} (score ${sc(id)}/100, ${(logs[id]||[]).length} check-ins): ${goals[id].goal}`).join("\n");
    const reply = await callClaude([{ role: "user", content: `Name: ${userName}\nGoals:\n${goalsText}\n\nWrite their Life Vision.` }], `You are a master life architect. Create a profound personal Life Vision manifesto in second person. Inspired by Paul Graham: greatness compounds. Structure: opening identity, key themes, ONE core thread, 90-day challenge, closing commitment. Bold, specific, poetic.`);
    setVision(reply); setVisionLoading(false); save({ vision: reply });
  };

  if (!loaded) return (
    <div style={{ minHeight:"100vh",background:"#080808",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ width:36,height:36,border:"2px solid rgba(255,215,0,0.2)",borderTop:"2px solid #FFD700",borderRadius:"50%",animation:"sooSpin 1s linear infinite" }} />
      <style>{`@keyframes sooSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (screen === "landing") return <LandingPage onEnter={handleEnter} />;
  if (screen === "onboarding") return <Onboarding userName={userName} onComplete={handleOnboardComplete} />;

  // ── DAILY CHECK-IN ──────────────────────────────────────────────────────────
  const DailyCheckin = () => {
    const [notes, setNotes] = useState({});
    const [moods, setMoods] = useState({});
    const pending = doneIds.filter(id => !todayLogged(id));
    const done = doneIds.filter(id => todayLogged(id));
    const current = dailyActive || (pending.length > 0 ? pending[0] : null);

    if (doneIds.length === 0) return (
      <div style={{ padding:"80px 26px",textAlign:"center" }}>
        <div style={{ fontSize:40,marginBottom:16 }}>◎</div>
        <h2 style={{ fontSize:22,fontWeight:400,color:"#fff",margin:"0 0 10px" }}>No goals set yet</h2>
        <p style={{ color:"#666",fontSize:15,margin:"0 0 8px" }}>Set at least one goal to start your daily check-in.</p>
        <p style={{ color:"#555",fontSize:13,margin:"0 0 24px" }}>Go to Goals in the nav, pick a life area, and write your one goal for it.</p>
        <button onClick={() => setTab("setup")} style={{ background:"#FFD700",color:"#000",border:"none",borderRadius:9,padding:"12px 24px",fontSize:15,fontFamily:"Georgia,serif",fontWeight:700,cursor:"pointer" }}>Set Goals &rarr;</button>
      </div>
    );

    return (
      <div style={{ padding:"34px 26px",maxWidth:1100,margin:"0 auto" }}>
        <div style={{ marginBottom:30 }}>
          <h2 style={{ fontSize:26,fontWeight:400,color:"#fff",margin:"0 0 6px" }}>Daily Check-in &middot; {todayStr()}</h2>
          <p style={{ color:"#666",fontSize:14,margin:0 }}>{pending.length} remaining &middot; {done.length} completed today</p>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"260px 1fr",gap:24 }}>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            <div style={{ fontSize:11,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6 }}>Your Goals</div>
            {doneIds.map(id => {
              const c = cat(id);
              const logged = todayLogged(id);
              const isActive = current === id;
              const streak = getStreak(logs[id] || []);
              return (
                <div key={id} onClick={() => setDailyActive(id)}
                  style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,cursor:"pointer",background:isActive?`rgba(${hexRgb(c?.color||"#FFD700")},0.1)`:"rgba(255,255,255,0.02)",border:`1px solid ${isActive?c?.color+"55":"rgba(255,255,255,0.06)"}`,transition:"all 0.15s" }}>
                  <span style={{ color:c?.color,fontSize:16 }}>{c?.icon}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,color:isActive?"#fff":"#aaa" }}>{c?.name}</div>
                    <div style={{ fontSize:11,color:"#555",display:"flex",gap:6 }}>
                      <span>{sc(id)}/100</span>
                      {streak > 0 && <span style={{ color:"#FF9500" }}>&#128293;{streak}</span>}
                    </div>
                  </div>
                  {logged
                    ? <span style={{ fontSize:14,color:"#7CE8A0" }}>&#10003;</span>
                    : <span style={{ fontSize:10,color:"#E8D07C",background:"rgba(232,208,124,0.1)",border:"1px solid rgba(232,208,124,0.2)",borderRadius:10,padding:"2px 7px" }}>due</span>}
                </div>
              );
            })}
            {done.length === doneIds.length && (
              <div style={{ marginTop:12,padding:"14px",background:"rgba(124,232,160,0.08)",border:"1px solid rgba(124,232,160,0.2)",borderRadius:10,textAlign:"center" }}>
                <div style={{ fontSize:18,marginBottom:6 }}>&#127881;</div>
                <div style={{ fontSize:13,color:"#7CE8A0" }}>All done for today!</div>
                <div style={{ fontSize:11,color:"#555",marginTop:4 }}>Come back tomorrow</div>
              </div>
            )}
          </div>

          {current ? (() => {
            const c = cat(current);
            const logged = todayLogged(current);
            const feedback = ciFeedback[current];
            const note = notes[current] || "";
            const mood = moods[current] || 3;
            const allLogs = logs[current] || [];
            const yesterday = allLogs.filter(l => l.date !== todayStr()).slice(-1)[0];
            const streak = getStreak(allLogs);

            return (
              <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                <div style={{ display:"flex",alignItems:"center",gap:14,padding:"20px 24px",background:`rgba(${hexRgb(c?.color||"#FFD700")},0.06)`,border:`1px solid ${c?.color}33`,borderRadius:16 }}>
                  <span style={{ fontSize:28,color:c?.color }}>{c?.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:17,color:c?.color }}>{c?.name}</div>
                    <div style={{ fontSize:13,color:"#777",marginTop:2 }}>{goals[current]?.goal}</div>
                    {streak > 0 && <div style={{ fontSize:12,color:"#FF9500",marginTop:4 }}>&#128293; {streak}-day streak</div>}
                  </div>
                  <AnimatedRing pct={sc(current)} prevPct={prevScores[current]} color={c?.color||"#FFD700"} size={58} stroke={5} />
                </div>

                {yesterday && !logged && !feedback && (
                  <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 18px" }}>
                    <div style={{ fontSize:11,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8 }}>Yesterday you said</div>
                    <div style={{ fontSize:13,color:"#aaa",lineHeight:1.6,fontStyle:"italic" }}>"{yesterday.note.slice(0,120)}{yesterday.note.length>120?"...":""}"</div>
                    {yesterday.aiReply && <div style={{ fontSize:12,color:"#666",marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.06)" }}>Coach said: "{yesterday.aiReply.slice(0,100)}..."</div>}
                  </div>
                )}

                {logged && !feedback ? (
                  <div style={{ padding:"30px",textAlign:"center",background:"rgba(124,232,160,0.05)",border:"1px solid rgba(124,232,160,0.2)",borderRadius:14 }}>
                    <div style={{ fontSize:28,marginBottom:10 }}>&#10003;</div>
                    <div style={{ fontSize:15,color:"#7CE8A0" }}>Logged today</div>
                    <div style={{ fontSize:13,color:"#555",marginTop:6 }}>{allLogs.slice(-1)[0]?.aiReply?.slice(0,120)}</div>
                  </div>
                ) : feedback ? (
                  <div style={{ background:`rgba(${hexRgb(c?.color||"#FFD700")},0.06)`,border:`1px solid ${c?.color}33`,borderRadius:14,padding:"22px 24px" }}>
                    <div style={{ fontSize:11,color:c?.color,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12 }}>Coach Feedback</div>
                    <p style={{ fontSize:14,color:"#ddd",lineHeight:1.7,whiteSpace:"pre-wrap",margin:"0 0 16px" }}>{feedback.text}</p>
                    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
                      <span style={{ fontSize:13,color:feedback.delta>=0?"#7CE8A0":"#E87C7C",fontWeight:700 }}>{feedback.delta>=0?"+":""}{feedback.delta} pts</span>
                      <span style={{ fontSize:13,color:"#555" }}>&rarr;</span>
                      <AnimatedRing pct={feedback.newScore} prevPct={feedback.oldScore} color={c?.color||"#FFD700"} size={46} stroke={4} />
                    </div>
                    <Bar val={feedback.newScore} color={c?.color||"#FFD700"} />
                    {pending.filter(id => id !== current).length > 0 && (
                      <button onClick={() => { setDailyActive(pending.filter(id=>id!==current)[0]); setCiFeedback(p=>({...p,[current]:undefined})); setNotes(n=>({...n,[current]:""})); setMoods(m=>({...m,[current]:3})); }}
                        style={{ marginTop:16,background:"#FFD700",color:"#000",border:"none",borderRadius:8,padding:"10px 20px",fontSize:13,fontFamily:"Georgia,serif",fontWeight:700,cursor:"pointer" }}>
                        Next Goal &rarr;
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <div style={{ fontSize:11,color:"#666",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10 }}>How are you feeling about this goal today?</div>
                      <div style={{ display:"flex",gap:8 }}>
                        {["\uD83D\uDE14","\uD83D\uDE10","\uD83D\uDE42","\uD83D\uDE0A","\uD83D\uDD25"].map((emoji, i) => (
                          <button key={i} onClick={() => setMoods(m => ({ ...m, [current]: i+1 }))}
                            style={{ flex:1,border:`1px solid ${mood===i+1?(c?.color||"#FFD700"):"rgba(255,255,255,0.1)"}`,background:mood===i+1?`rgba(${hexRgb(c?.color||"#FFD700")},0.15)`:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px 0",fontSize:20,cursor:"pointer" }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:11,color:"#666",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10 }}>What happened toward this goal today?</div>
                      <textarea rows={4} value={note} onChange={e => setNotes(n => ({ ...n, [current]: e.target.value }))}
                        placeholder="Be specific. What did you do, skip, or decide? The more honest, the better the feedback."
                        style={{ width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"13px 16px",fontSize:14,color:"#fff",fontFamily:"Georgia,serif",outline:"none",resize:"vertical" }} />
                    </div>
                    <button onClick={() => submitCheckin(current, note, mood)} disabled={!note.trim() || ciLoading}
                      style={{ background:note.trim()?"#FFD700":"rgba(255,215,0,0.15)",color:note.trim()?"#000":"#666",border:"none",borderRadius:10,padding:"14px",fontSize:15,fontFamily:"Georgia,serif",fontWeight:700,cursor:note.trim()?"pointer":"default" }}>
                      {ciLoading ? "Analyzing..." : "Log & Get AI Feedback"}
                    </button>
                  </>
                )}
                <div style={{ padding:"16px 20px",background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.12)",borderRadius:12,display:"flex",alignItems:"center",gap:14 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#FFD700,#FF9500)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#000",flexShrink:0 }}>C</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,color:"#ddd" }}>Want to go deeper?</div>
                    <div style={{ fontSize:12,color:"#666" }}>Open Coach (bottom-right) to analyse your {c?.name} journey, patterns, and next steps.</div>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div style={{ textAlign:"center",padding:"60px 20px",color:"#666" }}>
              <div style={{ fontSize:14 }}>Select a goal from the left to check in</div>
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
        <div style={{ display:"flex",justifyContent:"center",padding:"36px 20px" }}>
          <div style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:18,padding:34,maxWidth:540,width:"100%",display:"flex",flexDirection:"column",gap:16 }}>
            <button onClick={() => setTab("setup")} style={{ background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:14,fontFamily:"Georgia,serif",padding:0,textAlign:"left" }}>&larr; Back</button>
            <div style={{ fontSize:32,color:c?.color }}>{c?.icon}</div>
            <h2 style={{ fontSize:24,fontWeight:400,color:c?.color,margin:0 }}>{c?.name}</h2>
            {!goals[activeId] && SUGGESTED_GOALS[activeId] && (
              <div style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#666",fontStyle:"italic" }}>
                Suggested: {SUGGESTED_GOALS[activeId]}
                <button onClick={() => setEditGoal(g => ({ ...g, goal: SUGGESTED_GOALS[activeId] }))} style={{ display:"block",marginTop:6,background:"none",border:"none",color:"#FFD700",cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif",padding:0 }}>Use this &rarr;</button>
              </div>
            )}
            <label style={{ fontSize:11,color:"#666",letterSpacing:"0.1em",textTransform:"uppercase" }}>Your ONE long-term goal</label>
            <textarea rows={3} placeholder="Be specific. Vague goals create vague lives."
              value={editGoal.goal} onChange={e => setEditGoal(g => ({ ...g, goal: e.target.value }))} autoFocus
              style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 15px",fontSize:15,color:"#fff",fontFamily:"Georgia,serif",outline:"none",resize:"vertical",width:"100%" }} />
            <label style={{ fontSize:11,color:"#666",letterSpacing:"0.1em",textTransform:"uppercase" }}>How will you measure it? (optional)</label>
            <input placeholder="e.g. workout 5x/week, body fat %, revenue..."
              value={editGoal.metrics} onChange={e => setEditGoal(g => ({ ...g, metrics: e.target.value }))}
              style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 15px",fontSize:15,color:"#fff",fontFamily:"Georgia,serif",outline:"none" }} />
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={saveGoal} disabled={!editGoal.goal.trim()}
                style={{ flex:1,background:editGoal.goal.trim()?"#FFD700":"rgba(255,215,0,0.15)",color:editGoal.goal.trim()?"#000":"#666",border:"none",borderRadius:9,padding:"12px",fontSize:15,fontFamily:"Georgia,serif",fontWeight:700,cursor:editGoal.goal.trim()?"pointer":"default" }}>
                Save Goal
              </button>
              {goals[activeId] && <button onClick={removeGoal} style={{ background:"none",border:"1px solid rgba(232,124,124,0.3)",borderRadius:9,padding:"12px 16px",fontSize:13,color:"#E87C7C",cursor:"pointer",fontFamily:"Georgia,serif" }}>Remove</button>}
            </div>
          </div>
        </div>
      );
    }

    if (tab === "setup") return (
      <div style={{ padding:"34px 26px",maxWidth:1000,margin:"0 auto" }}>
        <h2 style={{ fontSize:26,fontWeight:400,color:"#fff",margin:"0 0 8px" }}>Your Life Goals</h2>
        <p style={{ color:"#666",fontSize:15,margin:"0 0 26px" }}>One goal per life area. Click any area to set or edit your goal.</p>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:10 }}>
          {CATS.map(c => {
            const has = !!goals[c.id]?.goal;
            const s = sc(c.id);
            const streak = has ? getStreak(logs[c.id] || []) : 0;
            return (
              <div key={c.id} onClick={() => { setActiveId(c.id); setEditGoal({ goal: goals[c.id]?.goal || "", metrics: goals[c.id]?.metrics || "" }); setTab("goalEntry"); }}
                style={{ background:"rgba(255,255,255,0.03)",border:`1px solid ${has?c.color+"55":"rgba(255,255,255,0.07)"}`,borderRadius:12,padding:16,cursor:"pointer",display:"flex",flexDirection:"column",gap:6 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ color:c.color,fontSize:20 }}>{c.icon}</span>
                  <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                    {streak > 0 && <span style={{ fontSize:11,color:"#FF9500" }}>&#128293;{streak}</span>}
                    {has && <span style={{ fontSize:12,color:c.color,fontWeight:700 }}>{s}</span>}
                  </div>
                </div>
                <div style={{ fontSize:14,color:"#ddd" }}>{c.name}</div>
                <div style={{ fontSize:12,color:has?"#888":"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{has?goals[c.id].goal:"+ Set goal"}</div>
                {has && <Bar val={s} color={c.color} />}
              </div>
            );
          })}
        </div>
        {doneIds.length > 0 && (
          <button onClick={() => setTab("dashboard")} style={{ marginTop:24,background:"#FFD700",color:"#000",border:"none",borderRadius:9,padding:"12px 28px",fontSize:15,fontFamily:"Georgia,serif",fontWeight:700,cursor:"pointer" }}>Go to Dashboard &rarr;</button>
        )}
      </div>
    );

    if (tab === "dailycheckin") return <DailyCheckin />;

    if (tab === "dashboard") {
      const avg = doneIds.length ? Math.round(doneIds.reduce((a, id) => a + sc(id), 0) / doneIds.length) : 0;
      const needCheckin = doneIds.filter(id => !todayLogged(id));
      const totalLogs = doneIds.reduce((a, id) => a + (logs[id]?.length || 0), 0);
      const bestStreak = doneIds.length ? Math.max(...doneIds.map(id => getStreak(logs[id] || []))) : 0;
      const allRecentLogs = doneIds.flatMap(id => (logs[id] || []).map(l => ({ ...l, catId: id }))).sort((a, b) => b.date.localeCompare(a.date));
      const lastLogDate = allRecentLogs[0]?.date;
      const daysSinceLast = lastLogDate ? daysSince(lastLogDate) : null;

      let greetingMsg = "";
      if (totalLogs === 0) {
        greetingMsg = "You've set your goals. Now start your first check-in — two minutes, that's all it takes.";
      } else if (daysSinceLast === 0) {
        const last = allRecentLogs[0];
        const c = cat(last.catId);
        greetingMsg = `You checked in on ${c?.name} today. ${last.delta >= 0 ? `+${last.delta} pts.` : `${last.delta} pts.`} Keep going.`;
      } else if (daysSinceLast === 1) {
        greetingMsg = `Yesterday was your last check-in. ${needCheckin.length} goal${needCheckin.length !== 1 ? "s" : ""} waiting for today.`;
      } else if (daysSinceLast && daysSinceLast > 1) {
        greetingMsg = `You haven't checked in for ${daysSinceLast} days. That's okay. The streak starts again today.`;
      } else {
        greetingMsg = `${needCheckin.length} goal${needCheckin.length !== 1 ? "s" : ""} waiting for today's check-in.`;
      }

      return (
        <div style={{ padding:"34px 26px",maxWidth:1100,margin:"0 auto" }}>
          <div style={{ background:"linear-gradient(135deg,rgba(255,215,0,0.06),rgba(255,150,0,0.03))",border:"1px solid rgba(255,215,0,0.15)",borderRadius:16,padding:"22px 26px",marginBottom:22 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16 }}>
              <div>
                <h2 style={{ fontSize:26,fontWeight:400,color:"#fff",margin:"0 0 8px" }}>Good {timeOfDay()}, {userName}.</h2>
                <p style={{ color:"#aaa",fontSize:15,margin:0,lineHeight:1.6 }}>{greetingMsg}</p>
                <p style={{ color:"#555",fontSize:13,margin:"6px 0 0",fontStyle:"italic" }}>"{PGQ[new Date().getDay() % PGQ.length]}"</p>
              </div>
              <div style={{ display:"flex",gap:20,flexShrink:0 }}>
                <div style={{ textAlign:"center" }}><div style={{ fontSize:30,color:"#FFD700",lineHeight:1 }}>{avg}</div><div style={{ fontSize:11,color:"#555",marginTop:3 }}>overall</div></div>
                <div style={{ textAlign:"center" }}><div style={{ fontSize:30,color:"#FF9500",lineHeight:1 }}>{bestStreak > 0 ? `&#128293;${bestStreak}` : "&#8212;"}</div><div style={{ fontSize:11,color:"#555",marginTop:3 }}>best streak</div></div>
                <div style={{ textAlign:"center" }}><div style={{ fontSize:30,color:"#7CB9E8",lineHeight:1 }}>{totalLogs}</div><div style={{ fontSize:11,color:"#555",marginTop:3 }}>check-ins</div></div>
              </div>
            </div>
          </div>

          {needCheckin.length > 0 && (
            <div style={{ display:"flex",alignItems:"center",gap:12,background:"rgba(255,215,0,0.07)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:22 }}>
              <span style={{ color:"#FFD700" }}>&#9733;</span>
              <span style={{ fontSize:14,color:"#ddd" }}>{needCheckin.length} goal{needCheckin.length > 1 ? "s" : ""} awaiting today's check-in</span>
              <button onClick={() => { setDailyActive(needCheckin[0]); setTab("dailycheckin"); }}
                style={{ marginLeft:"auto",background:"rgba(255,215,0,0.15)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:7,padding:"6px 14px",fontSize:13,color:"#FFD700",cursor:"pointer",fontFamily:"Georgia,serif" }}>
                Start Daily Check-in
              </button>
            </div>
          )}

          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(285px,1fr))",gap:15 }}>
            {doneIds.map(id => {
              const c = cat(id);
              const s = sc(id);
              const logList = logs[id] || [];
              const logged = todayLogged(id);
              const last7 = logList.slice(-7);
              const streak = getStreak(logList);
              const trend = last7.length ? (last7[last7.length-1].delta > 0 ? "&#8593;" : last7[last7.length-1].delta < 0 ? "&#8595;" : "&#8212;") : "&#8212;";
              return (
                <div key={id} style={{ background:"rgba(255,255,255,0.03)",border:`1px solid ${c?.color}33`,borderRadius:16,padding:20,display:"flex",flexDirection:"column",gap:8 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <span style={{ color:c?.color,fontSize:20 }}>{c?.icon}</span>
                      <div>
                        <div style={{ fontSize:13,color:c?.color }}>{c?.name}</div>
                        <div style={{ fontSize:11,color:"#555",display:"flex",gap:6 }}>
                          <span>{logList.length} check-ins</span>
                          {streak > 0 && <span style={{ color:streak>=7?"#FF6500":"#FF9500" }}>&#128293; {streak}d</span>}
                        </div>
                      </div>
                    </div>
                    <AnimatedRing pct={s} prevPct={prevScores[id]} color={c?.color||"#FFD700"} size={50} stroke={4} />
                  </div>
                  <p style={{ fontSize:13,color:"#999",lineHeight:1.5,margin:0 }}>{goals[id].goal}</p>
                  {last7.length > 0 && (
                    <div style={{ display:"flex",gap:3,alignItems:"flex-end",height:22 }}>
                      {last7.map((l, i) => <div key={i} style={{ flex:1,minHeight:3,height:`${Math.max(12,Math.abs(l.delta)/20*100)}%`,background:l.delta>=0?(c?.color||"#FFD700")+"88":"#E87C7C88",borderRadius:2 }} />)}
                    </div>
                  )}
                  <div style={{ display:"flex",gap:7 }}>
                    {!logged
                      ? <button onClick={() => { setDailyActive(id); setTab("dailycheckin"); }}
                          style={{ flex:1,background:`rgba(${hexRgb(c?.color||"#FFD700")},0.1)`,border:`1px solid ${c?.color}44`,borderRadius:7,padding:"6px",fontSize:12,color:c?.color,cursor:"pointer",fontFamily:"Georgia,serif" }}>
                          + Check in today
                        </button>
                      : <span style={{ fontSize:12,color:(c?.color||"#FFD700")+"aa",padding:"6px 0",flex:1 }}>&#10003; Logged</span>
                    }
                    <button onClick={() => { setActiveId(id); setTab("chat"); }} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"6px 10px",fontSize:12,color:"#aaa",cursor:"pointer",fontFamily:"Georgia,serif" }}>Coach</button>
                    <button onClick={() => { setActiveId(id); setTab("progress"); }} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"6px 10px",fontSize:12,color:"#aaa",cursor:"pointer",fontFamily:"Georgia,serif" }}>History</button>
                  </div>
                </div>
              );
            })}
          </div>

          {(() => {
            const unlocked = totalLogs >= 3;
            if (vision) return (
              <div onClick={() => setTab("vision")} style={{ marginTop:26,display:"flex",alignItems:"center",gap:14,background:"rgba(255,215,0,0.05)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:12,padding:"15px 20px",cursor:"pointer" }}>
                <span style={{ fontSize:20,color:"#FFD700" }}>&#9733;</span>
                <div><div style={{ fontSize:14,color:"#ddd" }}>Your Life Vision</div><div style={{ fontSize:12,color:"#666" }}>Click to view or regenerate</div></div>
                <span style={{ marginLeft:"auto",color:"#FFD700" }}>&rarr;</span>
              </div>
            );
            if (unlocked) return (
              <div style={{ marginTop:26,display:"flex",alignItems:"center",gap:14,background:"rgba(255,215,0,0.06)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:12,padding:"18px 22px" }}>
                <div>
                  <div style={{ fontSize:14,color:"#FFD700",marginBottom:4 }}>&#9733; Your Life Vision is ready</div>
                  <div style={{ fontSize:13,color:"#666" }}>You've logged {totalLogs} check-ins. You've earned this.</div>
                </div>
                <button onClick={() => { setTab("vision"); generateVision(); }} style={{ marginLeft:"auto",background:"#FFD700",color:"#000",border:"none",borderRadius:8,padding:"10px 20px",fontSize:14,fontFamily:"Georgia,serif",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>Generate &rarr;</button>
              </div>
            );
            return (
              <div style={{ marginTop:26,background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.08)",borderRadius:12,padding:"18px 22px",display:"flex",alignItems:"center",gap:14 }}>
                <span style={{ fontSize:18,color:"#444" }}>&#9733;</span>
                <div><div style={{ fontSize:14,color:"#555" }}>Life Vision unlocks after 3 check-ins</div><div style={{ fontSize:12,color:"#444",marginTop:2 }}>{totalLogs}/3 check-ins done</div></div>
                <div style={{ marginLeft:"auto",height:4,width:80,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden" }}><div style={{ height:"100%",width:`${Math.min(100,(totalLogs/3)*100)}%`,background:"#FFD700",borderRadius:2,transition:"width 0.6s ease" }} /></div>
              </div>
            );
          })()}
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
        <div style={{ padding:"60px 26px",textAlign:"center" }}>
          <div style={{ fontSize:40,marginBottom:16,color:"#333" }}>&#9678;</div>
          <h3 style={{ fontSize:18,fontWeight:400,color:"#555",margin:"0 0 10px" }}>No goal selected</h3>
          <p style={{ color:"#444",fontSize:14,margin:"0 0 24px" }}>Go to your dashboard and click "History" on any goal to see its progress here.</p>
          <button onClick={() => setTab("dashboard")} style={{ background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:8,padding:"10px 20px",fontSize:14,color:"#FFD700",cursor:"pointer",fontFamily:"Georgia,serif" }}>Go to Dashboard</button>
        </div>
      );
      const streak = getStreak(logList);
      const thisWeekLogs = logList.filter(l => { const d = new Date(l.date); const now = new Date(); const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate()-7); return d >= weekAgo; });
      const weekNet = thisWeekLogs.reduce((a, l) => a + l.delta, 0);
      return (
        <div style={{ padding:"34px 26px",maxWidth:900,margin:"0 auto" }}>
          <button onClick={() => setTab("dashboard")} style={{ background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:14,fontFamily:"Georgia,serif",padding:"0 0 18px",display:"block" }}>&larr; Back to Dashboard</button>
          <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:30 }}>
            <span style={{ color:c?.color,fontSize:28 }}>{c?.icon}</span>
            <div><h2 style={{ fontSize:24,fontWeight:400,color:"#fff",margin:"0 0 4px" }}>{c?.name} Progress</h2><p style={{ color:"#888",fontSize:13,margin:0 }}>{goals[activeId]?.goal}</p></div>
            <AnimatedRing pct={s} prevPct={undefined} color={c?.color||"#FFD700"} size={76} stroke={6} />
          </div>
          {thisWeekLogs.length > 0 && (
            <div style={{ background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:14,padding:"18px 22px",marginBottom:22 }}>
              <div style={{ fontSize:12,color:"#FFD700",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12 }}>This Week</div>
              <div style={{ display:"flex",gap:24,flexWrap:"wrap" }}>
                <div><div style={{ fontSize:20,color:weekNet>=0?"#7CE8A0":"#E87C7C" }}>{weekNet>=0?"+":""}{weekNet} pts</div><div style={{ fontSize:11,color:"#555" }}>net change</div></div>
                <div><div style={{ fontSize:20,color:"#FFD700" }}>{thisWeekLogs.length}</div><div style={{ fontSize:11,color:"#555" }}>check-ins</div></div>
                <div><div style={{ fontSize:20,color:"#FF9500" }}>{(thisWeekLogs.reduce((a,l)=>a+l.mood,0)/thisWeekLogs.length).toFixed(1)}/5</div><div style={{ fontSize:11,color:"#555" }}>avg mood</div></div>
                {thisWeekLogs.length > 0 && <div style={{ flex:1,minWidth:160 }}><div style={{ fontSize:12,color:"#555",marginBottom:4 }}>Best entry this week</div><div style={{ fontSize:13,color:"#aaa",fontStyle:"italic" }}>"{thisWeekLogs.reduce((b,l)=>l.delta>b.delta?l:b,thisWeekLogs[0]).note.slice(0,80)}..."</div></div>}
              </div>
            </div>
          )}
          <div style={{ display:"flex",gap:10,marginBottom:26,flexWrap:"wrap" }}>
            {[{l:"Total Logs",v:logList.length},{l:"This Month",v:(byMonth[monthStr()]||[]).length},{l:"Streak",v:`${streak}d`},{l:"Best",v:logList.length?`+${Math.max(...logList.map(l=>l.delta))}`:"--"},{l:"Avg Mood",v:logList.length?`${(logList.reduce((a,l)=>a+l.mood,0)/logList.length).toFixed(1)}/5`:"--"}].map(st => (
              <div key={st.l} style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 18px",flex:1,minWidth:80,textAlign:"center" }}>
                <div style={{ fontSize:22,color:c?.color }}>{st.v}</div>
                <div style={{ fontSize:11,color:"#666",marginTop:4 }}>{st.l}</div>
              </div>
            ))}
          </div>
          {logList.length === 0 && (
            <div style={{ textAlign:"center",padding:"60px 0" }}>
              <div style={{ fontSize:14,color:"#555",marginBottom:16 }}>No check-ins yet for this goal.</div>
              <div style={{ fontSize:13,color:"#444",marginBottom:24 }}>30 days from now this page will tell your story. Start today.</div>
              <button onClick={() => { setDailyActive(activeId); setTab("dailycheckin"); }} style={{ background:"#FFD700",color:"#000",border:"none",borderRadius:9,padding:"12px 24px",fontSize:14,fontFamily:"Georgia,serif",fontWeight:700,cursor:"pointer" }}>Start First Check-in &rarr;</button>
            </div>
          )}
          {Object.keys(byMonth).sort().reverse().map(m => (
            <div key={m} style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:20,marginBottom:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                <div style={{ fontSize:14,color:c?.color }}>{formatMonth(m)}</div>
                <div style={{ fontSize:13,color:"#888" }}>{byMonth[m].length} logs &middot; net {byMonth[m].reduce((a,l)=>a+l.delta,0)>=0?"+":""}{byMonth[m].reduce((a,l)=>a+l.delta,0)}</div>
              </div>
              <div style={{ display:"flex",gap:3,alignItems:"flex-end",height:38,marginBottom:12 }}>
                {byMonth[m].map((l, i) => <div key={i} style={{ flex:1,minWidth:4,height:`${Math.max(10,Math.abs(l.delta)/20*100)}%`,background:l.delta>=0?(c?.color||"#FFD700")+"99":"#E87C7C99",borderRadius:2 }} />)}
              </div>
              {byMonth[m].slice().reverse().map((l, i) => (
                <div key={i} style={{ display:"flex",gap:10,paddingBottom:8,marginBottom:8,borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize:12,color:"#666",whiteSpace:"nowrap",minWidth:48 }}>{l.date.slice(5)}</span>
                  <span style={{ fontSize:12,color:l.delta>=0?"#7CE8A0":"#E87C7C",whiteSpace:"nowrap" }}>{l.delta>=0?"+":""}{l.delta}</span>
                  <span style={{ fontSize:13,color:"#aaa",lineHeight:1.5 }}>{l.note}</span>
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
        <div style={{ padding:"60px 26px",textAlign:"center" }}>
          <div style={{ fontSize:40,marginBottom:16,color:"#333" }}>C</div>
          <h3 style={{ fontSize:18,fontWeight:400,color:"#555",margin:"0 0 10px" }}>No goal selected</h3>
          <p style={{ color:"#444",fontSize:14,margin:"0 0 24px" }}>Go to your dashboard and click "Coach" on any goal to open a dedicated coaching session.</p>
          <button onClick={() => setTab("dashboard")} style={{ background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:8,padding:"10px 20px",fontSize:14,color:"#FFD700",cursor:"pointer",fontFamily:"Georgia,serif" }}>Go to Dashboard</button>
        </div>
      );
      return (
        <div style={{ display:"flex",height:"calc(100vh - 58px)" }}>
          <div style={{ width:240,borderRight:"1px solid rgba(255,255,255,0.07)",padding:20,flexShrink:0,overflowY:"auto" }}>
            <button onClick={() => setTab("dashboard")} style={{ background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:14,fontFamily:"Georgia,serif",padding:"0 0 14px",display:"block" }}>&larr; Back</button>
            <div style={{ color:c?.color,fontSize:24,marginBottom:6 }}>{c?.icon}</div>
            <div style={{ fontSize:14,color:c?.color,marginBottom:8 }}>{c?.name}</div>
            <div style={{ fontSize:12,color:"#777",lineHeight:1.5,marginBottom:14 }}>{goals[activeId]?.goal}</div>
            <AnimatedRing pct={sc(activeId)} prevPct={undefined} color={c?.color||"#FFD700"} size={60} stroke={5} />
            <div style={{ fontSize:11,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",margin:"18px 0 10px" }}>Other Goals</div>
            {doneIds.filter(id => id !== activeId).map(id => {
              const cc = cat(id);
              return (<div key={id} onClick={() => setActiveId(id)} style={{ display:"flex",gap:8,alignItems:"center",padding:"7px 0",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.05)" }}><span style={{ color:cc?.color }}>{cc?.icon}</span><span style={{ fontSize:12,color:"#888" }}>{cc?.name}</span></div>);
            })}
          </div>
          <div style={{ flex:1,display:"flex",flexDirection:"column" }}>
            <div style={{ flex:1,overflowY:"auto",padding:"26px 34px",display:"flex",flexDirection:"column",gap:13 }}>
              {msgs.length === 0 && (
                <div style={{ textAlign:"center",padding:"60px 20px",color:"#666" }}>
                  <div style={{ fontSize:38,color:c?.color,marginBottom:10 }}>{c?.icon}</div>
                  <div style={{ fontSize:16,color:"#ddd",marginBottom:8 }}>Coaching for {c?.name}</div>
                  <div style={{ fontSize:14,lineHeight:1.6,maxWidth:340,margin:"0 auto",color:"#666" }}>Ask anything. I know your goal, your score, and your history. Let's figure out what's actually going on.</div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"70%",padding:"12px 16px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?`rgba(${hexRgb(c?.color||"#FFD700")},0.15)`:"rgba(255,255,255,0.05)",border:m.role==="user"?`1px solid ${c?.color}44`:"1px solid rgba(255,255,255,0.08)",fontSize:14,color:"#ddd",lineHeight:1.7,whiteSpace:"pre-wrap" }}>
                    <div style={{ fontSize:11,color:m.role==="user"?c?.color:"#555",marginBottom:5 }}>{m.role==="user"?"You":"Coach"}</div>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && <div style={{ display:"flex" }}><div style={{ padding:"12px 16px",background:"rgba(255,255,255,0.05)",borderRadius:"14px 14px 14px 4px",border:"1px solid rgba(255,255,255,0.08)",color:"#666",fontSize:14 }}>thinking...</div></div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding:"13px 26px",borderTop:"1px solid rgba(255,255,255,0.07)",background:"rgba(0,0,0,0.3)",display:"flex",gap:10 }}>
              <input style={{ flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,padding:"10px 14px",fontSize:14,color:"#fff",fontFamily:"Georgia,serif",outline:"none" }}
                placeholder={`Ask about your ${c?.name} goal...`}
                value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter" && sendGoalChat()} />
              <button onClick={sendGoalChat} disabled={!chatInput.trim() || chatLoading}
                style={{ background:c?.color||"#FFD700",border:"none",borderRadius:9,padding:"10px 18px",fontSize:16,color:"#000",cursor:"pointer" }}>&rarr;</button>
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
        const pts = doneIds.map((id, i) => { const angle = (i/n)*2*Math.PI - Math.PI/2; const r = (sc(id)/100)*maxR; return { x: cx+r*Math.cos(angle), y: cy+r*Math.sin(angle), id }; });
        const gridPts = (pct) => doneIds.map((_,i) => { const angle = (i/n)*2*Math.PI - Math.PI/2; const r = (pct/100)*maxR; return `${cx+r*Math.cos(angle)},${cy+r*Math.sin(angle)}`; }).join(" ");
        const poly = pts.map(p => `${p.x},${p.y}`).join(" ");
        return (
          <svg width={size} height={size} style={{ overflow:"visible" }}>
            {[25,50,75,100].map(pct => <polygon key={pct} points={gridPts(pct)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />)}
            {doneIds.map((id,i) => { const angle = (i/n)*2*Math.PI - Math.PI/2; return <line key={id} x1={cx} y1={cy} x2={cx+maxR*Math.cos(angle)} y2={cy+maxR*Math.sin(angle)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />; })}
            <polygon points={poly} fill="rgba(255,215,0,0.12)" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round" />
            {pts.map((p,i) => { const c = cat(p.id); return <circle key={i} cx={p.x} cy={p.y} r={4} fill={c?.color||"#FFD700"} stroke="#080808" strokeWidth="2" />; })}
            {doneIds.map((id,i) => { const angle = (i/n)*2*Math.PI - Math.PI/2; const lx = cx+(maxR+22)*Math.cos(angle); const ly = cy+(maxR+22)*Math.sin(angle); const c = cat(id); return <g key={id}><text x={lx} y={ly-4} textAnchor="middle" fill={c?.color||"#888"} fontSize="10" fontFamily="Georgia,serif">{c?.icon}</text><text x={lx} y={ly+10} textAnchor="middle" fill="#666" fontSize="8" fontFamily="Georgia,serif">{sc(id)}</text></g>; })}
            <text x={cx} y={cy-8} textAnchor="middle" fill="#FFD700" fontSize="22" fontFamily="Georgia,serif" fontWeight="bold">{avgScore}</text>
            <text x={cx} y={cy+10} textAnchor="middle" fill="#666" fontSize="9" fontFamily="Georgia,serif">overall</text>
          </svg>
        );
      };
      return (
        <div style={{ padding:"34px 26px",maxWidth:960,margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:40 }}>
            <div style={{ fontSize:46,color:"#FFD700" }}>&#9733;</div>
            <h2 style={{ fontSize:30,fontWeight:400,color:"#fff",margin:"12px 0 8px" }}>{userName}'s Life Vision</h2>
            <p style={{ color:"#666",fontSize:14,margin:0 }}>Synthesized from {doneIds.length} goals &middot; {totalLogs} check-ins logged</p>
          </div>
          {visionLoading && (
            <div style={{ textAlign:"center",padding:"60px 0" }}>
              <div style={{ width:34,height:34,border:"2px solid rgba(255,215,0,0.2)",borderTop:"2px solid #FFD700",borderRadius:"50%",animation:"sooSpin 1s linear infinite",margin:"0 auto" }} />
              <p style={{ color:"#888",marginTop:18 }}>Weaving your life vision...</p>
            </div>
          )}
          {!visionLoading && doneIds.length > 0 && (
            <div>
              <div style={{ display:"grid",gridTemplateColumns:"auto 1fr",gap:32,marginBottom:36,alignItems:"center" }}>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
                  <div style={{ fontSize:11,color:"#666",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4 }}>Life Wheel</div>
                  {doneIds.length >= 3 ? <LifeWheel /> : <div style={{ width:280,height:280,display:"flex",alignItems:"center",justifyContent:"center",color:"#555",fontSize:13,textAlign:"center",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:12 }}>Set 3+ goals to see your wheel</div>}
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  <div style={{ background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"18px 20px" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                      <span style={{ fontSize:13,color:"#ddd" }}>Overall Life Progress</span>
                      <span style={{ fontSize:22,color:"#FFD700",fontWeight:700 }}>{avgScore}%</span>
                    </div>
                    <div style={{ height:10,background:"rgba(255,255,255,0.07)",borderRadius:5,overflow:"hidden" }}><div style={{ height:"100%",width:`${avgScore}%`,background:"linear-gradient(90deg,#FFD700,#FF9500)",borderRadius:5,transition:"width 1s ease" }} /></div>
                  </div>
                  {doneIds.map(id => { const c = cat(id); const s = sc(id); return (<div key={id} style={{ display:"flex",alignItems:"center",gap:12 }}><span style={{ color:c?.color,fontSize:16,width:20,flexShrink:0 }}>{c?.icon}</span><div style={{ flex:1 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:12,color:"#ccc" }}>{c?.name}</span><span style={{ fontSize:12,color:c?.color }}>{s}/100</span></div><div style={{ height:5,background:"rgba(255,255,255,0.07)",borderRadius:3,overflow:"hidden" }}><div style={{ height:"100%",width:`${s}%`,background:c?.color,borderRadius:3,transition:"width 0.8s ease" }} /></div></div><span style={{ fontSize:11,color:"#555",minWidth:36,textAlign:"right" }}>{(logs[id]||[]).length} logs</span></div>); })}
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:36 }}>
                <div style={{ background:"rgba(124,232,160,0.05)",border:"1px solid rgba(124,232,160,0.15)",borderRadius:14,padding:"18px 20px" }}>
                  <div style={{ fontSize:11,color:"#7CE8A0",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14 }}>Strongest Areas</div>
                  {topGoals.slice(0,3).map(id => { const c = cat(id); return (<div key={id} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}><span style={{ fontSize:14,color:c?.color }}>{c?.icon}</span><span style={{ fontSize:13,color:"#ccc",flex:1 }}>{c?.name}</span><span style={{ fontSize:12,color:"#7CE8A0" }}>{sc(id)}</span></div>); })}
                </div>
                <div style={{ background:"rgba(232,124,124,0.05)",border:"1px solid rgba(232,124,124,0.15)",borderRadius:14,padding:"18px 20px" }}>
                  <div style={{ fontSize:11,color:"#E87C7C",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14 }}>Needs Attention</div>
                  {needsWork.map(id => { const c = cat(id); return (<div key={id} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}><span style={{ fontSize:14,color:c?.color }}>{c?.icon}</span><span style={{ fontSize:13,color:"#ccc",flex:1 }}>{c?.name}</span><span style={{ fontSize:11,color:"#E87C7C" }}>+{100-sc(id)} to go</span></div>); })}
                </div>
              </div>
              {vision && (
                <div style={{ marginBottom:36 }}>
                  <div style={{ fontSize:11,color:"#666",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:16,display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ flex:1,height:1,background:"rgba(255,255,255,0.06)" }} />Your Life Vision Manifesto<span style={{ flex:1,height:1,background:"rgba(255,255,255,0.06)" }} />
                  </div>
                  <div style={{ background:"rgba(255,215,0,0.03)",border:"1px solid rgba(255,215,0,0.12)",borderRadius:16,padding:"34px 38px" }}>
                    {vision.split("\n").map((line,i) => line.trim() ? <p key={i} style={{ fontSize:17,lineHeight:1.85,color:"#ddd",margin:"0 0 14px" }}>{line}</p> : <br key={i} />)}
                  </div>
                </div>
              )}
            </div>
          )}
          <div style={{ display:"flex",gap:10,marginTop:8,marginBottom:26 }}>
            <button onClick={generateVision} style={{ background:"#FFD700",color:"#000",border:"none",borderRadius:9,padding:"12px 22px",fontSize:14,fontFamily:"Georgia,serif",fontWeight:700,cursor:"pointer" }}>{vision?"Regenerate Vision":"Generate Life Vision"}</button>
            {vision && <button onClick={() => navigator.clipboard?.writeText(vision)} style={{ background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:9,padding:"12px 18px",fontSize:14,color:"#aaa",cursor:"pointer",fontFamily:"Georgia,serif" }}>Copy Text</button>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ minHeight:"100vh",background:"#080808",color:"#e0e0e0",fontFamily:"Georgia,serif" }}>
      <Nav tab={tab} setTab={setTab} hasGoals={doneIds.length > 0} userName={userName} />
      {renderScreen()}
      <Coach userName={userName} goals={goals} scores={scores} logs={logs} lifeVision={vision} currentPage={tab} />
      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#080808}
        @keyframes sooSpin{to{transform:rotate(360deg)}}
        textarea,input{color-scheme:dark}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        @keyframes coachBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
      `}</style>
    </div>
  );
}
