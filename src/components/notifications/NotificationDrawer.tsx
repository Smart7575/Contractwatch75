import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../lib/dateUtils';
import {
  X,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Trash2,
  Check,
  BellOff,
} from 'lucide-react';

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
    notifications,
    setSelectedContractId,
    user,
    setIsSettingsModalOpen,
  } = useApp();

  if (!isNotificationDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Signal & Notice Alerts
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
              {notifications.length}
            </span>
          </div>
          <button
            onClick={() => setIsNotificationDrawerOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead times note */}
        <div className="px-5 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
          <span>Active schedule: 90, 60, 30, 14, 7, 0 days</span>
          <button
            onClick={() => {
              setIsNotificationDrawerOpen(false);
              setIsSettingsModalOpen(true);
            }}
            className="font-semibold underline cursor-pointer"
          >
            Customize
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {user.settings.channels?.inApp === false ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
              <BellOff className="w-10 h-10 mb-2 text-slate-400 opacity-60" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                In-app meldingen uitgeschakeld
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Het in-app notificatiepaneel is uitgeschakeld in de instellingen. Schakel dit in om live alerts en badges te zien.
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-500 opacity-60" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                All Clear!
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                No contracts require cancellation decisions in your active alert windows.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isOverdue = notif.urgency === 'overdue';
              const is30 = notif.urgency === 'next_30';

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isOverdue
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-100'
                      : is30
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-100'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {isOverdue ? (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <h4 className="text-xs font-bold truncate">{notif.title}</h4>
                        <span className="text-[10px] font-mono shrink-0 opacity-70">
                          {formatDate(notif.triggerDate)}
                        </span>
                      </div>
                      <p className="text-xs mt-1 opacity-90 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                        <button
                          onClick={() => {
                            setIsNotificationDrawerOpen(false);
                            setSelectedContractId(notif.contractId);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          <span>Open Dossier</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
