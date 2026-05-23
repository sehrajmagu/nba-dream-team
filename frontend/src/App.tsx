import React, { useState } from 'react';
import { Player, Position, SeriesResult, SeriesSummary } from './types';
import { PlayerSelection } from './components/PlayerSelection';
import { SelectedTeamSlots } from './components/SelectedTeamSlots';
import { BudgetTracker } from './components/BudgetTracker';
import { DreamCourt } from './components/DreamCourt';
import { PlayByPlayLog } from './components/PlayByPlayLog';
import { AIAssistant } from './components/AIAssistant';
import playersData from './data/players.json';
import './styles/theme.css';
import './App.css';

type TeamRoster = Record<Position, Player | null>;

const EMPTY_ROSTER: TeamRoster = {
  PG: null,
  SG: null,
  SF: null,
  PF: null,
  C: null,
};

function App() {
  const [allPlayers] = useState<Player[]>(playersData);
  const [selectedTeam, setSelectedTeam] = useState<TeamRoster>(EMPTY_ROSTER);
  const [selectedOpponent, setSelectedOpponent] = useState<Player[]>([]);
  const [seriesResults, setSeriesResults] = useState<SeriesResult[]>([]);
  const [seriesSummary, setSeriesSummary] = useState<SeriesSummary | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const selectedTeamArray = Object.values(selectedTeam).filter((p): p is Player => p !== null);

  const handleAddPlayer = (player: Player, position: Position) => {
    const isAlreadySelected = Object.values(selectedTeam).some(p => p?.id === player.id);
    if (isAlreadySelected) return;

    setSelectedTeam(prev => ({
      ...prev,
      [position]: player,
    }));
  };

  const handleRemovePlayer = (position: Position) => {
    setSelectedTeam(prev => ({
      ...prev,
      [position]: null,
    }));
  };

  const handleSimulate = async () => {
    if (selectedTeamArray.length !== 5 || selectedOpponent.length !== 5) return;

    setIsSimulating(true);

    try {
      const response = await fetch('http://localhost:5000/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamIds: selectedTeamArray.map(p => p.id),
          opponentIds: selectedOpponent.map(p => p.id),
        }),
      });

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const data = await response.json();
      setSeriesResults(data.series);
      setSeriesSummary({
        seriesWinner: data.seriesWinner,
        userWins: data.userWins,
        opponentWins: data.opponentWins,
      });
      setShowResults(true);
    } catch (error) {
      console.error('Error running simulation:', error);
      alert('Failed to run simulation. Make sure the backend is running on http://localhost:5000');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏀 NBA Dream Team Sandbox</h1>
        <p>Draft your ultimate NBA team and simulate playoffs</p>
      </header>

      <div className="app-container">
        <aside className="sidebar-left">
          <BudgetTracker selectedTeam={selectedTeamArray} />
          <SelectedTeamSlots
            selectedTeam={selectedTeam}
            onRemovePlayer={handleRemovePlayer}
          />
          <PlayerSelection
            allPlayers={allPlayers}
            selectedTeam={selectedTeamArray}
            onAddPlayer={handleAddPlayer}
          />
        </aside>

        <main className="main-content">
          <DreamCourt
            allPlayers={allPlayers}
            selectedTeam={selectedTeamArray}
            selectedOpponent={selectedOpponent}
            onOpponentChange={setSelectedOpponent}
            onSimulate={handleSimulate}
            isSimulating={isSimulating}
          />
          {seriesResults.length > 0 && (
            <PlayByPlayLog results={seriesResults} summary={seriesSummary} />
          )}
        </main>

                <aside className="sidebar-right">
                  <AIAssistant />
                </aside>
              </div>
            </div>
          );
        }

export default App;
