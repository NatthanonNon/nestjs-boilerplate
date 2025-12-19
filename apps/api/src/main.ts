import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as compression from 'compression';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import appConfig from './config/app.config';
import swaggerConfig from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.enableShutdownHooks();

  const appSettings = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const swaggerSettings = app.get<ConfigType<typeof swaggerConfig>>(swaggerConfig.KEY);
  const swaggerEnabled = swaggerSettings.enabled;
  const apiPrefix = appSettings.apiPrefix;

  app.setGlobalPrefix(apiPrefix);

  if (swaggerEnabled) {
    app.use(helmet({ contentSecurityPolicy: false }));
  } else {
    app.use(helmet());
  }

  app.use(compression());
  app.use(requestIdMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const logDir = appSettings.logDir;
  const traceRetentionDays = appSettings.logRetentionDays;
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost, { logDir, traceRetentionDays }));
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  const port = appSettings.port;

  if (swaggerEnabled) {
    const swaggerPath = swaggerSettings.path;
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appSettings.name)
      .setDescription('API documentation')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, { useGlobalPrefix: true });
  }

  await app.listen(port, '0.0.0.0');
}

bootstrap();
