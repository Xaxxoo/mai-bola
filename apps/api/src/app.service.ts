import { Injectable } from '@nestjs/common';
import { APP_NAME } from '@mai-bola/shared';

@Injectable()
export class AppService {
  getStatus() {
    return { name: APP_NAME, status: 'ok' };
  }
}
