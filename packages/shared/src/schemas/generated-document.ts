import { z } from 'zod';
import { RewriteStyle } from '../types/enums.js';

export const rewriteRequestSchema = z.object({
  resumeId: z.string().min(1),
  content: z.string().min(1, 'Vui lòng nhập nội dung cần viết lại').max(5000),
  style: z.nativeEnum(RewriteStyle),
  jobAnalysisId: z.string().optional(),
});

export const coverLetterRequestSchema = z.object({
  resumeId: z.string().min(1),
  jobAnalysisId: z.string().optional(),
  companyName: z.string().min(1, 'Vui lòng nhập tên công ty').max(200),
  jobTitle: z.string().min(1, 'Vui lòng nhập tên vị trí').max(200),
  tone: z.string().max(100).optional(),
});

export type RewriteRequestInput = z.infer<typeof rewriteRequestSchema>;
export type CoverLetterRequestInput = z.infer<typeof coverLetterRequestSchema>;
