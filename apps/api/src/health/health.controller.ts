import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from './database.health.indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly dbIndicator: DatabaseHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  @ApiOkResponse({ description: 'Health check status' })
  check() {
    return this.health.check([() => this.dbIndicator.pingCheck('database')]);
  }
}
