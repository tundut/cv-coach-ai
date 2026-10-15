import { z } from 'zod';

/**
 * Ép giá trị về array trước khi validate.
 *
 * LLM đôi khi trả về object đơn, null, hoặc bỏ qua field thay vì array rỗng.
 * Helper này chuẩn hóa:
 *   undefined/null  → []
 *   object đơn      → [object]
 *   array           → giữ nguyên
 */
function arrayOf<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (val === undefined || val === null) return [];
    if (Array.isArray(val)) return val;
    return [val];
  }, z.array(schema));
}

// ─── Structured Profile Schema ──────────────────────

export const personalInfoSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
  summary: z.string().optional(),
});

export const skillSetSchema = z.object({
  technical: arrayOf(z.string()),
  soft: arrayOf(z.string()),
});

export const workExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional().default(false),
  description: arrayOf(z.string()),
});

export const educationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.string().optional(),
  gpa: z.string().optional(),
});

export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  year: z.string().optional(),
});

export const projectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: arrayOf(z.string()),
  url: z.string().optional(),
});

export const languageSchema = z.object({
  name: z.string(),
  proficiency: z.string(),
});

export const structuredProfileSchema = z.object({
  personalInfo: personalInfoSchema,
  skills: skillSetSchema,
  experience: arrayOf(workExperienceSchema),
  education: arrayOf(educationSchema),
  certifications: arrayOf(certificationSchema),
  projects: arrayOf(projectSchema),
  languages: arrayOf(languageSchema),
  achievements: arrayOf(z.string()),
});

// ─── CV Analysis Schema ─────────────────────────────

export const cvAnalysisResultSchema = z.object({
  strengths: arrayOf(z.string()),
  weaknesses: arrayOf(z.string()),
  missingContent: arrayOf(z.string()),
  vagueContent: arrayOf(z.string()),
  suggestions: arrayOf(z.string()),
});

// ─── Job Match Analysis Schema ──────────────────────

export const fitLevelSchema = z.enum(['STRONG', 'MODERATE', 'NEEDS_IMPROVEMENT']);

export const jobMatchAnalysisSchema = z.object({
  fitLevel: fitLevelSchema,
  matchedSkills: arrayOf(z.string()),
  missingSkills: arrayOf(z.string()),
  insufficientEvidenceSkills: arrayOf(z.string()),
  relevantExperience: arrayOf(z.string()),
  keywordsToAdd: arrayOf(z.string()),
  strengths: arrayOf(z.string()),
  weaknesses: arrayOf(z.string()),
  suggestions: arrayOf(z.string()),
});

// ─── Rewrite Output Schema ──────────────────────────

export const rewriteOutputSchema = z.object({
  rewrittenContent: z.string(),
  explanation: z.string(),
});

// ─── Cover Letter Output Schema ─────────────────────

export const coverLetterOutputSchema = z.object({
  coverLetter: z.string(),
  highlights: z.array(z.string()),
});

// ─── Inferred Types ─────────────────────────────────

export type StructuredProfileOutput = z.infer<typeof structuredProfileSchema>;
export type CvAnalysisOutput = z.infer<typeof cvAnalysisResultSchema>;
export type JobMatchAnalysisOutput = z.infer<typeof jobMatchAnalysisSchema>;
export type RewriteOutput = z.infer<typeof rewriteOutputSchema>;
export type CoverLetterOutput = z.infer<typeof coverLetterOutputSchema>;
