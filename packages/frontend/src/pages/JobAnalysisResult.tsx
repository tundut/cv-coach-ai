import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { JobAnalysis, GeneratedDocument } from '@cv-coach/shared';
import { GeneratedDocumentType } from '@cv-coach/shared';
import { jobAnalysisApi, JobAnalysisApiError } from '../api/job-analyses.js';
import { aiWritingApi } from '../api/ai-writing.js';
import { AppHeader } from '../components/AppHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Section, BulletList, Chips } from '../components/analysis-ui.js';
import { fitLevelLabel, formatDate } from '../lib/format.js';

export default function JobAnalysisResult() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!analysisId) return;
    jobAnalysisApi
      .get(analysisId)
      .then(setAnalysis)
      .catch((err) =>
        setError(err instanceof JobAnalysisApiError ? err.message : 'Không tải được kết quả'),
      )
      .finally(() => setIsLoading(false));
    // Tải các tài liệu đã tạo cho JD này (cover letter, rewrite...)
    aiWritingApi.listDocuments(analysisId).then(setDocuments).catch(() => {});
  }, [analysisId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mesh">
        <AppHeader />
        <main className="max-w-6xl mx-auto p-6">
          <p className="text-gray-400">Đang tải...</p>
        </main>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-mesh">
        <AppHeader />
        <main className="max-w-6xl mx-auto p-6">
          <Alert variant="error">{error || 'Không tìm thấy kết quả'}</Alert>
        </main>
      </div>
    );
  }

  const fit = fitLevelLabel(analysis.fitLevel);

  return (
    <div className="min-h-screen bg-mesh">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <Link to="/job-analyses" className="text-sm text-primary-600 hover:underline">
            ← Lịch sử phân tích
          </Link>
          <h2 className="text-2xl font-semibold text-gray-800 mt-1">
            {analysis.jobTitle}
            {analysis.companyName ? ` · ${analysis.companyName}` : ''}
          </h2>
        </div>

        {/* Fit level */}
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${fit.gradient} p-6 text-white shadow-md`}
        >
          <p className="text-sm font-medium text-white/80">Mức độ phù hợp</p>
          <p className="text-3xl font-bold mt-1">{fit.text}</p>
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        </div>

        {/* JD gốc */}
        <details className="bg-white rounded-xl shadow-sm border border-gray-200">
          <summary className="cursor-pointer px-5 py-3 font-semibold text-gray-800 flex items-center justify-between">
            <span>📄 Job Description gốc</span>
            <span className="text-xs font-normal text-gray-400">Nhấn để xem</span>
          </summary>
          <div className="px-5 pb-5 space-y-3">
            {(analysis.location || analysis.workMode) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {analysis.location && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    📍 {analysis.location}
                  </span>
                )}
                {analysis.workMode && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    💼 {analysis.workMode}
                  </span>
                )}
              </div>
            )}
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 bg-gray-50 rounded p-3 max-h-96 overflow-y-auto">
              {analysis.jobDescription}
            </pre>
          </div>
        </details>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Section title="✅ Kỹ năng đã đáp ứng">
            <Chips items={analysis.matchedSkills} color="bg-green-100 text-green-700" />
          </Section>
          <Section title="❌ Kỹ năng còn thiếu">
            <Chips items={analysis.missingSkills} color="bg-red-100 text-red-700" />
          </Section>
          <Section title="❓ Kỹ năng chưa đủ bằng chứng">
            <Chips items={analysis.insufficientEvidenceSkills} color="bg-amber-100 text-amber-700" />
          </Section>
          <Section title="🔑 Từ khóa nên bổ sung">
            <Chips items={analysis.keywordsToAdd} color="bg-primary-100 text-primary-700" />
          </Section>
          <Section title="💼 Kinh nghiệm liên quan">
            <BulletList items={analysis.relevantExperience} empty="Không có" />
          </Section>
          <Section title="💪 Điểm mạnh">
            <BulletList items={analysis.strengths} empty="Không có" />
          </Section>
          <div className="lg:col-span-2">
            <Section title="💡 Gợi ý cải thiện CV theo vị trí">
              <BulletList items={analysis.suggestions} empty="Không có" />
            </Section>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            to={`/cover-letter?resumeId=${analysis.resumeId}&jobAnalysisId=${analysis.id}&jobTitle=${encodeURIComponent(analysis.jobTitle)}&companyName=${encodeURIComponent(analysis.companyName ?? '')}`}
            className="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700"
          >
            Tạo cover letter
          </Link>
          <Link
            to={`/chat?resumeId=${analysis.resumeId}&jobAnalysisId=${analysis.id}`}
            className="rounded-lg bg-gray-100 text-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-200"
          >
            Hỏi Career Assistant
          </Link>
        </div>

        {/* Cover letter / tài liệu đã lưu cho JD này */}
        {documents.length > 0 && (
          <Section title="📝 Tài liệu đã tạo cho vị trí này">
            <div className="space-y-3">
              {documents.map((doc) => (
                <details key={doc.id} className="border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer px-4 py-2.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {doc.type === GeneratedDocumentType.COVER_LETTER
                        ? '✉️ Cover Letter'
                        : '✍️ Nội dung viết lại'}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(doc.createdAt)}</span>
                  </summary>
                  <div className="px-4 pb-4 pt-1 space-y-2">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 bg-gray-50 rounded p-3">
                      {doc.content}
                    </pre>
                    <button
                      onClick={() => void navigator.clipboard.writeText(doc.content)}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Sao chép
                    </button>
                  </div>
                </details>
              ))}
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}
