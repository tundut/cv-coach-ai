/**
 * Cấu hình runtime cho frontend, đọc từ biến môi trường Vite.
 */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '',
    region: import.meta.env.VITE_AWS_REGION ?? 'ap-southeast-1',
  },
} as const;
