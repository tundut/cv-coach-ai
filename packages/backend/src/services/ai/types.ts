import type {
  StructuredProfile,
  CvAnalysisResult,
  JobMatchAnalysisOutput,
  RewriteOutput,
  CoverLetterOutput,
  JobAnalysis,
} from '@cv-coach/shared';

/**
 * Abstraction cho AI Analysis Service.
 *
 * Thiết kế theo proposal: có thể thay thế OpenAI bằng Amazon Bedrock
 * mà không cần thay đổi business logic.
 *
 * ```
 * AiAnalysisService
 * ├── OpenAiAnalysisService
 * └── BedrockAnalysisService
 * ```
 */
export interface AiAnalysisService {
  /**
   * Phân tích CV và trích xuất structured profile.
   */
  parseResume(extractedText: string): Promise<StructuredProfile>;

  /**
   * Phân tích điểm mạnh/yếu trong CV.
   */
  analyzeResume(profile: StructuredProfile): Promise<CvAnalysisResult>;

  /**
   * So sánh CV với Job Description.
   */
  analyzeJobMatch(
    profile: StructuredProfile,
    jobDescription: string,
    jobTitle: string,
  ): Promise<JobMatchAnalysisOutput>;

  /**
   * Viết lại nội dung CV theo phong cách yêu cầu.
   */
  rewriteContent(
    content: string,
    style: string,
    context?: { jobDescription?: string },
  ): Promise<RewriteOutput>;

  /**
   * Tạo cover letter.
   */
  generateCoverLetter(
    profile: StructuredProfile,
    jobTitle: string,
    companyName: string,
    jobDescription?: string,
    tone?: string,
  ): Promise<CoverLetterOutput>;

  /**
   * Chat trả lời dựa trên ngữ cảnh CV.
   */
  chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: {
      profile?: StructuredProfile;
      jobDescription?: string;
      analysisResult?: CvAnalysisResult;
      jobMatch?: JobAnalysis;
    },
  ): Promise<string>;
}
