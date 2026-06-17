import React from 'react';
import { ClassicTeam, DraftedRoster, DraftSlot, Player } from '../types';
import { PlayerCard } from './PlayerCard';
import './StartingFiveSelect.css';

interface StartingFiveSelectProps {
  roster: DraftedRoster;
  starters: Set<number>;
  onToggleStarter: (playerId: number) => void;
  opponentTeam: ClassicTeam;
  roundIndex: number;
  onConfirm: () => void;
}

const SLOT_ORDER: DraftSlot[] = ['PG', 'SG', 'SF', 'PF', 'C', 'B1', 'B2', 'B3', 'B4', 'B5'];

export const StartingFiveSelect: React.FC<StartingFiveSelectProps> = ({
  roster,
  starters,
  onToggleStarter,
  opponentTeam,
  roundIndex,
  onConfirm,
}) => {
  const entries = SLOT_ORDER
    .map(slot => ({ slot, player: roster[slot] as Player }))
    .filter(entry => entry.player !== null);

  return (
    <div className="starting-five">
      <div className="starting-five-header">
        <h1 className="starting-five-title">Round {roundIndex + 1} — Set Your Starting 5</h1>
        <div className="starting-five-count">{starters.size} / 5 selected</div>
      </div>

      <div className="starting-five-grid">
        {entries.map(({ slot, player }) => (
          <PlayerCard
            key={player.id}
            player={player}
            size="small"
            badge={slot}
            selected={starters.has(player.id)}
            onClick={() => onToggleStarter(player.id)}
          />
        ))}
      </div>

      <div className="starting-five-opponent">
        <h2 className="opponent-title">Upcoming Opponent: {opponentTeam.name}</h2>
        <div className="opponent-roster">
          {opponentTeam.players.map(p => (
            <div key={p.id} className="opponent-player">
              <span className="opponent-player-name">{p.name}</span>
              <span className="opponent-player-position">{p.position}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="confirm-btn" onClick={onConfirm} disabled={starters.size !== 5}>
        Confirm Starting 5
      </button>
    </div>
  );
};
