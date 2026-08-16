import {
  toCents,
  fromCents,
  moneyAdd,
  moneySub,
  moneyMul,
  moneyCmp,
} from '@mai-bola/shared';

describe('money utilities', () => {
  describe('toCents / fromCents', () => {
    it('converts whole numbers', () => {
      expect(toCents(120)).toBe(12000);
      expect(toCents('120')).toBe(12000);
    });

    it('converts decimals', () => {
      expect(toCents(3.5)).toBe(350);
      expect(toCents('12345.67')).toBe(1234567);
    });

    it('rounds to nearest cent (no float drift)', () => {
      expect(toCents(0.1 + 0.2)).toBe(30);
    });

    it('handles negatives', () => {
      expect(toCents(-5000)).toBe(-500000);
    });

    it('fromCents produces fixed 2-decimal string', () => {
      expect(fromCents(12000)).toBe('120.00');
      expect(fromCents(1234567)).toBe('12345.67');
      expect(fromCents(5)).toBe('0.05');
      expect(fromCents(0)).toBe('0.00');
    });

    it('fromCents handles negatives', () => {
      expect(fromCents(-500000)).toBe('-5000.00');
      expect(fromCents(-50)).toBe('-0.50');
    });
  });

  describe('moneyAdd', () => {
    it('adds two amounts', () => {
      expect(moneyAdd('10000.00', '5400.00')).toBe('15400.00');
    });

    it('handles 0.1 + 0.2 without floating-point drift', () => {
      expect(moneyAdd('0.10', '0.20')).toBe('0.30');
    });

    it('adds number and string', () => {
      expect(moneyAdd(1000, '2345.67')).toBe('3345.67');
    });
  });

  describe('moneySub', () => {
    it('subtracts correctly', () => {
      expect(moneySub('10000.00', '5432.10')).toBe('4567.90');
    });

    it('produces negative result', () => {
      expect(moneySub('1000.00', '3000.00')).toBe('-2000.00');
    });

    it('handles the classic 12345.67 − 5432.10 case', () => {
      expect(moneySub('12345.67', '5432.10')).toBe('6913.57');
    });
  });

  describe('moneyMul', () => {
    it('multiplies money by integer factor', () => {
      expect(moneyMul('120.00', 45)).toBe('5400.00');
    });

    it('multiplies money by decimal factor', () => {
      expect(moneyMul('100.00', 1.15)).toBe('115.00');
    });

    it('handles small amounts', () => {
      expect(moneyMul('3.50', 7)).toBe('24.50');
    });
  });

  describe('moneyCmp', () => {
    it('returns 0 for equal values', () => {
      expect(moneyCmp('5000.00', 5000)).toBe(0);
    });

    it('returns -1 when a < b', () => {
      expect(moneyCmp('3000.00', '5000.00')).toBe(-1);
    });

    it('returns 1 when a > b', () => {
      expect(moneyCmp('5000.00', '3000.00')).toBe(1);
    });

    it('compares cents correctly', () => {
      expect(moneyCmp('100.01', '100.00')).toBe(1);
      expect(moneyCmp('99.99', '100.00')).toBe(-1);
    });
  });
});
