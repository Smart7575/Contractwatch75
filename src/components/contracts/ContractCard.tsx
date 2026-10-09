import React, { useState } from 'react';
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
  MoreVertical,
  Check,
  BellOff,
  Copy,
  Trash2,
  FileText,
  Bookmark,
  ChevronRight,
  Key,
  Users,
  User as UserIcon,
} from 'lucide-react';

interface ContractCardProps {
  contract: Contract;
}

export const ContractCard: React.FC<ContractCardProps> = ({ contract }) => {
  const {
    setSelectedContractId,
    setEditingContract,
    deleteContract,
    duplicateContract,
    markContractStatus,
    snoozeContract,
    toggleFavorite,
    categories,
    user,
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);

  const daysRemaining = getDaysRemaining(contract.cancellationDeadline);
  const urgency = getUrgencyLevel(contract.cancellationDeadline, contract.status);
  const urgencyMeta = getUrgencyMetadata(urgency, daysRemaining);

  const category = categories.find((c) => c.id === contract.categoryId);
  const comparisonUrl =
    contract.comparisonUrl ||
    category?.comparisonUrlDefault ||
    user.settings.comparisonSites[contract.categoryId] ||
    `https://www.google.com/search?q=compare+${encodeURIComponent(contract.name)}+${encodeURIComponent(contract.subcategory)}`;

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
      className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all border-l-4 ${urgencyMeta.borderClass}`}
    >
      {/* Top Header: Category & Urgency Indicator */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Unboxed metadata: Category · Subcategory */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {category?.name || 'General'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{contract.subcategory}</span>
            {contract.isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">
                  Demo
                </span>
              </>
            )}
            {contract.credentials && (contract.credentials.url || contract.credentials.username || contract.credentials.password) && (
              <>
                <span aria-hidden="true">·</span>
                <span title="Inloggegevens beschikbaar" className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded font-medium border border-amber-200/60 dark:border-amber-800/60">
                  <Key className="w-2.5 h-2.5 text-amber-500" />
                  <span>Inlog</span>
                </span>
              </>
            )}
            {contract.coverageType && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  title={`Dekking: ${contract.coverageType === 'family' ? 'Family (Gezin)' : 'Individual (Individueel)'}`}
                  className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                    contract.coverageType === 'family'
                      ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60'
                      : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {contract.coverageType === 'family' ? (
                    <>
                      <Users className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                      <span>Family</span>
                    </>
                  ) : (
                    <>
                      <UserIcon className="w-2.5 h-2.5 text-slate-500" />
                      <span>Individual</span>
                    </>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Quick 3-dot dropdown menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-6 z-20 w-44 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setSelectedContractId(contract.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Open Dossier</span>
                </button>
                <button
                  onClick={() => {
                    setEditingContract(contract);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={() => {
                    duplicateContract(contract.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={() => {
                    toggleFavorite(contract.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                  <span>{contract.isFavorite ? 'Unstar' : 'Star Favorite'}</span>
                </button>
                <hr className="my-1 border-slate-200 dark:border-slate-700" />
                <button
                  onClick={() => {
                    deleteContract(contract.id);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Contract</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title & Supplier */}
        <h3
          onClick={() => setSelectedContractId(contract.id)}
          className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer line-clamp-1"
          title={contract.name}
        >
          {contract.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          {contract.supplier}
        </p>

        {/* Urgency Status Bar: Icon + Color + Text (Accessible) */}
        <div className="mt-3.5 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UrgencyIcon className={`w-4 h-4 shrink-0 ${urgencyMeta.textClass}`} />
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Cancellation Deadline
              </div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                {formatDate(contract.cancellationDeadline)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${urgencyMeta.colorClass}`}
            >
              {urgencyMeta.badgeText}
            </span>
          </div>
        </div>

        {/* Financial info */}
        <div className="mt-3 flex items-baseline justify-between text-xs border-t border-slate-100 dark:border-slate-800/60 pt-3">
          <span className="text-slate-500 dark:text-slate-400">Annual cost:</span>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatCurrency(contract.annualCost, user.settings.currency)}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1 font-mono tabular-nums">
              ({formatCurrency(contract.monthlyCost, user.settings.currency)}/mo)
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions: Open Dossier, Snooze, Mark Cancelled, Compare */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1 text-xs">
        <button
          onClick={() => setSelectedContractId(contract.id)}
          className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition cursor-pointer"
        >
          <span>Dossier</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1">
          {/* Compare Link */}
          <a
            href={comparisonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Compare rates on external comparison portal"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Snooze button with quick popover */}
          <div className="relative">
            <button
              onClick={() => setIsSnoozeOpen(!isSnoozeOpen)}
              className="p-1.5 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Snooze reminder"
            >
              <BellOff className="w-3.5 h-3.5" />
            </button>

            {isSnoozeOpen && (
              <div className="absolute right-0 bottom-8 z-30 w-36 py-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="px-3 py-1 font-semibold text-slate-400 text-[10px] uppercase">
                  Snooze alert
                </div>
                <button
                  onClick={() => {
                    snoozeContract(contract.id, 1);
                    setIsSnoozeOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  1 Day
                </button>
                <button
                  onClick={() => {
                    snoozeContract(contract.id, 7);
                    setIsSnoozeOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  1 Week
                </button>
                <button
                  onClick={() => {
                    snoozeContract(contract.id, 30);
                    setIsSnoozeOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  1 Month
                </button>
              </div>
            )}
          </div>

          {/* Mark Cancelled / Switched toggle */}
          {contract.status === 'active' ? (
            <button
              onClick={() => markContractStatus(contract.id, 'cancelled')}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition cursor-pointer"
              title="Mark as cancelled"
            >
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Cancel</span>
            </button>
          ) : (
            <span className="text-[11px] uppercase font-bold text-slate-400">
              {contract.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
