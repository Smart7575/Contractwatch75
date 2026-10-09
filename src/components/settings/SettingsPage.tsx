import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import {
  User,
  Settings,
  Bell,
  Sparkles,
  Shield,
  Trash2,
  Check,
  AlertTriangle,
  Download,
  Calendar,
  Sun,
  Moon,
  FileSpreadsheet,
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Cloud,
  RefreshCw,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  Layers,
  Plus,
  Tag,
} from 'lucide-react';
import { downloadICS } from '../../lib/icsExport';
import { exportFile } from '../../lib/fileExportHelper';
import {
  exportContractsToCSV,
  getCSVTemplateString,
  parseCSVToContracts,
} from '../../lib/csvHelper';
import { formatCurrency, getCurrencyLabel } from '../../lib/dateUtils';
import { Contract } from '../../types';
import { firebaseConfig, checkFirebaseConnection, FirebaseConnectionStatus, auth } from '../../lib/firebase';
import { fetchUserContractsFromFirestore } from '../../lib/firebaseService';
import { isDemoContract } from '../../lib/storage';

export const SettingsPage: React.FC = () => {
  const {
    user,
    updateUserSettings,
    handleRemoveDemoData,
    handleRestoreDemoData,
    contracts,
    categories,
    addSubcategory,
    removeSubcategory,
    deleteAccount,
    importJSON,
    importCSVContracts,
    setCurrentPage,
    isFirebaseAuthenticated,
    isSyncingWithFirebase,
    lastSyncTime,
    syncWithFirebase,
    setIsAuthModalOpen,
  } = useApp();

  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<
    'profile' | 'categories' | 'demodata' | 'firebase' | 'reminders' | 'importexport' | 'data' | 'danger'
  >('profile');

  // Categories & subcategories management state
  const [selectedCatId, setSelectedCatId] = useState<string>('insurance');
  const [newSubcatName, setNewSubcatName] = useState<string>('');
  const [subcatSuccess, setSubcatSuccess] = useState<string | null>(null);

  const handleAddSubcategory = (catId: string) => {
    const trimmed = newSubcatName.trim();
    if (!trimmed) return;
    addSubcategory(catId, trimmed);
    setNewSubcatName('');
    const catName = categories.find((c) => c.id === catId)?.name || 'categorie';
    setSubcatSuccess(`Subcategorie "${trimmed}" succesvol toegevoegd aan ${catName}!`);
    setTimeout(() => setSubcatSuccess(null), 3500);
  };

  // Demo contracts management state & handlers
  const [isDemoActionRunning, setIsDemoActionRunning] = useState(false);
  const [demoFeedback, setDemoFeedback] = useState<{
    type: 'success' | 'info';
    message: string;
  } | null>(null);

  const demoContracts = contracts.filter(isDemoContract);
  const demoCount = demoContracts.length;
  const hasDemo = demoCount > 0;

  const onRemoveDemoData = async () => {
    setIsDemoActionRunning(true);
    setDemoFeedback(null);
    try {
      const res = await handleRemoveDemoData();
      setDemoFeedback({
        type: 'success',
        message: `Alle demo contracten (${res.count}) zijn succesvol verwijderd uit uw werkruimte.`,
      });
      setTimeout(() => setDemoFeedback(null), 4000);
    } catch (err: any) {
      setDemoFeedback({
        type: 'info',
        message: err?.message || 'Demo data verwijderen is voltooid.',
      });
    } finally {
      setIsDemoActionRunning(false);
    }
  };

  const onRestoreDemoData = async () => {
    setIsDemoActionRunning(true);
    setDemoFeedback(null);
    try {
      const res = await handleRestoreDemoData();
      setDemoFeedback({
        type: 'success',
        message: `De realistische voorbeeldcontracten (${res.count}) zijn succesvol teruggezet en beschikbaar in uw radar.`,
      });
      setTimeout(() => setDemoFeedback(null), 4000);
    } catch (err: any) {
      setDemoFeedback({
        type: 'info',
        message: err?.message || 'Demo data terugzetten is voltooid.',
      });
    } finally {
      setIsDemoActionRunning(false);
    }
  };

  // Firebase connection test state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<FirebaseConnectionStatus | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await checkFirebaseConnection();
      setConnectionStatus(res);
    } catch (err: any) {
      setConnectionStatus({
        connected: false,
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
        message: err?.message || 'Verbindingstest mislukt',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Firestore live contracts inspector state
  const [checkingFirestore, setCheckingFirestore] = useState(false);
  const [firestoreContracts, setFirestoreContracts] = useState<Contract[] | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const handleInspectFirestore = async () => {
    if (!auth.currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setCheckingFirestore(true);
    setFirestoreError(null);
    try {
      const live = await fetchUserContractsFromFirestore(auth.currentUser.uid);
      setFirestoreContracts(live);
    } catch (err: any) {
      setFirestoreError(err?.message || 'Kon Firestore contracten niet ophalen');
    } finally {
      setCheckingFirestore(false);
    }
  };

  // Profile form state
  const [name, setName] = useState(user.name);
  const isInitialCustom =
    user.settings.currency.startsWith('custom:') ||
    !['EUR', 'USD', 'GBP', 'CHF'].includes(user.settings.currency);

  const [currencyMode, setCurrencyMode] = useState<'preset' | 'custom'>(
    isInitialCustom ? 'custom' : 'preset'
  );
  const [selectedPreset, setSelectedPreset] = useState<string>(
    isInitialCustom ? 'EUR' : user.settings.currency
  );
  const [customCurrencyText, setCustomCurrencyText] = useState<string>(
    user.settings.currency.startsWith('custom:')
      ? user.settings.currency.replace('custom:', '').trim()
      : isInitialCustom
      ? user.settings.currency.trim()
      : 'kr'
  );
  const [timezone, setTimezone] = useState(user.settings.timezone);

  const effectiveCurrency =
    currencyMode === 'custom'
      ? `custom:${customCurrencyText.trim() || 'EUR'}`
      : selectedPreset;

  // Channels
  const [inApp, setInApp] = useState(user.settings.channels.inApp);
  const [emailAlerts, setEmailAlerts] = useState(user.settings.channels.email);
  const [webPush, setWebPush] = useState(user.settings.channels.webPush);
  const [weeklyDigest, setWeeklyDigest] = useState(
    user.settings.channels.weeklyDigest
  );

  // Reminders / Lead Times
  const [leadTimes, setLeadTimes] = useState<number[]>(
    user.settings.defaultReminders || [90, 60, 30, 14, 7, 1]
  );

  // Import / Export state
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importFeedback, setImportFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Danger delete confirmation
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleLeadTime = (days: number) => {
    if (leadTimes.includes(days)) {
      if (leadTimes.length <= 1) return; // Keep at least 1
      setLeadTimes(leadTimes.filter((d) => d !== days));
    } else {
      setLeadTimes([...leadTimes, days].sort((a, b) => b - a));
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserSettings({
      currency: effectiveCurrency,
      timezone,
      defaultReminders: leadTimes,
      channels: {
        inApp,
        email: emailAlerts,
        webPush,
        weeklyDigest,
      },
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // JSON Export
  const handleExportJSON = async () => {
    const exportBundle = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        settings: user.settings,
      },
      categories,
      contracts,
    };
    const jsonStr = JSON.stringify(exportBundle, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    await exportFile({
      filename: `contractwatch-export-${dateStr}.json`,
      content: jsonStr,
      mimeType: 'application/json',
      title: 'ContractWatch JSON Backup',
    });
  };

  // CSV Export
  const handleExportCSV = async () => {
    const csvStr = exportContractsToCSV(contracts);
    const dateStr = new Date().toISOString().split('T')[0];
    await exportFile({
      filename: `contractwatch-contracts-${dateStr}.csv`,
      content: csvStr,
      mimeType: 'text/csv;charset=utf-8;',
      title: 'ContractWatch Contracts CSV',
    });
  };

  // Download sample CSV template
  const handleDownloadTemplate = async () => {
    const template = getCSVTemplateString();
    await exportFile({
      filename: 'contractwatch-template.csv',
      content: template,
      mimeType: 'text/csv;charset=utf-8;',
      title: 'ContractWatch CSV Template',
    });
  };

  // Handle file upload (JSON or CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          const res = importJSON(parsed, importMode);
          if (res.success) {
            setImportFeedback({
              success: true,
              message: `Successfully imported ${res.count} contracts via JSON (${importMode} mode).`,
            });
          } else {
            setImportFeedback({
              success: false,
              message: res.error || 'Failed to import JSON.',
            });
          }
        } catch (err: any) {
          setImportFeedback({
            success: false,
            message: 'Invalid JSON file: ' + err.message,
          });
        }
      } else if (file.name.endsWith('.csv')) {
        const parsed = parseCSVToContracts(content, user.id);
        if (parsed.valid.length > 0) {
          importCSVContracts(parsed.valid, importMode);
          setImportFeedback({
            success: true,
            message: `Successfully parsed and imported ${parsed.valid.length} contracts from CSV (${importMode} mode). ${
              parsed.errors.length > 0
                ? `(${parsed.errors.length} skipped rows)`
                : ''
            }`,
          });
        } else {
          setImportFeedback({
            success: false,
            message: parsed.errors[0] || 'No valid rows found in CSV.',
          });
        }
      } else {
        setImportFeedback({
          success: false,
          message: 'Unsupported format. Please select a .json or .csv file.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmationText.trim() === 'DELETE') {
      setDeleteError(null);
      setIsDeletingAccount(true);
      try {
        const res = await deleteAccount();
        if (res && !res.success) {
          setDeleteError(res.error || 'An error occurred while deleting your account.');
          setIsDeletingAccount(false);
          return;
        }
        setCurrentPage('dashboard');
      } catch (err: any) {
        setDeleteError(err.message || 'Account deletion failed.');
        setIsDeletingAccount(false);
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile & Regional', icon: User },
    { id: 'categories', label: 'Categories & Subcategories', icon: Layers },
    { id: 'demodata', label: 'Demo Data', icon: Sparkles },
    { id: 'firebase', label: 'Firebase Database', icon: Database },
    { id: 'reminders', label: 'Signal Intervals', icon: Bell },
    { id: 'importexport', label: 'Import & Export', icon: FileSpreadsheet },
    { id: 'data', label: 'Calendar Sync (.ics)', icon: Calendar },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Return to Dashboard */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Radar Overview</span>
        </button>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      {/* Main Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Account & Workspace Settings
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Manage profile defaults, notification signal intervals, calendar synchronization, and backup archives.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Private & Local</span>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* Profile & Regional Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Personal Profile & Locale
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set your primary currency symbol, timezone, and visual appearance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Email
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Currency & Symbol
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Choose a standard currency or enter custom letters (e.g. kr, DKK, CAD, CHF, EUR).
                    </p>
                  </div>
                  {/* Mode switch */}
                  <div className="flex p-0.5 bg-slate-200/80 dark:bg-slate-700 rounded-xl text-[11px] font-semibold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setCurrencyMode('preset')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        currencyMode === 'preset'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Presets
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrencyMode('custom')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        currencyMode === 'custom'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Custom Letters
                    </button>
                  </div>
                </div>

                {currencyMode === 'preset' ? (
                  <div>
                    <select
                      value={selectedPreset}
                      onChange={(e) => setSelectedPreset(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-indigo-500 font-medium"
                    >
                      <option value="EUR">EUR (€) — Eurozone</option>
                      <option value="USD">USD ($) — United States Dollar</option>
                      <option value="GBP">GBP (£) — British Pound</option>
                      <option value="CHF">CHF (CHF) — Swiss Franc</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Custom currency symbol (letters, e.g. kr, DKK, SEK, CHF, CAD, EUR):
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          maxLength={6}
                          value={customCurrencyText}
                          onChange={(e) => {
                            // Filter input strictly to letters
                            const filtered = e.target.value.replace(/[^A-Za-zÀ-ž]/g, '');
                            setCustomCurrencyText(filtered);
                          }}
                          placeholder="e.g. kr"
                          className="w-36 px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-indigo-500 shadow-2xs"
                        />
                        <span className="text-[11px] text-slate-500 font-medium">
                          (max. 6 letters)
                        </span>
                      </div>
                    </div>

                    {/* Quick suggestion chips */}
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                        Quick suggestions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {['kr', 'CHF', 'DKK', 'SEK', 'NOK', 'CAD', 'AUD', 'EUR', 'USD', 'PLN'].map((sym) => (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => setCustomCurrencyText(sym)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                              customCurrencyText.toLowerCase() === sym.toLowerCase()
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                            }`}
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Preview Box */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <span>Live in-app preview:</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                      {getCurrencyLabel(effectiveCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    <span>{formatCurrency(1249.5, effectiveCurrency)} / yr</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-slate-700 dark:text-slate-300 font-normal">
                      {formatCurrency(104.13, effectiveCurrency)} / mo
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Timezone for Deadline Calculations
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-indigo-500"
                >
                  <option value="America/New_York">
                    America/New_York (Eastern Time, UTC-5)
                  </option>
                  <option value="America/Chicago">
                    America/Chicago (Central Time, UTC-6)
                  </option>
                  <option value="America/Denver">
                    America/Denver (Mountain Time, UTC-7)
                  </option>
                  <option value="America/Los_Angeles">
                    America/Los_Angeles (Pacific Time, UTC-8)
                  </option>
                  <option value="Europe/Amsterdam">
                    Europe/Amsterdam (CET, UTC+1)
                  </option>
                  <option value="Europe/London">Europe/London (GMT, UTC+0)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                </select>
              </div>
            </div>

            {/* Theme selector */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Interface Theme
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                    theme === 'light'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                    theme === 'dark'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Notification Channels */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Notification Delivery Channels
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      In-App Bell Drawer
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Live badge and notification panel
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={inApp}
                    onChange={(e) => setInApp(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Email Alert Signals
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Dispatched before deadline
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Weekly Digest
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Every Monday morning summary
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Browser Web Push
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Desktop and lock screen banners
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={webPush}
                    onChange={(e) => setWebPush(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        )}

        {/* Categories & Subcategories Management Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Contract Categorieën & Subcategorieën
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bekijk en beheer subcategorieën per contracttype. Voor <strong>Insurance</strong> zijn standaard de subcategorieën <strong>House, Car, Boat, Liability, Travel</strong> beschikbaar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{categories.length} Categorieën</span>
                </span>
              </div>
            </div>

            {subcatSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-medium animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{subcatSuccess}</span>
              </div>
            )}

            {/* Quick Add Subcategory Card */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Nieuwe Subcategorie Toevoegen</span>
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Kies een categorie en voeg een nieuwe subcategorie toe. Deze is direct beschikbaar bij het toevoegen of bewerken van contracten.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.subcategories.length} subcategorieën)
                    </option>
                  ))}
                </select>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubcatName}
                    onChange={(e) => setNewSubcatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategory(selectedCatId);
                      }
                    }}
                    placeholder="Bijv. Cyber, Solar, Inboedel..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSubcategory(selectedCatId)}
                    disabled={!newSubcatName.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors shrink-0"
                  >
                    Toevoegen
                  </button>
                </div>
              </div>
            </div>

            {/* List of Categories with their subcategories */}
            <div className="space-y-4">
              {categories.map((cat) => {
                const countOfContracts = contracts.filter((c) => c.categoryId === cat.id).length;
                const isInsurance = cat.id === 'insurance';

                return (
                  <div
                    key={cat.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{cat.name}</span>
                            {isInsurance && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Standaard: House, Car, Boat, Liability, Travel
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {countOfContracts} actieve/geregistreerde contract(en) in deze categorie
                          </p>
                        </div>
                      </div>

                      <span className="text-xs text-slate-500 font-mono self-start sm:self-auto">
                        {cat.subcategories.length} subcategorieën
                      </span>
                    </div>

                    {/* Subcategories Badges */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {cat.subcategories.map((sub) => {
                        const isDefaultInsuranceSub =
                          isInsurance && ['House', 'Car', 'Boat', 'Liability', 'Travel'].includes(sub);

                        return (
                          <div
                            key={sub}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border font-medium transition-colors ${
                              isDefaultInsuranceSub
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span>{sub}</span>
                            {cat.subcategories.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSubcategory(cat.id, sub)}
                                title={`Verwijder ${sub}`}
                                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors ml-0.5 cursor-pointer"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Demo Data Management Tab */}
        {activeTab === 'demodata' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Demo Data & Voorbeeldcontracten
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verwijder de voorbeeldcontracten om direct met een schone lei te beginnen, of herstel ze op elk moment om alle functionaliteiten te testen.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    hasDemo
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{hasDemo ? `${demoCount} Demo Contracten Actief` : 'Schone Werkruimte (Geen Demo)'}</span>
                </span>
              </div>
            </div>

            {/* Inline Feedback Banner */}
            {demoFeedback && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in ${
                  demoFeedback.type === 'success'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-sm">Status bijgewerkt</div>
                  <div className="mt-0.5 leading-relaxed">{demoFeedback.message}</div>
                </div>
              </div>
            )}

            {/* Status Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Demo Contracten
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {demoCount} <span className="text-xs font-normal text-slate-500">van de {contracts.length} totaal</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {hasDemo ? 'Zichtbaar in de radar' : 'Niet aanwezig'}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Jaarlijkse Demowaarde
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(
                    demoContracts.reduce((sum, c) => sum + (c.annualCost || 0), 0),
                    user.settings.currency
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {hasDemo ? 'Voorbeeld contractkosten' : '€0,00'}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Eigen Contracten
                </div>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {contracts.length - demoCount}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Blijven altijd behouden
                </div>
              </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Verwijderen */}
              <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                    <Trash2 className="w-4 h-4" />
                    <span>Demo Data Verwijderen</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Verwijdert met één klik alle {demoCount} voorbeeldcontracten uit uw radar. Uw eigen handmatig toegevoegde contracten blijven 100% onaangetast.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onRemoveDemoData}
                    disabled={isDemoActionRunning}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {isDemoActionRunning
                        ? 'Bezig met verwijderen...'
                        : hasDemo
                        ? `Verwijder Alle Demo Data (${demoCount})`
                        : 'Demo Status Schonen'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Card 2: Terugzetten */}
              <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                    <RotateCcw className="w-4 h-4" />
                    <span>Demo Data Terugzetten</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Laadt de 12 realistische voorbeeldcontracten (energie, internet, streaming, fitness, verzekeringen) weer in zodat u de Kanban, tijdlijn en meldingen kunt uitproberen.
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={onRestoreDemoData}
                    disabled={isDemoActionRunning}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isDemoActionRunning ? 'animate-spin' : ''}`} />
                    <span>
                      {isDemoActionRunning
                        ? 'Bezig met herstellen...'
                        : hasDemo
                        ? 'Demo Data Herstellen / Resetten'
                        : 'Voorbeeldcontracten Terugzetten'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* List of currently loaded demo contracts */}
            {hasDemo ? (
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Momenteel Geladen Demo Contracten ({demoCount})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Gemarkeerd met het Demo label in de radar
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  {demoContracts.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{c.supplier}</span>
                          <span>•</span>
                          <span className="capitalize">{c.categoryId}</span>
                          <span>•</span>
                          <span>Opzegtermijn: {c.cancellationDeadline}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(c.annualCost, user.settings.currency)}/jr
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded">
                          Demo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Schone Werkruimte
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Er zijn momenteel geen demogegevens aanwezig. U werkt uitsluitend met uw eigen contracten. U kunt voorbeelddata op elk moment weer terugzetten met de knop hierboven.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Firebase & Database Tab */}
        {activeTab === 'firebase' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Firebase Database & Cloud Koppeling
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live Firestore database en authenticatie configuratie voor <strong>contractwatch75</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>{testingConnection ? 'Verbinding testen...' : 'Test Firebase Verbinding'}</span>
                </button>
              </div>
            </div>

            {/* Connection Status Banner */}
            {connectionStatus && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-in fade-in ${
                  connectionStatus.connected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {connectionStatus.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold text-sm">
                    {connectionStatus.connected ? 'Verbinding met Firebase is Actief!' : 'Verbinding Mislukt'}
                  </div>
                  <div className="mt-1 leading-relaxed opacity-90">{connectionStatus.message}</div>
                  {connectionStatus.latencyMs !== undefined && (
                    <div className="mt-2 text-[11px] font-mono opacity-80 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ping reactietijd: {connectionStatus.latencyMs} ms</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Config Parameter Grid */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Geverifieerde Firebase Configuratie Parameters
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Project ID */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">projectId</div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {firebaseConfig.projectId}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-md">
                      Actief
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(firebaseConfig.projectId, 'projectId')}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      title="Kopiëren"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Auth Domain */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">authDomain</div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {firebaseConfig.authDomain}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(firebaseConfig.authDomain, 'authDomain')}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    title="Kopiëren"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Storage Bucket */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">storageBucket</div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {firebaseConfig.storageBucket}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(firebaseConfig.storageBucket, 'storageBucket')}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    title="Kopiëren"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Messaging Sender ID */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">messagingSenderId</div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {firebaseConfig.messagingSenderId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(firebaseConfig.messagingSenderId, 'messagingSenderId')}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    title="Kopiëren"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* App ID */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between md:col-span-2">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">appId</div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {firebaseConfig.appId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(firebaseConfig.appId, 'appId')}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    title="Kopiëren"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* API Key */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between md:col-span-2">
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-medium text-slate-400">apiKey</div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {showApiKey ? firebaseConfig.apiKey : `${firebaseConfig.apiKey.slice(0, 8)}••••••••••••••••••••••••••••`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      title={showApiKey ? 'Verbergen' : 'Tonen'}
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(firebaseConfig.apiKey, 'apiKey')}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      title="Kopiëren"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              {copiedKey && (
                <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  {copiedKey} naar klembord gekopieerd!
                </div>
              )}
            </div>

            {/* Firestore Rules & Data Structure Information */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Firestore Beveiligingsregels (firestore.rules v2)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-md ml-auto">
                  Uitgerold
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                De database regels zijn geconfigureerd met strikte eigenaarsrechten (RBAC). Documenten worden opgeslagen onder het unieke gebruikers-ID:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Profielen:</div>
                  <span className="text-indigo-600 dark:text-indigo-400">/users/{'{userId}'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Contracten:</div>
                  <span className="text-indigo-600 dark:text-indigo-400">/users/{'{userId}'}/contracts</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Categorieën:</div>
                  <span className="text-indigo-600 dark:text-indigo-400">/users/{'{userId}'}/categories</span>
                </div>
              </div>
            </div>

            {/* Active User Sync Status */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Synchronisatie Status
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {isFirebaseAuthenticated
                      ? `Ingelogd als ${user.email || user.name}. Wijzigingen worden realtime gesynchroniseerd met Firestore.`
                      : 'Nog niet aangemeld via Firebase Auth. Gegevens worden veilig lokaal bewaard totdat u zich aanmeldt.'}
                  </div>
                </div>

                {isFirebaseAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => syncWithFirebase()}
                    disabled={isSyncingWithFirebase}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWithFirebase ? 'animate-spin' : ''}`} />
                    <span>{isSyncingWithFirebase ? 'Synchroniseren...' : 'Nu Synchroniseren'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Aanmelden / Inloggen</span>
                  </button>
                )}
              </div>

              {lastSyncTime && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Laatste Firestore sync: {new Date(lastSyncTime).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            {/* Live Firestore User Contract Registration Check */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Firestore Registratiecontrole per Gebruiker
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Controleer of uw contracten netjes zijn opgeslagen onder het Firestore pad{' '}
                    <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                      /users/{auth.currentUser?.uid || '{userId}'}/contracts/
                    </code>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInspectFirestore}
                  disabled={checkingFirestore}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingFirestore ? 'animate-spin' : ''}`} />
                  <span>{checkingFirestore ? 'Controleren...' : 'Controleer Firestore Contracten'}</span>
                </button>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400">Gebruikersauthenticatie:</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                    {isFirebaseAuthenticated ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Aangemeld ({auth.currentUser?.email || user.email})</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Niet aangemeld (Lokale modus)</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400">Gebruiker UID (Database Sleutel):</div>
                  <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                    {auth.currentUser?.uid || 'Nog niet toegewezen'}
                  </div>
                </div>
              </div>

              {firestoreError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{firestoreError}</span>
                </div>
              )}

              {/* Live Contract List from Firestore */}
              {firestoreContracts !== null && (
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Gevonden in Firestore Database:{' '}
                      <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                        {firestoreContracts.length} documenten
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Lokaal aanwezig: {contracts.length}
                    </span>
                  </div>

                  {firestoreContracts.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      {firestoreContracts.map((c) => (
                        <div key={c.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div className="min-w-0 pr-3">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                              {c.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>ID: {c.id}</span>
                              <span>•</span>
                              <span>{c.supplier}</span>
                              <span>•</span>
                              <span className="capitalize">{c.status}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(c.annualCost, user.settings.currency)}/jr
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 justify-end">
                              <Check className="w-3 h-3" /> In Firestore
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                      Er staan momenteel 0 contracten geregistreerd onder deze gebruiker in Firestore. Klik op "Nu Synchroniseren" om eventuele lokale contracten direct op te slaan in de cloud.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signal Intervals Tab */}
        {activeTab === 'reminders' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Notice Period Signal Triggers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ContractWatch automatically fires reminder signals at these intervals before any contract's cancellation deadline.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[90, 60, 30, 14, 7, 1].map((days) => {
                const isSelected = leadTimes.includes(days);
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => toggleLeadTime(days)}
                    className={`p-3.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Clock
                      className={`w-4 h-4 ${
                        isSelected
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                    <span className="text-base font-bold font-mono">
                      {days}d
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">
                      {days === 1 ? '1 day prior' : `${days} days prior`}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Active Cadence Preview:
              </div>
              <p>
                You will receive alerts at{' '}
                <strong>{leadTimes.sort((a, b) => b - a).join('d, ')}d</strong>{' '}
                prior to cancellation deadlines. Custom reminders can also be configured per individual contract.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                Save Signal Intervals
              </button>
            </div>
          </form>
        )}

        {/* Import & Export Tab */}
        {activeTab === 'importexport' && (
          <div className="space-y-6">
            {importFeedback && (
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                  importFeedback.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {importFeedback.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div className="flex-1 font-medium">
                  {importFeedback.message}
                </div>
                <button
                  type="button"
                  onClick={() => setImportFeedback(null)}
                  className="text-xs opacity-60 hover:opacity-100 cursor-pointer font-bold px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Export Section */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Export Your Data
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export all your contracts and history for Excel, Google Sheets, or personal archiving.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                  <span>Export CSV Spreadsheet</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-slate-500" />
                  <span>Full JSON Database Backup</span>
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Import Contracts (CSV or JSON)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Batch import contracts from external spreadsheets or restore from an earlier JSON backup.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="settingsPageImportMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-indigo-600 focus:ring-0"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Merge</strong> (keep existing contracts)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="settingsPageImportMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-indigo-600 focus:ring-0"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Replace</strong> (overwrite all data)
                  </span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>Upload CSV or JSON File</span>
                  <input
                    type="file"
                    accept=".csv, .json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Blank CSV Template</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Sync & Demo Data Tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            {/* Calendar Synchronization */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Calendar Synchronization (.ics)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export all active cancellation deadlines and automated advance notification alarms to Apple Calendar, Google Calendar, or Microsoft Outlook.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => downloadICS(contracts)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Download Calendar Feed (.ics)</span>
                </button>
              </div>
            </div>

            {/* Demo Contracts Management */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Demo Contracts Management
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verwijder voorbeeldcontracten of zet ze op elk gewenst moment terug.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('demodata')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Volledig demo beheer bekijken →
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Status:{' '}
                  <strong>
                    {hasDemo
                      ? `${demoCount} demo contracten geladen`
                      : 'Geen demo contracten momenteel geladen'}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onRemoveDemoData}
                    disabled={!hasDemo || isDemoActionRunning}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Demo Verwijderen</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRestoreDemoData}
                    disabled={isDemoActionRunning}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isDemoActionRunning ? 'animate-spin' : ''}`} />
                    <span>Demo Terugzetten</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <span>Permanent Account & Data Erasure (GDPR)</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-900/80 dark:text-rose-300">
                This action permanently deletes all contracts, document links, categories, price history, and notification tokens from your local workspace. This action cannot be reversed.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('importexport')}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Backup First</span>
              </button>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Type <strong>DELETE</strong> to confirm permanent erasure:
              </label>
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type DELETE"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-rose-600 uppercase focus:outline-rose-500"
                />
                <button
                  disabled={deleteConfirmationText.trim() !== 'DELETE' || isDeletingAccount}
                  onClick={handleDeleteAccountConfirm}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>{isDeletingAccount ? 'Deleting account...' : 'Confirm Erasure'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
