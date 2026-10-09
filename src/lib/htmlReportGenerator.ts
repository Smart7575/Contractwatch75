import { Contract, Category, User } from '../types';
import { formatCurrency, formatDate, getDaysRemaining } from './dateUtils';

export function generatePrintableHTML(
  contracts: Contract[],
  categories: Category[],
  user: User
): string {
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const totalAnnualSpend = activeContracts.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const totalMonthlySpend = activeContracts.reduce((sum, c) => sum + (c.monthlyCost || 0), 0);
  const totalDocs = contracts.reduce((sum, c) => sum + (c.documentLinks?.length || 0), 0);

  const categoriesHtml = categories
    .map((cat) => {
      const catContracts = contracts.filter((c) => c.categoryId === cat.id);
      if (catContracts.length === 0) return '';

      const catSpend = catContracts
        .filter((c) => c.status === 'active')
        .reduce((sum, c) => sum + (c.annualCost || 0), 0);

      const contractsRows = catContracts
        .map((c) => {
          const days = getDaysRemaining(c.cancellationDeadline);
          const docsHtml =
            c.documentLinks && c.documentLinks.length > 0
              ? c.documentLinks
                  .map(
                    (d) => `
                <div class="doc-item">
                  <span class="doc-badge">[${d.provider.toUpperCase()} / ${d.type}]</span>
                  <strong>${d.title}</strong>
                  ${d.note ? `<span class="doc-note">(${d.note})</span>` : ''}
                  <a href="${d.url}" target="_blank" class="doc-url">${d.url}</a>
                </div>
              `
                  )
                  .join('')
              : '<span class="empty-docs">No documents attached</span>';

          const urgencyClass = days < 0 ? 'overdue' : days <= 30 ? 'urgent' : 'normal';
          const urgencyLabel =
            days < 0
              ? `${Math.abs(days)} days OVERDUE`
              : days === 0
              ? 'Due today'
              : `${days} days left`;

          return `
            <div class="contract-card ${urgencyClass}">
              <div class="contract-header">
                <div>
                  <h3 class="contract-title">${c.name}</h3>
                  <div class="contract-sub">
                    <strong>${c.supplier}</strong> · ${c.subcategory}
                    ${c.coverageType ? `· <span class="coverage-badge" style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">${c.coverageType === 'family' ? 'Family' : 'Individual'}</span>` : ''}
                    ${c.contractNumber ? `· Ref: ${c.contractNumber}` : ''}
                    · Status: <span class="status-${c.status}">${c.status.toUpperCase()}</span>
                  </div>
                </div>
                <div class="contract-cost">
                  <div class="cost-annual">${formatCurrency(c.annualCost, user.settings.currency)}/yr</div>
                  <div class="cost-monthly">~${formatCurrency(c.monthlyCost, user.settings.currency)}/mo (${c.paymentFrequency})</div>
                </div>
              </div>

              <div class="contract-meta-grid">
                <div>
                  <span class="label">Cancellation Deadline:</span>
                  <strong class="value ${urgencyClass}">${formatDate(c.cancellationDeadline)} (${urgencyLabel})</strong>
                </div>
                <div>
                  <span class="label">Term:</span>
                  <span class="value">${c.startDate ? formatDate(c.startDate) : '—'} → ${c.isEndDateOpenEnded ? 'Open-ended' : formatDate(c.endDate)}</span>
                </div>
                <div>
                  <span class="label">Notice Period:</span>
                  <span class="value">${c.noticePeriod.value} ${c.noticePeriod.unit}</span>
                </div>
                <div>
                  <span class="label">Renewal Policy:</span>
                  <span class="value">${c.autoRenew ? c.renewalPeriod || 'Auto-renewal' : 'Manual expiration'}</span>
                </div>
              </div>

              ${(c.contact?.phone || c.contact?.email) ? `
                <div class="contact-line">
                  ${c.contact.phone ? `<span>📞 ${c.contact.phone}</span>` : ''}
                  ${c.contact.email ? `<span>✉️ ${c.contact.email}</span>` : ''}
                  ${c.contact.url ? `<span>🌐 <a href="${c.contact.url}">${c.contact.url}</a></span>` : ''}
                </div>
              ` : ''}

              <div class="contract-docs">
                <div class="docs-heading">Attached Document Links (${c.documentLinks?.length || 0}):</div>
                ${docsHtml}
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <section class="category-block">
          <div class="category-header">
            <h2>${cat.name}</h2>
            <div class="cat-summary">
              ${catContracts.length} contract${catContracts.length === 1 ? '' : 's'} · Total: ${formatCurrency(catSpend, user.settings.currency)}/yr
            </div>
          </div>
          <div class="contracts-list">
            ${contractsRows}
          </div>
        </section>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ContractWatch Portfolio Report - ${user.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .print-bar {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .print-btn {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
    }
    .header-banner {
      background: #4f46e5;
      color: #ffffff;
      padding: 20px 24px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .header-banner h1 { margin: 0 0 6px 0; font-size: 22px; }
    .header-banner p { margin: 0; opacity: 0.9; font-size: 13px; }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #f8fafc;
    }
    .kpi-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
    .kpi-value { font-size: 18px; font-weight: bold; margin-top: 4px; color: #0f172a; font-family: monospace; }
    .kpi-sub { font-size: 11px; color: #94a3b8; }
    .category-block { margin-bottom: 28px; page-break-inside: avoid; }
    .category-header {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .category-header h2 { margin: 0; font-size: 14px; color: #1e293b; }
    .cat-summary { font-size: 12px; color: #64748b; font-weight: 500; }
    .contract-card {
      border: 1px solid #e2e8f0;
      border-left: 4px solid #4f46e5;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .contract-card.urgent { border-left-color: #f59e0b; }
    .contract-card.overdue { border-left-color: #f43f5e; }
    .contract-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .contract-title { margin: 0 0 3px 0; font-size: 15px; color: #0f172a; }
    .contract-sub { font-size: 12px; color: #64748b; }
    .contract-cost { text-align: right; }
    .cost-annual { font-size: 16px; font-weight: bold; font-family: monospace; }
    .cost-monthly { font-size: 11px; color: #64748b; font-family: monospace; }
    .contract-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      padding: 10px;
      border-radius: 6px;
      font-size: 11px;
      margin-bottom: 10px;
    }
    .label { display: block; color: #64748b; font-size: 10px; }
    .value { font-weight: 600; color: #1e293b; }
    .value.urgent { color: #d97706; }
    .value.overdue { color: #e11d48; }
    .contact-line { font-size: 11px; color: #64748b; display: flex; gap: 14px; margin-bottom: 10px; }
    .contact-line a { color: #4f46e5; text-decoration: none; }
    .contract-docs {
      background: #fafafa;
      border: 1px dashed #cbd5e1;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
    }
    .docs-heading { font-weight: bold; margin-bottom: 6px; color: #4f46e5; }
    .doc-item { margin-bottom: 4px; line-height: 1.4; }
    .doc-badge { font-weight: bold; color: #475569; font-size: 10px; margin-right: 4px; }
    .doc-note { color: #d97706; font-size: 10px; margin-left: 4px; }
    .doc-url { color: #4f46e5; word-break: break-all; text-decoration: underline; margin-left: 6px; font-family: monospace; font-size: 10px; }
    .empty-docs { color: #94a3b8; font-style: italic; }
    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div><strong>ContractWatch Portfolio Report</strong> · Prepared for ${user.name}</div>
    <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
  </div>

  <div class="header-banner">
    <h1>Contract Portfolio & Documents Dossier</h1>
    <p>Complete category-by-category breakdown with notice deadlines, supplier contacts, and attached document links.</p>
    <p style="font-size: 11px; margin-top: 6px; opacity: 0.8;">Generated on ${formatDate(new Date().toISOString().split('T')[0])} for ${user.name} (${user.email})</p>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-label">Total Annual Spend</div>
      <div class="kpi-value">${formatCurrency(totalAnnualSpend, user.settings.currency)}</div>
      <div class="kpi-sub">~${formatCurrency(totalMonthlySpend, user.settings.currency)} / month</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Active Contracts</div>
      <div class="kpi-value">${activeContracts.length}</div>
      <div class="kpi-sub">${contracts.length} total registered</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Document Archives</div>
      <div class="kpi-value">${totalDocs} files</div>
      <div class="kpi-sub">Across portfolio</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Notice Window (≤30d)</div>
      <div class="kpi-value">${activeContracts.filter(c => { const d = getDaysRemaining(c.cancellationDeadline); return d >= 0 && d <= 30; }).length}</div>
      <div class="kpi-sub">Action required</div>
    </div>
  </div>

  ${categoriesHtml}

  <script>
    // Auto-prompt print when opened as standalone window
    if (window.opener || window.name === 'print-dossier') {
      window.onload = function() { window.print(); };
    }
  </script>
</body>
</html>`;
}

export function downloadPrintableHTML(
  contracts: Contract[],
  categories: Category[],
  user: User
): void {
  const htmlContent = generatePrintableHTML(contracts, categories, user);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `contractwatch-report-${dateStr}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
