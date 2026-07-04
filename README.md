# NBA Gauntlet

A FUT-style draft game for NBA fans: pick a conference, draft a 10-man roster pack by pack, then survive a 3-round gauntlet against legendary classic teams to become champion.

## What it does

- **Conference select**: Choose East or West, setting your gauntlet's opponent sequence (Round 1 → Round 2 → Finals)
- **Pack-style draft**: Fill each roster slot (PG, SG, SF, PF, C, plus 5 bench spots) by pulling a random tier (A/B/C) and choosing 1 of 5 randomly drawn player cards for that tier
- **Starting five**: Before each round, pick which 5 drafted players start against that round's opponent
- **Possession-by-possession simulation**: ~200 possessions per game, each one sampling a play type, calculating offensive efficiency, applying defensive adjustments, and resolving an outcome
- **Classic opponent teams**: Real legendary teams (e.g. 2016 Cavaliers, 2001 Lakers, 2016 Warriors) staffed as gauntlet bosses
- **AI assistant**: Get lineup and draft-pick advice powered by Gemini

## Tech stack

- **Data pipeline**: Python, nba_api, pandas
- **Simulation engine**: Python (statistical model)
- **Backend API**: Flask
- **Frontend**: React + TypeScript
- **AI chatbot**: Gemini API

## Project structure

```
nba-dream-team/
├── backend/
│   ├── data/
│   │   ├── players.json          # Fetched and priced player pool (draft pool)
│   │   └── classics.json         # Legendary opponent teams for the gauntlet
│   ├── pipeline/
│   │   ├── fetch_players.py      # Pulls stats from nba_api, calculates prices/tiers
│   │   └── fetch_classics.py     # Builds the classic opponent team rosters
│   ├── engine/
│   │   └── simulate.py           # Possession-by-possession simulation engine
│   ├── api.py                    # Flask API (draft data, simulation, AI chat)
│   └── app.py
├── frontend/                     # React app
│   └── src/
│       ├── components/           # ConferenceSelect, DraftBoard, DraftModal,
│       │                         # StartingFiveSelect, GameView, GauntletEnd, AIAssistant
│       └── data/                 # players.json, classics.json (bundled for the frontend)
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

**Fetch player data** (only needs to run once, or to refresh at start of new season):
```bash
python backend/pipeline/fetch_players.py
```

This pulls all active NBA players, fetches their advanced stats, calculates a price and draft tier for each one, and saves to `backend/data/players.json`.

**Fetch classic team data** (only needs to run once):
```bash
python backend/pipeline/fetch_classics.py
```

This builds the roster of legendary opponent teams used as gauntlet bosses, saved to `backend/data/classics.json`.

**Start the backend:**
```bash
python backend/api.py
```

Runs the Flask API on `http://localhost:5000`, serving the draft pool, running possession simulations, and proxying AI chat requests.

**Start the frontend:**
```bash
cd frontend
npm start
```

Runs the React app on `http://localhost:3000`.

## How player tiering works

Each player is priced between $1M and $10M and assigned a draft tier (A/B/C) using a weighted formula:

- **50% PIE** (Player Impact Estimate) — overall statistical contribution per minute
- **30% TS%** (True Shooting Percentage) — shooting efficiency across 2PT, 3PT, and free throws
- **20% USG%** (Usage Rate) — share of team possessions used while on court

Raw scores are min-max scaled across all players. Tier A is the rarest pull, tier C the most common — mirroring a pack-opening draft. Only players who appeared in at least 41 games are included to avoid small sample size inflation.

## How the draft works

For each roster slot, a tier (A/B/C) is randomly rolled — weighted toward the more common tiers — then 5 eligible players from that tier are drawn as candidate cards. You pick one to fill the slot. Position-specific slots (PG/SG/SF/PF/C) restrict candidates to matching positions; bench slots draw from the full pool.

## How the simulation works

Each possession:
1. Ball handler is selected weighted by usage rate
2. Play type is sampled based on position and usage (ISO, P&R, Spot-up, Post, Transition, Cut)
3. Base PPP (points per possession) is calculated from the player's true shooting percentage
4. A defensive adjustment is applied based on the defender's defensive rating: `adjusted_PPP = base_PPP × (112 / defender_drtg)`
5. Outcome is sampled: turnover (13%), score, or miss based on adjusted PPP

## AI Chatbot

An AI assistant powered by Gemini looks at your current roster and draft progress, and gives advice on which cards to pick to build the strongest possible lineup.

## What's coming
- [ ] Logistic regression model to replace heuristic outcome sampling with a trained model
