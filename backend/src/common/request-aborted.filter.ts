import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request, Response } from 'express';

const isRequestAborted = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const { message, code, type } = error as {
    message?: unknown;
    code?: unknown;
    type?: unknown;
  };
  return (
    message === 'Request aborted' || // multer
    type === 'request.aborted' || // body-parser / raw-body
    code === 'ECONNABORTED'
  );
};

/**
 * A client that drops the connection mid-upload (weak mobile network, tab
 * closed…) is not a server error: log one line instead of a stack trace.
 */
@Catch()
export class RequestAbortedFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Upload');

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'http' && isRequestAborted(exception)) {
      const http = host.switchToHttp();
      const request = http.getRequest<Request>();
      const response = http.getResponse<Response>();
      this.logger.warn(
        `Client aborted the request: ${request.method} ${request.originalUrl}`,
      );
      if (!response.headersSent && !response.writableEnded) {
        response
          .status(400)
          .json({ statusCode: 400, message: 'Request aborted' });
      }
      return;
    }
    super.catch(exception, host);
  }
}
