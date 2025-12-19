import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.module';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.knex.raw('select 1');
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Database health check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'unknown'
        })
      );
    }
  }
}
