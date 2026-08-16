import { BadRequestException } from '@nestjs/common';
import { PickupRequestStatus } from '../enums';
import { assertTransition, isOpenStatus } from './pickup-status-machine';

describe('PickupStatusMachine', () => {
  describe('assertTransition', () => {
    const valid: [PickupRequestStatus, PickupRequestStatus][] = [
      [PickupRequestStatus.PENDING, PickupRequestStatus.CLUSTERED],
      [PickupRequestStatus.PENDING, PickupRequestStatus.CANCELLED],
      [PickupRequestStatus.CLUSTERED, PickupRequestStatus.SCHEDULED],
      [PickupRequestStatus.CLUSTERED, PickupRequestStatus.CANCELLED],
      [PickupRequestStatus.SCHEDULED, PickupRequestStatus.EN_ROUTE],
      [PickupRequestStatus.EN_ROUTE, PickupRequestStatus.COLLECTED],
    ];

    it.each(valid)('%s → %s is allowed', (from, to) => {
      expect(() => assertTransition(from, to)).not.toThrow();
    });

    const invalid: [PickupRequestStatus, PickupRequestStatus][] = [
      // Cannot cancel from SCHEDULED onward
      [PickupRequestStatus.SCHEDULED, PickupRequestStatus.CANCELLED],
      [PickupRequestStatus.EN_ROUTE, PickupRequestStatus.CANCELLED],
      [PickupRequestStatus.COLLECTED, PickupRequestStatus.CANCELLED],
      // Cannot skip steps
      [PickupRequestStatus.PENDING, PickupRequestStatus.SCHEDULED],
      [PickupRequestStatus.PENDING, PickupRequestStatus.EN_ROUTE],
      [PickupRequestStatus.PENDING, PickupRequestStatus.COLLECTED],
      [PickupRequestStatus.CLUSTERED, PickupRequestStatus.EN_ROUTE],
      // Terminal states go nowhere
      [PickupRequestStatus.COLLECTED, PickupRequestStatus.PENDING],
      [PickupRequestStatus.CANCELLED, PickupRequestStatus.PENDING],
    ];

    it.each(invalid)('%s → %s throws BadRequestException', (from, to) => {
      expect(() => assertTransition(from, to)).toThrow(BadRequestException);
    });
  });

  describe('isOpenStatus', () => {
    it('PENDING is open', () => {
      expect(isOpenStatus(PickupRequestStatus.PENDING)).toBe(true);
    });

    it('CLUSTERED is open', () => {
      expect(isOpenStatus(PickupRequestStatus.CLUSTERED)).toBe(true);
    });

    it('SCHEDULED is open', () => {
      expect(isOpenStatus(PickupRequestStatus.SCHEDULED)).toBe(true);
    });

    it('EN_ROUTE is not open', () => {
      expect(isOpenStatus(PickupRequestStatus.EN_ROUTE)).toBe(false);
    });

    it('COLLECTED is not open', () => {
      expect(isOpenStatus(PickupRequestStatus.COLLECTED)).toBe(false);
    });

    it('CANCELLED is not open', () => {
      expect(isOpenStatus(PickupRequestStatus.CANCELLED)).toBe(false);
    });
  });
});
