import { Contract } from '../types';
import { formatDate } from './dateUtils';
import { exportFile } from './fileExportHelper';

/**
 * Generates an RFC 5545 compliant .ics calendar file containing cancellation deadlines
 */
export function generateICSFeed(contracts: Contract[]): string {
  const activeContracts = contracts.filter(
    (c) => c.status === 'active' && c.cancellationDeadline
  );

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ContractWatch//Smart Notice Radar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ContractWatch Cancellation Deadlines',
    'X-WR-TIMEZONE:UTC',
  ];

  const nowStr = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  for (const contract of activeContracts) {
    const deadlineClean = contract.cancellationDeadline.replace(/-/g, '');
    const uid = `contractwatch-${contract.id}@contractwatch.local`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowStr}`,
      `DTSTART;VALUE=DATE:${deadlineClean}`,
      `SUMMARY:⚠️ Notice Deadline: ${contract.name} (${contract.supplier})`,
      `DESCRIPTION:ContractWatch Notice Reminder\\n\\nContract: ${contract.name}\\nSupplier: ${contract.supplier}\\nAnnual Spend: €${contract.annualCost}\\nEnd Date: ${contract.endDate}\\nNotice Period: ${contract.noticePeriod.value} ${contract.noticePeriod.unit}\\nNotes: ${contract.notes || 'None'}\\nAction: Cancel or renegotiate before this date to prevent tacit auto-renewal.`,
      `STATUS:CONFIRMED`,
      'BEGIN:VALARM',
      'TRIGGER:-P14D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: 14 days left to cancel ${contract.name}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P3D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Urgent: 3 days left to cancel ${contract.name}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a client-side download or native calendar import of the .ics calendar file
 */
export async function downloadICS(contracts: Contract[]): Promise<void> {
  const icsData = generateICSFeed(contracts);
  const dateStr = new Date().toISOString().split('T')[0];
  await exportFile({
    filename: `contractwatch-deadlines-${dateStr}.ics`,
    content: icsData,
    mimeType: 'text/calendar;charset=utf-8',
    title: 'ContractWatch Calendar Deadlines',
  });
}

