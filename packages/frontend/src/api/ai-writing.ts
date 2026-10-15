import type {
  RewriteRequest,
  CoverLetterRequest,
  RewriteOutput,
  CoverLetterOutput,
  GeneratedDocument,
} from '@cv-coach/shared';
import { apiClient } from './client.js';

export class AiWritingApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AiWritingApiError';
    this.code = code;
  }
}

function unwrap<T>(res: { success: boolean; data?: T; error?: { message: string; code: string } }): T {
  if (!res.success || res.data === undefined) {
    throw new AiWritingApiError(
      res.error?.message ?? 'Request failed',
      res.error?.code ?? 'UNKNOWN',
    );
  }
  return res.data;
}

type RewriteResult = RewriteOutput & { documentId: string };
type CoverLetterResult = CoverLetterOutput & { documentId: string };

export const aiWritingApi = {
  async rewrite(req: RewriteRequest): Promise<RewriteResult> {
    return unwrap(await apiClient.post<RewriteResult>('/ai/rewrite', req));
  },
  async coverLetter(req: CoverLetterRequest): Promise<CoverLetterResult> {
    return unwrap(await apiClient.post<CoverLetterResult>('/ai/cover-letter', req));
  },
  async listDocuments(jobAnalysisId?: string): Promise<GeneratedDocument[]> {
    const q = jobAnalysisId ? `?jobAnalysisId=${jobAnalysisId}` : '';
    return unwrap(await apiClient.get<GeneratedDocument[]>(`/ai/documents${q}`));
  },
};
