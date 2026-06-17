import React from 'react';
import { ClassicTeams, Conference } from '../types';
import './ConferenceSelect.css';

interface ConferenceSelectProps {
  classicTeams: ClassicTeams;
  onSelect: (conference: Conference) => void;
}

const ROUND_KEYS = ['r1', 'r2', 'finals'];
const ROUND_LABELS = ['Round 1', 'Round 2', 'Finals'];

const CONFERENCES: { conference: Conference; prefix: string }[] = [
  { conference: 'West', prefix: 'west' },
  { conference: 'East', prefix: 'east' },
];

export const ConferenceSelect: React.FC<ConferenceSelectProps> = ({ classicTeams, onSelect }) => {
  return (
    <div className="conference-select">
      <h1 className="conference-title">Choose Your Path</h1>
      <p className="conference-subtitle">Pick a conference gauntlet and survive three rounds of NBA legends</p>

      <div className="conference-cards">
        {CONFERENCES.map(({ conference, prefix }) => (
          <button
            key={conference}
            className={`conference-card conference-card--${conference.toLowerCase()}`}
            onClick={() => onSelect(conference)}
          >
            <h2 className="conference-card-title">{conference}</h2>
            <div className="conference-opponents">
              {ROUND_KEYS.map((roundKey, idx) => {
                const team = classicTeams[`${prefix}_${roundKey}`];
                return (
                  <div key={roundKey} className="conference-opponent">
                    <span className="conference-opponent-round">{ROUND_LABELS[idx]}</span>
                    <span className="conference-opponent-name">{team?.name ?? 'TBD'}</span>
                  </div>
                );
              })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
