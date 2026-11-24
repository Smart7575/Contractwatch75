import { Category, Contract, CoverageType, PaymentFrequency } from '../types';
import {
  formatDate,
  getContractPaymentSchedule,
  getEffectiveCancellationDeadline,
  getTodayString,
  isContractCancelledActive,
  isContractRolledForward,
} from './dateUtils';

export interface ScheduledCashflowPayment {
  id: string;
  contractId: string;
  contractName: string;
  supplier: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  subcategory: string;
  coverageType: CoverageType;
  chargeDate: string; // YYYY-MM-DD
  yearMonth: string; // YYYY-MM
  amount: number;
  paymentFrequency: PaymentFrequency;
  isRenewalProjection: boolean;
  isCancelledEnding: boolean;
  cancellationDeadline: string;
  endDate: string;
  isEndDateOpenEnded: boolean;
  status: Contract['status'];
}

export interface MonthlyCashflowBucket {
  yearMonth: string; // YYYY-MM
  label: string; // e.g. "Nov 2026"
  shortLabel: string; // e.g. "Nov"
  yearLabel: string; // e.g. "2026"
  monthlyAmount: number;
  quarterlyAmount: number;
  annualAmount: number;
  totalAmount: number;
  committedAmount: number;
  projectedRenewalAmount: number;
  payments: ScheduledCashflowPayment[];
}

export interface CategoryCashflowSummary {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalAmount: number;
  sharePercent: number;
  contractCount: number;
  paymentCount: number;
}

export interface ExpiringSavingsItem {
  contract: Contract;
  annualAmount: number;
  monthlyAmount: number;
  endDate: string;
  reason: 'cancelled' | 'non_renewing';
}

