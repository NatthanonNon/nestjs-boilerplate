import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const swaggerConfigSchema = {
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('docs')
};

export default registerAs('swagger', () => ({
  enabled: process.env.SWAGGER_ENABLED !== 'false',
  path: process.env.SWAGGER_PATH || 'docs'
}));
