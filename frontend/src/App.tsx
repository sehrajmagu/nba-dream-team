import { useRef, useState } from 'react';
import {
  ClassicTeams,
  Conference,
  DraftedRoster,
  DraftSlot,
  GameResult,
  GameSimulationResponse,
  Player,
  PossessionLogEntry,
} from './types';
import { ConferenceSelect } from './components/ConferenceSelect';
import { DraftBoard } from './components/DraftBoard';
import { DraftModalData } from './components/DraftModal';
import { StartingFiveSelect } from './components/StartingFiveSelect';
import { GameView } from './components/GameView';
import { GauntletEnd } from './components/GauntletEnd';
import { AIAssistant } from './components/AIAssistant';
import playersData from './data/players.json';
import classicTeamsData from './data/classics.json';
import './styles/theme.css';
import './App.css';

type Screen = 'conference' | 'draft' | 'starting5' | 'game' | 'champion';

const EMPTY_ROSTER: DraftedRoster = {
  PG: null,
  SG: null,
  SF: null,
  PF: null,
  C: null,
  B1: null,
  B2: null,
  B3: null,
  B4: null,
  B5: null,
};

const SLOT_POSITION_FILTER: Record<DraftSlot, 'G' | 'F' | 'C' | null> = {
  PG: 'G',
  SG: 'G',
  SF: 'F',
  PF: 'F',
  C: 'C',
  B1: null,
  B2: null,
  B3: null,
  B4: null,
  B5: null,
};

const ROUND_KEYS = ['r1', 'r2', 'finals'];

const pickTier = (): 'A' | 'B' | 'C' => {
  const roll = Math.random();
  if (roll < 0.40) return 'B';
  if (roll < 0.75) return 'C';
  return 'A';
};

// Bench slots skew much weaker than starters, so role players don't end up
// nearly as strong as the starting five.
const pickBenchTier = (): 'A' | 'B' | 'C' => {
  const roll = Math.random();
  if (roll < 0.65) return 'A';
  if (roll < 0.90) return 'B';
  return 'C';
};

const BENCH_SLOT_SET = new Set<DraftSlot>(['B1', 'B2', 'B3', 'B4', 'B5']);

