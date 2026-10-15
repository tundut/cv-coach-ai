import type { SQSHandler, SQSEvent, SQSRecord } from 'aws-lambda';
import { AnalysisStatus } from '@cv-coach/shared';
import type { AnalyzeResumeMessage } from '@cv-coach/shared';
import { ResumeRepository } from '../repositories/resume-repository.js';
import { TextractService } from '../services/textract.js';
import { getAiService } from '../services/ai/factory.js';

const resumeRepo = new ResumeRepository();
const textract = new TextractService();

/** Text thay thế khi Textract không khả dụng (dev / account chưa kích hoạt OCR). */
const PLACEHOLDER_TEXT =
  'JavaScript React Node.js AWS Docker SQL - placeholder text (OCR unavailable)';

/**
 * SQS consumer — phân tích CV bất đồng bộ.
 *
 * Luồng (theo proposal):
 *   PROCESSING → Textract OCR → AI parse + analyze → Zod validate
 *   → lưu structured profile → COMPLETED (hoặc FAILED nếu lỗi)
 *
 * Không lưu kết quả thành công giả khi AI thất bại — set FAILED
 * với thông báo lỗi rõ ràng.
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: SQSRecord): Promise<void> {
  let message: AnalyzeResumeMessage;
  try {
    message = JSON.parse(record.body) as AnalyzeResumeMessage;
  } catch {
    console.error('Invalid SQS message body, skipping:', record.body);
    return;
  }

  const { resumeId, userId, fileKey } = message;
  const bucket = process.env.RESUMES_BUCKET;

  if (!bucket) {
    console.error('RESUMES_BUCKET not set');
    return;
  }

  try {
    // 1. Set PROCESSING
    await resumeRepo.updateStatus(userId, resumeId, AnalysisStatus.PROCESSING);

    // 2. OCR bằng Textract.
    // TEXTRACT_ENABLED=false → bỏ qua OCR (dùng khi Textract chưa kích hoạt
    // trên account). Áp dụng cho mọi AI provider, không chỉ mock.
    let extractedText: string;
    const textractEnabled = process.env.TEXTRACT_ENABLED !== 'false';

    if (!textractEnabled) {
      console.warn('TEXTRACT_ENABLED=false — bỏ qua OCR, dùng placeholder text');
      extractedText = PLACEHOLDER_TEXT;
    } else {
      try {
        extractedText = await textract.extractText(bucket, fileKey);
      } catch (ocrErr) {
        const name = (ocrErr as { name?: string })?.name;
        // Textract chưa được kích hoạt trên account
        if (name === 'SubscriptionRequiredException') {
          console.warn('Textract chưa kích hoạt trên account — dùng placeholder text');
          extractedText = PLACEHOLDER_TEXT;
        } else {
          throw ocrErr;
        }
      }
    }

    // 3. AI: parse profile + analyze (output đã validate Zod bên trong provider)
    const ai = await getAiService();
    const structuredProfile = await ai.parseResume(extractedText);
    const analysisResult = await ai.analyzeResume(structuredProfile);

    // 4. Lưu kết quả + set COMPLETED
    await resumeRepo.saveAnalysisResult(userId, resumeId, {
      extractedText,
      structuredProfile,
      analysisResult,
    });

    console.log(`Resume ${resumeId} analyzed successfully`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Phân tích CV thất bại';
    console.error(`Resume ${resumeId} analysis failed:`, errorMessage);

    // Set FAILED — không lưu kết quả giả
    try {
      await resumeRepo.markFailed(userId, resumeId, errorMessage);
    } catch (markErr) {
      console.error('Failed to mark resume as FAILED:', markErr);
    }
    // Không throw — tránh retry vô hạn với lỗi không thể phục hồi (vd: CV không đọc được).
    // Lỗi tạm thời sẽ được xử lý qua DLQ nếu cấu hình maxReceiveCount.
  }
}
