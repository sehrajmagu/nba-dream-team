import json
import math
from nba_api.stats.endpoints import commonallplayers, leaguedashplayerstats, playerindex


def fetch_all_players(): #fetches all ACTIVE nba players for the 2023-24 season
    print("Fetching all NBA players...")
    players_data = commonallplayers.CommonAllPlayers( #fetches all players, then we filter to active ones
        season="2023-24"
    ).get_data_frames()[0]

    # Filter to only active players (ROSTERSTATUS == 1) and active in 2023-24
    active_players = players_data[
        (players_data['ROSTERSTATUS'] == 1) & # Only include players whose last active season is 2023 or later
        (players_data['TO_YEAR'].astype(int) >= 2023)
    ]

    return active_players


def get_all_player_stats(season="2023-24"): #fetches advanced stats for all players in the specified season
    print("Fetching advanced stats for all players...")
    stats_data = leaguedashplayerstats.LeagueDashPlayerStats(
        measure_type_detailed_defense="Advanced",
        season=season
    ).get_data_frames()[0]

    return stats_data


def get_base_player_stats(season="2023-24"): #fetches base per-game stats for all players in the specified season
    print("Fetching base stats for all players...")
    stats_data = leaguedashplayerstats.LeagueDashPlayerStats(
        per_mode_detailed="PerGame",
        season=season
    ).get_data_frames()[0]

    return stats_data


def get_player_positions(season="2023-24"):
    print("Fetching player positions...")
    import time
    time.sleep(1)
    position_data = playerindex.PlayerIndex(season=season, historical_nullable=1).get_data_frames()[0]
    return position_data[['PERSON_ID', 'POSITION']]


RATING_WEIGHTS = {
    'PIE': 0.25,
    'TS_PCT': 0.12,
    'USG_PCT': 0.20,
    'PTS': 0.18,
    'AST': 0.08,
    'REB': 0.07,
    'STL': 0.05,
    'BLK': 0.03,
    'TOV': 0.02,  # inverted: lower TOV is better
}


def compute_ratings(all_stats_list):
    """
    Build a composite player rating from advanced stats (PIE, TS%, USG%) and
    per-game base stats (PTS, AST, REB, STL, BLK, TOV), weighted per
    RATING_WEIGHTS. Raw composite scores get a sqrt transform to compress
    variance at the top end, then are min-max scaled to a 65-99 range so
    most players land 72-82, good starters 83-88, stars 89-94, and elite
    players 95-99.
    """
    if len(all_stats_list) == 0:
        return []

    # Find max values for normalization (each stat normalized against the field's max)
    maxes = {}
    for stat in RATING_WEIGHTS:
        stat_max = max(p[stat] for p in all_stats_list)
        maxes[stat] = stat_max if stat_max > 0 else 1

    # First pass: raw weighted composite score per player
    raw_scores = []
    for row in all_stats_list:
        score = 0.0
        for stat, weight in RATING_WEIGHTS.items():
            norm = row[stat] / maxes[stat]
            if stat == 'TOV':
                norm = 1 - norm  # invert so lower turnovers score higher
            score += weight * norm
        raw_scores.append(score)

    # Square root transform to compress variance at the top end
    sqrt_scores = [math.sqrt(score) for score in raw_scores]

    # Min-max scale to 65-99
    min_score = min(sqrt_scores)
    max_score = max(sqrt_scores)
    score_range = max_score - min_score
    score_range = score_range if score_range > 0 else 1

    ratings = []
    for score in sqrt_scores:
        normalized = (score - min_score) / score_range
        rating = 65 + (normalized * 34)
        ratings.append(round(rating))

    return ratings


def get_tier_positions(position):
    if position in ('G-F', 'F-G'):
        return ['G', 'F']
    if position in ('F-C', 'C-F'):
        return ['F', 'C']
    if position in ('G', 'F', 'C'):
        return [position]
    return ['F']


def get_tier_class(rating):
    if rating <= 75:
        return 'A'  # Bronze
    if rating <= 85:
        return 'B'  # Silver
    return 'C'  # Gold


