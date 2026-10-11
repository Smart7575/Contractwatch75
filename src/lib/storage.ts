import { Category, Contract, InAppNotification, User } from '../types';
import { calculateCancellationDeadline, getTodayString, getUrgencyLevel } from './dateUtils';

const STORAGE_KEYS = {
  USER: 'contractwatch_user_v2',
  CONTRACTS: 'contractwatch_contracts_v2',
  CATEGORIES: 'contractwatch_categories_v2',
  NOTIFICATIONS: 'contractwatch_notifications_v2',
  ACTIVITY: 'contractwatch_activity_v2',
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'energy',
    name: 'Energy & Utilities',
    icon: 'Zap',
    color: '#f59e0b',
    subcategories: ['Electricity', 'Natural Gas', 'Water & Sewer', 'Heating & Oil', 'Solar & Power'],
    isDefault: true,
    comparisonUrlDefault: 'https://www.energysage.com',
  },
  {
    id: 'telecom',
    name: 'Telecom & Media',
    icon: 'Wifi',
    color: '#06b6d4',
    subcategories: ['Mobile 5G', 'Gigabit Fiber', 'Cable Broadband', 'Streaming Services'],
    isDefault: true,
    comparisonUrlDefault: 'https://www.broadbandnow.com',
  },
  {
    id: 'insurance',
    name: 'Insurance',
    icon: 'ShieldCheck',
    color: '#3b82f6',
    subcategories: ['House', 'Car', 'Boat', 'Liability', 'Travel', 'Health', 'Life', 'Pet Insurance'],
    isDefault: true,
    comparisonUrlDefault: 'https://www.policygenius.com',
  },
  {
    id: 'housing',
    name: 'Housing',
    icon: 'Home',
    color: '#8b5cf6',
    subcategories: ['Apartment Lease', 'Mortgage', 'Storage Unit', 'HOA Dues', 'Parking Garage'],
    isDefault: true,
    comparisonUrlDefault: 'https://www.zillow.com',
  },
  {
    id: 'mobility',
    name: 'Mobility',
    icon: 'Car',
    color: '#10b981',
    subcategories: ['Vehicle Lease', 'Auto Loan', 'Car Sharing / Zipcar', 'Transit Pass'],
    isDefault: true,
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions & Memberships',
    icon: 'CreditCard',
    color: '#ec4899',
    subcategories: ['Gym & Fitness', 'Software & Cloud', 'Magazines & News', 'Gaming & Clubs'],
    isDefault: true,
    comparisonUrlDefault: 'https://www.nerdwallet.com',
  },
  {
    id: 'finance',
    name: 'Finance & Banking',
    icon: 'Landmark',
    color: '#64748b',
    subcategories: ['Consumer Loan', 'Credit Card Annual Fee', 'Checking Account', 'Advisory Fee'],
    isDefault: true,
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'Layers',
    color: '#71717a',
    subcategories: ['General Service', 'Home Warranty', 'Pest Control', 'Miscellaneous'],
    isDefault: true,
  },
];

export const DEFAULT_USER: User = {
  id: 'usr_demo_us',
  email: 'jordan.hayes@example.com',
  name: 'Jordan Hayes',
  provider: 'email',
  settings: {
    theme: 'light',
    currency: 'USD',
    timezone: 'America/New_York',
    language: 'en',
    defaultReminders: [90, 60, 30, 14, 7, 0],
    channels: {
      inApp: true,
      email: true,
      webPush: true,
      weeklyDigest: true,
    },
    comparisonSites: {
      energy: 'https://www.energysage.com',
      telecom: 'https://www.broadbandnow.com',
      insurance: 'https://www.policygenius.com',
      subscriptions: 'https://www.nerdwallet.com',
    },
  },
  createdAt: '2026-01-15T10:00:00.000Z',
};

/**
 * Generate 12 realistic American contracts & suppliers
 * Local reference date: 2026-10-02
 */
