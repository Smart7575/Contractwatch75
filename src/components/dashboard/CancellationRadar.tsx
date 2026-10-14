import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ContractCard } from '../contracts/ContractCard';
import { TableView } from './TableView';
import { TimelineView } from './TimelineView';
import { RadarKanban } from './RadarKanban';
import { getDaysRemaining, getUrgencyLevel } from '../../lib/dateUtils';
import {
  Search,
  LayoutGrid,
  List,
  Calendar,
  Columns3,
  Plus,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  X,
  ShieldAlert,
  FileDown,
  Loader2,
  Share2,
  ExternalLink,
  Tablet,
  CheckCircle2,
} from 'lucide-react';
import { exportPDFReport } from '../../lib/pdfReportGenerator';

export const CancellationRadar: React.FC = () => {
  const {
    contracts,
    categories,
    user,
    filters,
    setFilters,
    resetFilters,
    viewMode,
    setViewMode,
    setIsAddModalOpen,
    handleRestoreDemoData,
    handleRemoveDemoData,
  } = useApp();

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pdfPreviewData, setPdfPreviewData] = useState<{
    blob: Blob;
    blobUrl: string;
    dataUri: string;
    filename: string;
  } | null>(null);
  const [isIpadViewerOpen, setIsIpadViewerOpen] = useState(false);

  // Direct PDF Export from Radar Overview
  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    setStatusMessage('Generating PDF dossier...');
    try {
      const activeOrFiltered = filteredContracts.length > 0 ? filteredContracts : contracts;
      const result = await exportPDFReport(activeOrFiltered, categories, user);
      
      setPdfPreviewData({
        blob: result.blob,
        blobUrl: result.blobUrl,
        dataUri: result.dataUri,
        filename: result.filename,
      });

      if (result.shared) {
        setStatusMessage('PDF saved / shared via iPad Share Sheet!');
      } else if (result.isIpad) {
        setIsIpadViewerOpen(true);
        setStatusMessage('PDF ready! View or save to Files.');
      } else {
        setStatusMessage('PDF downloaded successfully!');
      }
    } catch (err: any) {
      console.error('PDF error:', err);
      setStatusMessage('Error generating PDF.');
    } finally {
      setIsGeneratingPDF(false);
      setTimeout(() => setStatusMessage(null), 4500);
    }
  };

  const handleShareOnIpad = async () => {
    try {
      let currentBlob = pdfPreviewData?.blob;
      let filename = pdfPreviewData?.filename;

      if (!currentBlob || !filename) {
        setIsGeneratingPDF(true);
        const activeOrFiltered = filteredContracts.length > 0 ? filteredContracts : contracts;
        const res = await exportPDFReport(activeOrFiltered, categories, user);
        currentBlob = res.blob;
        filename = res.filename;
        setPdfPreviewData({
          blob: res.blob,
          blobUrl: res.blobUrl,
          dataUri: res.dataUri,
          filename: res.filename,
        });
      }

      if (navigator.share && currentBlob) {
        const file = new File([currentBlob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
          });
          setStatusMessage('Saved / shared via iOS!');
          return;
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('Share error:', e);
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const hasDemo = contracts.some((c) => c.isDemo || c.id.startsWith('demo_'));

  // Filter & sort logic
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Status filter
      if (filters.status !== 'all' && c.status !== filters.status) {
        return false;
      }

      // Category filter
      if (filters.categoryId !== 'all' && c.categoryId !== filters.categoryId) {
        return false;
      }

      // Coverage filter (family / individual)
      if (filters.coverageType && filters.coverageType !== 'all') {
        if (c.coverageType !== filters.coverageType) {
          return false;
        }
      }

      // Urgency filter
      if (filters.urgency !== 'all') {
        const urgency = getUrgencyLevel(c.cancellationDeadline, c.status);
        if (filters.urgency === 'needs_action') {
          if (urgency !== 'overdue' && urgency !== 'next_30') return false;
        } else if (urgency !== filters.urgency) {
          return false;
        }
      }

      // Search term (matching name, supplier/vendor, category name, subcategory, or number)
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchSupplier = c.supplier.toLowerCase().includes(q);
        const matchNumber = (c.contractNumber || '').toLowerCase().includes(q);
        const matchSubcat = (c.subcategory || '').toLowerCase().includes(q);
        const matchTags = (c.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchNotes = (c.notes || '').toLowerCase().includes(q);
        const cat = categories.find((catItem) => catItem.id === c.categoryId);
        const matchCategory = cat ? cat.name.toLowerCase().includes(q) : false;

        if (
          !matchName &&
          !matchSupplier &&
          !matchCategory &&
          !matchNumber &&
          !matchSubcat &&
          !matchTags &&
          !matchNotes
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'deadline') {
        comparison = (a.cancellationDeadline || '').localeCompare(b.cancellationDeadline || '');
      } else if (filters.sortBy === 'annualCost') {
        comparison = (a.annualCost || 0) - (b.annualCost || 0);
      } else if (filters.sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (filters.sortBy === 'supplier') {
        comparison = a.supplier.localeCompare(b.supplier);
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [contracts, categories, filters]);

  // Urgent count for banner (strictly active with cancellation deadline within 30 days, not overdue)
  const urgentCount = contracts.filter((c) => {
    if (c.status !== 'active') return false;
    const days = getDaysRemaining(c.cancellationDeadline);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <section aria-label="Cancellation Radar">
      {/* Urgent Banner if any contract needs action */}
      {urgentCount > 0 && filters.urgency !== 'next_30' && (
        <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3 mb-2 sm:mb-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold">
                {urgentCount} contract{urgentCount === 1 ? '' : 's'} require immediate notice decision!
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300">
                Cancellation deadlines are due within 30 days. Act now to prevent auto-renewal.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilters({ urgency: 'next_30', status: 'active' })}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Review Urgent Contracts ({urgentCount})
          </button>
        </div>
      )}

      {/* Demo Data Notice Banner */}
      {hasDemo && (
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Demo contracts active:</span> Your workspace is populated with realistic sample data. You can delete these demo contracts at any time or add your own contracts.
            </div>
          </div>
          <button
            onClick={handleRemoveDemoData}
            className="px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-900/60 rounded-lg transition cursor-pointer shrink-0"
          >
            Remove Demo Data (1-Click)
          </button>
        </div>
      )}

      {/* Control Bar: Search, Urgency Tabs, View Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Filter contracts by name, category, or vendor..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Urgency Filter Tabs & View Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Urgency Segmented Buttons */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
            <button
              onClick={() => setFilters({ urgency: 'all' })}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filters.urgency === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilters({ urgency: 'overdue' })}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filters.urgency === 'overdue'
                  ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setFilters({ urgency: 'next_30' })}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filters.urgency === 'next_30'
                  ? 'bg-amber-500 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
              }`}
            >
              ≤ 30 Days
            </button>
            <button
              onClick={() => setFilters({ urgency: '31_90' })}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filters.urgency === '31_90'
                  ? 'bg-yellow-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-yellow-600'
              }`}
            >
              31–90 Days
            </button>
          </div>

          {/* Status selector */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium focus:outline-hidden"
          >
            <option value="active">Active Contracts</option>
            <option value="all">All Statuses</option>
            <option value="cancelled">Cancelled</option>
            <option value="switching">Switching</option>
            <option value="expired">Expired</option>
          </select>

          {/* Scope / Coverage selector */}
          <select
            value={filters.coverageType || 'all'}
            onChange={(e) => setFilters({ coverageType: e.target.value })}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium focus:outline-hidden"
            aria-label="Filter scope"
          >
            <option value="all">All Scopes</option>
            <option value="family">Family</option>
            <option value="individual">Individual</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tabular List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Timeline Roadmap View"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Urgency Columns / Kanban"
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer shrink-0 disabled:opacity-50"
            title="Export Radar Overview & Portfolio PDF report (Landscape)"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Export PDF</span>
          </button>

          {statusMessage && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium animate-in fade-in shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Rendering based on ViewMode */}
      {contracts.length === 0 ? (
        /* Empty State when no contracts at all exist */
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No Contracts Registered Yet
          </h3>
          <p className="max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
            Get started by logging your energy, telecom, insurance, or subscription contracts. We will
            calculate your cancellation deadlines and alert you proactively.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Contract</span>
            </button>
            <button
              onClick={handleRestoreDemoData}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-indigo-500" />
              <span>Load Realistic Demo Data</span>
            </button>
          </div>
        </div>
      ) : filteredContracts.length === 0 ? (
        /* Filter Empty State */
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <SlidersHorizontal className="w-8 h-8 text-slate-400 mb-3" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            No contracts match your current filters
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Try adjusting your search criteria, urgency status, or category selection.
          </p>
          <button
            onClick={resetFilters}
            className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <TableView contracts={filteredContracts} />
      ) : viewMode === 'timeline' ? (
        <TimelineView contracts={filteredContracts} />
      ) : (
        <RadarKanban contracts={filteredContracts} />
      )}

      {/* iPhone & iPad / Tablet Native PDF Viewer & Share Modal */}
      {isIpadViewerOpen && pdfPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Tablet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    PDF Report Dossier (Landscape — iPhone, iPad & Desktop)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Radar Overview contract roster as first page · Identical landscape layout across all devices
                  </p>
                </div>
              </div>

              {/* Action buttons on header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareOnIpad}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  title="Open iOS share sheet (Save to Files / AirDrop / Print)"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Save to Files / Share</span>
                </button>

                <a
                  href={pdfPreviewData.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
                  title="Open in a separate Safari window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Safari</span>
                </a>

                <button
                  onClick={() => setIsIpadViewerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF View & Guidance */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Share2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">iPhone & iPad Instructions:</strong>{' '}
                  This report is created with the exact same vector landscape format and layout. The first page presents the full Radar Overview contract roster, followed by the detailed portfolio subreport. Tap <span className="font-semibold text-indigo-700 dark:text-indigo-300">"Save to Files / Share"</span> above to save directly into Files (iCloud Drive / On My Device), share via AirDrop, or print via AirPrint.
                </div>
              </div>

              {/* Embedded PDF iframe */}
              <div className="flex-1 w-full min-h-[460px] sm:min-h-[540px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner">
                <iframe
                  src={pdfPreviewData.blobUrl}
                  title="ContractWatch Landscape PDF Report Preview"
                  className="w-full h-full border-0"
                />
              </div>

              {/* Direct fallback download link */}
              <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                <span>Filename: <code className="font-mono text-indigo-600 dark:text-indigo-400">{pdfPreviewData.filename}</code></span>
                <a
                  href={pdfPreviewData.blobUrl}
                  download={pdfPreviewData.filename}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Direct Download Link</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
