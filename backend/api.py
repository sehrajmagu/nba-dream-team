import json
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import google.generativeai as genai

from engine.simulate import simulate_game, simulate_series

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

load_dotenv(ROOT_DIR / '.env')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME = 'models/gemini-3.5-flash'

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})


def load_players():
    data_path = BASE_DIR / 'data' / 'players.json'
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_classic_players():
    data_path = BASE_DIR / 'data' / 'classics.json'
    with open(data_path, 'r', encoding='utf-8') as f:
        classics = json.load(f)
    players = []
    for team in classics.values():
        players.extend(team.get('players', []))
    return players


def normalize_ids(ids):
    normalized = []
    if not isinstance(ids, list):
        return normalized
    for pid in ids:
        try:
            normalized.append(int(pid))
        except (ValueError, TypeError):
            continue
    return normalized


@app.route('/api/players', methods=['GET'])
def get_players():
    players = load_players()
    return jsonify(players), 200


def resolve_teams(payload):
    team_ids = normalize_ids(payload.get('teamIds', []))
    opponent_ids = normalize_ids(payload.get('opponentIds', []))

    if len(team_ids) != 5:
        return None, None, (jsonify({'error': 'Must provide exactly 5 player IDs for teamIds'}), 400)
    if len(opponent_ids) != 5:
        return None, None, (jsonify({'error': 'Must provide exactly 5 player IDs for opponentIds'}), 400)

    players = load_players()
    players_by_id = {p['id']: p for p in players}

    opponent_lookup = dict(players_by_id)
    for p in load_classic_players():
        opponent_lookup.setdefault(p['id'], p)

    user_team = [players_by_id.get(pid) for pid in team_ids]
    opponent_team = [opponent_lookup.get(pid) for pid in opponent_ids]

    if any(p is None for p in user_team):
        return None, None, (jsonify({'error': 'One or more teamIds are invalid'}), 404)
    if any(p is None for p in opponent_team):
        return None, None, (jsonify({'error': 'One or more opponentIds are invalid'}), 404)

    return user_team, opponent_team, None


@app.route('/api/simulate', methods=['POST'])
def simulate():
    payload = request.get_json(silent=True) or {}
    user_team, opponent_team, error = resolve_teams(payload)
    if error:
        return error

    series_results = simulate_series(user_team, opponent_team)
    formatted_results = []

    for game in series_results['games']:
        user_box_score = {p['name']: 0 for p in user_team}
        opponent_box_score = {p['name']: 0 for p in opponent_team}

        for play in game.get('possession_log', []):
            team = play.get('team')
            handler = play.get('ball_handler')
            points = play.get('points_scored', 0)
            if team == 'A' and handler in user_box_score:
                user_box_score[handler] += points
            elif team == 'B' and handler in opponent_box_score:
                opponent_box_score[handler] += points

        result = 'WIN' if game['score_a'] > game['score_b'] else 'LOSS'
        formatted_results.append({
            'game': game['game'],
            'result': result,
            'score': f"{game['score_a']} - {game['score_b']}",
            'userBoxScore': user_box_score,
            'opponentBoxScore': opponent_box_score,
        })

    return jsonify({
        'series': formatted_results,
        'seriesWinner': 'You' if series_results['series_winner'] == 'A' else 'Opponent',
        'userWins': series_results['team_a_wins'],
        'opponentWins': series_results['team_b_wins'],
        'message': 'Simulation complete!'
    }), 200


@app.route('/api/simulate/game', methods=['POST'])
def simulate_single_game():
    payload = request.get_json(silent=True) or {}
    user_team, opponent_team, error = resolve_teams(payload)
    if error:
        return error

    (score_a, score_b), possession_log = simulate_game(user_team, opponent_team)

    return jsonify({
        'score_a': score_a,
        'score_b': score_b,
        'winner': 'user' if score_a > score_b else 'opponent',
        'possession_log': possession_log,
    }), 200


@app.route('/api/chat', methods=['POST'])
def chat():
    payload = request.get_json(silent=True) or {}
    message = payload.get('message', '')
    remaining_budget = payload.get('remaining_budget')

    if not isinstance(message, str) or not message.strip():
        return jsonify({'error': 'A non-empty message is required'}), 400

    players = load_players()
    compact_players = [
        {
            'id': p['id'],
            'name': p['name'],
            'position': p.get('position'),
            'team': p.get('team_abbreviation'),
            'price': p.get('price'),
            'usg_pct': p.get('usg_pct'),
            'ts_pct': p.get('ts_pct'),
            'def_rating': p.get('def_rating'),
        }
        for p in players
    ]

    prompt = (
        'You are an NBA Dream Team assistant. Use the player database below to answer the user question. '
        'Do not invent players or prices. Keep the response concise and actionable.\n\n'
        f'Player database: {json.dumps(compact_players, ensure_ascii=False)}\n\n'
        f'Remaining budget: {remaining_budget}\n'
        f'User message: {message}'
    )

    if not GEMINI_API_KEY:
        return jsonify({'error': 'Gemini API key is not configured'}), 500

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        answer = getattr(response, 'text', None)

        if not answer:
            candidates = getattr(response, 'candidates', []) or []
            if candidates:
                answer = getattr(candidates[0], 'content', None) or str(candidates[0])

        return jsonify({'response': answer or 'No response from Gemini.'}), 200

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
