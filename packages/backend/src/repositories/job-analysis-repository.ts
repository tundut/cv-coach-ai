import { PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { JobAnalysis } from '@cv-coach/shared';
import { getDocClient, getTableName, keys } from '../lib/dynamo.js';

interface JobAnalysisItem extends JobAnalysis {
  PK: string;
  SK: string;
  entityType: 'JOBANALYSIS';
}

function toItem(analysis: JobAnalysis): JobAnalysisItem {
  return {
    ...analysis,
    PK: keys.userPk(analysis.userId),
    SK: keys.jobAnalysisSk(analysis.id),
    entityType: 'JOBANALYSIS',
  };
}

function fromItem(item: Record<string, unknown>): JobAnalysis {
  const { PK: _pk, SK: _sk, entityType: _et, ...rest } = item;
  return rest as unknown as JobAnalysis;
}

export class JobAnalysisRepository {
  async create(analysis: JobAnalysis): Promise<JobAnalysis> {
    await getDocClient().send(
      new PutCommand({ TableName: getTableName(), Item: toItem(analysis) }),
    );
    return analysis;
  }

  async get(userId: string, analysisId: string): Promise<JobAnalysis | null> {
    const result = await getDocClient().send(
      new GetCommand({
        TableName: getTableName(),
        Key: { PK: keys.userPk(userId), SK: keys.jobAnalysisSk(analysisId) },
      }),
    );
    return result.Item ? fromItem(result.Item) : null;
  }

  async listByUser(userId: string): Promise<JobAnalysis[]> {
    const result = await getDocClient().send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': keys.userPk(userId),
          ':skPrefix': 'JOBANALYSIS#',
        },
      }),
    );
    // SK là UUID → sort theo createdAt (mới nhất trước)
    return (result.Items ?? [])
      .map(fromItem)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async delete(userId: string, analysisId: string): Promise<void> {
    await getDocClient().send(
      new DeleteCommand({
        TableName: getTableName(),
        Key: { PK: keys.userPk(userId), SK: keys.jobAnalysisSk(analysisId) },
      }),
    );
  }
}
