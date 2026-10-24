/**
 * Curated Standard World Timezones
 * Eliminates redundant city duplicates that share the same timezone band.
 * Groups by region with major representative cities (e.g. Amsterdam, Paris, Berlin, Madrid, Rome).
 */

export interface TimezoneOption {
  value: string;
  name: string;
  cities: string;
  region: string;
  label: string;
  offset: string;
}

export interface CuratedDefinition {
  value: string;
  name: string;
  cities: string;
  region: 'North America' | 'Europe' | 'Asia' | 'Australia & Pacific' | 'South America' | 'Africa & Middle East' | 'Universal';
}

export const CURATED_TIMEZONES: CuratedDefinition[] = [
  // North America
  {
    value: 'America/New_York',
    name: 'Eastern Time',
    cities: 'New York, Miami, Toronto, Montreal, Atlanta',
    region: 'North America',
  },
  {
    value: 'America/Chicago',
    name: 'Central Time',
    cities: 'Chicago, Dallas, Houston, Minneapolis, Mexico City',
    region: 'North America',
  },
  {
    value: 'America/Denver',
    name: 'Mountain Time',
    cities: 'Denver, Salt Lake City, Calgary, Edmonton',
    region: 'North America',
  },
  {
    value: 'America/Phoenix',
    name: 'Mountain Standard (No DST)',
    cities: 'Phoenix, Scottsdale',
    region: 'North America',
  },
  {
    value: 'America/Los_Angeles',
    name: 'Pacific Time',
    cities: 'Los Angeles, San Francisco, Seattle, Vancouver',
    region: 'North America',
  },
  {
    value: 'America/Anchorage',
    name: 'Alaska Time',
    cities: 'Anchorage, Juneau, Fairbanks',
    region: 'North America',
  },
  {
    value: 'Pacific/Honolulu',
    name: 'Hawaii Time',
    cities: 'Honolulu, Maui',
    region: 'North America',
  },
  {
    value: 'America/Halifax',
    name: 'Atlantic Time',
    cities: 'Halifax, San Juan',
    region: 'North America',
  },

  // Europe
  {
    value: 'Europe/London',
    name: 'Western Europe',
    cities: 'London, Dublin, Lisbon, Edinburgh',
    region: 'Europe',
  },
  {
    value: 'Europe/Amsterdam',
    name: 'Central Europe',
    cities: 'Amsterdam, Paris, Berlin, Brussels, Rome, Madrid, Zurich, Vienna',
    region: 'Europe',
  },
  {
    value: 'Europe/Athens',
    name: 'Eastern Europe',
    cities: 'Athens, Helsinki, Bucharest, Kyiv, Sofia, Riga',
    region: 'Europe',
  },
  {
    value: 'Europe/Istanbul',
    name: 'Turkey Time',
    cities: 'Istanbul, Ankara',
    region: 'Europe',
  },
  {
    value: 'Europe/Moscow',
    name: 'Moscow Time',
    cities: 'Moscow, Saint Petersburg',
    region: 'Europe',
  },

  // South America
  {
    value: 'America/Sao_Paulo',
    name: 'Brazil Time',
    cities: 'São Paulo, Rio de Janeiro, Brasília',
    region: 'South America',
  },
  {
    value: 'America/Buenos_Aires',
    name: 'Argentina Time',
    cities: 'Buenos Aires, Cordoba',
    region: 'South America',
  },
  {
    value: 'America/Santiago',
    name: 'Chile Time',
    cities: 'Santiago',
    region: 'South America',
  },
  {
    value: 'America/Bogota',
    name: 'Colombia & Peru',
    cities: 'Bogotá, Lima, Quito',
    region: 'South America',
  },

  // Asia
  {
    value: 'Asia/Dubai',
    name: 'Gulf Standard Time',
    cities: 'Dubai, Abu Dhabi, Muscat',
    region: 'Asia',
  },
  {
    value: 'Asia/Tehran',
    name: 'Iran Standard Time',
    cities: 'Tehran',
    region: 'Asia',
  },
  {
    value: 'Asia/Karachi',
    name: 'Pakistan Time',
    cities: 'Karachi, Islamabad, Lahore',
    region: 'Asia',
  },
  {
    value: 'Asia/Kolkata',
    name: 'India Standard Time',
    cities: 'Mumbai, New Delhi, Kolkata, Bengaluru',
    region: 'Asia',
  },
  {
    value: 'Asia/Dhaka',
    name: 'Bangladesh Time',
    cities: 'Dhaka',
    region: 'Asia',
  },
  {
    value: 'Asia/Bangkok',
    name: 'Indochina Time',
    cities: 'Bangkok, Jakarta, Hanoi, Ho Chi Minh City',
    region: 'Asia',
  },
  {
    value: 'Asia/Singapore',
    name: 'Singapore & Malaysia',
    cities: 'Singapore, Kuala Lumpur',
    region: 'Asia',
  },
  {
    value: 'Asia/Hong_Kong',
    name: 'China & Hong Kong',
    cities: 'Hong Kong, Beijing, Shanghai, Taipei',
    region: 'Asia',
  },
  {
    value: 'Asia/Tokyo',
    name: 'Japan & Korea',
    cities: 'Tokyo, Osaka, Seoul',
    region: 'Asia',
  },

  // Australia & Pacific
  {
    value: 'Australia/Perth',
    name: 'Western Australia',
    cities: 'Perth',
    region: 'Australia & Pacific',
  },
  {
    value: 'Australia/Adelaide',
    name: 'Central Australia',
    cities: 'Adelaide, Darwin',
    region: 'Australia & Pacific',
  },
  {
    value: 'Australia/Sydney',
    name: 'Eastern Australia',
    cities: 'Sydney, Melbourne, Brisbane, Canberra',
    region: 'Australia & Pacific',
  },
  {
    value: 'Pacific/Auckland',
    name: 'New Zealand',
    cities: 'Auckland, Wellington',
    region: 'Australia & Pacific',
  },
  {
    value: 'Pacific/Fiji',
    name: 'Fiji Time',
    cities: 'Suva',
    region: 'Australia & Pacific',
  },

  // Africa & Middle East
  {
    value: 'Africa/Cairo',
    name: 'Egypt Time',
    cities: 'Cairo, Alexandria',
    region: 'Africa & Middle East',
  },
  {
    value: 'Africa/Johannesburg',
    name: 'South Africa Time',
    cities: 'Johannesburg, Cape Town, Pretoria',
    region: 'Africa & Middle East',
  },
  {
    value: 'Africa/Lagos',
    name: 'West Africa Time',
    cities: 'Lagos, Abuja, Accra',
    region: 'Africa & Middle East',
  },
  {
    value: 'Africa/Nairobi',
    name: 'East Africa Time',
    cities: 'Nairobi, Addis Ababa',
    region: 'Africa & Middle East',
  },
  {
    value: 'Asia/Riyadh',
    name: 'Arabia Standard Time',
    cities: 'Riyadh, Doha, Kuwait City, Manama',
    region: 'Africa & Middle East',
  },
  {
    value: 'Africa/Casablanca',
    name: 'Morocco Time',
    cities: 'Casablanca, Rabat',
    region: 'Africa & Middle East',
  },

  // Universal
  {
    value: 'UTC',
    name: 'UTC',
    cities: 'Coordinated Universal Time / GMT',
    region: 'Universal',
  },
];

