import React from 'react';
import { Player, Position } from '../types';
import './SelectedTeamSlots.css';

interface SelectedTeamSlotsProps {
  selectedTeam: Record<Position, Player | null>;
  onRemovePlayer: (position: Position) => void;
}

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export const SelectedTeamSlots: React.FC<SelectedTeamSlotsProps> = ({
  selectedTeam,
  onRemovePlayer,
}) => {
  return (
    <div className="team-slots">
      <h3>Your Team</h3>
      <div className="slots-container">
        {POSITIONS.map(position => {
          const player = selectedTeam[position];
          return (
            <div key={position} className="slot">
              <div className="position-label">{position}</div>
              {player ? (
                <div className="player-slot filled">
                  <img
                    src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                    alt={player.name}
                    className="headshot"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x100?text=' + player.name.substring(0, 1);
                    }}
                  />
                  <div className="player-info">
                    <p className="player-name">{player.name}</p>
                    <p className="player-price">${player.price.toFixed(2)}M</p>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => onRemovePlayer(position)}
                    title="Remove player"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="player-slot empty">
                  <span>Empty</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
