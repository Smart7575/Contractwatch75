import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { RotateCcw, X } from 'lucide-react';

export const UndoToast: React.FC = () => {
  const { undoToast, dismissUndoToast } = useApp();

  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => {
      dismissUndoToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [undoToast, dismissUndoToast]);

  if (!undoToast) return null;

  return (
    <aside
      aria-label="Action feedback"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-3 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-3 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-300 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <span className="text-xs sm:text-sm font-medium">{undoToast.message}</span>
      <button
        onClick={undoToast.onUndo}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Undo</span>
      </button>
      <button
        onClick={dismissUndoToast}
        className="text-slate-400 hover:text-slate-200 dark:hover:text-slate-700 p-1"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
};
