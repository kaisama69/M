import os
import sqlite3
import pickle
import sys
import random
import string
import re
import smtplib
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from utils.preprocessing import clean_text
from utils.face_recognition_utils import (
    extract_face_encoding_from_base64,
    compare_face_encodings,
    encoding_to_json,
    FACE_LIBS_AVAILABLE,
)
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

sia = SentimentIntensityAnalyzer()


app = Flask(__name__)
CORS(app)

# Constants
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'database', 'db.sqlite3')
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'sentiment_model.pkl')
VECTORIZER_PATH = os.path.join(BASE_DIR, 'model', 'vectorizer.pkl')

CHATBOT_MODEL_PATH = os.path.join(BASE_DIR, 'model', 'chatbot_model.pkl')
CHATBOT_VECTORIZER_PATH = os.path.join(BASE_DIR, 'model', 'chatbot_vectorizer.pkl')

# Ensure database directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# Load model and vectorizer
model = None
vectorizer = None
chatbot_model = None
chatbot_vectorizer = None

def init_db():
    """Initializes the SQLite database with the journals, users, and email_verifications tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_admin INTEGER DEFAULT 0
        )
    ''')
    
    # 2. Create email_verifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_verifications (
            email TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL
        )
    ''')
    
    # 3. Create journals table
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
    
    # 4. Check if user_id column exists in journals, and add if missing
    cursor.execute("PRAGMA table_info(journals)")
    columns = [row[1] for row in cursor.fetchall()]
    if 'user_id' not in columns:
        cursor.execute("ALTER TABLE journals ADD COLUMN user_id INTEGER REFERENCES users(id)")

    # 5. Check if is_admin column exists in users, and add if missing
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [row[1] for row in cursor.fetchall()]
    if 'is_admin' not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
        
    # 6. Check if biometric_token column exists in users, and add if missing
    if 'biometric_token' not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN biometric_token TEXT DEFAULT NULL")

    # 7. Check if face_encoding column exists in users, and add if missing
    if 'face_encoding' not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN face_encoding TEXT DEFAULT NULL")

    # 8. Check if mood_rating and tags columns exist in journals
    cursor.execute("PRAGMA table_info(journals)")
    journal_columns = [row[1] for row in cursor.fetchall()]
    if 'mood_rating' not in journal_columns:
        cursor.execute("ALTER TABLE journals ADD COLUMN mood_rating INTEGER DEFAULT 3")
    if 'tags' not in journal_columns:
        cursor.execute("ALTER TABLE journals ADD COLUMN tags TEXT DEFAULT ''")

    # 9. Create breathing_logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS breathing_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            mode TEXT NOT NULL,
            duration_seconds INTEGER NOT NULL,
            stress_before INTEGER DEFAULT NULL,
            stress_after INTEGER DEFAULT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
        
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

def load_models():
    """Loads the pre-trained vectorizer and sentiment classification model."""
    global model, vectorizer, chatbot_model, chatbot_vectorizer
    if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
        print("WARNING: Model or Vectorizer files not found. Please run training first!")
        return False
    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        with open(VECTORIZER_PATH, 'rb') as f:
            vectorizer = pickle.load(f)
            
        if os.path.exists(CHATBOT_MODEL_PATH) and os.path.exists(CHATBOT_VECTORIZER_PATH):
            with open(CHATBOT_MODEL_PATH, 'rb') as f:
                chatbot_model = pickle.load(f)
            with open(CHATBOT_VECTORIZER_PATH, 'rb') as f:
                chatbot_vectorizer = pickle.load(f)
            print("Chatbot models loaded successfully.")
            
        print("Model and Vectorizer loaded successfully.")
        return True
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

# Initialize database
init_db()

# Try loading models; if it fails, we will print a warning but keep Flask running
models_loaded = load_models()

# Mental health class colors for frontend consistency
CLASS_META = {
    'Normal':               {'color': '#10b981', 'icon': 'fa-face-smile'},
    'Depression':            {'color': '#6366f1', 'icon': 'fa-cloud-rain'},
    'Anxiety':               {'color': '#f59e0b', 'icon': 'fa-heart-pulse'},
    'Suicidal':              {'color': '#ef4444', 'icon': 'fa-phone'},
    'Stress':                {'color': '#f97316', 'icon': 'fa-fire'},
    'Bipolar':               {'color': '#8b5cf6', 'icon': 'fa-arrows-up-down'},
    'Personality disorder':  {'color': '#ec4899', 'icon': 'fa-puzzle-piece'},
}

def get_recommendation(sentiment):
    """Returns a tailored mental health recommendation based on the predicted class."""
    recommendations = {
        'Normal': (
            "You're in a healthy headspace — that's wonderful! "
            "Keep nurturing your well-being: stay connected with loved ones, "
            "maintain your routines, and take time to enjoy what makes you happy."
        ),
        'Depression': (
            "It sounds like you may be feeling down. Please know that these feelings are valid "
            "and you don't have to face them alone. Consider talking to someone you trust, "
            "engaging in gentle physical activity, or reaching out to a mental health professional. "
            "Small steps — like getting sunlight or writing your thoughts — can make a real difference."
        ),
        'Anxiety': (
            "You may be experiencing some anxiety. Try grounding yourself: focus on 5 things you can see, "
            "4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. "
            "Deep, slow breathing (4-7-8 technique) can also help calm your nervous system. "
            "Remember — this feeling is temporary."
        ),
        'Suicidal': (
            "We care about you deeply. If you are in crisis or having thoughts of self-harm, "
            "please reach out immediately:\n"
            "• National Suicide Prevention Lifeline: 988 (call or text)\n"
            "• Crisis Text Line: Text HOME to 741741\n"
            "• International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/\n\n"
            "You matter, and help is available right now. Please talk to someone."
        ),
        'Stress': (
            "It seems like you're under some stress. That's completely normal, but managing it is important. "
            "Try taking short breaks, practicing progressive muscle relaxation, or going for a walk. "
            "Prioritize your tasks and don't hesitate to ask for help when you need it. "
            "Even 5 minutes of mindfulness can reset your stress response."
        ),
        'Bipolar': (
            "Your feelings may be fluctuating — this can be challenging. Keeping a mood journal (like this one!) "
            "is a great step. Try to maintain consistent sleep schedules and routines. "
            "If you notice extreme highs or lows, consider consulting a mental health professional "
            "who can provide personalized guidance and support."
        ),
        'Personality disorder': (
            "Understanding yourself is a brave journey. If interpersonal patterns feel difficult or overwhelming, "
            "you're not alone. Dialectical Behavior Therapy (DBT) techniques — like distress tolerance "
            "and emotional regulation — can be very helpful. Consider connecting with a therapist "
            "who specializes in personality-related concerns. You deserve compassionate support."
        ),
    }
    return recommendations.get(sentiment, "Take a moment to reflect on how you're feeling. Self-awareness is the first step toward well-being.")



# SMTP Settings (can be configured via environment variables for production)
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
SENDER_EMAIL = 'asish.prt@gmail.com'
SENDER_PASSWORD = 'cfic fsxr plzv mcyy'

def send_verification_email(email, code):
    """Sends verification code to Gmail. Returns True if successful, False otherwise."""
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("SMTP credentials not fully set. Email not sent.")
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = email
        msg['Subject'] = "MindScale Sign Up Verification Code"
        
        body = f"""Hello,

