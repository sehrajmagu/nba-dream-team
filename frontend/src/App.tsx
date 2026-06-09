import React, { useState } from 'react';
import { ClassicTeams, GameSimulationResponse, Player, Position, SeriesResult, SeriesSummary } from './types';
import { PlayerSelection } from './components/PlayerSelection';
import { SelectedTeamSlots } from './components/SelectedTeamSlots';
import { BudgetTracker } from './components/BudgetTracker';
import { DreamCourt } from './components/DreamCourt';
import { PlayByPlayLog } from './components/PlayByPlayLog';
import { AIAssistant } from './components/AIAssistant';
import playersData from './data/players.json';
import classicTeamsData from './data/classics.json';
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
  const [classicTeams] = useState<ClassicTeams>(classicTeamsData);
  const [selectedTeam, setSelectedTeam] = useState<TeamRoster>(EMPTY_ROSTER);
  const [selectedOpponent, setSelectedOpponent] = useState<Player[]>([]);
  const [selectedOpponentTeamKey, setSelectedOpponentTeamKey] = useState<string | null>(null);
  const [seriesResults, setSeriesResults] = useState<SeriesResult[]>([]);
  const [seriesSummary, setSeriesSummary] = useState<SeriesSummary | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [userWins, setUserWins] = useState(0);
  const [opponentWins, setOpponentWins] = useState(0);
  const [currentGame, setCurrentGame] = useState(1);

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

  const handleSelectOpponentTeam = (teamKey: string) => {
    const team = classicTeams[teamKey];
    if (!team) return;

    const opponentPlayers: Player[] = team.players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team_name: team.name,
      team_abbreviation: p.team,
      price: 0,
      pie: p.pie,
      ts_pct: p.ts_pct,
      usg_pct: p.usg_pct,
      def_rating: p.def_rating,
    }));

    setSelectedOpponentTeamKey(teamKey);
    setSelectedOpponent(opponentPlayers);

    // Switching opponents starts a fresh series
    setSeriesResults([]);
    setSeriesSummary(null);
    setUserWins(0);
    setOpponentWins(0);
    setCurrentGame(1);
    setShowResults(false);
  };

  const buildBoxScore = (roster: Player[], possessionLog: GameSimulationResponse['possession_log'], team: 'A' | 'B') => {
    const boxScore: Record<string, number> = {};
    roster.forEach(p => { boxScore[p.name] = 0; });

    for (const play of possessionLog) {
      if (play.team === team && play.ball_handler in boxScore) {
        boxScore[play.ball_handler] += play.points_scored;
      }
    }

    return boxScore;
  };

  const handlePlayGame = async () => {
    if (selectedTeamArray.length !== 5 || selectedOpponent.length !== 5 || seriesSummary) return;

    setIsSimulating(true);

    try {
      const response = await fetch('http://localhost:5000/api/simulate/game', {
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

      const data: GameSimulationResponse = await response.json();

      const gameResult: SeriesResult = {
        game: currentGame,
        result: data.winner === 'user' ? 'WIN' : 'LOSS',
        score: `${data.score_a} - ${data.score_b}`,
        userBoxScore: buildBoxScore(selectedTeamArray, data.possession_log, 'A'),
        opponentBoxScore: buildBoxScore(selectedOpponent, data.possession_log, 'B'),
      };

      const nextUserWins = userWins + (data.winner === 'user' ? 1 : 0);
      const nextOpponentWins = opponentWins + (data.winner === 'opponent' ? 1 : 0);

      setSeriesResults(prev => [...prev, gameResult]);
      setUserWins(nextUserWins);
      setOpponentWins(nextOpponentWins);
      setShowResults(true);

      if (nextUserWins === 4 || nextOpponentWins === 4) {
        setSeriesSummary({
          seriesWinner: nextUserWins === 4 ? 'You' : 'Opponent',
          userWins: nextUserWins,
          opponentWins: nextOpponentWins,
        });
      } else {
        setCurrentGame(prev => prev + 1);
      }
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
            classicTeams={classicTeams}
            selectedOpponentTeamKey={selectedOpponentTeamKey}
            onSelectOpponentTeam={handleSelectOpponentTeam}
            onPlayGame={handlePlayGame}
            isSimulating={isSimulating}
            currentGame={currentGame}
            gamesPlayed={seriesResults.length}
            userWins={userWins}
            opponentWins={opponentWins}
            seriesOver={seriesSummary !== null}
          />
          {seriesResults.length > 0 && (
            <PlayByPlayLog results={seriesResults} summary={seriesSummary} />
          )}
        </main>

                <aside className="sidebar-right">
                  <AIAssistant remainingBudget={30 - selectedTeamArray.reduce((sum, p) => sum + p.price, 0)} />
                </aside>
              </div>
            </div>
          );
        }

export default App;