export interface CashflowForecastResult {
  months: MonthlyCashflowBucket[];
  allPayments: ScheduledCashflowPayment[];
  totalForecastedSpend: number;
  totalCommittedSpend: number;
  totalProjectedRenewalSpend: number;
  averageMonthlySpend: number;
  monthlyRecurringBaseline: number;
  peakMonth: MonthlyCashflowBucket | null;
  lowestMonth: MonthlyCashflowBucket | null;
  categoryBreakdown: CategoryCashflowSummary[];
  upcomingLumpSums: ScheduledCashflowPayment[];
  expiringCommitments: ExpiringSavingsItem[];
  annualizedEndingAmount: number;
  activeForecastContractsCount: number;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function addMonthsToYearMonth(year: number, monthIndex0: number, offset: number): { year: number; monthIndex0: number; yearMonth: string } {
  const total = year * 12 + monthIndex0 + offset;
  const nextYear = Math.floor(total / 12);
  const nextMonth0 = ((total % 12) + 12) % 12;
  const mm = String(nextMonth0 + 1).padStart(2, '0');
  return {
    year: nextYear,
    monthIndex0: nextMonth0,
    yearMonth: `${nextYear}-${mm}`,
  };
}

function makeClampedDate(year: number, monthIndex0: number, day: number): string {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const clampedDay = Math.min(Math.max(day, 1), daysInMonth);
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

function getBillingStepMonths(freq: PaymentFrequency): number {
  if (freq === 'annually') return 12;
  if (freq === 'quarterly') return 3;
  return 1;
}

function getBillingAmount(contract: Contract): number {
  if (contract.paymentFrequency === 'annually') {
    return contract.annualCost > 0 ? contract.annualCost : (contract.monthlyCost || 0) * 12;
  }
  if (contract.paymentFrequency === 'quarterly') {
    if (contract.annualCost > 0) return Math.round((contract.annualCost / 4) * 100) / 100;
    return Math.round((contract.monthlyCost || 0) * 3 * 100) / 100;
  }
  if (contract.monthlyCost > 0) return contract.monthlyCost;
  return Math.round(((contract.annualCost || 0) / 12) * 100) / 100;
}

export interface ForecastOptions {
  horizonMonths?: number;
  includeAutoRenewals?: boolean;
  categoryId?: string;
  coverageType?: 'all' | CoverageType;
  todayStr?: string;
}

export function generateCashflowForecast(
  contracts: Contract[],
  categories: Category[],
  options: ForecastOptions = {}
): CashflowForecastResult {
  const {
    horizonMonths = 12,
    includeAutoRenewals = true,
    categoryId = 'all',
    coverageType = 'all',
    todayStr = getTodayString(),
  } = options;

  const [todayY, todayM] = todayStr.split('-').map(Number);
  const baseYear = todayY || new Date().getFullYear();
  const baseMonth0 = (todayM || new Date().getMonth() + 1) - 1;

  const months: MonthlyCashflowBucket[] = [];
  const monthIndexMap = new Map<string, MonthlyCashflowBucket>();

  for (let i = 0; i < horizonMonths; i++) {
    const { year, monthIndex0, yearMonth } = addMonthsToYearMonth(baseYear, baseMonth0, i);
    const shortLabel = SHORT_MONTHS[monthIndex0];
    const bucket: MonthlyCashflowBucket = {
      yearMonth,
      label: `${shortLabel} ${year}`,
      shortLabel,
      yearLabel: String(year),
      monthlyAmount: 0,
      quarterlyAmount: 0,
      annualAmount: 0,
      totalAmount: 0,
      committedAmount: 0,
      projectedRenewalAmount: 0,
      payments: [],
    };
    months.push(bucket);
    monthIndexMap.set(yearMonth, bucket);
  }

  const forecastStartYM = months[0]?.yearMonth || todayStr.slice(0, 7);
  const forecastEndYM = months[months.length - 1]?.yearMonth || forecastStartYM;

  const scopedContracts = contracts.filter((c) => {
    if (categoryId !== 'all' && c.categoryId !== categoryId) return false;
    if (coverageType !== 'all') {
      const effectiveScope: CoverageType = c.coverageType || 'individual';
      if (effectiveScope !== coverageType) return false;
    }
    // Exclude fully expired or fully terminated contracts
    if (c.status === 'expired') return false;
    if (c.status === 'cancelled' && !isContractCancelledActive(c, todayStr)) return false;
    return true;
  });

  const allPayments: ScheduledCashflowPayment[] = [];
  const expiringCommitments: ExpiringSavingsItem[] = [];
  const contributingContractIds = new Set<string>();
  const categoryTotals = new Map<string, { amount: number; contracts: Set<string>; payments: number }>();

  let monthlyRecurringBaseline = 0;

  for (const contract of scopedContracts) {
    const category = categories.find((cat) => cat.id === contract.categoryId);
    const categoryName = category?.name || 'Other';
    const categoryColor = category?.color || '#6366f1';

    const cancelledActive = isContractCancelledActive(contract, todayStr);
    const rolledForward = isContractRolledForward(contract, contracts);
    const stepMonths = getBillingStepMonths(contract.paymentFrequency);
    const billingAmount = getBillingAmount(contract);

    // Track monthly baseline from currently active contracts (even if annual/quarterly, normalized for comparison)
    if (
      contract.status === 'active' ||
      cancelledActive
    ) {
      monthlyRecurringBaseline +=
        contract.monthlyCost > 0 ? contract.monthlyCost : (contract.annualCost || 0) / 12;
    }

    // Track expiring/ending commitments within the forecast horizon
    const willStopAtEnd =
      !contract.isEndDateOpenEnded &&
      Boolean(contract.endDate) &&
      !rolledForward &&
      (cancelledActive || !contract.autoRenew || !includeAutoRenewals);

    if (willStopAtEnd && contract.endDate >= todayStr && contract.endDate.slice(0, 7) <= forecastEndYM) {
      expiringCommitments.push({
        contract,
        annualAmount: contract.annualCost || (contract.monthlyCost || 0) * 12,
        monthlyAmount: contract.monthlyCost || (contract.annualCost || 0) / 12,
        endDate: contract.endDate,
        reason: cancelledActive ? 'cancelled' : 'non_renewing',
      });
    }

    if (billingAmount <= 0) continue;

    // Anchor billing schedule using explicit planned payment schedule (falling back to startDate)
    const anchorDate = contract.startDate || todayStr;
    const [aY] = anchorDate.split('-').map(Number);
    const { day: aD, month: aM } = getContractPaymentSchedule(contract);
    if (!aY || !aM || !aD) continue;

    const anchorMonth0 = aM - 1;
    const anchorTotalMonths = aY * 12 + anchorMonth0;
    const forecastStartTotalMonths = baseYear * 12 + baseMonth0;

    // Find the first cycle >= forecastStartTotalMonths (aligned with anchorTotalMonths)
    let cycleOffset = 0;
    if (forecastStartTotalMonths > anchorTotalMonths) {
      const diff = forecastStartTotalMonths - anchorTotalMonths;
      cycleOffset = Math.floor(diff / stepMonths) * stepMonths;
    }

    const effectiveDeadline = getEffectiveCancellationDeadline(contract, todayStr);
    const allowsRenewalBeyondEnd =
      includeAutoRenewals &&
      contract.autoRenew &&
      !cancelledActive &&
      !rolledForward;

    // Generate billing events across the horizon
    for (let safety = 0; safety < 120; safety++) {
      const { year, monthIndex0, yearMonth } = addMonthsToYearMonth(
        aY,
        anchorMonth0,
        cycleOffset + safety * stepMonths
      );

      if (yearMonth > forecastEndYM) break;

      const chargeDate = makeClampedDate(year, monthIndex0, aD);

      // Skip if before contract start date
      if (contract.startDate && chargeDate < contract.startDate) {
        continue;
      }

      // Check end-date cutoff
      const isAfterCurrentTermEnd =
        !contract.isEndDateOpenEnded &&
        Boolean(contract.endDate) &&
        chargeDate >= contract.endDate;

      if (isAfterCurrentTermEnd && !allowsRenewalBeyondEnd) {
        break;
      }

      const bucket = monthIndexMap.get(yearMonth);
      if (!bucket) continue;

      const isRenewalProjection = Boolean(isAfterCurrentTermEnd && allowsRenewalBeyondEnd);

      const payment: ScheduledCashflowPayment = {
        id: `${contract.id}_${yearMonth}`,
        contractId: contract.id,
        contractName: contract.name,
        supplier: contract.supplier,
        categoryId: contract.categoryId,
        categoryName,
        categoryColor,
        subcategory: contract.subcategory || 'General',
        coverageType: contract.coverageType || 'individual',
        chargeDate,
        yearMonth,
        amount: billingAmount,
        paymentFrequency: contract.paymentFrequency,
        isRenewalProjection,
        isCancelledEnding: cancelledActive,
        cancellationDeadline: effectiveDeadline,
        endDate: contract.endDate,
        isEndDateOpenEnded: contract.isEndDateOpenEnded,
        status: contract.status,
      };

      bucket.payments.push(payment);
      bucket.totalAmount += billingAmount;
      if (contract.paymentFrequency === 'monthly') {
        bucket.monthlyAmount += billingAmount;
      } else if (contract.paymentFrequency === 'quarterly') {
        bucket.quarterlyAmount += billingAmount;
      } else {
        bucket.annualAmount += billingAmount;
      }

      if (isRenewalProjection) {
        bucket.projectedRenewalAmount += billingAmount;
      } else {
        bucket.committedAmount += billingAmount;
      }

      allPayments.push(payment);
      contributingContractIds.add(contract.id);

      const catEntry = categoryTotals.get(contract.categoryId) || {
        amount: 0,
        contracts: new Set<string>(),
        payments: 0,
      };
      catEntry.amount += billingAmount;
      catEntry.contracts.add(contract.id);
      catEntry.payments += 1;
      categoryTotals.set(contract.categoryId, catEntry);
    }
  }

  // Sort payments within each bucket by charge date then highest amount
  months.forEach((m) => {
    m.payments.sort((a, b) => {
      const dateCmp = a.chargeDate.localeCompare(b.chargeDate);
      if (dateCmp !== 0) return dateCmp;
      return b.amount - a.amount;
    });
  });

  allPayments.sort((a, b) => {
    const dateCmp = a.chargeDate.localeCompare(b.chargeDate);
    if (dateCmp !== 0) return dateCmp;
    return b.amount - a.amount;
  });

  const totalForecastedSpend = months.reduce((sum, m) => sum + m.totalAmount, 0);
  const totalCommittedSpend = months.reduce((sum, m) => sum + m.committedAmount, 0);
  const totalProjectedRenewalSpend = months.reduce((sum, m) => sum + m.projectedRenewalAmount, 0);
  const averageMonthlySpend = months.length > 0 ? totalForecastedSpend / months.length : 0;

  let peakMonth: MonthlyCashflowBucket | null = null;
  let lowestMonth: MonthlyCashflowBucket | null = null;
  for (const m of months) {
    if (!peakMonth || m.totalAmount > peakMonth.totalAmount) {
      peakMonth = m;
    }
    if (!lowestMonth || m.totalAmount < lowestMonth.totalAmount) {
      lowestMonth = m;
    }
  }

  const categoryBreakdown: CategoryCashflowSummary[] = Array.from(categoryTotals.entries())
    .map(([catId, data]) => {
      const cat = categories.find((c) => c.id === catId);
      return {
        categoryId: catId,
        categoryName: cat?.name || 'Other',
        categoryColor: cat?.color || '#6366f1',
        totalAmount: data.amount,
        sharePercent: totalForecastedSpend > 0 ? (data.amount / totalForecastedSpend) * 100 : 0,
        contractCount: data.contracts.size,
        paymentCount: data.payments,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const upcomingLumpSums = allPayments
    .filter((p) => p.paymentFrequency !== 'monthly' && p.chargeDate >= todayStr)
    .slice(0, 8);

  expiringCommitments.sort((a, b) => a.endDate.localeCompare(b.endDate));
  const annualizedEndingAmount = expiringCommitments.reduce((sum, item) => sum + item.annualAmount, 0);

  return {
    months,
    allPayments,
    totalForecastedSpend,
    totalCommittedSpend,
    totalProjectedRenewalSpend,
    averageMonthlySpend,
    monthlyRecurringBaseline,
    peakMonth,
    lowestMonth,
    categoryBreakdown,
    upcomingLumpSums,
    expiringCommitments,
    annualizedEndingAmount,
    activeForecastContractsCount: contributingContractIds.size,
  };
}

export function buildCashflowCSV(
  forecast: CashflowForecastResult,
  currency: string
): string {
  const headers = [
    'Month',
    'Charge Date',
    'Contract Name',
    'Supplier',
    'Scope',
    'Category',
    'Billing Frequency',
    'Commitment Type',
    `Amount (${currency})`,
    'Contract End Date',
    'Cancellation Deadline',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = forecast.allPayments.map((p) => [
    p.yearMonth,
    p.chargeDate,
    p.contractName,
    p.supplier,
    p.coverageType === 'family' ? 'Family' : 'Individual',
    p.categoryName,
    p.paymentFrequency,
    p.isRenewalProjection ? 'Projected Auto-Renewal' : p.isCancelledEnding ? 'Final Term (Cancelled)' : 'Committed',
    p.amount.toFixed(2),
    p.isEndDateOpenEnded ? 'Open-ended' : formatDate(p.endDate),
    p.cancellationDeadline ? formatDate(p.cancellationDeadline) : '',
  ]);

  return [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
  ].join('\n');
}
