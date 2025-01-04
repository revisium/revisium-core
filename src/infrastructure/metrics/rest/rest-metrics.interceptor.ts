import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { finalize, Observable } from 'rxjs';
import { RestMetricsService } from 'src/infrastructure/metrics/rest/rest-metrics.service';
import { getDurationInSeconds } from 'src/infrastructure/metrics/utils';

@Injectable()
export class RestMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: RestMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startAt = process.hrtime();

    return next.handle().pipe(
      finalize(() => {
        this.metricsProcess(context, startAt);
      }),
    );
  }

  metricsProcess(context: ExecutionContext, startAt: [number, number]) {
    const labels = getLabels(context);

    this.metricsService.requestDurationSeconds(
      labels,
      getDurationInSeconds(startAt),
    );

    this.metricsService.requestTotal(labels);

    if (labels.status >= 400) {
      this.metricsService.requestErrors(labels);
    }
  }
}

function getLabels(context: ExecutionContext) {
  const request = context.switchToHttp().getRequest();
  const response = context.switchToHttp().getResponse();

  const method = request.method;
  const route = request.route ? request.route.path : request.path;
  const status = response.statusCode.toString();

  return {
    method,
    route,
    status,
  };
}
