export function formatNaira(value: number | string) { const amount = Number(value); return `₦${Number.isFinite(amount) ? amount.toLocaleString('en-NG', { maximumFractionDigits: 0 }) : '0'}`; }
