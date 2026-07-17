import json
import pickle
import random
from pathlib import Path
from typing import List, Dict, Tuple

import pandas as pd

MODEL_DIR = Path(__file__).resolve().parent.parent / 'model'
MODEL_PATH = MODEL_DIR / 'possession_model.pkl'
SCALER_PATH = MODEL_DIR / 'scaler.pkl'

# Must match the feature set the model was trained on in
# backend/pipeline/train_model.py (offensive_rating/offensive_usg_pct are
# deliberately excluded there due to collinearity with offensive_pts).
FEATURE_COLUMNS = [
    'offensive_pts',
    'offensive_ts_pct',
    'shot_distance',
    'shot_quality_distance'
]

# Outcome classes the model was trained on (turnovers are handled separately
# as a fixed-rate gate, since they were excluded from training entirely).
OUTCOME_2PT_MAKE = 2
OUTCOME_3PT_MAKE = 3

_model = None
_scaler = None


def load_model_artifacts():
    # Lazily load and cache the trained possession outcome model + scaler
    global _model, _scaler
    if _model is None or _scaler is None:
        with open(MODEL_PATH, 'rb') as f:
            _model = pickle.load(f)
        with open(SCALER_PATH, 'rb') as f:
            _scaler = pickle.load(f)
    return _model, _scaler


def load_players(filepath: str) -> List[Dict]:  #Load player data from JSON file
    with open(filepath, 'r') as f:
        return json.load(f)


def get_play_type_distribution(position: str, usage_rate: float) -> Dict[str, float]: 
    #Return play type distribution based on position and usage rate
    is_high_usage = usage_rate > 0.28

    if 'G' in position:  # Guard
        if is_high_usage:
            return {
                'ISO': 0.35,
                'PnR ball handler': 0.30,
                'Spot up': 0.20,
                'Transition': 0.10,
                'Cut': 0.05
            }
        else:
            return {
                'ISO': 0.15,
                'PnR ball handler': 0.20,
                'Spot up': 0.35,
                'Transition': 0.20,
                'Cut': 0.10
            }
    elif 'F' in position:  # Forward
        if is_high_usage:
            return {
                'ISO': 0.25,
                'PnR ball handler': 0.20,
                'Spot up': 0.20,
                'Post': 0.15,
                'Transition': 0.10,
                'Cut': 0.10
            }
        else:
            return {
                'ISO': 0.10,
                'PnR ball handler': 0.15,
                'Spot up': 0.30,
                'Post': 0.15,
                'Transition': 0.10,
                'Cut': 0.20
            }
    else:  # Center
        if is_high_usage:
            return {
                'ISO': 0.15,
                'PnR roll': 0.25,
                'Post': 0.20,
                'Spot up': 0.20,
                'Transition': 0.10,
                'Cut': 0.10
            }
        else:
            return {
                'ISO': 0.10,
                'PnR roll': 0.20,
                'Post': 0.30,
                'Spot up': 0.15,
                'Transition': 0.10,
                'Cut': 0.15
            }


# Distance (in feet) a shot is taken from, sampled per play type since the
# real distance isn't known until a possession actually happens.
PLAY_TYPE_DISTANCE_RANGES = {
    'ISO': (10, 22),
    'PnR ball handler': (5, 24),
    'PnR roll': (0, 5),
    'Post': (1, 10),
    'Spot up': (18, 27),
    'Transition': (0, 8),
    'Cut': (0, 4),
}


def sample_shot_distance(play_type: str) -> int:
    # Sample a plausible shot distance (feet) for the given play type
    low, high = PLAY_TYPE_DISTANCE_RANGES.get(play_type, (0, 24))
    return random.randint(low, high)


def apply_defensive_adjustment(base_value: float, defender_drtg: float) -> float:
    # Scale a value (PPP, scoring probability, etc.) by the defender's DRTG.
    # Lower DRTG means better defense, so it should scale scoring down, not up.
    league_avg_drtg = 112
    return base_value * (defender_drtg / league_avg_drtg)


