import csv
import json
import re
from collections import Counter

NBASTATS_PATH = 'backend/data/training/nbastats_2024.csv'
PLAYERS_PATH = 'backend/data/players_2024.json'
OUTPUT_PATH = 'backend/data/training/training_data.csv'

OUTCOME_MISS = 1
OUTCOME_2PT_MAKE = 2
OUTCOME_3PT_MAKE = 3

SHOT_DISTANCE_PATTERN = re.compile(r"(\d+)'")


def load_player_lookup():
    with open(PLAYERS_PATH) as f:
        players = json.load(f)
    return {player['id']: player for player in players}


def get_outcome(row, description):
    event_type = row['EVENTMSGTYPE']
    if event_type == '2':
        return OUTCOME_MISS
    if event_type == '1':
        if '3PT' in description:
            return OUTCOME_3PT_MAKE
        return OUTCOME_2PT_MAKE
    return None


def get_shot_distance(description):
    match = SHOT_DISTANCE_PATTERN.search(description)
    if match is None:
        return None
    return int(match.group(1))


def main():
    print("=== Preparing Possession Outcome Training Data ===\n")
    print("Turnovers are excluded here and handled separately as a constant-rate gate.\n")

    player_lookup = load_player_lookup()
    print(f"Loaded {len(player_lookup)} players\n")

    rows_saved = 0
    rows_skipped_no_player = 0
    rows_skipped_no_distance = 0
    outcome_counts = Counter()

    with open(NBASTATS_PATH) as infile, open(OUTPUT_PATH, 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        fieldnames = [
            'offensive_rating',
            'offensive_pts',
            'offensive_ts_pct',
            'offensive_usg_pct',
            'shot_distance',
            'outcome'
        ]
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            # Turnovers (EVENTMSGTYPE 5) are excluded: they have no shot, so no
            # shot_distance, and are modeled as a fixed-rate gate elsewhere.
            if row['EVENTMSGTYPE'] not in ('1', '2'):
                continue

            description = (row['HOMEDESCRIPTION'] or '') + (row['VISITORDESCRIPTION'] or '')
            outcome = get_outcome(row, description)

            shot_distance = get_shot_distance(description)
            if shot_distance is None:
                rows_skipped_no_distance += 1
                continue

            ball_handler_id_str = row['PLAYER1_ID']
            if not ball_handler_id_str or ball_handler_id_str == '0':
                rows_skipped_no_player += 1
                continue
            ball_handler_id = int(ball_handler_id_str)

            ball_handler = player_lookup.get(ball_handler_id)
            if ball_handler is None:
                rows_skipped_no_player += 1
                continue

            writer.writerow({
                'offensive_rating': ball_handler['rating'],
                'offensive_pts': ball_handler['pts'],
                'offensive_ts_pct': ball_handler['ts_pct'],
                'offensive_usg_pct': ball_handler['usg_pct'],
                'shot_distance': shot_distance,
                'outcome': outcome
            })

            rows_saved += 1
            outcome_counts[outcome] += 1

    total_skipped = rows_skipped_no_player + rows_skipped_no_distance
    print(f"Saved {rows_saved} rows to {OUTPUT_PATH}")
    print(f"Skipped {total_skipped} rows total:")
    print(f"  {rows_skipped_no_distance} rows with no extractable shot distance")
    print(f"  {rows_skipped_no_player} rows with player not found\n")

    outcome_labels = {
        OUTCOME_MISS: 'Miss',
        OUTCOME_2PT_MAKE: '2PT Make',
        OUTCOME_3PT_MAKE: '3PT Make'
    }
    print("Outcome distribution:")
    for outcome, label in outcome_labels.items():
        count = outcome_counts.get(outcome, 0)
        print(f"{label}: {count}")


if __name__ == '__main__':
    main()
