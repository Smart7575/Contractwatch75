import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Contract, DocumentType, DocumentProvider } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatAutoExtendPeriod,
  getContractAutoExtendPeriod,
  formatContractDuration,
  getDaysRemaining,
  getUrgencyLevel,
  getUrgencyMetadata,
  getCurrencyLabel,
  getEffectiveCancellationDeadline,
} from '../../lib/dateUtils';
import {
  X,
  Edit3,
  Copy,
  Trash2,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  TrendingUp,
  HardDrive,
  FolderLock,
  Plus,
  Bookmark,
  Share2,
  Printer,
  Sparkles,
  Info,
  HelpCircle,
  Key,
  Lock,
  Eye,
  EyeOff,
  Check,
  User as UserIcon,
  Users,
  RotateCw,
} from 'lucide-react';

interface ContractDossierModalProps {
  contract: Contract | null;
  onClose: () => void;
}

export const ContractDossierModal: React.FC<ContractDossierModalProps> = ({
  contract,
  onClose,
}) => {
  const {
    setEditingContract,
    deleteContract,
    duplicateContract,
    rollForwardContract,
    autoExtendContract,
    markContractStatus,
    toggleFavorite,
    addDocumentLink,
    removeDocumentLink,
    addPriceHistory,
    removePriceHistory,
    categories,
    user,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 'costs' | 'letter'
  >('overview');

  // Password visibility & copied state for credentials
  const [showDossierPassword, setShowDossierPassword] = useState(false);
  const [copiedCred, setCopiedCred] = useState<string | null>(null);

  const copyCredential = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCred(label);
    setTimeout(() => setCopiedCred(null), 2000);
  };

  // New Document modal state
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docType, setDocType] = useState<DocumentType>('contract');
  const [docProvider, setDocProvider] = useState<DocumentProvider>('generic');

  // New Price entry state
  const [isAddingPrice, setIsAddingPrice] = useState(false);
  const [priceDate, setPriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [priceAnnual, setPriceAnnual] = useState<number | ''>('');
  const [priceNote, setPriceNote] = useState('');


  // Cancellation letter copied state
  const [copiedLetter, setCopiedLetter] = useState(false);

  // Price history items sorted on effective date with the newer contract / rate first
  const sortedPriceHistory = useMemo(() => {
    if (!contract?.priceHistory) return [];
    return [...contract.priceHistory].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (isNaN(timeA) || isNaN(timeB)) {
        return (b.date || '').localeCompare(a.date || '');
      }
      return timeB - timeA;
    });
  }, [contract?.priceHistory]);

  if (!contract) return null;

  const category = categories.find((c) => c.id === contract.categoryId);
  const effectiveDeadline = getEffectiveCancellationDeadline(contract);
  const daysRemaining = getDaysRemaining(effectiveDeadline);
  const urgency = getUrgencyLevel(effectiveDeadline, contract.status);
  const urgencyMeta = getUrgencyMetadata(urgency, daysRemaining);

  const isAutoExtendActive =
    contract.autoExtendEnabled === true ||
    (user.settings.autoExtendContracts === true &&
      contract.autoExtendEnabled !== false &&
      contract.autoRenew !== false);
  const autoPeriod =
    contract.autoExtendPeriod ||
    user.settings.defaultAutoExtendPeriod ||
    getContractAutoExtendPeriod(contract);

  const potentialSaving =
    contract.alternativeCost && contract.annualCost > contract.alternativeCost
      ? contract.annualCost - contract.alternativeCost
      : 0;

  // Auto detect provider for document URL
  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUrl.trim()) return;

    let detected = docProvider;
    const lower = docUrl.toLowerCase();
    if (lower.startsWith('smb://') || lower.includes('.local') || lower.includes('192.168.')) {
      detected = 'nas';
    } else if (lower.includes('drive.google.com')) {
      detected = 'gdrive';
    } else if (lower.includes('onedrive') || lower.includes('1drv.ms')) {
      detected = 'onedrive';
    } else if (lower.includes('dropbox.com')) {
      detected = 'dropbox';
    }

    addDocumentLink(contract.id, {
      title: docTitle.trim() || 'Document',
      type: docType,
      url: docUrl.trim(),
      provider: detected,
      note: detected === 'nas' ? 'Local network / Synology NAS connection' : undefined,
    });

    setDocTitle('');
    setDocUrl('');
    setIsAddingDoc(false);
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceAnnual) return;
    const annual = Number(priceAnnual);
    addPriceHistory(contract.id, {
      date: priceDate,
      annualCost: annual,
      monthlyCost: Number((annual / 12).toFixed(2)),
      note: priceNote.trim() || 'Rate update',
    });
    setPriceAnnual('');
    setPriceNote('');
    setIsAddingPrice(false);
  };


  // Generate formal cancellation letter content
  const letterBody = `[Your Full Name]
${user.name}
Email: ${user.email}
Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

To:
${contract.supplier}
Customer Service / Cancellations Department
${contract.contact.email ? `Email: ${contract.contact.email}` : ''}

SUBJECT: Formal Notice of Contract Cancellation / Termination
Reference / Customer Number: ${contract.contractNumber || 'N/A'}
Contract: ${contract.name}

Dear Customer Service Team,

I hereby give formal notice to terminate my contract "${contract.name}" with immediate effect at the earliest possible date, which according to the ${
  contract.isEndDateOpenEnded
    ? 'monthly rolling cancellation cycle'
    : `contractual notice period (${contract.noticePeriod.value} ${contract.noticePeriod.unit})`
} is on or before ${formatDate(effectiveDeadline)}.

Contract Details:
- Name: ${contract.name}
- Supplier: ${contract.supplier}
- Customer / Contract Reference: ${contract.contractNumber || 'Not specified'}
${
  contract.isEndDateOpenEnded
    ? `- Contract Type: Rolling / Open-ended monthly contract (started on ${formatDate(contract.startDate)})\n- Next Notice Deadline: ${formatDate(effectiveDeadline)}`
    : `- Scheduled End Date: ${formatDate(contract.endDate)}\n- Notice Deadline: ${formatDate(effectiveDeadline)}`
}

Please revoke any direct debit (SEPA) authorization or recurring card payment mandate associated with this contract upon the date of termination.

Kindly send me written confirmation of this cancellation within 10 business days, stating the exact effective date of termination.

Yours sincerely,

${user.name}`;

  const handleCopyLetter = () => {
    navigator.clipboard.writeText(letterBody);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2500);
  };

  const handlePrintLetter = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cancellation Letter - ${contract.name}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; line-height: 1.6; color: #1e293b; max-width: 700px; margin: 0 auto; }
              pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
            </style>
          </head>
          <body>
            <pre>${letterBody}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header: Title, Category & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {category?.name}
              </span>
              <span>·</span>
              <span>{contract.subcategory}</span>
              {contract.contractNumber && (
                <>
                  <span>·</span>
                  <span className="font-mono">#{contract.contractNumber}</span>
                </>
              )}
              {contract.coverageType && (
                <>
                  <span>·</span>
                  <span className={`inline-flex items-center gap-1 font-medium ${
                    contract.coverageType === 'family' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {contract.coverageType === 'family' ? (
                      <>
                        <Users className="w-3.5 h-3.5" />
                        <span>Family</span>
                      </>
                    ) : (
                      <>
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Individual</span>
                      </>
                    )}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {contract.name}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => toggleFavorite(contract.id)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                contract.isFavorite
                  ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900'
                  : 'text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Bookmark favorite"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onClose();
                setEditingContract(contract);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                rollForwardContract(contract.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer shadow-2xs"
              title="Duplicate and roll forward start & expiration dates by 1 year"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Roll Forward (+1 Yr)</span>
            </button>
            <button
              onClick={() => {
                duplicateContract(contract.id);
                onClose();
              }}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition cursor-pointer"
              title="Duplicate contract"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                deleteContract(contract.id);
                onClose();
              }}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              title="Delete contract"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Urgency Highlight Banner */}
        <div
          className={`px-6 py-2.5 flex items-center justify-between border-b ${
            urgency === 'overdue'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
              : urgency === 'next_30'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4" />
            <span>
              {contract.isEndDateOpenEnded ? 'Next Notice Deadline' : 'Cancellation Deadline'}: <strong>{formatDate(effectiveDeadline)}</strong>
            </span>
            <span className="hidden sm:inline font-mono">
              ({urgencyMeta.badgeText})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {contract.status === 'active' ? (
              <button
                onClick={() => markContractStatus(contract.id, 'cancelled')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
              >
                Mark as Cancelled
              </button>
            ) : (
              <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {contract.status}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'documents', label: `Documents (${contract.documentLinks?.length || 0})`, icon: HardDrive },
            { id: 'costs', label: 'Costs & History', icon: TrendingUp },
            { id: 'letter', label: 'Cancellation Letter', icon: Printer },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dossier Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Timeline Dates Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500">Contract Start</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                    {formatDate(contract.startDate)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Duration: <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatContractDuration(contract.startDate, contract.endDate, contract.isEndDateOpenEnded)}</strong>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                    {contract.isEndDateOpenEnded ? 'Next Monthly Notice Deadline' : 'Notice Deadline'}
                  </span>
                  <div className="text-base font-bold text-indigo-700 dark:text-indigo-300 mt-1 font-mono tabular-nums">
                    {formatDate(effectiveDeadline)}
                  </div>
                  <div className="text-[11px] text-indigo-600/70 mt-0.5">
                    {contract.isEndDateOpenEnded
                      ? `Monthly cycle (renews on day ${contract.startDate ? parseInt(contract.startDate.split('-')[2], 10) : '—'} of each month)`
                      : `${contract.noticePeriod.value} ${contract.noticePeriod.unit} before end date`}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500">Contract End Date</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                    {contract.isEndDateOpenEnded ? 'None (Open-ended)' : formatDate(contract.endDate)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {contract.isEndDateOpenEnded
                      ? 'Continuous monthly agreement'
                      : contract.autoRenew
                      ? `Auto-renews: ${contract.renewalPeriod}`
                      : 'Fixed term (no renew)'}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${
                  isAutoExtendActive
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/60'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                }`}>
                  <span className={`text-xs font-semibold ${
                    isAutoExtendActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'
                  }`}>
                    Automatic Extension
                  </span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {isAutoExtendActive ? `+ ${formatAutoExtendPeriod(autoPeriod)}` : 'Disabled'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {contract.lastAutoExtendedAt
                      ? `Last extended: ${formatDate(contract.lastAutoExtendedAt.split('T')[0])}`
                      : isAutoExtendActive
                      ? 'Active at notice deadline'
                      : 'No auto-extension configured'}
                  </div>
                </div>
              </div>

              {/* Roll Forward / Auto-Extension Callout Banner */}
              <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Term Renewal & Extension</span>
                      {isAutoExtendActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                          Auto-Extend: {formatAutoExtendPeriod(autoPeriod)}
                        </span>
                      )}
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {isAutoExtendActive
                        ? `This contract automatically extends by ${formatAutoExtendPeriod(autoPeriod)} once the notice deadline has passed. You can also trigger this extension manually now or start a new 1-year roll forward.`
                        : 'Roll forward into a new contract term (+1 year) while preserving all document attachments, credentials, and supplier details.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isAutoExtendActive && (
                    <button
                      type="button"
                      onClick={() => {
                        autoExtendContract(contract.id);
                        onClose();
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                      title={`Auto-extend now by ${formatAutoExtendPeriod(autoPeriod)}`}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Auto-Extend (+{formatAutoExtendPeriod(autoPeriod)})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      rollForwardContract(contract.id);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Roll Forward (+1 Yr)</span>
                  </button>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Financial Commitment
                  </h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                      {formatCurrency(contract.annualCost, user.settings.currency)}
                    </span>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      / year (~{formatCurrency(contract.monthlyCost, user.settings.currency)}/month)
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Billed: <strong className="capitalize">{contract.paymentFrequency}</strong>
                  </div>
                </div>

                {potentialSaving > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Potential Saving by Switching</span>
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums mt-0.5">
                      {formatCurrency(potentialSaving, user.settings.currency)} / year
                    </div>
                  </div>
                )}
              </div>

              {/* Supplier Contact Shortcuts */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Supplier Contact & Customer Service
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {contract.contact.phone ? (
                    <a
                      href={`tel:${contract.contact.phone}`}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                    >
                      <Phone className="w-4 h-4 text-indigo-500" />
                      <span className="truncate">{contract.contact.phone}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                      <Phone className="w-4 h-4" />
                      <span>No phone stored</span>
                    </div>
                  )}

                  {contract.contact.email ? (
                    <a
                      href={`mailto:${contract.contact.email}`}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                    >
                      <Mail className="w-4 h-4 text-indigo-500" />
                      <span className="truncate">{contract.contact.email}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                      <Mail className="w-4 h-4" />
                      <span>No email stored</span>
                    </div>
                  )}

                  {contract.contact.url ? (
                    <a
                      href={contract.contact.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                    >
                      <Globe className="w-4 h-4 text-indigo-500" />
                      <span className="truncate">Portal / Website</span>
                      <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                      <Globe className="w-4 h-4" />
                      <span>No website stored</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Login & Portal Credentials Card */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Login & Access Credentials
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      setEditingContract(contract);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>

                {contract.credentials && (contract.credentials.url || contract.credentials.username || contract.credentials.password || contract.credentials.notes) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Web Address (URL) */}
                    {contract.credentials.url ? (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 sm:col-span-2 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2">
                          <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block font-medium">Login Website URL:</span>
                            <span className="text-xs font-mono text-slate-900 dark:text-white truncate block">
                              {contract.credentials.url}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyCredential(contract.credentials!.url!, 'url')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Copy URL"
                          >
                            {copiedCred === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={contract.credentials.url.startsWith('http') ? contract.credentials.url : `https://${contract.credentials.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-semibold text-xs transition"
                          >
                            <span>Open Portal</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {/* Username */}
                    {contract.credentials.username ? (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block font-medium">Username / Email:</span>
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate block">
                              {contract.credentials.username}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyCredential(contract.credentials!.username!, 'username')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
                          title="Copy username"
                        >
                          {copiedCred === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : null}

                    {/* Password */}
                    {contract.credentials.password ? (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block font-medium">Password:</span>
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate block">
                              {showDossierPassword ? contract.credentials.password : '••••••••••••'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowDossierPassword(!showDossierPassword)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title={showDossierPassword ? 'Hide password' : 'Show password'}
                          >
                            {showDossierPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyCredential(contract.credentials!.password!, 'password')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Copy password"
                          >
                            {copiedCred === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Notes / 2FA */}
                    {contract.credentials.notes ? (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 sm:col-span-2 text-xs">
                        <span className="text-[10px] text-slate-400 block font-medium">Login Notes / 2FA:</span>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                          {contract.credentials.notes}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">No login credentials stored for this contract yet.</span>
                    <button
                      onClick={() => {
                        onClose();
                        setEditingContract(contract);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer"
                    >
                      + Add Login Credentials
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              {contract.notes && (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Notes
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {contract.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENTS & EXTERNAL LINKS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Linked Documents & Files
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ContractWatch links to your files in NAS, Google Drive, OneDrive, or Dropbox without storing documents.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingDoc(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Link</span>
                </button>
              </div>

              {/* Add Document Form */}
              {isAddingDoc && (
                <form
                  onSubmit={handleSaveDoc}
                  className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Document Title (e.g. 2026 Insurance Policy)"
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="contract">Contract Agreement</option>
                      <option value="policy">Policy Schedule</option>
                      <option value="invoice">Invoice / Bill</option>
                      <option value="terms">Terms & Conditions</option>
                      <option value="correspondence">Letter / Correspondence</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="URL: smb://synology.local/... or https://drive.google.com/..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingDoc(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                    >
                      Save Link
                    </button>
                  </div>
                </form>
              )}

              {/* Documents List */}
              {contract.documentLinks && contract.documentLinks.length > 0 ? (
                <div className="space-y-2">
                  {contract.documentLinks.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {doc.provider === 'nas' ? (
                            <HardDrive className="w-4 h-4 text-purple-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-semibold text-slate-900 dark:text-white truncate">
                            {doc.title}
                          </h5>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="capitalize">{doc.type}</span>
                            <span>·</span>
                            <span className="uppercase font-mono">{doc.provider}</span>
                            {doc.note && (
                              <>
                                <span>·</span>
                                <span className="text-amber-600 dark:text-amber-400">
                                  {doc.note}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => removeDocumentLink(contract.id, doc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                  <FolderLock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No document links attached yet.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Store links to files on your home NAS, OneDrive, Google Drive, or Dropbox.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COSTS & PRICE HISTORY */}
          {activeTab === 'costs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Price Changes & History
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track price indexation and price increases upon tacit renewal, sorted by effective date (newest first).
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingPrice(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Price Change</span>
                </button>
              </div>

              {isAddingPrice && (
                <form
                  onSubmit={handleSavePrice}
                  className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="date"
                      required
                      value={priceDate}
                      onChange={(e) => setPriceDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={priceAnnual}
                      onChange={(e) =>
                        setPriceAnnual(e.target.value ? parseFloat(e.target.value) : '')
                      }
                      placeholder={`New Annual Cost (${getCurrencyLabel(user.settings.currency)})`}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={priceNote}
                      onChange={(e) => setPriceNote(e.target.value)}
                      placeholder="Reason (e.g. Tacit renewal rate hike)"
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPrice(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition"
                    >
                      Save Rate
                    </button>
                  </div>
                </form>
              )}

              {/* Price Log */}
              <div className="space-y-2">
                {sortedPriceHistory.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      No price adjustments logged yet
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Current rate: {formatCurrency(contract.annualCost, user.settings.currency)}/yr ({formatCurrency(contract.monthlyCost, user.settings.currency)}/mo). Click &quot;Log Price Change&quot; to add a new rate with its effective date.
                    </p>
                  </div>
                ) : (
                  sortedPriceHistory.map((entry, idx) => {
                    const prevEntry = sortedPriceHistory[idx + 1];
                    const diff = prevEntry ? entry.annualCost - prevEntry.annualCost : null;
                    const pctDiff =
                      prevEntry && prevEntry.annualCost > 0
                        ? ((entry.annualCost - prevEntry.annualCost) / prevEntry.annualCost) * 100
                        : null;
                    const isLatest = idx === 0;

                    return (
                      <div
                        key={entry.id || idx}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                          isLatest
                            ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {entry.note || 'Contract rate'}
                            </span>
                            {isLatest && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Latest Rate
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Effective date: {formatDate(entry.date)}
                            </span>
                            {diff !== null && (
                              <span
                                className={`font-semibold ${
                                  diff > 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : diff < 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                ({diff > 0 ? '+' : ''}
                                {formatCurrency(diff, user.settings.currency)}
                                {pctDiff !== null && ` / ${diff > 0 ? '+' : ''}${pctDiff.toFixed(1)}%`})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right font-mono tabular-nums">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatCurrency(entry.annualCost, user.settings.currency)}/yr
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {formatCurrency(entry.monthlyCost, user.settings.currency)}/mo
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePriceHistory(contract.id, entry.id)}
                            title="Remove price record"
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CANCELLATION LETTER GENERATOR */}
          {activeTab === 'letter' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Formal Cancellation Letter Generator
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pre-filled with your account name, customer reference, and notice deadline date.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLetter}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition"
                  >
                    {copiedLetter ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLetter ? 'Copied to Clipboard!' : 'Copy Letter Text'}</span>
                  </button>
                  <button
                    onClick={handlePrintLetter}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>
                  {contract.contact.email && (
                    <a
                      href={`mailto:${contract.contact.email}?subject=${encodeURIComponent(
                        `Notice of Cancellation - ${contract.name} (Ref: ${contract.contractNumber || ''})`
                      )}&body=${encodeURIComponent(letterBody)}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Open in Email</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                {letterBody}
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};
