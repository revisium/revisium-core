import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';

@ApiExcludeController()
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  get() {
    return 'ok';
  }
}