export function generateDemoContracts(userId: string = 'usr_demo_us'): Contract[] {
  return [
    {
      id: 'demo_us_1',
      userId,
      name: 'Con Edison Fixed Residential Electric & Gas Supply',
      categoryId: 'energy',
      subcategory: 'Dual Fuel',
      coverageType: 'family',
      supplier: 'Consolidated Edison (ConEd)',
      contractNumber: 'CE-NY-8829104',
      startDate: '2025-10-25',
      isEndDateOpenEnded: false,
      endDate: '2026-11-14',
      noticePeriod: { value: 1, unit: 'months' },
      cancellationDeadline: '2026-10-14', // 12 days left! Urgent notice window
      isDeadlineOverridden: false,
      autoRenew: true,
      renewalPeriod: '1 year market variable',
      annualCost: 2160,
      monthlyCost: 180,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        phone: '1-800-752-6633',
        email: 'customerservice@coned.com',
        url: 'https://www.coned.com/myaccount',
      },
      notes: '12-month fixed electric supply pricing terminates mid-November. Automatic rollover to market-variable rate unless notice of switch is submitted 30 days prior. EnergySage comparison shows potential $340/yr savings.',
      tags: ['Fixed Rate', 'Energy', 'High Priority'],
      documentLinks: [
        {
          id: 'doc_1',
          contractId: 'demo_us_1',
          title: 'ConEd Residential Agreement 2025-2026 PDF',
          type: 'contract',
          url: 'https://drive.google.com/file/d/coned_residential_supply_contract/view',
          provider: 'gdrive',
          addedAt: '2025-10-26T09:00:00Z',
        },
        {
          id: 'doc_2',
          contractId: 'demo_us_1',
          title: 'Synology NAS: /documents/utilities/coned_bill_statement.pdf',
          type: 'invoice',
          url: 'smb://synology-ds920.local/documents/utilities/coned_bill_statement.pdf',
          provider: 'nas',
          addedAt: '2025-10-26T09:05:00Z',
          note: 'Requires home network or QuickConnect VPN',
        },
      ],
      priceHistory: [
        { id: 'ph_1', date: '2024-10-25', annualCost: 1980, monthlyCost: 165, note: 'Initial 1-year promotional supply rate' },
        { id: 'ph_2', date: '2025-10-25', annualCost: 2160, monthlyCost: 180, note: 'Delivery fee adjustment (+15/mo)' },
      ],
      alternativeCost: 1820,
      checklist: [
        { id: 'cl_1', text: 'Review electric kWh consumption on ConEd portal', done: true },
        { id: 'cl_2', text: 'Compare community solar and green energy suppliers on EnergySage', done: true },
        { id: 'cl_3', text: 'Request quote with clean energy credit rebate', done: false },
        { id: 'cl_4', text: 'Submit formal opt-out notice to prevent variable rollover', done: false },
        { id: 'cl_5', text: 'Confirm switch date with new utility supplier', done: false },
      ],
      isDemo: true,
      isFavorite: true,
      createdAt: '2025-10-25T11:00:00Z',
      updatedAt: '2026-09-28T14:30:00Z',
    },
    {
      id: 'demo_us_2',
      userId,
      name: 'Planet Fitness Black Card All-Access Membership',
      categoryId: 'subscriptions',
      subcategory: 'Gym & Fitness',
      coverageType: 'individual',
      supplier: 'Planet Fitness Franchising LLC',
      contractNumber: 'PF-US-991204',
      startDate: '2025-08-27',
      isEndDateOpenEnded: false,
      endDate: '2026-10-27',
      noticePeriod: { value: 1, unit: 'months' },
      cancellationDeadline: '2026-09-27', // Overdue by 5 days!
      isDeadlineOverridden: false,
      autoRenew: true,
      renewalPeriod: '1 month rolling auto-bill',
      annualCost: 359.88,
      monthlyCost: 29.99,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        phone: '1-844-880-7180',
        email: 'memberservices@planetfitness.com',
        url: 'https://www.planetfitness.com/my-account',
      },
      notes: 'Notice deadline passed on Sept 27. 12-month commitment completed; membership is now on month-to-month auto-billing. Planet Fitness policy requires written certified letter or in-person cancellation at home club location.',
      tags: ['Gym', 'Overdue Notice', 'Monthly Rolling'],
      documentLinks: [
        {
          id: 'doc_3',
          contractId: 'demo_us_2',
          title: 'Planet Fitness Membership Agreement & Bylaws',
          type: 'terms',
          url: 'https://www.planetfitness.com/terms-and-conditions',
          provider: 'generic',
          addedAt: '2025-08-27T10:00:00Z',
        },
      ],
      priceHistory: [
        { id: 'ph_3', date: '2025-08-27', annualCost: 359.88, monthlyCost: 29.99, note: 'Black card promo with guest privileges' },
      ],
      isDemo: true,
      createdAt: '2025-08-27T10:00:00Z',
      updatedAt: '2026-09-30T10:00:00Z',
    },
    {
      id: 'demo_us_3',
      userId,
      name: 'Xfinity Gigabit Extra Internet & xFi Gateway Modem',
      categoryId: 'telecom',
      subcategory: 'Gigabit Fiber',
      coverageType: 'family',
      supplier: 'Comcast Corporation',
      contractNumber: 'XF-849201948',
      startDate: '2025-11-27',
      isEndDateOpenEnded: false,
      endDate: '2026-11-27',
      noticePeriod: { value: 1, unit: 'months' },
      cancellationDeadline: '2026-10-27', // 25 days left! Urgent
      isDeadlineOverridden: false,
      autoRenew: true,
      renewalPeriod: '1 month rolling at standard rate',
      annualCost: 1080,
      monthlyCost: 90,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        phone: '1-800-XFINITY (1-800-934-6489)',
        email: 'support@xfinity.com',
        url: 'https://www.xfinity.com/myaccount',
      },
      notes: 'Initial 1-year promotional rate ($65/mo) expires end of November, jumping to standard $90/mo ($1,080/yr). AT&T Fiber 500 Mbps is available in our neighborhood for $55/mo with no equipment fee.',
      tags: ['Broadband', 'Internet', 'Action Needed'],
      documentLinks: [
        {
          id: 'doc_4',
          contractId: 'demo_us_3',
          title: 'Xfinity Order Confirmation & Equipment Rental',
          type: 'contract',
          url: 'https://onedrive.live.com/?id=documents_xfinity_order_confirmation',
          provider: 'onedrive',
          addedAt: '2025-11-27T15:00:00Z',
        },
      ],
      alternativeCost: 660, // AT&T Fiber $55/mo = $660/yr ($420 savings!)
      checklist: [
        { id: 'cl_6', text: 'Call Comcast customer retention line for contract extension deal', done: false },
        { id: 'cl_7', text: 'Compare AT&T Fiber vs Verizon Fios on BroadbandNow', done: true },
        { id: 'cl_8', text: 'Schedule equipment return dropoff at UPS Store if switching', done: false },
      ],
      isDemo: true,
      isFavorite: true,
      createdAt: '2025-11-27T15:00:00Z',
      updatedAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'demo_us_4',
      userId,
      name: 'Blue Cross Blue Shield Gold Comprehensive Health Plan',
      categoryId: 'insurance',
      subcategory: 'Health (ACA / PPO)',
      coverageType: 'family',
      supplier: 'Blue Cross Blue Shield Association',
      contractNumber: 'BCBS-GRP-440192',
      startDate: '2026-01-01',
      isEndDateOpenEnded: false,
      endDate: '2026-12-31',
      noticePeriod: { value: 0, unit: 'days' },
      cancellationDeadline: '2026-12-31', // 90 days left (Annual ACA Open Enrollment window)
      isDeadlineOverridden: true,
      autoRenew: true,
      renewalPeriod: '1 calendar year',
      annualCost: 5400,
      monthlyCost: 450,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        phone: '1-800-521-2227',
        email: 'memberhelp@bcbs.com',
        url: 'https://www.bcbs.com/member-portal',
      },
      notes: 'ACA nationwide Open Enrollment window runs November 1 through December 31. Review upcoming premium increases, deductibles ($1,500 individual), and network provider changes before December 31 deadline.',
      tags: ['Health', 'Open Enrollment', 'Essential'],
      documentLinks: [
        {
          id: 'doc_5',
          contractId: 'demo_us_4',
          title: '2026 Summary of Benefits and Coverage (SBC)',
          type: 'policy',
          url: 'https://drive.google.com/file/d/bcbs_gold_sbc_2026/view',
          provider: 'gdrive',
          addedAt: '2026-01-02T10:00:00Z',
        },
      ],
      checklist: [
        { id: 'cl_9', text: 'Review 2027 plan options on Healthcare.gov when published Nov 1', done: false },
        { id: 'cl_10', text: 'Check in-network status for primary care doctor and specialists', done: false },
      ],
      isDemo: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-15T12:00:00Z',
    },
    {
      id: 'demo_us_5',
      userId,
      name: 'Autoverzekering All Risk',
      categoryId: 'insurance',
      subcategory: 'Autoverzekering',
      coverageType: 'individual',
      supplier: 'Centraal Beheer',
      contractNumber: 'CB-AUTO-771928',
      startDate: '2026-05-19',
      isEndDateOpenEnded: false,
      endDate: '2026-11-19',
      noticePeriod: { value: 1, unit: 'months' },
      cancellationDeadline: '2026-10-19', // 17 days left!
      isDeadlineOverridden: false,
      autoRenew: true,
      renewalPeriod: '12-maanden polisverlenging',
      annualCost: 1440,
      monthlyCost: 120,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        phone: '055 579 7979',
        email: 'info@centraalbeheer.nl',
        url: 'https://www.centraalbeheer.nl/verzekeringen/autoverzekering',
      },
      credentials: {
        url: 'https://www.centraalbeheer.nl/inloggen',
        username: 'smartprod7501@gmail.com',
        password: 'CB#Secure2026!',
      },
      notes: 'All Risk dekking inclusief inzittendenverzekering en no-claimbeschermer.',
      tags: ['Autoverzekering', 'All Risk', 'Centraal Beheer'],
      documentLinks: [
        {
          id: 'doc_auto_1',
          contractId: 'demo_us_5',
          title: 'Polisblad',
          type: 'policy',
          url: 'https://storage.googleapis.com/contractwatch-demo/polisblad_autoverzekering.pdf',
          provider: 'gdrive',
          addedAt: '2026-05-20T11:00:00Z',
        },
        {
          id: 'doc_auto_2',
          contractId: 'demo_us_5',
          title: 'Digitale groene kaart',
          type: 'terms',
          url: 'https://storage.googleapis.com/contractwatch-demo/digitale_groene_kaart.pdf',
          provider: 'gdrive',
          addedAt: '2026-05-20T11:05:00Z',
        },
        {
          id: 'doc_auto_3',
          contractId: 'demo_us_5',
          title: 'Voorwaarden WA',
          type: 'terms',
          url: 'https://storage.googleapis.com/contractwatch-demo/voorwaarden_wa.pdf',
          provider: 'onedrive',
          addedAt: '2026-05-20T11:10:00Z',
        },
        {
          id: 'doc_auto_4',
          contractId: 'demo_us_5',
          title: 'Overige voorwaarden excl. WA',
          type: 'terms',
          url: 'https://storage.googleapis.com/contractwatch-demo/overige_voorwaarden_excl_wa.pdf',
          provider: 'dropbox',
          addedAt: '2026-05-20T11:15:00Z',
        },
      ],
      alternativeCost: 1180,
      isDemo: true,
      createdAt: '2026-05-19T09:00:00Z',
      updatedAt: '2026-09-20T16:00:00Z',
    },
    {
      id: 'demo_us_6',
      userId,
      name: 'Adobe Creative Cloud All Apps Individual Membership',
      categoryId: 'subscriptions',
      subcategory: 'Software & Cloud',
      coverageType: 'individual',
      supplier: 'Adobe Systems Inc. (San Jose, CA)',
      contractNumber: 'ADB-US-993821',
      startDate: '2025-12-04',
      isEndDateOpenEnded: false,
      endDate: '2026-12-04',
      noticePeriod: { value: 14, unit: 'days' },
      cancellationDeadline: '2026-11-20', // 49 days left (in 31-90 window)
      isDeadlineOverridden: false,
      autoRenew: true,
      renewalPeriod: '1 year annual commitment',
      annualCost: 659.88,
      monthlyCost: 54.99,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        phone: '1-800-833-6687',
        url: 'https://account.adobe.com/plans',
      },
      notes: 'Annual commitment paid monthly. Important: Cancelling outside the 14-day renewal window incurs a 50% early termination fee on the remaining contract value. Must cancel during November renewal window.',
      tags: ['Software', 'Design', 'Auto-renew'],
      documentLinks: [],
      priceHistory: [
        { id: 'ph_4', date: '2025-12-04', annualCost: 659.88, monthlyCost: 54.99, note: 'Cyber Monday introductory rate' },
      ],
      isDemo: true,
      createdAt: '2025-12-04T14:00:00Z',
      updatedAt: '2026-09-10T11:00:00Z',
    },
    {
      id: 'demo_us_7',
      userId,
      name: 'Verizon Wireless Unlimited Plus 5G Postpaid Plan',
      categoryId: 'telecom',
      subcategory: 'Mobile 5G',
      coverageType: 'individual',
      supplier: 'Verizon Communications Inc.',
      contractNumber: 'VZ-MOB-339102',
      startDate: '2025-04-10',
      isEndDateOpenEnded: false,
      endDate: '2027-04-10',
      noticePeriod: { value: 1, unit: 'months' },
      cancellationDeadline: '2027-03-10', // Later (>150 days)
      isDeadlineOverridden: false,
      autoRenew: true,
      renewalPeriod: '1 month rolling',
      annualCost: 960,
      monthlyCost: 80,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        phone: '1-800-922-0204',
        url: 'https://www.verizon.com/myverizon',
      },
      notes: '5G Ultra Wideband with 30GB premium mobile hotspot and Disney Bundle perk ($10/mo savings). Device payment agreement ends April 2027.',
      tags: ['Mobile', 'Unlimited 5G', 'Hotspot'],
      documentLinks: [],
      isDemo: true,
      createdAt: '2025-04-10T12:00:00Z',
      updatedAt: '2026-04-10T12:00:00Z',
    },
    {
      id: 'demo_us_8',
      userId,
      name: 'Netflix Premium 4K HDR + Ad-Free Streaming',
      categoryId: 'telecom',
      subcategory: 'Streaming Services',
      coverageType: 'family',
      supplier: 'Netflix, Inc. (Los Gatos, CA)',
      contractNumber: 'NFLX-US-88310',
      startDate: '2024-03-15',
      isEndDateOpenEnded: true,
      endDate: '2026-11-15',
      noticePeriod: { value: 7, unit: 'days' },
      cancellationDeadline: '2026-11-08', // 37 days left (in 31-90 window)
      isDeadlineOverridden: false,
      autoRenew: true,
      renewalPeriod: '1 month',
      annualCost: 275.88,
      monthlyCost: 22.99,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        url: 'https://www.netflix.com/youraccount',
      },
      notes: '4 simultaneous screens in 4K UHD. Evaluate whether downgrading to Standard with ads ($6.99/mo) saves $192/year without noticeable sacrifice.',
      tags: ['Entertainment', 'Streaming', 'Monthly'],
      documentLinks: [],
      isDemo: true,
      createdAt: '2024-03-15T09:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'demo_us_9',
      userId,
      name: 'Tesla Full Self-Driving (FSD) Supervised Subscription',
      categoryId: 'mobility',
      subcategory: 'Vehicle Lease',
      coverageType: 'individual',
      supplier: 'Tesla, Inc. (Austin, TX)',
      contractNumber: 'TSLA-SUB-019482',
      startDate: '2025-06-01',
      isEndDateOpenEnded: false,
      endDate: '2026-11-01',
      noticePeriod: { value: 1, unit: 'days' },
      cancellationDeadline: '2026-10-31', // 29 days left!
      isDeadlineOverridden: false,
      autoRenew: true,
      renewalPeriod: '1 month',
      annualCost: 1188,
      monthlyCost: 99,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        url: 'https://www.tesla.com/tesla-app',
      },
      notes: 'Full Self-Driving capability subscription for Model Y Long Range. Billed on the 1st of each month via Tesla app credit card profile. Cancel before Oct 31 to avoid November billing cycle.',
      tags: ['Tesla', 'EV', 'Software Subscription'],
      documentLinks: [],
      isDemo: true,
      createdAt: '2025-06-01T08:00:00Z',
      updatedAt: '2026-08-01T08:00:00Z',
    },
    {
      id: 'demo_us_10',
      userId,
      name: 'State Farm Homeowners & Dwelling Property Policy',
      categoryId: 'insurance',
      subcategory: 'Homeowners',
      coverageType: 'family',
      supplier: 'State Farm Insurance (Bloomington, IL)',
      contractNumber: 'SF-HO-0091823',
      startDate: '2024-05-01',
      isEndDateOpenEnded: false,
      endDate: '2027-05-01',
      noticePeriod: { value: 1, unit: 'months' },
      cancellationDeadline: '2027-04-01', // Later (>180 days)
      isDeadlineOverridden: false,
      autoRenew: true,
      renewalPeriod: '1 calendar year',
      annualCost: 1650,
      monthlyCost: 137.50,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        phone: '1-800-STATE-FARM',
        url: 'https://www.statefarm.com/customer-care',
      },
      notes: 'Single family home dwelling coverage ($450k) plus $100k personal property and $300k personal liability. Escrowed via mortgage servicer.',
      tags: ['Homeowners', 'Dwelling', 'Escrow'],
      documentLinks: [
        {
          id: 'doc_7',
          contractId: 'demo_us_10',
          title: 'Synology NAS: Homeowners Policy & Declarations 2024.pdf',
          type: 'policy',
          url: 'smb://192.168.1.150/documents/insurance/homeowners_statefarm.pdf',
          provider: 'nas',
          addedAt: '2024-05-02T10:00:00Z',
          note: 'Local NAS storage link',
        },
      ],
      isDemo: true,
      createdAt: '2024-05-01T10:00:00Z',
      updatedAt: '2026-05-01T10:00:00Z',
    },
    {
      id: 'demo_us_11',
      userId,
      name: 'Apple One Premier Family All-Services Bundle',
      categoryId: 'subscriptions',
      subcategory: 'Software & Cloud',
      coverageType: 'family',
      supplier: 'Apple Inc. (Cupertino, CA)',
      contractNumber: 'APPL-FAM-1129',
      startDate: '2023-09-10',
      isEndDateOpenEnded: true,
      endDate: '2027-01-10',
      noticePeriod: { value: 7, unit: 'days' },
      cancellationDeadline: '2027-01-03', // Later (>90 days)
      isDeadlineOverridden: false,
      autoRenew: true,
      annualCost: 455.40,
      monthlyCost: 37.95,
      paymentFrequency: 'monthly',
      status: 'active',
      contact: {
        url: 'https://support.apple.com/billing',
      },
      notes: 'Includes Apple Music, Apple TV+, Apple Arcade, 2TB iCloud+ storage, Apple Fitness+, and Apple News+ shared across 5 Family Sharing Apple IDs.',
      tags: ['Apple', 'Cloud Storage', 'Family Plan'],
      documentLinks: [],
      isDemo: true,
      createdAt: '2023-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'demo_us_12',
      userId,
      name: 'Amazon Prime Annual Membership',
      categoryId: 'subscriptions',
      subcategory: 'Magazines & News',
      coverageType: 'family',
      supplier: 'Amazon.com Services LLC (Seattle, WA)',
      contractNumber: 'AMZN-PRM-55102',
      startDate: '2025-03-01',
      isEndDateOpenEnded: false,
      endDate: '2026-03-01',
      noticePeriod: { value: 1, unit: 'months' },
      cancellationDeadline: '2026-02-01',
      isDeadlineOverridden: false,
      autoRenew: false,
      annualCost: 139,
      monthlyCost: 11.58,
      paymentFrequency: 'annually',
      status: 'cancelled',
      followedByContractId: 'demo_us_6',
      contact: {
        url: 'https://www.amazon.com/mc/manage',
      },
      notes: 'Annual membership cancelled prior to March 2026 renewal. Account retains free shipping benefits until end of prepaid term.',
      tags: ['Amazon', 'Archived', 'Cancelled'],
      documentLinks: [],
      isDemo: true,
      createdAt: '2025-03-01T10:00:00Z',
      updatedAt: '2026-02-15T10:00:00Z',
    },
  ];
}

