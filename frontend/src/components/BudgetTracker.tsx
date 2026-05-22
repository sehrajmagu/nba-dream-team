import React from 'react';
import { useTeamBudget } from '../hooks/useTeamBudget';
import { Player } from '../types';
import './BudgetTracker.css';

interface BudgetTrackerProps {
  selectedTeam: Player[];
}

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({ selectedTeam }) => {
  const { totalSpent, remaining, SALARY_CAP } = useTeamBudget(selectedTeam);
  const spentPercentage = (totalSpent / SALARY_CAP) * 100;
  const isOverBudget = totalSpent > SALARY_CAP;

  return (
    <div className="budget-tracker">
      <h3>Salary Cap</h3>
      <div className={`budget-bar ${isOverBudget ? 'over-budget' : spentPercentage > 80 ? 'warning' : ''}`}>
        <div className="budget-fill" style={{ width: `${Math.min(spentPercentage, 100)}%` }}></div>
      </div>
      <div className="budget-info">
        <span className="spent">${totalSpent.toFixed(2)}M</span>
        <span className="separator">/</span>
        <span className="cap">${SALARY_CAP}M</span>
      </div>
      {remaining < 0 && <div className="over-warning">Over budget by ${Math.abs(remaining).toFixed(2)}M</div>}
    </div>
  );
};
