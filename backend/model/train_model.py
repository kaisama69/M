import os
import pickle
import sys
import time

# Ensure backend directory is in python path to allow importing preprocessing
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pandas as pd
from utils.preprocessing import clean_text
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def train():
    dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'dataset', 'Combined Data.csv'))
    model_dir = os.path.abspath(os.path.dirname(__file__))
    
    print("=" * 60)
    print("  MindScale Model Training Pipeline")
    print("=" * 60)
    print(f"\nLoading dataset from: {dataset_path}")
    
    # ── 1. Load dataset ──────────────────────────────────────────
    df = pd.read_csv(dataset_path)
    
    # Drop the unnecessary index column and any rows with null statements
    df = df.drop(columns=['Unnamed: 0'], errors='ignore')
    df = df.dropna(subset=['statement'])
    
    print(f"Loaded {len(df)} samples across {df['status'].nunique()} classes.\n")
    
    # ── 2. Show class distribution ────────────────────────────────
    print("Class Distribution:")
    print("-" * 40)
    for status, count in df['status'].value_counts().items():
        pct = count / len(df) * 100
        print(f"  {status:<25} {count:>6}  ({pct:.1f}%)")
    print()
    
    # ── 3. Preprocess text ────────────────────────────────────────
    print("Preprocessing text (cleaning, lowering, removing stopwords)...")
    start = time.time()
    df['cleaned'] = df['statement'].apply(clean_text)
    
    # Remove rows where cleaning resulted in empty string
    df = df[df['cleaned'].str.strip().astype(bool)]
    print(f"Preprocessing complete in {time.time() - start:.1f}s. {len(df)} valid samples remain.\n")
    
    texts = df['cleaned'].tolist()
    labels = df['status'].tolist()
    
    # ── 4. TF-IDF Vectorization ───────────────────────────────────
    print("Fitting TF-IDF Vectorizer (unigrams + bigrams, max 50k features)...")
    start = time.time()
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=50000,
        min_df=2,
        max_df=0.95,
        sublinear_tf=True
    )
    X = vectorizer.fit_transform(texts)
    print(f"Vocabulary size: {len(vectorizer.vocabulary_)} features. Done in {time.time() - start:.1f}s.\n")
    
    # ── 5. Train/Test Split & Evaluation ──────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    print(f"Split: {X_train.shape[0]} train / {X_test.shape[0]} test")
    print("Training Logistic Regression classifier (balanced class weights)...")
    start = time.time()
    
    classifier = LogisticRegression(
        class_weight='balanced',
        max_iter=1000,
        C=1.0,
        solver='lbfgs',
        random_state=42,
        n_jobs=-1
    )
    classifier.fit(X_train, y_train)
    print(f"Training complete in {time.time() - start:.1f}s.\n")
    
    # Evaluate
    y_pred = classifier.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Validation Accuracy: {acc:.4f}  ({acc*100:.1f}%)")
    print("\nClassification Report:")
    print("-" * 60)
    print(classification_report(y_test, y_pred))
    
    # ── 6. Retrain on full dataset ────────────────────────────────
    print("Retraining final model on full dataset for maximum performance...")
    start = time.time()
    full_classifier = LogisticRegression(
        class_weight='balanced',
        max_iter=1000,
        C=1.0,
        solver='lbfgs',
        random_state=42,
        n_jobs=-1
    )
    full_classifier.fit(X, labels)
    print(f"Full retrain complete in {time.time() - start:.1f}s.\n")
    
    # ── 7. Save artifacts ─────────────────────────────────────────
    vectorizer_path = os.path.join(model_dir, 'vectorizer.pkl')
    model_path = os.path.join(model_dir, 'sentiment_model.pkl')
    
    print(f"Saving vectorizer -> {vectorizer_path}")
    with open(vectorizer_path, 'wb') as f:
        pickle.dump(vectorizer, f)
        
    print(f"Saving model      -> {model_path}")
    with open(model_path, 'wb') as f:
        pickle.dump(full_classifier, f)
    
    print("\n" + "=" * 60)
    print("  Training Complete Successfully!")
    print(f"  Classes: {list(full_classifier.classes_)}")
    print(f"  Validation Accuracy: {acc:.4f}")
    print("=" * 60)

if __name__ == "__main__":
    train()
