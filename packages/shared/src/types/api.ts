import { RewriteStyle } from './enums.js';

// ─── Common ─────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ─── Resume API ─────────────────────────────────────

export interface UploadUrlRequest {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  resumeId: string;
}

// ─── Job Analysis API ───────────────────────────────

export interface CreateJobAnalysisRequest {
  resumeId: string;
  jobTitle: string;
  companyName?: string;
  jobDescription: string;
  location?: string;
  workMode?: string;
}

// ─── AI Writing API ─────────────────────────────────

export interface RewriteRequest {
  resumeId: string;
  content: string;
  style: RewriteStyle;
  jobAnalysisId?: string;
}

export interface CoverLetterRequest {
  resumeId: string;
  jobAnalysisId?: string;
  companyName: string;
  jobTitle: string;
  tone?: string;
}

// ─── Chat API ───────────────────────────────────────

export interface CreateChatSessionRequest {
  resumeId?: string;
  jobAnalysisId?: string;
}

export interface SendMessageRequest {
  content: string;
}

// ─── Health Check ───────────────────────────────────

export interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
  version: string;
}

// ─── Async Processing ───────────────────────────────

/**
 * Message gửi vào SQS để phân tích CV bất đồng bộ.
 */
export interface AnalyzeResumeMessage {
  resumeId: string;
  userId: string;
  fileKey: string;
}
