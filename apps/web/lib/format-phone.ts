/**
 * Format a raw digit string as a Nigerian phone number: +234 XXX XXX XXXX
 * Strips non-digits, handles leading 0 or 234 prefix.
 */
export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  // Strip country code if typed
  let local = digits;
  if (local.startsWith('234') && local.length > 3) {
    local = local.slice(3);
  } else if (local.startsWith('0')) {
    local = local.slice(1);
  }

  // Limit to 10 digits (Nigerian mobile)
  local = local.slice(0, 10);

  // Format as XXX XXX XXXX
  if (local.length <= 3) return local;
  if (local.length <= 6) return `${local.slice(0, 3)} ${local.slice(3)}`;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/**
 * Convert display value to E.164: +234XXXXXXXXXX
 */
export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('234') && local.length > 3) {
    local = local.slice(3);
  } else if (local.startsWith('0')) {
    local = local.slice(1);
  }
  return `+234${local}`;
}

/**
 * Check if phone has enough digits (10 local digits)
 */
export function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('234') && local.length > 3) {
    local = local.slice(3);
  } else if (local.startsWith('0')) {
    local = local.slice(1);
  }
  return local.length === 10;
}
