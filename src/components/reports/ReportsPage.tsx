import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Contract, Category, DocumentLink } from '../../types';
import {
  formatCurrency,
  formatDate,
  getDaysRemaining,
  getUrgencyLevel,
  getUrgencyMetadata,
} from '../../lib/dateUtils';
import { exportContractsToCSV } from '../../lib/csvHelper';
import { generatePortfolioPDF, exportPDFReport, isAppleTouchDevice } from '../../lib/pdfReportGenerator';
import { downloadPrintableHTML } from '../../lib/htmlReportGenerator';
import { exportFile } from '../../lib/fileExportHelper';
import {
  Zap,
  Wifi,
  ShieldCheck,
  Home,
  Car,
  CreditCard,
  Landmark,
  Layers,
  FileSpreadsheet,
  Printer,
  Download,
  ExternalLink,
  FileText,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  Building2,
  Phone,
  Mail,
  Globe,
  Calendar,
  ArrowLeft,
  HardDrive,
  FolderLock,
  Plus,
  SlidersHorizontal,
  CheckCircle2,
  X,
  FileDown,
  Share2,
  Tablet,
  Eye,
  EyeOff,
  Key,
  Lock,
  Loader2,
  Copy,
  Check,
  User as UserIcon,
  Users,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Zap,
  Wifi,
  ShieldCheck,
  Home,
  Car,
  CreditCard,
  Landmark,
  Layers,
};

