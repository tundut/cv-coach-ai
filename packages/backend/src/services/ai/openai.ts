import OpenAI from 'openai';
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

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

/**
 * OpenAI implementation của AiAnalysisService.
 *
 * Mọi output đều yêu cầu JSON và validate bằng Zod trước khi trả về.
 * Nếu AI trả JSON sai schema → ném lỗi để processor xử lý (FAILED).
 */
export class OpenAiAnalysisService implements AiAnalysisService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Gọi OpenAI, parse JSON và validate bằng Zod.
   */
  private async completeJson<T>(prompt: string, schema: ZodSchema<T>): Promise<T> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    // Thử tối đa 2 lần: nếu lần đầu sai schema, gửi lỗi lại cho GPT tự sửa.
    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await this.client.chat.completions.create({
        model: MODEL,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        lastError = 'Invalid JSON';
        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: 'Output không phải JSON hợp lệ. Trả lại JSON đúng.' });
        continue;
      }

      const result = schema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }

      lastError = result.error.message;
      // Phản hồi lỗi để GPT sửa đúng schema ở lần sau
      messages.push({ role: 'assistant', content });
      messages.push({
        role: 'user',
        content: `JSON trên không đúng schema. Lỗi: ${result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}. Trả lại JSON đúng schema, mọi field dạng danh sách phải là mảng.`,
      });
    }

    throw new Error(`OpenAI output failed schema validation: ${lastError}`);
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
    const chatSystem = buildChatSystemPrompt(context);

    const response = await this.client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: chatSystem },
        ...messages,
      ],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
