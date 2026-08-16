/**
 * Format a numeric string or number as ₦X,XXX.XX
 */
export function formatNaira(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '\u20A60';
  return `\u20A6${num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format with decimals: ₦X,XXX.XX
 */
export function formatNairaDecimal(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '\u20A60.00';
  return `\u20A6${num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
