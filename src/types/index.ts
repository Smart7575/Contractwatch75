export type UrgencyLevel = 'overdue' | 'next_30' | '31_90' | 'later';

export type ContractStatus = 'active' | 'cancelled' | 'expired' | 'switching';

export type NoticeUnit = 'days' | 'weeks' | 'months';

export type PaymentFrequency = 'monthly' | 'quarterly' | 'annually';

export type DocumentType = 'policy' | 'contract' | 'invoice' | 'terms' | 'correspondence' | 'other';

export type DocumentProvider = 'nas' | 'gdrive' | 'onedrive' | 'dropbox' | 'generic';

export interface DocumentLink {
  id: string;
  contractId: string;
  title: string;
  type: DocumentType;
  url: string;
  provider: DocumentProvider;
  addedAt: string;
  note?: string;
}

export interface PriceHistoryEntry {
  id: string;
  date: string;
  annualCost: number;
  monthlyCost: number;
  note: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  completedAt?: string;
}

export interface ActivityLogItem {
  id: string;
  contractId: string;
  action: string;
  details?: string;
  timestamp: string;
}

export interface NoticePeriod {
  value: number;
  unit: NoticeUnit;
}

export interface ContractContact {
  phone?: string;
  email?: string;
  url?: string;
}

export interface ContractCredentials {
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
}

export type CoverageType = 'individual' | 'family';

export interface Contract {
  id: string;
  userId: string;
  name: string;
  categoryId: string;
  subcategory: string;
  coverageType?: CoverageType; // 'family' | 'individual'
  supplier: string;
  contractNumber?: string;
  startDate: string; // YYYY-MM-DD
  isEndDateOpenEnded: boolean;
  endDate: string; // YYYY-MM-DD
  noticePeriod: NoticePeriod;
  cancellationDeadline: string; // YYYY-MM-DD (calculated: endDate - noticePeriod)
  isDeadlineOverridden: boolean;
  autoRenew: boolean;
  renewalPeriod?: string;
  annualCost: number;
  monthlyCost: number;
  paymentFrequency: PaymentFrequency;
  status: ContractStatus;
  contact: ContractContact;
  credentials?: ContractCredentials;
  notes?: string;
  tags: string[];
  documentLinks: DocumentLink[];
  reminderOverride?: number[]; // days before deadline
  priceHistory?: PriceHistoryEntry[];
  checklist?: ChecklistItem[];
  alternativeCost?: number; // target or alternative quotation for savings calculation
  comparisonUrl?: string;
  followedByContractId?: string; // id of new contract if switched
  snoozedUntil?: string; // ISO date
  isDemo?: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  icon: string;
  color: string;
  subcategories: string[];
  isDefault: boolean;
  comparisonUrlDefault?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  currency: string;
  timezone: string;
  language: 'en';
  defaultReminders: number[]; // e.g. [90, 60, 30, 7, 0]
  channels: {
    inApp: boolean;
    email: boolean;
    webPush: boolean;
    weeklyDigest: boolean;
  };
  comparisonSites: Record<string, string>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'email' | 'google' | 'apple';
  settings: UserSettings;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  contractId: string;
  contractName: string;
  supplier: string;
  triggerDate: string;
  daysRemaining: number;
  title: string;
  message: string;
  urgency: UrgencyLevel;
  status: 'unread' | 'read' | 'snoozed' | 'dismissed';
  createdAt: string;
}

export type ViewMode = 'cards' | 'table' | 'timeline' | 'kanban';

export type PageRoute = 'dashboard' | 'settings' | 'reports';

export interface FilterState {
  search: string;
  categoryId: string;
  urgency: string; // 'all' | 'overdue' | 'next_30' | '31_90' | 'later' | 'needs_action'
  status: string; // 'all' | 'active' | 'cancelled' | 'switching' | 'expired'
  supplier: string;
  tag: string;
  coverageType?: string; // 'all' | 'family' | 'individual'
  sortBy: 'deadline' | 'annualCost' | 'name' | 'supplier' | 'status';
  sortOrder: 'asc' | 'desc';
}
