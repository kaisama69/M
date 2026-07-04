import os
import sqlite3
import pickle
import sys
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from utils.preprocessing import clean_text

app = Flask(__name__)

# Constants
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'database', 'db.sqlite3')
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'sentiment_model.pkl')
VECTORIZER_PATH = os.path.join(BASE_DIR, 'model', 'vectorizer.pkl')

# Ensure database directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Load model and vectorizer
model = None
vectorizer = None

def init_db():
    """Initializes the SQLite database with the journals table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS journals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            raw_text TEXT NOT NULL,
            cleaned_text TEXT NOT NULL,
            sentiment TEXT NOT NULL,
            confidence REAL NOT NULL,
            recommendation TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

def load_models():
    """Loads the pre-trained vectorizer and sentiment classification model."""
    global model, vectorizer
    if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
        print("WARNING: Model or Vectorizer files not found. Please run training first!")
        return False
    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        with open(VECTORIZER_PATH, 'rb') as f:
            vectorizer = pickle.load(f)
        print("Model and Vectorizer loaded successfully.")
        return True
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

# Initialize database
init_db()

# Try loading models; if it fails, we will print a warning but keep Flask running
models_loaded = load_models()

def get_recommendation(sentiment):
    """Returns a tailored mental health recommendation based on sentiment."""
    if sentiment == 'Positive':
        return "You're doing great! Keep up this positive energy. Remember to appreciate this moment and continue doing what makes you happy!"
    elif sentiment == 'Negative':
        return "It sounds like you're going through a tough time. It's completely okay to feel this way. Take a slow, deep breath. Consider sharing your thoughts with a trusted friend, practicing self-care, or taking a short break. You are not alone."
    else:  # Neutral
        return "A balanced state of mind. It's a good time to reflect on your goals, write down something you're grateful for, or practice mindfulness to keep centered."



# ----------------- API Endpoints -----------------

@app.route('/api/analyze', methods=['POST'])
def analyze_sentiment():
    """
    Analyzes the sentiment of a text entry, stores the log in SQLite,
    and returns prediction results + encouragement recommendations.
    """
    global model, vectorizer
    if model is None or vectorizer is None:
        # Attempt to load models again in case they were trained after start
        if not load_models():
            return jsonify({'error': 'Machine learning model files not loaded.'}), 500
            
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({'error': 'Journal content cannot be empty.'}), 400
        
    try:
        # Preprocessing
        cleaned = clean_text(text)
        if not cleaned:  # Handled edge case where text only contains punctuation/numbers
            cleaned = "neutral"
            
        # Vectorize
        features = vectorizer.transform([cleaned])
        
        # Predict
        prediction = model.predict(features)[0]
        
        # Get confidence/probability
        probs = model.predict_proba(features)[0]
        classes = model.classes_
        class_idx = list(classes).index(prediction)
        confidence = float(probs[class_idx])
        
        # Determine recommendation
        recommendation = get_recommendation(prediction)
        
        # Store in Database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO journals (raw_text, cleaned_text, sentiment, confidence, recommendation)
            VALUES (?, ?, ?, ?, ?)
        ''', (text, cleaned, prediction, confidence, recommendation))
        conn.commit()
        
        # Get the ID of the newly created journal entry
        entry_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'id': entry_id,
            'sentiment': prediction,
            'confidence': confidence,
            'recommendation': recommendation,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Retrieves all past journal entries, ordered chronologically (newest first)."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM journals ORDER BY timestamp DESC')
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            history.append({
                'id': row['id'],
                'raw_text': row['raw_text'],
                'cleaned_text': row['cleaned_text'],
                'sentiment': row['sentiment'],
                'confidence': row['confidence'],
                'recommendation': row['recommendation'],
                'timestamp': row['timestamp']
            })
            
        return jsonify(history)
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Aggregates data to compile counts and trend patterns for visualization charts."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. Total counts per class
        cursor.execute('''
            SELECT sentiment, COUNT(*) 
            FROM journals 
            GROUP BY sentiment
        ''')
        counts = {'Positive': 0, 'Negative': 0, 'Neutral': 0}
        for sentiment, count in cursor.fetchall():
            if sentiment in counts:
                counts[sentiment] = count
                
        # 2. Daily sentiment timeline data
        cursor.execute('''
            SELECT timestamp, sentiment, confidence, raw_text
            FROM journals 
            ORDER BY timestamp ASC
        ''')
        rows = cursor.fetchall()
        conn.close()
        
        timeline = []
        for timestamp, sentiment, confidence, raw_text in rows:
            # Clean text preview for charts (first 30 characters)
            preview = raw_text[:30] + '...' if len(raw_text) > 30 else raw_text
            timeline.append({
                'timestamp': timestamp,
                'sentiment': sentiment,
                'confidence': confidence,
                'preview': preview
            })
            
        return jsonify({
            'counts': counts,
            'timeline': timeline,
            'total': sum(counts.values())
        })
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

if __name__ == '__main__':
    # Ensure models are loaded before running app
    load_models()
    app.run(host='127.0.0.1', port=5000, debug=True)
