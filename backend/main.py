from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import json
import random
import numpy as np
import joblib
from datetime import datetime
from pydantic import BaseModel
app = FastAPI()

# ---------------------------------------------------
# CORS for frontend
# ---------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------
# Load ML model + vectorizer
# ---------------------------------------------------
ML_MODEL = joblib.load("models/rf_model.joblib")
VECTORIZER = joblib.load("models/tfidf_vectorizer.joblib")
LABEL_MAP = {
    0: "Genuine",
    1: "Uncertain",
    2: "Fake"
}
  # Your trained dataset labels


class AnalyzeRequest(BaseModel):
    text: str
    rating: int | None = None
    username: str | None = None
    
def get_db():
    con = sqlite3.connect("reviews.db")
    con.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            text TEXT,
            username TEXT,
            rating INTEGER,
            client_ip TEXT,
            scores_json TEXT,
            final_score REAL,
            label TEXT
        )
    """)
    return con

def is_all_caps(text, threshold=0.7):
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return False
    caps_count = sum(1 for c in letters if c.isupper())
    return (caps_count / len(letters)) >= threshold


def text_score(text: str):
    length = len(text.split())
    if length < 5:
        return 10
    elif length < 20:
        return 40
    elif length < 50:
        return 60
    else:
        return 80


def sentiment_score(text: str):
    score = 50
    if any(word in text.lower() for word in ["bad", "terrible", "poor"]):
        score = 20
    if any(word in text.lower() for word in ["excellent", "amazing", "love"]):
        score = 80
    return score


def behavior_score(username: str):
    if not username:
        return 40
    if any(x.isdigit() for x in username):
        return 60
    return 80


def ip_score(ip: str):
    if not ip:
        return 50
    return 70


def ml_predict_score(text: str):
    X = VECTORIZER.transform([text])
    proba = ML_MODEL.predict_proba(X)[0] 
    predicted_label = ML_MODEL.predict(X)[0]
    ml_score = proba.max() * 100       
    return ml_score, predicted_label


class AnalyzeIn(BaseModel):
    text: str
    rating: int | None = None
    username: str | None = None


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    text = req.text
    rating = req.rating
    username = req.username or None
    client_ip = "127.0.0.1"

    # -------- ML Prediction --------
    vec = VECTORIZER.transform([text])
    proba = ML_MODEL.predict_proba(vec)[0]
    predicted = int(np.argmax(proba))
    ml_label = LABEL_MAP.get(predicted, "Unknown")
    confidence = float(np.max(proba))  # ✅ ALWAYS DEFINED

    # -------- Rules --------
    fake_keywords = [
        "best product ever",
        "buy now",
        "free sample",
        "contact me for bulk",
        "guaranteed 5 star",
        "5 star review",
        "sponsored",
        "cheap price best quality",
        "perfect quality very nice",
        "super amazing product",
    ]

    lower_text = text.lower()
    keyword_triggered = any(kw in lower_text for kw in fake_keywords)
    all_caps_triggered = is_all_caps(text)

    # -------- Scores --------
    t_score = text_score(text)
    s_score = sentiment_score(text)
    b_score = behavior_score(username)
    i_score = ip_score(client_ip)

    # -------- Label Decision --------
    if all_caps_triggered:
        final_label = "Likely Fake"

    elif keyword_triggered:
        final_label = "Likely Fake"

    elif t_score < 20:
        final_label = "Likely Fake"

    else:
        if ml_label == "Fake":
            final_label = "Likely Fake"
        else:
            final_label = "Likely Genuine"

    # -------- Final Score (ALWAYS computed) --------
    final_score = (
        0.35 * (confidence * 100) +
        0.20 * t_score +
        0.20 * s_score +
        0.15 * b_score +
        0.10 * i_score
    )

    # -------- Explainable Scores --------
    scores_data = {
        "text": t_score,
        "sentiment": s_score,
        "behavior": b_score,
        "ip": i_score,
        "similarity": int(confidence * 100)
    }

    # -------- DB Insert --------
    conn = sqlite3.connect("reviews.db")
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO reviews (timestamp, text, username, rating, client_ip, scores_json, final_score, label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.utcnow().isoformat(),
            text,
            username,
            rating,
            client_ip,
            json.dumps(scores_data),
            float(final_score),
            final_label
        )
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()

    return {
        "id": int(new_id),
        "text": text,
        "rating": rating,
        "username": username,
        "label": final_label,
        "final_score": round(float(final_score), 2),
        "scores": scores_data
    }




@app.get("/api/reviews")
def get_reviews():
    conn = sqlite3.connect("reviews.db")
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM reviews ORDER BY id DESC").fetchall()
    conn.close()

    clean_rows = []
    for r in rows:
        clean_rows.append({
            "id": int(r["id"]),
            "timestamp": str(r["timestamp"]),
            "text": str(r["text"]),
            "username": r["username"] if r["username"] else None,
            "rating": int(r["rating"]) if r["rating"] is not None else None,
            "final_score": float(r["final_score"]),
            "label": str(r["label"]),
        })

    return clean_rows

