# Prompt for Writing Final Project Report

> **Instructions for AI (ChatGPT / Gemini):**  
> *"You are an academic technical report writer. I am submitting my final university project report for my application called **MindScale**. Below is the comprehensive technical documentation, architecture, dataset details, machine learning pipeline, API reference, and updates implemented since my mid-term report. Please generate a formal, multi-chapter academic final report (including Executive Summary, Problem Statement, Related Work, System Architecture & Methodology, Machine Learning & Safety Engine, Feature Implementation, Testing & Results, and Future Work) based on the details below."*

---

# 🧠 MindScale: System Technical Documentation & Progress Summary

## 1. Executive Summary & Project Overview
- **Project Title:** MindScale — AI-Powered Mental Health & Mood Tracking Mobile System
- **Target Platform:** Cross-platform Mobile Application (React Native / Expo) + Python Flask REST API Backend
- **Core Purpose:** To provide a 100% private, on-device mental health companion combining guided mood journaling, AI companion chat, crisis safety detection, evidence-based breathing techniques, and biometric face unlock.
- **Key Academic Constraint:** Zero dependency on external paid LLM APIs (OpenAI/Gemini API calls forbidden by project guidelines). All NLP intent classification, sentiment analysis, and safety logic are implemented locally using custom Scikit-Learn models and VADER NLP.

---

## 2. Key System Updates & Changes Since Mid-Term Report

Since the mid-term progress report, the system underwent significant architectural refactoring, feature additions, dataset expansion, and safety engine integrations:

### A. Mobile-First Refactoring & System Cleanup
- **Web App Removal:** Removed legacy web application files and consolidated the project into a clean, mobile-first structure (`mobile/` React Native Expo app + `backend/` Python Flask API server).
- **Distraction-Free UI Refinement:** Removed legacy ambient music player components to focus strictly on core mindfulness, journaling, and safety.

### B. Dataset Expansion & NLP Model Retraining
- **High-Volume Synthetic Dataset:** Created a custom dataset generator (`generate_data.py`) that scaled chatbot intent training data to **~19,000 conversational samples**.
- **Model Retraining:** Retrained the TF-IDF Vectorizer + Logistic Regression intent classification pipeline (`chatbot_model.pkl`), significantly raising intent classification accuracy and handling user phrasing variations.

### C. Advanced NLP & Crisis Safety Engine
- **VADER Sentiment Analysis Integration:** Added `vaderSentiment` (`SentimentIntensityAnalyzer`) to extract real-time compound, positive, negative, and neutral polarity scores for all user utterances.
- **Multi-Layered Crisis-Alert Classifier:** Implemented a real-time safety layer that evaluates predicted intent (`suicidal` class), negative sentiment threshold (`neg > 0.65`), and explicit crisis keywords (`suicide`, `want to die`, `kill myself`).
- **Emergency Escalation:** When a crisis signal is triggered, the system immediately overrides regular responses to output 24/7 Crisis Helpline resources (988 Lifeline) and logs the event in SQLite (`crisis_events` table).
- **Session State Context Tracker:** Implemented SQLite session intent logging (`user_intents` table) to track conversation trajectory over turns and offer adaptive coping suggestions (e.g. recommending breathing exercises during anxiety).

### D. Guided Mood Journaling Transformation
- **1–5 Emoji Mood Rating Scale:** Added quantitative mood logging (😞 Very Low, 🙁 Low, 😐 Okay, 😊 Good, 😁 Great).
- **Context & Trigger Tags:** Added 1-tap tag selection (`#Work`, `#Sleep`, `#Exercise`, `#Relationships`, `#Stress`, `#Gratitude`).
- **Guided Reflection Prompts:** Integrated a dynamic prompt generator to inspire daily entries.
- **Journal Entry Deletion:** Implemented `DELETE /api/journal/<id>` allowing both users (for their own logs) and Admins (for any log) to delete entries.

### E. Interactive Breathing Room & Mindfulness Tracker
- **Evidence-Based Techniques:** Implemented 3 guided visualizer modes: 4-7-8 Relaxing Breath, 4-4-4-4 Box Breathing, and 5-5 Equal Breathing.
- **Pre & Post-Session Stress Level Check-in:** Asks users for a 1–10 Stress Scale rating before and after breathing.
- **Live Mindfulness Streak Banner:** Real-time tracking of **🔥 Days Streak**, **⏱️ Total Minutes Calmed**, and **📉 Avg Stress Drop** via `/api/breathing/stats`.

### F. Security & Biometrics
- **Biometric Face Unlock:** Facial feature extraction and comparison using MediaPipe.
- **Admin Management Portal:** Administrative screen to manage user accounts and system authorizations.

---

## 3. Technology Stack & Technical Architecture

- **Frontend Mobile App:** React Native, Expo, React Navigation, Expo Vector Icons, React Native Chart Kit.
- **Backend API:** Python 3.13, Flask, Flask-CORS, Werkzeug Security (SHA-256 password hashing).
- **Database:** SQLite3 (`db.sqlite3`) containing 6 tables: `users`, `journals`, `email_verifications`, `user_intents`, `crisis_events`, `breathing_logs`.
- **Machine Learning & NLP:** 
  - Scikit-Learn (`TfidfVectorizer` + `LogisticRegression`).
  - `vaderSentiment` Sentiment Intensity Analyzer.
  - MediaPipe Face Landmarker for facial biometric verification.

---

## 4. Complete Backend API Reference Table

| HTTP Method | API Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/chat` | AI Companion message processing (Intent + VADER Sentiment + Crisis Detection + Session Context) |
| `POST` | `/api/analyze` | Journal entry submission with ML sentiment classification, 1-5 mood rating, and tags |
| `GET` | `/api/history` | Retrieves chronologically ordered user journal reflection history |
| `DELETE` | `/api/journal/<id>` | Deletes a specific journal reflection (User ownership or Admin privilege) |
| `POST` | `/api/breathing/log` | Records completed breathing session with pre/post 1-10 stress levels |
| `GET` | `/api/breathing/stats` | Returns total breathing sessions, total minutes calmed, streak days, and average stress reduction |
| `GET` | `/api/stats` | Aggregates journal stats, mood timeline data, and dominant emotion for analytics charts |
| `POST` | `/api/login` | User email & password authentication |
| `POST` | `/api/register` | User registration |
| `POST` | `/api/face/verify` | Facial landmark biometric authentication |
| `GET` | `/api/admin/users` | Admin user directory fetch |
| `POST` | `/api/admin/users/<id>/toggle-admin` | Admin privilege toggling |

---

## 5. Conclusion & System Status
The MindScale system is fully operational, mobile-optimized, offline-capable, and meets all academic and safety criteria. All background processes, API routes, database schemas, and frontend screens pass 100% verification without errors.
