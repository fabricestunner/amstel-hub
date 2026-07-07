/**
 * Phone / identifier helpers.
 *
 * Numbers entered by customers in Rwanda come in many shapes:
 *   0788123456, 788123456, +250788123456, 250788123456.
 * SMS providers (e.g. Mista) only deliver reliably to full E.164 numbers
 * (`+2507XXXXXXXX`), so every number is normalized before it is stored or
 * used for delivery.
 */

const RW_COUNTRY_CODE = '250';

/** True when the value looks like an email address rather than a phone number. */
export function isEmail(value: string): boolean {
  return value.includes('@');
}

/**
 * Normalize a user-supplied phone number to E.164, defaulting to Rwanda
 * (+250) when no country code is present. Returns `undefined` for empty input.
 */
export function normalizePhone(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/[\s()\-.]/g, '');
  if (!cleaned) return undefined;

  // Already international (+250788123456)
  if (cleaned.startsWith('+')) return cleaned;
  // International "00" prefix (00250788123456)
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  // Full country code without plus (250788123456)
  if (cleaned.startsWith(RW_COUNTRY_CODE) && cleaned.length >= 12) {
    return `+${cleaned}`;
  }
  // Local format with leading zero (0788123456)
  if (cleaned.startsWith('0')) return `+${RW_COUNTRY_CODE}${cleaned.slice(1)}`;
  // Bare national number (788123456)
  if (/^7\d{8}$/.test(cleaned)) return `+${RW_COUNTRY_CODE}${cleaned}`;
  // Fallback: assume a Rwanda national number
  return `+${RW_COUNTRY_CODE}${cleaned}`;
}

/**
 * Normalize a login / lookup identifier. Emails are lower-cased and trimmed;
 * anything else is treated as a phone number and run through {@link normalizePhone}.
 */
export function normalizeIdentifier(raw: string): string {
  const value = raw.trim();
  if (isEmail(value)) return value.toLowerCase();
  return normalizePhone(value) ?? value;
}
