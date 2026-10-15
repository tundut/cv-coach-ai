import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface StorageConstructProps {
  stage: string;
}

/**
 * Construct cho S3 storage.
 *
 * Bucket lưu CV ở chế độ private hoàn toàn:
 * - Block tất cả public access
 * - Mã hóa server-side (S3-managed)
 * - CORS cho phép presigned PUT từ frontend
 * - Chỉ truy cập qua presigned URL ngắn hạn
 */
export class StorageConstruct extends Construct {
  public readonly resumesBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    const { stage } = props;
    const isProd = stage === 'prod';

    this.resumesBucket = new s3.Bucket(this, 'ResumesBucket', {
      bucketName: `cv-coach-resumes-${stage}-${cdk.Stack.of(this).account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ['*'], // Siết lại domain thật khi production
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          // Dọn upload dở dang
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });
  }
}
