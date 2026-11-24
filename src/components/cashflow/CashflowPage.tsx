import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CoverageType } from '../../types';
import {
  buildCashflowCSV,
  generateCashflowForecast,
  MonthlyCashflowBucket,
} from '../../lib/cashflowForecast';
import { formatCurrency, formatDate, getCurrencyLabel, getDaysRemaining } from '../../lib/dateUtils';
import { exportFile } from '../../lib/fileExportHelper';
import {
  Calendar,
  Download,
  Filter,
  Plus,
  Search,
  TrendingUp,
  X,
} from 'lucide-react';

export const CashflowPage: React.FC = () => {
  const {
    contracts,
    categories,
    user,
    setSelectedContractId,
    setIsAddModalOpen,
  } = useApp();

  const [horizonMonths, setHorizonMonths] = useState<6 | 12 | 24>(12);
  const [includeAutoRenewals, setIncludeAutoRenewals] = useState<boolean>(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedCoverageType, setSelectedCoverageType] = useState<'all' | CoverageType>('all');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string | null>(null);
  const [hoveredYearMonth, setHoveredYearMonth] = useState<string | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [lumpSumsOnly, setLumpSumsOnly] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const currency = user.settings.currency || 'EUR';

  const forecast = useMemo(
    () =>
      generateCashflowForecast(contracts, categories, {
        horizonMonths,
        includeAutoRenewals,
        categoryId: selectedCategoryId,
        coverageType: selectedCoverageType,
      }),
    [contracts, categories, horizonMonths, includeAutoRenewals, selectedCategoryId, selectedCoverageType]
  );

  // Also compute committed-only total when renewals are on, so users can see the difference
  const committedOnlyForecast = useMemo(() => {
    if (!includeAutoRenewals) return forecast;
    return generateCashflowForecast(contracts, categories, {
      horizonMonths,
      includeAutoRenewals: false,
      categoryId: selectedCategoryId,
      coverageType: selectedCoverageType,
    });
  }, [contracts, categories, horizonMonths, includeAutoRenewals, selectedCategoryId, selectedCoverageType, forecast]);

  const activeMonthBucket: MonthlyCashflowBucket | null = useMemo(() => {
    if (!selectedYearMonth) return null;
    return forecast.months.find((m) => m.yearMonth === selectedYearMonth) || null;
  }, [forecast.months, selectedYearMonth]);

  const hoveredMonthBucket: MonthlyCashflowBucket | null = useMemo(() => {
    if (!hoveredYearMonth) return null;
    return forecast.months.find((m) => m.yearMonth === hoveredYearMonth) || null;
  }, [forecast.months, hoveredYearMonth]);

  const formatWholeCurrency = (amount: number): string => {
    const rounded = Math.round(amount || 0);
    const formattedNum = rounded.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const label = getCurrencyLabel(currency);
    return `${label} ${formattedNum}`;
  };

  const { maxChartAmount, yAxisTicks } = useMemo(() => {
    const maxMonth = forecast.months.reduce((max, m) => Math.max(max, m.totalAmount), 0);
    const rawMax = Math.max(maxMonth, forecast.averageMonthlySpend, 100);
    const ceilHundreds = Math.max(100, Math.ceil(rawMax / 100) * 100);

    if (ceilHundreds <= 500) {
      const ticks: number[] = [];
      for (let v = 100; v <= ceilHundreds; v += 100) {
        ticks.push(v);
      }
      return { maxChartAmount: ceilHundreds, yAxisTicks: ticks };
    }

    let bestMax = Infinity;
    let bestStep = 100;
    let bestCount = 4;

    for (const k of [4, 5, 3]) {
      const step = Math.ceil(rawMax / k / 100) * 100;
      const candidateMax = step * k;
      if (candidateMax < bestMax) {
        bestMax = candidateMax;
        bestStep = step;
        bestCount = k;
      }
    }

    const ticks: number[] = [];
    for (let i = 1; i <= bestCount; i++) {
      ticks.push(bestStep * i);
    }
    return { maxChartAmount: bestMax, yAxisTicks: ticks };
  }, [forecast.months, forecast.averageMonthlySpend]);

  const ledgerPayments = useMemo(() => {
    const base = activeMonthBucket ? activeMonthBucket.payments : forecast.allPayments;
    return base.filter((p) => {
      if (lumpSumsOnly && p.paymentFrequency === 'monthly') return false;
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        return (
          p.contractName.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.coverageType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeMonthBucket, forecast.allPayments, lumpSumsOnly, ledgerSearch]);

  const ledgerTotal = useMemo(
    () => ledgerPayments.reduce((sum, p) => sum + p.amount, 0),
    [ledgerPayments]
  );

  const handleExportCSV = async () => {
    const csv = buildCashflowCSV(forecast, currency);
    const today = new Date().toISOString().split('T')[0];
    const scopeSuffix = selectedCoverageType === 'all' ? '' : `${selectedCoverageType}-`;
    await exportFile({
      filename: `cashflow-forecast-${scopeSuffix}${horizonMonths}m-${today}.csv`,
      content: csv,
      mimeType: 'text/csv;charset=utf-8;',
      title: 'Cashflow Forecast CSV',
    });
    setExportMessage(`Exported ${forecast.allPayments.length} scheduled payments`);
    setTimeout(() => setExportMessage(null), 3500);
  };

  const peakAboveAvgPct =
    forecast.peakMonth && forecast.averageMonthlySpend > 0
      ? Math.round(
          ((forecast.peakMonth.totalAmount - forecast.averageMonthlySpend) /
            forecast.averageMonthlySpend) *
            100
        )
      : 0;

  const avgLinePercent = Math.min(
    100,
    Math.max(0, (forecast.averageMonthlySpend / maxChartAmount) * 100)
  );

  const renewalOptionalSpend = Math.max(
    0,
    forecast.totalForecastedSpend - committedOnlyForecast.totalForecastedSpend
  );

  if (contracts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cashflow Forecast
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Project monthly cash outlays, quarterly renewals, and annual lump-sum bills across your portfolio.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            No contracts to forecast yet
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Add your active or upcoming contracts with their billing frequency and renewal terms to see monthly cashflow projections.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Contract</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cashflow Forecast
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Projected cash outlay across {forecast.activeForecastContractsCount}{' '}
            {selectedCoverageType === 'all' ? '' : `${selectedCoverageType} `}
            active &amp; upcoming contracts
            {exportMessage ? ` · ${exportMessage}` : ''}
          </p>
        </div>

        {/* Single-line Control Cluster */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Horizon Segmented Control */}
          <div
            role="group"
            aria-label="Forecast horizon"
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/70 dark:border-slate-700/70 overflow-x-auto max-w-full"
          >
            {([6, 12, 24] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setHorizonMonths(m);
                  setSelectedYearMonth(null);
                }}
                className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  horizonMonths === m
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {m} Months
              </button>
            ))}
          </div>

          {/* Scenario Segmented Control */}
          <div
            role="group"
            aria-label="Renewal projection mode"
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/70 dark:border-slate-700/70 overflow-x-auto max-w-full"
          >
            <button
              onClick={() => setIncludeAutoRenewals(true)}
              className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                includeAutoRenewals
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Incl. Renewals
            </button>
            <button
              onClick={() => setIncludeAutoRenewals(false)}
              className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                !includeAutoRenewals
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Committed Only
            </button>
          </div>

          {/* Scope Segmented Control (All / Individual / Family) */}
          <div
            role="group"
            aria-label="Filter forecast by scope"
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/70 dark:border-slate-700/70 overflow-x-auto max-w-full"
          >
            {([
              { value: 'all', label: 'All Scopes' },
              { value: 'individual', label: 'Individual' },
              { value: 'family', label: 'Family' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedCoverageType(opt.value);
                  setSelectedYearMonth(null);
                }}
                className={`min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedCoverageType === opt.value
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="relative flex items-center min-w-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              aria-label="Filter forecast by category"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setSelectedYearMonth(null);
              }}
              className="w-full min-w-0 min-h-[44px] sm:min-h-[36px] pl-8 pr-3 py-2 text-base sm:text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={forecast.allPayments.length === 0}
            className="min-h-[44px] sm:min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric 1: Total Forecasted Outlay */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {horizonMonths}-Month Forecast Total
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {formatCurrency(forecast.totalForecastedSpend, currency)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono tabular-nums truncate">
            {includeAutoRenewals
              ? `${formatCurrency(committedOnlyForecast.totalForecastedSpend, currency)} committed · ${formatCurrency(renewalOptionalSpend, currency)} renewal`
              : 'Excluding optional auto-renewals'}
          </div>
        </div>

        {/* Metric 2: Monthly Average vs Run-Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Monthly Cash Average
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums mt-1">
            {formatCurrency(forecast.averageMonthlySpend, currency)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono tabular-nums truncate">
            {formatCurrency(forecast.monthlyRecurringBaseline, currency)}/mo current normalized run-rate
          </div>
        </div>

        {/* Metric 3: Peak Cashflow Month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Peak Outlay Month
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1">
            {forecast.peakMonth ? formatCurrency(forecast.peakMonth.totalAmount, currency) : formatCurrency(0, currency)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
            {forecast.peakMonth ? (
              <>
                <button
                  onClick={() => setSelectedYearMonth(forecast.peakMonth!.yearMonth)}
                  className="font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-slate-300 dark:decoration-slate-700 cursor-pointer"
                >
                  {forecast.peakMonth.label}
                </button>
                <span aria-hidden="true"> · </span>
                <span className="font-mono tabular-nums">
                  {peakAboveAvgPct > 0 ? `+${peakAboveAvgPct}% vs avg` : 'At monthly avg'}
                </span>
              </>
            ) : (
              'No scheduled bills'
            )}
          </div>
        </div>

        {/* Metric 4: Ending / Cancelled Commitments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Ending Within Horizon
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1">
            {formatCurrency(forecast.annualizedEndingAmount, currency)}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/yr</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
            {forecast.expiringCommitments.length > 0
              ? `${forecast.expiringCommitments.length} contract${forecast.expiringCommitments.length === 1 ? '' : 's'} rolling off`
              : 'All tracked contracts ongoing'}
          </div>
        </div>
      </div>

      {/* Primary Interactive Chart Surface */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Monthly Cash Outlay Projection
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any month column to filter the scheduled payments ledger below
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" />
              Monthly Bills
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 inline-block" />
              Quarterly Bills
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
              Annual Lump Sums
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono tabular-nums font-semibold text-teal-700 dark:text-teal-300">
              <span className="w-4 border-t-2 border-dotted border-teal-500 dark:border-teal-400 inline-block" />
              Avg {formatWholeCurrency(forecast.averageMonthlySpend)}
            </span>
          </div>
        </div>

        {/* Hovered or Selected Month Detail Readout Bar */}
        <div className="min-h-[36px] flex flex-wrap items-center justify-between gap-2 py-2.5 border-b border-slate-100 dark:border-slate-800/80 text-xs">
          {hoveredMonthBucket || activeMonthBucket ? (
            (() => {
              const target = hoveredMonthBucket || activeMonthBucket!;
              return (
                <div className="flex flex-wrap items-center gap-3 text-slate-700 dark:text-slate-200">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {target.label}
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-mono tabular-nums font-semibold">
                    Total {formatCurrency(target.totalAmount, currency)}
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Monthly {formatCurrency(target.monthlyAmount, currency)}
                  </span>
                  <span className="font-mono tabular-nums text-sky-600 dark:text-sky-400">
                    Quarterly {formatCurrency(target.quarterlyAmount, currency)}
                  </span>
                  <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    Annual {formatCurrency(target.annualAmount, currency)}
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {target.payments.length} bill{target.payments.length === 1 ? '' : 's'}
                  </span>
                </div>
              );
            })()
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              Hover a month bar to inspect breakdown, or click to drill into individual charges.
            </span>
          )}

          {selectedYearMonth && (
            <button
              onClick={() => setSelectedYearMonth(null)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Show all {horizonMonths} months</span>
            </button>
          )}
        </div>

        {/* Responsive Stacked Bar Plot with Dedicated Left Y-Axis (No Overlap) */}
        <div className="pt-2 pb-1 flex items-start">
          {/* Dedicated Left Y-Axis Column */}
          <div className="shrink-0 w-20 sm:w-24 pt-6 pr-2.5 select-none">
            <div className="relative h-64">
              {/* Zero baseline tick */}
              {!(forecast.averageMonthlySpend > 0 && avgLinePercent < 7) && (
                <span
                  className="absolute right-0 translate-y-1/2 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 leading-none whitespace-nowrap"
                  style={{ bottom: '0%' }}
                >
                  {formatWholeCurrency(0)}
                </span>
              )}

              {/* Whole-hundreds Y-axis ticks */}
              {yAxisTicks.map((tickVal) => {
                const tickPct = (tickVal / maxChartAmount) * 100;
                const collidesWithAvg =
                  forecast.averageMonthlySpend > 0 && Math.abs(tickPct - avgLinePercent) < 7;
                if (collidesWithAvg) return null;

                return (
                  <span
                    key={tickVal}
                    className="absolute right-0 translate-y-1/2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 leading-none whitespace-nowrap"
                    style={{ bottom: `${tickPct}%` }}
                  >
                    {formatWholeCurrency(tickVal)}
                  </span>
                );
              })}

              {/* Exact Monthly Average Readout in Bold Green on Y-Axis (Zero Decimals) */}
              {forecast.averageMonthlySpend > 0 && (
                <span
                  className="absolute right-0 translate-y-1/2 text-[11px] font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 pl-1 py-0.5 leading-none whitespace-nowrap z-20"
                  style={{ bottom: `${avgLinePercent}%` }}
                  title={`Exact monthly average: ${formatWholeCurrency(forecast.averageMonthlySpend)}`}
                >
                  {formatWholeCurrency(forecast.averageMonthlySpend)}
                </span>
              )}
            </div>
          </div>

          {/* Scrollable Plot Area & X-Axis Labels */}
          <div className="flex-1 min-w-0 overflow-x-auto pb-1">
            <div
              className={`pt-6 ${
                horizonMonths === 24 ? 'min-w-[720px]' : 'min-w-[440px]'
              }`}
            >
              <div className="relative h-64 flex items-end gap-1.5 sm:gap-2.5 px-2 sm:px-3 border-l border-slate-200 dark:border-slate-800">
                {/* Horizontal Grid Lines at Whole-Hundred Ticks */}
                {yAxisTicks.map((tickVal) => {
                  const tickPct = (tickVal / maxChartAmount) * 100;
                  return (
                    <div
                      key={tickVal}
                      aria-hidden="true"
                      className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800/80 pointer-events-none"
                      style={{ bottom: `${tickPct}%` }}
                    />
                  );
                })}

                {/* Dotted Blue-Green (Teal) Average Line */}
                {forecast.averageMonthlySpend > 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute left-0 right-0 border-t-2 border-dotted border-teal-500 dark:border-teal-400 pointer-events-none z-10"
                    style={{ bottom: `${avgLinePercent}%` }}
                  />
                )}

                {/* Month Columns */}
                {forecast.months.map((m) => {
                  const totalPct = maxChartAmount > 0 ? (m.totalAmount / maxChartAmount) * 100 : 0;
                  const monthlyPct = m.totalAmount > 0 ? (m.monthlyAmount / m.totalAmount) * 100 : 0;
                  const quarterlyPct = m.totalAmount > 0 ? (m.quarterlyAmount / m.totalAmount) * 100 : 0;
                  const annualPct = m.totalAmount > 0 ? (m.annualAmount / m.totalAmount) * 100 : 0;
                  const isSelected = selectedYearMonth === m.yearMonth;
                  const isDimmed = selectedYearMonth !== null && !isSelected;

                  return (
                    <button
                      key={m.yearMonth}
                      type="button"
                      onClick={() =>
                        setSelectedYearMonth((prev) =>
                          prev === m.yearMonth ? null : m.yearMonth
                        )
                      }
                      onMouseEnter={() => setHoveredYearMonth(m.yearMonth)}
                      onMouseLeave={() => setHoveredYearMonth(null)}
                      className={`group relative flex-1 h-full flex flex-col justify-end items-center focus:outline-hidden cursor-pointer transition-opacity ${
                        isDimmed ? 'opacity-45 hover:opacity-80' : 'opacity-100'
                      }`}
                      aria-label={`${m.label}: ${formatCurrency(m.totalAmount, currency)} across ${m.payments.length} bills`}
                    >
                      {/* Column Value Label above bar when space permits */}
                      {horizonMonths <= 12 && m.totalAmount > 0 && (
                        <span
                          className="absolute left-1/2 -translate-x-1/2 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20"
                          style={{
                            bottom: `calc(${Math.max(totalPct, m.totalAmount > 0 ? 3 : 0)}% + 4px)`,
                          }}
                        >
                          {formatCurrency(m.totalAmount, currency)}
                        </span>
                      )}

                      {/* Stacked Bar Track */}
                      <div
                        className={`w-full max-w-[38px] rounded-t-md overflow-hidden flex flex-col-reverse transition-transform duration-150 ${
                          isSelected
                            ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900'
                            : 'group-hover:-translate-y-0.5'
                        }`}
                        style={{
                          height: `${Math.max(totalPct, m.totalAmount > 0 ? 3 : 0)}%`,
                        }}
                      >
                        {m.monthlyAmount > 0 && (
                          <div
                            className="w-full bg-indigo-500 dark:bg-indigo-500"
                            style={{ height: `${monthlyPct}%` }}
                          />
                        )}
                        {m.quarterlyAmount > 0 && (
                          <div
                            className="w-full bg-sky-500 dark:bg-sky-400"
                            style={{ height: `${quarterlyPct}%` }}
                          />
                        )}
                        {m.annualAmount > 0 && (
                          <div
                            className="w-full bg-amber-500 dark:bg-amber-400"
                            style={{ height: `${annualPct}%` }}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Month X-Axis Labels */}
              <div className="flex items-start gap-1.5 sm:gap-2.5 px-2 sm:px-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                {forecast.months.map((m, idx) => {
                  const isSelected = selectedYearMonth === m.yearMonth;
                  const showYear = idx === 0 || m.shortLabel === 'Jan';
                  return (
                    <button
                      key={m.yearMonth}
                      type="button"
                      onClick={() =>
                        setSelectedYearMonth((prev) =>
                          prev === m.yearMonth ? null : m.yearMonth
                        )
                      }
                      className={`flex-1 text-center cursor-pointer transition-colors ${
                        isSelected
                          ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-medium leading-tight">{m.shortLabel}</div>
                      {showYear && (
                        <div className="text-[9px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                          {m.yearLabel}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lower Two-Column Analytical Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Scheduled Payments Ledger (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {activeMonthBucket
                  ? `Scheduled Payments — ${activeMonthBucket.label}`
                  : `Scheduled Payments — Next ${horizonMonths} Months`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                {ledgerPayments.length} payment{ledgerPayments.length === 1 ? '' : 's'} ·{' '}
                {formatCurrency(ledgerTotal, currency)} total
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 min-w-0 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Filter bills..."
                  aria-label="Filter scheduled payments"
                  className="w-full sm:w-44 min-w-0 min-h-[44px] sm:min-h-[34px] pl-8 pr-3 py-1.5 text-base sm:text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <button
                onClick={() => setLumpSumsOnly((v) => !v)}
                className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  lumpSumsOnly
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Lump Sums Only
              </button>
            </div>
          </div>

          {ledgerPayments.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No scheduled payments match this filter.
              {(selectedYearMonth || ledgerSearch || lumpSumsOnly || selectedCategoryId !== 'all' || selectedCoverageType !== 'all') && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setSelectedYearMonth(null);
                      setLedgerSearch('');
                      setLumpSumsOnly(false);
                      setSelectedCategoryId('all');
                      setSelectedCoverageType('all');
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Reset forecast filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-4 whitespace-nowrap">Charge Date</th>
                    <th className="py-2.5 px-3">Contract &amp; Billing</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {ledgerPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                        {formatDate(payment.chargeDate)}
                      </td>
                      <td className="py-2.5 px-3 align-top">
                        <button
                          onClick={() => setSelectedContractId(payment.contractId)}
                          className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer transition-colors"
                        >
                          {payment.contractName}
                        </button>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                          <span>{payment.supplier}</span>
                          <span aria-hidden="true">·</span>
                          <span>{payment.coverageType === 'family' ? 'Family' : 'Individual'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{payment.categoryName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{payment.paymentFrequency}</span>
                          {payment.isRenewalProjection && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                Projected renewal
                              </span>
                            </>
                          )}
                          {payment.isCancelledEnding && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-teal-700 dark:text-teal-400 font-medium">
                                Final term (ends {formatDate(payment.endDate)})
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap align-top">
                        {formatCurrency(payment.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right: Upcoming Lump Sums, Category Breakdown & Ending Commitments (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Panel A: Upcoming Quarterly & Annual Lump Sums */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Upcoming Lump-Sum Bills
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Next quarterly &amp; annual charges in your horizon
                </p>
              </div>
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {forecast.upcomingLumpSums.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-5 text-center">
                No quarterly or annual lump-sum charges scheduled in this window.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {forecast.upcomingLumpSums.map((item) => {
                  const daysToCharge = getDaysRemaining(item.chargeDate);
                  const daysToNotice = item.cancellationDeadline
                    ? getDaysRemaining(item.cancellationDeadline)
                    : null;
                  const canStillCancel =
                    !item.isCancelledEnding && daysToNotice !== null && daysToNotice >= 0;

                  return (
                    <div
                      key={item.id}
                      className="py-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <button
                          onClick={() => setSelectedContractId(item.contractId)}
                          className="text-xs font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left truncate block max-w-full cursor-pointer"
                        >
                          {item.contractName}
                        </button>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono tabular-nums">{formatDate(item.chargeDate)}</span>
                          <span aria-hidden="true"> · </span>
                          <span>in {daysToCharge}d</span>
                          <span aria-hidden="true"> · </span>
                          <span className="capitalize">{item.paymentFrequency}</span>
                          {canStillCancel && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Notice in {daysToNotice}d
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-mono tabular-nums font-bold text-slate-900 dark:text-white shrink-0">
                        {formatCurrency(item.amount, currency)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Panel B: Outlay Share by Category */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Outlay by Category ({horizonMonths}M)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cumulative spend distribution across your forecast horizon
              </p>
            </div>

            {forecast.categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-5 text-center">
                No category outlay in this forecast window.
              </p>
            ) : (
              <div className="space-y-3.5 pt-4">
                {forecast.categoryBreakdown.map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: cat.categoryColor }}
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {cat.categoryName}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                          {cat.contractCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {Math.round(cat.sharePercent)}%
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(cat.totalAmount, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(cat.sharePercent, 2)}%`,
                          backgroundColor: cat.categoryColor,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Panel C: Contracts Rolling Off (Scheduled Relief) */}
          {forecast.expiringCommitments.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Scheduled Spend Reductions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Contracts ending during this horizon without renewal
                </p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {forecast.expiringCommitments.map((item) => (
                  <div
                    key={item.contract.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <button
                        onClick={() => setSelectedContractId(item.contract.id)}
                        className="text-xs font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block max-w-full text-left cursor-pointer"
                      >
                        {item.contract.name}
                      </button>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Ends {formatDate(item.endDate)}
                        <span aria-hidden="true"> · </span>
                        {item.reason === 'cancelled' ? 'Cancelled (Active)' : 'Manual expiration'}
                      </div>
                    </div>
                    <div className="text-xs font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                      -{formatCurrency(item.annualAmount, currency)}/yr
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
