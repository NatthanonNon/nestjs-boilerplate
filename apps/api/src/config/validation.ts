import * as Joi from 'joi';
import { appConfigSchema } from './app.config';
import { databaseConfigSchema } from './database.config';
import { httpConfigSchema } from './http.config';
import { swaggerConfigSchema } from './swagger.config';

export const validationSchema = Joi.object({
  ...appConfigSchema,
  ...swaggerConfigSchema,
  ...httpConfigSchema,
  ...databaseConfigSchema
});
