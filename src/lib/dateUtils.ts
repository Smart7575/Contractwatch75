import { NoticePeriod, UrgencyLevel } from '../types';

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

  if (!currency) return `€${formattedNum}`;

  // If explicit custom letter prefix e.g. "custom:kr" or "custom:EUR"
  if (currency.startsWith('custom:')) {
    const customCode = currency.replace('custom:', '').trim();
    return `${customCode} ${formattedNum}`;
  }

  // Standard presets mapping
  const presets: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF ',
  };

  if (presets[currency]) {
    return `${presets[currency]}${formattedNum}`;
  }

  // Any custom letter-based currency input (e.g. "kr", "DKK", "SEK", "CAD", "AUD")
  const trimmed = currency.trim();
  const prefix = /^[A-Za-z\u00C0-\u024F]+$/.test(trimmed) ? `${trimmed} ` : `${trimmed} `;
  return `${prefix}${formattedNum}`;
}