/**
 * Storage helpers
 */
export function loadUser(): User {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate legacy Dutch demo user if detected
      if (parsed.email === 'alex.vanleeuwen@example.com' || parsed.settings?.currency === 'EUR') {
        saveUser(DEFAULT_USER);
        return DEFAULT_USER;
      }
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load user', err);
  }
  return DEFAULT_USER;
}

export function saveUser(user: User): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save user', err);
  }
}

export function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure standard insurance subcategories exist: House, Car, Boat, Liability, Travel
        const defaultInsuranceSubs = ['House', 'Car', 'Boat', 'Liability', 'Travel'];
        const updated = parsed.map((cat: Category) => {
          if (cat.id === 'insurance') {
            const currentSubs = Array.isArray(cat.subcategories) ? cat.subcategories : [];
            const missing = defaultInsuranceSubs.filter((s) => !currentSubs.includes(s));
            if (missing.length > 0) {
              return {
                ...cat,
                subcategories: [...currentSubs, ...missing],
              };
            }
          }
          return cat;
        });

        // Check if legacy Dutch comparison URLs exist
        const hasLegacy = updated.some((c: Category) => c.comparisonUrlDefault?.includes('.nl'));
        if (!hasLegacy) {
          return updated;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load categories', err);
  }
  saveCategories(DEFAULT_CATEGORIES);
  return DEFAULT_CATEGORIES;
}

