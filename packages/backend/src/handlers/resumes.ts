import type { APIGatewayProxyHandler } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { uploadUrlSchema, AnalysisStatus } from '@cv-coach/shared';
import type { Resume, UploadUrlResponse } from '@cv-coach/shared';
import { withAuth, assertOwnership } from '../lib/auth.js';
import { success, error, internalError } from '../lib/response.js';
import { ResumeRepository } from '../repositories/resume-repository.js';
import { S3Service } from '../services/s3.js';
import { SqsService } from '../services/sqs.js';

const resumeRepo = new ResumeRepository();
const s3 = new S3Service();
const sqs = new SqsService();

/**
 * Router cho /resumes và /resumes/:resumeId.
 *
 * - POST /resumes/upload-url     → tạo presigned URL + metadata PENDING
 * - GET  /resumes                → danh sách CV của user
 * - GET  /resumes/:resumeId      → chi tiết 1 CV
 * - DELETE /resumes/:resumeId    → xóa CV (S3 + metadata)
 * - POST /resumes/:resumeId/default → đặt CV mặc định
 */
export const handler: APIGatewayProxyHandler = withAuth(async (event, user) => {
  try {
    const method = event.httpMethod;
    const resumeId = event.pathParameters?.resumeId;
    const path = event.path;

    // POST /resumes/upload-url
    if (method === 'POST' && path.endsWith('/upload-url')) {
      return handleUploadUrl(event, user.userId);
    }

    // POST /resumes/:resumeId/default
    if (method === 'POST' && resumeId && path.endsWith('/default')) {
      return handleSetDefault(user.userId, resumeId);
    }

    // POST /resumes/:resumeId/analyze
    if (method === 'POST' && resumeId && path.endsWith('/analyze')) {
      return handleAnalyze(user.userId, resumeId);
    }

    // GET /resumes/:resumeId
    if (method === 'GET' && resumeId) {
      return handleGet(user.userId, resumeId);
    }

    // GET /resumes
    if (method === 'GET') {
      return handleList(user.userId);
    }

    // DELETE /resumes/:resumeId
    if (method === 'DELETE' && resumeId) {
      return handleDelete(user.userId, resumeId);
    }

    return error(404, 'NOT_FOUND', 'Route not found');
  } catch (err) {
    return internalError(err);
  }
});

async function handleUploadUrl(
  event: Parameters<typeof handler>[0],
  userId: string,
) {
  if (!event.body) {
    return error(400, 'VALIDATION_ERROR', 'Request body is required');
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body);
  } catch {
    return error(400, 'VALIDATION_ERROR', 'Invalid JSON');
  }

  const parsed = uploadUrlSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return error(400, 'VALIDATION_ERROR', messages.join('; '));
  }

  const { fileName, mimeType, fileSize } = parsed.data;
  const resumeId = randomUUID();
  const fileKey = `${userId}/${resumeId}/${fileName}`;
  const now = new Date().toISOString();

  // Tạo presigned URL
  const uploadUrl = await s3.getUploadUrl(fileKey, mimeType);

  // Lưu metadata với trạng thái PENDING
  const resume: Resume = {
    id: resumeId,
    userId,
    fileName,
    fileKey,
    fileSize,
    mimeType,
    analysisStatus: AnalysisStatus.PENDING,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
  await resumeRepo.create(resume);

  const response: UploadUrlResponse = { uploadUrl, fileKey, resumeId };
  return success(response, 201);
}

async function handleList(userId: string) {
  const resumes = await resumeRepo.listByUser(userId);
  return success(resumes);
}

async function handleGet(userId: string, resumeId: string) {
  const resume = await resumeRepo.get(userId, resumeId);
  if (!resume) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy CV');
  }
  // Ownership đã đảm bảo qua key USER#userId, nhưng kiểm tra thêm cho rõ ràng
  const ownership = assertOwnership(userId, resume.userId);
  if (ownership) return ownership;

  return success(resume);
}

async function handleDelete(userId: string, resumeId: string) {
  const resume = await resumeRepo.get(userId, resumeId);
  if (!resume) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy CV');
  }

  // Xóa file trên S3 trước, rồi metadata
  await s3.deleteObject(resume.fileKey);
  await resumeRepo.delete(userId, resumeId);

  return success({ message: 'Đã xóa CV' });
}

async function handleSetDefault(userId: string, resumeId: string) {
  const resume = await resumeRepo.get(userId, resumeId);
  if (!resume) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy CV');
  }
  await resumeRepo.setDefault(userId, resumeId);
  return success({ message: 'Đã đặt làm CV mặc định' });
}

async function handleAnalyze(userId: string, resumeId: string) {
  const resume = await resumeRepo.get(userId, resumeId);
  if (!resume) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy CV');
  }

  // Reset về PENDING và đẩy vào queue
  await resumeRepo.updateStatus(userId, resumeId, AnalysisStatus.PENDING);
  await sqs.enqueueAnalysis({
    resumeId,
    userId,
    fileKey: resume.fileKey,
  });

  return success({ message: 'Đã bắt đầu phân tích CV', resumeId });
}
