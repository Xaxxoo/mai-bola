import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get pricePerKg(): number {
    return parseFloat(process.env.PRICE_PER_KG || '120');
  }
}
