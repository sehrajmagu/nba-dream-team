# NBA Gauntlet

A FUT-style draft game for NBA fans: pick a conference, draft a 10-man roster pack by pack, then survive a 3-round gauntlet against legendary classic teams to become champion.

## What it does

- **Conference select**: Choose East or West, setting your gauntlet's opponent sequence (Round 1 → Round 2 → Finals)
- **Pack-style draft**: Fill each roster slot (PG, SG, SF, PF, C, plus 5 bench spots) by pulling a random tier (A/B/C) and choosing 1 of 5 randomly drawn player cards for that tier. Bench slots pull from a weaker tier distribution than starting slots, so your bench doesn't end up as strong as your starting five.
- **Starting five**: Before each round, pick which 5 drafted players start against that round's opponent
- **Possession-by-possession simulation**: ~200 possessions per game, each one sampling a play type, predicting a shot outcome with a trained ML model, and applying skill/defense adjustments
- **Live play-by-play**: Games unfold over ~30 seconds with a live scoreboard and scrolling play feed, instead of an instant result. An "Instant Sim" button is available to skip straight to the final score for testing.
- **Classic opponent teams**: Real legendary teams (2012 Thunder, 2001 Lakers, 2016 Warriors, 2016 Cavaliers, 2013 Heat, 2008 Celtics), with difficulty escalating round over round
- **AI assistant**: Get lineup and draft-pick advice powered by Gemini

## Tech stack

- **Data pipeline**: Python, nba_api, pandas
- **ML model**: scikit-learn (logistic regression)
- **Simulation engine**: Python
- **Backend API**: Flask
- **Frontend**: React + TypeScript
- **AI chatbot**: Gemini API

## Project structure

```
nba-dream-team/
├── backend/
│   ├── data/
│   │   ├── players.json              # Current-season draft pool (rating, tier, per-game stats)
│   │   ├── players_2024.json         # 2023-24 season player pool used to build training data
│   │   ├── classics.json             # Legendary opponent teams for the gauntlet
│   │   └── training/
│   │       ├── nbastats_2024.csv     # Raw 2023-24 play-by-play events
│   │       ├── matchups_2024.csv     # Defender matchup data (unused by the current model)
│   │       └── training_data.csv     # Prepared possession-level training set
│   ├── pipeline/
│   │   ├── fetch_players.py          # Pulls current-season stats, computes rating/tier -> players.json
│   │   ├── fetch_players_training.py # Same, but for the 2023-24 season -> players_2024.json
│   │   ├── fetch_classics.py         # Pulls real historical stats for the classic team rosters
│   │   ├── prepare_training_data.py  # Builds training_data.csv from play-by-play + player stats
│   │   └── train_model.py            # Trains and saves the possession outcome model
│   ├── model/
│   │   ├── possession_model.pkl      # Trained logistic regression model
│   │   └── scaler.pkl                # StandardScaler fit on the training features
│   ├── engine/
│   │   └── simulate.py               # Possession-by-possession simulation engine
│   ├── api.py                        # Flask API (draft data, simulation, AI chat) — the one actually run
│   └── app.py                        # Older/legacy prototype API, not used by the current frontend
├── frontend/                          # React app
│   └── src/
│       ├── components/                # ConferenceSelect, DraftBoard, DraftModal, PlayerCard,
│       │                               # Headshot, StartingFiveSelect, GameView, GauntletEnd, AIAssistant
│       └── data/                      # players.json, classics.json (bundled copies for the frontend)
├── requirements.txt
└── README.md
```

## Setup

