import type { JobAnalysis, CreateJobAnalysisRequest } from '@cv-coach/shared';
import { apiClient } from './client.js';

export class JobAnalysisApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'JobAnalysisApiError';
    this.code = code;
  }
}

function unwrap<T>(res: { success: boolean; data?: T; error?: { message: string; code: string } }): T {
  if (!res.success || res.data === undefined) {
    throw new JobAnalysisApiError(
      res.error?.message ?? 'Request failed',
      res.error?.code ?? 'UNKNOWN',
    );
  }
  return res.data;
}

export const jobAnalysisApi = {
  async list(): Promise<JobAnalysis[]> {
    return unwrap(await apiClient.get<JobAnalysis[]>('/job-analyses'));
  },
  async get(id: string): Promise<JobAnalysis> {
    return unwrap(await apiClient.get<JobAnalysis>(`/job-analyses/${id}`));
  },
  async create(req: CreateJobAnalysisRequest): Promise<JobAnalysis> {
    return unwrap(await apiClient.post<JobAnalysis>('/job-analyses', req));
  },
  async delete(id: string): Promise<void> {
    unwrap(await apiClient.delete<{ message: string }>(`/job-analyses/${id}`));
  },
};
