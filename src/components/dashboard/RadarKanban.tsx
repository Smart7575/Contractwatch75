import React from 'react';
import { Contract, UrgencyLevel } from '../../types';
import { ContractCard } from '../contracts/ContractCard';
import { getDaysRemaining, getUrgencyLevel } from '../../lib/dateUtils';
import { AlertTriangle, Clock, CalendarDays, CheckCircle2 } from 'lucide-react';

interface RadarKanbanProps {
  contracts: Contract[];
}

export const RadarKanban: React.FC<RadarKanbanProps> = ({ contracts }) => {
  const activeContracts = contracts.filter((c) => c.status === 'active');

  const columns: {
    id: UrgencyLevel;
    title: string;
    description: string;
    icon: React.ElementType;
    colorClasses: string;
    borderClasses: string;
    contracts: Contract[];
  }[] = [
    {
      id: 'overdue',
      title: 'Overdue Notice',
      description: 'Deadline passed, still active',
      icon: AlertTriangle,
      colorClasses: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
      borderClasses: 'border-rose-200 dark:border-rose-900',
      contracts: activeContracts.filter((c) => getUrgencyLevel(c.cancellationDeadline, c.status) === 'overdue'),
    },
    {
      id: 'next_30',
      title: 'Next 30 Days',
      description: 'Immediate action window',
      icon: Clock,
      colorClasses: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
      borderClasses: 'border-amber-200 dark:border-amber-900',
      contracts: activeContracts.filter((c) => getUrgencyLevel(c.cancellationDeadline, c.status) === 'next_30'),
    },
    {
      id: '31_90',
      title: '31–90 Days',
      description: 'Upcoming renewal window',
      icon: CalendarDays,
      colorClasses: 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40',
      borderClasses: 'border-yellow-200 dark:border-yellow-900',
      contracts: activeContracts.filter((c) => getUrgencyLevel(c.cancellationDeadline, c.status) === '31_90'),
    },
    {
      id: 'later',
      title: 'Later (>90 Days)',
      description: 'Safe for now',
      icon: CheckCircle2,
      colorClasses: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
      borderClasses: 'border-emerald-200 dark:border-emerald-900',
      contracts: activeContracts.filter((c) => getUrgencyLevel(c.cancellationDeadline, c.status) === 'later'),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {columns.map((col) => {
        const Icon = col.icon;
        return (
          <div
            key={col.id}
            className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 min-h-[400px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-2 mb-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${col.colorClasses}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {col.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {col.description}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {col.contracts.length}
              </span>
            </div>

            {/* Contracts in column */}
            <div className="space-y-3 flex-1">
              {col.contracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-slate-900/40">
                  <span>No contracts in this window</span>
                </div>
              ) : (
                col.contracts.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