```bash
# Clone the repo
git clone https://github.com/sehrajmagu/nba-dream-team.git
cd nba-dream-team

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Running it

**Fetch player data** (only needs to run once, or to refresh at the start of a new season):
```bash
python backend/pipeline/fetch_players.py
```

Pulls all active NBA players for the current season, fetches their advanced/base stats, computes a `rating` and draft tier for each, and saves to `backend/data/players.json`. Only players with at least 41 games played are included, to avoid small-sample-size noise (a player with only a handful of garbage-time minutes can post wildly unrepresentative rate stats).

**Fetch classic team data** (only needs to run if you want to rebuild the historical stat baseline):
```bash
python backend/pipeline/fetch_classics.py
```

Pulls real `pie`/`ts_pct`/`usg_pct`/`def_rating` for each classic team's hardcoded roster from their actual historical season. **Note:** the `rating`, `pts`, and the round-by-round difficulty escalation on `def_rating` currently in `classics.json` were hand-tuned on top of this afterward, since the raw historical stats alone didn't produce a meaningful difficulty curve across rounds. Re-running this script will overwrite `classics.json` with only the raw historical fields and lose that tuning — copy the `rating`/`pts` values back in afterward if you do.

**Start the backend:**
```bash
cd backend
python api.py
```

Runs the Flask API on `http://localhost:5050`, serving the draft pool, running possession simulations, and proxying AI chat requests.

**Start the frontend:**
```bash
cd frontend
npm start
```

Runs the React app on `http://localhost:3000`.

### Rebuilding the ML model (optional)

The trained model and scaler are already committed to `backend/model/`, so this isn't needed to run the game. To retrain from scratch:

```bash
python backend/pipeline/fetch_players_training.py   # -> backend/data/players_2024.json
python backend/pipeline/prepare_training_data.py    # -> backend/data/training/training_data.csv
python backend/pipeline/train_model.py              # -> backend/model/possession_model.pkl, scaler.pkl
```

`fetch_players_training.py` requires `backend/data/training/nbastats_2024.csv` (2023-24 play-by-play) to already exist, since `prepare_training_data.py` reads from it directly rather than hitting the NBA API for play-by-play data.

## How player rating works

Each player gets a `rating` (65-99) and a draft tier (A/B/C) from a weighted composite of their season stats:

- **25% PIE** (Player Impact Estimate)
- **20% USG%** (Usage Rate)
- **18% PTS** (Points per game)
- **12% TS%** (True Shooting Percentage)
- **8% AST**, **7% REB**, **5% STL**, **3% BLK**, **2% TOV** (inverted — fewer turnovers score higher)

Raw weighted scores get a square-root transform (compresses variance at the top end) and are then min-max scaled across the full player pool to a 65-99 range. Tier is derived from the final rating: **A/Bronze** ≤ 75, **B/Silver** ≤ 85, **C/Gold** > 85.

These weights were deliberately rebalanced from an earlier version that gave PIE/TS% a combined 50% of the score. That version let low-usage, high-efficiency role players (a bench big shooting only dunks and putbacks can post a very high TS%) out-rate genuine high-usage stars, since taking harder, more contested shots naturally suppresses a star's own efficiency. Shifting weight toward PTS/USG% fixed that — a low-usage player capped at ~15% usage can no longer out-rate a 30%-usage star the way efficiency alone allowed.

## How the draft works

For each roster slot, a tier (A/B/C) is randomly rolled, then 5 eligible players from that tier are drawn as candidate cards. You pick one to fill the slot. Position-specific slots (PG/SG/SF/PF/C) restrict candidates to matching positions; bench slots draw from the full pool regardless of position.

Starting slots and bench slots use different tier odds:

- **Starting slots**: 25% Bronze / 40% Silver / 35% Gold
- **Bench slots**: 65% Bronze / 25% Silver / 10% Gold

Without this split, bench slots pulled from the same distribution as starters, so a drafted "bench" could end up nearly as strong as the starting five — which doesn't feel like a bench at all.

## How the simulation works

Each game simulates 200 possessions, alternating between teams. For each possession:

