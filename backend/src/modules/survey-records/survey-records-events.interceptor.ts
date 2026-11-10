import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { SurveyRecordsGateway } from './survey-records.gateway';

/** Broadcasts `survey-record:changed` after every successful REST mutation. */
@Injectable()
export class SurveyRecordsEventsInterceptor implements NestInterceptor {
  constructor(private readonly gateway: SurveyRecordsGateway) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const method = context
      .switchToHttp()
      .getRequest<{ method: string }>().method;
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) return next.handle();
    return next.handle().pipe(
      mergeMap(async (result: Record<string, unknown>) => {
        if (result) {
          await this.gateway.notifyMutation(result, method === 'DELETE');
        }
        return result;
      }),
    );
  }
}
