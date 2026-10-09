import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { downloadICS } from '../../lib/icsExport';
import {
  exportContractsToCSV,
  getCSVTemplateString,
  parseCSVToContracts,
} from '../../lib/csvHelper';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    contracts,
    categories,
    user,
    importJSON,
    importCSVContracts,
  } = useApp();

  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importFeedback, setImportFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  // JSON Export
  const handleExportJSON = () => {
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
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contractwatch-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvStr = exportContractsToCSV(contracts);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contractwatch-contracts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const template = getCSVTemplateString();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contractwatch-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              parsed.errors.length > 0 ? `(${parsed.errors.length} skipped rows)` : ''
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
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Data Portability & Calendar Sync
              </h3>
              <p className="text-xs text-slate-500">
                Export, backup, calendar subscription, and batch import.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs sm:text-sm">
          {importFeedback && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 ${
                importFeedback.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {importFeedback.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-medium">{importFeedback.message}</span>
            </div>
          )}

          {/* Section 1: Export */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Export Your Data
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleExportJSON}
                className="flex flex-col items-start p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition cursor-pointer"
              >
                <FileJson className="w-5 h-5 text-indigo-500 mb-2" />
                <span className="font-bold text-slate-900 dark:text-white">Full JSON Backup</span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Complete archive with categories, document links, and settings.
                </span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex flex-col items-start p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition cursor-pointer"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-500 mb-2" />
                <span className="font-bold text-slate-900 dark:text-white">Contracts CSV</span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Spreadsheet format for Excel, Google Sheets, or Numbers.
                </span>
              </button>

              <button
                onClick={() => downloadICS(contracts)}
                className="flex flex-col items-start p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left transition cursor-pointer"
              >
                <Calendar className="w-5 h-5 text-amber-500 mb-2" />
                <span className="font-bold text-slate-900 dark:text-white">Calendar Sync (.ics)</span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Subscribe or import notice alarms into Apple / Google Calendar.
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Import */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Import Contracts (JSON or CSV)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Import previously exported data or populate from an existing spreadsheet.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                Download CSV Template
              </button>
            </div>

            {/* Merge vs Replace Mode */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Import Mode:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="text-indigo-600 focus:ring-0"
                />
                <span>Merge (preserve existing data)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-indigo-600 focus:ring-0"
                />
                <span className="text-rose-600 dark:text-rose-400">Replace (overwrite existing)</span>
              </label>
            </div>

            {/* Upload Box */}
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer">
              <Upload className="w-8 h-8 text-indigo-500 mb-2" />
              <span className="font-semibold text-slate-900 dark:text-white">
                Click to upload JSON or CSV file
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Supports ContractWatch .json backups and standard CSV spreadsheets
              </span>
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
