import json
import time

from nba_api.stats.endpoints import leaguedashplayerstats

# Position strings use the same abbreviation convention as backend/data/players.json
# (e.g. 'G', 'F', 'C', 'G-F', 'F-C'). Hard-coded since these are well-known players
# and historical-season position data isn't available from leaguedashplayerstats.
TEAMS = {
    'west_r1': {
        'name': '2012 Thunder',
        'conference': 'West',
        'season': '2011-12',
        'players': [
            {'id': 201142, 'name': 'Kevin Durant', 'position': 'F', 'team': 'OKC'},
            {'id': 201566, 'name': 'Russell Westbrook', 'position': 'G', 'team': 'OKC'},
            {'id': 201935, 'name': 'James Harden', 'position': 'G', 'team': 'OKC'},
            {'id': 201586, 'name': 'Serge Ibaka', 'position': 'F-C', 'team': 'OKC'},
            {'id': 101141, 'name': 'Kendrick Perkins', 'position': 'C', 'team': 'OKC'},
        ],
    },
    'west_r2': {
        'name': '2001 Lakers',
        'conference': 'West',
        'season': '2000-01',
        'players': [
            {'id': 406, 'name': "Shaquille O'Neal", 'position': 'C', 'team': 'LAL'},
            {'id': 977, 'name': 'Kobe Bryant', 'position': 'G', 'team': 'LAL'},
            {'id': 1031, 'name': 'Derek Fisher', 'position': 'G', 'team': 'LAL'},
            {'id': 430, 'name': 'Robert Horry', 'position': 'F', 'team': 'LAL'},
            {'id': 776, 'name': 'Rick Fox', 'position': 'F', 'team': 'LAL'},
        ],
    },
    'west_finals': {
        'name': '2016 Warriors',
        'conference': 'West',
        'season': '2015-16',
        'players': [
            {'id': 201939, 'name': 'Stephen Curry', 'position': 'G', 'team': 'GSW'},
            {'id': 202691, 'name': 'Klay Thompson', 'position': 'G', 'team': 'GSW'},
            {'id': 203110, 'name': 'Draymond Green', 'position': 'F', 'team': 'GSW'},
            {'id': 2738, 'name': 'Andre Iguodala', 'position': 'G-F', 'team': 'GSW'},
            {'id': 101106, 'name': 'Andrew Bogut', 'position': 'C', 'team': 'GSW'},
        ],
    },
    'east_r1': {
        'name': '2016 Cavaliers',
        'conference': 'East',
        'season': '2015-16',
        'players': [
            {'id': 2544, 'name': 'LeBron James', 'position': 'F', 'team': 'CLE'},
            {'id': 202681, 'name': 'Kyrie Irving', 'position': 'G', 'team': 'CLE'},
            {'id': 201567, 'name': 'Kevin Love', 'position': 'F-C', 'team': 'CLE'},
            {'id': 2747, 'name': 'JR Smith', 'position': 'G', 'team': 'CLE'},
            {'id': 202684, 'name': 'Tristan Thompson', 'position': 'F-C', 'team': 'CLE'},
        ],
    },
    'east_r2': {
        'name': '2013 Heat',
        'conference': 'East',
        'season': '2012-13',
        'players': [
            {'id': 2544, 'name': 'LeBron James', 'position': 'F', 'team': 'MIA'},
            {'id': 2548, 'name': 'Dwyane Wade', 'position': 'G', 'team': 'MIA'},
            {'id': 203076, 'name': 'Chris Bosh', 'position': 'F-C', 'team': 'MIA'},
            {'id': 951, 'name': 'Ray Allen', 'position': 'G', 'team': 'MIA'},
            {'id': 2207, 'name': 'Shane Battier', 'position': 'F', 'team': 'MIA'},
        ],
    },
    'east_finals': {
        'name': '2008 Celtics',
        'conference': 'East',
        'season': '2007-08',
        'players': [
            {'id': 1718, 'name': 'Paul Pierce', 'position': 'F', 'team': 'BOS'},
            {'id': 708, 'name': 'Kevin Garnett', 'position': 'F-C', 'team': 'BOS'},
            {'id': 951, 'name': 'Ray Allen', 'position': 'G', 'team': 'BOS'},
            {'id': 200765, 'name': 'Rajon Rondo', 'position': 'G', 'team': 'BOS'},
            {'id': 101141, 'name': 'Kendrick Perkins', 'position': 'C', 'team': 'BOS'},
        ],
    },
}

ADVANCED_STAT_FIELDS = ['PIE', 'TS_PCT', 'USG_PCT', 'DEF_RATING']


def fetch_season_stats(season):
    print(f"Fetching advanced stats for season {season}...")
    stats_data = leaguedashplayerstats.LeagueDashPlayerStats(
        measure_type_detailed_defense='Advanced',
        season=season
    ).get_data_frames()[0]
    time.sleep(1)
    return stats_data


def main():
    print("=== NBA Classic Teams Fetcher ===\n")

    season_stats_cache = {}
    output_data = {}

    for team_key, team in TEAMS.items():
        season = team['season']

        if season not in season_stats_cache:
            season_stats_cache[season] = fetch_season_stats(season)

        season_stats = season_stats_cache[season]

        team_players = []
        for player in team['players']:
            player_stats = season_stats[season_stats['PLAYER_ID'] == player['id']]

            if len(player_stats) == 0:
                # Some legacy seasons use different PLAYER_ID values than the
                # canonical current-day PERSON_ID, so fall back to matching by name.
                player_stats = season_stats[season_stats['PLAYER_NAME'] == player['name']]

            if len(player_stats) == 0:
                print(f"Warning: No stats found for {player['name']} ({player['id']}) in {season}")
                continue

            stat_row = player_stats.iloc[0]
            team_players.append({
                'id': player['id'],
                'name': player['name'],
                'position': player['position'],
                'team': player['team'],
                'pie': round(stat_row['PIE'], 4),
                'ts_pct': round(stat_row['TS_PCT'], 4),
                'usg_pct': round(stat_row['USG_PCT'], 4),
                'def_rating': round(stat_row['DEF_RATING'], 2),
            })

            time.sleep(1)

        output_data[team_key] = {
            'name': team['name'],
            'conference': team['conference'],
            'players': team_players,
        }

        print(f"  {team['name']}: matched {len(team_players)}/{len(team['players'])} players")

    output_path = 'backend/data/classics.json'
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"\nSaved classic teams to {output_path}")


if __name__ == '__main__':
    main()
