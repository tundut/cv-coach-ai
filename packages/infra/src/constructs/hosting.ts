import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

interface HostingConstructProps {
  stage: string;
}

/**
 * Construct cho hosting frontend (SPA).
 *
 * - S3 bucket private (chỉ CloudFront truy cập qua OAC)
 * - CloudFront distribution: CDN + HTTPS + SPA routing
 *   (403/404 -> index.html để React Router xử lý client-side)
 *
 * Chưa gắn custom domain. Có thể thêm Route53 + ACM sau nếu có domain.
 */
export class HostingConstruct extends Construct {
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: HostingConstructProps) {
    super(scope, id);

    const { stage } = props;
    const isProd = stage === 'prod';

    // ─── S3 bucket chứa file build ──────────────────
    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `cv-coach-web-${stage}-${cdk.Stack.of(this).account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    // ─── CloudFront distribution ────────────────────
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `CV Coach AI frontend - ${stage}`,
      defaultRootObject: 'index.html',
      // S3OriginWithOAC: CloudFront truy cập bucket private qua Origin Access Control
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      // SPA: mọi route không tồn tại -> trả index.html (React Router lo phần còn lại)
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200, // gồm cả châu Á
    });
  }
}
