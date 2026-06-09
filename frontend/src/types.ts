export interface Player {
  id: number;
  name: string;
  position: string;
  team_name: string;
  team_abbreviation: string;
  price: number;
  pie: number;
  ts_pct: number;
  usg_pct: number;
  def_rating: number;
  slot?: Position;
}

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface TeamSlot {
  position: Position;
  player: Player | null;
}

export interface SeriesResult {
  game: number;
  result: string;
  score: string;
  userBoxScore: Record<string, number>;
  opponentBoxScore: Record<string, number>;
}

export interface SeriesSummary {
  seriesWinner: string;
  userWins: number;
  opponentWins: number;
}

export interface PossessionLogEntry {
  team: 'A' | 'B';
  ball_handler: string;
  points_scored: number;
  [key: string]: unknown;
}

export interface GameSimulationResponse {
  score_a: number;
  score_b: number;
  winner: 'user' | 'opponent';
  possession_log: PossessionLogEntry[];
}

export interface ClassicPlayer {
  id: number;
  name: string;
  position: string;
  team: string;
  pie: number;
  ts_pct: number;
  usg_pct: number;
  def_rating: number;
}

export interface ClassicTeam {
  name: string;
  conference: string;
  players: ClassicPlayer[];
}

export type ClassicTeams = Record<string, ClassicTeam>;

export interface SimulationState {
  isRunning: boolean;
  results: SeriesResult[];
  selectedOpponent: Player[] | null;
}
