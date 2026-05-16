import json
from nba_api.stats.endpoints import commonallplayers, leaguedashplayerstats, playerindex


def fetch_all_players(): #fetches all ACTIVE nba players for the 2025-26 season
    print("Fetching all NBA players...")
    players_data = commonallplayers.CommonAllPlayers( #fetches all players, then we filter to active ones
        season="2025-26"
    ).get_data_frames()[0]

    # Filter to only active players (ROSTERSTATUS == 1) and active in 2025-26
    active_players = players_data[
        (players_data['ROSTERSTATUS'] == 1) & # Only include players whose last active season is 2025 or later
        (players_data['TO_YEAR'].astype(int) >= 2025)
    ]

    return active_players


def get_all_player_stats(season="2025-26"): #fetches advanced stats for all players in the specified season
    print("Fetching advanced stats for all players...")
    stats_data = leaguedashplayerstats.LeagueDashPlayerStats( 
        measure_type_detailed_defense="Advanced",
        season=season
    ).get_data_frames()[0]

    return stats_data

def get_player_positions(season="2025-26"):
    print("Fetching player positions...")
    import time
    time.sleep(1)
    position_data = playerindex.PlayerIndex(season=season).get_data_frames()[0]
    return position_data[['PERSON_ID', 'POSITION']]


def normalize_and_price(players_stats):
    """
    Calculate normalized scores and prices for players.
    Price ranges from exactly $1M to $10M using min-max scaling.
    Returns prices in millions (1.0 to 10.0).
    Weights: 50% PER, 30% TS%, 20% USG%
    """
    if len(players_stats) == 0:
        return []

    # Find max values for normalization
    max_per = players_stats['PER'].max() # Find the maximum PER value among all players for normalization
    max_ts_pct = players_stats['TS_PCT'].max() # Find the maximum TS% value among all players for normalization
    max_usg_pct = players_stats['USG_PCT'].max() # Find the maximum USG% value among all players for normalization

    # Avoid division by zero by ensuring max values are at least 1
    max_per = max_per if max_per > 0 else 1
    max_ts_pct = max_ts_pct if max_ts_pct > 0 else 1
    max_usg_pct = max_usg_pct if max_usg_pct > 0 else 1

    # First pass: calculate raw weighted scores for all players
    raw_scores = []
    for _, row in players_stats.iterrows():
        # Normalize each metric by dividing by the max value
        per_norm = row['PER'] / max_per 
        ts_norm = row['TS_PCT'] / max_ts_pct
        usg_norm = row['USG_PCT'] / max_usg_pct

        # Weighted score: 50% PER, 30% TS%, 20% USG%
        weighted_score = (0.5 * per_norm +
                         0.3 * ts_norm +
                         0.2 * usg_norm)
        raw_scores.append(weighted_score)

    # Find min and max of raw scores for min-max scaling
    min_score = min(raw_scores)
    max_score = max(raw_scores)
    score_range = max_score - min_score
    score_range = score_range if score_range > 0 else 1

    # Second pass: apply min-max normalization to get prices from 1-10
    prices = []
    for score in raw_scores:
        # Normalize score to 0-1 range
        normalized = (score - min_score) / score_range
        # Scale to 1-10 million range
        price = 1.0 + (normalized * 9.0)
        prices.append(round(price, 2))

    return prices


def main():
    print("=== NBA Player Price Calculator ===\n")

    # Fetch all active players
    all_players = fetch_all_players()
    print(f"Found {len(all_players)} active players")

    # Fetch all stats in one API call
    all_stats = get_all_player_stats()
    print(f"Fetched stats for {len(all_stats)} total players\n")

    all_positions = get_player_positions() # Fetch player positions to include in the final output

    # Merge stats with active players by PERSON_ID
    all_stats_list = []
    for _, player in all_players.iterrows():
        player_id = player['PERSON_ID']
        player_name = player['DISPLAY_FIRST_LAST']

        # Find matching stats for this player
        player_stats = all_stats[all_stats['PLAYER_ID'] == player_id]

        # Get position
        pos_row = all_positions[all_positions['PERSON_ID'] == player_id]
        position = pos_row.iloc[0]['POSITION'] if len(pos_row) > 0 else 'N/A'

        if len(player_stats) > 0:
            stat_row = player_stats.iloc[0]
            games_played = stat_row.get('GP', 0)

            # Only include players with at least 41 games played (half season)
            if games_played >= 41:
                all_stats_list.append({
                    'player_id': player_id,
                    'player_name': player_name,
                    'position': position,
                    'team_name': player.get('TEAM_NAME', 'N/A'),
                    'team_abbreviation': player.get('TEAM_ABBREVIATION', 'N/A'),
                    'PER': stat_row.get('PER', 0),
                    'TS_PCT': stat_row.get('TS_PCT', 0),
                    'USG_PCT': stat_row.get('USG_PCT', 0),
                    'DEF_RATING': stat_row.get('DEF_RATING', 0)
                })

    print(f"Successfully matched {len(all_stats_list)} active players with stats\n")

    if len(all_stats_list) == 0:
        print("No players matched. Exiting.")
        return

    # Convert to dataframe-like structure for normalization
    class StatsFrame:
        def __init__(self, data):
            self.data = data

        def __len__(self):
            return len(self.data)

        def iterrows(self):
            for i, row in enumerate(self.data):
                yield i, row

        def __getitem__(self, key):
            class Column:
                def __init__(self, data, col):
                    self.values = [d[col] for d in data if col in d]

                def max(self):
                    return max(self.values) if self.values else 1

                def min(self):
                    return min(self.values) if self.values else 0

            return Column(self.data, key)

    stats_frame = StatsFrame(all_stats_list)
    prices = normalize_and_price(stats_frame)

    # Prepare final output
    output_data = []
    for i, stats in enumerate(all_stats_list):
        output_data.append({
            'id': stats['player_id'],
            'name': stats['player_name'],
            'position': stats['position'],
            'team_name': stats['team_name'],
            'team_abbreviation': stats['team_abbreviation'],
            'price': prices[i],  # Price in millions (1.0 to 10.0)
            'per': round(stats['PER'], 2),
            'ts_pct': round(stats['TS_PCT'], 4),
            'usg_pct': round(stats['USG_PCT'], 4),
            'def_rating': round(stats['DEF_RATING'], 2)
        })

    # Save to JSON
    output_path = 'backend/data/players.json'
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"Saved {len(output_data)} players to {output_path}")
    price_min = min(p['price'] for p in output_data)
    price_max = max(p['price'] for p in output_data)
    print(f"\nPrice range: ${price_min:.2f}M - ${price_max:.2f}M")


if __name__ == '__main__':
    main()