// Common alias map to normalize device timezones to canonical entries
const TIMEZONE_ALIASES: Record<string, string> = {
  // Central Europe
  'Europe/Paris': 'Europe/Amsterdam',
  'Europe/Berlin': 'Europe/Amsterdam',
  'Europe/Brussels': 'Europe/Amsterdam',
  'Europe/Rome': 'Europe/Amsterdam',
  'Europe/Madrid': 'Europe/Amsterdam',
  'Europe/Zurich': 'Europe/Amsterdam',
  'Europe/Vienna': 'Europe/Amsterdam',
  'Europe/Warsaw': 'Europe/Amsterdam',
  'Europe/Prague': 'Europe/Amsterdam',
  'Europe/Budapest': 'Europe/Amsterdam',
  'Europe/Stockholm': 'Europe/Amsterdam',
  'Europe/Oslo': 'Europe/Amsterdam',
  'Europe/Copenhagen': 'Europe/Amsterdam',
  'Europe/Belgrade': 'Europe/Amsterdam',
  'Europe/Bratislava': 'Europe/Amsterdam',
  'Europe/Ljubljana': 'Europe/Amsterdam',
  'Europe/Luxembourg': 'Europe/Amsterdam',
  // Western Europe
  'Europe/Dublin': 'Europe/London',
  'Europe/Lisbon': 'Europe/London',
  // Eastern Europe
  'Europe/Bucharest': 'Europe/Athens',
  'Europe/Helsinki': 'Europe/Athens',
  'Europe/Kyiv': 'Europe/Athens',
  'Europe/Sofia': 'Europe/Athens',
  'Europe/Tallinn': 'Europe/Athens',
  'Europe/Vilnius': 'Europe/Athens',
  'Europe/Riga': 'Europe/Athens',
  // North America Eastern
  'America/Toronto': 'America/New_York',
  'America/Montreal': 'America/New_York',
  'America/Detroit': 'America/New_York',
  'America/Indianapolis': 'America/New_York',
  // North America Central
  'America/Mexico_City': 'America/Chicago',
  'America/Winnipeg': 'America/Chicago',
  'America/Monterrey': 'America/Chicago',
  // North America Mountain
  'America/Edmonton': 'America/Denver',
  'America/Boise': 'America/Denver',
  // North America Pacific
  'America/Vancouver': 'America/Los_Angeles',
  'America/Tijuana': 'America/Los_Angeles',
  // Asia
  'Asia/Seoul': 'Asia/Tokyo',
  'Asia/Shanghai': 'Asia/Hong_Kong',
  'Asia/Taipei': 'Asia/Hong_Kong',
  'Asia/Beijing': 'Asia/Hong_Kong',
  'Asia/Kuala_Lumpur': 'Asia/Singapore',
  'Asia/Jakarta': 'Asia/Bangkok',
  'Asia/Saigon': 'Asia/Bangkok',
  'Asia/Ho_Chi_Minh': 'Asia/Bangkok',
};

