import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from '../utils/zod.js';
export const registry = new OpenAPIRegistry();
registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'access_token',
});
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});
export const successSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  message: z.string(),
  meta: z.unknown().optional(),
});
export const errorSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
  requestId: z.string(),
});
export const openapiDocument = () =>
  new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'MediMatrix API',
      version: '0.1.0',
      description:
        'Cookie authentication; mutations require X-Requested-With: fetch. All dates use ISO 8601.',
    },
    servers: [{ url: '/api/v1' }],
  });
