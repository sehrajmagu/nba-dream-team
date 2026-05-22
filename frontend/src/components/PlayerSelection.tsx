import React, { useState, useMemo } from 'react';
import { Player, Position } from '../types';
import { useTeamBudget } from '../hooks/useTeamBudget';
import './PlayerSelection.css';

interface PlayerSelectionProps {
  allPlayers: Player[];
  selectedTeam: Player[];
  onAddPlayer: (player: Player, position: Position) => void;
}

const POSITION_MAPPING: Record<string, Position> = {
  'G': 'PG',
  'G-F': 'SG',
  'F': 'SF',
  'F-C': 'PF',
  'C': 'C',
  'C-F': 'C',
  'PG': 'PG',
  'SG': 'SG',
  'SF': 'SF',
  'PF': 'PF',
};

export const PlayerSelection: React.FC<PlayerSelectionProps> = ({
  allPlayers,
  selectedTeam,
  onAddPlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { canAddPlayer } = useTeamBudget(selectedTeam);

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team_abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allPlayers, searchTerm]);

  const isPlayerSelected = (playerId: number): boolean => {
    return selectedTeam.some(p => p.id === playerId);
  };

  const getMappedPosition = (playerPosition: string): Position => {
    return POSITION_MAPPING[playerPosition] || 'SF';
  };

  return (
    <div className="player-selection">
      <h2>Draft Players</h2>
      <input
        type="text"
        placeholder="Search by name or team..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-bar"
      />
      <div className="results-info">
        {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} found
      </div>
      <div className="player-list">
        {filteredPlayers.map(player => {
          const isSelected = isPlayerSelected(player.id);
          const canAdd = canAddPlayer(player);
          const position = getMappedPosition(player.position);
          const isDisabled = isSelected || !canAdd;

          return (
            <div
              key={player.id}
              className={`player-card ${isDisabled ? 'disabled' : ''}`}
            >
              <img
                src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                alt={player.name}
                className="player-headshot"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/50x65?text=' + player.name.substring(0, 1);
                }}
              />
              <div className="player-card-info">
                <h4>{player.name}</h4>
                <p className="team">{player.team_abbreviation}</p>
                <p className="position">{position}</p>
              </div>
              <div className="player-card-stats">
                <div className="stat">
                  <span className="label">$</span>
                  <span className="value">{player.price.toFixed(2)}M</span>
                </div>
                <div className="stat">
                  <span className="label">PIE</span>
                  <span className="value">{(player.pie * 100).toFixed(1)}%</span>
                </div>
              </div>
              <button
                className="select-btn"
                onClick={() => onAddPlayer(player, position)}
                disabled={isDisabled}
                title={
                  isSelected
                    ? 'Already selected'
                    : !canAdd
                    ? 'Budget exceeded'
                    : 'Add to team'
                }
              >
                {isSelected ? '✓' : '+'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
