export interface ConsentSettings {
  analytics: boolean;    // performance monitoring
  drafts: boolean;       // auto-save drafts
  logging: boolean;      // debug logs
}

export interface PrivacySettings {
  dataRetentionMonths: 1 | 3 | 6 | 12;
}

export interface ConsentRecord {
  version: number;
  consented: boolean;
  settings: ConsentSettings;
  timestamp: string;
}

const CONSENT_KEY = 'vidforge_consent';
const PRIVACY_KEY = 'vidforge_privacy_settings';

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  dataRetentionMonths: 3,
};

export function getConsentRecord(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentRecord;
  } catch {
    return null;
  }
}

export function setConsentRecord(record: ConsentRecord): void {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
}

export function hasConsented(): boolean {
  return getConsentRecord() !== null;
}

export function clearConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}

export function getPrivacySettings(): PrivacySettings {
  try {
    const raw = localStorage.getItem(PRIVACY_KEY);
    if (!raw) return { ...DEFAULT_PRIVACY_SETTINGS };
    return JSON.parse(raw) as PrivacySettings;
  } catch {
    return { ...DEFAULT_PRIVACY_SETTINGS };
  }
}

export function updatePrivacySettings(settings: PrivacySettings): void {
  localStorage.setItem(PRIVACY_KEY, JSON.stringify(settings));
}

export function clearAllLocalData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('vidforge_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function getStoredDataSummary(): { key: string; size: number }[] {
  const summary: { key: string; size: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('vidforge_')) {
      const value = localStorage.getItem(key) ?? '';
      const size = new Blob([value]).size;
      summary.push({ key, size });
    }
  }
  return summary;
}
