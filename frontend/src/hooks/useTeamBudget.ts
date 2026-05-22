import { useCallback } from 'react';
import { Player } from '../types';

const SALARY_CAP = 25;

export const useTeamBudget = (selectedTeam: Player[]) => {
  const totalSpent = selectedTeam.reduce((sum, player) => sum + player.price, 0);
  const remaining = SALARY_CAP - totalSpent;

  const canAddPlayer = useCallback((player: Player): boolean => {
    const isAlreadySelected = selectedTeam.some(p => p.id === player.id);
    if (isAlreadySelected) return false;
    return remaining >= player.price;
  }, [selectedTeam, remaining]);

  const isTeamFull = selectedTeam.length === 5;

  return {
    totalSpent: Number(totalSpent.toFixed(2)),
    remaining: Number(remaining.toFixed(2)),
    canAddPlayer,
    isTeamFull,
    SALARY_CAP,
  };
};
