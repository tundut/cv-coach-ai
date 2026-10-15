import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface DatabaseConstructProps {
  stage: string;
}

/**
 * Construct cho DynamoDB.
 *
 * Single-table design:
 * - PK (partition key) + SK (sort key)
 * - GSI1 để query theo quan hệ khác (vd: resume theo user)
 *
 * Ví dụ item layout:
 *   Resume:      PK=USER#<userId>  SK=RESUME#<resumeId>
 *   JobAnalysis: PK=USER#<userId>  SK=JOBANALYSIS#<analysisId>
 *   ChatSession: PK=USER#<userId>  SK=CHATSESSION#<sessionId>
 *   ChatMessage: PK=SESSION#<id>   SK=MESSAGE#<timestamp>
 */
export class DatabaseConstruct extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    const { stage } = props;
    const isProd = stage === 'prod';

    this.table = new dynamodb.Table(this, 'AppTable', {
      tableName: `cv-coach-app-${stage}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: isProd,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI1 — query linh hoạt theo thuộc tính khác
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
