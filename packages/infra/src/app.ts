#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CvCoachStack } from './stacks/cv-coach-stack.js';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') ?? 'dev';

new CvCoachStack(app, `CvCoachAi-${stage}`, {
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-southeast-1',
  },
  description: `CV Coach AI - ${stage} environment`,
});
