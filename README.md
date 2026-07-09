# MindScale: AI-Powered Mental Health Tracking System

MindScale is a mobile application for real-time sentiment analysis and mental health journaling. The system processes user reflections, identifies emotional states, provides supportive feedback, tracks mental health trends, and includes face-based biometric authentication.

---

## 📁 Project Structure

```
MindScale/
├── backend/
│   ├── app.py                          # Flask API server
│   ├── model/
│   │   ├── train_model.py              # ML pipeline training script
│   │   ├── sentiment_model.pkl         # Trained Logistic Regression classifier
│   │   └── vectorizer.pkl             # Fitted TF-IDF Vectorizer
│   ├── models/
│   │   └── face_landmarker.task        # MediaPipe face landmark model
│   ├── utils/
│   │   ├── preprocessing.py            # Text cleaning and tokenization
│   │   └── face_recognition_utils.py   # Face encoding and matching
│   └── database/
│       └── db.sqlite3                  # SQLite database
├── mobile/
│   ├── App.js                          # Expo app entry point
│   ├── src/
│   │   ├── screens/                    # App screens
│   │   ├── components/                 # Reusable UI components
│   │   ├── navigation/                 # Navigation config
│   │   ├── utils/                      # Helper utilities
│   │   ├── config.js                   # API configuration
│   │   └── theme.js                    # App theme/colors
│   ├── assets/                         # Images and fonts
│   ├── app.json                        # Expo configuration
│   └── package.json                    # Node dependencies
├── dataset/
│   ├── Combined Data.csv               # Full training dataset
│   └── dataset.csv                     # Sample dataset
├── requirements.txt                    # Python dependencies
└── README.md
```

---

## ⚙️ Core Pipeline

1. **Journal Entry** — User submits text via the mobile app
2. **Preprocessing** — Text is cleaned, tokenized, and stopwords removed
3. **TF-IDF Vectorization** — Text converted to numerical features
4. **Classification** — Logistic Regression predicts sentiment (Positive / Negative / Neutral)
5. **Recommendation** — Supportive feedback based on sentiment
6. **Persistence** — Entries saved in SQLite with timestamps
7. **Face Unlock** — Biometric login via MediaPipe face landmarks

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.13+** with pip
- **Node.js 18+** with npm
- **Expo Go** app on your mobile device

### 1. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install Mobile Dependencies
```bash
cd mobile
npm install
```

### 3. Start the Backend Server
```bash
python backend/app.py
```
The API server runs on `http://0.0.0.0:5000/`.

### 4. Start the Mobile App
```bash
cd mobile
npx expo start
```
Scan the QR code with Expo Go to launch on your device.

### 5. Retrain the ML Model (Optional)
```bash
python backend/model/train_model.py
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Analyze journal text and return sentiment |
| `GET` | `/api/history` | Get all journal entries |
| `GET` | `/api/stats` | Aggregated sentiment statistics |
| `POST` | `/api/register` | Register a new user |
| `POST` | `/api/login` | User login |
| `POST` | `/api/face/register` | Register face encoding |
| `POST` | `/api/face/verify` | Verify face for login |

---

## 📱 Features

- **Sentiment Analysis** — ML-powered mood detection from journal text
- **Journal History** — Track all past entries with sentiment labels
- **Analytics Dashboard** — Visual mood trends and statistics
- **Face Unlock** — Biometric authentication using face landmarks
- **Recommendations** — Personalized mental health tips
