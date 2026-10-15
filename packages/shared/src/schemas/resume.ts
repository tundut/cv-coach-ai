import { z } from 'zod';
import { RESUME_LIMITS } from '../constants.js';

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1, 'Tên file không hợp lệ').max(255),
  mimeType: z.enum(RESUME_LIMITS.ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: 'Chỉ hỗ trợ file PDF' }),
  }),
  fileSize: z
    .number()
    .int()
    .positive('Kích thước file không hợp lệ')
    .max(RESUME_LIMITS.MAX_FILE_SIZE, 'File vượt quá 5MB'),
});

export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
