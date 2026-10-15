import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path';

interface ProcessingConstructProps {
  stage: string;
  resumesBucket: s3.IBucket;
  appTable: dynamodb.ITable;
  aiProvider: string;
  bedrockModelId: string;
  textractEnabled: boolean;
}

/**
 * Construct cho xử lý CV bất đồng bộ.
 *
 * - SQS queue + dead-letter queue
 * - Processor Lambda (consume SQS, gọi Textract + AI)
 * - Secret cho OpenAI API key (Secrets Manager)
 * - Quyền: Textract, S3 read, DynamoDB write, Secrets read
 */
export class ProcessingConstruct extends Construct {
  public readonly analysisQueue: sqs.Queue;
  public readonly openAiSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: ProcessingConstructProps) {
    super(scope, id);

    const { stage, resumesBucket, appTable, aiProvider } = props;

    // ─── Dead Letter Queue ──────────────────────────
    const dlq = new sqs.Queue(this, 'AnalysisDLQ', {
      queueName: `cv-coach-analysis-dlq-${stage}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // ─── Analysis Queue ─────────────────────────────
    this.analysisQueue = new sqs.Queue(this, 'AnalysisQueue', {
      queueName: `cv-coach-analysis-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(120), // >= processor timeout
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // ─── Secret cho OpenAI API key ──────────────────
    this.openAiSecret = new secretsmanager.Secret(this, 'OpenAiSecret', {
      secretName: `cv-coach-openai-${stage}`,
      description: 'OpenAI API key cho CV Coach AI',
    });

    // ─── Processor Lambda ───────────────────────────
    const handlersPath = path.join(
      import.meta.dirname, '..', '..', '..', 'backend', 'dist', 'handlers',
    );

    const processorFn = new lambda.Function(this, 'ProcessorFn', {
      functionName: `cv-coach-processor-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'processor.handler',
      code: lambda.Code.fromAsset(handlersPath),
      memorySize: 512,
      timeout: cdk.Duration.seconds(120),
      environment: {
        STAGE: stage,
        RESUMES_BUCKET: resumesBucket.bucketName,
        APP_TABLE_NAME: appTable.tableName,
        AI_PROVIDER: aiProvider,
        OPENAI_SECRET_ARN: this.openAiSecret.secretArn,
        BEDROCK_MODEL_ID: props.bedrockModelId,
        // Textract chưa kích hoạt trên account dev — tắt OCR, dùng placeholder.
        // Bật lại bằng --context textractEnabled=true khi account hỗ trợ.
        TEXTRACT_ENABLED: props.textractEnabled ? 'true' : 'false',
      },
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });

    // Event source: SQS → Lambda
    processorFn.addEventSource(
      new SqsEventSource(this.analysisQueue, {
        batchSize: 1, // mỗi CV xử lý riêng
      }),
    );

    // ─── Permissions ────────────────────────────────
    resumesBucket.grantRead(processorFn);
    appTable.grantReadWriteData(processorFn);
    this.openAiSecret.grantRead(processorFn);

    // Textract — sync (DetectDocumentText) + async (nhiều trang)
    processorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'textract:DetectDocumentText',
          'textract:StartDocumentTextDetection',
          'textract:GetDocumentTextDetection',
        ],
        resources: ['*'], // Textract không hỗ trợ resource-level cho các API này
      }),
    );

    // Bedrock — gọi model (dùng khi AI_PROVIDER=bedrock)
    processorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      }),
    );
  }
}
