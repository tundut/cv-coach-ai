import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { error } from './response.js';

/**
 * Thông tin user đã xác thực, trích xuất từ Cognito claims.
 */
export interface AuthUser {
  userId: string;
  email: string;
  fullName?: string;
}

/**
 * Trích xuất thông tin user từ API Gateway event.
 *
 * Khi deploy: claims nằm trong requestContext.authorizer.claims (Cognito authorizer).
 * Khi local: claims nằm trong header X-User-Id / X-User-Email (mock).
 */
export function extractUser(event: APIGatewayProxyEvent): AuthUser | null {
  // API Gateway Cognito authorizer đặt claims vào requestContext
  const claims = event.requestContext?.authorizer?.claims;
  if (claims) {
    const userId = claims['sub'] as string | undefined;
    const email = claims['email'] as string | undefined;
    const fullName = claims['name'] as string | undefined;
    if (userId && email) {
      return { userId, email, fullName };
    }
  }

  // Fallback cho local dev server: đọc từ mock headers
  const mockUserId = event.headers['x-user-id'];
  const mockEmail = event.headers['x-user-email'];
  if (mockUserId && mockEmail) {
    return {
      userId: mockUserId,
      email: mockEmail,
      fullName: event.headers['x-user-name'],
    };
  }

  return null;
}

/**
 * Trích xuất userId, trả 401 nếu không có.
 */
export function getUserId(event: APIGatewayProxyEvent): string | null {
  const user = extractUser(event);
  return user?.userId ?? null;
}

/**
 * Wrapper cho handler yêu cầu xác thực.
 *
 * Tự động kiểm tra user, trả 401 nếu không xác thực.
 * Handler nhận thêm `user` trong tham số.
 */
export function withAuth(
  handler: (
    event: APIGatewayProxyEvent,
    user: AuthUser,
  ) => Promise<APIGatewayProxyResult>,
): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
  return async (event: APIGatewayProxyEvent) => {
    const user = extractUser(event);
    if (!user) {
      return error(401, 'UNAUTHORIZED', 'Authentication required');
    }
    return handler(event, user);
  };
}

/**
 * Kiểm tra user sở hữu resource.
 * Trả 403 nếu resourceOwnerId khác userId.
 */
export function assertOwnership(
  userId: string,
  resourceOwnerId: string,
): APIGatewayProxyResult | null {
  if (userId !== resourceOwnerId) {
    return error(403, 'FORBIDDEN', 'You do not have access to this resource');
  }
  return null;
}
