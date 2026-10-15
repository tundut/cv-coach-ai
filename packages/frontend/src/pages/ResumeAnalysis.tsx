import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Resume } from '@cv-coach/shared';
import { AnalysisStatus } from '@cv-coach/shared';
import { resumeApi, ResumeApiError } from '../api/resumes.js';
import { AppHeader } from '../components/AppHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Section, BulletList, Chips } from '../components/analysis-ui.js';

export default function ResumeAnalysis() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resumeId) return;
    resumeApi
      .get(resumeId)
      .then(setResume)
      .catch((err) =>
        setError(err instanceof ResumeApiError ? err.message : 'Không tải được CV'),
      )
      .finally(() => setIsLoading(false));
  }, [resumeId]);

  const renderContent = () => {
    if (isLoading) return <p className="text-gray-400">Đang tải...</p>;
    if (error) return <Alert variant="error">{error}</Alert>;
    if (!resume) return <Alert variant="error">Không tìm thấy CV</Alert>;

    if (resume.analysisStatus === AnalysisStatus.FAILED) {
      return (
        <Alert variant="error">
          Phân tích thất bại: {resume.errorMessage ?? 'Lỗi không xác định'}
        </Alert>
      );
    }

    if (resume.analysisStatus !== AnalysisStatus.COMPLETED) {
      return (
        <Alert variant="info">
          CV đang được phân tích. Vui lòng quay lại sau giây lát.
        </Alert>
      );
    }

    const profile = resume.structuredProfile;
    const analysis = resume.analysisResult;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Kỹ năng */}
        <Section title="🛠 Kỹ năng kỹ thuật">
          <Chips items={profile?.skills.technical ?? []} color="bg-primary-100 text-primary-700" />
        </Section>
        <Section title="🤝 Kỹ năng mềm">
          <Chips items={profile?.skills.soft ?? []} color="bg-gray-100 text-gray-700" />
        </Section>

        {/* Điểm mạnh / yếu */}
        <Section title="✅ Điểm mạnh">
          <BulletList items={analysis?.strengths ?? []} empty="Chưa có đánh giá" />
        </Section>
        <Section title="⚠️ Điểm cần cải thiện">
          <BulletList items={analysis?.weaknesses ?? []} empty="Chưa có đánh giá" />
        </Section>

        {/* Nội dung thiếu / chung chung */}
        <Section title="📋 Nội dung còn thiếu">
          <BulletList items={analysis?.missingContent ?? []} empty="Không có" />
        </Section>
        <Section title="💬 Nội dung quá chung chung">
          <BulletList items={analysis?.vagueContent ?? []} empty="Không có" />
        </Section>

        {/* Gợi ý — full width */}
        <div className="lg:col-span-2">
          <Section title="💡 Gợi ý cải thiện">
            <BulletList items={analysis?.suggestions ?? []} empty="Chưa có gợi ý" />
          </Section>
        </div>

        {/* Kinh nghiệm */}
        {profile?.experience && profile.experience.length > 0 && (
          <div className="lg:col-span-2">
            <Section title="💼 Kinh nghiệm làm việc">
              <div className="space-y-3">
                {profile.experience.map((exp, i) => (
                  <div key={i} className="border-l-2 border-primary-200 pl-3">
                    <p className="font-medium text-gray-800">
                      {exp.title} · {exp.company}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {exp.description.map((d, j) => (
                        <li key={j} className="text-sm text-gray-600">
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-mesh">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/resumes" className="text-sm text-primary-600 hover:underline">
              ← Danh sách CV
            </Link>
            <h2 className="text-2xl font-semibold text-gray-800 mt-1">
              {resume?.fileName ?? 'Kết quả phân tích'}
            </h2>
          </div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
