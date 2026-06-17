import React from 'react';
import { Conference, DraftedRoster, DraftSlot, Player } from '../types';
import { PlayerCard } from './PlayerCard';
import './GauntletEnd.css';

interface GauntletEndProps {
  conference: Conference;
  roster: DraftedRoster;
  starters: Set<number>;
  onRestart: () => void;
}

const SLOT_ORDER: DraftSlot[] = ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5'];

export const GauntletEnd: React.FC<GauntletEndProps> = ({ conference, roster, starters, onRestart }) => {
  const startingFive = SLOT_ORDER
    .map(slot => roster[slot] as Player)
    .filter(player => player !== null && starters.has(player.id));

  return (
    <div className="gauntlet-end">
      <h1 className="gauntlet-end-title">Gauntlet Champion</h1>
      <p className="gauntlet-end-subtitle">You conquered the {conference} Gauntlet</p>

      <div className="gauntlet-end-roster">
        {startingFive.map(player => (
          <PlayerCard key={player.id} player={player} size="small" />
        ))}
      </div>

      <button className="play-again-btn" onClick={onRestart}>Play Again</button>
    </div>
  );
};