export function formatTimezoneOffset(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : '';
  } catch {
    return '';
  }
}

export function getTimezoneOptions(): TimezoneOption[] {
  return CURATED_TIMEZONES.map((item) => {
    const offset = formatTimezoneOffset(item.value);
    const offsetStr = offset ? `[${offset}]` : '';
    const label = `${item.name} (${item.cities}) ${offsetStr}`.trim();

    return {
      value: item.value,
      name: item.name,
      cities: item.cities,
      region: item.region,
      label,
      offset,
    };
  });
}

export function getGroupedTimezoneOptions(): Record<string, TimezoneOption[]> {
  const options = getTimezoneOptions();
  const grouped: Record<string, TimezoneOption[]> = {};

  for (const opt of options) {
    if (!grouped[opt.region]) {
      grouped[opt.region] = [];
    }
    grouped[opt.region].push(opt);
  }

  return grouped;
}

/**
 * Detect user's device timezone and map to canonical common entry
 */
export function getLocalDeviceTimezone(): string {
  try {
    const rawTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (rawTz) {
      if (TIMEZONE_ALIASES[rawTz]) {
        return TIMEZONE_ALIASES[rawTz];
      }
      // If directly one of our curated entries
      if (CURATED_TIMEZONES.some((c) => c.value === rawTz)) {
        return rawTz;
      }
    }
  } catch {
    // fallback
  }
  return 'America/New_York';
}
