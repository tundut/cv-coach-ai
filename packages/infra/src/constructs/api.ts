import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

interface ApiConstructProps {
  stage: string;
  userPool: cognito.IUserPool;
  userPoolClientId: string;
  resumesBucket: s3.IBucket;
  appTable: dynamodb.ITable;
  analysisQueue: sqs.IQueue;
  aiProvider: string;
  bedrockModelId: string;
  openAiSecretArn: string;
  /** Grant một Lambda quyền đọc OpenAI secret */
  grantAiSecretRead: (fn: lambda.Function) => void;
}

/**
 * Construct cho API Gateway và Lambda handlers.
 *
 * Giai đoạn 1: health check
 * Giai đoạn 2: auth endpoints + Cognito authorizer
 * Giai đoạn 3: resume endpoints (S3 + DynamoDB)
 */
export class ApiConstruct extends Construct {
  public readonly restApi: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { stage, userPool, userPoolClientId, resumesBucket, appTable, analysisQueue } = props;

    const handlersPath = path.join(
      import.meta.dirname, '..', '..', '..', 'backend', 'dist', 'handlers',
    );

    const commonEnv = {
      APP_VERSION: '0.1.0',
      STAGE: stage,
      COGNITO_USER_POOL_ID: userPool.userPoolId,
      COGNITO_CLIENT_ID: userPoolClientId,
      RESUMES_BUCKET: resumesBucket.bucketName,
      APP_TABLE_NAME: appTable.tableName,
      ANALYSIS_QUEUE_URL: analysisQueue.queueUrl,
    };

    // ─── Lambda Functions ───────────────────────────

    const healthFn = new lambda.Function(this, 'HealthFn', {
      functionName: `cv-coach-health-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'health.handler',
      code: lambda.Code.fromAsset(handlersPath),
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      environment: commonEnv,
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });

    const authFn = new lambda.Function(this, 'AuthFn', {
      functionName: `cv-coach-auth-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'auth.handler',
      code: lambda.Code.fromAsset(handlersPath),
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: commonEnv,
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });

    const meFn = new lambda.Function(this, 'MeFn', {
      functionName: `cv-coach-me-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'me.handler',
      code: lambda.Code.fromAsset(handlersPath),
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      environment: commonEnv,
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });

    const resumesFn = new lambda.Function(this, 'ResumesFn', {
      functionName: `cv-coach-resumes-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'resumes.handler',
      code: lambda.Code.fromAsset(handlersPath),
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: commonEnv,
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });

    // Grant quyền: resume Lambda cần đọc/ghi S3 bucket, DynamoDB và gửi SQS
    resumesBucket.grantReadWrite(resumesFn);
    appTable.grantReadWriteData(resumesFn);
    analysisQueue.grantSendMessages(resumesFn);

    // AI-powered Lambda (job analyses, writing, chat) — cần đọc secret OpenAI
    const aiEnv = {
      ...commonEnv,
      AI_PROVIDER: props.aiProvider,
      OPENAI_SECRET_ARN: props.openAiSecretArn,
      BEDROCK_MODEL_ID: props.bedrockModelId,
    };

