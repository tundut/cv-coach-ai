import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { ApiConstruct } from '../constructs/api.js';
import { AuthConstruct } from '../constructs/auth.js';
import { StorageConstruct } from '../constructs/storage.js';
import { DatabaseConstruct } from '../constructs/database.js';
import { ProcessingConstruct } from '../constructs/processing.js';
import { HostingConstruct } from '../constructs/hosting.js';

interface CvCoachStackProps extends cdk.StackProps {
  stage: string;
}

/**
 * Stack chính cho CV Coach AI.
 *
 * Giai đoạn 1: API Gateway + Lambda health check.
 * Giai đoạn 2: Cognito authentication.
 * Các giai đoạn sau sẽ thêm:
 * - S3 + SQS (Giai đoạn 3)
 * - DynamoDB (Giai đoạn 3)
 * - Textract + Secrets Manager (Giai đoạn 4)
 * - CloudWatch alarms (Giai đoạn 8)
 */
export class CvCoachStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CvCoachStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // ─── Cognito ────────────────────────────────────
    const auth = new AuthConstruct(this, 'Auth', { stage });

    // ─── Storage + Database ─────────────────────────
    const storage = new StorageConstruct(this, 'Storage', { stage });
    const database = new DatabaseConstruct(this, 'Database', { stage });

    // AI provider: lấy từ context (--context aiProvider=openai|bedrock), mặc định mock
    const aiProvider = this.node.tryGetContext('aiProvider') ?? 'mock';
    // Bedrock model ID (dùng khi aiProvider=bedrock)
    const bedrockModelId =
      this.node.tryGetContext('bedrockModelId') ?? 'apac.amazon.nova-lite-v1:0';
    // Textract: tắt mặc định (account dev chưa kích hoạt), bật bằng --context textractEnabled=true
    const textractEnabled = this.node.tryGetContext('textractEnabled') === 'true';

    // ─── Processing (SQS + processor Lambda) ────────
    const processing = new ProcessingConstruct(this, 'Processing', {
      stage,
      resumesBucket: storage.resumesBucket,
      appTable: database.table,
      aiProvider,
      bedrockModelId,
      textractEnabled,
    });

    // ─── API Gateway + Lambda ───────────────────────
    const api = new ApiConstruct(this, 'Api', {
      stage,
      userPool: auth.userPool,
      userPoolClientId: auth.userPoolClient.userPoolClientId,
      resumesBucket: storage.resumesBucket,
      appTable: database.table,
      analysisQueue: processing.analysisQueue,
      aiProvider,
      bedrockModelId,
      openAiSecretArn: processing.openAiSecret.secretArn,
      grantAiSecretRead: (fn) => processing.openAiSecret.grantRead(fn),
    });

    // ─── Frontend hosting (S3 + CloudFront) ─────────
    const hosting = new HostingConstruct(this, 'Hosting', { stage });

    // ─── Outputs ────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.restApi.url,
      description: 'API Gateway URL',
      exportName: `${id}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: auth.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${id}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${id}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'ResumesBucket', {
      value: storage.resumesBucket.bucketName,
      description: 'S3 bucket for resume files',
      exportName: `${id}-ResumesBucket`,
    });

    new cdk.CfnOutput(this, 'AppTable', {
      value: database.table.tableName,
      description: 'DynamoDB application table',
      exportName: `${id}-AppTable`,
    });

    new cdk.CfnOutput(this, 'AnalysisQueueUrl', {
      value: processing.analysisQueue.queueUrl,
      description: 'SQS queue URL for CV analysis',
      exportName: `${id}-AnalysisQueueUrl`,
    });

    new cdk.CfnOutput(this, 'OpenAiSecretArn', {
      value: processing.openAiSecret.secretArn,
      description: 'Secrets Manager ARN for OpenAI API key',
      exportName: `${id}-OpenAiSecretArn`,
    });

    new cdk.CfnOutput(this, 'SiteBucket', {
      value: hosting.siteBucket.bucketName,
      description: 'S3 bucket for frontend hosting',
      exportName: `${id}-SiteBucket`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${hosting.distribution.distributionDomainName}`,
      description: 'CloudFront URL for frontend',
      exportName: `${id}-CloudFrontUrl`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: hosting.distribution.distributionId,
      description: 'CloudFront distribution ID (for cache invalidation)',
      exportName: `${id}-DistributionId`,
    });
  }
}
