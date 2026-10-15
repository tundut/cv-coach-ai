import { describe, it, expect } from 'vitest';
import {
  createJobAnalysisSchema,
  uploadUrlSchema,
  sendMessageSchema,
  RESUME_LIMITS,
} from '@cv-coach/shared';

describe('uploadUrlSchema', () => {
  it('accepts valid PDF upload', () => {
    const r = uploadUrlSchema.safeParse({
      fileName: 'cv.pdf',
      mimeType: 'application/pdf',
      fileSize: 1000,
    });
    expect(r.success).toBe(true);
  });

  it('rejects non-PDF mime type', () => {
    const r = uploadUrlSchema.safeParse({
      fileName: 'cv.docx',
      mimeType: 'application/msword',
      fileSize: 1000,
    });
    expect(r.success).toBe(false);
  });

  it('rejects file exceeding max size', () => {
    const r = uploadUrlSchema.safeParse({
      fileName: 'cv.pdf',
      mimeType: 'application/pdf',
      fileSize: RESUME_LIMITS.MAX_FILE_SIZE + 1,
    });
    expect(r.success).toBe(false);
  });
});

describe('createJobAnalysisSchema', () => {
  it('rejects short job description', () => {
    const r = createJobAnalysisSchema.safeParse({
      resumeId: 'r1',
      jobTitle: 'Dev',
      jobDescription: 'too short',
    });
    expect(r.success).toBe(false);
  });

  it('accepts valid input', () => {
    const r = createJobAnalysisSchema.safeParse({
      resumeId: 'r1',
      jobTitle: 'Backend Developer',
      jobDescription: 'A'.repeat(100),
    });
    expect(r.success).toBe(true);
  });
});

describe('sendMessageSchema', () => {
  it('rejects empty message', () => {
    expect(sendMessageSchema.safeParse({ content: '' }).success).toBe(false);
  });
  it('accepts valid message', () => {
    expect(sendMessageSchema.safeParse({ content: 'Hello' }).success).toBe(true);
  });
});
