import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { AiAnalysisService } from './types.js';
import { MockAnalysisService } from './mock.js';
import { OpenAiAnalysisService } from './openai.js';
import { BedrockAnalysisService } from './bedrock.js';

let instance: AiAnalysisService | null = null;

/**
 * Lấy OpenAI API key:
 * - Ưu tiên env OPENAI_API_KEY (dev local)
 * - Fallback: đọc từ Secrets Manager qua OPENAI_SECRET_ARN (production)
 */
async function resolveOpenAiKey(): Promise<string> {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  const secretArn = process.env.OPENAI_SECRET_ARN;
  if (secretArn) {
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION ?? 'ap-southeast-1',
    });
    const result = await client.send(
      new GetSecretValueCommand({ SecretId: secretArn }),
    );
    if (result.SecretString) {
      // Secret có thể là plain string hoặc JSON { "apiKey": "..." }
      try {
        const json = JSON.parse(result.SecretString) as { apiKey?: string };
        return json.apiKey ?? result.SecretString;
      } catch {
        return result.SecretString;
      }
    }
  }

  throw new Error('OpenAI API key not configured (OPENAI_API_KEY or OPENAI_SECRET_ARN)');
}

/**
 * Factory trả về AI provider theo env AI_PROVIDER.
 * Chuyển đổi provider chỉ bằng cách đổi biến môi trường AI_PROVIDER.
 *
 * - mock    → MockAnalysisService (dev/test, không cần API key)
 * - openai  → OpenAiAnalysisService (cần OPENAI_API_KEY hoặc OPENAI_SECRET_ARN)
 * - bedrock → BedrockAnalysisService (cần quyền bedrock:InvokeModel + model access,
 *             model qua BEDROCK_MODEL_ID)
 */
export async function getAiService(): Promise<AiAnalysisService> {
  if (instance) return instance;

  const provider = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();

  switch (provider) {
    case 'mock':
      instance = new MockAnalysisService();
      break;
    case 'openai': {
      const apiKey = await resolveOpenAiKey();
      instance = new OpenAiAnalysisService(apiKey);
      break;
    }
    case 'bedrock':
      instance = new BedrockAnalysisService();
      break;
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }

  return instance;
}
