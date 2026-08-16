import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = (req as any).requestId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        message = (body as any).message || message;
        error = (body as any).error || exception.name;
      }
    }

    if (status >= 500) {
      this.logger.error(
        { requestId, method: req.method, url: req.url, status, exception },
        `${req.method} ${req.url} ${status}`,
      );
    } else {
      this.logger.warn(
        { requestId, method: req.method, url: req.url, status },
        `${req.method} ${req.url} ${status}`,
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      error,
      requestId,
    });
  }
}
