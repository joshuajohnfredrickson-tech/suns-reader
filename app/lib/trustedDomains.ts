/**
 * Local storage utilities for managing trusted domains
 */

const STORAGE_KEY = 'suns-reader-trusted-domains';

// Default starter list of trusted domains
const DEFAULT_TRUSTED_DOMAINS = [
  'espn.com',
  'nba.com',
  'theathletic.com',
  'azcentral.com',
  'arizona.com',
  'si.com',
];

/**
 * Get all trusted domains from localStorage
 */
export function getTrustedDomains(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // First run - seed with defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TRUSTED_DOMAINS));
    return DEFAULT_TRUSTED_DOMAINS;
  } catch (error) {
    console.error('Failed to get trusted domains:', error);
    return DEFAULT_TRUSTED_DOMAINS;
  }
}

/**
 * Add a domain to the trusted list
 */
export function addTrustedDomain(domain: string): void {
  if (typeof window === 'undefined') return;

  try {
    const domains = getTrustedDomains();
    const cleanDomain = domain.toLowerCase().trim();

    if (!domains.includes(cleanDomain)) {
      domains.push(cleanDomain);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(domains));
    }
  } catch (error) {
    console.error('Failed to add trusted domain:', error);
  }
}

/**
 * Remove a domain from the trusted list
 */
export function removeTrustedDomain(domain: string): void {
  if (typeof window === 'undefined') return;

  try {
    const domains = getTrustedDomains();
    const cleanDomain = domain.toLowerCase().trim();
    const filtered = domains.filter(d => d !== cleanDomain);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove trusted domain:', error);
  }
}

/**
 * Check if a domain is trusted
 */
export function isTrusted(domain: string): boolean {
  if (typeof window === 'undefined') return false;

  const domains = getTrustedDomains();
  const cleanDomain = domain.toLowerCase().trim();
  return domains.includes(cleanDomain);
}
