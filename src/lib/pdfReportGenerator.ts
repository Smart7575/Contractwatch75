import { jsPDF } from 'jspdf';
import { Contract, Category, User } from '../types';
import { formatCurrency, formatDate, getDaysRemaining } from './dateUtils';

export function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function hexToRgb(hex: string): [number, number, number] {
  if (!hex || typeof hex !== 'string') return [79, 70, 229];
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [isNaN(r) ? 79 : r, isNaN(g) ? 70 : g, isNaN(b) ? 229 : b];
  }
  if (clean.length === 6) {
    const bigint = parseInt(clean, 16);
    if (isNaN(bigint)) return [79, 70, 229];
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  return [79, 70, 229];
}

export function createPortfolioPDFDoc(
  contracts: Contract[],
  categories: Category[],
  user: User
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 14) {
      doc.addPage();
      y = 15;
      // Header on subsequent pages
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('ContractWatch — Radar Overview & Portfolio Detail Dossier', margin, 9);
      const subPagePrintDate = new Date().toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      doc.text(
        `Print date: ${subPagePrintDate}`,
        pageWidth - margin,
        9,
        { align: 'right' }
      );
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 11, pageWidth - margin, 11);
    }
  };

  // ==========================================
  // PART 1: RADAR OVERVIEW (PAGE 1)
  // Master Cancellation Notice Horizons & Contract Overview
  // ==========================================
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const totalAnnualSpend = activeContracts.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const totalMonthlySpend = activeContracts.reduce((sum, c) => sum + (c.monthlyCost || 0), 0);

  // 1. Radar Overview Title Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(margin, y, contentWidth, 15, 'F');

  // Title on left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('RADAR OVERVIEW — CANCELLATION NOTICE HORIZONS & CONTRACT ROSTER', margin + 6, y + 6.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(224, 231, 255);
  doc.text(
    `Master contract overview with notice horizons & action pipeline · Prepared for ${user.name || 'Account Holder'}`,
    margin + 6,
    y + 11.2
  );

  // Print date and spend summary on right
  const printDateStr = new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Print date: ${printDateStr}`,
    pageWidth - margin - 6,
    y + 6.2,
    { align: 'right' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(224, 231, 255);
  doc.text(
    `${activeContracts.length} active commitments · ${formatCurrency(totalAnnualSpend, user.settings.currency)}/yr total spend`,
    pageWidth - margin - 6,
    y + 11.2,
    { align: 'right' }
  );

  y += 18;

  // 2. Radar Notice Horizons (4 Compact Status Cards)
  const overdueContractsList = activeContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days < 0;
  });
  const next30ContractsList = activeContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days >= 0 && days <= 30;
  });
  const days31to90ContractsList = activeContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days > 30 && days <= 90;
  });
  const laterContractsList = activeContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days > 90;
  });

  const overdueSpendTotal = overdueContractsList.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const next30SpendTotal = next30ContractsList.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const days31to90SpendTotal = days31to90ContractsList.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const laterSpendTotal = laterContractsList.reduce((sum, c) => sum + (c.annualCost || 0), 0);

  const radarCardGap = 3;
  const radarCardW = (contentWidth - radarCardGap * 3) / 4;
  const radarCardH = 13;

  // Horizon Card 1: Overdue Notice (<0d)
  let rCardX = margin;
  doc.setFillColor(overdueContractsList.length > 0 ? 255 : 248, overdueContractsList.length > 0 ? 241 : 250, overdueContractsList.length > 0 ? 242 : 252);
  doc.setDrawColor(overdueContractsList.length > 0 ? 254 : 226, overdueContractsList.length > 0 ? 205 : 232, overdueContractsList.length > 0 ? 211 : 240);
  doc.roundedRect(rCardX, y, radarCardW, radarCardH, 1.5, 1.5, 'FD');
  doc.setFillColor(225, 29, 72); // Rose 600
  doc.rect(rCardX, y, 2, radarCardH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(159, 18, 57); // Rose 800
  doc.text('1. OVERDUE NOTICE (<0D)', rCardX + 4.5, y + 3.8);
  doc.setFontSize(10);
  doc.setTextColor(225, 29, 72);
  doc.text(String(overdueContractsList.length), rCardX + 4.5, y + 8.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${formatCurrency(overdueSpendTotal, user.settings.currency)}/yr · ${overdueContractsList.length > 0 ? 'Action required' : 'Zero overdue'}`,
    rCardX + 4.5,
    y + 11.5
  );

  // Horizon Card 2: Next 30 Days (0-30d)
  rCardX += radarCardW + radarCardGap;
  doc.setFillColor(next30ContractsList.length > 0 ? 254 : 248, next30ContractsList.length > 0 ? 243 : 250, next30ContractsList.length > 0 ? 199 : 252);
  doc.setDrawColor(next30ContractsList.length > 0 ? 251 : 226, next30ContractsList.length > 0 ? 191 : 232, next30ContractsList.length > 0 ? 36 : 240);
  doc.roundedRect(rCardX, y, radarCardW, radarCardH, 1.5, 1.5, 'FD');
  doc.setFillColor(217, 119, 6); // Amber 600
  doc.rect(rCardX, y, 2, radarCardH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.text('2. NEXT 30 DAYS (0–30D)', rCardX + 4.5, y + 3.8);
  doc.setFontSize(10);
  doc.setTextColor(217, 119, 6);
  doc.text(String(next30ContractsList.length), rCardX + 4.5, y + 8.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${formatCurrency(next30SpendTotal, user.settings.currency)}/yr · ${next30ContractsList.length > 0 ? 'Critical window' : 'Zero urgent'}`,
    rCardX + 4.5,
    y + 11.5
  );

  // Horizon Card 3: 31-90 Days (Upcoming)
  rCardX += radarCardW + radarCardGap;
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(rCardX, y, radarCardW, radarCardH, 1.5, 1.5, 'FD');
  doc.setFillColor(202, 138, 4); // Yellow 600
  doc.rect(rCardX, y, 2, radarCardH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(133, 77, 14); // Yellow 800
  doc.text('3. UPCOMING (31–90D)', rCardX + 4.5, y + 3.8);
  doc.setFontSize(10);
  doc.setTextColor(161, 98, 7);
  doc.text(String(days31to90ContractsList.length), rCardX + 4.5, y + 8.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${formatCurrency(days31to90SpendTotal, user.settings.currency)}/yr · Quarterly review`,
    rCardX + 4.5,
    y + 11.5
  );

  // Horizon Card 4: Safe Horizon (>90d)
  rCardX += radarCardW + radarCardGap;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(rCardX, y, radarCardW, radarCardH, 1.5, 1.5, 'FD');
  doc.setFillColor(5, 150, 105); // Emerald 600
  doc.rect(rCardX, y, 2, radarCardH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(6, 95, 70); // Emerald 800
  doc.text('4. SAFE HORIZON (>90D)', rCardX + 4.5, y + 3.8);
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text(String(laterContractsList.length), rCardX + 4.5, y + 8.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${formatCurrency(laterSpendTotal, user.settings.currency)}/yr · Monitored safe`,
    rCardX + 4.5,
    y + 11.5
  );

  y += radarCardH + 3.0;

  // ==========================================
  // 3. RADAR MASTER CONTRACT OVERVIEW (All monitored contracts)
  // Substantive contract lines of the Radar Overview directly on Page 1
  // ==========================================
  const drawRadarTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 5.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text('RADAR CONTRACT ROSTER: NAME & SUPPLIER', margin + 4, y + 3.8);
    doc.text('CATEGORY & SCOPE', margin + 63, y + 3.8);
    doc.text('NOTICE DEADLINE & HORIZON', margin + 112, y + 3.8);
    doc.text('TERMS & RENEWAL', margin + 162, y + 3.8);
    doc.text('ANNUAL SPEND', margin + 199, y + 3.8);
    doc.text('LOGIN PORTAL & CREDENTIALS', margin + 228, y + 3.8);
    y += 5.5;
  };

  drawRadarTableHeader();

  const radarSortedContracts = [...contracts].sort((a, b) => {
    return (a.cancellationDeadline || '').localeCompare(b.cancellationDeadline || '');
  });

  const rowHeight = 8.4;

  radarSortedContracts.forEach((contract) => {
    if (y + rowHeight > pageHeight - 14) {
      doc.addPage();
      y = 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('ContractWatch — Radar Overview & Contract Roster (Continued)', margin, 9);
      doc.text(`Print date: ${printDateStr}`, pageWidth - margin, 9, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 11, pageWidth - margin, 11);
      drawRadarTableHeader();
    }

    const days = getDaysRemaining(contract.cancellationDeadline);
    const category = categories.find((c) => c.id === contract.categoryId);
    const isOverdue = days < 0;
    const isUrgent = days >= 0 && days <= 30;
    const isMid = days > 30 && days <= 90;

    // Row container
    if (isOverdue) {
      doc.setFillColor(255, 241, 242); // Rose 50
    } else if (isUrgent) {
      doc.setFillColor(254, 243, 199); // Amber 50
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, rowHeight, 'FD');

    // Urgency left indicator bar
    if (isOverdue) {
      doc.setFillColor(225, 29, 72); // Rose 600
    } else if (isUrgent) {
      doc.setFillColor(217, 119, 6); // Amber 600
    } else if (isMid) {
      doc.setFillColor(202, 138, 4); // Yellow 600
    } else {
      doc.setFillColor(5, 150, 105); // Emerald 600
    }
    doc.rect(margin, y, 2.5, rowHeight, 'F');

    // Col 1: Contract Name & Supplier (margin + 4.5, width ~56mm)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(15, 23, 42);
    const truncName = contract.name.length > 28 ? contract.name.substring(0, 26) + '...' : contract.name;
    doc.text(truncName, margin + 4.5, y + 3.6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    const supplierStr = contract.contractNumber
      ? `${contract.supplier} · #${contract.contractNumber}`
      : contract.supplier;
    const truncSupplier = supplierStr.length > 32 ? supplierStr.substring(0, 30) + '...' : supplierStr;
    doc.text(truncSupplier, margin + 4.5, y + 7.0);

    // Col 2: Category & Scope (margin + 63, width ~47mm)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    const catName = category?.name || 'General';
    doc.text(catName, margin + 63, y + 3.6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    const subcatScope = `${contract.subcategory || 'General'} · ${
      contract.coverageType === 'family' ? 'Family' : 'Individual'
    }`;
    doc.text(subcatScope, margin + 63, y + 7.0);

    // Col 3: Notice Deadline & Horizon (margin + 112, width ~48mm)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    if (isOverdue) {
      doc.setTextColor(225, 29, 72); // Rose
    } else if (isUrgent) {
      doc.setTextColor(217, 119, 6); // Amber
    } else if (isMid) {
      doc.setTextColor(161, 98, 7); // Yellow
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(formatDate(contract.cancellationDeadline), margin + 112, y + 3.6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    let horizonPill = `${days}d left (Safe)`;
    if (isOverdue) {
      horizonPill = `${Math.abs(days)}d OVERDUE`;
    } else if (isUrgent) {
      horizonPill = `${days}d left (Action Required)`;
    } else if (isMid) {
      horizonPill = `${days}d left (Upcoming)`;
    }
    doc.text(horizonPill, margin + 112, y + 7.0);

    // Col 4: Terms & Renewal (margin + 162, width ~35mm)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Notice: ${contract.noticePeriod.value} ${contract.noticePeriod.unit}`, margin + 162, y + 3.6);

    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(contract.autoRenew ? 'Auto-rollover' : 'Manual expiration', margin + 162, y + 7.0);

    // Col 5: Annual Spend (margin + 199, width ~27mm)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(contract.annualCost, user.settings.currency), margin + 199, y + 3.6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`~${formatCurrency(contract.monthlyCost, user.settings.currency)}/mo`, margin + 199, y + 7.0);

    // Col 6: Login Portal Link & Credentials (margin + 228, width ~40mm)
    const creds = contract.credentials;
    if (creds?.url) {
      const rawUrl = creds.url.trim();
      const cleanUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
      const displayUrl = rawUrl.length > 22 ? rawUrl.substring(0, 20) + '...' : rawUrl;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.6);
      doc.setTextColor(29, 78, 216); // Royal Blue
      doc.textWithLink(displayUrl, margin + 228, y + 3.6, { url: cleanUrl });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.2);
      doc.setTextColor(148, 163, 184);
      doc.text('—', margin + 228, y + 3.6);
    }

    if (creds?.username || creds?.password) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(71, 85, 105);
      const userPart = creds.username ? `U: ${creds.username}` : '';
      const passPart = creds.password ? `P: ${creds.password}` : '';
      const combo = [userPart, passPart].filter(Boolean).join(' · ');
      const truncCombo = combo.length > 25 ? combo.substring(0, 23) + '...' : combo;
      doc.text(truncCombo, margin + 228, y + 7.0);
    } else if (!creds?.url) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.2);
      doc.setTextColor(148, 163, 184);
      doc.text('No login recorded', margin + 228, y + 7.0);
    }

    y += rowHeight;
  });

  y += 4;

  // ==========================================
  // PART 2: DETAIL SUBREPORT — CATEGORY & SUBCATEGORY PORTFOLIO DOSSIER
  // Starts on a fresh page as the comprehensive detailed subreport
  // ==========================================
  doc.addPage();
  y = 14;

  // Detail Subreport Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(margin, y, contentWidth, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('DETAIL SUBREPORT — CATEGORY & SUBCATEGORY PORTFOLIO DOSSIER', margin + 6, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(224, 231, 255);
  doc.text(
    'Comprehensive contract dossier archive: attached policy files, duration terms, supplier contacts, and account credentials',
    margin + 6,
    y + 11.2
  );

  y += 18;

  // Portfolio Spend Allocation & Coverage Scope Summary Bar
  const categoriesWithSpend = categories
    .map((cat) => {
      const catSpend = contracts
        .filter((c) => c.categoryId === cat.id && c.status === 'active')
        .reduce((sum, c) => sum + (c.annualCost || 0), 0);
      const spendPercentage = totalAnnualSpend > 0 ? (catSpend / totalAnnualSpend) * 100 : 0;
      return { category: cat, annualSpend: catSpend, spendPercentage };
    })
    .filter((item) => item.annualSpend > 0)
    .sort((a, b) => b.annualSpend - a.annualSpend);

  const familyContracts = contracts.filter((c) => c.coverageType === 'family');
  const individualContracts = contracts.filter((c) => c.coverageType === 'individual');
  const familySpend = familyContracts
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const individualSpend = individualContracts
    .filter((c) => c.status === 'active')
    .reduce((sum, c) => sum + (c.annualCost || 0), 0);

  // Spend Distribution Bar Section Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 19, 2, 2, 'FD');

  // Title of spend bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PORTFOLIO SPEND ALLOCATION BY CATEGORY', margin + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`100% = ${formatCurrency(totalAnnualSpend, user.settings.currency)} / yr`, pageWidth - margin - 4, y + 4.5, { align: 'right' });

  // Segmented multi-color progress bar
  const barY = y + 6.5;
  const barH = 3.0;
  let barX = margin + 4;
  const totalBarWidth = contentWidth - 8;

  // Background track
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin + 4, barY, totalBarWidth, barH, 1, 1, 'F');

  if (categoriesWithSpend.length > 0 && totalAnnualSpend > 0) {
    categoriesWithSpend.forEach((item) => {
      const segW = Math.max((item.spendPercentage / 100) * totalBarWidth, 1.5);
      const [r, g, b] = hexToRgb(item.category.color);
      doc.setFillColor(r, g, b);
      doc.rect(barX, barY, Math.min(segW, margin + 4 + totalBarWidth - barX), barH, 'F');
      barX += segW;
    });
  }

  // Legend line + Coverage Scope Distribution line
  let legX = margin + 4;
  const legY = y + 12.5;
  doc.setFontSize(6.8);
  categoriesWithSpend.slice(0, 5).forEach((item) => {
    const [r, g, b] = hexToRgb(item.category.color);
    doc.setFillColor(r, g, b);
    doc.circle(legX + 1, legY - 0.7, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    const catLabel = ` ${item.category.name}`;
    doc.text(catLabel, legX + 2.5, legY);
    legX += 2.5 + doc.getTextWidth(catLabel);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    const pctLabel = ` (${item.spendPercentage.toFixed(0)}%)  ·  `;
    doc.text(pctLabel, legX, legY);
    legX += doc.getTextWidth(pctLabel);
  });

  // Coverage Scope Summary on the bottom line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Coverage Scope:', margin + 4, y + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(109, 40, 217); // Purple 700
  doc.text(`Family: ${familyContracts.length} contracts (${formatCurrency(familySpend, user.settings.currency)}/yr)`, margin + 28, y + 16.5);

  doc.setTextColor(148, 163, 184);
  doc.text(' · ', margin + 85, y + 16.5);

  doc.setTextColor(29, 78, 216); // Blue 700
  doc.text(`Individual: ${individualContracts.length} contracts (${formatCurrency(individualSpend, user.settings.currency)}/yr)`, margin + 90, y + 16.5);

  y += 24;

  // ==========================================
  // 5. CATEGORIES & SUBCATEGORY GROUPS
  // Alphabetically sorted by category, then subcategory
  // ==========================================
  const sortedCategories = [...categories]
    .filter((cat) => contracts.some((c) => c.categoryId === cat.id))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  sortedCategories.forEach((cat) => {
    const catContracts = contracts
      .filter((c) => c.categoryId === cat.id)
      .sort((a, b) => {
        const subComp = (a.subcategory || 'General').localeCompare(b.subcategory || 'General', undefined, { sensitivity: 'base' });
        if (subComp !== 0) return subComp;
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      });
    if (catContracts.length === 0) return;

    const catSpend = catContracts
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + (c.annualCost || 0), 0);
    const catMonthly = catContracts
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + (c.monthlyCost || 0), 0);
    const catActiveCount = catContracts.filter((c) => c.status === 'active').length;
    const catDocsCount = catContracts.reduce((sum, c) => sum + (c.documentLinks?.length || 0), 0);

    // Group contracts by subcategory inside this category
    const subcategoryMap = new Map<string, Contract[]>();
    catContracts.forEach((c) => {
      const sub = c.subcategory?.trim() || 'General';
      if (!subcategoryMap.has(sub)) {
        subcategoryMap.set(sub, []);
      }
      subcategoryMap.get(sub)!.push(c);
    });

    checkPageBreak(25);

    // Category Header Box - Styled with Category Theme Color accent
    const [catR, catG, catB] = hexToRgb(cat.color);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 11, 1.5, 1.5, 'FD');

    // Left color bar on category header
    doc.setFillColor(catR, catG, catB);
    doc.roundedRect(margin, y, 3.5, 11, 1.5, 1.5, 'F');

    // Category Name & Counts
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cat.name, margin + 7, y + 5.2);

    const catNameWidth = doc.getTextWidth(cat.name);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `(${catContracts.length} ${catContracts.length === 1 ? 'contract' : 'contracts'} · ${catActiveCount} active · ${catDocsCount} files)`,
      margin + 8 + catNameWidth,
      y + 5.2
    );

    // Category Spend (Right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${formatCurrency(catSpend, user.settings.currency)} / yr`,
      pageWidth - margin - 4,
      y + 5.2,
      { align: 'right' }
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `~ ${formatCurrency(catMonthly, user.settings.currency)} / mo`,
      pageWidth - margin - 4,
      y + 8.8,
      { align: 'right' }
    );

    y += 13.5;

    // Iterate Subcategory Groups
    Array.from(subcategoryMap.entries()).forEach(([subName, subContracts]) => {
      const subSpend = subContracts
        .filter((c) => c.status === 'active')
        .reduce((sum, c) => sum + (c.annualCost || 0), 0);

      checkPageBreak(18);

      // Subcategory Banner
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.setDrawColor(203, 213, 225); // Slate 300
      doc.rect(margin, y, contentWidth, 6.5, 'FD');

      // Small accent dot
      doc.setFillColor(79, 70, 229);
      doc.circle(margin + 4, y + 3.25, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(subName, margin + 7, y + 4.3);

      const subNameW = doc.getTextWidth(subName);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        ` (${subContracts.length} ${subContracts.length === 1 ? 'contract' : 'contracts'})`,
        margin + 7 + subNameW,
        y + 4.3
      );

      // Subcategory annual spend on right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `${formatCurrency(subSpend, user.settings.currency)} / yr`,
        pageWidth - margin - 4,
        y + 4.3,
        { align: 'right' }
      );

      y += 8.5;

      // Iterate contracts in this subcategory
      subContracts.forEach((contract) => {
        const days = getDaysRemaining(contract.cancellationDeadline);
        const docs = contract.documentLinks || [];
        const hasDocs = docs.length > 0;
        const prefix = `Attached Documents (${docs.length}): `;

        // Calculate doc wrapping
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        let docLinesCount = 1;
        if (hasDocs) {
          let testX = margin + 6 + doc.getTextWidth(prefix);
          docs.forEach((docItem, idx) => {
            const docTitle = (docItem.title || 'Document').trim();
            const sep = idx === docs.length - 1 ? '' : ', ';
            const itemWidth = doc.getTextWidth(docTitle + sep);
            if (testX + itemWidth > margin + contentWidth - 6 && testX > margin + 40) {
              docLinesCount++;
              testX = margin + 6 + 10 + itemWidth;
            } else {
              testX += itemWidth;
            }
          });
        }

        // Check credentials presence
        const creds = contract.credentials;
        const hasCreds = Boolean(
          creds && (creds.url || creds.username || creds.password)
        );
        const credsHeight = hasCreds ? 4.8 : 0;

        // Height calculation for contract card with 3-cell metadata grid, docs and credentials
        const baseHeight = 31.0 + credsHeight;
        const estimatedContractHeight = baseHeight + (docLinesCount - 1) * 4.2;

        checkPageBreak(estimatedContractHeight + 3);

        // Contract Card container with clean white background and rounded border
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, estimatedContractHeight, 1.5, 1.5, 'FD');

        // Left urgency accent line
        if (days < 0) {
          doc.setFillColor(244, 63, 94); // Rose 500
        } else if (days <= 30) {
          doc.setFillColor(245, 158, 11); // Amber 500
        } else {
          doc.setFillColor(79, 70, 229);  // Indigo 600
        }
        doc.rect(margin, y, 2.5, estimatedContractHeight, 'F');

        // ==========================================
        // ROW 1: Contract Name, Status Badge, Scope Badge (Left) & Annual Cost (Right)
        // ==========================================
        let cursorX = margin + 6;
        const row1Y = y + 5.2;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(contract.name, cursorX, row1Y);
        cursorX += doc.getTextWidth(contract.name) + 3;

        // Status Badge Pill
        const statusLabel = contract.status.toUpperCase();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        const statusTextW = doc.getTextWidth(statusLabel);
        const statusBadgeW = statusTextW + 4;

        if (contract.status === 'active') {
          doc.setFillColor(236, 253, 245); // Emerald 50
          doc.setDrawColor(167, 243, 208); // Emerald 200
          doc.roundedRect(cursorX, row1Y - 3.5, statusBadgeW, 4.4, 1.5, 1.5, 'FD');
          doc.setTextColor(4, 120, 87);    // Emerald 700
        } else {
          doc.setFillColor(241, 245, 249); // Slate 100
          doc.setDrawColor(226, 232, 240); // Slate 200
          doc.roundedRect(cursorX, row1Y - 3.5, statusBadgeW, 4.4, 1.5, 1.5, 'FD');
          doc.setTextColor(71, 85, 105);   // Slate 600
        }
        doc.text(statusLabel, cursorX + 2, row1Y - 0.5);
        cursorX += statusBadgeW + 2.5;

        // Coverage Scope Badge Pill (Family vs Individual)
        if (contract.coverageType) {
          const scopeLabel = contract.coverageType === 'family' ? 'FAMILY' : 'INDIVIDUAL';
          const scopeTextW = doc.getTextWidth(scopeLabel);
          const scopeBadgeW = scopeTextW + 4;

          if (contract.coverageType === 'family') {
            doc.setFillColor(243, 232, 255); // Purple 100
            doc.setDrawColor(216, 180, 254); // Purple 300
            doc.roundedRect(cursorX, row1Y - 3.5, scopeBadgeW, 4.4, 1.5, 1.5, 'FD');
            doc.setTextColor(126, 34, 206);  // Purple 700
          } else {
            doc.setFillColor(239, 246, 255); // Blue 50
            doc.setDrawColor(191, 219, 254); // Blue 200
            doc.roundedRect(cursorX, row1Y - 3.5, scopeBadgeW, 4.4, 1.5, 1.5, 'FD');
            doc.setTextColor(29, 78, 216);   // Blue 700
          }
          doc.text(scopeLabel, cursorX + 2, row1Y - 0.5);
        }

        // Annual Cost on the right
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(
          `${formatCurrency(contract.annualCost, user.settings.currency)} / yr`,
          pageWidth - margin - 5,
          row1Y,
          { align: 'right' }
        );

        // ==========================================
        // ROW 2: Unboxed Metadata Line (Left) & Monthly Cost (Right)
        // Supplier · Subcategory · Ref # · Contact shortcuts
        // ==========================================
        const row2Y = y + 9.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);

        const contactStr = [contract.contact?.phone, contract.contact?.email].filter(Boolean).join(' · ');
        let metaLine = `${contract.supplier} · ${contract.subcategory}`;
        if (contract.contractNumber) {
          metaLine += ` · Ref: ${contract.contractNumber}`;
        }
        if (contactStr && doc.getTextWidth(metaLine + ` · ${contactStr}`) < contentWidth - 85) {
          metaLine += ` · ${contactStr}`;
        }
        doc.text(metaLine, margin + 6, row2Y);

        // Monthly Cost on the right
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `~ ${formatCurrency(contract.monthlyCost, user.settings.currency)} / mo (${contract.paymentFrequency})`,
          pageWidth - margin - 5,
          row2Y,
          { align: 'right' }
        );

        // ==========================================
        // ROW 3: 3-Cell Metadata Grid
        // [Notice Deadline] [Contract Duration] [Renewal Policy]
        // Identical to Reports Overview web UI card
        // ==========================================
        const gridY = y + 11.5;
        const gridW = contentWidth - 12;
        const gridH = 11.0;
        const cellW = gridW / 3;

        doc.setFillColor(248, 250, 252); // Slate 50
        doc.setDrawColor(241, 245, 249); // Slate 100
        doc.roundedRect(margin + 6, gridY, gridW, gridH, 1, 1, 'FD');

        // Cell 1: Notice Deadline
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text('NOTICE DEADLINE', margin + 9, gridY + 3.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(formatDate(contract.cancellationDeadline), margin + 9, gridY + 6.7);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        if (days < 0) {
          doc.setTextColor(225, 29, 72); // Rose
          doc.text(`${Math.abs(days)} days overdue`, margin + 9, gridY + 9.8);
        } else if (days <= 30) {
          doc.setTextColor(217, 119, 6); // Amber
          doc.text(`${days} days left - Action Required`, margin + 9, gridY + 9.8);
        } else {
          doc.setTextColor(71, 85, 105);
          doc.text(`${days} days remaining`, margin + 9, gridY + 9.8);
        }

        // Cell 2: Contract Duration
        const cell2X = margin + 6 + cellW;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text('CONTRACT DURATION', cell2X + 3, gridY + 3.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const durationStr = `${contract.startDate ? formatDate(contract.startDate) : '—'} -> ${
          contract.isEndDateOpenEnded
            ? 'Open-ended'
            : contract.endDate
            ? formatDate(contract.endDate)
            : 'Rolling'
        }`;
        doc.text(durationStr, cell2X + 3, gridY + 6.7);

        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Notice period: ${contract.noticePeriod.value} ${contract.noticePeriod.unit}`,
          cell2X + 3,
          gridY + 9.8
        );

        // Cell 3: Renewal Policy
        const cell3X = margin + 6 + cellW * 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text('RENEWAL POLICY', cell3X + 3, gridY + 3.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const policyLabel = contract.autoRenew ? 'Automatic rollover' : 'Manual expiration';
        doc.text(policyLabel, cell3X + 3, gridY + 6.7);

        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(contract.renewalPeriod || '1 month rolling', cell3X + 3, gridY + 9.8);

        // ==========================================
        // ROW 4: Attached Documents Section
        // With clickable hyperlinks in blue font
        // ==========================================
        let docCurX = margin + 6;
        let docCurY = gridY + gridH + 4.2;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(prefix, docCurX, docCurY);
        docCurX += doc.getTextWidth(prefix);

        if (hasDocs) {
          docs.forEach((docItem, idx) => {
            const docTitle = (docItem.title || 'Document').trim();
            const isLast = idx === docs.length - 1;
            const separator = isLast ? '' : ', ';

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            const titleWidth = doc.getTextWidth(docTitle);
            const sepWidth = doc.getTextWidth(separator);

            // Wrap to next line if necessary
            if (docCurX + titleWidth > margin + contentWidth - 6 && docCurX > margin + 40) {
              docCurY += 4.2;
              docCurX = margin + 6 + 10;
            }

            const rawUrl = (docItem.url || '').trim();
            const cleanUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
              ? rawUrl
              : rawUrl
                ? `https://${rawUrl}`
                : '';

            if (cleanUrl) {
              // Blue font color for documents with hyperlink
              doc.setTextColor(29, 78, 216); // Royal Blue #1d4ed8
              doc.textWithLink(docTitle, docCurX, docCurY, { url: cleanUrl });
            } else {
              doc.setTextColor(51, 65, 85);
              doc.text(docTitle, docCurX, docCurY);
            }
            docCurX += titleWidth;

            if (!isLast) {
              doc.setTextColor(148, 163, 184); // Slate 400
              doc.text(separator, docCurX, docCurY);
              docCurX += sepWidth;
            }
          });
        } else {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text('No documents attached to this contract yet.', docCurX, docCurY);
        }

        // ==========================================
        // ROW 5: Login Credentials Section
        // (Website Login Link klikbaar, Username, Password)
        // ==========================================
        if (hasCreds) {
          const credY = docCurY + 4.2;
          let credX = margin + 6;

          // Key icon indicator prefix
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.0);
          doc.setTextColor(79, 70, 229); // Indigo 600
          doc.text('Account Login:', credX, credY);
          credX += doc.getTextWidth('Account Login:') + 2.0;

          // Portal URL Link (clickable in blue font)
          if (creds?.url) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.0);
            doc.setTextColor(71, 85, 105);
            doc.text('Portal: ', credX, credY);
            credX += doc.getTextWidth('Portal: ');

            const rawCredUrl = creds.url.trim();
            const cleanCredUrl = rawCredUrl.startsWith('http://') || rawCredUrl.startsWith('https://')
              ? rawCredUrl
              : `https://${rawCredUrl}`;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.0);
            doc.setTextColor(29, 78, 216); // Royal Blue #1d4ed8
            const displayUrl = rawCredUrl.length > 45 ? rawCredUrl.substring(0, 42) + '...' : rawCredUrl;
            doc.textWithLink(displayUrl, credX, credY, { url: cleanCredUrl });
            credX += doc.getTextWidth(displayUrl) + 3.0;

            doc.setTextColor(148, 163, 184);
            doc.text('·', credX, credY);
            credX += 2.5;
          }

          // Username
          if (creds?.username) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.0);
            doc.setTextColor(71, 85, 105);
            doc.text('Username: ', credX, credY);
            credX += doc.getTextWidth('Username: ');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.0);
            doc.setTextColor(15, 23, 42); // Slate 900
            doc.text(creds.username, credX, credY);
            credX += doc.getTextWidth(creds.username) + 3.0;

            if (creds?.password) {
              doc.setTextColor(148, 163, 184);
              doc.text('·', credX, credY);
              credX += 2.5;
            }
          }

          // Password
          if (creds?.password) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.0);
            doc.setTextColor(71, 85, 105);
            doc.text('Password: ', credX, credY);
            credX += doc.getTextWidth('Password: ');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.0);
            doc.setTextColor(15, 23, 42); // Slate 900
            doc.text(creds.password, credX, credY);
          }
        }

        y += estimatedContractHeight + 3.0;
      });

      y += 2.0;
    });

    y += 4.0;
  });

  // ==========================================
  // PAGE NUMBERS FOOTER
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Contract Portfolio & Documents Report · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  return doc;
}

