import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ChatSession, ChatMessage } from '@cv-coach/shared';
import { getDocClient, getTableName, keys } from '../lib/dynamo.js';

interface SessionItem extends ChatSession {
  PK: string;
  SK: string;
  entityType: 'CHATSESSION';
}

interface MessageItem extends ChatMessage {
  PK: string;
  SK: string;
  entityType: 'CHATMESSAGE';
}

function stripKeys<T>(item: Record<string, unknown>): T {
  const { PK: _pk, SK: _sk, entityType: _et, ...rest } = item;
  return rest as unknown as T;
}

export class ChatRepository {
  // ─── Sessions ───────────────────────────────────

  async createSession(session: ChatSession): Promise<ChatSession> {
    const item: SessionItem = {
      ...session,
      PK: keys.userPk(session.userId),
      SK: keys.chatSessionSk(session.id),
      entityType: 'CHATSESSION',
    };
    await getDocClient().send(new PutCommand({ TableName: getTableName(), Item: item }));
    return session;
  }

  async getSession(userId: string, sessionId: string): Promise<ChatSession | null> {
    const result = await getDocClient().send(
      new GetCommand({
        TableName: getTableName(),
        Key: { PK: keys.userPk(userId), SK: keys.chatSessionSk(sessionId) },
      }),
    );
    return result.Item ? stripKeys<ChatSession>(result.Item) : null;
  }

  async listSessions(userId: string): Promise<ChatSession[]> {
    const result = await getDocClient().send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': keys.userPk(userId),
          ':skPrefix': 'CHATSESSION#',
        },
      }),
    );
    const sessions = (result.Items ?? []).map((i) => stripKeys<ChatSession>(i));
    // Sort theo thời gian cập nhật gần nhất (SK là UUID nên không sort được theo key)
    return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /**
   * Cập nhật tiêu đề + thời gian cập nhật của session.
   */
  async updateSession(
    userId: string,
    sessionId: string,
    updates: { title?: string },
  ): Promise<void> {
    const sets: string[] = ['updatedAt = :now'];
    const values: Record<string, unknown> = { ':now': new Date().toISOString() };
    if (updates.title !== undefined) {
      sets.push('title = :title');
      values[':title'] = updates.title;
    }
    await getDocClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: { PK: keys.userPk(userId), SK: keys.chatSessionSk(sessionId) },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeValues: values,
      }),
    );
  }

  /**
   * Xóa session và toàn bộ tin nhắn của nó.
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const messages = await this.listMessages(sessionId);
    await Promise.all(
      messages.map((m) =>
        getDocClient().send(
          new DeleteCommand({
            TableName: getTableName(),
            Key: {
              PK: keys.sessionPk(sessionId),
              SK: keys.messageSk(m.createdAt, m.id),
            },
          }),
        ),
      ),
    );
    await getDocClient().send(
      new DeleteCommand({
        TableName: getTableName(),
        Key: { PK: keys.userPk(userId), SK: keys.chatSessionSk(sessionId) },
      }),
    );
  }

  // ─── Messages ───────────────────────────────────
  // Messages lưu dưới PK=SESSION#<id>, SK=MESSAGE#<timestamp>#<id>

  async addMessage(message: ChatMessage): Promise<ChatMessage> {
    const item: MessageItem = {
      ...message,
      PK: keys.sessionPk(message.sessionId),
      SK: keys.messageSk(message.createdAt, message.id),
      entityType: 'CHATMESSAGE',
    };
    await getDocClient().send(new PutCommand({ TableName: getTableName(), Item: item }));
    return message;
  }

  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    const result = await getDocClient().send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': keys.sessionPk(sessionId),
          ':skPrefix': 'MESSAGE#',
        },
        ScanIndexForward: true, // cũ → mới
      }),
    );
    return (result.Items ?? []).map((i) => stripKeys<ChatMessage>(i));
  }
}
