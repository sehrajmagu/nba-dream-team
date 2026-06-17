import React from 'react';
import { DraftSlot, Player, Position } from '../types';
import { PlayerCard } from './PlayerCard';
import './DraftModal.css';

export interface DraftModalData {
  slot: DraftSlot;
  tier: 'A' | 'B' | 'C';
  candidates: Player[];
}

interface DraftModalProps {
  data: DraftModalData;
  onSelect: (player: Player) => void;
}

const POSITION_LABELS: Record<Position, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center',
};

const slotLabel = (slot: DraftSlot): string => {
  if (slot in POSITION_LABELS) return POSITION_LABELS[slot as Position];
  return `Bench Slot ${slot.slice(1)}`;
};

export const DraftModal: React.FC<DraftModalProps> = ({ data, onSelect }) => {
  return (
    <div className="draft-modal-overlay">
      <div className="draft-modal">
        <div className="draft-modal-header">
          <h2>Draft Pick — {slotLabel(data.slot)}</h2>
          <span className={`draft-modal-tier tier-${data.tier.toLowerCase()}`}>Tier {data.tier}</span>
        </div>
        <p className="draft-modal-subtitle">Choose your player</p>
        <div className="draft-modal-cards">
          {data.candidates.map(player => (
            <PlayerCard key={player.id} player={player} onClick={() => onSelect(player)} />
          ))}
        </div>
      </div>
    </div>
  );
};