def main():
    print("=== NBA Player Rating Calculator ===\n")

    # Fetch all active players
    all_players = fetch_all_players()
    print(f"Found {len(all_players)} active players")

    # Fetch advanced and base stats in two API calls
    all_stats = get_all_player_stats()
    print(f"Fetched advanced stats for {len(all_stats)} total players")

    base_stats = get_base_player_stats()
    print(f"Fetched base stats for {len(base_stats)} total players\n")

    # Fetch player positions
    all_positions = get_player_positions()

    # Merge stats with active players by PERSON_ID
    all_stats_list = []
    for _, player in all_players.iterrows():
        player_id = player['PERSON_ID']
        player_name = player['DISPLAY_FIRST_LAST']

        # Find matching stats for this player
        player_stats = all_stats[all_stats['PLAYER_ID'] == player_id]
        player_base_stats = base_stats[base_stats['PLAYER_ID'] == player_id]

        # Get position
        pos_row = all_positions[all_positions['PERSON_ID'] == player_id]
        position = pos_row.iloc[0]['POSITION'] if len(pos_row) > 0 else 'N/A'

        if len(player_stats) > 0 and len(player_base_stats) > 0:
            stat_row = player_stats.iloc[0]
            base_row = player_base_stats.iloc[0]

            all_stats_list.append({
                'player_id': player_id,
                'player_name': player_name,
                'position': position,
                'team_name': player.get('TEAM_NAME', 'N/A'),
                'team_abbreviation': player.get('TEAM_ABBREVIATION', 'N/A'),
                'PIE': stat_row.get('PIE', 0),
                'TS_PCT': stat_row.get('TS_PCT', 0),
                'USG_PCT': stat_row.get('USG_PCT', 0),
                'DEF_RATING': stat_row.get('DEF_RATING', 0),
                'PTS': base_row.get('PTS', 0),
                'AST': base_row.get('AST', 0),
                'REB': base_row.get('REB', 0),
                'STL': base_row.get('STL', 0),
                'BLK': base_row.get('BLK', 0),
                'TOV': base_row.get('TOV', 0)
            })

    print(f"Successfully matched {len(all_stats_list)} active players with stats\n")

    if len(all_stats_list) == 0:
        print("No players matched. Exiting.")
        return

    # Calculate ratings
    ratings = compute_ratings(all_stats_list)

    # Prepare final output
    output_data = []
    for i, stats in enumerate(all_stats_list):
        output_data.append({
            'id': stats['player_id'],
            'name': stats['player_name'],
            'position': stats['position'],
            'team_name': stats['team_name'],
            'team_abbreviation': stats['team_abbreviation'],
            'rating': ratings[i],
            'tier_positions': get_tier_positions(stats['position']),
            'tier_class': get_tier_class(ratings[i]),
            'pie': round(stats['PIE'], 4),
            'ts_pct': round(stats['TS_PCT'], 4),
            'usg_pct': round(stats['USG_PCT'], 4),
            'def_rating': round(stats['DEF_RATING'], 2),
            'pts': round(stats['PTS'], 1),
            'ast': round(stats['AST'], 1),
            'reb': round(stats['REB'], 1),
            'stl': round(stats['STL'], 1),
            'blk': round(stats['BLK'], 1),
            'tov': round(stats['TOV'], 1)
        })

    # Save to JSON
    output_path = 'backend/data/players_2024.json'
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"✓ Saved {len(output_data)} players to {output_path}")

    # Top 15 players by rating
    top_15 = sorted(output_data, key=lambda p: p['rating'], reverse=True)[:15]
    print("\nTop 15 players by rating:")
    for i, p in enumerate(top_15, 1):
        print(f"{i:>2}. {p['name']:<25} {p['rating']:>3}  ({p['team_abbreviation']}, {p['position']})")

    # Tier distribution
    tier_names = {'A': 'Bronze', 'B': 'Silver', 'C': 'Gold'}
    print("\nTier distribution:")
    for tier, label in tier_names.items():
        count = sum(1 for p in output_data if p['tier_class'] == tier)
        print(f"{label} ({tier}): {count}")


if __name__ == '__main__':
    main()
