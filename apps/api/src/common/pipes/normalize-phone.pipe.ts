import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { normalizeNigerianPhone } from '../utils/normalize-phone';

@Injectable()
export class NormalizePhonePipe implements PipeTransform {
  transform(value: string): string {
    try {
      return normalizeNigerianPhone(value);
    } catch {
      throw new BadRequestException('Invalid Nigerian phone number');
    }
  }
}
