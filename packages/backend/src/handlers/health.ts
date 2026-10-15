import type { APIGatewayProxyHandler } from 'aws-lambda';
import type { HealthCheckResponse } from '@cv-coach/shared';
import { success, internalError } from '../lib/response.js';

/**
 * GET /health
 *
 * Health check endpoint — xác nhận API đang hoạt động.
 */
export const handler: APIGatewayProxyHandler = async () => {
  try {
    const data: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? '0.1.0',
    };

    return success(data);
  } catch (err) {
    return internalError(err);
  }
};
