import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
} from '@aws-sdk/client-bedrock-runtime';
import type {
  StructuredProfile,
  CvAnalysisResult,
  JobMatchAnalysisOutput,
  RewriteOutput,
  CoverLetterOutput,
  JobAnalysis,
} from '@cv-coach/shared';
import {
  structuredProfileSchema,
  cvAnalysisResultSchema,
  jobMatchAnalysisSchema,
  rewriteOutputSchema,
  coverLetterOutputSchema,
} from '@cv-coach/shared';
import type { ZodSchema } from 'zod';
import type { AiAnalysisService } from './types.js';
import {
  SYSTEM_PROMPT,
  parseResumePrompt,
  analyzeResumePrompt,
  jobMatchPrompt,
  rewritePrompt,
  coverLetterPrompt,
  buildChatSystemPrompt,
} from './prompts.js';

/**
 * Model mặc định — Amazon Nova Lite qua APAC inference profile.
 * Nova (của AWS) không cần form use case như Anthropic Claude.
 * Lưu ý: Bedrock cần inference profile (prefix region "apac.") cho on-demand,
 * không dùng model ID trực tiếp được. Đổi qua env BEDROCK_MODEL_ID.
 */
const DEFAULT_MODEL = 'apac.amazon.nova-lite-v1:0';

/**
 * Trích JSON từ text (Bedrock/Claude đôi khi kèm text ngoài JSON).
 * Lấy đoạn từ dấu { đầu tiên đến } cuối cùng.
 */
function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

/**
 * Amazon Bedrock implementation của AiAnalysisService.
 *
 * Dùng Converse API (thống nhất cho mọi model trên Bedrock).
 * Output JSON được validate bằng Zod + retry — giống OpenAI provider.
 */
export class BedrockAnalysisService implements AiAnalysisService {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor() {
    const region = process.env.BEDROCK_REGION ?? process.env.AWS_REGION ?? 'ap-southeast-1';
    this.client = new BedrockRuntimeClient({ region });
    this.modelId = process.env.BEDROCK_MODEL_ID ?? DEFAULT_MODEL;
  }

  /**
   * Gọi Bedrock Converse, trả về text.
   */
  private async converse(
    systemPrompt: string,
    messages: Message[],
    temperature: number,
  ): Promise<string> {
    const response = await this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        // Chỉ gửi system khi có nội dung (một số model không nhận system rỗng)
        system: systemPrompt ? [{ text: systemPrompt }] : undefined,
        messages,
        inferenceConfig: { temperature, maxTokens: 4096 },
      }),
    );

    const content = response.output?.message?.content;
    const text = content?.map((c) => c.text ?? '').join('') ?? '';
    if (!text) {
      throw new Error('Bedrock returned empty response');
    }
    return text;
  }

  /**
   * Gọi Bedrock yêu cầu JSON, parse + validate Zod, retry 1 lần nếu sai.
   */
  private async completeJson<T>(prompt: string, schema: ZodSchema<T>): Promise<T> {
    const messages: Message[] = [{ role: 'user', content: [{ text: prompt }] }];

    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await this.converse(SYSTEM_PROMPT, messages, 0.2);

      let parsed: unknown;
      try {
        parsed = JSON.parse(extractJson(text));
      } catch {
        lastError = 'Invalid JSON';
        messages.push({ role: 'assistant', content: [{ text }] });
        messages.push({
          role: 'user',
          content: [{ text: 'Output không phải JSON hợp lệ. Chỉ trả về JSON đúng, không thêm text.' }],
        });
        continue;
      }

      const result = schema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }

      lastError = result.error.message;
      messages.push({ role: 'assistant', content: [{ text }] });
      messages.push({
        role: 'user',
        content: [
          {
            text: `JSON trên không đúng schema. Lỗi: ${result.error.issues
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; ')}. Chỉ trả về JSON đúng schema, mọi field dạng danh sách phải là mảng.`,
          },
        ],
      });
    }

    throw new Error(`Bedrock output failed schema validation: ${lastError}`);
  }

  async parseResume(extractedText: string): Promise<StructuredProfile> {
    return this.completeJson(
      parseResumePrompt(extractedText),
      structuredProfileSchema as unknown as ZodSchema<StructuredProfile>,
    );
  }

  async analyzeResume(profile: StructuredProfile): Promise<CvAnalysisResult> {
    return this.completeJson(
      analyzeResumePrompt(profile),
      cvAnalysisResultSchema as unknown as ZodSchema<CvAnalysisResult>,
    );
  }

  async analyzeJobMatch(
    profile: StructuredProfile,
    jobDescription: string,
    jobTitle: string,
  ): Promise<JobMatchAnalysisOutput> {
    return this.completeJson(
      jobMatchPrompt(profile, jobDescription, jobTitle),
      jobMatchAnalysisSchema as unknown as ZodSchema<JobMatchAnalysisOutput>,
    );
  }

  async rewriteContent(
    content: string,
    style: string,
    context?: { jobDescription?: string },
  ): Promise<RewriteOutput> {
    return this.completeJson(
      rewritePrompt(content, style, context?.jobDescription),
      rewriteOutputSchema as unknown as ZodSchema<RewriteOutput>,
    );
  }

  async generateCoverLetter(
    profile: StructuredProfile,
    jobTitle: string,
    companyName: string,
    jobDescription?: string,
    tone?: string,
  ): Promise<CoverLetterOutput> {
    return this.completeJson(
      coverLetterPrompt(profile, jobTitle, companyName, jobDescription, tone),
      coverLetterOutputSchema as unknown as ZodSchema<CoverLetterOutput>,
    );
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: {
      profile?: StructuredProfile;
      jobDescription?: string;
      analysisResult?: CvAnalysisResult;
      jobMatch?: JobAnalysis;
    },
  ): Promise<string> {
    const systemPrompt = buildChatSystemPrompt(context);
    const bedrockMessages: Message[] = messages.map((m) => ({
      role: m.role,
      content: [{ text: m.content }],
    }));
    return this.converse(systemPrompt, bedrockMessages, 0.7);
  }
}
