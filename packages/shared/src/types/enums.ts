/**
 * Trạng thái phân tích CV.
 */
export enum AnalysisStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Mức độ phù hợp giữa CV và Job Description.
 */
export enum FitLevel {
  STRONG = 'STRONG',
  MODERATE = 'MODERATE',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
}

/**
 * Loại tài liệu được AI tạo.
 */
export enum GeneratedDocumentType {
  COVER_LETTER = 'COVER_LETTER',
  REWRITTEN_SUMMARY = 'REWRITTEN_SUMMARY',
  REWRITTEN_EXPERIENCE = 'REWRITTEN_EXPERIENCE',
}

/**
 * Vai trò trong cuộc hội thoại chat.
 */
export enum ChatRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
}

/**
 * Phong cách viết lại nội dung CV.
 */
export enum RewriteStyle {
  PROFESSIONAL = 'PROFESSIONAL',
  CONCISE = 'CONCISE',
  ACHIEVEMENT_FOCUSED = 'ACHIEVEMENT_FOCUSED',
  JOB_OPTIMIZED = 'JOB_OPTIMIZED',
  BULLET_POINTS = 'BULLET_POINTS',
  QUANTIFIED = 'QUANTIFIED',
}