    // Policy cho phép gọi Bedrock (dùng khi AI_PROVIDER=bedrock)
    const bedrockPolicy = new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    });

    const jobAnalysesFn = new lambda.Function(this, 'JobAnalysesFn', {
      functionName: `cv-coach-job-analyses-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'job-analyses.handler',
      code: lambda.Code.fromAsset(handlersPath),
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      environment: aiEnv,
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });
    appTable.grantReadWriteData(jobAnalysesFn);
    props.grantAiSecretRead(jobAnalysesFn);
    jobAnalysesFn.addToRolePolicy(bedrockPolicy);

    const aiWritingFn = new lambda.Function(this, 'AiWritingFn', {
      functionName: `cv-coach-ai-writing-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'ai-writing.handler',
      code: lambda.Code.fromAsset(handlersPath),
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      environment: aiEnv,
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });
    appTable.grantReadWriteData(aiWritingFn);
    props.grantAiSecretRead(aiWritingFn);
    aiWritingFn.addToRolePolicy(bedrockPolicy);

    const chatFn = new lambda.Function(this, 'ChatFn', {
      functionName: `cv-coach-chat-${stage}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'chat.handler',
      code: lambda.Code.fromAsset(handlersPath),
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      environment: aiEnv,
      logRetention: logs.RetentionDays.TWO_WEEKS,
    });
    appTable.grantReadWriteData(chatFn);
    props.grantAiSecretRead(chatFn);
    chatFn.addToRolePolicy(bedrockPolicy);

    // ─── API Gateway ────────────────────────────────

    this.restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `cv-coach-api-${stage}`,
      description: `CV Coach AI API - ${stage}`,
      deployOptions: {
        stageName: stage,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Cognito authorizer cho protected endpoints
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuth', {
      cognitoUserPools: [userPool],
      authorizerName: `cv-coach-authorizer-${stage}`,
      identitySource: 'method.request.header.Authorization',
    });

    // GET /health (public)
    const healthResource = this.restApi.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthFn));

    // /auth (public) — POST cho register, login, forgot-password, confirm
    const authResource = this.restApi.root.addResource('auth');
    authResource.addMethod('POST', new apigateway.LambdaIntegration(authFn));

    // GET /me (protected)
    const meResource = this.restApi.root.addResource('me');
    meResource.addMethod('GET', new apigateway.LambdaIntegration(meFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ─── /resumes (tất cả protected) ────────────────
    const protectedMethod = {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };
    const resumesIntegration = new apigateway.LambdaIntegration(resumesFn);

    const resumesResource = this.restApi.root.addResource('resumes');
    // GET /resumes (list)
    resumesResource.addMethod('GET', resumesIntegration, protectedMethod);

    // POST /resumes/upload-url
    const uploadUrlResource = resumesResource.addResource('upload-url');
    uploadUrlResource.addMethod('POST', resumesIntegration, protectedMethod);

    // /resumes/{resumeId}
    const resumeItemResource = resumesResource.addResource('{resumeId}');
    resumeItemResource.addMethod('GET', resumesIntegration, protectedMethod);
    resumeItemResource.addMethod('DELETE', resumesIntegration, protectedMethod);

    // POST /resumes/{resumeId}/default
    const defaultResource = resumeItemResource.addResource('default');
    defaultResource.addMethod('POST', resumesIntegration, protectedMethod);

    // POST /resumes/{resumeId}/analyze
    const analyzeResource = resumeItemResource.addResource('analyze');
    analyzeResource.addMethod('POST', resumesIntegration, protectedMethod);

    // ─── /job-analyses (protected) ──────────────────
    const jobAnalysesIntegration = new apigateway.LambdaIntegration(jobAnalysesFn);
    const jobAnalysesResource = this.restApi.root.addResource('job-analyses');
    jobAnalysesResource.addMethod('GET', jobAnalysesIntegration, protectedMethod);
    jobAnalysesResource.addMethod('POST', jobAnalysesIntegration, protectedMethod);
    const jobAnalysisItem = jobAnalysesResource.addResource('{analysisId}');
    jobAnalysisItem.addMethod('GET', jobAnalysesIntegration, protectedMethod);
    jobAnalysisItem.addMethod('DELETE', jobAnalysesIntegration, protectedMethod);

    // ─── /ai (protected) ────────────────────────────
    const aiWritingIntegration = new apigateway.LambdaIntegration(aiWritingFn);
    const aiResource = this.restApi.root.addResource('ai');
    aiResource.addResource('rewrite').addMethod('POST', aiWritingIntegration, protectedMethod);
    aiResource.addResource('cover-letter').addMethod('POST', aiWritingIntegration, protectedMethod);
    aiResource.addResource('documents').addMethod('GET', aiWritingIntegration, protectedMethod);

    // ─── /chat (protected) ──────────────────────────
    const chatIntegration = new apigateway.LambdaIntegration(chatFn);
    const chatResource = this.restApi.root.addResource('chat');
    const sessionsResource = chatResource.addResource('sessions');
    sessionsResource.addMethod('GET', chatIntegration, protectedMethod);
    sessionsResource.addMethod('POST', chatIntegration, protectedMethod);
    const sessionItem = sessionsResource.addResource('{sessionId}');
    sessionItem.addMethod('DELETE', chatIntegration, protectedMethod);
    const messagesResource = sessionItem.addResource('messages');
    messagesResource.addMethod('GET', chatIntegration, protectedMethod);
    messagesResource.addMethod('POST', chatIntegration, protectedMethod);
  }
}