def get_positional_matchup(offense_player: Dict, defense_players: List[Dict]) -> Dict:
    # Find defender with matching position, or closest if no exact match
    off_pos = offense_player.get('position', 'N/A')

    for def_player in defense_players:
        if def_player.get('position') == off_pos:
            return def_player

    return defense_players[0]


def sample_play_type(distribution: Dict[str, float]) -> str:
    # Sample a play type based on the provided distribution
    play_types = list(distribution.keys())
    probabilities = list(distribution.values())
    return random.choices(play_types, weights=probabilities, k=1)[0]


def simulate_possession(
    offensive_team: List[Dict],
    defensive_team: List[Dict]
) -> Dict:
    # Simulate a single possession and return the outcome details
    # Select ball handler weighted by usage rate, normalized across the lineup
    total_usg = sum(p['usg_pct'] for p in offensive_team)
    weights = [p['usg_pct'] / total_usg for p in offensive_team]
    ball_handler = random.choices(offensive_team, weights=weights, k=1)[0]

    # Assign defender based on positional matchup
    defender = get_positional_matchup(ball_handler, defensive_team)

    # Sample play type
    distribution = get_play_type_distribution(
        ball_handler.get('position', 'N/A'),
        ball_handler.get('usg_pct', 0.2)
    )
    play_type = sample_play_type(distribution)
    shot_distance = sample_shot_distance(play_type)

    # Predict shot-outcome probabilities (conditioned on the shot happening,
    # i.e. no turnover) from the trained possession model
    model, scaler = load_model_artifacts()
    offensive_ts_pct = ball_handler.get('ts_pct', 0.55)
    features = pd.DataFrame([{
        'offensive_pts': ball_handler.get('pts', 15),
        'offensive_ts_pct': offensive_ts_pct,
        'shot_distance': shot_distance,
        'shot_quality_distance': offensive_ts_pct * shot_distance
    }], columns=FEATURE_COLUMNS)
    scaled_features = scaler.transform(features)
    class_probs = dict(zip(model.classes_, model.predict_proba(scaled_features)[0]))

    p_2pt = class_probs.get(OUTCOME_2PT_MAKE, 0.0)
    p_3pt = class_probs.get(OUTCOME_3PT_MAKE, 0.0)

    # Apply the defender's rating on top of the model's shot-quality prediction
    defensive_factor = apply_defensive_adjustment(1.0, defender.get('def_rating', 112))
    make_prob = min((p_2pt + p_3pt) * defensive_factor, 1.0)
    make_total = p_2pt + p_3pt
    three_pt_share = (p_3pt / make_total) if make_total > 0 else 0.0

    # Determine outcome
    turnover_prob = 0.13
    if random.random() < turnover_prob:
        outcome = 'Turnover'
        points_scored = 0
    else:
        if random.random() < make_prob:
            if random.random() < three_pt_share:
                points_scored = 3
                outcome = 'Made 3PT'
            else:
                points_scored = 2
                outcome = 'Made 2PT'
        else:
            outcome = 'Miss'
            points_scored = 0

    return {
        'ball_handler': ball_handler.get('name', 'Unknown'),
        'defender': defender.get('name', 'Unknown'),
        'play_type': play_type,
        'outcome': outcome,
        'points_scored': points_scored
    }


