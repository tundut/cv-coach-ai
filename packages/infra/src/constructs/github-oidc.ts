import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface GithubOidcConstructProps {
  stage: string;
  /** GitHub repo dạng "owner/repo", vd "tundut/cv-coach-ai" */
  githubRepo: string;
}

/**
 * Construct cho GitHub Actions OIDC.
 *
 * Tạo OIDC provider + IAM role mà GitHub Actions có thể assume qua OIDC
 * (không cần lưu AWS access key trong GitHub Secrets).
 *
 * Role được giới hạn chỉ cho đúng repo (trust policy theo sub của token GitHub).
 */
export class GithubOidcConstruct extends Construct {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GithubOidcConstructProps) {
    super(scope, id);

    const { stage, githubRepo } = props;

    // OIDC provider cho GitHub (một provider dùng chung cho cả account).
    // Nếu account đã có provider này, dùng fromOpenIdConnectProviderArn thay vì tạo mới.
    const provider = new iam.OpenIdConnectProvider(this, 'GithubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    // Role GitHub Actions assume. Trust chỉ cho push từ repo này.
    this.deployRole = new iam.Role(this, 'DeployRole', {
      roleName: `cv-coach-github-deploy-${stage}`,
      assumedBy: new iam.OpenIdConnectPrincipal(provider, {
        StringLike: {
          // Giới hạn theo repo (mọi branch). Siết chặt hơn bằng :ref:refs/heads/main nếu muốn.
          'token.actions.githubusercontent.com:sub': `repo:${githubRepo}:*`,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
      }),
      description: `GitHub Actions deploy role for ${githubRepo} (${stage})`,
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Quyền deploy: CloudFormation (CDK) + các dịch vụ stack dùng.
    // Dùng quyền rộng cho đơn giản (dev). Production nên siết theo least-privilege.
    this.deployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'),
    );
    // CDK cần tạo/sửa IAM role (Lambda execution roles...) — PowerUser không có IAM.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'iam:*',
        ],
        resources: ['*'],
      }),
    );
    // CDK assume các bootstrap role (cdk-hnb659fds-*) khi deploy.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: ['arn:aws:iam::*:role/cdk-*'],
      }),
    );
  }
}
