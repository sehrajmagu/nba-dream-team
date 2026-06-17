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
  tier_class: 'A' | 'B' | 'C';
  tier_positions: string[];
}

export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export type BenchSlot = 'B1' | 'B2' | 'B3' | 'B4' | 'B5';

export type DraftSlot = Position | BenchSlot;

export type DraftedRoster = Record<DraftSlot, Player | null>;

export type Conference = 'East' | 'West';

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

export interface GameResult {
  scoreUser: number;
  scoreOpponent: number;
  winner: 'user' | 'opponent';
  userBoxScore: Record<string, number>;
  opponentBoxScore: Record<string, number>;
}
