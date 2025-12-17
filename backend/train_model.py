import argparse
import json
import os
import sqlite3
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from scipy.sparse import hstack
from sklearn.utils import resample


def load_csv(csv_path):
    df = pd.read_csv(csv_path, encoding="latin1")
    if "text" not in df.columns or "label" not in df.columns:
        raise ValueError("CSV must contain 'text' and 'label' columns.")
    df["text"] = df["text"].astype(str)
    df["label"] = df["label"].astype(str)
    return df


def balance(df):
    counts = df["label"].value_counts()
    max_n = counts.max()
    parts = []
    for lbl, cnt in counts.items():
        sub = df[df["label"] == lbl]
        if cnt < max_n:
            sub = resample(sub, replace=True, n_samples=max_n, random_state=42)
        parts.append(sub)
    return pd.concat(parts).sample(frac=1).reset_index(drop=True)


def main(args):
    # Load CSV
    df = load_csv(args.csv)

    # Load label map
    with open(args.label_map, "r") as f:
        label_map = json.load(f)

    # Map labels to numeric
    df["y"] = df["label"].map(label_map)
    df = df[df["y"].notna()]

    # Balance
    df = balance(df)

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(df["text"], df["y"], test_size=0.2)

    # TF-IDF
    vectorizer = TfidfVectorizer(ngram_range=(1,2), max_features=20000)
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)

    # Train model
    clf = RandomForestClassifier(n_estimators=200, random_state=42)
    clf.fit(X_train_tfidf, y_train)

    # Predictions
    preds = clf.predict(X_test_tfidf)

    print("\nAccuracy:", accuracy_score(y_test, preds))
    print("\nClassification Report:\n", classification_report(y_test, preds))
    print("\nConfusion Matrix:\n", confusion_matrix(y_test, preds))

    os.makedirs("models", exist_ok=True)
    joblib.dump(clf, "models/rf_model.joblib")
    joblib.dump(vectorizer, "models/tfidf_vectorizer.joblib")

    with open("models/meta.json", "w") as f:
        json.dump({"label_map": label_map}, f)

    print("\nModel saved to models/ folder!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    parser.add_argument("--label-map", required=True)
    args = parser.parse_args()
    main(args)
