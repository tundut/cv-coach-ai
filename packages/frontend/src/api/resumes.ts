import type { Resume, UploadUrlResponse, UploadUrlRequest } from '@cv-coach/shared';
import { apiClient } from './client.js';

export class ResumeApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ResumeApiError';
    this.code = code;
  }
}

function unwrap<T>(res: { success: boolean; data?: T; error?: { message: string; code: string } }): T {
  if (!res.success || res.data === undefined) {
    throw new ResumeApiError(
      res.error?.message ?? 'Request failed',
      res.error?.code ?? 'UNKNOWN',
    );
  }
  return res.data;
}

export const resumeApi = {
  async list(): Promise<Resume[]> {
    return unwrap(await apiClient.get<Resume[]>('/resumes'));
  },

  async get(resumeId: string): Promise<Resume> {
    return unwrap(await apiClient.get<Resume>(`/resumes/${resumeId}`));
  },

  async getUploadUrl(req: UploadUrlRequest): Promise<UploadUrlResponse> {
    return unwrap(await apiClient.post<UploadUrlResponse>('/resumes/upload-url', req));
  },

  async delete(resumeId: string): Promise<void> {
    unwrap(await apiClient.delete<{ message: string }>(`/resumes/${resumeId}`));
  },

  async setDefault(resumeId: string): Promise<void> {
    unwrap(await apiClient.post<{ message: string }>(`/resumes/${resumeId}/default`));
  },

  async analyze(resumeId: string): Promise<void> {
    unwrap(await apiClient.post<{ message: string }>(`/resumes/${resumeId}/analyze`));
  },

  /**
   * Upload file trực tiếp lên S3 bằng presigned URL (PUT).
   * Không đi qua backend — gửi thẳng tới S3.
   */
  async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!response.ok) {
      throw new ResumeApiError('Tải file lên S3 thất bại', 'S3_UPLOAD_FAILED');
    }
  },
};
