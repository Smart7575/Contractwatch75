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
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] sm:left-auto right-[max(1rem,env(safe-area-inset-right))] z-50 flex items-center justify-between sm:justify-start gap-3 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-300 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <span className="text-xs sm:text-sm font-medium min-w-0">{undoToast.message}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={undoToast.onUndo}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>
        <button
          onClick={dismissUndoToast}
          className="text-slate-400 hover:text-slate-200 dark:hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
