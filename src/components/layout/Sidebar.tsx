import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Zap,
  Wifi,
  ShieldCheck,
  Home,
  Car,
  CreditCard,
  Landmark,
  Layers,
  Calendar,
  AlertTriangle,
  Clock,
  CalendarDays,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  LogIn,
  SlidersHorizontal,
  FileSpreadsheet,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../../lib/dateUtils';

const iconMap: Record<string, React.ElementType> = {
  Zap,
  Wifi,
  ShieldCheck,
  Home,
  Car,
  CreditCard,
  Landmark,
  Layers,
};

export const Sidebar: React.FC = () => {
  const {
    categories,
    contracts,
    filters,
    setFilters,
    resetFilters,
    user,
    currentPage,
    setCurrentPage,
    logout,
    isFirebaseAuthenticated,
    setIsAuthModalOpen,
    syncWithFirebase,
    isSyncingWithFirebase,
    lastSyncTime,
  } = useApp();

  // Sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('contractwatch_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Notice radar and categories collapsible sections
  const [isRadarOpen, setIsRadarOpen] = useState<boolean>(true);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState<boolean>(true);

  useEffect(() => {
    try {
      localStorage.setItem('contractwatch_sidebar_collapsed', String(isCollapsed));
    } catch {
      // Ignore
    }
  }, [isCollapsed]);

  // Helper to apply filter and return to dashboard if currently on settings
  const applyFilter = (newFilters: Parameters<typeof setFilters>[0]) => {
    setCurrentPage('dashboard');
    setFilters(newFilters);
  };

  // Group stats
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const overdueCount = activeContracts.filter((c) => {
    const diff = Math.round(
      (new Date(c.cancellationDeadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diff < 0;
  }).length;

  const next30Count = activeContracts.filter((c) => {
    const diff = Math.round(
      (new Date(c.cancellationDeadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diff >= 0 && diff <= 30;
  }).length;

  const in31to90Count = activeContracts.filter((c) => {
    const diff = Math.round(
      (new Date(c.cancellationDeadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diff > 30 && diff <= 90;
  }).length;

  // Categories sorted alphabetically by name with spend > 0
  const sortedCategories = categories
    .map((category) => {
      const categoryContracts = contracts.filter(
        (c) => c.categoryId === category.id && c.status === 'active'
      );
      const totalSpend = categoryContracts.reduce(
        (sum, c) => sum + (c.annualCost || 0),
        0
      );
      return { category, totalSpend, count: categoryContracts.length };
    })
    .filter(({ totalSpend }) => totalSpend > 0)
    .sort((a, b) =>
      a.category.name.localeCompare(b.category.name, undefined, {
        sensitivity: 'base',
      })
    );

  return (
    <aside
      className={`shrink-0 hidden md:flex flex-col h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 select-none overflow-hidden ${
        isCollapsed ? 'w-[68px] px-2 py-2.5' : 'w-64 py-2.5 px-3'
      }`}
    >
      {/* Sidebar Header & Toggle Collapse Button */}
      <div
        className={`flex items-center pb-2 mb-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0 ${
          isCollapsed ? 'justify-center' : 'justify-between px-1'
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Middle content container - compact to fit standard screens without scrolling */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Primary Views Section */}
        <div className="space-y-0.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              setCurrentPage('dashboard');
              setFilters({ urgency: 'all', status: 'active', categoryId: 'all' });
            }}
            title="Radar Overview"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1.5'
            } text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              currentPage === 'dashboard'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              {!isCollapsed && <span>Radar Overview</span>}
            </div>
          </button>

          <button
            onClick={() => setCurrentPage('reports')}
            title="Reports & Portfolio Overview"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1.5'
            } text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              currentPage === 'reports'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              {!isCollapsed && <span>Reports Overview</span>}
            </div>
          </button>
        </div>

        {/* Notice Radar Section */}
        <div>
          {/* Radar Header with Collapsible Arrow / Triangle */}
          <div
            onClick={() => !isCollapsed && setIsRadarOpen(!isRadarOpen)}
            className={`flex items-center justify-between mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none ${
              isCollapsed
                ? 'justify-center cursor-default'
                : 'px-1.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {isCollapsed ? (
              <span className="text-[9px] text-slate-400">RADAR</span>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      !isRadarOpen ? '-rotate-90' : ''
                    }`}
                  />
                  <span>Notice Radar</span>
                </div>
                {(filters.urgency !== 'all' ||
                  filters.categoryId !== 'all' ||
                  filters.status !== 'active') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFilters();
                    }}
                    className="text-[10px] normal-case font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </>
            )}
          </div>

          {/* Radar List (collapsible) */}
          {(isRadarOpen || isCollapsed) && (
            <div className="space-y-0.5">
              <button
                onClick={() => applyFilter({ urgency: 'all', status: 'active' })}
                title="All Active Contracts"
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1.5'
                } text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filters.urgency === 'all' && filters.status === 'active'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {!isCollapsed && <span>All Active</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {activeContracts.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => applyFilter({ urgency: 'overdue', status: 'active' })}
                title={`Overdue Notice (${overdueCount})`}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1.5'
                } text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filters.urgency === 'overdue'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                }`}
              >
                <div className="flex items-center gap-2 relative">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  {!isCollapsed && <span>Overdue Notice</span>}
                  {isCollapsed && overdueCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
                {!isCollapsed && overdueCount > 0 && (
                  <span className="text-[11px] font-mono tabular-nums text-rose-600 dark:text-rose-400 font-bold">
                    {overdueCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => applyFilter({ urgency: 'next_30', status: 'active' })}
                title={`Next 30 Days (${next30Count})`}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1.5'
                } text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filters.urgency === 'next_30'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30'
                }`}
              >
                <div className="flex items-center gap-2 relative">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {!isCollapsed && <span>Next 30 Days</span>}
                  {isCollapsed && next30Count > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </div>
                {!isCollapsed && next30Count > 0 && (
                  <span className="text-[11px] font-mono tabular-nums text-amber-600 dark:text-amber-400 font-bold">
                    {next30Count}
                  </span>
                )}
              </button>

              <button
                onClick={() => applyFilter({ urgency: '31_90', status: 'active' })}
                title={`31–90 Days (${in31to90Count})`}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1.5'
                } text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filters.urgency === '31_90'
                    ? 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-yellow-50/50 dark:hover:bg-yellow-950/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 shrink-0" />
                  {!isCollapsed && <span>31–90 Days</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {in31to90Count}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Categories Section */}
        <div>
          {/* Categories Header with Collapsible Arrow / Triangle */}
          <div
            onClick={() => !isCollapsed && setIsCategoriesOpen(!isCategoriesOpen)}
            className={`flex items-center justify-between mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none ${
              isCollapsed
                ? 'justify-center cursor-default'
                : 'px-1.5 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {isCollapsed ? (
              <span className="text-[9px] text-slate-400">CATS</span>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      !isCategoriesOpen ? '-rotate-90' : ''
                    }`}
                  />
                  <span>Categories (A–Z)</span>
                </div>
                <span className="text-[10px] font-normal normal-case text-slate-400">
                  Annual
                </span>
              </>
            )}
          </div>

          {/* Categories List (collapsible & alphabetically sorted) */}
          {(isCategoriesOpen || isCollapsed) && (
            <div className="space-y-0.5">
              <button
                onClick={() => applyFilter({ categoryId: 'all' })}
                title="All Categories"
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1.5'
                } text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filters.categoryId === 'all'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {!isCollapsed && <span>All Categories</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {contracts.length}
                  </span>
                )}
              </button>

              {sortedCategories.map(({ category, totalSpend }) => {
                const Icon = iconMap[category.icon] || Layers;
                return (
                  <button
                    key={category.id}
                    onClick={() =>
                      applyFilter({
                        categoryId:
                          filters.categoryId === category.id
                            ? 'all'
                            : category.id,
                      })
                    }
                    title={`${category.name} (${formatCurrency(
                      totalSpend,
                      user.settings.currency
                    )})`}
                    className={`w-full flex items-center ${
                      isCollapsed
                        ? 'justify-center p-1.5'
                        : 'justify-between px-2.5 py-1.5'
                    } text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      filters.categoryId === category.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate mr-1.5">
                      <Icon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: category.color }}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{category.name}</span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatCurrency(totalSpend, user.settings.currency)}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer with Premium User & Logout Section */}
      <div className="pt-2.5 mt-auto border-t border-slate-100 dark:border-slate-800 shrink-0">
        {isCollapsed ? (
          <div className="flex justify-center">
            {isFirebaseAuthenticated ? (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={syncWithFirebase}
                  disabled={isSyncingWithFirebase}
                  title={`Firebase Synced (${contracts.length} contracts). Click to sync now.`}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  aria-label="Sync with Firebase"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingWithFirebase ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={logout}
                  title={`Log Out (${user.name})`}
                  className="group relative w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer shadow-2xs"
                  aria-label="Log Out"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:scale-110" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                title="Sign in or register"
                className="group relative w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : isFirebaseAuthenticated ? (
          <div className="space-y-1.5">
            {/* Cloud Sync Status & Action Bar */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 text-[11px] text-emerald-950 dark:text-emerald-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate font-semibold">
                  {isSyncingWithFirebase ? 'Syncing...' : 'Firebase Synced'}
                </span>
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                  ({contracts.length})
                </span>
              </div>
              <button
                onClick={syncWithFirebase}
                disabled={isSyncingWithFirebase}
                title="Synchronize all contracts with Firebase now"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] transition cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingWithFirebase ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            {/* User identity badge */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5 min-w-0 mr-1.5">
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Stylized Logout Action */}
              <button
                onClick={logout}
                title="Log Out"
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 rounded-lg transition-all cursor-pointer shrink-0 shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Cloud Sync
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-200/60 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 font-medium">
                Demo
              </span>
            </div>
            <p className="text-[11px] text-indigo-900/70 dark:text-indigo-300/80 leading-snug">
              Sign in with Google, Apple, or email to securely sync your contracts with Firebase.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
