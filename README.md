# SimCal — Aggregation of Simple Calories

A conversational calorie & nutrition tracker powered by OpenAI + Firebase.

## Setup

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in your OpenAI key:
```bash
cp .env.example .env
```
Then edit `.env`:
```
OPENAI_API_KEY=sk-...your key here...
```

### 3. Set up Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/) → Create project
2. Enable **Authentication** → Sign-in methods → Email/Password + Google
3. Enable **Firestore Database** → Start in production mode
4. Go to Project Settings → Your apps → Add Web App → copy the config object
5. Paste the config in **all 3 HTML files** (look for `// ===== PASTE YOUR FIREBASE CONFIG HERE =====`):
   - `templates/login.html`
   - `templates/chat.html`
   - `templates/dashboard.html`

### 4. Run the app
```bash
python app.py
```
Visit: http://localhost:5000

## Firestore Data Structure
```
users/
  {uid}/
    name: string
    email: string
    goals: { calories, protein_g, carbs_g, fat_g, water_ml }
    createdAt: string
    days/
      {YYYY-MM-DD}/
        totals: { calories, protein_g, carbs_g, fat_g, water_ml, iron_mg, ... }
        meals: [{ name, calories, timestamp, foods: [...] }]
        date: string
```

## Features
- 🔐 Firebase Auth (email/password + Google)
- 💬 Chat interface with OpenAI GPT-4o nutrition extraction
- ✅ Confirm-before-save flow for each meal entry
- 📊 Dashboard with macro/micro charts (Chart.js)
- 🎯 Editable daily nutrition goals
- 📅 Date navigation — log any past day
- 🌙 Full dark mode
