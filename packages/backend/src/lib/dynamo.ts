import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let docClient: DynamoDBDocumentClient | null = null;

/**
 * Lazy-init DynamoDB Document Client (dùng chung cho các repository).
 */
export function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION ?? 'ap-southeast-1',
    });
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
    });
  }
  return docClient;
}

/**
 * Tên bảng từ env.
 */
export function getTableName(): string {
  const name = process.env.APP_TABLE_NAME;
  if (!name) {
    throw new Error('APP_TABLE_NAME environment variable is not set');
  }
  return name;
}

/**
 * Helper tạo key cho single-table design.
 */
export const keys = {
  userPk: (userId: string) => `USER#${userId}`,
  resumeSk: (resumeId: string) => `RESUME#${resumeId}`,
  jobAnalysisSk: (analysisId: string) => `JOBANALYSIS#${analysisId}`,
  chatSessionSk: (sessionId: string) => `CHATSESSION#${sessionId}`,
  generatedDocSk: (docId: string) => `GENERATEDDOC#${docId}`,
  sessionPk: (sessionId: string) => `SESSION#${sessionId}`,
  messageSk: (timestamp: string, messageId: string) => `MESSAGE#${timestamp}#${messageId}`,
};
