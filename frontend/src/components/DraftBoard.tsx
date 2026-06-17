import React from 'react';
import { BenchSlot, DraftedRoster, DraftSlot, Position } from '../types';
import { Headshot } from './Headshot';
import { DraftModal, DraftModalData } from './DraftModal';
import './DraftBoard.css';

interface DraftBoardProps {
  roster: DraftedRoster;
  modalData: DraftModalData | null;
  onSlotClick: (slot: DraftSlot) => void;
  onCardSelect: (player: import('../types').Player) => void;
  onProceed: () => void;
}

const STARTING_POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];
const BENCH_SLOTS: BenchSlot[] = ['B1', 'B2', 'B3', 'B4', 'B5'];

const POSITION_COORDS: Record<Position, { x: number; y: number }> = {
  C: { x: 50, y: 16 },
  PF: { x: 26, y: 28 },
  SF: { x: 74, y: 28 },
  SG: { x: 20, y: 58 },
  PG: { x: 50, y: 80 },
};

export const DraftBoard: React.FC<DraftBoardProps> = ({ roster, modalData, onSlotClick, onCardSelect, onProceed }) => {
  const filledCount = Object.values(roster).filter(p => p !== null).length;
  const isComplete = filledCount === 10;

  return (
    <div className="draft-board">
      <div className="draft-header">
        <h1 className="draft-title">Draft Your Roster</h1>
        <div className="draft-progress">{filledCount} / 10 Drafted</div>
      </div>

      <div className="draft-court">
        <svg className="draft-court-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect x="2" y="2" width="96" height="96" fill="var(--nba-gray)" stroke="var(--nba-light)" strokeWidth="0.5" />
          <circle cx="50" cy="62" r="10" fill="none" stroke="var(--nba-light)" strokeWidth="0.4" opacity="0.5" />
          <rect x="33" y="2" width="34" height="28" fill="none" stroke="var(--nba-light)" strokeWidth="0.4" opacity="0.5" />
          <path d="M 12 2 L 12 36 Q 12 46 22 46 L 78 46 Q 88 46 88 36 L 88 2" fill="none" stroke="var(--nba-light)" strokeWidth="0.4" opacity="0.5" />
          <circle cx="50" cy="6" r="1.4" fill="none" stroke="var(--arc-cyan)" strokeWidth="0.4" />
        </svg>

        {STARTING_POSITIONS.map(pos => {
          const player = roster[pos];
          const coords = POSITION_COORDS[pos];
          return (
            <button
              key={pos}
              className={`draft-slot draft-slot--position ${player ? 'draft-slot--filled' : 'draft-slot--empty'}`}
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              onClick={() => onSlotClick(pos)}
              disabled={!!player}
            >
              {player ? (
                <>
                  <Headshot id={player.id} name={player.name} className="draft-slot-headshot" />
                  <span className="draft-slot-name">{player.name.split(' ').slice(-1)[0]}</span>
                </>
              ) : (
                <span className="draft-slot-label">{pos}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="draft-bench">
        <h3 className="draft-bench-title">Bench</h3>
        <div className="draft-bench-row">
          {BENCH_SLOTS.map(slot => {
            const player = roster[slot];
            return (
              <button
                key={slot}
                className={`draft-slot draft-slot--bench ${player ? 'draft-slot--filled' : 'draft-slot--empty'}`}
                onClick={() => onSlotClick(slot)}
                disabled={!!player}
              >
                {player ? (
                  <>
                    <Headshot id={player.id} name={player.name} className="draft-slot-headshot" />
                    <span className="draft-slot-name">{player.name.split(' ').slice(-1)[0]}</span>
                  </>
                ) : (
                  <span className="draft-slot-label">{slot}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isComplete && (
        <button className="proceed-btn" onClick={onProceed}>
          Proceed to Gauntlet
        </button>
      )}

      {modalData && <DraftModal data={modalData} onSelect={onCardSelect} />}
    </div>
  );
};
