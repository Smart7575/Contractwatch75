import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getDaysRemaining } from '../../lib/dateUtils';
import { FileText, ShieldAlert, Wallet } from 'lucide-react';

export const KPIBar: React.FC = () => {
  const { contracts, user, setFilters, filters } = useApp();

  const activeContracts = contracts.filter((c) => c.status === 'active');
  const totalAnnualCost = activeContracts.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const totalMonthlyCost = totalAnnualCost / 12;

  // Action required: active contracts where cancellation deadline is within the next 30 days (0 <= days <= 30).
  // Overdue contracts (days < 0) are excluded because it is already too late for notice action.
  const actionRequiredContracts = activeContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days >= 0 && days <= 30;
  });

  const overdueContracts = activeContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days < 0;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-5">
      {/* KPI 1: Active Contracts */}
      <button
        onClick={() => setFilters({ status: 'active', urgency: 'all' })}
        className={`p-3 sm:p-4 rounded-xl text-left border transition-all cursor-pointer ${
          filters.status === 'active' && filters.urgency === 'all'
            ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">Active Contracts</span>
          <FileText className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
          {activeContracts.length}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
          Across {new Set(activeContracts.map((c) => c.categoryId)).size} categories
        </div>
      </button>

      {/* KPI 2: Total Annual Spend */}
      <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">Annual Fixed Spend</span>
          <Wallet className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
          {formatCurrency(totalAnnualCost, user.settings.currency)}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-mono tabular-nums">
          ~{formatCurrency(totalMonthlyCost, user.settings.currency)} / month
        </div>
      </div>

      {/* KPI 3: Action Required Now (0 <= days <= 30, strictly not overdue) */}
      <button
        onClick={() => setFilters({ urgency: 'next_30', status: 'active' })}
        className={`p-3 sm:p-4 rounded-xl text-left border transition-all cursor-pointer ${
          filters.urgency === 'next_30'
            ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
          <span className="text-xs font-medium">Action Required (≤30d)</span>
          <ShieldAlert className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {actionRequiredContracts.length}
          </span>
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            needs notice
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
          {overdueContracts.length > 0 ? (
            <span className="text-rose-500 dark:text-rose-400 font-medium">
              {overdueContracts.length} overdue (see Overdue filter)
            </span>
          ) : (
            'Click to filter immediate deadlines'
          )}
        </div>
      </button>
    </div>
  );
};
