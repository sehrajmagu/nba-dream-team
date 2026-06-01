# NBA Dream Team Sandbox

Pick 5 current NBA players within a $30M budget and simulate a 7-game playoff series against an opponent team. A built-in AI assistant helps you build your roster given your budget and playstyle preferences.

## What it does

- **Player pool**: 500+ current NBA players, each priced $1M–$10M based on performance
- **$30M budget cap**: Forces real roster construction tradeoffs — you can't just stack superstars
- **Possession-by-possession simulation**: ~200 possessions per game, each one sampling a play type, calculating offensive efficiency, applying defensive adjustments, and resolving an outcome
- **7-game series**: Full playoff series with game-by-game scores and play-by-play logs
- **AI assistant**: Describe your budget and playstyle, get lineup recommendations powered by Claude

## Tech stack

- **Data pipeline**: Python, nba_api, pandas
- **Simulation engine**: Python (statistical model)
- **Backend API**: Flask 
- **Frontend**: React 
- **AI chatbot**: Gemini API

## Project structure

```
nba-dream-team/
├── backend/
│   ├── data/
│   │   └── players.json          # Fetched and priced player pool
│   ├── pipeline/
│   │   └── fetch_players.py      # Pulls stats from nba_api, calculates prices
│   └── engine/
│       └── simulate.py           # Possession-by-possession simulation engine
├── frontend/                     # React app (in progress)
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

# Install dependencies
pip install -r requirements.txt
```

## Running it

**Fetch player data** (only needs to run once, or to refresh at start of new season):
```bash
python backend/pipeline/fetch_players.py
```

This pulls all active NBA players, fetches their advanced stats, calculates a price for each one, and saves to `backend/data/players.json`.

**Run a test simulation:**
```bash
python backend/engine/simulate.py
```

Simulates a 7-game series between two teams and prints the results to the terminal.

## How player pricing works

Each player is priced between $1M and $10M using a weighted formula:

- **50% PER** (Player Efficiency Rating) — overall statistical contribution per minute
- **30% TS%** (True Shooting Percentage) — shooting efficiency across 2PT, 3PT, and free throws
- **20% USG%** (Usage Rate) — share of team possessions used while on court

Raw scores are min-max scaled across all players so the best player costs exactly $10M and the worst costs exactly $1M. Only players who appeared in at least 41 games are included to avoid small sample size inflation.

## How the simulation works

Each possession:
1. Ball handler is selected weighted by usage rate
2. Play type is sampled based on position and usage (ISO, P&R, Spot-up, Post, Transition, Cut)
3. Base PPP (points per possession) is calculated from the player's true shooting percentage
4. A defensive adjustment is applied based on the defender's defensive rating: `adjusted_PPP = base_PPP × (112 / defender_drtg)`
5. Outcome is sampled: turnover (13%), score, or miss based on adjusted PPP

## AI Chatbot
There is now an AI chatbot powered by Gemini which looks at the current state of your team and the remaining budget, and can give you advice on what players to pick to maximise results while staying within the budget constraints. 

## What's coming
- [ ] Logistic regression model to replace heuristic outcome sampling with a trained model
