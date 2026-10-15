import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { GeneratedDocument } from '@cv-coach/shared';
import { getDocClient, getTableName, keys } from '../lib/dynamo.js';

interface GeneratedDocumentItem extends GeneratedDocument {
  PK: string;
  SK: string;
  entityType: 'GENERATEDDOC';
}

function toItem(doc: GeneratedDocument): GeneratedDocumentItem {
  return {
    ...doc,
    PK: keys.userPk(doc.userId),
    SK: keys.generatedDocSk(doc.id),
    entityType: 'GENERATEDDOC',
  };
}

function fromItem(item: Record<string, unknown>): GeneratedDocument {
  const { PK: _pk, SK: _sk, entityType: _et, ...rest } = item;
  return rest as unknown as GeneratedDocument;
}

export class GeneratedDocumentRepository {
  async create(doc: GeneratedDocument): Promise<GeneratedDocument> {
    await getDocClient().send(
      new PutCommand({ TableName: getTableName(), Item: toItem(doc) }),
    );
    return doc;
  }

  async listByUser(userId: string): Promise<GeneratedDocument[]> {
    const result = await getDocClient().send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': keys.userPk(userId),
          ':skPrefix': 'GENERATEDDOC#',
        },
      }),
    );
    // SK là UUID → sort theo createdAt (mới nhất trước)
    return (result.Items ?? [])
      .map(fromItem)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async delete(userId: string, docId: string): Promise<void> {
    await getDocClient().send(
      new DeleteCommand({
        TableName: getTableName(),
        Key: { PK: keys.userPk(userId), SK: keys.generatedDocSk(docId) },
      }),
    );
  }

  /**
   * Xóa tất cả document gắn với một job analysis (cascade khi xóa JD).
   */
  async deleteByJobAnalysis(userId: string, jobAnalysisId: string): Promise<number> {
    const all = await this.listByUser(userId);
    const matching = all.filter((d) => d.sourceJobAnalysisId === jobAnalysisId);
    await Promise.all(matching.map((d) => this.delete(userId, d.id)));
    return matching.length;
  }
}
