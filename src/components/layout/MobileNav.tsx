import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, FileSpreadsheet, Bell, Settings, Plus } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const {
    unreadCount,
    setIsAddModalOpen,
    setIsNotificationDrawerOpen,
    setFilters,
    filters,
    currentPage,
    setCurrentPage,
  } = useApp();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-3 py-1.5 flex items-center justify-between max-w-lg mx-auto"
      style={{ maxHeight: '68px' }}
    >
      <button
        onClick={() => {
          setCurrentPage('dashboard');
          setFilters({ urgency: 'all', status: 'active', categoryId: 'all' });
        }}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer ${
          currentPage === 'dashboard'
            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Radar</span>
      </button>

      <button
        onClick={() => setCurrentPage('reports')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer ${
          currentPage === 'reports'
            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <FileSpreadsheet className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Reports</span>
      </button>

      {/* Floating Center Add Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="flex items-center justify-center w-11 h-11 -mt-4 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition cursor-pointer"
        aria-label="Add contract"
      >
        <Plus className="w-6 h-6" />
      </button>

      <button
        onClick={() => setIsNotificationDrawerOpen(true)}
        className="relative flex flex-col items-center justify-center p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
        )}
        <span className="text-[10px] mt-0.5">Alerts</span>
      </button>

      <button
        onClick={() => setCurrentPage(currentPage === 'settings' ? 'dashboard' : 'settings')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer ${
          currentPage === 'settings'
            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Settings</span>
      </button>
    </nav>
  );
};