const pickRandomPlayers = (pool: Player[], count: number): Player[] => {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

function App() {
  const [allPlayers] = useState<Player[]>(playersData as Player[]);
  const [classicTeams] = useState<ClassicTeams>(classicTeamsData as ClassicTeams);

  const [screen, setScreen] = useState<Screen>('conference');
  const [conference, setConference] = useState<Conference | null>(null);
  const [opponentSequence, setOpponentSequence] = useState<string[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);

  const [roster, setRoster] = useState<DraftedRoster>(EMPTY_ROSTER);
  const [draftModal, setDraftModal] = useState<DraftModalData | null>(null);

  const [starters, setStarters] = useState<Set<number>>(new Set());

  const [userWins, setUserWins] = useState(0);
  const [opponentWins, setOpponentWins] = useState(0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const [isAnimating, setIsAnimating] = useState(false);
  const [livePlays, setLivePlays] = useState<PossessionLogEntry[]>([]);
  const [liveScore, setLiveScore] = useState({ a: 0, b: 0 });
  const animationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const GAME_ANIMATION_DURATION_MS = 30000;

  const stopAnimation = () => {
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    setIsAnimating(false);
  };

  const [draftAdviceUses, setDraftAdviceUses] = useState(2);

  const handleSelectConference = (conf: Conference) => {
    const prefix = conf === 'West' ? 'west' : 'east';
    setConference(conf);
    setOpponentSequence(ROUND_KEYS.map(key => `${prefix}_${key}`));
    setRoundIndex(0);
    setScreen('draft');
  };

  const handleSlotClick = (slot: DraftSlot) => {
    if (roster[slot]) return;

    const tier = BENCH_SLOT_SET.has(slot) ? pickBenchTier() : pickTier();
    const posFilter = SLOT_POSITION_FILTER[slot];
    const draftedIds = new Set(
      Object.values(roster)
        .filter((p): p is Player => p !== null)
        .map(p => p.id)
    );

    const tierPool = allPlayers.filter(
      p => p.tier_class === tier && (posFilter === null || p.tier_positions.includes(posFilter))
    );
    const availablePool = tierPool.filter(p => !draftedIds.has(p.id));
    const pool = availablePool.length >= 5 ? availablePool : tierPool;

    setDraftModal({ slot, tier, candidates: pickRandomPlayers(pool, 5) });
  };

  const handleCardSelect = (player: Player) => {
    if (!draftModal) return;
    setRoster(prev => ({ ...prev, [draftModal.slot]: player }));
    setDraftModal(null);
  };

  const handleProceedToGauntlet = () => {
    setScreen('starting5');
  };

  const handleToggleStarter = (playerId: number) => {
    setStarters(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else if (next.size < 5) {
        next.add(playerId);
      }
      return next;
    });
  };

  const handleConfirmStarters = () => {
    setUserWins(0);
    setOpponentWins(0);
    setLastResult(null);
    setScreen('game');
  };

  const handlePlayGame = async (instant: boolean = false) => {
    const opponentKey = opponentSequence[roundIndex];
    const opponentTeam = classicTeams[opponentKey];
    if (!opponentTeam) return;

    const rosterPlayers = Object.values(roster).filter((p): p is Player => p !== null);
    const startingFive = rosterPlayers.filter(p => starters.has(p.id));
    if (startingFive.length !== 5) return;

    setIsSimulating(true);
    setLastResult(null);
    setLivePlays([]);
    setLiveScore({ a: 0, b: 0 });

    try {
      const response = await fetch('http://localhost:5050/api/simulate/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamIds: startingFive.map(p => p.id),
          opponentIds: opponentTeam.players.map(p => p.id),
        }),
      });

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const data: GameSimulationResponse = await response.json();
      const possessions = data.possession_log;

      const userBoxScore: Record<string, number> = {};
      startingFive.forEach(p => { userBoxScore[p.name] = 0; });

      const opponentBoxScore: Record<string, number> = {};
      opponentTeam.players.forEach(p => { opponentBoxScore[p.name] = 0; });

      if (instant) {
        for (const play of possessions) {
          if (play.team === 'A' && play.ball_handler in userBoxScore) {
            userBoxScore[play.ball_handler] += play.points_scored;
          } else if (play.team === 'B' && play.ball_handler in opponentBoxScore) {
            opponentBoxScore[play.ball_handler] += play.points_scored;
          }
        }

        setIsSimulating(false);
        setLastResult({
          scoreUser: data.score_a,
          scoreOpponent: data.score_b,
          winner: data.winner,
          userBoxScore,
          opponentBoxScore,
        });

        if (data.winner === 'user') {
          setUserWins(prev => prev + 1);
        } else {
          setOpponentWins(prev => prev + 1);
        }
        return;
      }

      setIsSimulating(false);
      setIsAnimating(true);

      const tickMs = Math.max(20, GAME_ANIMATION_DURATION_MS / Math.max(possessions.length, 1));
      let index = 0;

      animationTimerRef.current = setInterval(() => {
        const play = possessions[index];
        index += 1;

        setLiveScore({ a: play.score_a, b: play.score_b });
        setLivePlays(prev => [...prev, play]);

        if (play.team === 'A' && play.ball_handler in userBoxScore) {
          userBoxScore[play.ball_handler] += play.points_scored;
        } else if (play.team === 'B' && play.ball_handler in opponentBoxScore) {
          opponentBoxScore[play.ball_handler] += play.points_scored;
        }

        if (index >= possessions.length) {
          stopAnimation();

          setLastResult({
            scoreUser: data.score_a,
            scoreOpponent: data.score_b,
            winner: data.winner,
            userBoxScore,
            opponentBoxScore,
          });

          if (data.winner === 'user') {
            setUserWins(prev => prev + 1);
          } else {
            setOpponentWins(prev => prev + 1);
          }
        }
      }, tickMs);
    } catch (error) {
      console.error('Error running simulation:', error);
      alert('Failed to run simulation. Make sure the backend is running on http://localhost:5050');
      setIsSimulating(false);
    }
  };

  const handleContinue = () => {
    if (roundIndex < opponentSequence.length - 1) {
      setRoundIndex(prev => prev + 1);
      setUserWins(0);
      setOpponentWins(0);
      setLastResult(null);
      setScreen('starting5');
    } else {
      setScreen('champion');
    }
  };

  const handleRestart = () => {
    stopAnimation();
    setScreen('conference');
    setConference(null);
    setOpponentSequence([]);
    setRoundIndex(0);
    setRoster(EMPTY_ROSTER);
    setDraftModal(null);
    setStarters(new Set());
    setUserWins(0);
    setOpponentWins(0);
    setLastResult(null);
    setDraftAdviceUses(2);
  };

  const currentOpponentTeam = opponentSequence[roundIndex] ? classicTeams[opponentSequence[roundIndex]] : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏀 NBA Gauntlet</h1>
        <p>Draft your legends. Survive three rounds. Become the champion.</p>
      </header>

      <div className="app-container">
        <main className="main-content">
          {screen === 'conference' && (
            <ConferenceSelect classicTeams={classicTeams} onSelect={handleSelectConference} />
          )}

          {screen === 'draft' && (
            <DraftBoard
              roster={roster}
              modalData={draftModal}
              onSlotClick={handleSlotClick}
              onCardSelect={handleCardSelect}
              onProceed={handleProceedToGauntlet}
            />
          )}

          {screen === 'starting5' && currentOpponentTeam && (
            <StartingFiveSelect
              roster={roster}
              starters={starters}
              onToggleStarter={handleToggleStarter}
              opponentTeam={currentOpponentTeam}
              roundIndex={roundIndex}
              onConfirm={handleConfirmStarters}
            />
          )}

          {screen === 'game' && currentOpponentTeam && (
            <GameView
              roundIndex={roundIndex}
              opponentTeam={currentOpponentTeam}
              userWins={userWins}
              opponentWins={opponentWins}
              lastResult={lastResult}
              isSimulating={isSimulating}
              isAnimating={isAnimating}
              livePlays={livePlays}
              liveScore={liveScore}
              isFinalRound={roundIndex === opponentSequence.length - 1}
              onPlayGame={() => handlePlayGame(false)}
              onInstantSim={() => handlePlayGame(true)}
              onContinue={handleContinue}
              onRestart={handleRestart}
            />
          )}

          {screen === 'champion' && conference && (
            <GauntletEnd conference={conference} roster={roster} starters={starters} onRestart={handleRestart} />
          )}
        </main>

        <aside className="sidebar-right">
          <AIAssistant
            isDraftScreen={screen === 'draft'}
            draftModal={draftModal}
            roster={roster}
            draftAdviceUsesRemaining={draftAdviceUses}
            onUseDraftAdvice={() => setDraftAdviceUses(prev => Math.max(0, prev - 1))}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
