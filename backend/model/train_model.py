import csv
import os
import pickle
import sys

# Ensure backend directory is in python path to allow importing preprocessing
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.preprocessing import clean_text
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def train():
    dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'dataset', 'dataset.csv'))
    model_dir = os.path.abspath(os.path.dirname(__file__))
    
    print(f"Loading dataset from {dataset_path}...")
    
    texts = []
    labels = []
    
    try:
        with open(dataset_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                texts.append(row['text'])
                labels.append(row['sentiment'])
    except Exception as e:
        print(f"Error loading dataset: {e}")
        sys.exit(1)
        
    print(f"Loaded {len(texts)} samples. Preprocessing text...")
    
    cleaned_texts = [clean_text(text) for text in texts]
    
    print("Fitting TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    X = vectorizer.fit_transform(cleaned_texts)
    y = labels
    
    # Check class distribution
    classes = set(y)
    print(f"Classes: {classes}")
    for c in classes:
        print(f"  Class '{c}': {y.count(c)} samples")
        
    # Split data to check accuracy (even though dataset is small, let's print evaluation)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training Logistic Regression classifier...")
    # Using Logistic Regression with balanced class weights for robust classification
    classifier = LogisticRegression(class_weight='balanced', random_state=42)
    classifier.fit(X_train, y_train)
    
    # Evaluate
    y_pred = classifier.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Validation Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Now retrain on full dataset to maximize data utility
    print("Retraining model on full dataset...")
    full_classifier = LogisticRegression(class_weight='balanced', random_state=42)
    full_classifier.fit(X, y)
    
    # Save the models
    vectorizer_path = os.path.join(model_dir, 'vectorizer.pkl')
    model_path = os.path.join(model_dir, 'sentiment_model.pkl')
    
    print(f"Saving vectorizer to {vectorizer_path}...")
    with open(vectorizer_path, 'wb') as f:
        pickle.dump(vectorizer, f)
        
    print(f"Saving classifier model to {model_path}...")
    with open(model_path, 'wb') as f:
        pickle.dump(full_classifier, f)
        
    print("Training complete successfully!")

if __name__ == "__main__":
    train()
