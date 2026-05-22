import React from 'react';
import { SeriesResult } from '../types';
import './PlayByPlayLog.css';

interface PlayByPlayLogProps {
  results: SeriesResult[];
}

export const PlayByPlayLog: React.FC<PlayByPlayLogProps> = ({ results }) => {
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
            {result.playByPlay.length > 0 && (
              <div className="game-plays">
                {result.playByPlay.slice(0, 3).map((play, pidx) => (
                  <p key={pidx} className="play">{play}</p>
                ))}
                {result.playByPlay.length > 3 && (
                  <p className="more-plays">+{result.playByPlay.length - 3} more plays</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
