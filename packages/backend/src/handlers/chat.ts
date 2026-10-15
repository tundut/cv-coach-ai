import type { APIGatewayProxyHandler } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import {
  createChatSessionSchema,
  sendMessageSchema,
  ChatRole,
  CHAT_LIMITS,
  AnalysisStatus,
} from '@cv-coach/shared';
import type { ChatSession, ChatMessage } from '@cv-coach/shared';
import { withAuth } from '../lib/auth.js';
import { success, error, internalError } from '../lib/response.js';
import { ChatRepository } from '../repositories/chat-repository.js';
import { ResumeRepository } from '../repositories/resume-repository.js';
import { JobAnalysisRepository } from '../repositories/job-analysis-repository.js';
import { getAiService } from '../services/ai/factory.js';

const chatRepo = new ChatRepository();
const resumeRepo = new ResumeRepository();
const jobAnalysisRepo = new JobAnalysisRepository();

/**
 * Router cho /chat.
 *
 * - POST /chat/sessions                   → tạo session
 * - GET  /chat/sessions                   → danh sách session
 * - GET  /chat/sessions/:id/messages      → tin nhắn trong session
 * - POST /chat/sessions/:id/messages      → gửi tin nhắn + nhận trả lời AI
 */
export const handler: APIGatewayProxyHandler = withAuth(async (event, user) => {
  try {
    const method = event.httpMethod;
    const sessionId = event.pathParameters?.sessionId;
    const path = event.path;

    if (method === 'POST' && path.endsWith('/sessions')) {
      return handleCreateSession(event, user.userId);
    }
    if (method === 'GET' && path.endsWith('/sessions')) {
      return handleListSessions(user.userId);
    }
    if (method === 'GET' && sessionId && path.endsWith('/messages')) {
      return handleListMessages(user.userId, sessionId);
    }
    if (method === 'POST' && sessionId && path.endsWith('/messages')) {
      return handleSendMessage(event, user.userId, sessionId);
    }
    if (method === 'DELETE' && sessionId) {
      return handleDeleteSession(user.userId, sessionId);
    }
    return error(404, 'NOT_FOUND', 'Route not found');
  } catch (err) {
    return internalError(err);
  }
});

function parseJson(body: string | null): unknown | null {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function handleCreateSession(event: Parameters<typeof handler>[0], userId: string) {
  const parsed = createChatSessionSchema.safeParse(parseJson(event.body) ?? {});
  if (!parsed.success) {
    return error(400, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join('; '));
  }

  // Nếu không chỉ định CV, tự chọn CV mặc định hoặc CV đã phân tích gần nhất
  // để Career Assistant luôn có ngữ cảnh về hồ sơ của người dùng.
  let resumeId = parsed.data.resumeId;
  if (!resumeId) {
    const resumes = await resumeRepo.listByUser(userId);
    const analyzed = resumes.filter(
      (r) => r.analysisStatus === AnalysisStatus.COMPLETED && r.structuredProfile,
    );
    const chosen = analyzed.find((r) => r.isDefault) ?? analyzed[0];
    resumeId = chosen?.id;
  }

  const now = new Date().toISOString();
  const session: ChatSession = {
    id: randomUUID(),
    userId,
    resumeId,
    jobAnalysisId: parsed.data.jobAnalysisId,
    createdAt: now,
    updatedAt: now,
  };
  await chatRepo.createSession(session);
  return success(session, 201);
}

async function handleListSessions(userId: string) {
  const sessions = await chatRepo.listSessions(userId);
  // Chỉ hiển thị session đã có hội thoại (có title) — bỏ session rỗng
  return success(sessions.filter((s) => s.title));
}

async function handleListMessages(userId: string, sessionId: string) {
  const session = await chatRepo.getSession(userId, sessionId);
  if (!session) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy phiên chat');
  }
  return success(await chatRepo.listMessages(sessionId));
}

async function handleDeleteSession(userId: string, sessionId: string) {
  const session = await chatRepo.getSession(userId, sessionId);
  if (!session) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy phiên chat');
  }
  await chatRepo.deleteSession(userId, sessionId);
  return success({ message: 'Đã xóa hội thoại' });
}

async function handleSendMessage(
  event: Parameters<typeof handler>[0],
  userId: string,
  sessionId: string,
) {
  const parsed = sendMessageSchema.safeParse(parseJson(event.body));
  if (!parsed.success) {
    return error(400, 'VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join('; '));
  }

  const session = await chatRepo.getSession(userId, sessionId);
  if (!session) {
    return error(404, 'NOT_FOUND', 'Không tìm thấy phiên chat');
  }

  // Giới hạn số tin nhắn mỗi session (chống lạm dụng)
  const existing = await chatRepo.listMessages(sessionId);
  if (existing.length >= CHAT_LIMITS.MAX_MESSAGES_PER_SESSION * 2) {
    return error(429, 'SESSION_LIMIT', 'Phiên chat đã đạt giới hạn tin nhắn');
  }

  const now = new Date().toISOString();

  // Lưu tin nhắn user
  const userMessage: ChatMessage = {
    id: randomUUID(),
    sessionId,
    role: ChatRole.USER,
    content: parsed.data.content,
    createdAt: now,
  };
  await chatRepo.addMessage(userMessage);

  // Tạo context giới hạn từ CV + Job Analysis
  const context: {
    profile?: import('@cv-coach/shared').StructuredProfile;
    jobDescription?: string;
    analysisResult?: import('@cv-coach/shared').CvAnalysisResult;
    jobMatch?: import('@cv-coach/shared').JobAnalysis;
  } = {};

  if (session.resumeId) {
    const resume = await resumeRepo.get(userId, session.resumeId);
    if (resume?.structuredProfile) context.profile = resume.structuredProfile;
    if (resume?.analysisResult) context.analysisResult = resume.analysisResult;
  }
  if (session.jobAnalysisId) {
    const ja = await jobAnalysisRepo.get(userId, session.jobAnalysisId);
    if (ja) {
      context.jobDescription = ja.jobDescription;
      // Truyền toàn bộ kết quả so sánh để AI trả lời chính xác
      // (fitLevel, matchedSkills, missingSkills, suggestions...)
      context.jobMatch = ja;
    }
  }

  // Lịch sử hội thoại (giới hạn 10 lượt gần nhất để kiểm soát context)
  const history = [...existing, userMessage]
    .slice(-10)
    .map((m) => ({
      role: m.role === ChatRole.USER ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));

  const ai = await getAiService();
  const reply = await ai.chat(history, context);

  // Lưu tin nhắn assistant
  const assistantMessage: ChatMessage = {
    id: randomUUID(),
    sessionId,
    role: ChatRole.ASSISTANT,
    content: reply,
    createdAt: new Date().toISOString(),
  };
  await chatRepo.addMessage(assistantMessage);

  // Tin nhắn đầu tiên → đặt làm tiêu đề session (để nhận diện trong lịch sử)
  if (existing.length === 0) {
    const title = parsed.data.content.slice(0, 60);
    await chatRepo.updateSession(userId, sessionId, { title });
  } else {
    await chatRepo.updateSession(userId, sessionId, {});
  }

  return success({ userMessage, assistantMessage });
}