1. **Ball handler selection** — a player is chosen from the offensive lineup, weighted by usage rate (`usg_pct`) normalized across the team.
2. **Positional matchup** — the defender is the opposing player at the same position (falls back to the first defender if no exact match).
3. **Play type sampling** — based on the ball handler's position and usage rate (above/below a 28% threshold), a play type is sampled: ISO, PnR ball handler, PnR roll, Post, Spot up, Transition, or Cut.
4. **Shot distance sampling** — each play type maps to a distance range in feet (e.g. Cut: 0-4ft, Post: 1-10ft, Spot up: 18-27ft), and a distance is sampled from it. The real distance isn't known ahead of time in a live simulation, so it's drawn from a range appropriate to the play type actually being run.
5. **ML model prediction** — the trained logistic regression predicts Miss / 2PT Make / 3PT Make probabilities from the ball handler's `pts`, `ts_pct`, the sampled `shot_distance`, and a `shot_quality_distance` interaction term (`ts_pct × shot_distance`).
6. **Defense and skill adjustments** — the defender's `def_rating` and the ball handler's overall `rating` are layered onto the model's prediction as log-odds adjustments (not a direct probability multiply — see below for why), so a genuine mismatch in defense or player quality still shows up even though the model's own coefficients on offensive stats are weak.
7. **Turnover gate** — a flat 13% chance of a turnover is checked first (this matches the actual turnover rate in the training data); everything above only applies if it isn't a turnover.

### The ML model

A **multinomial logistic regression** trained on real 2023-24 NBA play-by-play data, predicting the outcome of a shot attempt.

**Features** (4):
- `offensive_pts` — the ball handler's points per game
- `offensive_ts_pct` — the ball handler's true shooting %
- `shot_distance` — the sampled distance of the shot attempt, in feet
- `shot_quality_distance` — an interaction term (`offensive_ts_pct × shot_distance`)

**Labels** (3): Miss, 2PT Make, 3PT Make. **Turnovers are deliberately excluded** from the model entirely and handled as a fixed 13% possession-level gate instead — turnovers have no shot distance to speak of, and the training data confirmed a flat rate matched the real distribution well enough that the model doesn't need to predict it.

**Why not more features:** `offensive_rating` and `offensive_usg_pct` were tried and dropped. Both are highly collinear with `offensive_pts` (correlations of 0.90 and 0.89 respectively — `rating` is itself partly built from `pts`/`ts_pct`/`usg_pct`), which let the fitted model assign an unstable, sign-flipped coefficient to `rating` on the minority 3PT-make class. Concretely: an earlier version of the model predicted *lower* 3PT-make probability for a 99-rated player than a 68-rated one, purely because of how the regression split correlated variance between `rating` and `pts`. Dropping the redundant features and adding the `shot_quality_distance` interaction term fixed the direction, at the cost of the model's own skill signal being fairly weak — which is why the rating-based skill adjustment at inference time (step 6 above) exists as a separate layer rather than living inside the model.

**Class weighting:** 3PT Make is a minority class in the data (~14% of rows). Training with default class weights gave it 2% recall — the model just defaulted to predicting Miss for almost every long-range attempt. `class_weight={1: 1, 2: 1, 3: 2}` (a partial boost, not full `'balanced'`, which overcorrected and wrecked Miss recall instead) was the best tradeoff found — final model: ~55% accuracy, recall of 0.48 (Miss), 0.70 (2PT), 0.48 (3PT).

**Why the defense/skill adjustments are applied in log-odds space, not by multiplying the probability directly:** multiplying a probability has no graceful ceiling — a strong enough multiplier just pushes `make_prob` straight into a hard `1.0` clip, which once produced 170+ point games because every above-average-rated player's shot-make probability saturated at 100%. Log-odds are unbounded, and converting back to a probability through a sigmoid gives diminishing returns as probability approaches 1, which is the behavior you actually want (a boost that matters a lot at 50% barely moves something already at 90%). The skill adjustment is also anchored to the **average rating of all 10 players in that specific matchup**, not a fixed constant — otherwise two elite teams playing each other would have both sides' scoring inflate together instead of producing a normal-range game.

**Training data build** (`prepare_training_data.py`): starts from real 2023-24 play-by-play events (`EVENTMSGTYPE` 1/2 = made/missed shots), extracts `shot_distance` directly from the play description text (e.g. `"MISS White 28' 3PT Jump Shot"` → 28), and joins to each player's season stats from `players_2024.json`. `matchups_2024.csv` (defender matchup data) was part of an earlier design that used `PLAYER2_ID` as "the defender," but that field turned out to actually be the assister on makes and empty on misses — it's no longer used by the current pipeline.

## AI Chatbot

An AI assistant powered by Gemini looks at your current roster and draft progress, and gives advice on which cards to pick to build the strongest possible lineup.
