import csv
import json
from collections import Counter

NBASTATS_PATH = 'backend/data/training/nbastats_2024.csv'
PLAYERS_PATH = 'backend/data/players_2024.json'
OUTPUT_PATH = 'backend/data/training/training_data.csv'

OUTCOME_TURNOVER = 0
OUTCOME_MISS = 1
OUTCOME_2PT_MAKE = 2
OUTCOME_3PT_MAKE = 3


def load_player_lookup():
    with open(PLAYERS_PATH) as f:
        players = json.load(f)
    return {player['id']: player for player in players}


def get_outcome(row):
    event_type = row['EVENTMSGTYPE']
    if event_type == '5':
        return OUTCOME_TURNOVER
    if event_type == '2':
        return OUTCOME_MISS
    if event_type == '1':
        description = (row['HOMEDESCRIPTION'] or '') + (row['VISITORDESCRIPTION'] or '')
        if '3PT' in description:
            return OUTCOME_3PT_MAKE
        return OUTCOME_2PT_MAKE
    return None


def main():
    print("=== Preparing Possession Outcome Training Data ===\n")

    player_lookup = load_player_lookup()
    print(f"Loaded {len(player_lookup)} players\n")

    rows_saved = 0
    rows_skipped = 0
    outcome_counts = Counter()

    with open(NBASTATS_PATH) as infile, open(OUTPUT_PATH, 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        fieldnames = [
            'offensive_rating',
            'offensive_pts',
            'offensive_ts_pct',
            'offensive_usg_pct',
            'outcome'
        ]
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            if row['EVENTMSGTYPE'] not in ('1', '2', '5'):
                continue

            outcome = get_outcome(row)

            ball_handler_id_str = row['PLAYER1_ID']
            if not ball_handler_id_str or ball_handler_id_str == '0':
                rows_skipped += 1
                continue
            ball_handler_id = int(ball_handler_id_str)

            ball_handler = player_lookup.get(ball_handler_id)
            if ball_handler is None:
                rows_skipped += 1
                continue

            writer.writerow({
                'offensive_rating': ball_handler['rating'],
                'offensive_pts': ball_handler['pts'],
                'offensive_ts_pct': ball_handler['ts_pct'],
                'offensive_usg_pct': ball_handler['usg_pct'],
                'outcome': outcome
            })

            rows_saved += 1
            outcome_counts[outcome] += 1

    print(f"Saved {rows_saved} rows to {OUTPUT_PATH}")
    print(f"Skipped {rows_skipped} rows (player not found)\n")

    outcome_labels = {
        OUTCOME_TURNOVER: 'Turnover',
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
