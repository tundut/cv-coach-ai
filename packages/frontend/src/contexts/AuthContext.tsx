import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { AuthTokens } from '@cv-coach/shared';
import { authApi, AuthError } from '../api/auth.js';
import { tokenStorage } from '../lib/token-storage.js';
import { decodeIdToken, isTokenExpired } from '../lib/jwt.js';

// ─── Types ──────────────────────────────────────────

export interface AuthUser {
  userId: string;
  email: string;
  fullName?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  register: (email: string, password: string, fullName: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

// ─── Context ────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khôi phục session từ token đã lưu
  useEffect(() => {
    const idToken = tokenStorage.getIdToken();
    if (idToken) {
      const claims = decodeIdToken(idToken);
      if (claims && !isTokenExpired(claims)) {
        setUser({
          userId: claims.sub,
          email: claims.email,
          fullName: claims.name,
        });
      } else {
        // Token hết hạn → xóa
        tokenStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const handleTokens = useCallback((tokens: AuthTokens) => {
    tokenStorage.save(tokens);
    const claims = decodeIdToken(tokens.idToken);
    if (claims) {
      setUser({
        userId: claims.sub,
        email: claims.email,
        fullName: claims.name,
      });
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    await authApi.register(email, password, fullName);
  }, []);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    await authApi.confirmSignUp(email, code);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    handleTokens(tokens);
  }, [handleTokens]);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await authApi.forgotPassword(email);
  }, []);

  const confirmForgotPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await authApi.confirmForgotPassword(email, code, newPassword);
    },
    [],
  );

  const resendCode = useCallback(async (email: string) => {
    await authApi.resendCode(email);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      register,
      confirmSignUp,
      login,
      logout,
      forgotPassword,
      confirmForgotPassword,
      resendCode,
    }),
    [user, isLoading, register, confirmSignUp, login, logout, forgotPassword, confirmForgotPassword, resendCode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthError };
