import { Module, Inject, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { knex, Knex } from 'knex';
import { Model, knexSnakeCaseMappers } from 'objection';
import databaseConfig from '../config/database.config';

export const KNEX_CONNECTION = 'KNEX_CONNECTION';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KNEX_CONNECTION,
      inject: [databaseConfig.KEY],
      useFactory: (dbConfig: ConfigType<typeof databaseConfig>) => {
        const knexInstance = knex({
          client: 'pg',
          connection: {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.name
          },
          debug: dbConfig.debug,
          ...knexSnakeCaseMappers()
        });

        Model.knex(knexInstance);
        return knexInstance;
      }
    }
  ],
  exports: [KNEX_CONNECTION]
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(KNEX_CONNECTION) private readonly connection: Knex) {}

  async onModuleDestroy() {
    await this.connection.destroy();
  }
}
