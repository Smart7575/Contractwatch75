import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Bell,
  Plus,
  Sun,
  Moon,
  Settings,
  LogIn,
  LogOut,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    unreadCount,
    setIsAddModalOpen,
    setIsNotificationDrawerOpen,
    user,
    currentPage,
    setCurrentPage,
    isFirebaseAuthenticated,
    setIsAuthModalOpen,
    logout,
  } = useApp();

  const { actualTheme, toggleTheme } = useTheme();

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
            ContractWatch75
          </span>
        </button>
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
          <>
            {/* User account / settings button */}
            <button
              onClick={() =>
                setCurrentPage(currentPage === 'settings' ? 'dashboard' : 'settings')
              }
              className={`flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl transition-all cursor-pointer ${
                currentPage === 'settings'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Account settings"
              aria-label="Account settings"
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

            {/* Logout button */}
            <button
              onClick={logout}
              title={`Log Out (${user.name})`}
              aria-label="Log Out"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
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
