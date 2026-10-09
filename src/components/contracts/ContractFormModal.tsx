import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Contract,
  DocumentLink,
  NoticeUnit,
  PaymentFrequency,
  ContractStatus,
  DocumentType,
  DocumentProvider,
  CoverageType,
} from '../../types';
import {
  calculateCancellationDeadline,
  getTodayString,
  formatDate,
  getCurrencyLabel,
} from '../../lib/dateUtils';
import { auth } from '../../lib/firebase';
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  ExternalLink,
  Key,
  Lock,
  Globe,
  Eye,
  EyeOff,
  User as UserIcon,
  Users,
} from 'lucide-react';

interface ContractFormModalProps {
  initialContract?: Contract | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  initialContract,
  isOpen,
  onClose,
}) => {
  const { addContract, updateContract, categories, addSubcategory, user } = useApp();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Core fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'energy');
  const [subcategory, setSubcategory] = useState('');
  const [coverageType, setCoverageType] = useState<CoverageType>('individual');
  const [isAddingNewSubcat, setIsAddingNewSubcat] = useState(false);
  const [newSubcatInput, setNewSubcatInput] = useState('');
  const [supplier, setSupplier] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [isEndDateOpenEnded, setIsEndDateOpenEnded] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [noticeValue, setNoticeValue] = useState(1);
  const [noticeUnit, setNoticeUnit] = useState<NoticeUnit>('months');
  const [annualCost, setAnnualCost] = useState<number | ''>('');
  const [monthlyCost, setMonthlyCost] = useState<number | ''>('');
  const [cancellationDeadline, setCancellationDeadline] = useState('');
  const [isDeadlineOverridden, setIsDeadlineOverridden] = useState(false);

  // Step 2: Extended fields
  const [contractNumber, setContractNumber] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [renewalPeriod, setRenewalPeriod] = useState('1 month rolling');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('monthly');
  const [status, setStatus] = useState<ContractStatus>('active');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [alternativeCost, setAlternativeCost] = useState<number | ''>('');

  // Login credentials state
  const [loginUrl, setLoginUrl] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginNotes, setLoginNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Document links in form
  const [docLinks, setDocLinks] = useState<
    Omit<DocumentLink, 'id' | 'contractId' | 'addedAt'>[]
  >([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocType, setNewDocType] = useState<DocumentType>('contract');
  const [newDocProvider, setNewDocProvider] = useState<DocumentProvider>('generic');

  // Error validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or initialize on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialContract) {
      setName(initialContract.name);
      setCategoryId(initialContract.categoryId);
      setSubcategory(initialContract.subcategory);
      setCoverageType(initialContract.coverageType || 'individual');
      setSupplier(initialContract.supplier);
      setStartDate(initialContract.startDate || getTodayString());
      setIsEndDateOpenEnded(initialContract.isEndDateOpenEnded);
      setEndDate(initialContract.endDate || '');
      setNoticeValue(initialContract.noticePeriod.value);
      setNoticeUnit(initialContract.noticePeriod.unit);
      setAnnualCost(initialContract.annualCost);
      setMonthlyCost(initialContract.monthlyCost);
      setCancellationDeadline(initialContract.cancellationDeadline);
      setIsDeadlineOverridden(initialContract.isDeadlineOverridden);
      setContractNumber(initialContract.contractNumber || '');
      setAutoRenew(initialContract.autoRenew);
      setRenewalPeriod(initialContract.renewalPeriod || '1 month rolling');
      setPaymentFrequency(initialContract.paymentFrequency || 'monthly');
      setStatus(initialContract.status);
      setPhone(initialContract.contact?.phone || '');
      setEmail(initialContract.contact?.email || '');
      setUrl(initialContract.contact?.url || '');
      setNotes(initialContract.notes || '');
      setTagsInput((initialContract.tags || []).join(', '));
      setAlternativeCost(initialContract.alternativeCost || '');
      setLoginUrl(initialContract.credentials?.url || '');
      setLoginUsername(initialContract.credentials?.username || '');
      setLoginPassword(initialContract.credentials?.password || '');
      setLoginNotes(initialContract.credentials?.notes || '');
      setShowPassword(false);
      setDocLinks(
        (initialContract.documentLinks || []).map((d) => ({
          title: d.title,
          type: d.type,
          url: d.url,
          provider: d.provider,
          note: d.note,
        }))
      );
      setStep(1);
    } else {
      // Default new contract: end date 1 year from now
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      const defaultEndDate = oneYear.toISOString().split('T')[0];

      setName('');
      const defaultCat = categories[0]?.id || 'energy';
      setCategoryId(defaultCat);
      const subcats = categories.find((c) => c.id === defaultCat)?.subcategories || [];
      setSubcategory(subcats[0] || 'General');
      setCoverageType('individual');
      setSupplier('');
      setStartDate(getTodayString());
      setIsEndDateOpenEnded(false);
      setEndDate(defaultEndDate);
      setNoticeValue(1);
      setNoticeUnit('months');
      setAnnualCost('');
      setMonthlyCost('');
      const autoDeadline = calculateCancellationDeadline(defaultEndDate, {
        value: 1,
        unit: 'months',
      });
      setCancellationDeadline(autoDeadline);
      setIsDeadlineOverridden(false);
      setContractNumber('');
      setAutoRenew(true);
      setRenewalPeriod('1 month rolling');
      setPaymentFrequency('monthly');
      setStatus('active');
      setPhone('');
      setEmail('');
      setUrl('');
      setNotes('');
      setTagsInput('');
      setAlternativeCost('');
      setLoginUrl('');
      setLoginUsername('');
      setLoginPassword('');
      setLoginNotes('');
      setShowPassword(false);
      setDocLinks([]);
      setStep(1);
    }
    setErrors({});
  }, [isOpen, initialContract, categories]);

  // Recalculate deadline automatically when endDate or notice changes (unless manually overridden)
  useEffect(() => {
    if (!isDeadlineOverridden && endDate && noticeValue) {
      const calculated = calculateCancellationDeadline(endDate, {
        value: noticeValue,
        unit: noticeUnit,
      });
      setCancellationDeadline(calculated);
    }
  }, [endDate, noticeValue, noticeUnit, isDeadlineOverridden]);

  // Handle category change -> update subcategory options
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    setIsAddingNewSubcat(false);
    setNewSubcatInput('');
    const cat = categories.find((c) => c.id === newCatId);
    if (cat && cat.subcategories.length > 0) {
      setSubcategory(cat.subcategories[0]);
    } else {
      setSubcategory('General');
    }
  };

  const handleAddNewSubcat = () => {
    const trimmed = newSubcatInput.trim();
    if (!trimmed) return;
    addSubcategory(categoryId, trimmed);
    setSubcategory(trimmed);
    setNewSubcatInput('');
    setIsAddingNewSubcat(false);
  };

  // Cross-calculate annual <-> monthly cost
  const handleMonthlyChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setMonthlyCost('');
      setAnnualCost('');
    } else {
      setMonthlyCost(val);
      setAnnualCost(Number((val * 12).toFixed(2)));
    }
  };

  const handleAnnualChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (isNaN(val)) {
      setAnnualCost('');
      setMonthlyCost('');
    } else {
      setAnnualCost(val);
      setMonthlyCost(Number((val / 12).toFixed(2)));
    }
  };

  // Auto-detect link provider
  const detectProvider = (linkUrl: string): DocumentProvider => {
    const lower = linkUrl.toLowerCase();
    if (lower.startsWith('smb://') || lower.includes('synology') || lower.includes('qnap') || lower.includes('192.168.') || lower.includes('.local')) {
      return 'nas';
    }
    if (lower.includes('drive.google.com')) return 'gdrive';
    if (lower.includes('onedrive') || lower.includes('1drv.ms') || lower.includes('sharepoint.com')) return 'onedrive';
    if (lower.includes('dropbox.com')) return 'dropbox';
    return 'generic';
  };

  const handleAddDocLink = () => {
    if (!newDocUrl.trim()) return;
    const provider = newDocProvider === 'generic' ? detectProvider(newDocUrl) : newDocProvider;
    const title = newDocTitle.trim() || 'Contract Document';
    setDocLinks((prev) => [
      ...prev,
      {
        title,
        url: newDocUrl.trim(),
        type: newDocType,
        provider,
        note: provider === 'nas' ? 'Local network / VPN access only' : undefined,
      },
    ]);
    setNewDocTitle('');
    setNewDocUrl('');
  };

  // Validate Step 1
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Contract or service name is required.';
    if (!supplier.trim()) newErrors.supplier = 'Supplier / provider is required.';
    if (!endDate && !isEndDateOpenEnded) newErrors.endDate = 'End date is required.';
    if (!annualCost && annualCost !== 0) newErrors.annualCost = 'Cost is required.';
    if (noticeValue < 0 || isNaN(noticeValue)) newErrors.noticeValue = 'Valid notice period required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      userId: auth.currentUser?.uid || user.id,
      name: name.trim(),
      categoryId,
      subcategory: subcategory.trim() || 'General',
      coverageType,
      supplier: supplier.trim(),
      contractNumber: contractNumber.trim() || undefined,
      startDate: startDate || getTodayString(),
      isEndDateOpenEnded,
      endDate: endDate || getTodayString(),
      noticePeriod: { value: Number(noticeValue), unit: noticeUnit },
      cancellationDeadline:
        cancellationDeadline ||
        calculateCancellationDeadline(endDate, { value: noticeValue, unit: noticeUnit }),
      isDeadlineOverridden,
      autoRenew,
      renewalPeriod: renewalPeriod.trim() || '1 month rolling',
      annualCost: Number(annualCost) || 0,
      monthlyCost: Number(monthlyCost) || 0,
      paymentFrequency,
      status,
      contact: {
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        url: url.trim() || undefined,
      },
      credentials:
        loginUrl.trim() || loginUsername.trim() || loginPassword.trim() || loginNotes.trim()
          ? {
              url: loginUrl.trim() || undefined,
              username: loginUsername.trim() || undefined,
              password: loginPassword.trim() || undefined,
              notes: loginNotes.trim() || undefined,
            }
          : undefined,
      notes: notes.trim() || undefined,
      tags,
      documentLinks: docLinks.map((d, i) => ({
        ...d,
        id: `doc_${Date.now()}_${i}`,
        contractId: initialContract?.id || '',
        addedAt: new Date().toISOString(),
      })),
      alternativeCost: alternativeCost ? Number(alternativeCost) : undefined,
    };

    if (initialContract) {
      updateContract(initialContract.id, payload);
    } else {
      addContract(payload);
    }

    onClose();
  };

  if (!isOpen) return null;

  const currentCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {initialContract ? 'Edit Contract' : 'Add New Contract'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {step === 1 ? 'Step 1 of 2: Core Details (<60s)' : 'Step 2 of 2: Optional Extended Details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="px-6 pt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              step === 1
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>1. Basisgegevens</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setStep(2);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              step === 2
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>2. Details & Inloggegevens</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {step === 1 ? (
            /* STEP 1: Minimal required fields to complete in under 30 seconds */
            <div className="space-y-4">
              {/* Name & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contract / Service Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Green Power & Gas, Vodafone 5G"
                    className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                      errors.name ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier / Provider <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Vattenfall, Ziggo, Interpolis"
                    className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                      errors.supplier ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {errors.supplier && <p className="text-[11px] text-rose-500 mt-1">{errors.supplier}</p>}
                </div>
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Subcategory
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewSubcat(!isAddingNewSubcat);
                        setTimeout(() => document.getElementById('new-subcat-input')?.focus(), 50);
                      }}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Nieuwe subcategorie</span>
                    </button>
                  </div>

                  {isAddingNewSubcat ? (
                    <div className="flex items-center gap-1.5 p-2 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl animate-in fade-in">
                      <input
                        id="new-subcat-input"
                        type="text"
                        value={newSubcatInput}
                        onChange={(e) => setNewSubcatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewSubcat();
                          } else if (e.key === 'Escape') {
                            setIsAddingNewSubcat(false);
                          }
                        }}
                        placeholder="Nieuwe subcategorie naam..."
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewSubcat}
                        disabled={!newSubcatInput.trim()}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
                      >
                        Toevoegen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewSubcat(false);
                          setNewSubcatInput('');
                        }}
                        className="px-2 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs cursor-pointer"
                      >
                        Annuleren
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        list="subcat-options"
                        placeholder="Selecteer of typ subcategorie..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <datalist id="subcat-options">
                        {(currentCategory?.subcategories || []).map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>
                  )}

                  {/* Quick chips of available subcategories */}
                  {currentCategory?.subcategories && currentCategory.subcategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-20 overflow-y-auto">
                      {currentCategory.subcategories.map((sub) => {
                        const isSelected = subcategory.toLowerCase() === sub.toLowerCase();
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSubcategory(sub)}
                            className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Coverage Scope: Family vs Individual */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Geldt voor / Dekking (Scope)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCoverageType('individual')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      coverageType === 'individual'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-500 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <UserIcon className="w-4 h-4 text-indigo-500" />
                    <span>Individual (Individueel)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverageType('family')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      coverageType === 'family'
                        ? 'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-950/50 dark:border-purple-500 dark:text-purple-300 ring-2 ring-purple-500/20 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>Family (Gezin)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Kies of dit contract uitsluitend geldt voor één persoon of voor het hele gezin.
                </p>
              </div>

              {/* Dates & Notice Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      End Date <span className="text-rose-500">*</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEndDateOpenEnded}
                        onChange={(e) => setIsEndDateOpenEnded(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0"
                      />
                      <span>Rolling / Open-ended</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    required={!isEndDateOpenEnded}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
                  />
                  {errors.endDate && <p className="text-[11px] text-rose-500 mt-1">{errors.endDate}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notice Period <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      value={noticeValue}
                      onChange={(e) => setNoticeValue(parseInt(e.target.value, 10) || 0)}
                      className="w-20 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center font-mono tabular-nums"
                    />
                    <select
                      value={noticeUnit}
                      onChange={(e) => setNoticeUnit(e.target.value as NoticeUnit)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months (default)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Automatic Cancellation Deadline Showcase */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Calculated Notice Deadline</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeadlineOverridden(!isDeadlineOverridden)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {isDeadlineOverridden ? 'Reset to automatic' : 'Override manually'}
                  </button>
                </div>

                {isDeadlineOverridden ? (
                  <input
                    type="date"
                    value={cancellationDeadline}
                    onChange={(e) => setCancellationDeadline(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 font-mono tabular-nums text-xs"
                  />
                ) : (
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-indigo-700 dark:text-indigo-300 font-mono tabular-nums">
                      {formatDate(cancellationDeadline)}
                    </span>
                    <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80">
                      (End date − {noticeValue} {noticeUnit})
                    </span>
                  </div>
                )}
              </div>

              {/* Costs (Monthly and Annual cross-calculated) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Cost ({getCurrencyLabel(user.settings.currency)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={monthlyCost}
                    onChange={(e) => handleMonthlyChange(e.target.value)}
                    placeholder="e.g. 29.99"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Annual Total Cost ({getCurrencyLabel(user.settings.currency)}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={annualCost}
                    onChange={(e) => handleAnnualChange(e.target.value)}
                    placeholder="e.g. 359.88"
                    className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums ${
                      errors.annualCost ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {errors.annualCost && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.annualCost}</p>
                  )}
                </div>
              </div>

              {/* Shortcut Callout to Login Credentials */}
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Key className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">
                      Inloggegevens vastleggen?
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                      Webadres portaal, gebruikersnaam en wachtwoord
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer shadow-2xs"
                >
                  Naar Inloggegevens →
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Optional details (Contract #, renewal, contact, tags, documents) */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contract / Customer Number
                  </label>
                  <input
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="e.g. NL-992019"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Frequency
                  </label>
                  <select
                    value={paymentFrequency}
                    onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
              </div>

              {/* Renewal settings */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRenew}
                      onChange={(e) => setAutoRenew(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <span>Tacit Auto-Renewal (Stilzwijgende verlenging)</span>
                  </label>
                </div>
                {autoRenew && (
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Renewal Term Period
                    </label>
                    <input
                      type="text"
                      value={renewalPeriod}
                      onChange={(e) => setRenewalPeriod(e.target.value)}
                      placeholder="e.g. 1 month rolling, 1 calendar year"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Supplier contact details */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier Contact & Customer Portal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone: +31 20 1234..."
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email: support@..."
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="URL: https://my..."
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Inloggegevens & Portaaltoegang (Webadres, Username, Password) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Inlog- & Toegangsgegevens (Klantportaal)
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md">
                    Veilig in Firestore
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Leg hier het webadres van het inlogportaal, de gebruikersnaam/e-mail en het wachtwoord vast om direct te kunnen inloggen bij wijziging of opzegging.
                </p>

                {/* Webadres (URL) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Inlog Webadres (Portaal URL)
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      value={loginUrl}
                      onChange={(e) => setLoginUrl(e.target.value)}
                      placeholder="e.g. https://mijn.kpn.com of https://netflix.com/login"
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                {/* Username & Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Gebruikersnaam / E-mailadres
                    </label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="e.g. jan@domein.nl of KL-88192"
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Wachtwoord
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-8 pr-9 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded"
                        title={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Extra inlog notities / 2FA */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Inlognotitie of 2FA hint (optioneel)
                  </label>
                  <input
                    type="text"
                    value={loginNotes}
                    onChange={(e) => setLoginNotes(e.target.value)}
                    placeholder="e.g. 2FA via SMS op mobiel, pincode 1234, of klantnummer vereist"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Tags & Alternative quotation for savings calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. High Priority, Household, Promo"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alternative / Target Annual Quote
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={alternativeCost}
                    onChange={(e) =>
                      setAlternativeCost(e.target.value ? parseFloat(e.target.value) : '')
                    }
                    placeholder="For savings insights (e.g. 1800)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Document links (NAS, Drive, Dropbox, etc.) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Links (NAS, Google Drive, OneDrive, Dropbox)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="Doc Title (e.g. 2026 Policy PDF)"
                    className="w-1/3 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <input
                    type="text"
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    placeholder="URL (smb://nas.local/... or https://drive...)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddDocLink}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {docLinks.length > 0 && (
                  <div className="space-y-1.5">
                    {docLinks.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {doc.title}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                            {doc.url}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDocLinks(docLinks.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Cancellation Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Must cancel via online portal or send signed letter with reference number..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) setStep(2);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>More Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Contract</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Step 1</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Finish & Save</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
