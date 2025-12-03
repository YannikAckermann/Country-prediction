# Football Match Predictor

This project contains a Machine Learning backend (Jupyter Notebook) and a Next.js Frontend.

## Prerequisites

- Python 3.8+
- Node.js 18+

## Setup & Run

### 1. Backend (Python)

Install dependencies:
```bash
pip install -r requirements.txt
```

Open `match_predictor.ipynb` in VS Code.
- Run the cells to train the model (insert your data logic where commented).
- Run the last cells to start the FastAPI server on `http://localhost:8000`.

### 2. Frontend (Next.js)

Navigate to the frontend folder:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `match_predictor.ipynb`: Notebook for training and serving the model.
- `frontend/`: Next.js application.
- `requirements.txt`: Python dependencies.
