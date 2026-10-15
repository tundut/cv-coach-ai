import { describe, it, expect } from 'vitest';
import { MockAnalysisService } from './mock.js';
import {
  structuredProfileSchema,
  cvAnalysisResultSchema,
  jobMatchAnalysisSchema,
  coverLetterOutputSchema,
} from '@cv-coach/shared';

const ai = new MockAnalysisService();

describe('MockAnalysisService', () => {
  it('parseResume returns schema-valid profile', async () => {
    const profile = await ai.parseResume('JavaScript React AWS Docker experience');
    expect(() => structuredProfileSchema.parse(profile)).not.toThrow();
    // Phát hiện skill từ text
    expect(profile.skills.technical).toContain('JavaScript');
    expect(profile.skills.technical).toContain('AWS');
  });

  it('analyzeResume returns schema-valid analysis', async () => {
    const profile = await ai.parseResume('developer');
    const result = await ai.analyzeResume(profile);
    expect(() => cvAnalysisResultSchema.parse(result)).not.toThrow();
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it('analyzeJobMatch returns schema-valid match', async () => {
    const profile = await ai.parseResume('developer');
    const match = await ai.analyzeJobMatch(profile, 'JD text', 'Backend Developer');
    expect(() => jobMatchAnalysisSchema.parse(match)).not.toThrow();
    expect(['STRONG', 'MODERATE', 'NEEDS_IMPROVEMENT']).toContain(match.fitLevel);
  });

  it('generateCoverLetter returns schema-valid output', async () => {
    const profile = await ai.parseResume('developer');
    const result = await ai.generateCoverLetter(profile, 'Backend Developer', 'Acme Inc');
    expect(() => coverLetterOutputSchema.parse(result)).not.toThrow();
    expect(result.coverLetter).toContain('Acme Inc');
  });

  it('chat echoes the last question', async () => {
    const reply = await ai.chat([{ role: 'user', content: 'Hello?' }], {});
    expect(reply).toContain('Hello?');
  });
});
