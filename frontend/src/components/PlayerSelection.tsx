import React, { useState, useMemo } from 'react';
import { Player, Position } from '../types';
import { useTeamBudget } from '../hooks/useTeamBudget';
import './PlayerSelection.css';

interface PlayerSelectionProps {
  allPlayers: Player[];
  selectedTeam: Player[];
  onAddPlayer: (player: Player, position: Position) => void;
}

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export const PlayerSelection: React.FC<PlayerSelectionProps> = ({
  allPlayers,
  selectedTeam,
  onAddPlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const { canAddPlayer } = useTeamBudget(selectedTeam);

  const filledPositions = new Set(selectedTeam.map(p => p.slot as Position));
  const emptyPositions = POSITIONS.filter(pos => !filledPositions.has(pos));

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team_abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allPlayers, searchTerm]);

  const isPlayerSelected = (playerId: number): boolean => {
    return selectedTeam.some(p => p.id === playerId);
  };

  const handleSelectPlayer = (player: Player) => {
    if (selectedPosition && !isPlayerSelected(player.id) && canAddPlayer(player)) {
      onAddPlayer(player, selectedPosition);
      setSelectedPosition(null);
      setSearchTerm('');
    }
  };

  return (
    <div className="player-selection">
      <h2>Draft Players</h2>

      {selectedPosition ? (
        <div className="player-picker-modal">
          <div className="modal-header">
            <h3>Select {selectedPosition}</h3>
            <button
              className="close-btn"
              onClick={() => setSelectedPosition(null)}
            >
              ✕
            </button>
          </div>

          <input
            type="text"
            placeholder="Search by name or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
            autoFocus
          />
          <div className="results-info">
            {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} found
          </div>

          <div className="player-list">
            {filteredPlayers.map(player => {
              const isSelected = isPlayerSelected(player.id);
              const canAdd = canAddPlayer(player);
              const isDisabled = isSelected || !canAdd;

              return (
                <div
                  key={player.id}
                  className={`player-card ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && handleSelectPlayer(player)}
                >
                  <img
                    src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                    alt={player.name}
                    className="player-headshot"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://via.placeholder.com/50x65?text=' + player.name.substring(0, 1);
                    }}
                  />
                  <div className="player-card-info">
                    <h4>{player.name}</h4>
                    <p className="team">{player.team_abbreviation}</p>
                    <p className="position">{player.position}</p>
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
      ) : (
        <div className="position-selector">
          <p className="helper-text">Click a position to draft a player</p>
          <div className="position-buttons">
            {emptyPositions.map(position => (
              <button
                key={position}
                className="position-btn"
                onClick={() => setSelectedPosition(position)}
              >
                {position}
              </button>
            ))}
          </div>
          {emptyPositions.length === 0 && (
            <p className="full-team">Your team is complete!</p>
          )}
        </div>
      )}
    </div>
  );
};
