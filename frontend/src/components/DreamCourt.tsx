import React from 'react';
import { Player, Position } from '../types';
import { OpponentTeamBuilder } from './OpponentTeamBuilder';
import './DreamCourt.css';

interface DreamCourtProps {
  allPlayers: Player[];
  selectedTeam: Player[];
  selectedOpponent: Player[];
  onOpponentChange: (opponent: Player[]) => void;
  onSimulate: () => void;
  isSimulating: boolean;
  teamRoster?: Record<Position, Player | null>;
}

const POSITION_COORDS: Record<string, { x: number; y: number; label: string }> = {
  PG: { x: 50, y: 30, label: 'PG' },
  SG: { x: 80, y: 50, label: 'SG' },
  SF: { x: 50, y: 70, label: 'SF' },
  PF: { x: 20, y: 50, label: 'PF' },
  C: { x: 50, y: 85, label: 'C' },
};

export const DreamCourt: React.FC<DreamCourtProps> = ({
  allPlayers,
  selectedTeam,
  selectedOpponent,
  onOpponentChange,
  onSimulate,
  isSimulating,
  teamRoster,
}) => {
  const canSimulate = selectedTeam.length === 5 && selectedOpponent.length === 5;

  // Create a position to player mapping from roster or selectedTeam
  const positionMap: Record<string, Player | undefined> = {};
  if (teamRoster) {
    positionMap.PG = teamRoster.PG || undefined;
    positionMap.SG = teamRoster.SG || undefined;
    positionMap.SF = teamRoster.SF || undefined;
    positionMap.PF = teamRoster.PF || undefined;
    positionMap.C = teamRoster.C || undefined;
  } else {
    // Fallback: distribute selectedTeam to positions in order
    const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];
    selectedTeam.forEach((player, idx) => {
      if (idx < POSITIONS.length) {
        positionMap[POSITIONS[idx]] = player;
      }
    });
  }

  return (
    <div className="dream-court">
      <div className="court-section">
        <h2>Dream Court</h2>
        <div className="court-container">
          <svg viewBox="0 0 100 100" className="court-svg">
            <defs>
              <pattern id="court-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="var(--nba-dark)" />
                <rect width="10" height="10" fill="none" stroke="var(--nba-gray)" strokeWidth="0.1" />
              </pattern>
            </defs>

            {/* Court background */}
            <rect x="0" y="0" width="100" height="100" fill="var(--nba-gray)" />

            {/* Court lines */}
            <rect x="5" y="5" width="90" height="90" fill="none" stroke="var(--nba-light)" strokeWidth="0.5" />

            {/* Center circle */}
            <circle cx="50" cy="50" r="6" fill="none" stroke="var(--nba-light)" strokeWidth="0.3" />

            {/* Three point line */}
            <path d="M 16 5 L 16 32 Q 16 40 22 40 L 78 40 Q 84 40 84 32 L 84 5" fill="none" stroke="var(--nba-light)" strokeWidth="0.3" />

            {/* Free throw lane */}
            <rect x="35" y="5" width="30" height="28" fill="none" stroke="var(--nba-light)" strokeWidth="0.3" />

            {/* Basket */}
            <circle cx="50" cy="10" r="0.75" fill="none" stroke="var(--nba-light)" strokeWidth="0.2" />

            {/* Position indicators */}
            {Object.entries(POSITION_COORDS).map(([pos, coords]) => {
              const player = positionMap[pos];
              return (
                <g key={pos}>
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r="4"
                    fill={player ? 'var(--nba-red)' : 'var(--nba-gray-light)'}
                    opacity="0.6"
                  />
                  <text
                    x={coords.x}
                    y={coords.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="2"
                    fontWeight="600"
                    fill="white"
                  >
                    {coords.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Player headshots overlay */}
          <div className="court-overlay">
            {Object.entries(POSITION_COORDS).map(([pos, coords]) => {
              const player = positionMap[pos];
              if (!player) return null;
              return (
                <div
                  key={player.id}
                  className="court-player"
                  style={{
                    left: `${coords.x}%`,
                    top: `${coords.y}%`,
                  }}
                >
                  <img
                    src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                    alt={player.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40x50';
                    }}
                  />
                  <p className="court-player-name">{player.name.split(' ')[1]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="simulation-section">
        <div className="simulate-controls">
          <button
            className="simulate-btn"
            onClick={onSimulate}
            disabled={!canSimulate || isSimulating}
          >
            {isSimulating ? 'Simulating...' : 'Simulate Series'}
          </button>
          {!canSimulate && <p className="warning">Select 5 players for your team and 5 for opponent to simulate</p>}
        </div>

        <OpponentTeamBuilder
          allPlayers={allPlayers}
          selectedOpponent={selectedOpponent}
          onOpponentChange={onOpponentChange}
        />
      </div>
    </div>
  );
};
