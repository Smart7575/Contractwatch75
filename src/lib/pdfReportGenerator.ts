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

export function createPortfolioPDFDoc(
  contracts: Contract[],
  categories: Category[],
  user: User
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage();
      y = 18;
      // Header on subsequent pages
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('ContractWatch — Portfolio & Category Dossier', margin, 10);
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-GB')}`,
        pageWidth - margin,
        10,
        { align: 'right' }
      );
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 12, pageWidth - margin, 12);
    }
  };

  // Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('ContractWatch Portfolio Report', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text(
    `Comprehensive Category Overview · Prepared for ${user.name || 'Account Holder'}`,
    margin + 6,
    y + 16
  );

  y += 28;

  // Executive KPI summary box
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const totalAnnualSpend = activeContracts.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const totalMonthlySpend = activeContracts.reduce((sum, c) => sum + (c.monthlyCost || 0), 0);
  const totalDocs = contracts.reduce((sum, c) => sum + (c.documentLinks?.length || 0), 0);
  const urgentCount = activeContracts.filter((c) => {
    const days = getDaysRemaining(c.cancellationDeadline);
    return days >= 0 && days <= 30;
  }).length;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  const colW = contentWidth / 4;

  // Metric 1: Total Annual Spend
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('ANNUAL FIXED SPEND', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(totalAnnualSpend, user.settings.currency), margin + 4, y + 13);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`~${formatCurrency(totalMonthlySpend, user.settings.currency)}/mo`, margin + 4, y + 17);

  // Metric 2: Total Contracts
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CONTRACTS', margin + colW + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${contracts.length} (${activeContracts.length} Active)`, margin + colW + 4, y + 13);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Across portfolio', margin + colW + 4, y + 17);

  // Metric 3: Document Archives
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DOCUMENT ARCHIVES', margin + colW * 2 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229);
  doc.text(`${totalDocs} files linked`, margin + colW * 2 + 4, y + 13);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Cloud & NAS links', margin + colW * 2 + 4, y + 17);

  // Metric 4: Urgent Notice
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DECISION NEEDED (≤30D)', margin + colW * 3 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(urgentCount > 0 ? 217 : 15, urgentCount > 0 ? 119 : 23, urgentCount > 0 ? 6 : 42);
  doc.text(`${urgentCount} notice deadline${urgentCount === 1 ? '' : 's'}`, margin + colW * 3 + 4, y + 13);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(urgentCount > 0 ? 'Requires action' : 'All clear', margin + colW * 3 + 4, y + 17);

  y += 26;

  // Render categories and contracts
  categories.forEach((cat) => {
    const catContracts = contracts.filter((c) => c.categoryId === cat.id);
    if (catContracts.length === 0) return;

    const catSpend = catContracts
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + (c.annualCost || 0), 0);

    checkPageBreak(25);

    // Category Header Box
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(cat.name.toUpperCase(), margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `${catContracts.length} contract${catContracts.length === 1 ? '' : 's'} · Total: ${formatCurrency(catSpend, user.settings.currency)}/yr`,
      pageWidth - margin - 4,
      y + 5.5,
      { align: 'right' }
    );

    y += 11;

    // Iterate contracts in this category
    catContracts.forEach((contract) => {
      const days = getDaysRemaining(contract.cancellationDeadline);
      const docsCount = contract.documentLinks?.length || 0;
      const estimatedContractHeight = 28 + (docsCount > 0 ? Math.min(docsCount, 4) * 8 : 4);

      checkPageBreak(estimatedContractHeight);

      // Contract Card container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, estimatedContractHeight - 2, 1, 1, 'FD');

      // Left urgency line
      if (days < 0) {
        doc.setFillColor(244, 63, 94); // Rose
      } else if (days <= 30) {
        doc.setFillColor(245, 158, 11); // Amber
      } else {
        doc.setFillColor(79, 70, 229); // Indigo
      }
      doc.rect(margin, y, 2.5, estimatedContractHeight - 2, 'F');

      let innerY = y + 5;

      // Contract Name & Status
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const title = doc.splitTextToSize(contract.name, contentWidth - 60);
      doc.text(title[0] || contract.name, margin + 6, innerY);

      // Annual & Monthly Cost (top right)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(
        formatCurrency(contract.annualCost, user.settings.currency) + '/yr',
        pageWidth - margin - 4,
        innerY,
        { align: 'right' }
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `~${formatCurrency(contract.monthlyCost, user.settings.currency)}/mo (${contract.paymentFrequency})`,
        pageWidth - margin - 4,
        innerY + 4,
        { align: 'right' }
      );

      innerY += 5;

      // Supplier · Subcategory · Ref #
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const coverageLabel =
        contract.coverageType === 'family'
          ? 'Family'
          : contract.coverageType === 'individual'
          ? 'Individual'
          : null;
      const supplierLine = `${contract.supplier} · ${contract.subcategory}${
        coverageLabel ? ` · [${coverageLabel}]` : ''
      }${contract.contractNumber ? ` · Ref: ${contract.contractNumber}` : ''}`;
      doc.text(supplierLine, margin + 6, innerY);

      innerY += 5;

      // Notice Deadline & Renewal Terms
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      let deadlineText = `Notice Deadline: ${formatDate(contract.cancellationDeadline)}`;
      if (days < 0) {
        deadlineText += ` (${Math.abs(days)} days OVERDUE)`;
        doc.setTextColor(225, 29, 72);
      } else if (days <= 30) {
        deadlineText += ` (${days} days left - Action Required)`;
        doc.setTextColor(217, 119, 6);
      } else {
        deadlineText += ` (${days} days remaining)`;
        doc.setTextColor(71, 85, 105);
      }
      doc.text(deadlineText, margin + 6, innerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const renewalInfo = `Notice: ${contract.noticePeriod.value} ${contract.noticePeriod.unit} · Policy: ${
        contract.autoRenew ? contract.renewalPeriod || 'Auto-renewal' : 'Manual expiration'
      }`;
      doc.text(renewalInfo, margin + 6, innerY + 4);

      innerY += 8;

      // Attached Document Links
      if (contract.documentLinks && contract.documentLinks.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(79, 70, 229);
        doc.text(`Attached Document Links (${contract.documentLinks.length}):`, margin + 6, innerY);
        innerY += 4;

        contract.documentLinks.slice(0, 4).forEach((docItem) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(30, 41, 59);

          const docTitle = `• [${docItem.provider.toUpperCase()} / ${docItem.type.toUpperCase()}] ${docItem.title}`;
          doc.text(docTitle, margin + 8, innerY);

          // URL preview
          doc.setTextColor(99, 102, 241);
          const truncatedUrl = docItem.url.length > 65 ? docItem.url.substring(0, 65) + '...' : docItem.url;
          doc.text(truncatedUrl, margin + 8, innerY + 3);

          innerY += 6.5;
        });
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('No document links attached to this contract.', margin + 6, innerY);
        innerY += 4;
      }

      y += estimatedContractHeight + 3;
    });

    y += 4;
  });

  // Page Numbers Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ContractWatch Portfolio Report · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
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
        // IMPORTANT: Only pass { files: [file] } without title or text
        // Passing title or text causes iOS Safari to export an extra unwanted .txt file!
        await navigator.share({
          files: [file],
        });
        shared = true;
        return { blob, blobUrl, dataUri, filename, shared, isIpad };
      }
    } catch (shareErr: any) {
      if (shareErr.name === 'AbortError') {
        // User dismissed the iOS share sheet
        return { blob, blobUrl, dataUri, filename, shared: false, isIpad };
      }
      console.warn('Native iPad share not available:', shareErr);
    }
  }

  // Desktop or non-iPad trigger: avoid dual-triggering programmatic save on iPad
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
