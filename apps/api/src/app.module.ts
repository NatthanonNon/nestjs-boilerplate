import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as fs from 'fs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import httpConfig from './config/http.config';
import swaggerConfig from './config/swagger.config';
import { validationSchema } from './config/validation';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { HttpClientModule } from './http/http-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, swaggerConfig, httpConfig, databaseConfig],
      validationSchema
    }),
    PrometheusModule.register({
      path: '/metrics'
    }),
    WinstonModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (appSettings: ConfigType<typeof appConfig>) => {
        const appName = appSettings.name;
        const logDir = appSettings.logDir;
        const logLevel = appSettings.logLevel;
        const retentionDays = appSettings.logRetentionDays;

        fs.mkdirSync(logDir, { recursive: true });

        return {
          level: logLevel,
          transports: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp }) => {
                  return `${timestamp} [${appName}] ${level}: ${message}`;
                })
              )
            }),
            new winston.transports.DailyRotateFile({
              dirname: logDir,
              filename: 'app-%DATE%.log',
              datePattern: 'YYYY-MM-DD',
              maxFiles: `${retentionDays}d`,
              zippedArchive: true,
              level: logLevel,
              format: winston.format.combine(winston.format.timestamp(), winston.format.json())
            })
          ]
        };
      }
    }),
    HttpClientModule,
    DatabaseModule,
    UsersModule,
    HealthModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
