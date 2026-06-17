import React from 'react';
import { ClassicTeam, GameResult } from '../types';
import './GameView.css';

interface GameViewProps {
  roundIndex: number;
  opponentTeam: ClassicTeam;
  userWins: number;
  opponentWins: number;
  lastResult: GameResult | null;
  isSimulating: boolean;
  isFinalRound: boolean;
  onPlayGame: () => void;
  onContinue: () => void;
  onRestart: () => void;
}

const sortedEntries = (boxScore: Record<string, number>) =>
  Object.entries(boxScore).sort((a, b) => b[1] - a[1]);

export const GameView: React.FC<GameViewProps> = ({
  roundIndex,
  opponentTeam,
  userWins,
  opponentWins,
  lastResult,
  isSimulating,
  isFinalRound,
  onPlayGame,
  onContinue,
  onRestart,
}) => {
  const roundWon = userWins === 4;
  const eliminated = opponentWins === 4;
  const seriesDecided = roundWon || eliminated;

  return (
    <div className="game-view">
      <div className="game-header">
        <h1 className="game-round-title">Round {roundIndex + 1} - vs {opponentTeam.name}</h1>
        <div className="series-tracker">
          You <span className="series-score">{userWins}</span> - <span className="series-score">{opponentWins}</span> Opponent
        </div>
      </div>

      {lastResult && (
        <div className="game-result-panel">
          <div className="game-result-score">
            <span className="score-user">{lastResult.scoreUser}</span>
            <span className="score-divider">:</span>
            <span className="score-opponent">{lastResult.scoreOpponent}</span>
          </div>
          <div className={`game-result-winner ${lastResult.winner}`}>
            {lastResult.winner === 'user' ? 'YOU WIN THE GAME' : 'OPPONENT WINS THE GAME'}
          </div>

          <div className="box-score">
            <div className="box-score-team">
              <h3>Your Team</h3>
              {sortedEntries(lastResult.userBoxScore).map(([name, points]) => (
                <div key={name} className="box-score-row">
                  <span className="box-score-name">{name}</span>
                  <span className="box-score-points">{Math.round(points)}</span>
                </div>
              ))}
            </div>
            <div className="box-score-team opponent">
              <h3>{opponentTeam.name}</h3>
              {sortedEntries(lastResult.opponentBoxScore).map(([name, points]) => (
                <div key={name} className="box-score-row">
                  <span className="box-score-name">{name}</span>
                  <span className="box-score-points">{Math.round(points)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="game-actions">
        {seriesDecided ? (
          roundWon ? (
            <div className="series-outcome series-outcome--win">
              <h2>{isFinalRound ? 'GAUNTLET CHAMPION!' : 'ROUND WON!'}</h2>
              <button className="continue-btn" onClick={onContinue}>
                {isFinalRound ? 'Claim Championship' : `Continue to Round ${roundIndex + 2}`}
              </button>
            </div>
          ) : (
            <div className="series-outcome series-outcome--loss">
              <h2>ELIMINATED</h2>
              <button className="restart-btn" onClick={onRestart}>Restart Gauntlet</button>
            </div>
          )
        ) : (
          <button className="play-game-btn" onClick={onPlayGame} disabled={isSimulating}>
            {isSimulating ? 'Simulating...' : 'Play Game'}
          </button>
        )}
      </div>
    </div>
  );
};
