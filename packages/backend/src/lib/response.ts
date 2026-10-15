import type { APIGatewayProxyResult } from 'aws-lambda';
import type { ApiResponse, ApiError } from '@cv-coach/shared';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * Tạo API Gateway response thành công.
 */
export function success<T>(data: T, statusCode = 200): APIGatewayProxyResult {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Tạo API Gateway error response.
 */
export function error(
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): APIGatewayProxyResult {
  const body: ApiResponse = {
    success: false,
    error: { code, message, details } satisfies ApiError,
  };
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Xử lý exception và trả về 500 response.
 */
export function internalError(err: unknown): APIGatewayProxyResult {
  console.error('Internal error:', err);
  return error(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
