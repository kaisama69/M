🧠 MindScale Project — Master Build Prompt (For Antigravity)
📌 Project Title
MindScale: AI-Powered Mental Health Tracking System using Sentiment Analysis

🚨 IMPORTANT CONTEXT
This project is currently in the MID DEFENSE PHASE.
👉 You MUST:
Build a working prototype suitable for mid defense
Focus on core functionality + clean UI + basic ML pipeline
Keep structure scalable for final implementation later
You will ALSO receive instructions for final phase expansion, but DO NOT fully implement them now.

🎯 PROJECT OVERVIEW
MindScale is a web-based AI system that:
Takes user text input (journal/thoughts)
Performs sentiment analysis
Predicts mental state
Provides feedback and insights
Tracks emotional trends over time

⚙️ CORE SYSTEM PIPELINE
User Input → Preprocessing → TF-IDF → ML Model → Sentiment Output → Recommendation → Visualization

🧱 REQUIRED TECH STACK
Frontend:
React.js (preferred) OR simple HTML/CSS/JS
Tailwind CSS or Bootstrap (clean UI required)
Backend:
Python (Flask preferred)
ML/NLP:
Scikit-learn
TF-IDF Vectorizer
Logistic Regression / Naive Bayes
Database:
SQLite (for mid defense)

📁 REQUIRED FILE STRUCTURE
mindscale/│├── backend/│   ├── app.py│   ├── model/│   │   ├── train_model.py│   │   ├── sentiment_model.pkl│   │   └── vectorizer.pkl│   ││   ├── utils/│   │   └── preprocessing.py│   ││   └── database/│       └── db.sqlite3│├── frontend/│   ├── index.html│   ├── styles.css│   ├── app.js│├── templates/│   └── dashboard.html│├── static/│   ├── css/│   └── js/│├── dataset/│   └── dataset.csv│├── README.md└── requirements.txt

✅ MID DEFENSE REQUIREMENTS (BUILD THIS NOW)
1. User Input System
Text box for journal entry
Submit button
Store entries in database
2. Text Preprocessing
Tokenization
Stopword removal
Lowercasing
Basic cleaning
3. TF-IDF Vectorization
Convert text → numerical features
4. Sentiment Model
Train a simple classifier:
Logistic Regression OR Naive Bayes
Output:
Positive / Negative / Neutral
5. Result Display
Show:
Sentiment result
Confidence (optional)
6. Basic Dashboard
Show past entries
Show sentiment history (simple list is enough)
7. Recommendation System (Basic)
If Negative → show motivational message
If Positive → show encouragement
If Neutral → show general advice

⚠️ MID DEFENSE LIMITATIONS
DO NOT:
Overcomplicate UI
Use deep learning
Add authentication system (optional only)
Build advanced analytics yet
Focus on: ✔ Working pipeline✔ Clean UI✔ Demonstrable ML

🧮 MATHEMATICAL MODEL (FOR IMPLEMENTATION)
Use:
TF-IDF:
TF = term frequency
IDF = log(N / DF)
Classification:
Logistic Regression: P(y|x) = 1 / (1 + e^-(wx + b))

🎨 UI REQUIREMENTS
Clean modern design
Minimal but professional
Sections:
Input box
Result display
History panel

🚀 FINAL PHASE (DO NOT FULLY BUILD NOW — PLAN FOR IT)
Future Enhancements:
🔹 Advanced Features
Mood graph visualization (charts)
Weekly/monthly analysis
Mental health score
🔹 User System
Authentication (login/signup)
Personal dashboards
🔹 Advanced NLP
Emotion detection (stress, anxiety, depression)
Deep learning models (LSTM/BERT optional)
🔹 Recommendation Engine
Personalized suggestions
Resource linking (meditation, help lines)
🔹 UI Upgrade
Full dashboard
Graphs (Chart.js)
Analytics panels

🧠 EXPECTED OUTPUT FROM YOU (ANTIGRAVITY)
You must: 1. Generate full working project 2. Follow exact folder structure 3. Include backend + frontend integration 4. Train and save ML model 5. Provide run instructions

📌 FINAL INSTRUCTION
You are acting as a full-stack + ML developer.
Build MindScale as a mid-defense ready AI system, keeping the architecture scalable for final implementation.
DO NOT deviate from:
TF-IDF + ML model pipeline
Sentiment-based mental health tracking concept

✅ SUCCESS CRITERIA
✔ User can input text✔ Model predicts sentiment✔ Result is displayed clearly✔ Past entries are stored✔ System runs without errors

🔥 END OF PROMPT