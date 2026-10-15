import type { ChatSession, ChatMessage } from '@cv-coach/shared';
import { apiClient } from './client.js';

export class ChatApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ChatApiError';
    this.code = code;
  }
}

function unwrap<T>(res: { success: boolean; data?: T; error?: { message: string; code: string } }): T {
  if (!res.success || res.data === undefined) {
    throw new ChatApiError(res.error?.message ?? 'Request failed', res.error?.code ?? 'UNKNOWN');
  }
  return res.data;
}

export const chatApi = {
  async createSession(req: { resumeId?: string; jobAnalysisId?: string }): Promise<ChatSession> {
    return unwrap(await apiClient.post<ChatSession>('/chat/sessions', req));
  },
  async listSessions(): Promise<ChatSession[]> {
    return unwrap(await apiClient.get<ChatSession[]>('/chat/sessions'));
  },
  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    return unwrap(await apiClient.get<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`));
  },
  async deleteSession(sessionId: string): Promise<void> {
    unwrap(await apiClient.delete<{ message: string }>(`/chat/sessions/${sessionId}`));
  },
  async sendMessage(
    sessionId: string,
    content: string,
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    return unwrap(
      await apiClient.post<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `/chat/sessions/${sessionId}/messages`,
        { content },
      ),
    );
  },
};
