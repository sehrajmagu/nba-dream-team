import React from 'react';
import { SeriesResult, SeriesSummary } from '../types';
import './PlayByPlayLog.css';

interface PlayByPlayLogProps {
  results: SeriesResult[];
  summary: SeriesSummary | null;
}

export const PlayByPlayLog: React.FC<PlayByPlayLogProps> = ({ results, summary }) => {
  if (results.length === 0) {
    return (
      <div className="play-by-play-log">
        <h3>Series Results</h3>
        <div className="log-empty">
          <p>Run a simulation to see results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="play-by-play-log">
      <h3>Series Results</h3>

      {summary && (
        <div className={`series-summary-header ${summary.seriesWinner === 'You' ? 'victory' : 'defeat'}`}>
          <div className="summary-content">
            <h2 className="series-winner">{summary.seriesWinner === 'You' ? '🏆 VICTORY' : 'DEFEAT'}</h2>
            <p className="series-score">
              {summary.seriesWinner === 'You' ? 'You' : 'Opponent'} wins the series {summary.userWins} - {summary.opponentWins}
            </p>
          </div>
        </div>
      )}

      <div className="series-summary">
        {results.map((result, idx) => (
          <div key={idx} className={`game-result ${result.result.toLowerCase()}`}>
            <div className="game-header">
              <span className="game-number">Game {result.game}</span>
              <span className={`game-result-badge ${result.result.toUpperCase()}`}>
                {result.result.toUpperCase()}
              </span>
            </div>
            <div className="game-score">{result.score}</div>

            <div className="box-score">
              <div className="team-score">
                <h4>Your Team</h4>
                <div className="player-stats">
                  {Object.entries(result.userBoxScore)
                    .sort((a, b) => b[1] - a[1])
                    .map(([player, points]) => (
                      <div key={player} className="player-stat">
                        <span className="player-name">{player}</span>
                        <span className="player-points">{Math.round(points)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="team-score opponent">
                <h4>Opponent</h4>
                <div className="player-stats">
                  {Object.entries(result.opponentBoxScore)
                    .sort((a, b) => b[1] - a[1])
                    .map(([player, points]) => (
                      <div key={player} className="player-stat">
                        <span className="player-name">{player}</span>
                        <span className="player-points">{Math.round(points)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