Thank you for signing up for MindScale, your AI-powered Mental Health Tracking System.

Your 6-digit email verification code is:

------------------
{code}
------------------

This code is valid for 10 minutes. If you did not request this code, please ignore this email.

Stay mindful,
MindScale Team
"""
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, email, msg.as_string())
        server.quit()
        print(f"Verification email sent to {email}")
        return True
    except Exception as e:
        print(f"Error sending verification email: {e}")
        return False

def generate_verification_code():
    return "".join(random.choices(string.digits, k=6))

def get_authenticated_user_id():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return None
    try:
        return int(user_id)
    except ValueError:
        return None

# ----------------- Auth Endpoints -----------------

@app.route('/api/auth/send-code', methods=['POST'])
def send_code():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'error': 'Email is required.'}), 400
        
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({'error': 'Invalid email format.'}), 400
        
    code = generate_verification_code()
    expires_at = (datetime.now() + timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO email_verifications (email, code, expires_at)
            VALUES (?, ?, ?)
        ''', (email, code, expires_at))
        conn.commit()
        conn.close()
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
        
    sent = send_verification_email(email, code)
    
    # Log to server console
    print("\n" + "="*50, flush=True)
    print(f"  VERIFICATION CODE FOR: {email}", flush=True)
    print(f"  CODE: {code}", flush=True)
    print("="*50 + "\n", flush=True)
    
    if sent:
        return jsonify({
            'message': 'A verification code has been sent to your email.'
        }), 200
    else:
        return jsonify({
            'message': 'SMTP not configured. Verification code logged to terminal.',
            'mock_code': code,
            'is_mocked': True
        }), 200

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    code = data.get('code', '').strip()
    
    if not email or not password or not code:
        return jsonify({'error': 'Email, password, and verification code are required.'}), 400
        
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters long.'}), 400
    if not re.search(r"[A-Z]", password):
        return jsonify({'error': 'Password must contain at least one uppercase letter.'}), 400
    if not re.search(r"[a-z]", password):
        return jsonify({'error': 'Password must contain at least one lowercase letter.'}), 400
    if not re.search(r"[0-9]", password):
        return jsonify({'error': 'Password must contain at least one number.'}), 400
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return jsonify({'error': 'Password must contain at least one special character.'}), 400
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT code, expires_at FROM email_verifications WHERE email = ?', (email,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Please request a verification code first.'}), 400
            
        stored_code, expires_at_str = row
        expires_at = datetime.strptime(expires_at_str, "%Y-%m-%d %H:%M:%S")
        
        if datetime.now() > expires_at:
            conn.close()
            return jsonify({'error': 'Verification code has expired. Please request a new one.'}), 400
            
        if stored_code != code:
            conn.close()
            return jsonify({'error': 'Invalid verification code.'}), 400
            
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'An account with this email already exists.'}), 400
            
        password_hash = generate_password_hash(password)
        cursor.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', (email, password_hash))
        user_id = cursor.lastrowid
        cursor.execute('DELETE FROM email_verifications WHERE email = ?', (email,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Signup successful! You can now log in.',
            'user': {
                'id': user_id,
                'email': email,
                'is_admin': 0
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT id, email, password_hash, is_admin FROM users WHERE email = ?', (email,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Invalid email or password.'}), 401
            
        user_id, user_email, password_hash, is_admin = row
        
        if not check_password_hash(password_hash, password):
            return jsonify({'error': 'Invalid email or password.'}), 401
            
        return jsonify({
            'message': 'Login successful!',
            'user': {
                'id': user_id,
                'email': user_email,
                'is_admin': is_admin
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/auth/demo', methods=['POST'])
def demo_login():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if demo user already exists
        cursor.execute("SELECT id, email, is_admin FROM users WHERE email = 'demo@mindscale.com'")
        row = cursor.fetchone()
        
        if row:
            user_id, user_email, is_admin = row
            if not is_admin:
                cursor.execute("UPDATE users SET is_admin = 1 WHERE id = ?", (user_id,))
                conn.commit()
                is_admin = 1
        else:
            # Create a demo user as admin
            password_hash = generate_password_hash('DemoAccount123!')
            cursor.execute("INSERT INTO users (email, password_hash, is_admin) VALUES ('demo@mindscale.com', ?, 1)", (password_hash,))
            user_id = cursor.lastrowid
            conn.commit()
            user_email = 'demo@mindscale.com'
            is_admin = 1
            
        conn.close()
        return jsonify({
            'message': 'Logged in as Demo User!',
            'user': {
                'id': user_id,
                'email': user_email,
                'is_admin': is_admin
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500


@app.route('/api/auth/biometric-enroll', methods=['POST'])
def biometric_enroll():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    biometric_token = data.get('biometric_token')
    
    if not user_id or not biometric_token:
        return jsonify({'error': 'User ID and Biometric Token are required.'}), 400
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'User not found.'}), 404
            
        cursor.execute("UPDATE users SET biometric_token = ? WHERE id = ?", (biometric_token, user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Biometrics successfully enrolled in database!'}), 200
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500


@app.route('/api/auth/biometric-login', methods=['POST'])
def biometric_login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    biometric_token = data.get('biometric_token')
    
    if not email or not biometric_token:
        return jsonify({'error': 'Email and Biometric Token are required.'}), 400
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, email, is_admin, biometric_token FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'User account not found.'}), 404
            
        user_id, user_email, is_admin, stored_token = row
        
        if not stored_token or stored_token != biometric_token:
            return jsonify({'error': 'Invalid biometric signature.'}), 401
            
        return jsonify({
            'message': 'Biometric login successful!',
            'user': {
                'id': user_id,
                'email': user_email,
                'is_admin': is_admin
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500


@app.route('/api/auth/face-enroll', methods=['POST'])
def face_enroll():
    """Extract face landmarks from a captured image and store encoding in the database."""
    if not FACE_LIBS_AVAILABLE:
        return jsonify({
            'error': 'Face recognition is not available on the server. '
                     'Install: pip install mediapipe opencv-python-headless Pillow'
        }), 503

    data = request.get_json() or {}
    user_id = data.get('user_id')
    face_image = data.get('face_image', '')

    if not user_id or not face_image:
        return jsonify({'error': 'User ID and face image are required.'}), 400

    try:
        encoding = extract_face_encoding_from_base64(face_image)
        if encoding is None:
            return jsonify({
                'error': 'No face detected. Center your face in the frame with good lighting and try again.'
            }), 400

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'User not found.'}), 404

        encoding_json = encoding_to_json(encoding)
        cursor.execute(
            'UPDATE users SET face_encoding = ?, biometric_token = ? WHERE id = ?',
            (encoding_json, 'face_enrolled', user_id),
        )
        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Face enrolled successfully.',
            'landmarks_count': len(encoding),
        }), 200
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': f'Face enrollment error: {str(e)}'}), 500


@app.route('/api/auth/face-verify', methods=['POST'])
def face_verify():
    """Compare a live face capture against the enrolled face encoding in the database."""
    if not FACE_LIBS_AVAILABLE:
        return jsonify({
            'error': 'Face recognition is not available on the server. '
                     'Install: pip install mediapipe opencv-python-headless Pillow'
        }), 503

    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    face_image = data.get('face_image', '')

    if not email or not face_image:
        return jsonify({'error': 'Email and face image are required.'}), 400

    try:
        live_encoding = extract_face_encoding_from_base64(face_image)
        if live_encoding is None:
            return jsonify({
                'error': 'No face detected. Look directly at the camera and try again.'
            }), 400

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, email, is_admin, face_encoding FROM users WHERE email = ?',
            (email,),
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({'error': 'User account not found.'}), 404

        user_id, user_email, is_admin, stored_encoding = row

        if not stored_encoding:
            return jsonify({
                'error': 'No face enrolled for this account. Please sign in with password and enroll your face.'
            }), 400

        is_match, confidence, distance = compare_face_encodings(stored_encoding, live_encoding)

        if not is_match:
            return jsonify({
                'error': 'Face did not match. Please try again or use password login.',
                'confidence': round(confidence, 4),
                'distance': round(distance, 4),
            }), 401

        return jsonify({
            'message': 'Face verified successfully!',
            'confidence': round(confidence, 4),
            'user': {
                'id': user_id,
                'email': user_email,
                'is_admin': is_admin,
            },
        }), 200
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': f'Face verification error: {str(e)}'}), 500


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
            
    user_id = get_authenticated_user_id()
    if user_id is None:
        return jsonify({'error': 'Unauthorized. Please log in.'}), 401

    data = request.get_json() or {}
    text = data.get('text', '').strip()
    mood_rating = int(data.get('mood_rating', 3))
    tags = str(data.get('tags', '')).strip()
    
    if not text:
        return jsonify({'error': 'Journal content cannot be empty.'}), 400
        
    try:
        # Preprocessing
        cleaned = clean_text(text)
        if not cleaned:  # Handled edge case where text only contains punctuation/numbers
            cleaned = "neutral"
            
        # Vectorize
        features = vectorizer.transform([cleaned if cleaned else "neutral"])
        
        # Predict using primary Scikit-Learn Logistic Regression model
        prediction = model.predict(features)[0]
        
        # Get confidence/probability
        probs = model.predict_proba(features)[0]
        classes = model.classes_
        class_idx = list(classes).index(prediction)
        confidence = float(probs[class_idx])

        # Clinical Safety Keyword & Multi-layer Sentiment Refinement
        low_text = text.lower()
        suicidal_kws = [
            'suicide', 'kill myself', 'end my life', 'want to die', 'dying inside', 
            'feel like dying', 'feeling like dying', 'wish i was dead', 'rather be dead', 
            'no reason to live', 'cannot go on', 'cant go on', 'hate my life'
        ]
        depression_kws = [
            'depressed', 'depression', 'hopeless', 'worthless', 'empty inside', 'miserable', 
            'feel like crying', 'feel like giving up', 'feeling down', 'lonely', 'sadness', 
            'heartbroken', 'crying', 'broken', 'useless', 'no energy', 'numb', 'dying'
        ]
        anxiety_kws = [
            'anxious', 'anxiety', 'panic', 'panicking', 'panic attack', 'terrified', 
            'scared', 'fear', 'nervous', 'freaking out', 'worrying', 'worried', 'dread'
        ]
        stress_kws = [
            'stressed', 'stress', 'overwhelmed', 'burnt out', 'burnout', 'exhausted', 
            'under pressure', 'too much work', 'cant cope', 'can\'t cope', 'breakdown'
        ]
        bipolar_kws = ['mood swings', 'bipolar', 'manic', 'mania', 'unstable mood']

        if any(kw in low_text for kw in suicidal_kws):
            prediction = 'Suicidal'
            confidence = max(confidence, 0.95)
        elif any(kw in low_text for kw in depression_kws):
            if prediction in ['Normal', 'Stress', 'Anxiety']:
                prediction = 'Depression'
                confidence = max(confidence, 0.88)
        elif any(kw in low_text for kw in anxiety_kws):
            if prediction in ['Normal']:
                prediction = 'Anxiety'
                confidence = max(confidence, 0.85)
        elif any(kw in low_text for kw in stress_kws):
            if prediction in ['Normal']:
                prediction = 'Stress'
                confidence = max(confidence, 0.85)
        elif any(kw in low_text for kw in bipolar_kws):
            prediction = 'Bipolar'
            confidence = max(confidence, 0.85)
        elif mood_rating <= 2 and prediction == 'Normal':
            prediction = 'Depression' if mood_rating == 1 else 'Stress'
            confidence = max(confidence, 0.80)
        
        # Determine recommendation based on refined prediction
        recommendation = get_recommendation(prediction)
        
        # Store in Database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO journals (raw_text, cleaned_text, sentiment, confidence, recommendation, user_id, mood_rating, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (text, cleaned, prediction, confidence, recommendation, user_id, mood_rating, tags))
        conn.commit()
        
        # Get the ID of the newly created journal entry
        entry_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'id': entry_id,
            'sentiment': prediction,
            'confidence': confidence,
            'recommendation': recommendation,
            'mood_rating': mood_rating,
            'tags': tags,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Retrieves all past journal entries, ordered chronologically (newest first)."""
    user_id = get_authenticated_user_id()
    if user_id is None:
        return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM journals WHERE user_id = ? ORDER BY timestamp DESC', (user_id,))
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
                'mood_rating': row['mood_rating'] if 'mood_rating' in row.keys() and row['mood_rating'] is not None else 3,
                'tags': row['tags'] if 'tags' in row.keys() and row['tags'] is not None else '',
                'timestamp': row['timestamp']
            })
            
        return jsonify(history)
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/journal/<int:journal_id>', methods=['DELETE'])
def delete_journal(journal_id):
    """Allows user or admin to delete a specific journal entry."""
    user_id = get_authenticated_user_id()
    if user_id is None:
        return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check user admin status
        cursor.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,))
        user_row = cursor.fetchone()
        is_admin = bool(user_row['is_admin']) if user_row else False
        
        # Fetch the target journal entry
        cursor.execute('SELECT user_id FROM journals WHERE id = ?', (journal_id,))
        journal_row = cursor.fetchone()
        
        if not journal_row:
            conn.close()
            return jsonify({'error': 'Journal entry not found.'}), 404
            
        # Verify ownership or admin privilege
        if not is_admin and journal_row['user_id'] != user_id:
            conn.close()
            return jsonify({'error': 'Permission denied.'}), 403
            
        cursor.execute('DELETE FROM journals WHERE id = ?', (journal_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Journal entry deleted successfully.', 'deleted_id': journal_id}), 200
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

# ==========================================
# Breathing Tracker Endpoints
# ==========================================

@app.route('/api/breathing/log', methods=['POST'])
def log_breathing_session():
    """Logs a completed breathing session with optional pre/post stress levels."""
    user_id = get_authenticated_user_id()
    if user_id is None:
        return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        
    data = request.get_json() or {}
    mode = data.get('mode', 'relax')
    duration = int(data.get('duration_seconds', 180))
    stress_before = data.get('stress_before')
    stress_after = data.get('stress_after')
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO breathing_logs (user_id, mode, duration_seconds, stress_before, stress_after)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, mode, duration, stress_before, stress_after))
        conn.commit()
        log_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'message': 'Breathing session logged.', 'id': log_id}), 200
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/breathing/stats', methods=['GET'])
def get_breathing_stats():
    """Gets total breathing count, total minutes, and streak days for user."""
    user_id = get_authenticated_user_id()
    if user_id is None:
        return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COUNT(*), COALESCE(SUM(duration_seconds), 0), AVG(stress_before - stress_after)
            FROM breathing_logs
            WHERE user_id = ?
        ''', (user_id,))
        total_sessions, total_seconds, avg_stress_drop = cursor.fetchone()
        
        # Calculate distinct active days streak
        cursor.execute('''
            SELECT DISTINCT DATE(timestamp)
            FROM breathing_logs
            WHERE user_id = ?
            ORDER BY DATE(timestamp) DESC
        ''', (user_id,))
        dates = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        # Simple streak calculation
        streak = len(dates) # Total unique days logged
        
        return jsonify({
            'total_sessions': total_sessions,
            'total_minutes': round(total_seconds / 60, 1),
            'avg_stress_reduction': round(avg_stress_drop, 1) if avg_stress_drop else 0,
            'streak_days': streak
        }), 200
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Aggregates data to compile counts and trend patterns for visualization charts."""
    user_id = get_authenticated_user_id()
    if user_id is None:
        return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. Total counts per class
        cursor.execute('''
            SELECT sentiment, COUNT(*) 
            FROM journals 
            WHERE user_id = ?
            GROUP BY sentiment
        ''', (user_id,))
        counts = {}
        for sentiment, count in cursor.fetchall():
            counts[sentiment] = count
                
        # 2. Daily sentiment timeline data
        cursor.execute('''
            SELECT timestamp, sentiment, confidence, raw_text
            FROM journals 
            WHERE user_id = ?
            ORDER BY timestamp ASC
        ''', (user_id,))
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

# ==========================================
# Admin Routes
# ==========================================

@app.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get users and their total journal count
        cursor.execute('''
            SELECT u.id, u.email, u.created_at, u.is_admin, COUNT(j.id) as journal_count
            FROM users u
            LEFT JOIN journals j ON u.id = j.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        ''')
        
        users = []
        for row in cursor.fetchall():
            users.append({
                'id': row[0],
                'email': row[1],
                'created_at': row[2],
                'is_admin': bool(row[3]),
                'journal_count': row[4]
            })
            
        conn.close()
        return jsonify({'users': users}), 200
        
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Delete user's journals first (cascade)
        cursor.execute('DELETE FROM journals WHERE user_id = ?', (user_id,))
        # Delete user
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'User not found.'}), 404
            
        conn.commit()
        conn.close()
        return jsonify({'message': 'User deleted successfully.'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/admin/users/<int:user_id>/toggle-admin', methods=['POST'])
def admin_toggle_user(user_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Fetch current status
        cursor.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'User not found.'}), 404
            
        new_status = 0 if row[0] == 1 else 1
        
        cursor.execute('UPDATE users SET is_admin = ? WHERE id = ?', (new_status, user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'User admin status updated.', 'is_admin': bool(new_status)}), 200
        
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500


# ==========================================
# Chatbot Route
# ==========================================

import json

# Helper functions for crisis logging & session state tracking
def log_crisis_event(user_id, message, intent, neg_score):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS crisis_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                timestamp TEXT,
                message TEXT,
                intent TEXT,
                negative_score REAL
            )
        ''')
        c.execute('INSERT INTO crisis_events (user_id, timestamp, message, intent, negative_score) VALUES (?,?,?,?,?)',
                  (user_id, datetime.utcnow().isoformat(), message, intent, neg_score))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error logging crisis event: {e}")

