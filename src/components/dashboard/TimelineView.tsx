import React from 'react';
import { Contract } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  formatCurrency,
  formatDate,
  getDaysRemaining,
  getUrgencyLevel,
  getUrgencyMetadata,
} from '../../lib/dateUtils';
import {
  Calendar,
  ChevronRight,
  ExternalLink,
  Clock,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';

interface TimelineViewProps {
  contracts: Contract[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ contracts }) => {
  const { setSelectedContractId, user, categories } = useApp();

  // Sort chronologically by cancellation deadline
  const sorted = [...contracts].sort((a, b) =>
    a.cancellationDeadline.localeCompare(b.cancellationDeadline)
  );

  // Group by Year-Month (e.g. "October 2026", "November 2026")
  const groups: { [key: string]: Contract[] } = {};
  for (const c of sorted) {
    if (!c.cancellationDeadline) continue;
    const [y, m] = c.cancellationDeadline.split('-');
    const monthDate = new Date(Number(y), Number(m) - 1, 1);
    const key = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
      monthDate
    );
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([monthGroup, groupContracts]) => (
        <div key={monthGroup} className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>{monthGroup}</span>
            <span className="text-slate-400 dark:text-slate-600 font-normal">
              ({groupContracts.length} deadline{groupContracts.length === 1 ? '' : 's'})
            </span>
          </div>

          <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-3 ml-2">
            {groupContracts.map((contract) => {
              const days = getDaysRemaining(contract.cancellationDeadline);
              const urgency = getUrgencyLevel(contract.cancellationDeadline, contract.status);
              const urgencyMeta = getUrgencyMetadata(urgency, days);
              const category = categories.find((c) => c.id === contract.categoryId);

              const UrgencyIcon =
                urgency === 'overdue'
                  ? AlertTriangle
                  : urgency === 'next_30'
                  ? Clock
                  : urgency === '31_90'
                  ? CalendarDays
                  : CheckCircle2;

              return (
                <div
                  key={contract.id}
                  onClick={() => setSelectedContractId(contract.id)}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer shadow-2xs"
                >
                  {/* Timeline indicator dot */}
                  <span
                    className={`absolute -left-[31px] top-4 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      urgency === 'overdue'
                        ? 'bg-rose-500 ring-2 ring-rose-500/20'
                        : urgency === 'next_30'
                        ? 'bg-amber-500 ring-2 ring-amber-500/20'
                        : urgency === '31_90'
                        ? 'bg-yellow-500'
                        : 'bg-emerald-500'
                    }`}
                  />

                  {/* Left: Info */}
                  <div className="mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {contract.name}
                      </span>
                      <span className="text-[11px] text-slate-400">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {contract.supplier}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{category?.name}</span>
                      <span>·</span>
                      <span>Notice: {contract.noticePeriod.value} {contract.noticePeriod.unit}</span>
                      <span>·</span>
                      <span>Contract ends: {formatDate(contract.endDate)}</span>
                    </div>
                  </div>

                  {/* Right: Date, Urgency, Spend */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                        {formatDate(contract.cancellationDeadline)}
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <UrgencyIcon className={`w-3 h-3 ${urgencyMeta.textClass}`} />
                        <span className={`text-[11px] font-semibold ${urgencyMeta.textClass}`}>
                          {urgencyMeta.badgeText}
                        </span>
                      </div>
                    </div>

                    <div className="border-l border-slate-200 dark:border-slate-800 pl-3 hidden sm:block font-mono tabular-nums">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatCurrency(contract.annualCost, user.settings.currency)}
                      </div>
                      <div className="text-[10px] text-slate-400">/year</div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
