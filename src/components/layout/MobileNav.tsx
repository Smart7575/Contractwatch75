import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, FileSpreadsheet, TrendingUp, Settings, Plus } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const {
    setIsAddModalOpen,
    setFilters,
    currentPage,
    setCurrentPage,
  } = useApp();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div className="max-w-lg mx-auto w-full flex items-center justify-between">
        <button
          onClick={() => {
            setCurrentPage('dashboard');
            setFilters({ urgency: 'all', status: 'active', categoryId: 'all' });
          }}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            currentPage === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Radar</span>
        </button>

        <button
          onClick={() => setCurrentPage('cashflow')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            currentPage === 'cashflow'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Cashflow</span>
        </button>

        {/* Floating Center Add Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] -mt-3 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition cursor-pointer"
          aria-label="Add contract"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => setCurrentPage('reports')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            currentPage === 'reports'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Reports</span>
        </button>

        <button
          onClick={() => setCurrentPage(currentPage === 'settings' ? 'dashboard' : 'settings')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-colors cursor-pointer ${
            currentPage === 'settings'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Settings</span>
        </button>
      </div>
    </nav>
  );
};
