import json
import random
from typing import List, Dict, Tuple


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


def get_base_ppp(play_type: str, ts_pct: float) -> float:
    # Calculate base PPP for a play type, adjusted by player's TS%
    ts_pct_normalized = ts_pct / 0.57

    ppp_multipliers = {
        'ISO': 0.85,
        'PnR ball handler': 0.92,
        'PnR roll': 1.05,
        'Post': 0.88,
        'Spot up': 1.02,
        'Transition': 1.15,
        'Cut': 1.20
    }

    multiplier = ppp_multipliers.get(play_type, 1.0)
    return multiplier * ts_pct_normalized


def apply_defensive_adjustment(base_ppp: float, defender_drtg: float) -> float:
    # Adjust PPP based on defender's defensive rating (DRTG)
    league_avg_drtg = 112
    return base_ppp * (league_avg_drtg / defender_drtg)


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
    # Select ball handler weighted by usage rate
    usg_rates = [p.get('usg_pct', 0.2) for p in offensive_team]
    ball_handler = random.choices(offensive_team, weights=usg_rates, k=1)[0]

    # Assign defender based on positional matchup
    defender = get_positional_matchup(ball_handler, defensive_team)

    # Sample play type
    distribution = get_play_type_distribution(
        ball_handler.get('position', 'N/A'),
        ball_handler.get('usg_pct', 0.2)
    )
    play_type = sample_play_type(distribution)

    # Calculate adjusted PPP
    base_ppp = get_base_ppp(play_type, ball_handler.get('ts_pct', 0.55))
    adjusted_ppp = apply_defensive_adjustment(base_ppp, defender.get('def_rating', 112))

    # Determine outcome
    turnover_prob = 0.13
    if random.random() < turnover_prob:
        outcome = 'Turnover'
        points_scored = 0
    else:
        # Score probability derived from adjusted_PPP
        # E[PPP] = 0.87 * score_prob * 2.25, so score_prob = adjusted_PPP / 2.0
        score_prob = min(adjusted_ppp / 2.0, 1.0)
        if random.random() < score_prob:
            # Randomly determine if 2 or 3 pointer (75% 2pt, 25% 3pt)
            if random.random() < 0.75:
                points_scored = 2
                outcome = 'Made 2PT'
            else:
                points_scored = 3
                outcome = 'Made 3PT'
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
        print(f"  {name} ({p['team_abbreviation']}) - {p['price']}M")

    print("\nTeam B:")
    for p in team_b:
        name = p['name'].encode('ascii', 'replace').decode('ascii')
        print(f"  {name} ({p['team_abbreviation']}) - {p['price']}M")

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


if __name__ == '__main__':
    main()
