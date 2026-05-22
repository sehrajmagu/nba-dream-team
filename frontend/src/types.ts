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
  playByPlay: string[];
}

export interface SimulationState {
  isRunning: boolean;
  results: SeriesResult[];
  selectedOpponent: string | null;
}
