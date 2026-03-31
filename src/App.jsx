import { useState, useEffect, useRef } from "react";
import { CONFIG as BAKED_CONFIG, ENTRIES as BAKED_ENTRIES } from "./data.js";

const PROMPTS = [
  `When I met you it was like`,
  `Our friendship over the years has given me`,
  `The title of our next chapter together would be`,
  `If I could hand you one story that reminds me of your strength, it would be`,
  `You taught me that life is really about`,
  `When life got hard, you showed me`,
  `Being your friend feels like living inside`,
  `The thing about you nobody talks about enough is`,
  `If your life had a soundtrack, the liner notes would be called`,
  `One day your daughters will understand that their mom was always about`,
  `You carry yourself like a woman who already knows`,
];

const SPINE_COLORS = [
  "#7B2D3B", "#2B4162", "#5C3D2E", "#2D5F4A", "#5B3480",
  "#8B5E3C", "#1E4D5E", "#6E3333", "#3B5959", "#6A4C93", "#A0522D",
];

const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');

@media (max-width: 600px) {
  .setup-title { font-size: 24px !important; }
  .form-grid { grid-template-columns: 1fr !important; }
  .form-grid > div { grid-column: 1 / -1 !important; }
  .form-card { padding: 18px 16px 16px !important; }
  .config-section { padding: 16px !important; flex-direction: column !important; }
  .config-section > label { margin-bottom: 6px; }
  .config-section > input { width: 100% !important; }
  .entry-card { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
  .entry-actions { align-self: flex-end !important; }
  .setup-container { padding: 20px 12px !important; }
  .shelf-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 12px !important; }
  .landing-name { font-size: 36px !important; }
  .landing-text { font-size: 15px !important; }
  .opened-container { margin-top: 3vh !important; }
  .opened-card { padding: 28px 20px 24px !important; }
  .opened-prompt { font-size: 16px !important; }
  .opened-book-title { font-size: 22px !important; }
  .reveal-name { font-size: 32px !important; }
  .launch-btn { font-size: 15px !important; padding: 14px !important; }
  .form-actions { flex-direction: column !important; }
  .form-actions > button { width: 100% !important; }
}

@media (max-width: 380px) {
  .shelf-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .setup-title { font-size: 20px !important; }
  .landing-name { font-size: 28px !important; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function FullscreenBtn() {
  const [isFs, setIsFs] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  return (
    <button onClick={toggleFullscreen} style={styles.fullscreenBtn} title={isFs ? "Exit fullscreen" : "Go fullscreen"}>
      {isFs ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3H5a2 2 0 0 0-2 2v3m18-5h-3a2 2 0 0 0-2 2v3m0 8v3a2 2 0 0 0 2 2h3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      )}
    </button>
  );
}

function getVideoEmbed(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  if (ytMatch) {
    return { type: "youtube", id: ytMatch[1] };
  }
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return { type: "gdrive", id: driveMatch[1] };
  }
  return { type: "direct", url };
}

function VideoPlayer({ url }) {
  const embed = getVideoEmbed(url);
  if (!embed) return <div style={styles.noVideo}>No video provided</div>;
  if (embed.type === "youtube") {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${embed.id}?autoplay=1&rel=0`}
        style={styles.videoFrame}
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }
  if (embed.type === "gdrive") {
    return (
      <iframe
        src={`https://drive.google.com/file/d/${embed.id}/preview`}
        style={styles.videoFrame}
        allow="autoplay"
        allowFullScreen
      />
    );
  }
  return (
    <video controls autoPlay style={styles.videoFrame} playsInline>
      <source src={embed.url} />
    </video>
  );
}

