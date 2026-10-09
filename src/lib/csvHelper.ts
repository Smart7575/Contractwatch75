import { Contract, NoticeUnit, PaymentFrequency } from '../types';
import { calculateCancellationDeadline, getTodayString } from './dateUtils';

export interface CSVParseResult {
  valid: Contract[];
  errors: string[];
  totalParsed: number;
}

/**
 * Generates CSV string for contracts table export
 */
export function exportContractsToCSV(contracts: Contract[]): string {
  const headers = [
    'Name',
    'Category',
    'Subcategory',
    'Coverage Scope',
    'Supplier',
    'Contract Number',
    'Start Date',
    'End Date',
    'Notice Value',
    'Notice Unit',
    'Cancellation Deadline',
    'Auto Renew',
    'Renewal Period',
    'Annual Cost',
    'Monthly Cost',
    'Payment Frequency',
    'Status',
    'Tags',
    'Supplier Phone',
    'Supplier Email',
    'Supplier URL',
    'Notes',
    'Is Demo',
  ];

  const rows = contracts.map((c) => [
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${(c.categoryId || '').replace(/"/g, '""')}"`,
    `"${(c.subcategory || '').replace(/"/g, '""')}"`,
    `"${c.coverageType || 'individual'}"`,
    `"${(c.supplier || '').replace(/"/g, '""')}"`,
    `"${(c.contractNumber || '').replace(/"/g, '""')}"`,
    `"${c.startDate || ''}"`,
    `"${c.endDate || ''}"`,
    c.noticePeriod?.value ?? 1,
    `"${c.noticePeriod?.unit || 'months'}"`,
    `"${c.cancellationDeadline || ''}"`,
    c.autoRenew ? 'TRUE' : 'FALSE',
    `"${(c.renewalPeriod || '').replace(/"/g, '""')}"`,
    c.annualCost || 0,
    c.monthlyCost || 0,
    `"${c.paymentFrequency || 'monthly'}"`,
    `"${c.status || 'active'}"`,
    `"${(c.tags || []).join('; ')}"`,
    `"${(c.contact?.phone || '').replace(/"/g, '""')}"`,
    `"${(c.contact?.email || '').replace(/"/g, '""')}"`,
    `"${(c.contact?.url || '').replace(/"/g, '""')}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`,
    c.isDemo ? 'TRUE' : 'FALSE',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Returns a template CSV string for new user import
 */
export function getCSVTemplateString(): string {
  return [
    'Name,Category,Subcategory,Supplier,Contract Number,Start Date,End Date,Notice Value,Notice Unit,Annual Cost,Payment Frequency,Status,Notes',
    '"Gigabit Extra Fiber","telecom","Gigabit Fiber","Comcast Xfinity","XF-99201","2026-01-01","2027-01-01",1,"months",1080,"monthly","active","High-speed fiber connection"',
    '"Comprehensive Auto Policy","insurance","Auto & Collision","GEICO","GCO-44102","2026-05-15","2026-11-15",1,"months",1440,"monthly","active","2022 Ford F-150 SuperCrew"',
    '"Electric & Gas Supply","energy","Dual Fuel","Con Edison","CE-77189","2026-02-01","2027-02-01",1,"months",2160,"monthly","active","12-month fixed electric rate"',
  ].join('\r\n');
}

/**
 * Parses user-uploaded CSV text into Contract objects
 */
export function parseCSVToContracts(
  csvText: string,
  userId: string = 'usr_imported'
): CSVParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { valid: [], errors: ['CSV file is empty or missing headers.'], totalParsed: 0 };
  }

  // Parse header line
  const headerLine = lines[0];
  const headers = splitCSVLine(headerLine).map((h) => h.trim().toLowerCase());

  const nameIdx = headers.findIndex((h) => h.includes('name'));
  const categoryIdx = headers.findIndex((h) => h.includes('category') && !h.includes('sub'));
  const subcategoryIdx = headers.findIndex((h) => h.includes('subcategory') || h.includes('sub-category'));
  const supplierIdx = headers.findIndex((h) => h.includes('supplier') || h.includes('provider'));
  const contractNumIdx = headers.findIndex((h) => h.includes('number') || h.includes('account'));
  const startDateIdx = headers.findIndex((h) => h.includes('start'));
  const endDateIdx = headers.findIndex((h) => h.includes('end'));
  const noticeValIdx = headers.findIndex((h) => h.includes('notice') && (h.includes('val') || h.includes('period') || !h.includes('unit')));
  const noticeUnitIdx = headers.findIndex((h) => h.includes('notice') && h.includes('unit'));
  const costIdx = headers.findIndex((h) => h.includes('annual') || h.includes('cost') || h.includes('price') || h.includes('amount'));
  const statusIdx = headers.findIndex((h) => h.includes('status'));
  const coverageIdx = headers.findIndex((h) => h.includes('coverage') || h.includes('scope') || h.includes('dekking'));
  const notesIdx = headers.findIndex((h) => h.includes('note'));

  if (nameIdx === -1 || supplierIdx === -1) {
    return {
      valid: [],
      errors: ['Required columns "Name" and "Supplier" were not found in the CSV header.'],
      totalParsed: 0,
    };
  }

  const valid: Contract[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const cols = splitCSVLine(rawLine);
    const name = (cols[nameIdx] || '').trim();
    const supplier = (cols[supplierIdx] || '').trim();

    if (!name || !supplier) {
      errors.push(`Row ${i + 1}: Skipped because Name or Supplier is missing.`);
      continue;
    }

    const categoryId = categoryIdx !== -1 && cols[categoryIdx] ? cols[categoryIdx].trim().toLowerCase() : 'other';
    const subcategory = subcategoryIdx !== -1 && cols[subcategoryIdx] ? cols[subcategoryIdx].trim() : 'General';
    const contractNumber = contractNumIdx !== -1 ? cols[contractNumIdx].trim() : undefined;
    const startDate = startDateIdx !== -1 && cols[startDateIdx] ? cols[startDateIdx].trim() : getTodayString();
    
    // Default endDate to 1 year from now if not provided
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const defaultEnd = oneYearLater.toISOString().split('T')[0];
    const endDate = endDateIdx !== -1 && cols[endDateIdx] ? cols[endDateIdx].trim() : defaultEnd;

    const rawNoticeVal = noticeValIdx !== -1 ? parseInt(cols[noticeValIdx], 10) : 1;
    const noticeValue = isNaN(rawNoticeVal) ? 1 : rawNoticeVal;
    
    let noticeUnit: NoticeUnit = 'months';
    if (noticeUnitIdx !== -1 && cols[noticeUnitIdx]) {
      const u = cols[noticeUnitIdx].toLowerCase().trim();
      if (u.includes('day')) noticeUnit = 'days';
      else if (u.includes('week')) noticeUnit = 'weeks';
      else noticeUnit = 'months';
    }

    const rawCost = costIdx !== -1 ? parseFloat(cols[costIdx].replace(/[^0-9.-]/g, '')) : 0;
    const annualCost = isNaN(rawCost) ? 0 : rawCost;
    const monthlyCost = Number((annualCost / 12).toFixed(2));

    const statusVal = statusIdx !== -1 && cols[statusIdx] ? cols[statusIdx].toLowerCase().trim() : 'active';
    const status = ['active', 'cancelled', 'expired', 'switching'].includes(statusVal)
      ? (statusVal as any)
      : 'active';

    let coverageType: 'individual' | 'family' = 'individual';
    if (coverageIdx !== -1 && cols[coverageIdx]) {
      const val = cols[coverageIdx].toLowerCase().trim();
      if (val.includes('fam') || val.includes('gezin')) coverageType = 'family';
    }

    const cancellationDeadline = calculateCancellationDeadline(endDate, { value: noticeValue, unit: noticeUnit });

    valid.push({
      id: `csv_imp_${Date.now()}_${i}`,
      userId,
      name,
      categoryId,
      subcategory,
      coverageType,
      supplier,
      contractNumber,
      startDate,
      isEndDateOpenEnded: false,
      endDate,
      noticePeriod: { value: noticeValue, unit: noticeUnit },
      cancellationDeadline,
      isDeadlineOverridden: false,
      autoRenew: true,
      annualCost,
      monthlyCost,
      paymentFrequency: 'monthly',
      status,
      contact: {},
      notes: notesIdx !== -1 ? cols[notesIdx] : undefined,
      tags: ['Imported'],
      documentLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { valid, errors, totalParsed: lines.length - 1 };
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuote && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
