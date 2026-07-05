# MindScale: AI-Powered Mental Health Tracking System

MindScale is a modern, responsive web application designed for real-time sentiment analysis and mental health journaling. The system processes user reflections, identifies key emotional states (Positive, Negative, Neutral), provides immediate supportive feedback, and records long-term mental health trends.

This version is fully structured and prepared as a prototype for the **Mid Defense Phase**.

---

## 📁 File Structure

```
mindscale/
├── backend/
│   ├── app.py                # Core Flask server and API endpoints
│   ├── model/
│   │   ├── train_model.py    # ML pipeline training script
│   │   ├── sentiment_model.pkl # Trained Logistic Regression classifier (binary pkl)
│   │   └── vectorizer.pkl    # Fitted TF-IDF Vectorizer (binary pkl)
│   ├── utils/
│   │   └── preprocessing.py   # Stopword removal and clean tokenization utilities
│   └── database/
│       └── db.sqlite3        # SQLite backend database for entry storage
├── frontend/
│   ├── index.html            # Main journal entry page (Glassmorphism layout)
│   ├── styles.css            # Stylesheet importing static styles
│   └── app.js                # Core JS logic for inputs, predictions, and history
├── templates/
│   └── dashboard.html        # Detailed analytics dashboard with Chart.js charts
├── static/
│   ├── css/
│   │   └── styles.css        # Shared CSS variables, variables, and themes
│   └── js/
│       └── dashboard.js      # Script to draw trend lines and search historical table logs
├── dataset/
│   └── dataset.csv           # Synthesized mental health sentiment dataset
├── requirements.txt          # Python package requirements
└── README.md                 # Project guide
```

---

## ⚙️ Core Technical Pipeline

1. **User Journal Entry**: User submits raw journaling text in `frontend/index.html`.
2. **Preprocessing**: The text is cleaned in `backend/utils/preprocessing.py` (lowercased, special characters/numbers removed, split into tokens, and filtered against 100+ standard English stopwords).
3. **TF-IDF Vectorization**: Text is transformed into numerical features using `backend/model/vectorizer.pkl`.
4. **Classification**: `backend/model/sentiment_model.pkl` (a Logistic Regression classifier trained with balanced weights) predicts whether the sentiment is `Positive`, `Negative`, or `Neutral` alongside a probability confidence score.
5. **Supportive Recommendation**: Based on the sentiment, a custom encouragement or mindfulness tip is served.
6. **Persistence**: The entry, sentiment, confidence, and timestamp are saved in SQLite database `backend/database/db.sqlite3`.
7. **Analytics**: Dashboard pulling stats dynamically aggregates totals, charts trend flows, and displays logs inside filterable dashboards.

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have **Python 3.x** and **pip** installed.

### 2. Install Dependencies
Run the following command in the project root directory:
```bash
pip install -r requirements.txt
```

### 3. Training the ML Model (Optional - Pre-trained files are included)
To retrain the sentiment model on the `dataset/dataset.csv` data:
```bash
python backend/model/train_model.py
```
This will compile and update `sentiment_model.pkl` and `vectorizer.pkl` inside `backend/model/`.

### 4. Running the Web Application
Launch the Flask development server:
```bash
python backend/app.py
```
By default, the server runs on `http://127.0.0.1:5000/`.

* Open `http://127.0.0.1:5000/` in your browser to access the journaling page.
* Open `http://127.0.0.1:5000/dashboard` (or click **Analytics View** in the sidebar) to see statistical analysis and trends!

---

## 🔗 API Endpoints

### `POST /api/analyze`
* **Description**: Processes text, saves reflection log, and returns prediction details.
* **Payload**:
  ```json
  {
    "text": "Today was a productive day, I finished all my tasks."
  }
  ```
* **Response**:
  ```json
  {
    "id": 4,
    "sentiment": "Positive",
    "confidence": 0.8953,
    "recommendation": "You're doing great! Keep up this positive energy. Remember to appreciate this moment and continue doing what makes you happy!",
    "timestamp": "2026-06-25 18:15:32"
  }
  ```

### `GET /api/history`
* **Description**: Returns all journal records, newest first.
* **Response**: Array of logged journal objects.

### `GET /api/stats`
* **Description**: Aggregates totals and timeline logs for Chart.js dashboard integration.
* **Response**:
  ```json
  {
    "counts": {
      "Positive": 8,
      "Neutral": 4,
      "Negative": 2
    },
    "timeline": [
      {
        "timestamp": "2026-06-25 18:10:00",
        "sentiment": "Positive",
        "confidence": 0.72,
        "preview": "Great meeting today..."
      }
    ],
    "total": 14
  }
  ```
