import React, { useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";

/* ============================================================
   ROOT APP — Handles Theme + Tabs + Loads AnalyzeUI/Admin UI
   ============================================================ */
export default function App() {
  const [view, setView] = useState("analyze"); // "analyze" or "admin"
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  // Apply theme globally
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 20 }}>
      <div className="container">

        {/* ------------ HEADER ------------ */}
        <header className="header" style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>Fake Review App (ML Powered)</h1>

          <nav style={{ marginLeft: 20 }}>
            <button
              className={`btn ${view === "analyze" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setView("analyze")}
              style={{ marginRight: 8 }}
            >
              Analyze
            </button>

            <button
              className={`btn ${view === "admin" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setView("admin")}
            >
              Admin
            </button>
          </nav>

          {/* Theme Toggle */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>

            <button
              className="btn btn-ghost"
              onClick={() => setTheme(t => (t === "dark" ? "light" : "dark"))}
            >
              Toggle
            </button>
          </div>
        </header>

        {/* ------------ MAIN CONTENT ------------ */}
        <main>
          {view === "analyze" ? <AnalyzeUI /> : <AdminDashboard />}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   ANALYZE UI (Updated for ML model)
   ============================================================ */
function AnalyzeUI() {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!text || text.trim().length < 5) {
      setError("Please enter a review (min 5 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, rating, username }),
      });

      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } 
      catch { throw new Error("Invalid JSON from backend: " + raw); }

      if (!res.ok) throw new Error(data.detail || data.error || "Server error");

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function ScoreBar({ label, value }) {
    const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "var(--muted)" }}>{label}</span>
          <span style={{ color: "var(--muted)", fontFamily: "monospace" }}>{pct}%</span>
        </div>
        <div style={{ width: "100%", height: 10, background: "var(--surface)", borderRadius: 6 }}>
          <div
            style={{
              width: pct + "%",
              height: "100%",
              background: "linear-gradient(90deg, #34d399, #60a5fa)",
              borderRadius: 6
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 12 }}>Analyze a Review</h2>

      {/* ----------- FORM ----------- */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          rows={6}
          onChange={e => setText(e.target.value)}
          placeholder="Paste review text..."
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid var(--border)",
            marginBottom: 12
          }}
        />

        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="username (optional)"
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
          />

          <select
            value={rating}
            onChange={e => setRating(Number(e.target.value))}
            style={{ width: 140, padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
          >
            <option value={5}>⭐ 5 Excellent</option>
            <option value={4}>⭐ 4 Good</option>
            <option value={3}>⭐ 3 Neutral</option>
            <option value={2}>⭐ 2 Bad</option>
            <option value={1}>⭐ 1 Terrible</option>
          </select>
        </div>

        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Review"}
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginLeft: 10 }}
          onClick={() => { setText(""); setUsername(""); setRating(5); setResult(null); setError(null); }}
        >
          Reset
        </button>
      </form>

      {/* ----------- ERROR ----------- */}
      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 10, marginTop: 12, borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* ----------- RESULT ----------- */}
      {result && (
        <div style={{ marginTop: 22 }}>
          <h3>Machine Learning Result</h3>

          <p style={{ fontSize: 16, marginBottom: 4 }}>
            Prediction:{" "}
            {result.label === "Likely Fake" ? (
            <span style={{ color: "red", fontWeight: "bold" }}>❌ Likely Fake</span>
            ) : (
              <span style={{ color: "green", fontWeight: "bold" }}>✔ Likely Genuine</span>
            )}
          </p>

          <p style={{ marginBottom: 16 }}>
            Saved as ID: <strong>{result.id}</strong>
          </p>

          <h4>Heuristic Scores</h4>
          <ScoreBar label="Text Score" value={result.scores.text} />
          <ScoreBar label="Sentiment" value={result.scores.sentiment} />
          <ScoreBar label="Behavior" value={result.scores.behavior} />
          <ScoreBar label="IP" value={result.scores.ip} />
          <ScoreBar label="Similarity" value={result.scores.similarity} />

          <h4 style={{ marginTop: 20 }}>Raw Review</h4>
          <div
            style={{
              padding: 10,
              background: "var(--surface)",
              borderRadius: 6,
              border: "1px solid var(--border)",
              whiteSpace: "pre-wrap"
            }}
          >
            {result.text}
          </div>
        </div>
      )}
    </div>
  );
}
