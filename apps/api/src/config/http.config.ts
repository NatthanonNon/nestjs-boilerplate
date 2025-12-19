import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const httpConfigSchema = {
  HTTP_TIMEOUT: Joi.number().integer().min(100).default(5000),
  HTTP_MAX_REDIRECTS: Joi.number().integer().min(0).default(5)
};

export default registerAs('http', () => ({
  timeout: parseInt(process.env.HTTP_TIMEOUT || '5000', 10),
  maxRedirects: parseInt(process.env.HTTP_MAX_REDIRECTS || '5', 10)
}));
