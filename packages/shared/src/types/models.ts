import {
  AnalysisStatus,
  ChatRole,
  FitLevel,
  GeneratedDocumentType,
} from './enums.js';

// ─── User ───────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Resume ─────────────────────────────────────────

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  extractedText?: string;
  structuredProfile?: StructuredProfile;
  analysisResult?: CvAnalysisResult;
  analysisStatus: AnalysisStatus;
  errorMessage?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Structured Profile (AI output) ─────────────────

export interface StructuredProfile {
  personalInfo: PersonalInfo;
  skills: SkillSet;
  experience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  languages: Language[];
  achievements: string[];
}

export interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  summary?: string;
}

export interface SkillSet {
  technical: string[];
  soft: string[];
}

export interface WorkExperience {
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  description: string[];
}

export interface Education {
  degree: string;
  institution: string;
  year?: string;
  gpa?: string;
}

export interface Certification {
  name: string;
  issuer?: string;
  year?: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface Language {
  name: string;
  proficiency: string;
}

// ─── CV Analysis (standalone) ───────────────────────

export interface CvAnalysisResult {
  strengths: string[];
  weaknesses: string[];
  missingContent: string[];
  vagueContent: string[];
  suggestions: string[];
}

// ─── Job Analysis ───────────────────────────────────

export interface JobAnalysis {
  id: string;
  userId: string;
  resumeId: string;
  jobTitle: string;
  companyName?: string;
  jobDescription: string;
  location?: string;
  workMode?: string;
  fitLevel: FitLevel;
  matchedSkills: string[];
  missingSkills: string[];
  insufficientEvidenceSkills: string[];
  relevantExperience: string[];
  keywordsToAdd: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  createdAt: string;
}

// ─── Generated Document ─────────────────────────────

export interface GeneratedDocument {
  id: string;
  userId: string;
  type: GeneratedDocumentType;
  content: string;
  sourceResumeId?: string;
  sourceJobAnalysisId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Chat ───────────────────────────────────────────

export interface ChatSession {
  id: string;
  userId: string;
  resumeId?: string;
  jobAnalysisId?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}
