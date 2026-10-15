import type { APIGatewayProxyHandler } from 'aws-lambda';
import { withAuth } from '../lib/auth.js';
import { success, internalError } from '../lib/response.js';

/**
 * GET /me
 *
 * Trả về thông tin user đã xác thực.
 * Endpoint này dùng Cognito authorizer (API Gateway) hoặc mock headers (local).
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const protectedHandler = withAuth(async (_event, user) => {
      return success({
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
      });
    });

    return protectedHandler(event);
  } catch (err) {
    return internalError(err);
  }
};
