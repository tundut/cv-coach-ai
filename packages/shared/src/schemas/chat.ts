import { z } from 'zod';
import { CHAT_LIMITS } from '../constants.js';

export const createChatSessionSchema = z.object({
  resumeId: z.string().optional(),
  jobAnalysisId: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Vui lòng nhập nội dung')
    .max(CHAT_LIMITS.MAX_MESSAGE_LENGTH, 'Tin nhắn quá dài'),
});

export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
