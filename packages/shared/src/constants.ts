/**
 * Giới hạn upload CV.
 */
export const RESUME_LIMITS = {
  /** Kích thước tối đa: 5MB */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  /** Định dạng cho phép */
  ALLOWED_MIME_TYPES: ['application/pdf'] as const,
  /** Thời hạn presigned URL (giây) */
  UPLOAD_URL_EXPIRY: 300,
} as const;

/**
 * Giới hạn Job Description.
 */
export const JOB_DESCRIPTION_LIMITS = {
  /** Độ dài tối thiểu (ký tự) */
  MIN_LENGTH: 50,
  /** Độ dài tối đa (ký tự) */
  MAX_LENGTH: 10_000,
} as const;

/**
 * Giới hạn chat.
 */
export const CHAT_LIMITS = {
  /** Số tin nhắn tối đa mỗi session */
  MAX_MESSAGES_PER_SESSION: 50,
  /** Độ dài tối đa mỗi tin nhắn (ký tự) */
  MAX_MESSAGE_LENGTH: 2000,
} as const;

/**
 * Phiên bản API.
 */
export const API_VERSION = 'v1';
