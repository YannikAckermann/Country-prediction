# ⚽ World Cup 2026 Match Predictor

A Machine Learning powered application to simulate outcomes for the World Cup 2026, including qualifiers, group stages, and knockout rounds. Current simulations use detailed FIFA rankings and AI probability models to determine match outcomes.

## ✨ Features
- **AI Prediction (XGBoost):** Predicts match winners based on historical data.
- **World Cup 2026 Mode:** Simulate the full tournament structure (Group Stage -> Knockout -> Champion).
- **Gamification:** Betting system with virtual currency and global leaderboard.
- **Interactive UI:** Visually rich interface built with Next.js and Tailwind CSS.

## 🚀 Quick Start (Recommended)

### Using DevContainers
This project is configured with a **DevContainer** for a consistent development environment.
1. Open the project in VS Code.
2. Ensure you have Docker Desktop running.
3. Click **"Reopen in Container"** when prompted (or press `F1` and select *Dev Containers: Reopen in Container*).
4. The environment will automatically set up Python, Node.js, and install all necessary dependencies.

### Start the Application

Once the environment is ready, open two terminals in VS Code:

**Terminal 1: Backend**
Starts the FastAPI server which handles predictions and the database.
```bash
python api/main.py
```
*Server listening on: http://0.0.0.0:8001*

**Terminal 2: Frontend**
Starts the Next.js user interface.
```bash
cd frontend
npm run dev
```
*App accessible at: http://localhost:3000*

---

## 🛠️ Manual Installation (No Docker)

If you prefer running locally without Docker:

### 1. Backend (Python)
Ensure Python 3.8+ is installed.
```bash
# Install dependencies
pip install -r requirements.txt

# Start API
python api/main.py
```

### 2. Frontend (Node.js)
Ensure Node.js 18+ is installed.
```bash
cd frontend

# Install dependencies
npm install

# Start Development Server
npm run dev
```

## 📂 Project Structure
- **`api/`**: FastAPI backend. 
  - `main.py`: Entry point for the API.
  - `gamification.db`: SQLite database for users and bets.
- **`frontend/`**: Next.js 14 application.
- **`match_predictor.ipynb`**: Jupyter Notebook used for initial model training and data analysis.