export const ReportsPage: React.FC = () => {
  const {
    contracts,
    categories,
    user,
    setCurrentPage,
    setSelectedContractId,
    setEditingContract,
    setIsAddModalOpen,
  } = useApp();

  // Local report filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'urgent' | 'expired'>('all');
  const [coverageFilter, setCoverageFilter] = useState<'all' | 'family' | 'individual'>('all');
  const [docsOnly, setDocsOnly] = useState(false);
  const [categorySortBy, setCategorySortBy] = useState<'name' | 'spend' | 'count'>('name');

  // Collapsed state per category
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Print & PDF modal state
  const [isIpadViewerOpen, setIsIpadViewerOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [printStatusMessage, setPrintStatusMessage] = useState<string | null>(null);
  const [pdfPreviewData, setPdfPreviewData] = useState<{
    blob: Blob;
    blobUrl: string;
    dataUri: string;
    filename: string;
  } | null>(null);
  const [csvExportData, setCsvExportData] = useState<{
    blob: Blob;
    blobUrl: string;
    rawText: string;
    filename: string;
    count: number;
  } | null>(null);
  const [csvCopied, setCsvCopied] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedCredKey, setCopiedCredKey] = useState<string | null>(null);

  const togglePasswordVisibility = (contractId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [contractId]: !prev[contractId],
    }));
  };

  const copyCredentialText = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCredKey(key);
    setTimeout(() => {
      setCopiedCredKey(null);
    }, 2000);
  };

  const isAppleTouch = useMemo(() => isAppleTouchDevice(), []);

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleExpandAll = () => {
    setCollapsedCategories({});
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    categories.forEach((cat) => {
      allCollapsed[cat.id] = true;
    });
    setCollapsedCategories(allCollapsed);
  };

  // Direct PDF Download / iPad Share Handler
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    setPrintStatusMessage('Generating PDF dossier...');
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
        setPrintStatusMessage('PDF saved / shared via iPad Share Sheet!');
      } else if (result.isIpad) {
        // Automatically open the viewer on iPad so the user sees the PDF right away
        setIsIpadViewerOpen(true);
        setPrintStatusMessage('PDF ready! View or save to Files.');
      } else {
        setPrintStatusMessage('PDF downloaded successfully!');
      }
    } catch (err: any) {
      console.error('PDF error:', err);
      // Fallback to HTML printable report if canvas/PDF error
      downloadPrintableHTML(filteredContracts.length > 0 ? filteredContracts : contracts, categories, user);
      setPrintStatusMessage('Generated printable report.');
    } finally {
      setIsGeneratingPDF(false);
      setTimeout(() => setPrintStatusMessage(null), 4500);
    }
  };

  // Trigger iPad Share Sheet on existing or freshly generated PDF
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
          setPrintStatusMessage('Saved / shared via iPad!');
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

  // CSV Export handler with iPad and Safari support
  const handleExportCSV = async () => {
    const activeOrFiltered = filteredContracts.length > 0 ? filteredContracts : contracts;
    const csvStr = exportContractsToCSV(activeOrFiltered);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `contractwatch-portfolio-report-${dateStr}.csv`;

    const res = await exportFile({
      filename,
      content: csvStr,
      mimeType: 'text/csv;charset=utf-8;',
      title: 'ContractWatch Portfolio CSV Export',
    });

    setCsvExportData({
      filename,
      blobUrl: res.blobUrl,
      rawText: csvStr,
      blob: res.blob,
      count: activeOrFiltered.length,
    });

    if (res.shared) {
      setPrintStatusMessage('CSV saved / shared via iPad!');
    } else if (res.isIpad) {
      // Automatically open the CSV options modal on iPad
      setIsCsvModalOpen(true);
      setPrintStatusMessage('CSV ready! Tap to save or open in Numbers.');
    } else {
      setPrintStatusMessage('CSV exported successfully!');
    }

    setTimeout(() => setPrintStatusMessage(null), 4500);
  };

  // Trigger iPad Share Sheet on existing CSV
  const handleShareCsvOnIpad = async () => {
    try {
      if (csvExportData && navigator.share) {
        const file = new File([csvExportData.blob], csvExportData.filename, { type: 'text/csv' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
          });
          setPrintStatusMessage('CSV shared / saved via iPad!');
          return;
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('CSV share error:', e);
      }
    }
  };

  // Copy CSV to clipboard
  const handleCopyCsv = () => {
    if (csvExportData?.rawText) {
      navigator.clipboard.writeText(csvExportData.rawText);
      setCsvCopied(true);
      setTimeout(() => setCsvCopied(false), 2500);
    }
  };

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Category filter
      if (selectedCategoryFilter !== 'all' && c.categoryId !== selectedCategoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && c.status !== 'active') return false;
      if (statusFilter === 'expired' && c.status !== 'expired') return false;
      if (statusFilter === 'urgent') {
        if (c.status !== 'active') return false;
        const days = getDaysRemaining(c.cancellationDeadline);
        if (days < 0 || days > 30) return false;
      }

      // Coverage scope filter ('all', 'family', 'individual')
      if (coverageFilter === 'family' && c.coverageType !== 'family') return false;
      if (coverageFilter === 'individual' && c.coverageType !== 'individual') return false;

      // Documents only filter
      if (docsOnly && (!c.documentLinks || c.documentLinks.length === 0)) {
        return false;
      }

      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchSupplier = c.supplier.toLowerCase().includes(q);
        const matchNumber = (c.contractNumber || '').toLowerCase().includes(q);
        const matchSubcat = (c.subcategory || '').toLowerCase().includes(q);
        const matchNotes = (c.notes || '').toLowerCase().includes(q);
        const matchDocs = (c.documentLinks || []).some(
          (d) => d.title.toLowerCase().includes(q) || (d.note && d.note.toLowerCase().includes(q))
        );
        if (!matchName && !matchSupplier && !matchNumber && !matchSubcat && !matchNotes && !matchDocs) {
          return false;
        }
      }

      return true;
    });
  }, [contracts, selectedCategoryFilter, statusFilter, coverageFilter, docsOnly, searchQuery]);

  // Aggregate stats across all contracts
  const totalActiveContracts = contracts.filter((c) => c.status === 'active');
  const totalAnnualSpend = totalActiveContracts.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const totalMonthlySpend = totalActiveContracts.reduce((sum, c) => sum + (c.monthlyCost || 0), 0);
  const totalDocuments = contracts.reduce((sum, c) => sum + (c.documentLinks?.length || 0), 0);

  // Coverage Breakdown
  const familyContracts = contracts.filter((c) => c.coverageType === 'family');
  const individualContracts = contracts.filter((c) => c.coverageType === 'individual');
  const familyActiveSpend = totalActiveContracts
    .filter((c) => c.coverageType === 'family')
    .reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const individualActiveSpend = totalActiveContracts
    .filter((c) => c.coverageType === 'individual')
    .reduce((sum, c) => sum + (c.annualCost || 0), 0);

  const urgentContractsCount = totalActiveContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days >= 0 && days <= 30;
  }).length;

  const overdueContractsCount = totalActiveContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days < 0;
  }).length;

  // Cancellation Radar Horizons Breakdown
  const overdueContractsList = totalActiveContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days < 0;
  });
  const next30ContractsList = totalActiveContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days >= 0 && days <= 30;
  });
  const days31to90ContractsList = totalActiveContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days > 30 && days <= 90;
  });
  const laterContractsList = totalActiveContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days > 90;
  });

  const overdueSpendTotal = overdueContractsList.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const next30SpendTotal = next30ContractsList.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const days31to90SpendTotal = days31to90ContractsList.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const laterSpendTotal = laterContractsList.reduce((sum, c) => sum + (c.annualCost || 0), 0);

  const priorityActionContracts = [...overdueContractsList, ...next30ContractsList].sort((a, b) =>
    (a.cancellationDeadline || '').localeCompare(b.cancellationDeadline || '')
  );

  // Group filtered contracts by category
  const categoriesWithContracts = useMemo(() => {
    return categories
      .map((cat) => {
        const catContracts = filteredContracts.filter((c) => c.categoryId === cat.id);

        // Sort contracts inside category by subcategory (A-Z) and then contract name (A-Z)
        const sortedCatContracts = [...catContracts].sort((a, b) => {
          const subA = (a.subcategory || 'General').trim();
          const subB = (b.subcategory || 'General').trim();
          const subComp = subA.localeCompare(subB, undefined, { sensitivity: 'base' });
          if (subComp !== 0) return subComp;
          return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });

        // Group into subcategory blocks, preserving alphabetical subcategory order
        const subcategoryMap = new Map<string, Contract[]>();
        sortedCatContracts.forEach((contract) => {
          const sub = (contract.subcategory || 'General').trim();
          if (!subcategoryMap.has(sub)) {
            subcategoryMap.set(sub, []);
          }
          subcategoryMap.get(sub)!.push(contract);
        });

        const subcategoryGroups = Array.from(subcategoryMap.entries()).map(([subcategoryName, subContracts]) => ({
          subcategoryName,
          contracts: subContracts,
          activeCount: subContracts.filter((c) => c.status === 'active').length,
          annualSpend: subContracts
            .filter((c) => c.status === 'active')
            .reduce((sum, c) => sum + (c.annualCost || 0), 0),
          monthlySpend: subContracts
            .filter((c) => c.status === 'active')
            .reduce((sum, c) => sum + (c.monthlyCost || 0), 0),
        }));

        const activeCatContracts = catContracts.filter((c) => c.status === 'active');
        const catAnnualSpend = activeCatContracts.reduce((sum, c) => sum + (c.annualCost || 0), 0);
        const catMonthlySpend = activeCatContracts.reduce((sum, c) => sum + (c.monthlyCost || 0), 0);
        const catDocsCount = catContracts.reduce((sum, c) => sum + (c.documentLinks?.length || 0), 0);
        const spendPercentage = totalAnnualSpend > 0 ? (catAnnualSpend / totalAnnualSpend) * 100 : 0;

        return {
          category: cat,
          contracts: sortedCatContracts,
          subcategoryGroups,
          activeCount: activeCatContracts.length,
          totalCount: catContracts.length,
          annualSpend: catAnnualSpend,
          monthlySpend: catMonthlySpend,
          docsCount: catDocsCount,
          spendPercentage,
        };
      })
      .filter((item) => item.totalCount > 0 || selectedCategoryFilter === item.category.id)
      .sort((a, b) => {
        if (categorySortBy === 'spend') {
          return b.annualSpend - a.annualSpend;
        }
        if (categorySortBy === 'count') {
          return b.totalCount - a.totalCount;
        }
        return a.category.name.localeCompare(b.category.name, undefined, { sensitivity: 'base' });
      });
  }, [categories, filteredContracts, totalAnnualSpend, categorySortBy, selectedCategoryFilter]);

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Radar Overview</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {printStatusMessage && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{printStatusMessage}</span>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Export CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            title="Export portfolio report as vector PDF"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>Export PDF (Landscape)</span>
          </button>
        </div>
      </div>

      {/* Main Report Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Contract Portfolio & Documents Report
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Complete category-by-category overview with notice deadlines, supplier contacts, and attached document archives.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 print:text-black">
            <span>Report generated:</span>
            <strong className="font-mono text-slate-700 dark:text-slate-300">
              {formatDate(new Date().toISOString().split('T')[0])}
            </strong>
          </div>
        </div>

        {/* Executive KPI Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total Annual Spend
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(totalAnnualSpend, user.settings.currency)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              ~{formatCurrency(totalMonthlySpend, user.settings.currency)} / mo
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total Contracts
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {contracts.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {totalActiveContracts.length} active · {contracts.length - totalActiveContracts.length} inactive
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40">
            <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
              Notice Window (≤30d)
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {urgentContractsCount}
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
              Requires renewal action
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Overdue Notice
            </div>
            <div className={`text-lg sm:text-xl font-bold font-mono mt-0.5 ${overdueContractsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {overdueContractsCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {overdueContractsCount > 0 ? 'Auto-renewal risk' : 'Zero overdue deadlines'}
            </div>
          </div>
        </div>

        {/* Spend Distribution Bar by Category */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Portfolio Spend Allocation by Category:
            </span>
            <span className="font-mono text-slate-400">
              100% = {formatCurrency(totalAnnualSpend, user.settings.currency)}
            </span>
          </div>

          {/* Color bar */}
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
            {categoriesWithContracts.map((item) => {
              if (item.annualSpend <= 0) return null;
              return (
                <div
                  key={item.category.id}
                  style={{
                    width: `${Math.max(item.spendPercentage, 1)}%`,
                    backgroundColor: item.category.color,
                  }}
                  title={`${item.category.name}: ${formatCurrency(item.annualSpend, user.settings.currency)} (${item.spendPercentage.toFixed(1)}%)`}
                  className="h-full transition-all hover:opacity-85"
                />
              );
            })}
          </div>

          {/* Category color legend (unboxed text separators per frontend-design) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-600 dark:text-slate-400">
            {categoriesWithContracts.map((item) => {
              if (item.annualSpend <= 0) return null;
              return (
                <div key={item.category.id} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.category.color }}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.category.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({item.spendPercentage.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>

          {/* Family vs Individual Coverage Split */}
          <div className="mt-4 pt-3.5 border-t border-dashed border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <span>Coverage Scope Distribution:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="font-semibold">Family:</span>
                <span>{familyContracts.length} {familyContracts.length === 1 ? 'contract' : 'contracts'}</span>
                <span className="font-mono text-[11px] text-purple-600/80 dark:text-purple-400/80">
                  ({formatCurrency(familyActiveSpend, user.settings.currency)}/yr)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold">Individual:</span>
                <span>{individualContracts.length} {individualContracts.length === 1 ? 'contract' : 'contracts'}</span>
                <span className="font-mono text-[11px] text-blue-600/80 dark:text-blue-400/80">
                  ({formatCurrency(individualActiveSpend, user.settings.currency)}/yr)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Radar Overview & Notice Horizons */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Cancellation Radar Overview</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {totalActiveContracts.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Notice deadlines and auto-renewal horizons · Matches the executive PDF report radar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Reset Radar Filter
              </button>
            )}
          </div>
        </div>

        {/* 4 Radar Horizon Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {/* Horizon 1: Overdue */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
              statusFilter === 'expired'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
                : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800'
            }`}
          >
            <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
              <span className="text-[11px] font-bold uppercase tracking-wider">1. Overdue Notice</span>
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {overdueContractsList.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {formatCurrency(overdueSpendTotal, user.settings.currency)} / yr
            </div>
            <div className="text-[10px] text-rose-700 dark:text-rose-300 font-medium mt-1">
              {overdueContractsList.length > 0 ? 'Auto-renewal risk · Action required' : 'Zero overdue deadlines'}
            </div>
          </button>

          {/* Horizon 2: Next 30 Days */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'urgent' ? 'all' : 'urgent')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
              statusFilter === 'urgent'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-800'
            }`}
          >
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="text-[11px] font-bold uppercase tracking-wider">2. Next 30 Days</span>
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {next30ContractsList.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {formatCurrency(next30SpendTotal, user.settings.currency)} / yr
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-1">
              {next30ContractsList.length > 0 ? 'Immediate notice action window' : 'Zero upcoming deadlines'}
            </div>
          </button>

          {/* Horizon 3: 31–90 Days */}
          <div className="p-3.5 rounded-xl border bg-yellow-50/30 dark:bg-yellow-950/20 border-yellow-200/70 dark:border-yellow-900/40 text-left">
            <div className="flex items-center justify-between text-yellow-800 dark:text-yellow-300">
              <span className="text-[11px] font-bold uppercase tracking-wider">3. 31–90 Days</span>
              <Calendar className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-yellow-700 dark:text-yellow-400 mt-1">
              {days31to90ContractsList.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {formatCurrency(days31to90SpendTotal, user.settings.currency)} / yr
            </div>
            <div className="text-[10px] text-yellow-700 dark:text-yellow-300 font-medium mt-1">
              Upcoming renewal decisions
            </div>
          </div>

          {/* Horizon 4: Safe >90 Days */}
          <div className="p-3.5 rounded-xl border bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40 text-left">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span className="text-[11px] font-bold uppercase tracking-wider">4. Safe Horizon (&gt;90d)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {laterContractsList.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {formatCurrency(laterSpendTotal, user.settings.currency)} / yr
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium mt-1">
              Monitored & secure commitments
            </div>
          </div>
        </div>

        {/* Priority Action Watchlist */}
        {priorityActionContracts.length > 0 ? (
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Radar Action Queue: Contracts Requiring Notice Attention ({priorityActionContracts.length})</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Sorted by nearest notice deadline
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {priorityActionContracts.map((contract) => {
                const days = getDaysRemaining(contract.cancellationDeadline);
                const isOverdue = days < 0;

                return (
                  <div
                    key={contract.id}
                    className="p-3.5 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                          isOverdue ? 'bg-rose-500 ring-2 ring-rose-200' : 'bg-amber-500 ring-2 ring-amber-200'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {contract.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {isOverdue ? `${Math.abs(days)}d Overdue` : `${days}d left — Action Required`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{contract.supplier}</span>
                          <span>·</span>
                          <span>{contract.subcategory || 'General'}</span>
                          <span>·</span>
                          <span>Notice: {contract.noticePeriod.value} {contract.noticePeriod.unit}</span>
                          <span>·</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Deadline: {formatDate(contract.cancellationDeadline)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(contract.annualCost, user.settings.currency)}/yr
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ~{formatCurrency(contract.monthlyCost, user.settings.currency)}/mo
                        </div>
                      </div>

                      {contract.credentials?.url && (
                        <a
                          href={contract.credentials.url.startsWith('http') ? contract.credentials.url : `https://${contract.credentials.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-semibold transition"
                          title="Open login portal directly"
                        >
                          <span>Login</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedContractId(contract.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                      >
                        Dossier
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-5 p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>All active commitments are secure.</strong> Zero contracts currently overdue or in the 30-day notice window.
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Radar status: Clear horizon
            </span>
          </div>
        )}
      </div>

      {/* Filter and View Controls Bar (hidden during print) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report by contract, supplier, or document..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Filter buttons & dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Categories ({contracts.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="urgent">Action Required (≤30d)</option>
            <option value="expired">Expired / Cancelled</option>
          </select>

          {/* Coverage Scope Filter: Family / Individual / All */}
          <select
            value={coverageFilter}
            onChange={(e) => setCoverageFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
            aria-label="Filter by coverage scope"
          >
            <option value="all">Coverage: All ({contracts.length})</option>
            <option value="family">Family ({familyContracts.length})</option>
            <option value="individual">Individual ({individualContracts.length})</option>
          </select>

          {/* Has Documents checkbox toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={docsOnly}
              onChange={(e) => setDocsOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span>With Documents ({totalDocuments})</span>
          </label>

          {/* Sort Categories By */}
          <select
            value={categorySortBy}
            onChange={(e) => setCategorySortBy(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
            aria-label="Sort reports overview"
          >
            <option value="name">Sort: Category & Subcategory (A-Z)</option>
            <option value="spend">Sort: Highest Spend</option>
            <option value="count">Sort: Most Contracts</option>
          </select>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
            <button
              onClick={handleExpandAll}
              className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={handleCollapseAll}
              className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Categories Report Feed (Sorted per category) */}
      <div className="space-y-6">
        {categoriesWithContracts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              No contracts matched your report filter
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Try clearing your search query or setting the category filter to all.
            </p>
          </div>
        ) : (
          categoriesWithContracts.map((item) => {
            const isCollapsed = !!collapsedCategories[item.category.id];
            const CategoryIcon = iconMap[item.category.icon] || Layers;

            return (
              <section
                key={item.category.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all"
              >
                {/* Category Header Bar */}
                <div
                  onClick={() => toggleCategoryCollapse(item.category.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition gap-3"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.category.color }}
                    >
                      <CategoryIcon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {item.category.name}
                        </h2>
                        <span className="text-xs text-slate-400">
                          ({item.contracts.length} contract{item.contracts.length === 1 ? '' : 's'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{item.activeCount} active</span>
                        <span>·</span>
                        <span>{item.docsCount} document{item.docsCount === 1 ? '' : 's'} linked</span>
                      </div>
                    </div>
                  </div>

                  {/* Category Spend & Actions */}
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                        {formatCurrency(item.annualSpend, user.settings.currency)}
                        <span className="text-xs text-slate-400 font-normal"> / yr</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        ~{formatCurrency(item.monthlySpend, user.settings.currency)} / mo
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contracts List inside Category */}
                {!isCollapsed && (
                  <div>
                    {item.contracts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No contracts in this category matching the current filter.
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {item.subcategoryGroups.map((subGroup) => (
                          <div
                            key={subGroup.subcategoryName}
                            className="border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                          >
                            {/* Subcategory Header Banner */}
                            <div className="px-5 py-2.5 bg-slate-50/75 dark:bg-slate-850/50 border-t first:border-t-0 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {subGroup.subcategoryName}
                                </span>
                                <span className="text-[11px] font-normal text-slate-400">
                                  ({subGroup.contracts.length} {subGroup.contracts.length === 1 ? 'contract' : 'contracts'})
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {formatCurrency(subGroup.annualSpend, user.settings.currency)} / yr
                              </div>
                            </div>

                            {/* Contracts under this subcategory */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {subGroup.contracts.map((contract) => {
                                const daysRemaining = getDaysRemaining(contract.cancellationDeadline);
                                const urgency = getUrgencyLevel(contract.cancellationDeadline, contract.status);
                                const urgencyMeta = getUrgencyMetadata(urgency, daysRemaining);
                                const hasDocs = contract.documentLinks && contract.documentLinks.length > 0;

                                return (
                          <div
                            key={contract.id}
                            className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition flex flex-col lg:flex-row lg:items-start justify-between gap-5"
                          >
                            {/* Left Column: Contract Details & Terms */}
                            <div className="flex-1 min-w-0 space-y-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <button
                                    onClick={() => setSelectedContractId(contract.id)}
                                    className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer text-left"
                                  >
                                    {contract.name}
                                  </button>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    contract.status === 'active'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}>
                                    {contract.status.toUpperCase()}
                                  </span>
                                  {contract.coverageType && (
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        contract.coverageType === 'family'
                                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50'
                                          : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50'
                                      }`}
                                    >
                                      {contract.coverageType === 'family' ? (
                                        <>
                                          <Users className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                                          <span>Family</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserIcon className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                                          <span>Individual</span>
                                        </>
                                      )}
                                    </span>
                                  )}
                                </div>

                                {/* Unboxed Metadata line: Supplier · Subcategory · Contract # */}
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{contract.supplier}</span>
                                  </span>
                                  <span>·</span>
                                  <span>{contract.subcategory}</span>
                                  {contract.contractNumber && (
                                    <>
                                      <span>·</span>
                                      <span className="font-mono text-slate-400">
                                        Ref: {contract.contractNumber}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Dates & Notice Deadline Breakdown */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                    Notice Deadline
                                  </span>
                                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                    {formatDate(contract.cancellationDeadline)}
                                  </div>
                                  <div className={`text-[11px] font-semibold mt-0.5 ${urgencyMeta.textClass}`}>
                                    {daysRemaining < 0
                                      ? `${Math.abs(daysRemaining)} days overdue`
                                      : daysRemaining === 0
                                      ? 'Due today!'
                                      : `${daysRemaining} days remaining`}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                    Contract Duration
                                  </span>
                                  <div className="text-slate-700 dark:text-slate-300 mt-0.5">
                                    {contract.startDate ? formatDate(contract.startDate) : '—'} →{' '}
                                    {contract.isEndDateOpenEnded
                                      ? 'Open-ended'
                                      : contract.endDate
                                      ? formatDate(contract.endDate)
                                      : 'Rolling'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    Notice period: {contract.noticePeriod.value} {contract.noticePeriod.unit}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                    Renewal Policy
                                  </span>
                                  <div className="text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                                    {contract.autoRenew ? 'Automatic rollover' : 'Manual expiration'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                    {contract.renewalPeriod || '1 month rolling'}
                                  </div>
                                </div>
                              </div>

                              {/* Document Links Section (All associated document links) */}
                              <div className="pt-1">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Attached Documents ({contract.documentLinks?.length || 0}):</span>
                                  </span>
                                </div>

                                {hasDocs ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {contract.documentLinks.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                            {doc.provider === 'nas' ? (
                                              <HardDrive className="w-3.5 h-3.5" />
                                            ) : doc.provider === 'onedrive' ? (
                                              <FolderLock className="w-3.5 h-3.5" />
                                            ) : (
                                              <FileText className="w-3.5 h-3.5" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                              {doc.title}
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                              <span className="capitalize">{doc.type}</span>
                                              <span>·</span>
                                              <span className="uppercase font-mono">{doc.provider}</span>
                                              {doc.note && (
                                                <>
                                                  <span>·</span>
                                                  <span className="text-amber-600 dark:text-amber-400 truncate max-w-[120px]">
                                                    {doc.note}
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <a
                                          href={doc.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold text-[11px] shrink-0 transition"
                                        >
                                          <span>Open</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-400 flex items-center justify-between">
                                    <span>No documents attached to this contract yet.</span>
                                    <button
                                      onClick={() => setSelectedContractId(contract.id)}
                                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                    >
                                      + Attach Document
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Supplier Contact Shortcuts */}
                              {(contract.contact.phone || contract.contact.email || contract.contact.url) && (
                                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                                  {contract.contact.phone && (
                                    <a
                                      href={`tel:${contract.contact.phone}`}
                                      className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      <span>{contract.contact.phone}</span>
                                    </a>
                                  )}
                                  {contract.contact.email && (
                                    <a
                                      href={`mailto:${contract.contact.email}`}
                                      className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                      <Mail className="w-3 h-3 text-slate-400" />
                                      <span>{contract.contact.email}</span>
                                    </a>
                                  )}
                                  {contract.contact.url && (
                                    <a
                                      href={contract.contact.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                      <Globe className="w-3 h-3 text-slate-400" />
                                      <span>Customer Portal</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Login Credentials Section (Website login link, username, password) */}
                              {contract.credentials && (contract.credentials.url || contract.credentials.username || contract.credentials.password) ? (
                                <div className="mt-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                                  <div className="flex items-center justify-between gap-2 mb-2 font-semibold text-slate-700 dark:text-slate-300">
                                    <div className="flex items-center gap-1.5">
                                      <Key className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>Login Credentials & Account Portal:</span>
                                    </div>
                                    {contract.credentials.url && (
                                      <a
                                        href={contract.credentials.url.startsWith('http') ? contract.credentials.url : `https://${contract.credentials.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-semibold text-[11px] transition"
                                      >
                                        <span>Open Login Portal</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {/* Portal Link */}
                                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 min-w-0">
                                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                        Login Website / Link
                                      </span>
                                      {contract.credentials.url ? (
                                        <div className="flex items-center justify-between gap-1 mt-0.5">
                                          <a
                                            href={contract.credentials.url.startsWith('http') ? contract.credentials.url : `https://${contract.credentials.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                                            title={contract.credentials.url}
                                          >
                                            {contract.credentials.url}
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => copyCredentialText(contract.credentials!.url!, `${contract.id}-url`)}
                                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                                            title="Copy login URL"
                                          >
                                            {copiedCredKey === `${contract.id}-url` ? (
                                              <Check className="w-3 h-3 text-emerald-500" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-400 italic mt-0.5 block">—</span>
                                      )}
                                    </div>

                                    {/* Username */}
                                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 min-w-0">
                                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                        Username / Email
                                      </span>
                                      {contract.credentials.username ? (
                                        <div className="flex items-center justify-between gap-1 mt-0.5">
                                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                                            {contract.credentials.username}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => copyCredentialText(contract.credentials!.username!, `${contract.id}-user`)}
                                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                                            title="Copy username"
                                          >
                                            {copiedCredKey === `${contract.id}-user` ? (
                                              <Check className="w-3 h-3 text-emerald-500" />
                                            ) : (
                                              <Copy className="w-3 h-3" />
                                            )}
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-400 italic mt-0.5 block">—</span>
                                      )}
                                    </div>

                                    {/* Password */}
                                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 min-w-0">
                                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                        Password
                                      </span>
                                      {contract.credentials.password ? (
                                        <div className="flex items-center justify-between gap-1 mt-0.5">
                                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">
                                            {visiblePasswords[contract.id] === false ? '••••••••••••' : contract.credentials.password}
                                          </span>
                                          <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => togglePasswordVisibility(contract.id)}
                                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                                              title={visiblePasswords[contract.id] === false ? 'Show password' : 'Hide password'}
                                            >
                                              {visiblePasswords[contract.id] === false ? (
                                                <Eye className="w-3 h-3" />
                                              ) : (
                                                <EyeOff className="w-3 h-3" />
                                              )}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => copyCredentialText(contract.credentials!.password!, `${contract.id}-pass`)}
                                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                                              title="Copy password"
                                            >
                                              {copiedCredKey === `${contract.id}-pass` ? (
                                                <Check className="w-3 h-3 text-emerald-500" />
                                              ) : (
                                                <Copy className="w-3 h-3" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-400 italic mt-0.5 block">—</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            {/* Right Column: Pricing & Actions */}
                            <div className="flex lg:flex-col items-end justify-between lg:justify-start gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                              <div className="text-right">
                                <div className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white">
                                  {formatCurrency(contract.annualCost, user.settings.currency)}
                                  <span className="text-xs text-slate-400 font-normal"> / yr</span>
                                </div>
                                <div className="text-xs text-slate-500 font-mono">
                                  ~{formatCurrency(contract.monthlyCost, user.settings.currency)} / mo
                                </div>
                                <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                                  Billed {contract.paymentFrequency}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 print:hidden">
                                <button
                                  onClick={() => setSelectedContractId(contract.id)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition cursor-pointer"
                                >
                                  View Dossier
                                </button>
                                <button
                                  onClick={() => setEditingContract(contract)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

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
                    Identical landscape report layout across all iOS, iPadOS and desktop browsers
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
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF View & Guidance */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
              {/* Instructions banner for iPhone and iPad users */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Share2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">iPhone & iPad Instructions:</strong>{' '}
                  This report is created with the exact same vector landscape format and layout. The first page presents the full Radar Overview contract roster, followed by the detailed portfolio subreport. Tap <span className="font-semibold text-indigo-700 dark:text-indigo-300">"Save to Files / Share"</span> above to save directly into Files (iCloud Drive / On My Device), share via AirDrop, or print via AirPrint. You can also use the direct download link below.
                </div>
              </div>

              {/* Embedded PDF iframe */}
              <div className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 min-h-[480px]">
                <iframe
                  src={pdfPreviewData.blobUrl}
                  className="w-full h-full min-h-[480px]"
                  title="PDF Report Preview"
                />
              </div>

              {/* Bottom Quick Download link */}
              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <span className="font-mono text-[11px] truncate max-w-xs">{pdfPreviewData.filename}</span>
                <a
                  href={pdfPreviewData.blobUrl}
                  download={pdfPreviewData.filename}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Direct download link (.pdf)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iPad / Tablet CSV Export & Share Modal */}
      {isCsvModalOpen && csvExportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    CSV Spreadsheet Export (iPad)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Open in Apple Numbers, Excel, or save to Files
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Guidance for iPad users */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <Share2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">iPad Instructions:</strong>{' '}
                  Tap <span className="font-semibold text-emerald-700 dark:text-emerald-300">"Save to Files / Numbers / Excel"</span> to open the file directly in Numbers, Excel, or save to iCloud Drive.
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleShareCsvOnIpad}
                  className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col justify-between gap-2 text-left transition cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Share2 className="w-4 h-4" />
                    <span>Save to Files / Numbers</span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-tight">
                    Opens the iOS share sheet to save or open directly in Numbers / Excel.
                  </p>
                </button>

                <button
                  onClick={handleCopyCsv}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 flex flex-col justify-between gap-2 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                    {csvCopied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-500" />
                    )}
                    <span>{csvCopied ? 'Copied to clipboard!' : 'Copy CSV data'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Copy all {csvExportData.count} rows and paste directly into Google Sheets or Excel.
                  </p>
                </button>
              </div>

              {/* Direct link fallback */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
                  {csvExportData.filename}
                </span>
                <a
                  href={csvExportData.blobUrl}
                  download={csvExportData.filename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                >
                  <Download className="w-3 h-3" />
                  <span>Download file</span>
                </a>
              </div>

              {/* Data preview snippet */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Sample CSV Data ({csvExportData.count} contracts):
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-28 whitespace-pre leading-relaxed">
                  {csvExportData.rawText.split('\n').slice(0, 4).join('\n')}
                  {csvExportData.rawText.split('\n').length > 4 && '\n...'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