// ─── SETUP MODE ───
function SetupMode({ entries, setEntries, config, setConfig, onStartReveal }) {
  const [form, setForm] = useState({ name: "", promptIdx: 0, bookTitle: "", bookAuthor: "", videoUrl: "", note: "" });
  const [editing, setEditing] = useState(null);

  const handleSave = () => {
    if (!form.name || !form.bookTitle) return;
    const entry = { ...form, id: editing !== null ? entries[editing].id : Date.now() };
    if (editing !== null) {
      const updated = [...entries];
      updated[editing] = entry;
      setEntries(updated);
      setEditing(null);
    } else {
      setEntries([...entries, entry]);
    }
    setForm({ name: "", promptIdx: 0, bookTitle: "", bookAuthor: "", videoUrl: "", note: "" });
  };

  const handleEdit = (i) => {
    setForm(entries[i]);
    setEditing(i);
  };

  const handleDelete = (i) => {
    setEntries(entries.filter((_, idx) => idx !== i));
    if (editing === i) { setEditing(null); setForm({ name: "", promptIdx: 0, bookTitle: "", bookAuthor: "", videoUrl: "", note: "" }); }
  };

  return (
    <div style={styles.setupContainer} className="setup-container">
      <style>{FONTS_CSS}</style>
      <div style={styles.setupInner}>
        <div style={styles.setupHeader}>
          <div style={styles.setupLabel}>Setup Mode</div>
          <h1 style={styles.setupTitle} className="setup-title">Birthday Book Reveal</h1>
          <p style={styles.setupSubtitle}>Add each friend's entry below. When you're ready, launch the reveal experience.</p>
        </div>

        {/* Config */}
        <div style={styles.configSection} className="config-section">
          <label style={{ ...styles.fieldLabel, flexShrink: 0, marginBottom: 0 }}>Her Name (for the landing screen)</label>
          <input
            style={{ ...styles.input, flex: 1 }}
            value={config.wifeName || ""}
            onChange={e => setConfig({ ...config, wifeName: e.target.value })}
            placeholder="Enter her name"
          />
        </div>

        {/* Entry Form */}
        <div style={styles.formCard} className="form-card">
          <h2 style={styles.formTitle}>{editing !== null ? "Edit Entry" : "Add a Friend's Book"}</h2>
          <div style={styles.formGrid} className="form-grid">
            <div style={styles.formField}>
              <label style={styles.fieldLabel}>Friend's Name *</label>
              <input style={styles.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Sarah" />
            </div>
            <div style={styles.formField}>
              <label style={styles.fieldLabel}>Prompt</label>
              <select style={styles.select} value={form.promptIdx} onChange={e => setForm({ ...form, promptIdx: parseInt(e.target.value) })}>
                {PROMPTS.map((p, i) => <option key={i} value={i}>#{i + 1}: "{p}..."</option>)}
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.fieldLabel}>Book Title *</label>
              <input style={styles.input} value={form.bookTitle} onChange={e => setForm({ ...form, bookTitle: e.target.value })} placeholder="e.g., Becoming" />
            </div>
            <div style={styles.formField}>
              <label style={styles.fieldLabel}>Author</label>
              <input style={styles.input} value={form.bookAuthor} onChange={e => setForm({ ...form, bookAuthor: e.target.value })} placeholder="e.g., Michelle Obama" />
            </div>
            <div style={{ ...styles.formField, gridColumn: "1 / -1" }}>
              <label style={styles.fieldLabel}>Video URL</label>
              <input style={styles.input} value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="YouTube, Google Drive, or direct video URL" />
              <span style={styles.fieldHint}>Supports YouTube, Google Drive share links, or direct .mp4 URLs</span>
            </div>
            <div style={{ ...styles.formField, gridColumn: "1 / -1" }}>
              <label style={styles.fieldLabel}>Their Personal Note</label>
              <textarea style={styles.textarea} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Why they chose this book..." rows={3} />
            </div>
          </div>
          <div style={styles.formActions} className="form-actions">
            {editing !== null && <button style={styles.btnSecondary} onClick={() => { setEditing(null); setForm({ name: "", promptIdx: 0, bookTitle: "", bookAuthor: "", videoUrl: "", note: "" }); }}>Cancel</button>}
            <button style={styles.btnPrimary} onClick={handleSave}>{editing !== null ? "Update" : "Add Entry"}</button>
          </div>
        </div>

        {/* Entries List */}
        {entries.length > 0 && (
          <div style={styles.entriesList}>
            <h2 style={styles.formTitle}>{entries.length} Book{entries.length !== 1 ? "s" : ""} Added</h2>
            {entries.map((e, i) => (
              <div key={e.id} className="entry-card" style={{ ...styles.entryCard, borderLeft: `4px solid ${SPINE_COLORS[i % SPINE_COLORS.length]}` }}>
                <div style={styles.entryInfo}>
                  <strong style={styles.entryName}>{e.name}</strong>
                  <span style={styles.entryBook}>"{e.bookTitle}"{e.bookAuthor ? ` by ${e.bookAuthor}` : ""}</span>
                  <span style={styles.entryPrompt}>"{PROMPTS[e.promptIdx]}..."</span>
                  {e.videoUrl && <span style={styles.entryVideoTag}>Video attached</span>}
                </div>
                <div style={styles.entryActions} className="entry-actions">
                  <button style={styles.btnSmall} onClick={() => handleEdit(i)}>Edit</button>
                  <button style={{ ...styles.btnSmall, color: "#a05050" }} onClick={() => handleDelete(i)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Launch */}
        {entries.length > 0 && (
          <button style={styles.launchBtn} className="launch-btn" onClick={onStartReveal}>
            Launch Reveal Experience
          </button>
        )}
      </div>
    </div>
  );
}

// ─── REVEAL: LANDING ───
function RevealLanding({ name, count, onBegin }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);
  return (
    <div style={styles.revealBg}>
      <style>{FONTS_CSS}</style>
      <FullscreenBtn />
      <div style={{ ...styles.landingContent, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)", transition: "all 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <div style={styles.landingOrnament}>&#10045;</div>
        <div style={styles.landingLabel}>Happy Birthday</div>
        <h1 style={styles.landingName} className="landing-name">{name || "Beautiful"}</h1>
        <div style={styles.landingDivider} />
        <p style={styles.landingText} className="landing-text">
          The people who love you most were asked to speak your language.
          <br /><br />
          {count} book{count !== 1 ? "s" : ""} {count !== 1 ? "are" : "is"} waiting — each one chosen to finish a sentence about you.
          <br /><br />
          Open a book. Read the words. Guess who they're from.
          <br />Then reveal the truth.
        </p>
        <button style={styles.beginBtn} onClick={onBegin}>Open the Shelf</button>
      </div>
    </div>
  );
}

// ─── REVEAL: BOOKSHELF ───
function Bookshelf({ entries, revealed, onSelect, onBack, showBack = true }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
  return (
    <div style={styles.revealBg}>
      <style>{FONTS_CSS}</style>
      <FullscreenBtn />
      <div style={styles.shelfHeader}>
        {showBack && <button style={styles.backLink} onClick={onBack}>← Back to setup</button>}
        <h2 style={styles.shelfTitle}>Choose a Book</h2>
        <p style={styles.shelfSub}>{Object.keys(revealed).length} of {entries.length} revealed</p>
      </div>
      <div style={styles.shelfGrid} className="shelf-grid">
        {entries.map((entry, i) => {
          const isRevealed = revealed[i];
          const color = SPINE_COLORS[i % SPINE_COLORS.length];
          const delay = i * 0.08;
          return (
            <button
              key={entry.id}
              onClick={() => onSelect(i)}
              style={{
                ...styles.bookSpine,
                backgroundColor: color,
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translateY(0) scale(1)" : "translateY(40px) scale(0.9)",
                transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
                ...(isRevealed ? { opacity: loaded ? 0.5 : 0, filter: "saturate(0.4)" } : {}),
              }}
            >
              <div style={styles.spineNumber}>{String(i + 1).padStart(2, "0")}</div>
              <div style={styles.spineLine} />
              <div style={styles.spineTitle}>{entry.bookTitle}</div>
              <div style={styles.spineLine} />
              <div style={styles.spineBookIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              {isRevealed && <div style={styles.revealedBadge}>✓ {entry.name}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── REVEAL: OPENED BOOK ───
function OpenedBook({ entry, index, onReveal, onBack }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);
  const prompt = PROMPTS[entry.promptIdx];
  return (
    <div style={styles.revealBg}>
      <style>{FONTS_CSS}</style>
      <FullscreenBtn />
      <button style={styles.backLink2} onClick={onBack}>← Back to shelf</button>
      <div className="opened-container" style={{ ...styles.openedContainer, opacity: show ? 1 : 0, transform: show ? "scale(1)" : "scale(0.95)", transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <div style={styles.openedCard} className="opened-card">
          <div style={styles.openedLabel}>Book {String(index + 1).padStart(2, "0")}</div>
          <div style={styles.openedPromptWrap}>
            <span style={styles.openedQuote}>"</span>
            <p style={styles.openedPrompt} className="opened-prompt">{prompt}</p>
          </div>
          <div style={styles.openedTitleWrap}>
            <div style={styles.openedBookTitle} className="opened-book-title">{entry.bookTitle}</div>
            {entry.bookAuthor && <div style={styles.openedBookAuthor}>by {entry.bookAuthor}</div>}
          </div>
          <span style={styles.openedQuoteEnd}>"</span>
        </div>
        <div style={styles.guessSection}>
          <p style={styles.guessText}>Who do you think this is from?</p>
          <p style={styles.guessHint}>Make your guess, then tap below</p>
          <button style={styles.revealBtn} onClick={onReveal}>
            Reveal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONFETTI ───
function Confetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#c9a96e", "#f0e6d3", "#e8d5b5", "#7B2D3B", "#2B4162", "#5C3D2E", "#2D5F4A", "#5B3480", "#A0522D", "#fff"];
    const particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        spin: Math.random() * 0.2 - 0.1,
        angle: Math.random() * Math.PI * 2,
        opacity: 1,
      });
    }
    let animId;
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      particles.forEach((p) => {
        p.x += p.vx + Math.sin(frame * 0.02 + p.angle) * 0.5;
        p.y += p.vy;
        p.angle += p.spin;
        if (frame > 100) p.opacity = Math.max(0, p.opacity - 0.008);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (frame < 250) animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999 }} />;
}

// ─── CELEBRATION SCREEN ───
function CelebrationScreen({ entries, config, onBack }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 200); }, []);
  return (
    <div style={styles.revealBg}>
      <style>{FONTS_CSS}</style>
      <FullscreenBtn />
      <Confetti />
      <div style={{ ...styles.celebrationContainer, opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(30px)", transition: "all 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <div style={styles.celebrationOrnament}>&#10045;</div>
        <div style={styles.celebrationLabel}>Every Book Has Been Opened</div>
        <h1 style={styles.celebrationName}>{config.wifeName || "Beautiful"}</h1>
        <div style={styles.landingDivider} />
        <p style={styles.celebrationText}>
          {entries.length} people who love you chose {entries.length} books to tell you what you mean to them.
          <br /><br />
          Every title, every word, every video — that's how the world sees you.
        </p>
        <div style={styles.celebrationFriends}>
          {entries.map((e, i) => (
            <span key={e.id} style={{ ...styles.celebrationFriendName, animationDelay: `${i * 0.15 + 0.8}s` }}>{e.name}</span>
          ))}
        </div>
        <div style={styles.celebrationHeart}>♥</div>
        <button style={styles.doneBtn} onClick={onBack}>Back to the Shelf</button>
      </div>
    </div>
  );
}

// ─── REVEAL: THE REVEAL ───
function TheReveal({ entry, index, onDone }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setPhase(3), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={styles.revealBg}>
      <style>{FONTS_CSS}</style>
      <FullscreenBtn />
      <Confetti />
      <div style={styles.revealContainer}>
        {/* Name Reveal */}
        <div className="reveal-name" style={{ ...styles.revealName, opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)", transition: "all 1s cubic-bezier(0.22, 1, 0.36, 1)" }}>
          {entry.name}
        </div>

        {/* Video */}
        <div style={{ ...styles.videoWrap, opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s" }}>
          {entry.videoUrl ? (
            <VideoPlayer url={entry.videoUrl} />
          ) : (
            <div style={styles.noVideoBox}>
              <div style={styles.noVideoIcon}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(201,169,110,0.4)" strokeWidth="1.5"><polygon points="5,3 19,12 5,21"/></svg>
              </div>
              <p style={styles.noVideoText}>No video submitted</p>
            </div>
          )}
        </div>

        {/* Note */}
        <div style={{ ...styles.revealNote, opacity: phase >= 3 ? 1 : 0, transform: phase >= 3 ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}>
          {entry.note && (
            <>
              <div style={styles.noteLabel}>Why {entry.name} chose this book</div>
              <p style={styles.noteText}>"{entry.note}"</p>
            </>
          )}
        </div>

        <button style={{ ...styles.doneBtn, opacity: phase >= 3 ? 1 : 0, transition: "opacity 0.6s ease 0.3s" }} onClick={onDone}>
          Back to the Shelf
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ───
export default function App() {
  const hasBakedData = BAKED_ENTRIES && BAKED_ENTRIES.length > 0;
  const [entries, setEntries] = useState([]);
  const [config, setConfig] = useState({ wifeName: "" });
  const [mode, setMode] = useState("loading");
  const [revealed, setRevealed] = useState({});
  const [selected, setSelected] = useState(null);
  const [revealPhase, setRevealPhase] = useState("shelf");
  const [storageReady, setStorageReady] = useState(false);

  // Load data — baked-in data takes priority, otherwise localStorage
  useEffect(() => {
    if (hasBakedData) {
      setEntries(BAKED_ENTRIES.map((e, i) => ({ ...e, id: i + 1 })));
      setConfig(BAKED_CONFIG);
      setMode("reveal");
      setRevealPhase("landing");
    } else {
      try {
        const savedEntries = localStorage.getItem("bday-entries");
        const savedConfig = localStorage.getItem("bday-config");
        if (savedEntries) setEntries(JSON.parse(savedEntries));
        if (savedConfig) setConfig(JSON.parse(savedConfig));
      } catch (e) { console.log("Storage load:", e); }
      setMode("setup");
    }
    setStorageReady(true);
  }, []);

  // Save to storage (only when not using baked data)
  useEffect(() => {
    if (!storageReady || hasBakedData) return;
    try {
      localStorage.setItem("bday-entries", JSON.stringify(entries));
      localStorage.setItem("bday-config", JSON.stringify(config));
    } catch (e) { console.log("Storage save:", e); }
  }, [entries, config, storageReady]);

  if (mode === "loading") {
    return (
      <div style={styles.revealBg}>
        <style>{FONTS_CSS}</style>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", color: "#c9a96e", fontSize: 18, textAlign: "center", marginTop: 100 }}>Loading...</p>
      </div>
    );
  }

  if (mode === "setup") {
    return (
      <SetupMode
        entries={entries}
        setEntries={setEntries}
        config={config}
        setConfig={setConfig}
        onStartReveal={() => { toggleFullscreen(); setMode("reveal"); setRevealPhase("landing"); setRevealed({}); }}
      />
    );
  }

  // REVEAL MODE
  if (revealPhase === "landing") {
    return <RevealLanding name={config.wifeName} count={entries.length} onBegin={() => setRevealPhase("shelf")} />;
  }

  if (revealPhase === "shelf") {
    return (
      <Bookshelf
        entries={entries}
        revealed={revealed}
        onSelect={(i) => { setSelected(i); setRevealPhase("opened"); }}
        onBack={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setMode("setup"); }}
        showBack={!hasBakedData}
      />
    );
  }

  if (revealPhase === "opened" && selected !== null) {
    return (
      <OpenedBook
        entry={entries[selected]}
        index={selected}
        onReveal={() => {
          setRevealed({ ...revealed, [selected]: true });
          setRevealPhase("revealed");
        }}
        onBack={() => { setSelected(null); setRevealPhase("shelf"); }}
      />
    );
  }

  if (revealPhase === "revealed" && selected !== null) {
    return (
      <TheReveal
        entry={entries[selected]}
        index={selected}
        onDone={() => {
          const newRevealed = { ...revealed, [selected]: true };
          setSelected(null);
          if (Object.keys(newRevealed).length >= entries.length) {
            setRevealPhase("celebration");
          } else {
            setRevealPhase("shelf");
          }
        }}
      />
    );
  }

  if (revealPhase === "celebration") {
    return (
      <CelebrationScreen
        entries={entries}
        config={config}
        onBack={() => setRevealPhase("shelf")}
      />
    );
  }

  return null;
}

// ─── STYLES ───
const styles = {
  // Setup
  setupContainer: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7f3ee 0%, #ede6dc 100%)",
    fontFamily: "'Lora', serif",
    color: "#2c2420",
    padding: "32px 16px",
  },
  setupInner: { maxWidth: 680, margin: "0 auto" },
  setupHeader: { textAlign: "center", marginBottom: 36 },
  setupLabel: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.3em",
    color: "#a89585",
    marginBottom: 8,
  },
  setupTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 32,
    fontWeight: 500,
    color: "#3a302a",
    margin: "0 0 8px",
  },
  setupSubtitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 16,
    color: "#8a7565",
    fontStyle: "italic",
  },
  configSection: { marginBottom: 28, padding: "20px 24px", background: "#fff", borderRadius: 10, border: "1px solid #ddd3c6", display: "flex", alignItems: "center", gap: 16 },
  formCard: { background: "#fff", borderRadius: 10, border: "1px solid #ddd3c6", padding: "24px 24px 20px", marginBottom: 28 },
  formTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 18,
    fontWeight: 500,
    color: "#3a302a",
    marginBottom: 18,
    marginTop: 0,
  },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 18px" },
  formField: { display: "flex", flexDirection: "column" },
  fieldLabel: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#8a7565",
    marginBottom: 5,
  },
  input: {
    fontFamily: "'Lora', serif",
    fontSize: 14,
    padding: "10px 12px",
    border: "1px solid #d9cfc3",
    borderRadius: 6,
    color: "#2c2420",
    background: "#fdfbf8",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    fontFamily: "'Lora', serif",
    fontSize: 13,
    padding: "10px 12px",
    border: "1px solid #d9cfc3",
    borderRadius: 6,
    color: "#2c2420",
    background: "#fdfbf8",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  textarea: {
    fontFamily: "'Lora', serif",
    fontSize: 14,
    padding: "10px 12px",
    border: "1px solid #d9cfc3",
    borderRadius: 6,
    color: "#2c2420",
    background: "#fdfbf8",
    outline: "none",
    resize: "vertical",
    width: "100%",
    boxSizing: "border-box",
  },
  fieldHint: { fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: "#b0a090", marginTop: 4, fontStyle: "italic" },
  formActions: { display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" },
  btnPrimary: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "10px 28px",
    background: "#5c4a3a",
    color: "#fffdf9",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  btnSecondary: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "10px 20px",
    background: "transparent",
    color: "#8a7565",
    border: "1px solid #d9cfc3",
    borderRadius: 6,
    cursor: "pointer",
  },
  entriesList: { marginBottom: 28 },
  entryCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 18px",
    background: "#fff",
    borderRadius: 8,
    border: "1px solid #e8e0d6",
    marginBottom: 10,
  },
  entryInfo: { display: "flex", flexDirection: "column", gap: 3 },
  entryName: { fontFamily: "'Playfair Display', serif", fontSize: 15, color: "#3a302a" },
  entryBook: { fontFamily: "'Lora', serif", fontSize: 13, color: "#5c4a3a", fontStyle: "italic" },
  entryPrompt: { fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: "#a89585" },
  entryVideoTag: {
    fontFamily: "'Cormorant Garamond', serif", fontSize: 11, color: "#2D5F4A",
    textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2,
  },
  entryActions: { display: "flex", gap: 8 },
  btnSmall: {
    fontFamily: "'Cormorant Garamond', serif", fontSize: 12, textTransform: "uppercase",
    letterSpacing: "0.08em", padding: "6px 12px", background: "transparent",
    border: "1px solid #d9cfc3", borderRadius: 4, cursor: "pointer", color: "#5c4a3a",
  },
  launchBtn: {
    display: "block",
    width: "100%",
    fontFamily: "'Playfair Display', serif",
    fontSize: 17,
    fontWeight: 500,
    padding: "16px",
    background: "linear-gradient(135deg, #5c4a3a 0%, #3a302a 100%)",
    color: "#e8d5b5",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    letterSpacing: "0.06em",
    marginBottom: 40,
  },

  // Reveal backgrounds
  revealBg: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #1a1410 0%, #0f0c09 50%, #1a1410 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'Lora', serif",
    padding: "20px 16px",
    position: "relative",
  },

  // Landing
  landingContent: { textAlign: "center", maxWidth: 480, marginTop: "12vh" },
  landingOrnament: { fontSize: 28, color: "#c9a96e", opacity: 0.5, marginBottom: 16 },
  landingLabel: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: "0.35em",
    color: "#c9a96e",
    marginBottom: 10,
  },
  landingName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 52,
    fontWeight: 400,
    fontStyle: "italic",
    color: "#f0e6d3",
    margin: "0 0 20px",
    lineHeight: 1.1,
  },
  landingDivider: { width: 60, height: 1, background: "#c9a96e", margin: "0 auto 24px", opacity: 0.4 },
  landingText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 17,
    color: "#a89585",
    lineHeight: 1.75,
    fontStyle: "italic",
  },
  beginBtn: {
    marginTop: 36,
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 15,
    textTransform: "uppercase",
    letterSpacing: "0.25em",
    padding: "14px 40px",
    background: "transparent",
    color: "#c9a96e",
    border: "1px solid rgba(201,169,110,0.4)",
    borderRadius: 2,
    cursor: "pointer",
  },

  // Shelf
  shelfHeader: { textAlign: "center", marginBottom: 30, marginTop: 10 },
  shelfTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    fontWeight: 400,
    color: "#f0e6d3",
    margin: "8px 0 6px",
  },
  shelfSub: { fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "#8a7565", fontStyle: "italic" },
  shelfGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
    gap: 16,
    maxWidth: 560,
    width: "100%",
    padding: "0 10px",
  },
  bookSpine: {
    aspectRatio: "1/2",
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 6px",
    boxShadow: "4px 4px 12px rgba(0,0,0,0.4), inset -2px 0 6px rgba(0,0,0,0.2)",
    position: "relative",
    minHeight: 160,
  },
  spineNumber: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: "0.15em",
  },
  spineLine: { width: "60%", height: 1, background: "rgba(255,255,255,0.2)" },
  spineTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 1.3,
    padding: "0 6px",
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    wordBreak: "break-word",
    fontStyle: "italic",
  },
  spineBookIcon: { opacity: 0.5 },
  revealedBadge: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    background: "rgba(0,0,0,0.6)",
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 10,
    color: "#c9a96e",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    padding: "6px 4px",
    borderRadius: "0 0 4px 4px",
    textAlign: "center",
  },
  backLink: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 12,
    color: "#8a7565",
    background: "none",
    border: "none",
    cursor: "pointer",
    letterSpacing: "0.05em",
  },
  backLink2: {
    position: "absolute",
    top: 20,
    left: 20,
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 13,
    color: "#8a7565",
    background: "none",
    border: "none",
    cursor: "pointer",
    zIndex: 10,
  },

  // Opened Book
  openedContainer: { maxWidth: 480, width: "100%", marginTop: "6vh", textAlign: "center" },
  openedCard: {
    background: "linear-gradient(170deg, #2a2218 0%, #1e1912 100%)",
    border: "1px solid rgba(201,169,110,0.15)",
    borderRadius: 8,
    padding: "40px 32px 32px",
    position: "relative",
  },
  openedLabel: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.3em",
    color: "#8a7565",
    marginBottom: 28,
  },
  openedPromptWrap: { position: "relative", marginBottom: 20 },
  openedQuote: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 60,
    color: "rgba(201,169,110,0.15)",
    position: "absolute",
    top: -30,
    left: -5,
    lineHeight: 1,
  },
  openedPrompt: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 19,
    color: "#c9a96e",
    fontStyle: "italic",
    lineHeight: 1.7,
    margin: 0,
  },
  openedTitleWrap: {
    margin: "16px 0 8px",
    padding: "18px 0",
    borderTop: "1px solid rgba(201,169,110,0.15)",
    borderBottom: "1px solid rgba(201,169,110,0.15)",
  },
  openedBookTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 28,
    fontWeight: 600,
    color: "#f0e6d3",
    lineHeight: 1.2,
  },
  openedBookAuthor: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 15,
    color: "#8a7565",
    fontStyle: "italic",
    marginTop: 8,
  },
  openedQuoteEnd: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 40,
    color: "rgba(201,169,110,0.12)",
    display: "block",
    textAlign: "right",
    marginTop: -10,
    marginRight: 20,
  },
  guessSection: { marginTop: 32 },
  guessText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 20,
    fontStyle: "italic",
    color: "#f0e6d3",
    margin: "0 0 6px",
  },
  guessHint: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14,
    color: "#8a7565",
    fontStyle: "italic",
    marginBottom: 24,
  },
  revealBtn: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 16,
    letterSpacing: "0.15em",
    padding: "14px 48px",
    background: "linear-gradient(135deg, #c9a96e 0%, #a8893e 100%)",
    color: "#1a1410",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 600,
  },

  // The Reveal
  revealContainer: { maxWidth: 520, width: "100%", textAlign: "center", marginTop: "6vh" },
  revealName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 44,
    fontWeight: 400,
    fontStyle: "italic",
    color: "#f0e6d3",
    marginBottom: 28,
  },
  videoWrap: { width: "100%", marginBottom: 24 },
  videoFrame: {
    width: "100%",
    aspectRatio: "16/9",
    borderRadius: 8,
    border: "1px solid rgba(201,169,110,0.15)",
    background: "#0f0c09",
  },
  noVideoBox: {
    width: "100%",
    aspectRatio: "16/9",
    borderRadius: 8,
    border: "1px solid rgba(201,169,110,0.1)",
    background: "rgba(201,169,110,0.03)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  noVideoIcon: {},
  noVideoText: { fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "#8a7565", fontStyle: "italic", margin: 0 },
  revealNote: { marginBottom: 24, padding: "0 10px" },
  noteLabel: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    color: "#8a7565",
    marginBottom: 10,
  },
  noteText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 17,
    color: "#c9a96e",
    fontStyle: "italic",
    lineHeight: 1.8,
  },
  doneBtn: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    padding: "12px 36px",
    background: "transparent",
    color: "#8a7565",
    border: "1px solid rgba(138,117,101,0.3)",
    borderRadius: 2,
    cursor: "pointer",
    marginBottom: 40,
  },
  noVideo: { fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "#8a7565", fontStyle: "italic" },

  // Celebration
  celebrationContainer: { textAlign: "center", maxWidth: 520, marginTop: "8vh", position: "relative", zIndex: 1 },
  celebrationOrnament: { fontSize: 32, color: "#c9a96e", opacity: 0.6, marginBottom: 16 },
  celebrationLabel: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: "0.35em",
    color: "#c9a96e",
    marginBottom: 10,
  },
  celebrationName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 46,
    fontWeight: 400,
    fontStyle: "italic",
    color: "#f0e6d3",
    margin: "0 0 20px",
    lineHeight: 1.1,
  },
  celebrationText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 18,
    color: "#a89585",
    lineHeight: 1.75,
    fontStyle: "italic",
    margin: "0 0 28px",
  },
  celebrationFriends: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "8px 16px",
    marginBottom: 28,
  },
  celebrationFriendName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 16,
    color: "#c9a96e",
    opacity: 0,
    animation: "fadeInUp 0.6s ease forwards",
  },
  celebrationHeart: {
    fontSize: 28,
    color: "#c9a96e",
    opacity: 0.5,
    marginBottom: 28,
  },
  fullscreenBtn: {
    position: "fixed",
    top: 16,
    right: 16,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    color: "rgba(255,255,255,0.5)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    backdropFilter: "blur(4px)",
  },
};
