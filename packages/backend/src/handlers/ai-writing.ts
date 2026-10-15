import type { APIGatewayProxyHandler } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import {
  rewriteRequestSchema,
  coverLetterRequestSchema,
  AnalysisStatus,
  GeneratedDocumentType,
} from '@cv-coach/shared';
import type { GeneratedDocument } from '@cv-coach/shared';
import { withAuth } from '../lib/auth.js';
import { success, error, internalError } from '../lib/response.js';
import { ResumeRepository } from '../repositories/resume-repository.js';
import { JobAnalysisRepository } from '../repositories/job-analysis-repository.js';
import { GeneratedDocumentRepository } from '../repositories/generated-document-repository.js';
import { getAiService } from '../services/ai/factory.js';

const resumeRepo = new ResumeRepository();
const jobAnalysisRepo = new JobAnalysisRepository();
const docRepo = new GeneratedDocumentRepository();

/**
 * Router cho /ai.
 *
 * - POST /ai/rewrite       → viết lại nội dung CV
 * - POST /ai/cover-letter  → tạo cover letter
 */
export const handler: APIGatewayProxyHandler = withAuth(async (event, user) => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    // GET /ai/documents?jobAnalysisId=... → danh sách tài liệu đã tạo
    if (method === 'GET' && path.endsWith('/documents')) {
      return handleListDocuments(event, user.userId);
    }

    if (method === 'POST' && path.endsWith('/rewrite')) {
      return handleRewrite(event, user.userId);
    }
    if (method === 'POST' && path.endsWith('/cover-letter')) {
      return handleCoverLetter(event, user.userId);
    }
    return error(404, 'NOT_FOUND', 'Route not found');
  } catch (err) {
    return internalError(err);
  }
});

async function handleListDocuments(event: Parameters<typeof handler>[0], userId: string) {
  const docs = await docRepo.listByUser(userId);
  // Lọc theo jobAnalysisId nếu có query param
  const jobAnalysisId = event.queryStringParameters?.jobAnalysisId;
  const filtered = jobAnalysisId
    ? docs.filter((d) => d.sourceJobAnalysisId === jobAnalysisId)
    : docs;
  return success(filtered);
}

function parseJson(body: string | null): unknown | null {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function handleRewrite(event: Parameters<typeof handler>[0], userId: string) {
  const body = parseJson(event.body);
  const parsed = rewriteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error(400, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join('; '));
  }
  const input = parsed.data;

  // Xác thực ownership CV
  const resume = await resumeRepo.get(userId, input.resumeId);
  if (!resume) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy CV');
  }

  // Lấy JD context nếu có
  let jobDescription: string | undefined;
  if (input.jobAnalysisId) {
    const ja = await jobAnalysisRepo.get(userId, input.jobAnalysisId);
    jobDescription = ja?.jobDescription;
  }

  const ai = await getAiService();
  const result = await ai.rewriteContent(input.content, input.style, { jobDescription });

  // Lưu lại document
  const now = new Date().toISOString();
  const doc: GeneratedDocument = {
    id: randomUUID(),
    userId,
    type: GeneratedDocumentType.REWRITTEN_EXPERIENCE,
    content: result.rewrittenContent,
    sourceResumeId: input.resumeId,
    sourceJobAnalysisId: input.jobAnalysisId,
    createdAt: now,
    updatedAt: now,
  };
  await docRepo.create(doc);

  return success({ ...result, documentId: doc.id });
}

async function handleCoverLetter(event: Parameters<typeof handler>[0], userId: string) {
  const body = parseJson(event.body);
  const parsed = coverLetterRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error(400, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join('; '));
  }
  const input = parsed.data;

  const resume = await resumeRepo.get(userId, input.resumeId);
  if (!resume) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy CV');
  }
  if (resume.analysisStatus !== AnalysisStatus.COMPLETED || !resume.structuredProfile) {
    return error(400, 'RESUME_NOT_ANALYZED', 'CV chưa được phân tích');
  }

  let jobDescription: string | undefined;
  if (input.jobAnalysisId) {
    const ja = await jobAnalysisRepo.get(userId, input.jobAnalysisId);
    jobDescription = ja?.jobDescription;
  }

  const ai = await getAiService();
  const result = await ai.generateCoverLetter(
    resume.structuredProfile,
    input.jobTitle,
    input.companyName,
    jobDescription,
    input.tone,
  );

  const now = new Date().toISOString();
  const doc: GeneratedDocument = {
    id: randomUUID(),
    userId,
    type: GeneratedDocumentType.COVER_LETTER,
    content: result.coverLetter,
    sourceResumeId: input.resumeId,
    sourceJobAnalysisId: input.jobAnalysisId,
    createdAt: now,
    updatedAt: now,
  };
  await docRepo.create(doc);

  return success({ ...result, documentId: doc.id });
}
