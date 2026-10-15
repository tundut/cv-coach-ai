import type { AuthTokens } from '@cv-coach/shared';

const KEYS = {
  ACCESS_TOKEN: 'cv-coach:accessToken',
  ID_TOKEN: 'cv-coach:idToken',
  REFRESH_TOKEN: 'cv-coach:refreshToken',
} as const;

/**
 * Quản lý lưu trữ auth tokens trong localStorage.
 */
export const tokenStorage = {
  save(tokens: AuthTokens): void {
    localStorage.setItem(KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(KEYS.ID_TOKEN, tokens.idToken);
    localStorage.setItem(KEYS.REFRESH_TOKEN, tokens.refreshToken);
  },

  getIdToken(): string | null {
    return localStorage.getItem(KEYS.ID_TOKEN);
  },

  getAccessToken(): string | null {
    return localStorage.getItem(KEYS.ACCESS_TOKEN);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(KEYS.REFRESH_TOKEN);
  },

  hasTokens(): boolean {
    return !!localStorage.getItem(KEYS.ID_TOKEN);
  },

  clear(): void {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.ID_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
  },
};
