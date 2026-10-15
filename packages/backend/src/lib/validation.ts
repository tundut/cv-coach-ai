import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { ZodSchema, ZodError } from 'zod';
import { error } from './response.js';

/**
 * Parse và validate request body bằng Zod schema.
 *
 * Trả về data nếu hợp lệ, hoặc APIGatewayProxyResult (400) nếu không.
 */
export function parseBody<T>(
  event: APIGatewayProxyEvent,
  schema: ZodSchema<T>,
): { data: T; error?: never } | { data?: never; error: APIGatewayProxyResult } {
  if (!event.body) {
    return { error: error(400, 'VALIDATION_ERROR', 'Request body is required') };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return { error: error(400, 'VALIDATION_ERROR', 'Invalid JSON in request body') };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const zodError = result.error as ZodError;
    const messages = zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return {
      error: error(400, 'VALIDATION_ERROR', messages.join('; '), zodError.errors),
    };
  }

  return { data: result.data };
}
