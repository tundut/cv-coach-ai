import type { APIGatewayProxyHandler } from 'aws-lambda';
import {
  registerSchema,
  confirmSignUpSchema,
  loginSchema,
  forgotPasswordSchema,
  confirmForgotPasswordSchema,
} from '@cv-coach/shared';
import type { AuthAction } from '@cv-coach/shared';
import { CognitoService } from '../services/cognito.js';
import { success, error, internalError } from '../lib/response.js';

let cognitoInstance: CognitoService | null = null;

/**
 * Lazy init — đọc env khi gọi lần đầu (quan trọng cho local dev
 * khi .env được load sau khi module import).
 */
function getCognito(): CognitoService {
  if (!cognitoInstance) {
    cognitoInstance = new CognitoService(
      process.env.AWS_REGION ?? 'ap-southeast-1',
      process.env.COGNITO_CLIENT_ID ?? '',
    );
  }
  return cognitoInstance;
}

/**
 * POST /auth
 *
 * Endpoint duy nhất cho tất cả auth actions.
 * Body phải chứa { action: AuthAction, ...params }
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return error(400, 'VALIDATION_ERROR', 'Request body is required');
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body);
    } catch {
      return error(400, 'VALIDATION_ERROR', 'Invalid JSON');
    }

    const action = body.action as AuthAction | undefined;
    if (!action) {
      return error(400, 'VALIDATION_ERROR', 'Missing action field');
    }

    switch (action) {
      case 'register': {
        const result = registerSchema.safeParse(body);
        if (!result.success) {
          const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
          return error(400, 'VALIDATION_ERROR', messages.join('; '));
        }
        await getCognito().register(result.data.email, result.data.password, result.data.fullName);
        return success({ message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác nhận.' }, 201);
      }

      case 'confirmSignUp': {
        const result = confirmSignUpSchema.safeParse(body);
        if (!result.success) {
          return error(400, 'VALIDATION_ERROR', result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '));
        }
        await getCognito().confirmSignUp(result.data.email, result.data.code);
        return success({ message: 'Xác nhận email thành công. Bạn có thể đăng nhập.' });
      }

      case 'login': {
        const result = loginSchema.safeParse(body);
        if (!result.success) {
          return error(400, 'VALIDATION_ERROR', result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '));
        }
        const tokens = await getCognito().login(result.data.email, result.data.password);
        return success(tokens);
      }

      case 'forgotPassword': {
        const result = forgotPasswordSchema.safeParse(body);
        if (!result.success) {
          return error(400, 'VALIDATION_ERROR', result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '));
        }
        await getCognito().forgotPassword(result.data.email);
        return success({ message: 'Mã xác nhận đã được gửi đến email.' });
      }

      case 'confirmForgotPassword': {
        const result = confirmForgotPasswordSchema.safeParse(body);
        if (!result.success) {
          return error(400, 'VALIDATION_ERROR', result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '));
        }
        await getCognito().confirmForgotPassword(result.data.email, result.data.code, result.data.newPassword);
        return success({ message: 'Đặt lại mật khẩu thành công.' });
      }

      case 'resendCode': {
        const result = forgotPasswordSchema.safeParse(body); // cùng schema: chỉ cần email
        if (!result.success) {
          return error(400, 'VALIDATION_ERROR', result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '));
        }
        await getCognito().resendCode(result.data.email);
        return success({ message: 'Mã xác nhận đã được gửi lại.' });
      }

      default:
        return error(400, 'VALIDATION_ERROR', `Unknown action: ${action as string}`);
    }
  } catch (err) {
    // Map Cognito errors sang user-friendly messages
    const cognitoError = err as { name?: string; message?: string };

    switch (cognitoError.name) {
      case 'UsernameExistsException':
        return error(409, 'USER_EXISTS', 'Email đã được đăng ký');
      case 'UserNotConfirmedException':
        return error(403, 'USER_NOT_CONFIRMED', 'Tài khoản chưa xác nhận. Vui lòng kiểm tra email.');
      case 'NotAuthorizedException':
        return error(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
      case 'UserNotFoundException':
        return error(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản');
      case 'CodeMismatchException':
        return error(400, 'INVALID_CODE', 'Mã xác nhận không đúng');
      case 'ExpiredCodeException':
        return error(400, 'EXPIRED_CODE', 'Mã xác nhận đã hết hạn');
      case 'InvalidPasswordException':
        return error(400, 'INVALID_PASSWORD', cognitoError.message ?? 'Mật khẩu không đạt yêu cầu');
      case 'LimitExceededException':
        return error(429, 'RATE_LIMITED', 'Quá nhiều yêu cầu. Vui lòng thử lại sau.');
      default:
        return internalError(err);
    }
  }
};
