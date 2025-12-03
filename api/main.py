import pandas as pd
import numpy as np
import os
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import random

# ==========================================
# 1. SETUP & DATA LOADING
# ==========================================
app = FastAPI(title="Match Predictor API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to hold model and data artifacts
model_artifacts = {}

def load_and_train():
    print("Loading data and training model...")
    path = "C:/Users/taaacya1/ML-datasets/archive/results.csv"
    
    if not os.path.exists(path):
        # Fallback for development if file missing
        print(f"⚠️ Warning: File not found at {path}. Using dummy data.")
        data = {
            'date': pd.date_range(start='2020-01-01', periods=100),
            'home_team': np.random.choice(['Switzerland', 'Germany', 'France', 'Italy'], 100),
            'away_team': np.random.choice(['Switzerland', 'Germany', 'France', 'Italy'], 100),
            'home_score': np.random.randint(0, 5, 100),
            'away_score': np.random.randint(0, 5, 100)
        }
        df = pd.DataFrame(data)
    else:
        df = pd.read_csv(path)

    # Preprocessing
    df["result"] = np.where(
        df["home_score"] > df["away_score"], "home_win",
        np.where(df["home_score"] < df["away_score"], "away_win", "draw")
    )
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.sort_values("date").reset_index(drop=True)

    # Use all data for "production" model (or split if preferred, here we use all for max knowledge)
    train_df = df.copy()

    # --- Feature 1: Team Strength ---
    home_wins = train_df[train_df["result"] == "home_win"].groupby("home_team").size()
    away_wins = train_df[train_df["result"] == "away_win"].groupby("away_team").size()
    total_games = train_df["home_team"].value_counts() + train_df["away_team"].value_counts()
    win_rate = (home_wins.add(away_wins, fill_value=0) / total_games).fillna(0)
    mean_wr = float(win_rate.mean())

    # --- Feature 2: Head-to-Head (Numerical) ---
    matchups = train_df.groupby(["home_team", "away_team"])["result"].value_counts().unstack(fill_value=0)
    if "home_win" in matchups.columns:
        matchups["home_win_rate"] = matchups["home_win"] / matchups.sum(axis=1)
    else:
        matchups["home_win_rate"] = 0.0
    h2h_map = matchups["home_win_rate"]
    mean_h2h = float(h2h_map.mean())

    def get_h2h_prob(home, away):
        if (home, away) in h2h_map.index:
            return float(h2h_map.loc[(home, away)])
        elif (away, home) in h2h_map.index:
            return float(1.0 - h2h_map.loc[(away, home)])
        else:
            return mean_h2h

    # --- Feature 3: Form (Numerical & Badges) ---
    # We need numerical form for the model, and "Badges" (W/D/L) for the UI
    
    # Helper to get last 5 games results
    team_form_history = {} # { "Switzerland": ["W", "D", "L", "W", "W"] }
    
    # Iterate through all games to build history
    # This is a bit slow but runs only once at startup
    for _, row in train_df.iterrows():
        h, a, res = row["home_team"], row["away_team"], row["result"]
        
        if h not in team_form_history: team_form_history[h] = []
        if a not in team_form_history: team_form_history[a] = []
        
        # Home perspective
        if res == "home_win": team_form_history[h].append("W")
        elif res == "draw":   team_form_history[h].append("D")
        else:                 team_form_history[h].append("L")
            
        # Away perspective
        if res == "away_win": team_form_history[a].append("W")
        elif res == "draw":   team_form_history[a].append("D")
        else:                 team_form_history[a].append("L")
    
    # Keep only last 5
    for t in team_form_history:
        team_form_history[t] = team_form_history[t][-5:]

    # Calculate numerical form for the model (rolling mean of last 5)
    # 1.0 for W, 0.5 for D, 0.0 for L
    form_map = {}
    for team, history in team_form_history.items():
        score = 0
        for res in history:
            if res == "W": score += 1
            elif res == "D": score += 0.5
        form_map[team] = score / len(history) if history else 0.5

    # --- Prepare Training Data ---
    # We reconstruct the features for the whole dataset to train the model
    train_df["home_strength"] = train_df["home_team"].map(win_rate).fillna(mean_wr)
    train_df["away_strength"] = train_df["away_team"].map(win_rate).fillna(mean_wr)
    
    # Vectorized H2H
    h2h_lookup = h2h_map.reset_index(name="h2h_val")
    train_df = train_df.merge(h2h_lookup, on=["home_team", "away_team"], how="left").rename(columns={"h2h_val": "h2h_direct"})
    h2h_lookup_rev = h2h_lookup.rename(columns={"home_team": "away_team", "away_team": "home_team", "h2h_val": "h2h_rev"})
    train_df = train_df.merge(h2h_lookup_rev, on=["home_team", "away_team"], how="left")
    train_df["h2h_strength"] = train_df["h2h_direct"]
    mask_nan = train_df["h2h_strength"].isna()
    train_df.loc[mask_nan, "h2h_strength"] = 1.0 - train_df.loc[mask_nan, "h2h_rev"]
    train_df["h2h_strength"] = train_df["h2h_strength"].fillna(mean_h2h)
    
    train_df["form_home"] = train_df["home_team"].map(form_map).fillna(0.5)
    train_df["form_away"] = train_df["away_team"].map(form_map).fillna(0.5)
    
    X = pd.get_dummies(train_df[["home_team", "away_team"]], drop_first=False)
    X["home_strength"] = train_df["home_strength"]
    X["away_strength"] = train_df["away_strength"]
    X["h2h_strength"]  = train_df["h2h_strength"]
    X["form_home"]     = train_df["form_home"]
    X["form_away"]     = train_df["form_away"]
    X["strength_diff"] = X["home_strength"] - X["away_strength"]
    X["form_diff"]     = X["form_home"] - X["form_away"]
    
    y = train_df["result"]
    
    # Encode target for XGBoost
    le = LabelEncoder()
    y_encoded = le.fit_transform(y) # home_win, draw, away_win -> 0, 1, 2
    
    print("Training XGBoost...")
    clf_xgb = XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=1)
    clf_xgb.fit(X, y_encoded)
    print("XGBoost trained.")

    # Store artifacts
    model_artifacts["model_xgb"] = clf_xgb
    model_artifacts["label_encoder"] = le
    model_artifacts["win_rate"] = win_rate
    model_artifacts["mean_wr"] = mean_wr
    model_artifacts["get_h2h_prob"] = get_h2h_prob
    model_artifacts["form_map"] = form_map
    model_artifacts["team_form_history"] = team_form_history
    model_artifacts["X_columns"] = X.columns
    model_artifacts["df"] = df # Keep raw df for H2H history lookup

