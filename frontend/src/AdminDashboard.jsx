import React, { useEffect, useState } from "react";
import { Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchReviews() {
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
  }, []);

  if (loading)
    return <p style={{ color: "var(--muted)" }}>Loading admin dashboard...</p>;

  /* ===== FIXED STATISTICS ===== */
  const fakeCount = reviews.filter(r => r.label === "Likely Fake").length;
  const genuineCount = reviews.filter(r => r.label === "Likely Genuine").length;

  const pieData = {
    labels: ["Fake Reviews", "Genuine Reviews"],
    datasets: [
      {
        data: [fakeCount, genuineCount],
        backgroundColor: ["#ef4444", "#22c55e"],
      },
    ],
  };

  /* ===== SCORE TREND ===== */
  const sorted = [...reviews].reverse();
  const dates = sorted.map(r => r.timestamp.split("T")[0]);
  const scores = sorted.map(r => r.final_score);

  const lineData = {
    labels: dates,
    datasets: [
      {
        label: "Final Score Trend",
        data: scores,
        borderColor: "#3b82f6",
        tension: 0.3,
      },
    ],
  };

  /* ===== DELETE REVIEW ===== */
  async function deleteReview(id) {
    if (!confirm("Delete this review?")) return;

    await fetch(`/api/reviews/${id}`, { method: "DELETE" });

    fetchReviews();
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Admin Dashboard</h2>

      {/* ===== STATS ===== */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <div className="stat-box">
          <h3>Total Reviews</h3>
          <p style={{ fontSize: 24 }}>{reviews.length}</p>
        </div>

        <div className="stat-box">
          <h3>Fake</h3>
          <p style={{ fontSize: 24, color: "#ef4444" }}>{fakeCount}</p>
        </div>

        <div className="stat-box">
          <h3>Genuine</h3>
          <p style={{ fontSize: 24, color: "#22c55e" }}>{genuineCount}</p>
        </div>
      </div>

      {/* ===== PIE CHART ===== */}
      <div style={{ width: 350, marginBottom: 30 }}>
        <h3 style={{ marginBottom: 10 }}>Fake vs Genuine</h3>
        <Pie data={pieData} />
      </div>

      {/* ===== LINE CHART ===== */}
      <div style={{ width: "100%", marginBottom: 40 }}>
        <h3 style={{ marginBottom: 10 }}>Review Score Trend</h3>
        <Line data={lineData} />
      </div>

      {/* ===== TABLE ===== */}
      <h3 style={{ marginBottom: 10 }}>All Reviews</h3>

      <table className="review-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Timestamp</th>
            <th>User</th>
            <th>Text</th>
            <th>ML Label</th>
            <th>Score</th>
          </tr>
        </thead>

        <tbody>
          {reviews.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.timestamp}</td>
              <td>{r.username ?? "N/A"}</td>
              <td>{r.text.slice(0, 80)}...</td>

              <td style={{ fontWeight: "bold", color: r.label === "Likely Fake" ? "red" : "green" }}>
                {r.label}
              </td>

              <td>{Math.round(r.final_score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
