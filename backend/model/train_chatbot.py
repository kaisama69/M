import os
import json
import pickle
import sys
import time

# Ensure backend directory is in python path to allow importing preprocessing
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.preprocessing import clean_text
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

def train_chatbot():
    dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dataset', 'chat_intents.json'))
    model_dir = os.path.abspath(os.path.dirname(__file__))
    
    print("=" * 60)
    print("  MindScale Chatbot Model Training")
    print("=" * 60)
    print(f"\nLoading dataset from: {dataset_path}")
    
    # ── 1. Load dataset ──────────────────────────────────────────
    with open(dataset_path, 'r') as f:
        data = json.load(f)
        
    texts = []
    labels = []
    
    for intent in data['intents']:
        for pattern in intent['patterns']:
            texts.append(pattern)
            labels.append(intent['intent'])
            
    print(f"Loaded {len(texts)} samples across {len(set(labels))} intents.\n")
    
    # ── 2. Preprocess text ────────────────────────────────────────
    print("Preprocessing text...")
    cleaned_texts = [clean_text(t) for t in texts]
    
    # ── 3. TF-IDF Vectorization ───────────────────────────────────
    print("Fitting TF-IDF Vectorizer...")
    start = time.time()
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True
    )
    X = vectorizer.fit_transform(cleaned_texts)
    print(f"Vocabulary size: {len(vectorizer.vocabulary_)} features. Done in {time.time() - start:.1f}s.\n")
    
    # ── 4. Train Model ────────────────────────────────────────────
    print("Training Logistic Regression classifier...")
    start = time.time()
    classifier = LogisticRegression(
        max_iter=1000,
        C=1.0,
        solver='lbfgs',
        random_state=42
    )
    classifier.fit(X, labels)
    print(f"Training complete in {time.time() - start:.1f}s.\n")
    
    # ── 5. Save artifacts ─────────────────────────────────────────
    vectorizer_path = os.path.join(model_dir, 'chatbot_vectorizer.pkl')
    model_path = os.path.join(model_dir, 'chatbot_model.pkl')
    
    print(f"Saving vectorizer -> {vectorizer_path}")
    with open(vectorizer_path, 'wb') as f:
        pickle.dump(vectorizer, f)
        
    print(f"Saving model      -> {model_path}")
    with open(model_path, 'wb') as f:
        pickle.dump(classifier, f)
    
    print("\n" + "=" * 60)
    print("  Training Complete Successfully!")
    print(f"  Intents: {list(classifier.classes_)}")
    print("=" * 60)

if __name__ == "__main__":
    train_chatbot()
