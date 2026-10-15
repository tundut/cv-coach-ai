import {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Resume, StructuredProfile, CvAnalysisResult } from '@cv-coach/shared';
import { AnalysisStatus } from '@cv-coach/shared';
import { getDocClient, getTableName, keys } from '../lib/dynamo.js';

/**
 * Item lưu trong DynamoDB cho Resume.
 * Mở rộng Resume với các key của single-table design.
 */
interface ResumeItem extends Resume {
  PK: string;
  SK: string;
  entityType: 'RESUME';
}

function toItem(resume: Resume): ResumeItem {
  return {
    ...resume,
    PK: keys.userPk(resume.userId),
    SK: keys.resumeSk(resume.id),
    entityType: 'RESUME',
  };
}

function fromItem(item: Record<string, unknown>): Resume {
  // Loại bỏ các field nội bộ của DynamoDB
  const { PK: _pk, SK: _sk, entityType: _et, ...resume } = item;
  return resume as unknown as Resume;
}

export class ResumeRepository {
  async create(resume: Resume): Promise<Resume> {
    await getDocClient().send(
      new PutCommand({
        TableName: getTableName(),
        Item: toItem(resume),
      }),
    );
    return resume;
  }

  async get(userId: string, resumeId: string): Promise<Resume | null> {
    const result = await getDocClient().send(
      new GetCommand({
        TableName: getTableName(),
        Key: {
          PK: keys.userPk(userId),
          SK: keys.resumeSk(resumeId),
        },
      }),
    );
    return result.Item ? fromItem(result.Item) : null;
  }

  async listByUser(userId: string): Promise<Resume[]> {
    const result = await getDocClient().send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': keys.userPk(userId),
          ':skPrefix': 'RESUME#',
        },
      }),
    );
    // SK là UUID → sort theo createdAt (mới nhất trước)
    return (result.Items ?? [])
      .map(fromItem)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async delete(userId: string, resumeId: string): Promise<void> {
    await getDocClient().send(
      new DeleteCommand({
        TableName: getTableName(),
        Key: {
          PK: keys.userPk(userId),
          SK: keys.resumeSk(resumeId),
        },
      }),
    );
  }

  /**
   * Cập nhật trạng thái phân tích.
   */
  async updateStatus(
    userId: string,
    resumeId: string,
    status: AnalysisStatus,
  ): Promise<void> {
    await getDocClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: {
          PK: keys.userPk(userId),
          SK: keys.resumeSk(resumeId),
        },
        UpdateExpression: 'SET analysisStatus = :status, updatedAt = :now',
        ExpressionAttributeValues: {
          ':status': status,
          ':now': new Date().toISOString(),
        },
      }),
    );
  }

  /**
   * Lưu kết quả phân tích thành công và set COMPLETED.
   */
  async saveAnalysisResult(
    userId: string,
    resumeId: string,
    data: {
      extractedText: string;
      structuredProfile: StructuredProfile;
      analysisResult: CvAnalysisResult;
    },
  ): Promise<void> {
    await getDocClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: {
          PK: keys.userPk(userId),
          SK: keys.resumeSk(resumeId),
        },
        UpdateExpression:
          'SET analysisStatus = :status, extractedText = :text, structuredProfile = :profile, analysisResult = :result, updatedAt = :now REMOVE errorMessage',
        ExpressionAttributeValues: {
          ':status': AnalysisStatus.COMPLETED,
          ':text': data.extractedText,
          ':profile': data.structuredProfile,
          ':result': data.analysisResult,
          ':now': new Date().toISOString(),
        },
      }),
    );
  }

  /**
   * Đánh dấu phân tích thất bại với thông báo lỗi.
   */
  async markFailed(userId: string, resumeId: string, errorMessage: string): Promise<void> {
    await getDocClient().send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: {
          PK: keys.userPk(userId),
          SK: keys.resumeSk(resumeId),
        },
        UpdateExpression:
          'SET analysisStatus = :status, errorMessage = :err, updatedAt = :now',
        ExpressionAttributeValues: {
          ':status': AnalysisStatus.FAILED,
          ':err': errorMessage,
          ':now': new Date().toISOString(),
        },
      }),
    );
  }

  /**
   * Đặt một CV làm mặc định, bỏ mặc định các CV khác.
   */
  async setDefault(userId: string, resumeId: string): Promise<void> {
    const resumes = await this.listByUser(userId);
    const now = new Date().toISOString();

    await Promise.all(
      resumes.map((r) =>
        getDocClient().send(
          new UpdateCommand({
            TableName: getTableName(),
            Key: {
              PK: keys.userPk(userId),
              SK: keys.resumeSk(r.id),
            },
            UpdateExpression: 'SET isDefault = :val, updatedAt = :now',
            ExpressionAttributeValues: {
              ':val': r.id === resumeId,
              ':now': now,
            },
          }),
        ),
      ),
    );
  }
}