def simulate_game(
    team_a: List[Dict],
    team_b: List[Dict]
) -> Tuple[Tuple[int, int], List[Dict]]:
    # Simulate a single game between two teams. Returns final score and possession log.
    score_a, score_b = 0, 0
    possession_log = []
    team_a_possession = True

    for possession_num in range(200):
        if team_a_possession:
            result = simulate_possession(team_a, team_b)
            score_a += result['points_scored']
        else:
            result = simulate_possession(team_b, team_a)
            score_b += result['points_scored']

        quarter = (possession_num // 50) + 1
        possession_log.append({
            'possession': possession_num + 1,
            'quarter': quarter,
            'team': 'A' if team_a_possession else 'B',
            'score_a': score_a,
            'score_b': score_b,
            **result
        })

        team_a_possession = not team_a_possession

    return (score_a, score_b), possession_log


def simulate_series(
    team_a: List[Dict],
    team_b: List[Dict]
) -> Dict:
    # Simulate a best-of-7 series between two teams. Returns series results and game logs.
    games = []
    team_a_wins = 0
    team_b_wins = 0

    for game_num in range(7):
        (score_a, score_b), possession_log = simulate_game(team_a, team_b)

        if score_a > score_b:
            team_a_wins += 1
            winner = 'A'
        else:
            team_b_wins += 1
            winner = 'B'

        games.append({
            'game': game_num + 1,
            'score_a': score_a,
            'score_b': score_b,
            'winner': winner,
            'possession_log': possession_log
        })

        # Stop if someone wins series (first to 4)
        if team_a_wins == 4 or team_b_wins == 4:
            break

    series_winner = 'A' if team_a_wins > team_b_wins else 'B'

    return {
        'series_winner': series_winner,
        'team_a_wins': team_a_wins,
        'team_b_wins': team_b_wins,
        'games': games
    }


def main():
    """Test: Simulate series between two curated teams."""
    players = load_players('backend/data/players.json')

    # Team A player names
    team_a_names = ['LeBron James', 'Kevin Durant', 'Bam Adebayo', 'Stephen Curry', 'Jalen Brunson']
    # Team B player names
    team_b_names = ['Kawhi Leonard', 'Devin Booker', 'Shai Gilgeous-Alexander', 'Jaylen Brown', 'Anthony Edwards']

    # Find players by name (case-insensitive)
    def find_player(name: str) -> Dict:
        for p in players:
            if p['name'].lower() == name.lower():
                return p
        return None

    team_a = []
    for name in team_a_names:
        player = find_player(name)
        if player:
            team_a.append(player)
        else:
            print(f"Warning: Player '{name}' not found")

    team_b = []
    for name in team_b_names:
        player = find_player(name)
        if player:
            team_b.append(player)
        else:
            print(f"Warning: Player '{name}' not found")

    if len(team_a) < 5 or len(team_b) < 5:
        print("Error: Could not find all players")
        return

    print("=== NBA Series Simulation ===\n")
    print("Team A:")
    for p in team_a:
        name = p['name'].encode('ascii', 'replace').decode('ascii')
        print(f"  {name} ({p['team_abbreviation']}) - {p['rating']}")

    print("\nTeam B:")
    for p in team_b:
        name = p['name'].encode('ascii', 'replace').decode('ascii')
        print(f"  {name} ({p['team_abbreviation']}) - {p['rating']}")

    print("\n" + "="*50)
    series_result = simulate_series(team_a, team_b)

    print("\nSeries Results:")
    for game in series_result['games']:
        print(
            f"  Game {game['game']}: "
            f"Team A {game['score_a']} - Team B {game['score_b']} "
            f"(Winner: Team {game['winner']})"
        )

    print(f"\nSeries Winner: Team {series_result['series_winner']}")
    print(f"Final: Team A {series_result['team_a_wins']}-{series_result['team_b_wins']} Team B")

    players = load_players('backend/data/players.json')
    players_by_rating = sorted(players, key=lambda p: p['rating'], reverse=True)

    team_a = players_by_rating[0:5]
    team_b = players_by_rating[5:10]

    print("Team A defensive ratings:")
    for p in team_a:
        print(f"  {p['name']}: {p['def_rating']}")

    print("\nTeam B defensive ratings:")
    for p in team_b:
        print(f"  {p['name']}: {p['def_rating']}")

    print("\nYour team stats:")
    for name in ['Precious Achiuwa', 'Ochai Agbaji', 'Nickeil Alexander-Walker']:
        p = next((x for x in players if x['name'] == name), None)
        if p:
            print(f"  {p['name']}: pie={p['pie']}, ts={p['ts_pct']}, usg={p['usg_pct']}, rating={p['rating']}")


if __name__ == '__main__':
    main()
