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
      doc.text('ContractWatch — Portfolio & Category Dossier', margin, 9);
      const subPagePrintDate = new Date().toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
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
  // 1. MAIN REPORT HEADER
  // ==========================================
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(margin, y, contentWidth, 20, 'F');

  // Title on left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('Contract Portfolio & Documents Report', margin + 6, y + 8.5);

  // Print date on right of title block
  const printDateStr = new Date().toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(224, 231, 255);
  doc.text(
    `Print date: ${printDateStr}`,
    pageWidth - margin - 6,
    y + 8.5,
    { align: 'right' }
  );

  // Subtitle / User info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  doc.text(
    `Complete category-by-category overview with notice deadlines, supplier contacts, and attached document archives · Prepared for ${user.name || 'Account Holder'}`,
    margin + 6,
    y + 15
  );

  y += 24;

  // ==========================================
  // 2. EXECUTIVE KPI OVERVIEW (4 Cards)
  // Matching Reports Overview web UI
  // ==========================================
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const totalAnnualSpend = activeContracts.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const totalMonthlySpend = activeContracts.reduce((sum, c) => sum + (c.monthlyCost || 0), 0);
  const urgentCount = activeContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days >= 0 && days <= 30;
  }).length;
  const overdueCount = activeContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days < 0;
  }).length;

  const cardGap = 3;
  const cardW = (contentWidth - cardGap * 3) / 4;
  const cardH = 18;

  // Card 1: Total Annual Spend
  let cardX = margin;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL ANNUAL SPEND', cardX + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totalAnnualSpend, user.settings.currency), cardX + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`~ ${formatCurrency(totalMonthlySpend, user.settings.currency)} / mo`, cardX + 4, y + 15.2);

  // Card 2: Total Contracts
  cardX += cardW + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CONTRACTS', cardX + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(String(contracts.length), cardX + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${activeContracts.length} active · ${contracts.length - activeContracts.length} inactive`, cardX + 4, y + 15.2);

  // Card 3: Notice Window (≤30d) - Amber tint matching web UI
  cardX += cardW + cardGap;
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.setDrawColor(251, 191, 36);  // Amber 400
  doc.roundedRect(cardX, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.text('NOTICE WINDOW (≤30D)', cardX + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(217, 119, 6); // Amber 600
  doc.text(String(urgentCount), cardX + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(urgentCount > 0 ? 'Requires renewal action' : 'Zero upcoming deadlines', cardX + 4, y + 15.2);

  // Card 4: Overdue Notice
  cardX += cardW + cardGap;
  doc.setFillColor(overdueCount > 0 ? 255 : 248, overdueCount > 0 ? 241 : 250, overdueCount > 0 ? 242 : 252);
  doc.setDrawColor(overdueCount > 0 ? 254 : 226, overdueCount > 0 ? 205 : 232, overdueCount > 0 ? 211 : 240);
  doc.roundedRect(cardX, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('OVERDUE NOTICE', cardX + 4, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (overdueCount > 0) {
    doc.setTextColor(225, 29, 72); // Rose 600
  } else {
    doc.setTextColor(15, 23, 42); // Slate 900
  }
  doc.text(String(overdueCount), cardX + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(overdueCount > 0 ? 'Auto-renewal risk' : 'Zero overdue deadlines', cardX + 4, y + 15.2);

  y += cardH + 4;

  // ==========================================
  // 3. PORTFOLIO SPEND ALLOCATION & COVERAGE SCOPE
  // Matching Reports Overview spend bar & coverage strip
  // ==========================================
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
  // 4. CATEGORIES & SUBCATEGORY GROUPS
  // Alphabetically sorted by category, then subcategory
  // ==========================================
  const sortedCategories = [...categories]
    .filter((cat) => contracts.some((c) => c.categoryId === cat.id))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  sortedCategories.forEach((cat) => {
    const catContracts = contracts
      .filter((c) => c.categoryId === cat.id)
      .sort((a, b) => {
        const subComp = (a.subcategory || 'Algemeen').localeCompare(b.subcategory || 'Algemeen', undefined, { sensitivity: 'base' });
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
      const sub = c.subcategory?.trim() || 'Algemeen';
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
      `Contract Portfolio & Documents Report · Pagina ${i} van ${totalPages}`,
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

  // On iPad/iOS devices: trigger native Share Sheet (AirDrop, Save to Files, Print)
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
      console.warn('Native iPad share not available:', shareErr);
    }
  }

  // Desktop or non-iPad trigger
  if (!isIpad) {
    try {
      doc.save(filename);
    } catch (saveErr) {
      console.warn('doc.save failed:', saveErr);
    }
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
