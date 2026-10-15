import type { AuthAction, AuthTokens } from '@cv-coach/shared';
import { apiClient } from './client.js';

/**
 * Gọi POST /auth với action tương ứng.
 */
async function authRequest<T = unknown>(
  action: AuthAction,
  params: Record<string, string>,
): Promise<T> {
  const response = await apiClient.post<T>('/auth', { action, ...params });
  if (!response.success) {
    throw new AuthError(
      response.error?.message ?? 'Authentication error',
      response.error?.code ?? 'UNKNOWN',
    );
  }
  return response.data as T;
}

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export const authApi = {
  async register(email: string, password: string, fullName: string) {
    return authRequest<{ message: string }>('register', { email, password, fullName });
  },

  async confirmSignUp(email: string, code: string) {
    return authRequest<{ message: string }>('confirmSignUp', { email, code });
  },

  async login(email: string, password: string) {
    return authRequest<AuthTokens>('login', { email, password });
  },

  async forgotPassword(email: string) {
    return authRequest<{ message: string }>('forgotPassword', { email });
  },

  async confirmForgotPassword(email: string, code: string, newPassword: string) {
    return authRequest<{ message: string }>('confirmForgotPassword', {
      email,
      code,
      newPassword,
    });
  },

  async resendCode(email: string) {
    return authRequest<{ message: string }>('resendCode', { email });
  },
};
