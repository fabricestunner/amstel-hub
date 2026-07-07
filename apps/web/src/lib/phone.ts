/**
 * Convert a locally-typed Rwanda phone number into E.164 (`+2507XXXXXXXX`).
 * Accepts 0788123456, 788123456, 250788123456 or an already-prefixed +250… value.
 */
export function toRwandaE164(input: string): string {
  const cleaned = input.trim().replace(/[\s()\-.]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('250') && cleaned.length >= 12) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+250${cleaned.slice(1)}`;
  return `+250${cleaned}`;
}

/** True when the value looks like an email address. */
export function isEmail(value: string): boolean {
  return value.includes('@');
}
