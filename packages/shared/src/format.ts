const LAGOS = 'Africa/Lagos';
export function formatNaira(value: string | number, decimals = 0): string { const amount = Number(value); return `₦${Number.isFinite(amount) ? amount.toLocaleString('en-NG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '0'}`; }
export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string { return new Date(value).toLocaleDateString('en-NG', { ...options, timeZone: LAGOS }); }
export function formatDateTime(value: string | Date): string { return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: LAGOS }); }
