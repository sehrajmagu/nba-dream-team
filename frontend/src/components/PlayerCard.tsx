import React, { useState } from 'react';
import { Player } from '../types';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  size?: 'normal' | 'small';
  selected?: boolean;
  badge?: string;
  onClick?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, size = 'normal', selected, badge, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const rating = Math.round(player.price * 10);
  const tierClass = `tier-${player.tier_class.toLowerCase()}`;
  const initials = player.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const classNames = [
    'player-card',
    tierClass,
    `player-card--${size}`,
    selected ? 'player-card--selected' : '',
    onClick ? 'player-card--clickable' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} onClick={onClick}>
      {badge && <div className="player-card-badge">{badge}</div>}
      <div className="player-card-top">
        <div className="player-card-rating">{rating}</div>
        <div className="player-card-position">{player.position}</div>
      </div>
      <div className="player-card-photo">
        {imgError ? (
          <div className="player-card-initials">{initials}</div>
        ) : (
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.id}.png`}
            alt={player.name}
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="player-card-info">
        <div className="player-card-name">{player.name}</div>
        <div className="player-card-team">{player.team_name}</div>
      </div>
      <div className="player-card-stats">
        <div className="player-card-stat">
          <span className="stat-value">{(player.pie * 100).toFixed(1)}</span>
          <span className="stat-label">PIE</span>
        </div>
        <div className="player-card-stat">
          <span className="stat-value">{(player.ts_pct * 100).toFixed(1)}</span>
          <span className="stat-label">TS%</span>
        </div>
        <div className="player-card-stat">
          <span className="stat-value">{(player.usg_pct * 100).toFixed(1)}</span>
          <span className="stat-label">USG%</span>
        </div>
      </div>
    </div>
  );
};
