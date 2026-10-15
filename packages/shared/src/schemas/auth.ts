import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .regex(/[a-z]/, 'Cần ít nhất 1 chữ thường')
    .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Cần ít nhất 1 chữ số'),
  fullName: z.string().min(1, 'Vui lòng nhập họ tên'),
});

export const confirmSignUpSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1, 'Vui lòng nhập mã xác nhận'),
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export const confirmForgotPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1, 'Vui lòng nhập mã xác nhận'),
  newPassword: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .regex(/[a-z]/, 'Cần ít nhất 1 chữ thường')
    .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Cần ít nhất 1 chữ số'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ConfirmSignUpInput = z.infer<typeof confirmSignUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ConfirmForgotPasswordInput = z.infer<typeof confirmForgotPasswordSchema>;

/**
 * Các action của endpoint POST /auth.
 */
export type AuthAction =
  | 'register'
  | 'confirmSignUp'
  | 'login'
  | 'forgotPassword'
  | 'confirmForgotPassword'
  | 'resendCode';

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}
