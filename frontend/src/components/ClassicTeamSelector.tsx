import React from 'react';
import { ClassicTeams } from '../types';
import './ClassicTeamSelector.css';

interface ClassicTeamSelectorProps {
  classicTeams: ClassicTeams;
  selectedTeamKey: string | null;
  onSelectTeam: (teamKey: string) => void;
}

export const ClassicTeamSelector: React.FC<ClassicTeamSelectorProps> = ({
  classicTeams,
  selectedTeamKey,
  onSelectTeam,
}) => {
  const selectedTeam = selectedTeamKey ? classicTeams[selectedTeamKey] : null;

  return (
    <div className="classic-team-selector">
      <h3>Choose Your Opponent</h3>
      <p className="helper-text">Pick a classic NBA team to play against</p>

      <select
        className="classic-team-dropdown"
        value={selectedTeamKey ?? ''}
        onChange={(e) => onSelectTeam(e.target.value)}
      >
        <option value="" disabled>Select a classic team...</option>
        {Object.entries(classicTeams).map(([key, team]) => (
          <option key={key} value={key}>
            {team.name} ({team.conference})
          </option>
        ))}
      </select>

      {selectedTeam && (
        <div className="classic-team-roster">
          <h4>{selectedTeam.name}</h4>
          <div className="classic-roster-list">
            {selectedTeam.players.map(player => (
              <div key={player.id} className="classic-roster-player">
                <span className="classic-player-name">{player.name}</span>
                <span className="classic-player-position">{player.position}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
