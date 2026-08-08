# MindScale: AI-Powered Mental Health Tracking System 🧠📱

**MindScale** is an end-to-end, privacy-focused mobile application for real-time mental health tracking, guided mood journaling, interactive breathing techniques, and an NLP-driven AI Companion. The system leverages custom Scikit-Learn Machine Learning models, VADER NLP sentiment scoring, crisis-alert classifiers, session context tracking, and MediaPipe biometric face recognition.

---

## 🌟 Key Features

1. **🤖 NLP AI Companion (Chatbot)**
   - Custom TF-IDF + Logistic Regression intent classifier trained on over 19,000 synthetic intent conversations.
   - Zero external LLM API dependency (fully offline & self-contained).

2. **🚨 Crisis-Alert Safety Classifier**
   - Multi-layer safety evaluation combining predicted intent, crisis keyword filters, and negative sentiment thresholds.
   - Provides immediate 24/7 crisis hotline guidance (988 Lifeline) and logs events securely to the database.

3. **📊 Real-Time VADER Sentiment Analysis**
   - Computes compound, positive, negative, and neutral polarity scores for user entries and messages.
   - Automatically triggers adaptive coping prompts (e.g. recommending breathing exercises during high stress).

4. **📖 Guided Mood Journaling**
   - 1–5 Emoji Mood Scale (😞 🙁 😐 😊 😁) + Context Tags (`#Work`, `#Sleep`, `#Exercise`, `#Relationships`, `#Stress`, `#Gratitude`).
   - Guided Reflection Prompts generator.
   - Ability for users and administrators to delete journal entries.

5. **🫁 Breathing Room & Mindfulness Tracker**
   - 3 Evidence-based techniques: 4-7-8 Relaxing Breath, 4-4-4-4 Box Breathing, 5-5 Balanced Breath.
   - Pre- & Post-Session Stress Level Check-in (1–10 scale).
   - Real-time **Mindfulness Streak Banner** (Days Streak, Total Minutes Calmed, Avg Stress Reduction).

6. **🔒 Biometric Face Unlock & Admin Portal**
   - Facial feature extraction & matching via MediaPipe.
   - Administrative dashboard for managing user accounts and system authorizations.

---

## 📁 Project Structure

```
MindScale/
├── backend/
│   ├── app.py                          # Flask REST API server & database manager
│   ├── model/
│   │   ├── sentiment_model.pkl         # Trained Scikit-Learn Logistic Regression model
│   │   ├── vectorizer.pkl              # Fitted TF-IDF Vectorizer for Journaling
│   │   ├── chatbot_model.pkl           # TF-IDF Chatbot intent classifier
│   │   ├── chatbot_vectorizer.pkl      # Chatbot vectorizer
│   │   ├── train_model.py              # Journal model training script
│   │   └── train_chatbot.py            # Chatbot model training script
│   ├── dataset/
│   │   ├── chat_intents.json           # High-precision intent dataset (~19k samples)
│   │   └── generate_data.py            # Synthetic dataset generator
│   ├── models/
│   │   └── face_landmarker.task        # MediaPipe landmark model
│   ├── utils/
│   │   ├── preprocessing.py            # NLP cleaning & text normalization
│   │   └── face_recognition_utils.py   # Facial encoding & comparison
│   └── database/
│       └── db.sqlite3                  # SQLite database
├── mobile/
│   ├── App.js                          # Main React Native / Expo entry point
│   ├── src/
│   │   ├── screens/                    # Journal, Chatbot, Breathing, Dashboard, Admin, Auth
│   │   ├── components/                 # Reusable UI components (Header, Toast, etc.)
│   │   ├── navigation/                 # Tab & Stack Navigators
│   │   ├── config.js                   # API configuration & base URLs
│   │   └── theme.js                    # Design design system & tokens
│   ├── app.json                        # Expo config
│   └── package.json                    # Dependencies
├── requirements.txt                    # Python dependencies
└── README.md
```

---

## ⚙️ How to Run the Project

### 1. Start the Backend API Server
```powershell
# From the root MindScale directory:
python backend/app.py
```
*The server will start on `http://127.0.0.1:5000` (and on local network IP).*

### 2. Start the Mobile Application
```powershell
# In a new terminal window:
cd mobile
npx expo start
```
*Scan the QR code using the **Expo Go** app on iOS/Android, or press `w` to run in the web browser.*

---

## 🔗 Main API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | AI Companion endpoint with intent, sentiment & crisis classifier |
| `POST` | `/api/analyze` | Process journal entry with ML sentiment analysis & tags |
| `GET` | `/api/history` | Fetch user's journal reflection history |
| `DELETE` | `/api/journal/<id>` | Delete a journal entry (User or Admin) |
| `POST` | `/api/breathing/log` | Record completed breathing session with pre/post stress ratings |
| `GET` | `/api/breathing/stats` | Fetch mindfulness streak days and total minutes calmed |
| `GET` | `/api/stats` | Aggregate dashboard statistics & mood trend timelines |
| `POST` | `/api/login` | User authentication |
| `POST` | `/api/register` | Register new user account |
| `POST` | `/api/face/verify` | Biometric face verification |
