/**
 * Local storage utilities for managing trusted domains
 */

const STORAGE_KEY = 'suns-reader-trusted-domains';

// Default starter list of trusted domains
export const DEFAULT_TRUSTED_DOMAINS = [
  'arizonasports.com',
  'brightsideofthesun.com',
  'valleyofthesuns.com',
  'nba.com',
  'espn.com',
  'sports.yahoo.com',
  'nbcsports.com',
  'hoopsrumors.com',
  'sportingnews.com',
  'si.com',
  'abc15.com',
  'azcentral.com',
];

/**
 * Normalize domain: lowercase and strip www.
 */
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().trim().replace(/^www\./, '');
}

/**
 * Get all trusted domains from localStorage
 */
export function getTrustedDomains(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const domains = JSON.parse(stored);
      // If empty array, don't leave user stuck - return defaults
      if (Array.isArray(domains) && domains.length === 0) {
        return DEFAULT_TRUSTED_DOMAINS;
      }
      return domains;
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
    const cleanDomain = normalizeDomain(domain);

    if (!domains.includes(cleanDomain)) {
      domains.push(cleanDomain);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(domains));
      window.dispatchEvent(new Event('trustedDomainsChanged'));
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
    const cleanDomain = normalizeDomain(domain);
    const filtered = domains.filter(d => d !== cleanDomain);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('trustedDomainsChanged'));
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
  const cleanDomain = normalizeDomain(domain);
  return domains.includes(cleanDomain);
}

/**
 * Reset to default trusted domains
 */
export function resetToDefaults(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TRUSTED_DOMAINS));
    window.dispatchEvent(new Event('trustedDomainsChanged'));
  } catch (error) {
    console.error('Failed to reset to defaults:', error);
  }
}
