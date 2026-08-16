/**
 * Format a numeric string or number as ₦X,XXX.XX
 */
export { formatNaira } from '@mai-bola/shared';

/**
 * Format with decimals: ₦X,XXX.XX
 */
export const formatNairaDecimal = (value: string | number) => `₦${Number(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
