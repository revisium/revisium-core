import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AutoDowngradeCronService {
  private readonly logger = new Logger(AutoDowngradeCronService.name);

  constructor() {
    this.logger.log(
      'Auto-downgrade is now handled by payment service admin API (POST /admin/subscriptions/bulk-transition)',
    );
  }
}
