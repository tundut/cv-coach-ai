import type { APIGatewayProxyHandler } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { createJobAnalysisSchema, AnalysisStatus } from '@cv-coach/shared';
import type { JobAnalysis } from '@cv-coach/shared';
import { withAuth } from '../lib/auth.js';
import { success, error, internalError } from '../lib/response.js';
import { JobAnalysisRepository } from '../repositories/job-analysis-repository.js';
import { ResumeRepository } from '../repositories/resume-repository.js';
import { GeneratedDocumentRepository } from '../repositories/generated-document-repository.js';
import { getAiService } from '../services/ai/factory.js';

const jobAnalysisRepo = new JobAnalysisRepository();
const resumeRepo = new ResumeRepository();
const docRepo = new GeneratedDocumentRepository();

/**
 * Router cho /job-analyses.
 *
 * - POST   /job-analyses          → so sánh CV với JD (gọi AI)
 * - GET    /job-analyses          → danh sách
 * - GET    /job-analyses/:id      → chi tiết
 * - DELETE /job-analyses/:id      → xóa
 */
export const handler: APIGatewayProxyHandler = withAuth(async (event, user) => {
  try {
    const method = event.httpMethod;
    const analysisId = event.pathParameters?.analysisId;

    if (method === 'POST' && !analysisId) {
      return handleCreate(event, user.userId);
    }
    if (method === 'GET' && analysisId) {
      return handleGet(user.userId, analysisId);
    }
    if (method === 'GET') {
      return handleList(user.userId);
    }
    if (method === 'DELETE' && analysisId) {
      return handleDelete(user.userId, analysisId);
    }

    return error(404, 'NOT_FOUND', 'Route not found');
  } catch (err) {
    return internalError(err);
  }
});

async function handleCreate(event: Parameters<typeof handler>[0], userId: string) {
  if (!event.body) {
    return error(400, 'VALIDATION_ERROR', 'Request body is required');
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body);
  } catch {
    return error(400, 'VALIDATION_ERROR', 'Invalid JSON');
  }

  const parsed = createJobAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return error(400, 'VALIDATION_ERROR', messages.join('; '));
  }

  const input = parsed.data;

  // Lấy CV đã phân tích
  const resume = await resumeRepo.get(userId, input.resumeId);
  if (!resume) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy CV');
  }
  if (resume.analysisStatus !== AnalysisStatus.COMPLETED || !resume.structuredProfile) {
    return error(
      400,
      'RESUME_NOT_ANALYZED',
      'CV chưa được phân tích. Vui lòng phân tích CV trước.',
    );
  }

  // Gọi AI so sánh CV với JD (output đã validate Zod trong provider)
  const ai = await getAiService();
  const match = await ai.analyzeJobMatch(
    resume.structuredProfile,
    input.jobDescription,
    input.jobTitle,
  );

  const now = new Date().toISOString();
  const analysis: JobAnalysis = {
    id: randomUUID(),
    userId,
    resumeId: input.resumeId,
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    jobDescription: input.jobDescription,
    location: input.location,
    workMode: input.workMode,
    fitLevel: match.fitLevel as JobAnalysis['fitLevel'],
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
    insufficientEvidenceSkills: match.insufficientEvidenceSkills,
    relevantExperience: match.relevantExperience,
    keywordsToAdd: match.keywordsToAdd,
    strengths: match.strengths,
    weaknesses: match.weaknesses,
    suggestions: match.suggestions,
    createdAt: now,
  };

  await jobAnalysisRepo.create(analysis);
  return success(analysis, 201);
}

async function handleList(userId: string) {
  const analyses = await jobAnalysisRepo.listByUser(userId);
  return success(analyses);
}

async function handleGet(userId: string, analysisId: string) {
  const analysis = await jobAnalysisRepo.get(userId, analysisId);
  if (!analysis) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy kết quả phân tích');
  }
  return success(analysis);
}

async function handleDelete(userId: string, analysisId: string) {
  const analysis = await jobAnalysisRepo.get(userId, analysisId);
  if (!analysis) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy kết quả phân tích');
  }
  // Cascade: xóa luôn các cover letter / tài liệu gắn với JD này
  await docRepo.deleteByJobAnalysis(userId, analysisId);
  await jobAnalysisRepo.delete(userId, analysisId);
  return success({ message: 'Đã xóa kết quả phân tích' });
}
