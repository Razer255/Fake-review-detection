import React, { useState } from "react";

// Single-file React component (default export) using TailwindCSS for styling.
// Usage: drop into a Create React App / Vite + React project. No external libs required.
// It POSTs to /api/analyze (adjust URL) and expects a JSON response:
// {
//   text: <string>,
//   scores: { text: number, sentiment: number, behavior: number, ip: number, similarity: number },
//   final_score: number, // 0..100 where higher = more genuine
//   label: "Likely Genuine" | "Manual Review" | "Likely Fake",
//   reasons: ["top contributing factor 1", ...]
// }

export default function FakeReviewFrontend() {
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
      setError("Please enter a review (at least 5 characters).");
      return;
    }

    setLoading(true);
    try {
      // Change endpoint to your backend analyze route
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, rating, username }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server error: ${txt}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function ScoreBar({ label, value }) {
    // value is 0..100 where higher = more genuine
    const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));
    return (
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <div className="text-sm font-medium text-gray-700">{label}</div>
          <div className="text-sm font-mono text-gray-600">{clamped}%</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500`} 
            style={{ width: `${clamped}%`, background: `linear-gradient(90deg,#34d399,#60a5fa)` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="max-w-3xl w-full bg-white shadow-xl rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-2">Fake Review Detector — Analyze a Review</h1>
        <p className="text-sm text-gray-600 mb-6">Paste a review and optional metadata. The backend will return component scores (0–100, higher = more genuine) and the final ensemble decision.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-gray-200 p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Write or paste the review text here..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating (optional)</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full rounded-md border p-2">
                <option value={5}>5 — Excellent</option>
                <option value={4}>4 — Good</option>
                <option value={3}>3 — Neutral</option>
                <option value={2}>2 — Poor</option>
                <option value={1}>1 — Terrible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username (optional)</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border p-2"
                placeholder="user123 or email@example.com"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Analyzing..." : "Analyze Review"}
            </button>

            <button
              type="button"
              onClick={() => { setText(""); setUsername(""); setRating(5); setResult(null); setError(null); }}
              className="px-3 py-2 bg-gray-100 rounded-md"
            >
              Reset
            </button>

            <div className="ml-auto text-sm text-gray-500">Result: <span className="font-mono">{result ? result.label : "—"}</span></div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
          )}
        </form>

        {/* Result card */}
        {result && (
          <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Analysis Result</h2>
                <p className="text-sm text-gray-600">Final genuine score <span className="font-mono">{Math.round(result.final_score)}</span> — <strong>{result.label}</strong></p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Saved: <span className="font-mono">{result.id || 'local'}</span></div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <ScoreBar label="Text (linguistic)" value={result.scores.text} />
                <ScoreBar label="Sentiment" value={result.scores.sentiment} />
                <ScoreBar label="Behavior / Metadata" value={result.scores.behavior} />
                <ScoreBar label="IP / Geo" value={result.scores.ip} />
                <ScoreBar label="Similarity / Provenance" value={result.scores.similarity} />
              </div>

              <div>
                <div className="bg-white p-3 rounded shadow-sm h-full">
                  <h3 className="font-medium mb-2">Top reasons / signals</h3>
                  {result.reasons && result.reasons.length ? (
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {result.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No top signals provided.</p>
                  )}

                  <hr className="my-3" />

                  <h4 className="text-sm font-medium mb-1">Raw review</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap p-2 rounded border bg-gray-50 h-40 overflow-auto">{result.text}</div>
                </div>
              </div>
            </div>

          </div>
        )}

        <div className="mt-6 text-xs text-gray-400">Note: This demo frontend expects a backend endpoint (<span className="font-mono">/api/analyze</span>) that returns the component scores and final decision. I can provide a matching FastAPI backend next.</div>
      </div>
    </div>
  );
}
