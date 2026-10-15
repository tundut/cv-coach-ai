import { z } from 'zod';
import { JOB_DESCRIPTION_LIMITS } from '../constants.js';

export const createJobAnalysisSchema = z.object({
  resumeId: z.string().min(1, 'Vui lòng chọn CV'),
  jobTitle: z.string().min(1, 'Vui lòng nhập tên vị trí').max(200),
  companyName: z.string().max(200).optional(),
  jobDescription: z
    .string()
    .min(JOB_DESCRIPTION_LIMITS.MIN_LENGTH, 'Job Description quá ngắn')
    .max(JOB_DESCRIPTION_LIMITS.MAX_LENGTH, 'Job Description quá dài'),
  location: z.string().max(200).optional(),
  workMode: z.string().max(100).optional(),
});

export type CreateJobAnalysisInput = z.infer<typeof createJobAnalysisSchema>;