export interface PDFExportResult {
  blob: Blob;
  blobUrl: string;
  dataUri: string;
  filename: string;
  shared: boolean;
  isIpad: boolean;
}

export async function exportPDFReport(
  contracts: Contract[],
  categories: Category[],
  user: User
): Promise<PDFExportResult> {
  const doc = createPortfolioPDFDoc(contracts, categories, user);
  const blob = doc.output('blob');
  const dataUri = doc.output('datauristring');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `contractwatch-portfolio-report-${dateStr}.pdf`;
  const blobUrl = URL.createObjectURL(blob);
  const isIpad = isAppleTouchDevice();
  let shared = false;

  // On iPad/iOS devices: trigger native Share Sheet (AirDrop, Save to Files, Print) if available
  if (isIpad && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        shared = true;
        return { blob, blobUrl, dataUri, filename, shared, isIpad };
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        return { blob, blobUrl, dataUri, filename, shared: false, isIpad };
      }
      console.warn('Native iPad/iPhone share not available:', shareErr);
    }
  }

  // Desktop or fallback trigger: directly trigger save
  try {
    doc.save(filename);
  } catch (saveErr) {
    console.warn('doc.save notice:', saveErr);
  }

  return { blob, blobUrl, dataUri, filename, shared, isIpad };
}

export function generatePortfolioPDF(
  contracts: Contract[],
  categories: Category[],
  user: User
): void {
  exportPDFReport(contracts, categories, user);
}
