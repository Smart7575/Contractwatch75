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
  AlertTriangle,
  Clock,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ArrowUpDown,
  Key,
} from 'lucide-react';

interface TableViewProps {
  contracts: Contract[];
}

export const TableView: React.FC<TableViewProps> = ({ contracts }) => {
  const { setSelectedContractId, categories, user, filters, setFilters } = useApp();

  const handleSort = (field: 'deadline' | 'annualCost' | 'name' | 'supplier') => {
    if (filters.sortBy === field) {
      setFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      setFilters({ sortBy: field, sortOrder: 'asc' });
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold">
            <th
              className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1.5">
                <span>Contract & Supplier</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th className="py-3 px-3">Category</th>
            <th
              className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              onClick={() => handleSort('deadline')}
            >
              <div className="flex items-center gap-1.5">
                <span>Notice Deadline</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th className="py-3 px-3">Urgency</th>
            <th
              className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              onClick={() => handleSort('annualCost')}
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>Annual Spend</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </div>
            </th>
            <th className="py-3 px-3 text-center">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {contracts.map((contract) => {
            const category = categories.find((c) => c.id === contract.categoryId);
            const days = getDaysRemaining(contract.cancellationDeadline);
            const urgency = getUrgencyLevel(contract.cancellationDeadline, contract.status);
            const urgencyMeta = getUrgencyMetadata(urgency, days);

            const UrgencyIcon =
              urgency === 'overdue'
                ? AlertTriangle
                : urgency === 'next_30'
                ? Clock
                : urgency === '31_90'
                ? CalendarDays
                : CheckCircle2;

            return (
              <tr
                key={contract.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                onClick={() => setSelectedContractId(contract.id)}
              >
                {/* Contract Name & Supplier */}
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1.5">
                    <span className="truncate">{contract.name}</span>
                    {contract.credentials && (contract.credentials.url || contract.credentials.username || contract.credentials.password) && (
                      <span title="Inloggegevens geregistreerd" className="shrink-0 inline-flex items-center text-amber-500">
                        <Key className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {contract.supplier}
                    {contract.contractNumber && ` · #${contract.contractNumber}`}
                  </div>
                </td>

                {/* Category */}
                <td className="py-3 px-3">
                  <span className="text-slate-700 dark:text-slate-300">
                    {category?.name || 'General'}
                  </span>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span>{contract.subcategory}</span>
                    {contract.coverageType && (
                      <>
                        <span>·</span>
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                          contract.coverageType === 'family'
                            ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50'
                            : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                        }`}>
                          {contract.coverageType === 'family' ? 'Family' : 'Individual'}
                        </span>
                      </>
                    )}
                  </div>
                </td>

                {/* Notice Deadline */}
                <td className="py-3 px-4 font-mono tabular-nums">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(contract.cancellationDeadline)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    End: {formatDate(contract.endDate)}
                  </div>
                </td>

                {/* Urgency */}
                <td className="py-3 px-3">
                  <div className="inline-flex items-center gap-1.5">
                    <UrgencyIcon className={`w-3.5 h-3.5 ${urgencyMeta.textClass}`} />
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${urgencyMeta.colorClass}`}
                    >
                      {urgencyMeta.badgeText}
                    </span>
                  </div>
                </td>

                {/* Annual Spend */}
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(contract.annualCost, user.settings.currency)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {formatCurrency(contract.monthlyCost, user.settings.currency)}/mo
                  </div>
                </td>

                {/* Status */}
                <td className="py-3 px-3 text-center">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                      contract.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : contract.status === 'cancelled'
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400'
                    }`}
                  >
                    {contract.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedContractId(contract.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                  >
                    <span>Dossier</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
