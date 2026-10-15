import type { StructuredProfile } from '@cv-coach/shared';

/**
 * System prompt chung — ràng buộc AI chỉ trả về JSON hợp lệ,
 * không khẳng định kết quả tuyển dụng tuyệt đối (theo proposal).
 */
export const SYSTEM_PROMPT = `Bạn là trợ lý phân tích CV chuyên nghiệp. 
Luôn trả về JSON hợp lệ theo đúng schema được yêu cầu, không thêm text ngoài JSON.
Đưa ra đánh giá mang tính hỗ trợ, KHÔNG khẳng định ứng viên chắc chắn đậu hoặc trượt một công việc.
Không sử dụng thuộc tính nhạy cảm (giới tính, tuổi, tôn giáo...) để đánh giá.`;

export function parseResumePrompt(extractedText: string): string {
  return `Phân tích nội dung CV sau và trích xuất thành structured profile.
Trả về JSON với các trường: personalInfo (name, email, phone, location, linkedin, website, summary), 
skills (technical: string[], soft: string[]), experience (title, company, location, startDate, endDate, current: boolean, description: string[]), 
education (degree, institution, year, gpa), certifications (name, issuer, year), 
projects (name, description, technologies: string[], url), languages (name, proficiency), achievements: string[].
Nếu thiếu thông tin, để mảng rỗng hoặc bỏ qua field optional. Giữ nguyên ngôn ngữ gốc của CV.

Nội dung CV:
"""
${extractedText}
"""`;
}

export function analyzeResumePrompt(profile: StructuredProfile): string {
  return `Phân tích điểm mạnh/yếu của CV dựa trên structured profile sau.
Trả về JSON với: strengths: string[], weaknesses: string[], missingContent: string[], 
vagueContent: string[], suggestions: string[]. Viết bằng tiếng Việt.

Profile:
${JSON.stringify(profile, null, 2)}`;
}

export function jobMatchPrompt(
  profile: StructuredProfile,
  jobDescription: string,
  jobTitle: string,
): string {
  return `So sánh CV với Job Description cho vị trí "${jobTitle}".
Trả về JSON với: fitLevel ("STRONG" | "MODERATE" | "NEEDS_IMPROVEMENT"), 
matchedSkills: string[], missingSkills: string[], insufficientEvidenceSkills: string[], 
relevantExperience: string[], keywordsToAdd: string[], strengths: string[], weaknesses: string[], suggestions: string[].
Viết bằng tiếng Việt.

Profile ứng viên:
${JSON.stringify(profile, null, 2)}

Job Description:
"""
${jobDescription}
"""`;
}

export function rewritePrompt(
  content: string,
  style: string,
  jobDescription?: string,
): string {
  const jdContext = jobDescription
    ? `\nTối ưu theo Job Description:\n"""${jobDescription}"""`
    : '';
  return `Viết lại đoạn nội dung CV sau theo phong cách: ${style}.${jdContext}
Trả về JSON với: rewrittenContent (string), explanation (string, giải thích thay đổi). Viết bằng tiếng Việt.

Nội dung gốc:
"""
${content}
"""`;
}

export function coverLetterPrompt(
  profile: StructuredProfile,
  jobTitle: string,
  companyName: string,
  jobDescription?: string,
  tone?: string,
): string {
  return `Viết cover letter cho vị trí "${jobTitle}" tại công ty "${companyName}".
Giọng văn: ${tone ?? 'chuyên nghiệp, chân thành'}.
Trả về JSON với: coverLetter (string, nội dung đầy đủ), highlights (string[], các điểm nhấn chính).
${jobDescription ? `\nJob Description:\n"""${jobDescription}"""` : ''}

Thông tin ứng viên:
${JSON.stringify(profile, null, 2)}`;
}

// ─── Chat ───────────────────────────────────────────

import type { StructuredProfile as Profile, CvAnalysisResult, JobAnalysis } from '@cv-coach/shared';

export interface ChatContext {
  profile?: Profile;
  jobDescription?: string;
  analysisResult?: CvAnalysisResult;
  jobMatch?: JobAnalysis;
}

/**
 * Dựng system prompt cho Career Assistant (dùng chung OpenAI + Bedrock).
 * Trả lời hội thoại tự nhiên, bám sát dữ liệu CV/JD thật.
 */
export function buildChatSystemPrompt(context: ChatContext): string {
  const hasCv = !!context.profile;

  let jobMatchStr = '';
  if (context.jobMatch) {
    const j = context.jobMatch;
    jobMatchStr = [
      `Kết quả so sánh CV với công việc "${j.jobTitle}"${j.companyName ? ` tại ${j.companyName}` : ''}:`,
      `- Mức độ phù hợp (fit level): ${j.fitLevel}`,
      `- Kỹ năng đã đáp ứng: ${j.matchedSkills.join(', ') || 'không có'}`,
      `- Kỹ năng còn thiếu: ${j.missingSkills.join(', ') || 'không có'}`,
      `- Kỹ năng chưa đủ bằng chứng: ${j.insufficientEvidenceSkills.join(', ') || 'không có'}`,
      `- Kinh nghiệm liên quan: ${j.relevantExperience.join('; ') || 'không có'}`,
      `- Từ khóa nên bổ sung: ${j.keywordsToAdd.join(', ') || 'không có'}`,
      `- Điểm mạnh: ${j.strengths.join('; ') || 'không có'}`,
      `- Điểm cần cải thiện: ${j.weaknesses.join('; ') || 'không có'}`,
      `- Gợi ý: ${j.suggestions.join('; ') || 'không có'}`,
    ].join('\n');
  }

  const contextStr = [
    context.profile ? `CV của người dùng (đã phân tích):\n${JSON.stringify(context.profile)}` : '',
    context.analysisResult
      ? `Kết quả đánh giá CV:\n${JSON.stringify(context.analysisResult)}`
      : '',
    context.jobDescription ? `Job Description gốc:\n${context.jobDescription}` : '',
    jobMatchStr,
  ]
    .filter(Boolean)
    .join('\n\n');

  return [
    'Bạn là Career Assistant của CV Coach AI — trợ lý nghề nghiệp thân thiện, trả lời bằng tiếng Việt.',
    'Trả lời dạng văn bản hội thoại tự nhiên, NGẮN GỌN, có thể dùng gạch đầu dòng. TUYỆT ĐỐI KHÔNG trả về JSON.',
    hasCv
      ? 'Dựa vào CV cụ thể của người dùng dưới đây để trả lời. Khi được hỏi về kỹ năng/kinh nghiệm, hãy nhắc tới chi tiết thật trong CV (tên kỹ năng, dự án, kinh nghiệm cụ thể), không trả lời chung chung.'
      : 'Người dùng chưa có CV được phân tích. Hãy gợi ý họ upload và phân tích CV trước để nhận tư vấn cá nhân hóa.',
    context.jobMatch
      ? 'Phiên chat này gắn với một kết quả so sánh CV–JD cụ thể (dưới đây). Khi được hỏi về mức độ phù hợp, kỹ năng thiếu, hay vì sao đạt mức fit đó, hãy trả lời chính xác dựa trên dữ liệu so sánh này, trích dẫn kỹ năng/điểm cụ thể.'
      : '',
    'Không khẳng định chắc chắn đậu/trượt. Không dùng thuộc tính nhạy cảm (giới tính, tuổi, tôn giáo).',
    contextStr ? `\n--- Ngữ cảnh ---\n${contextStr}` : '',
  ].join('\n');
}
