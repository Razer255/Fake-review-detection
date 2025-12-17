import pandas as pd, os, json

SRC = "datasets/fake_reviews_dataset.csv"
OUT = "datasets/clean_for_train.csv"

print("Loading CSV…")

# Use latin1 to avoid unicode issues, and skip corrupted lines
df = pd.read_csv(SRC, encoding="latin1", on_bad_lines="skip")

print("Loaded rows:", len(df))
print("Columns:", list(df.columns))

# Detect text column (usually last column in your dataset)
text_candidates = [c for c in df.columns if c.lower() in ("text","review","review_text","reviewbody")]
if text_candidates:
    text_col = text_candidates[0]
else:
    text_col = df.columns[-1]   # Use last column as text

# Detect label column
label_candidates = [c for c in df.columns if c.lower() in ("label","sentiment","class","target","y","is_fake")]
label_col = label_candidates[0] if label_candidates else None

print("Detected text column:", text_col)
print("Detected label column:", label_col)

if not label_col:
    print("\n⚠ No label column detected!")
    print("The cleaned CSV will contain text only. You MUST tell me the label column if it exists.\n")

    df2 = pd.DataFrame({
        "text": df[text_col].astype(str)
    })
    df2.to_csv(OUT, index=False)
    print("Created:", OUT)
else:
    df2 = pd.DataFrame({
        "text": df[text_col].astype(str),
        "label": df[label_col].astype(str),
    })
    df2.to_csv(OUT, index=False)
    print("Created cleaned labeled CSV:", OUT)
