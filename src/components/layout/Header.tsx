import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Bell,
  Plus,
  Sun,
  Moon,
  Settings,
  Search,
  X,
  Building2,
  LogIn,
  LogOut,
} from 'lucide-react';
import {
  formatCurrency,
  getDaysRemaining,
  getUrgencyLevel,
  getUrgencyMetadata,
} from '../../lib/dateUtils';

export const Header: React.FC = () => {
  const {
    unreadCount,
    setIsAddModalOpen,
    setIsNotificationDrawerOpen,
    setSelectedContractId,
    user,
    contracts,
    categories,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
    isFirebaseAuthenticated,
    setIsAuthModalOpen,
    logout,
  } = useApp();

  const { actualTheme, toggleTheme } = useTheme();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcuts (Cmd+K, Ctrl+K, or /) to focus global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable) &&
        target !== inputRef.current
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsSearchOpen(true);
      } else if (e.key === '/' && target !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const searchQuery = filters.search.trim().toLowerCase();

  // Real-time matched contracts by name, category, or vendor
  const matchingContracts = useMemo(() => {
    if (!searchQuery) return [];
    return contracts.filter((c) => {
      const matchName = c.name.toLowerCase().includes(searchQuery);
      const matchVendor = c.supplier.toLowerCase().includes(searchQuery);
      const cat = categories.find((catItem) => catItem.id === c.categoryId);
      const matchCategory = cat ? cat.name.toLowerCase().includes(searchQuery) : false;
      const matchSubcat = (c.subcategory || '').toLowerCase().includes(searchQuery);
      const matchNumber = (c.contractNumber || '').toLowerCase().includes(searchQuery);
      return matchName || matchVendor || matchCategory || matchSubcat || matchNumber;
    });
  }, [contracts, categories, searchQuery]);

  const handleSearchChange = (val: string) => {
    if (currentPage !== 'dashboard') {
      setCurrentPage('dashboard');
    }
    setFilters({ search: val });
    if (!isSearchOpen && val.trim().length > 0) {
      setIsSearchOpen(true);
    }
  };

  const handleClearSearch = () => {
    setFilters({ search: '' });
    inputRef.current?.focus();
  };

  const handleSelectContract = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-6 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md transition-colors gap-2 sm:gap-4">
      {/* Zone 1: Brand */}
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="flex items-center gap-2.5 text-slate-900 dark:text-white group focus-visible:outline-hidden cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:bg-indigo-700 transition-colors">
            CW
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight hidden sm:inline">
            ContractWatch
          </span>
        </button>
      </div>

      {/* Zone 2: Global Search Bar */}
      <div
        ref={containerRef}
        className="flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg relative mx-1 sm:mx-2"
      >
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (filters.search.trim().length > 0) {
                setIsSearchOpen(true);
              }
            }}
            placeholder="Search by name, category, or vendor..."
            className="w-full pl-9 pr-14 sm:pr-16 py-1.5 sm:py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {filters.search ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded select-none">
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* Global Search Dropdown Results Preview */}
        {isSearchOpen && searchQuery.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Dropdown Header */}
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Found{' '}
                <strong className="text-slate-900 dark:text-white font-semibold">
                  {matchingContracts.length}
                </strong>{' '}
                contract{matchingContracts.length === 1 ? '' : 's'}
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                Live filtering Radar
              </span>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {matchingContracts.length > 0 ? (
                matchingContracts.slice(0, 5).map((contract) => {
                  const category = categories.find(
                    (cat) => cat.id === contract.categoryId
                  );
                  const daysRemaining = getDaysRemaining(
                    contract.cancellationDeadline
                  );
                  const urgency = getUrgencyLevel(
                    contract.cancellationDeadline,
                    contract.status
                  );
                  const urgencyMeta = getUrgencyMetadata(
                    urgency,
                    daysRemaining
                  );

                  return (
                    <button
                      key={contract.id}
                      type="button"
                      onClick={() => handleSelectContract(contract.id)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: category?.color || '#6366f1',
                            }}
                          />
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {contract.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3 shrink-0 text-slate-400" />
                            <span>{contract.supplier}</span>
                          </span>
                          <span>•</span>
                          <span className="truncate">
                            {category?.name || contract.subcategory}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                          {formatCurrency(
                            contract.annualCost,
                            user.settings.currency
                          )}
                          <span className="text-[10px] text-slate-400 font-normal">
                            /yr
                          </span>
                        </div>
                        <div
                          className={`text-[10px] font-semibold mt-0.5 ${urgencyMeta.textClass}`}
                        >
                          {daysRemaining < 0
                            ? `${Math.abs(daysRemaining)}d overdue`
                            : daysRemaining === 0
                            ? 'Due today'
                            : `${daysRemaining}d left`}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-8 px-4 text-center">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No matching contracts
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Try searching by contract name, vendor (e.g. ConEd, Verizon), or category (e.g. Energy, Telecom).
                  </p>
                </div>
              )}
            </div>

            {/* Dropdown Footer */}
            {matchingContracts.length > 5 && (
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  View all {matchingContracts.length} results on Radar Overview →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={actualTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {actualTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-colors" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 hover:text-indigo-600 transition-colors" />
          )}
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => setIsNotificationDrawerOpen(true)}
          className="relative p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Notification center"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="w-4 h-4" />
          {user.settings.channels?.inApp !== false && unreadCount > 0 && (
            <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>

        {/* Login CTA if not authenticated */}
        {!isFirebaseAuthenticated ? (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        ) : (
          /* User account / settings button */
          <button
            onClick={() =>
              setCurrentPage(currentPage === 'settings' ? 'dashboard' : 'settings')
            }
            className={`flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl transition-all cursor-pointer ${
              currentPage === 'settings'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Account settings page"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold max-w-[80px] truncate hidden xl:inline">
              Settings
            </span>
            <Settings
              className={`w-3.5 h-3.5 hidden sm:block ${
                currentPage === 'settings'
                  ? 'text-indigo-600 dark:text-indigo-400 rotate-45 transition-transform'
                  : 'text-slate-400'
              }`}
            />
          </button>
        )}

        {isFirebaseAuthenticated && (
          <button
            onClick={logout}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer hidden sm:flex items-center justify-center"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}

        {/* Primary CTA: Add Contract */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Contract</span>
        </button>
      </div>
    </header>
  );
};
