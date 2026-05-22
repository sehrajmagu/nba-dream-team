from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from engine.simulate import simulate_series

app = Flask(__name__)
CORS(app)

# Load players data
def load_players():
    with open('data/players.json', 'r') as f:
        return json.load(f)

# Opponent team mappings
OPPONENT_TEAMS = {
    'Lakers': ['LeBron James', 'Anthony Davis', 'Austin Reaves', 'Rui Hachimura', 'Jaxson Hayes'],
    'Celtics': ['Jayson Tatum', 'Jaylen Brown', 'Derrick White', 'Kristaps Porzingis', 'Jrue Holiday'],
    'Warriors': ['Stephen Curry', 'Klay Thompson', 'Andrew Wiggins', 'Kevon Looney', 'Draymond Green'],
    'Heat': ['Jimmy Butler', 'Bam Adebayo', 'Tyler Herro', 'Haywood Highsmith', 'Jaime Jaquez Jr.'],
    'Nuggets': ['Nikola Jokic', 'Jamal Murray', 'Michael Porter Jr.', 'Aaron Gordon', 'Kentavious Caldwell-Pope'],
    'Bucks': ['Giannis Antetokounmpo', 'Damian Lillard', 'Khris Middleton', 'Brook Lopez', 'Bobby Portis'],
    'Suns': ['Kevin Durant', 'Devin Booker', 'Bradley Beal', 'Chris Paul', 'Jusuf Nurkic'],
    'Thunder': ['Shai Gilgeous-Alexander', 'Jalen Williams', 'Luguentz Dort', 'Isaiah Joe', 'Chet Holmgren'],
}

def get_opponent_team(opponent_name, all_players):
    """Get opponent team roster by finding players by name."""
    players_by_name = {p['name']: p for p in all_players}
    opponent_names = OPPONENT_TEAMS.get(opponent_name, [])

    opponent_roster = []
    for name in opponent_names:
        if name in players_by_name:
            opponent_roster.append(players_by_name[name])

    # If we can't find all players, try to get the best 5 from that team's abbreviation
    if len(opponent_roster) < 5:
        team_abbr = get_team_abbreviation(opponent_name)
        if team_abbr:
            team_players = sorted(
                [p for p in all_players if p['team_abbreviation'] == team_abbr],
                key=lambda p: p['price'],
                reverse=True
            )[:5]
            return team_players

    return opponent_roster[:5]

def get_team_abbreviation(team_name):
    """Map team name to abbreviation."""
    mapping = {
        'Lakers': 'LAL',
        'Celtics': 'BOS',
        'Warriors': 'GSW',
        'Heat': 'MIA',
        'Nuggets': 'DEN',
        'Bucks': 'MIL',
        'Suns': 'PHX',
        'Thunder': 'OKC',
    }
    return mapping.get(team_name)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

@app.route('/api/simulate', methods=['POST'])
def simulate():
    try:
        data = request.json

        # Extract team player IDs and opponent
        team_ids = data.get('teamIds', [])
        opponent = data.get('opponent', '')

        if not team_ids or len(team_ids) != 5:
            return jsonify({'error': 'Must provide exactly 5 player IDs'}), 400

        if not opponent:
            return jsonify({'error': 'Must provide opponent name'}), 400

        # Load players data to get team info
        players = load_players()
        players_by_id = {p['id']: p for p in players}

        # Build user's team
        user_team = [players_by_id[pid] for pid in team_ids if pid in players_by_id]

        if len(user_team) != 5:
            return jsonify({'error': 'One or more players not found'}), 404

        # Get opponent team
        opponent_team = get_opponent_team(opponent, players)

        if len(opponent_team) < 5:
            return jsonify({'error': f'Could not find enough players for {opponent}'}), 404

        # Run simulation
        series_results = simulate_series(user_team, opponent_team)

        # Format results for frontend
        formatted_results = []
        for game in series_results['games']:
            user_score = game['score_a']
            opponent_score = game['score_b']
            result = 'WIN' if user_score > opponent_score else 'LOSS'

            formatted_results.append({
                'game': game['game'],
                'result': result,
                'score': f'{user_score} - {opponent_score}',
                'playByPlay': game['possession_log'][:15]  # Limit to first 15 plays
            })

        return jsonify({
            'series': formatted_results,
            'seriesWinner': 'You' if series_results['series_winner'] == 'A' else opponent,
            'userWins': series_results['team_a_wins'],
            'opponentWins': series_results['team_b_wins'],
            'message': 'Simulation complete!'
        }), 200

    except Exception as e:
        print(f"Error in simulation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
