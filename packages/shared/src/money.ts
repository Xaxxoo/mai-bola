/**
 * Decimal-safe money arithmetic.
 *
 * All functions accept number | string, do integer-cent math internally,
 * and return a fixed 2-decimal string so no floating-point drift accumulates.
 */

type MoneyValue = number | string;

/** Convert a money value to integer cents. */
export function toCents(value: MoneyValue): number {
  return Math.round(Number(value) * 100);
}

/** Convert integer cents to a fixed 2-decimal string. */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${frac.toString().padStart(2, '0')}`;
}

/** Add two money values. */
export function moneyAdd(a: MoneyValue, b: MoneyValue): string {
  return fromCents(toCents(a) + toCents(b));
}

/** Subtract b from a. */
export function moneySub(a: MoneyValue, b: MoneyValue): string {
  return fromCents(toCents(a) - toCents(b));
}

/** Multiply a money amount by a scalar factor (e.g. kg * pricePerKg). */
export function moneyMul(amount: MoneyValue, factor: MoneyValue): string {
  return fromCents(Math.round(toCents(amount) * Number(factor)));
}

/** Compare: -1 if a < b, 0 if equal, 1 if a > b. */
export function moneyCmp(a: MoneyValue, b: MoneyValue): number {
  const diff = toCents(a) - toCents(b);
  return diff < 0 ? -1 : diff > 0 ? 1 : 0;
}
