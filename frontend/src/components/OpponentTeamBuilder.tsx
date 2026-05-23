import React, { useState, useMemo } from 'react';
import { Player } from '../types';
import './PlayerSelection.css';

interface OpponentTeamBuilderProps {
  allPlayers: Player[];
  selectedOpponent: Player[];
  onOpponentChange: (opponent: Player[]) => void;
}

export const OpponentTeamBuilder: React.FC<OpponentTeamBuilderProps> = ({
  allPlayers,
  selectedOpponent,
  onOpponentChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team_abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allPlayers, searchTerm]);

  const isPlayerSelected = (playerId: number): boolean => {
    return selectedOpponent.some(p => p.id === playerId);
  };

  const canAddMore = selectedOpponent.length < 5;

  const handleAddPlayer = (player: Player) => {
    if (!isPlayerSelected(player.id) && canAddMore) {
      onOpponentChange([...selectedOpponent, player]);
    }
  };

  const handleRemovePlayer = (playerId: number) => {
    onOpponentChange(selectedOpponent.filter(p => p.id !== playerId));
  };

  return (
    <div className="opponent-team-builder">
      <div className="builder-section">
        <h3>Build Opponent Team</h3>
        <p className="helper-text">
          Select {selectedOpponent.length}/5 players
        </p>

        <div className="selected-opponents">
          {selectedOpponent.map(player => (
            <div key={player.id} className="opponent-card">
              <img
                src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
                alt={player.name}
                className="player-headshot"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://via.placeholder.com/50x65?text=' +
                    player.name.substring(0, 1);
                }}
              />
              <div className="opponent-card-info">
                <h4>{player.name}</h4>
                <p>{player.position}</p>
                <p>${player.price.toFixed(2)}M</p>
              </div>
              <button
                className="remove-btn"
                onClick={() => handleRemovePlayer(player.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="search-section">
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
          <div className="results-info">
            {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} found
          </div>
        </div>

        <div className="player-list">
          {filteredPlayers.map(player => {
            const isSelected = isPlayerSelected(player.id);
            const isDisabled = isSelected || !canAddMore;

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
                    (e.target as HTMLImageElement).src =
                      'https://via.placeholder.com/50x65?text=' +
                      player.name.substring(0, 1);
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
                  onClick={() => handleAddPlayer(player)}
                  disabled={isDisabled}
                  title={
                    isSelected
                      ? 'Already selected'
                      : !canAddMore
                      ? 'Team full'
                      : 'Add to opponent'
                  }
                >
                  {isSelected ? '✓' : '+'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
