/**
 * Normalizes a Nigerian phone number to +234XXXXXXXXXX format.
 * Accepts: 0801..., 234801..., +234801...
 * Throws if the result doesn't match the expected pattern.
 */
export function normalizeNigerianPhone(raw: string): string {
  let phone = raw.replace(/[\s\-()]/g, '');

  if (phone.startsWith('+234')) {
    // already international
  } else if (phone.startsWith('234') && phone.length === 13) {
    phone = '+' + phone;
  } else if (phone.startsWith('0') && phone.length === 11) {
    phone = '+234' + phone.slice(1);
  } else if (!phone.startsWith('+')) {
    throw new Error(`Invalid Nigerian phone number: ${raw}`);
  }

  if (!/^\+234[0-9]{10}$/.test(phone)) {
    throw new Error(`Invalid Nigerian phone number: ${raw}`);
  }

  return phone;
}
