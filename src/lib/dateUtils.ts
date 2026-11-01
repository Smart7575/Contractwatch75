import { NoticePeriod, UrgencyLevel, AutoExtendPeriod, Contract } from '../types';

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates cancellation deadline: endDate minus notice period
 */
export function calculateCancellationDeadline(
  endDateStr: string,
  noticePeriod: NoticePeriod
): string {
  if (!endDateStr) return '';
  const [year, month, day] = endDateStr.split('-').map(Number);
  if (!year || !month || !day) return endDateStr;

  const date = new Date(year, month - 1, day);

  if (noticePeriod.unit === 'days') {
    date.setDate(date.getDate() - noticePeriod.value);
  } else if (noticePeriod.unit === 'weeks') {
    date.setDate(date.getDate() - noticePeriod.value * 7);
  } else if (noticePeriod.unit === 'months') {
    // Careful with month subtraction to avoid day overflow (e.g., 31 to 30)
    const targetMonth = date.getMonth() - noticePeriod.value;
    const targetDay = date.getDate();
    date.setMonth(targetMonth);
    // If the month ended up further ahead due to day count difference
    while (date.getMonth() === (targetMonth + 12 + 1) % 12) {
      date.setDate(date.getDate() - 1);
    }
  }

  const resYear = date.getFullYear();
  const resMonth = String(date.getMonth() + 1).padStart(2, '0');
  const resDay = String(date.getDate()).padStart(2, '0');
  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Shift a YYYY-MM-DD date string by a specific period (value + unit).
 * Supports 'days', 'weeks', 'months', 'years'.
 * Correctly accounts for leap years and different month lengths.
 */
export function shiftDateByPeriod(
  dateStr: string,
  value: number,
  unit: 'days' | 'weeks' | 'months' | 'years'
): string {
  if (!dateStr || value === 0) return dateStr || '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  if (unit === 'years') {
    const nextYear = year + value;
    let targetDay = day;
    if (month === 2 && day === 29) {
      const isNextLeap = (nextYear % 4 === 0 && nextYear % 100 !== 0) || (nextYear % 400 === 0);
      if (!isNextLeap) targetDay = 28;
    }
    const mm = String(month).padStart(2, '0');
    const dd = String(targetDay).padStart(2, '0');
    return `${nextYear}-${mm}-${dd}`;
  }

  if (unit === 'months') {
    const totalMonths = year * 12 + (month - 1) + value;
    const nextYear = Math.floor(totalMonths / 12);
    const nextMonth = (totalMonths % 12) + 1;
    // Handle days overflow for shorter target months (e.g. Jan 31 + 1 month -> Feb 28)
    const daysInTargetMonth = new Date(nextYear, nextMonth, 0).getDate();
    const targetDay = Math.min(day, daysInTargetMonth);
    const mm = String(nextMonth).padStart(2, '0');
    const dd = String(targetDay).padStart(2, '0');
    return `${nextYear}-${mm}-${dd}`;
  }

  if (unit === 'weeks') {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + value * 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  if (unit === 'days') {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return dateStr;
}

/**
 * Shift a YYYY-MM-DD date string by exactly 1 year.
 * Correctly accounts for leap years (e.g. Feb 29 -> Feb 28 on non-leap years).
 */
export function shiftDateByOneYear(dateStr?: string): string {
  if (!dateStr) return '';
  return shiftDateByPeriod(dateStr, 1, 'years');
}

/**
 * Format AutoExtendPeriod into human friendly display string (e.g. "1 jaar", "1 maand", "3 maanden")
 */
export function formatAutoExtendPeriod(period?: AutoExtendPeriod): string {
  if (!period || !period.value) return '1 year';
  const val = period.value;
  if (period.unit === 'years') {
    return val === 1 ? '1 year' : `${val} years`;
  }
  return val === 1 ? '1 month' : `${val} months`;
}

/**
 * Determines the contract's renewal duration.
 * Checks contract.autoExtendPeriod, falls back to parsing renewalPeriod string, then user default.
 */
export function getContractAutoExtendPeriod(
  contract: Partial<Contract>,
  defaultPeriod?: AutoExtendPeriod
): AutoExtendPeriod {
  if (contract.autoExtendPeriod && contract.autoExtendPeriod.value > 0) {
    return contract.autoExtendPeriod;
  }
  if (contract.renewalPeriod) {
    const lower = contract.renewalPeriod.toLowerCase();
    if (lower.includes('month') || lower.includes('maand')) {
      const match = lower.match(/(\d+)\s*(month|maand)/);
      const val = match ? parseInt(match[1], 10) : 1;
      return { value: val || 1, unit: 'months' };
    }
    if (lower.includes('year') || lower.includes('jaar')) {
      const match = lower.match(/(\d+)\s*(year|jaar)/);
      const val = match ? parseInt(match[1], 10) : 1;
      return { value: val || 1, unit: 'years' };
    }
  }
  return defaultPeriod || { value: 1, unit: 'years' };
}

/**
 * Automatically calculates extended contract dates when deadline passes.
 * Advances term by the specified autoExtendPeriod until deadline is in the present/future.
 */
export function calculateAutoExtendedDates(
  contract: Contract,
  overridePeriod?: AutoExtendPeriod
): {
  startDate: string;
  endDate: string;
  cancellationDeadline: string;
  periodsAdded: number;
  periodUsed: AutoExtendPeriod;
} {
  const period = overridePeriod || getContractAutoExtendPeriod(contract);
  let curStart = contract.startDate || getTodayString();
  let curEnd = contract.endDate || getTodayString();
  let curDeadline = contract.cancellationDeadline || calculateCancellationDeadline(curEnd, contract.noticePeriod);
  let periodsAdded = 0;

  // Advance by period at least once, and continue if deadline is still in the past (up to max 12 iterations)
  do {
    curStart = curEnd;
    curEnd = shiftDateByPeriod(curEnd, period.value, period.unit);
    curDeadline = calculateCancellationDeadline(curEnd, contract.noticePeriod);
    periodsAdded++;
  } while (getDaysRemaining(curDeadline) < 0 && periodsAdded < 12);

  return {
    startDate: curStart,
    endDate: curEnd,
    cancellationDeadline: curDeadline,
    periodsAdded,
    periodUsed: period,
  };
}

/**
 * Calculates remaining days from today until the target date
 */
export function getDaysRemaining(targetDateStr: string): number {
  if (!targetDateStr) return 0;
  const todayStr = getTodayString();
  const [todayY, todayM, todayD] = todayStr.split('-').map(Number);
  const [targetY, targetM, targetD] = targetDateStr.split('-').map(Number);

  const dToday = new Date(Date.UTC(todayY, todayM - 1, todayD));
  const dTarget = new Date(Date.UTC(targetY, targetM - 1, targetD));

  const diffMs = dTarget.getTime() - dToday.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines urgency level based on cancellation deadline and status
 */
export function getUrgencyLevel(
  cancellationDeadlineStr: string,
  status: string = 'active'
): UrgencyLevel {
  if (status !== 'active') {
    return 'later';
  }
  const days = getDaysRemaining(cancellationDeadlineStr);
  if (days < 0) return 'overdue';
  if (days <= 30) return 'next_30';
  if (days <= 90) return '31_90';
  return 'later';
}

/**
 * Human readable urgency display info
 */
export function getUrgencyMetadata(urgency: UrgencyLevel, daysRemaining: number) {
  switch (urgency) {
    case 'overdue':
      return {
        label: 'Overdue',
        badgeText: `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`,
        colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900',
        textClass: 'text-rose-600 dark:text-rose-400',
        borderClass: 'border-l-rose-500',
        bgSubtle: 'bg-rose-500/10',
        priority: 1,
      };
    case 'next_30':
      return {
        label: 'Next 30 Days',
        badgeText: daysRemaining === 0 ? 'Deadline today!' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`,
        colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900',
        textClass: 'text-amber-600 dark:text-amber-400',
        borderClass: 'border-l-amber-500',
        bgSubtle: 'bg-amber-500/10',
        priority: 2,
      };
    case '31_90':
      return {
        label: '31–90 Days',
        badgeText: `${daysRemaining} days left`,
        colorClass: 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/60 border-yellow-200 dark:border-yellow-900',
        textClass: 'text-yellow-700 dark:text-yellow-400',
        borderClass: 'border-l-yellow-500',
        bgSubtle: 'bg-yellow-500/10',
        priority: 3,
      };
    case 'later':
    default:
      return {
        label: 'Later (>90d)',
        badgeText: `${daysRemaining} days left`,
        colorClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        borderClass: 'border-l-emerald-500',
        bgSubtle: 'bg-emerald-500/10',
        priority: 4,
      };
  }
}

/**
 * Format date nicely: "30 Nov 2026"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Returns the short display symbol or letter string of the currency
 * e.g. "€", "$", "CHF", "kr", "DKK"
 */
export function getCurrencyLabel(currency: string = 'EUR'): string {
  if (!currency) return '€';
  if (currency.startsWith('custom:')) {
    return currency.replace('custom:', '').trim();
  }
  const standardPresets: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
  };
  return standardPresets[currency] || currency;
}

/**
 * Format currency with symbol and tabular decimals
 * Supports standard presets (EUR, USD, GBP, CHF) as well as custom letter currency codes (e.g. kr, DKK, CAD, SEK, custom:EUR, etc.)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR'
): string {
  const formattedNum = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!currency) return `€ ${formattedNum}`;

  // If explicit custom letter prefix e.g. "custom:kr" or "custom:EUR"
  if (currency.startsWith('custom:')) {
    const customCode = currency.replace('custom:', '').trim();
    return `${customCode} ${formattedNum}`;
  }

  // Standard presets mapping
  const presets: Record<string, string> = {
    EUR: '€ ',
    USD: '$ ',
    GBP: '£ ',
    CHF: 'CHF ',
    '€': '€ ',
    '$': '$ ',
    '£': '£ ',
  };

  if (presets[currency]) {
    return `${presets[currency]}${formattedNum}`;
  }

  // Any custom letter-based currency input (e.g. "kr", "DKK", "SEK", "CAD", "AUD")
  const trimmed = currency.trim();
  const prefix = trimmed.endsWith(' ') ? trimmed : `${trimmed} `;
  return `${prefix}${formattedNum}`;
}

/**
 * Calculates and formats the contract duration between startDate and endDate.
 * e.g. "1 year", "2 years", "6 months", "1 year, 3 mo", or "Rolling / Open-ended"
 */
export function formatContractDuration(
  startDate?: string,
  endDate?: string,
  isRolling?: boolean
): string {
  if (isRolling) return 'Rolling / Open-ended';
  if (!startDate || !endDate) {
    if (endDate) return `Until ${formatDate(endDate)}`;
    if (startDate) return `From ${formatDate(startDate)}`;
    return '—';
  }

  const [sY, sM, sD] = startDate.split('-').map(Number);
  const [eY, eM, eD] = endDate.split('-').map(Number);
  if (!sY || !eY) return '—';

  const dStart = new Date(Date.UTC(sY, sM - 1, sD));
  const dEnd = new Date(Date.UTC(eY, eM - 1, eD));
  const diffMs = dEnd.getTime() - dStart.getTime();
  if (diffMs < 0) return 'End date is before start date';

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '1 day';

  if (diffDays <= 45) {
    return `${diffDays} days`;
  }

  // Calculate year and month difference
  let totalMonths = (eY - sY) * 12 + (eM - sM);
  if (eD < sD - 3) {
    totalMonths -= 1;
  } else if (eD > sD + 25) {
    totalMonths += 1;
  }

  if (totalMonths <= 0) {
    return `${diffDays} days`;
  }

  if (totalMonths < 12) {
    return `${totalMonths} month${totalMonths === 1 ? '' : 's'}`;
  }

  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;

  if (remainingMonths === 0) {
    return `${years} year${years === 1 ? '' : 's'}`;
  }

  return `${years} year${years === 1 ? '' : 's'}, ${remainingMonths} mo`;
}
