import type {
  StructuredProfile,
  CvAnalysisResult,
  JobMatchAnalysisOutput,
  RewriteOutput,
  CoverLetterOutput,
} from '@cv-coach/shared';
import { FitLevel } from '@cv-coach/shared';
import type { AiAnalysisService } from './types.js';

/**
 * Mock AI provider — trả về dữ liệu giả có cấu trúc.
 *
 * Dùng cho dev local và test mà không cần OpenAI API key.
 * Cố gắng trích xuất một ít thông tin thật từ text để kết quả
 * trông hợp lý (vd: tìm skill phổ biến trong CV).
 */
export class MockAnalysisService implements AiAnalysisService {
  async parseResume(extractedText: string): Promise<StructuredProfile> {
    const text = extractedText.toLowerCase();
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js',
      'AWS', 'Docker', 'SQL', 'Git', 'Spring Boot', 'REST API',
    ];
    const found = commonSkills.filter((s) => text.includes(s.toLowerCase()));

    return {
      personalInfo: {
        name: 'Ứng viên (mock)',
        summary: 'Hồ sơ được phân tích bằng mock provider.',
      },
      skills: {
        technical: found.length ? found : ['JavaScript', 'React', 'Node.js'],
        soft: ['Giao tiếp', 'Làm việc nhóm', 'Giải quyết vấn đề'],
      },
      experience: [
        {
          title: 'Software Developer',
          company: 'Example Corp',
          current: true,
          description: ['Phát triển và bảo trì ứng dụng web', 'Tham gia review code'],
        },
      ],
      education: [{ degree: 'Cử nhân CNTT', institution: 'Example University', year: '2022' }],
      certifications: [],
      projects: [],
      languages: [{ name: 'Tiếng Anh', proficiency: 'Trung cấp' }],
      achievements: [],
    };
  }

  async analyzeResume(_profile: StructuredProfile): Promise<CvAnalysisResult> {
    return {
      strengths: ['Có kỹ năng kỹ thuật rõ ràng', 'Có kinh nghiệm phát triển web'],
      weaknesses: ['Chưa mô tả thành tích bằng số liệu cụ thể'],
      missingContent: ['Thiếu phần tóm tắt chuyên môn (professional summary)'],
      vagueContent: ['Mô tả kinh nghiệm còn chung chung'],
      suggestions: [
        'Bổ sung số liệu định lượng cho thành tích (vd: tăng hiệu suất 30%)',
        'Thêm phần professional summary ở đầu CV',
      ],
    };
  }

  async analyzeJobMatch(
    profile: StructuredProfile,
    _jobDescription: string,
    _jobTitle: string,
  ): Promise<JobMatchAnalysisOutput> {
    return {
      fitLevel: FitLevel.MODERATE,
      matchedSkills: profile.skills.technical.slice(0, 3),
      missingSkills: ['Docker', 'Kubernetes'],
      insufficientEvidenceSkills: ['AWS'],
      relevantExperience: ['Kinh nghiệm phát triển web phù hợp với vị trí'],
      keywordsToAdd: ['CI/CD', 'microservices'],
      strengths: ['Nền tảng kỹ thuật tốt'],
      weaknesses: ['Thiếu bằng chứng cho một số kỹ năng yêu cầu'],
      suggestions: ['Bổ sung dự án thể hiện kỹ năng DevOps'],
    };
  }

  async rewriteContent(content: string, style: string): Promise<RewriteOutput> {
    return {
      rewrittenContent: `[${style}] ${content}`,
      explanation: 'Nội dung được viết lại bằng mock provider.',
    };
  }

  async generateCoverLetter(
    _profile: StructuredProfile,
    jobTitle: string,
    companyName: string,
  ): Promise<CoverLetterOutput> {
    return {
      coverLetter: `Kính gửi ${companyName},\n\nTôi viết thư này để ứng tuyển vị trí ${jobTitle}...\n\n(Cover letter mẫu từ mock provider.)`,
      highlights: ['Nhấn mạnh kinh nghiệm phù hợp', 'Thể hiện động lực'],
    };
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    const last = messages[messages.length - 1]?.content ?? '';
    return `(Mock) Bạn vừa hỏi: "${last}". Đây là câu trả lời mẫu từ mock provider.`;
  }
}