def store_user_session_intent(user_id, intent, compound_score):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS user_intents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                intent TEXT,
                compound_score REAL,
                timestamp TEXT
            )
        ''')
        c.execute('INSERT INTO user_intents (user_id, intent, compound_score, timestamp) VALUES (?,?,?,?)',
                  (user_id, intent, compound_score, datetime.utcnow().isoformat()))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error storing user session intent: {e}")

def get_recent_intents(user_id, limit=3):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT intent FROM user_intents WHERE user_id=? ORDER BY id DESC LIMIT ?', (user_id, limit))
        rows = c.fetchall()
        conn.close()
        return [r[0] for r in rows]
    except Exception as e:
        print(f"Error retrieving recent intents: {e}")
        return []

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Enhanced NLP Intent-Based Chatbot Endpoint
    Features:
    1. Intent Classification (TF-IDF + Logistic Regression)
    2. Sentiment Analysis (VADER Polarity & Compound Scoring)
    3. Crisis-Alert Detector (Suicidal intent / High Negative Sentiment)
    4. Session State Context Tracker (Stores recent interactions)
    """
    data = request.get_json(silent=True) or request.get_json(force=True, silent=True) or {}
    if not data or 'message' not in data:
        return jsonify({'error': 'No message provided'}), 400
        
    user_message = str(data['message']).strip()
    user_id = str(data.get('user_id', request.remote_addr))

    if not user_message:
        return jsonify({'error': 'Message cannot be empty'}), 400
        
    if not chatbot_model or not chatbot_vectorizer:
        return jsonify({'error': 'Chatbot ML models not loaded'}), 500
        
    try:
        # Feature 2: Sentiment Scoring via VADER
        sentiment_scores = sia.polarity_scores(user_message)
        compound = sentiment_scores['compound']
        neg_score = sentiment_scores['neg']

        # Determine overall sentiment label
        if compound >= 0.05:
            sentiment_label = 'positive'
        elif compound <= -0.05:
            sentiment_label = 'negative'
        else:
            sentiment_label = 'neutral'

        # Preprocess text for ML intent prediction
        cleaned_msg = clean_text(user_message)
        if not cleaned_msg:
            return jsonify({
                'response': "I didn't quite catch that. How are you feeling today?",
                'intent': 'unknown',
                'sentiment': sentiment_label,
                'is_crisis': False
            }), 200

        # Feature 1: Predict Intent using TF-IDF + Logistic Regression
        vec = chatbot_vectorizer.transform([cleaned_msg])
        intent = chatbot_model.predict(vec)[0]

        # Feature 1 (Safety): Crisis-Alert Classifier Check
        crisis_keywords = ['suicide', 'kill myself', 'end my life', 'want to die', 'harm myself']
        contains_crisis_kw = any(kw in cleaned_msg.lower() for kw in crisis_keywords)

        if intent == 'suicidal' or contains_crisis_kw or neg_score > 0.65:
            log_crisis_event(user_id, user_message, intent, neg_score)
            crisis_responses = [
                "I care about you, and you are not alone. Please reach out for help immediately. Call or text 988 (Crisis Lifeline) or contact emergency services.",
                "Your life is important. If you feel in crisis or overwhelmed, please reach out to a trusted professional or call 988 right away.",
                "It sounds like you're going through a critical crisis. Please connect with emergency support or a crisis helpline at 988."
            ]
            return jsonify({
                'response': random.choice(crisis_responses),
                'intent': 'crisis',
                'sentiment': 'crisis',
                'is_crisis': True,
                'sentiment_scores': sentiment_scores
            }), 200

        # Load responses mapped to intents
        intent_data_path = os.path.join(BASE_DIR, 'dataset', 'chat_intents.json')
        response_text = "I'm here for you. Tell me more about what's on your mind."
        if os.path.exists(intent_data_path):
            with open(intent_data_path, 'r') as f:
                intent_data = json.load(f)
            for item in intent_data.get('intents', []):
                if item['intent'] == intent:
                    response_text = random.choice(item['responses'])
                    break

        # Feature 3: Session State Tracking
        store_user_session_intent(user_id, intent, compound)
        recent_intents = get_recent_intents(user_id, limit=3)

        # Contextual recommendation based on recent user state history
        suggested_action = None
        if intent in ['anxious', 'sad'] or compound <= -0.4:
            suggested_action = "breathing_exercise"

        return jsonify({
            'response': response_text,
            'intent': intent,
            'sentiment': sentiment_label,
            'sentiment_scores': sentiment_scores,
            'is_crisis': False,
            'recent_history': recent_intents,
            'suggested_action': suggested_action
        }), 200

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({'error': 'Failed to process message'}), 500

if __name__ == '__main__':
    # Ensure models are loaded before running app
    load_models()
    app.run(host='0.0.0.0', port=5000, debug=True)