# Run training on startup
load_and_train()

# ==========================================
# 2. API ENDPOINTS
# ==========================================

class MatchInput(BaseModel):
    home_team: str
    away_team: str
    neutral_venue: bool = False

@app.get("/teams")
def get_teams():
    teams = sorted(list(model_artifacts["win_rate"].index))
    return {"teams": teams}

@app.get("/upcoming")
def get_upcoming_matches():
    teams = sorted(list(model_artifacts["win_rate"].index))
    upcoming = []
    today = datetime.now()
    # Generate more matches so frontend can filter out teams without flags
    for i in range(50):
        home, away = random.sample(teams, 2)
        days_offset = random.randint(1, 14)
        hours_offset = random.randint(12, 21)
        match_date = today + timedelta(days=days_offset)
        match_date = match_date.replace(hour=hours_offset, minute=0, second=0)
        upcoming.append({
            "id": i,
            "date": match_date.strftime("%Y-%m-%d %H:%M"),
            "home_team": home,
            "away_team": away,
            "competition": "International Friendly"
        })
    upcoming.sort(key=lambda x: x["date"])
    return {"matches": upcoming}

@app.post("/predict")
def predict_match(match: MatchInput):
    home = match.home_team
    away = match.away_team
    neutral = match.neutral_venue
    
    if home == away:
        raise HTTPException(status_code=400, detail="Teams must be different")

    # Helper to build feature row
    def get_features(h, a):
        X_columns = model_artifacts["X_columns"]
        row = pd.DataFrame(0, index=[0], columns=X_columns)
        
        h_col = f"home_team_{h}"
        a_col = f"away_team_{a}"
        
        if h_col in row.columns: row.loc[0, h_col] = 1
        if a_col in row.columns: row.loc[0, a_col] = 1
        
        wr = model_artifacts["win_rate"]
        mean_wr = model_artifacts["mean_wr"]
        form_map = model_artifacts["form_map"]
        
        row["home_strength"] = wr.get(h, mean_wr)
        row["away_strength"] = wr.get(a, mean_wr)
        row["h2h_strength"]  = model_artifacts["get_h2h_prob"](h, a)
        row["form_home"]     = form_map.get(h, 0.5)
        row["form_away"]     = form_map.get(a, 0.5)
        row["strength_diff"] = row["home_strength"] - row["away_strength"]
        row["form_diff"]     = row["form_home"] - row["form_away"]
        return row

    # 1. Predict (Standard)
    row = get_features(home, away)
    model_xgb = model_artifacts["model_xgb"]
    le = model_artifacts["label_encoder"]
    
    proba = model_xgb.predict_proba(row)[0]
    classes = le.classes_ # e.g. ['away_win', 'draw', 'home_win']
    
    # If neutral, average with swapped perspective
    if neutral:
        row_swap = get_features(away, home)
        proba_swap = model_xgb.predict_proba(row_swap)[0]
        
        # Map classes to probabilities
        probs_map = {c: p for c, p in zip(classes, proba)}
        probs_swap_map = {c: p for c, p in zip(classes, proba_swap)}
        
        # Average
        # P(Home Win) = (P(Home Win as Home) + P(Away Win as Away)) / 2
        p_home = (probs_map.get("home_win", 0) + probs_swap_map.get("away_win", 0)) / 2
        p_away = (probs_map.get("away_win", 0) + probs_swap_map.get("home_win", 0)) / 2
        p_draw = (probs_map.get("draw", 0) + probs_swap_map.get("draw", 0)) / 2
        
        # Normalize
        total = p_home + p_away + p_draw
        if total > 0:
            p_home /= total
            p_away /= total
            p_draw /= total
            
        # Reconstruct proba array in correct order of 'classes'
        new_proba = []
        for c in classes:
            if c == "home_win": new_proba.append(p_home)
            elif c == "away_win": new_proba.append(p_away)
            elif c == "draw": new_proba.append(p_draw)
        proba = np.array(new_proba)

    # 2. Process Result
    pred_idx_xgb = int(np.argmax(proba))
    pred_xgb = classes[pred_idx_xgb]
    confidence_xgb = float(proba[pred_idx_xgb])
    probs_xgb = {cls: float(p) for cls, p in zip(classes, proba)}

    # 4. Get Extra Info (Form Badges & H2H History)
    history = model_artifacts["team_form_history"]
    home_form_badges = history.get(home, [])
    away_form_badges = history.get(away, [])
    
    # Get last 5 H2H matches
    df = model_artifacts["df"]
    mask = ((df["home_team"] == home) & (df["away_team"] == away)) | \
           ((df["home_team"] == away) & (df["away_team"] == home))
    h2h_matches_df = df[mask].sort_values("date", ascending=False).head(5)
    
    h2h_history = []
    for _, m in h2h_matches_df.iterrows():
        h2h_history.append({
            "date": m["date"].strftime("%Y-%m-%d"),
            "home": m["home_team"],
            "away": m["away_team"],
            "home_score": int(m["home_score"]),
            "away_score": int(m["away_score"])
        })

    return {
        # Main prediction is now XGBoost
        "prediction": pred_xgb,
        "confidence": round(confidence_xgb, 3),
        "probs": probs_xgb,
        "home_form": home_form_badges,
        "away_form": away_form_badges,
        "h2h_history": h2h_history,
        # Keep models structure for frontend compatibility if needed, but only XGBoost
        "models": {
            "xgboost": {
                "prediction": pred_xgb,
                "confidence": round(confidence_xgb, 3),
                "probs": probs_xgb
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