export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (err) {
    console.error('Failed to save categories', err);
  }
}

/**
 * Robust helper to detect if a contract is a demo contract
 */
export function isDemoContract(c: Partial<Contract>): boolean {
  if (c.isDemo === false) return false;
  if (typeof c.id === 'string' && c.id.startsWith('cw_')) return false;
  if (c.isDemo === true) return true;
  if (typeof c.id === 'string') {
    if (c.id.startsWith('demo_') || c.id.startsWith('demo-')) return true;
    if (/^c_[0-9]+$/.test(c.id) || /^demo[0-9]+$/.test(c.id)) return true;
  }
  // Check known demo names or suppliers (only if not explicitly marked false)
  const demoMarkers = [
    'con edison',
    'planet fitness',
    'xfinity',
    'comcast',
    'blue cross',
    'spotify',
    'amazon prime',
    'apple one',
    'state farm',
    'vattenfall',
    'ziggo',
    'interpolis',
    'greenchoice',
    'kpn'
  ];
  const name = (c.name || '').toLowerCase();
  const supplier = (c.supplier || '').toLowerCase();
  if (c.isDemo !== false && demoMarkers.some((m) => name.includes(m) || supplier.includes(m))) {
    return true;
  }
  return false;
}

export function loadContracts(): Contract[] {
  try {
    const isDismissed =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('contractwatch_demo_dismissed') === 'true';

    const raw = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (isDismissed) {
          const filtered = parsed.filter((c) => !isDemoContract(c));
          return filtered;
        }
        if (parsed.length > 0) {
          const hasLegacyDutch = parsed.some(
            (c: Contract) =>
              c.supplier?.includes('Vattenfall') ||
              c.supplier?.includes('Ziggo') ||
              c.supplier?.includes('Interpolis')
          );
          if (hasLegacyDutch) {
            saveContracts([]);
            return [];
          }

          // Backfill coverageType on existing stored contracts if missing
          const backfilled = parsed.map((c: Contract) => {
            if (!c.coverageType) {
              const nameLower = (c.name || '').toLowerCase();
              const notesLower = (c.notes || '').toLowerCase();
              const tagsLower = (c.tags || []).map((t) => t.toLowerCase());
              const isFamily =
                nameLower.includes('family') ||
                nameLower.includes('gezin') ||
                notesLower.includes('family') ||
                notesLower.includes('gezin') ||
                tagsLower.some((t) => t.includes('family') || t.includes('gezin')) ||
                c.categoryId === 'energy' ||
                c.subcategory?.toLowerCase().includes('home');
              return {
                ...c,
                coverageType: isFamily ? ('family' as const) : ('individual' as const),
              };
            }
            return c;
          });
          return backfilled;
        }
        return parsed;
      }
    }
    if (isDismissed) {
      saveContracts([]);
      return [];
    }
  } catch (err) {
    console.error('Failed to load contracts', err);
  }

  // Check if demo data was explicitly dismissed
  try {
    const demoDismissed = localStorage.getItem('contractwatch_demo_dismissed') === 'true';
    if (demoDismissed) {
      saveContracts([]);
      return [];
    }
  } catch {}

  // Return empty list by default - demo contracts can be loaded explicitly by user
  return [];
}

export function saveContracts(contracts: Contract[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
  } catch (err) {
    console.error('Failed to save contracts', err);
  }
}

/**
 * Remove demo data (removes any item identified as demo)
 */
export function removeDemoContracts(currentContracts: Contract[]): Contract[] {
  try {
    localStorage.setItem('contractwatch_demo_dismissed', 'true');
  } catch {}
  const filtered = currentContracts.filter((c) => !isDemoContract(c));
  saveContracts(filtered);
  return filtered;
}

/**
 * Restore demo data without duplicating existing items
 */
export function restoreDemoContracts(
  currentContracts: Contract[],
  userId: string = 'usr_demo_us'
): Contract[] {
  try {
    localStorage.removeItem('contractwatch_demo_dismissed');
  } catch {}
  const demoData = generateDemoContracts(userId);
  const currentIds = new Set(currentContracts.map((c) => c.id));
  const newDemos = demoData.filter((d) => !currentIds.has(d.id));
  const merged = [...currentContracts, ...newDemos];
  saveContracts(merged);
  return merged;
}

/**
 * Reset / Delete Account completely
 */
export function wipeAllUserData(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.CONTRACTS);
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
}
