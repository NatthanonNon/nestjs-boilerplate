import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const appConfigSchema = {
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(10001),
  API_PREFIX: Joi.string().default('api/v1'),
  APP_NAME: Joi.string().default('nestjs-boilerplate'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').default('info'),
  LOG_DIR: Joi.string().default('logs'),
  LOG_RETENTION_DAYS: Joi.number().integer().min(1).default(14),
  UPLOAD_DIR: Joi.string().default('uploads')
};

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'nestjs-boilerplate',
  port: parseInt(process.env.PORT || '10001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || 'logs',
  logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '14', 10),
  uploadDir: process.env.UPLOAD_DIR || 'uploads'
}));
