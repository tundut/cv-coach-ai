import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Resume } from '@cv-coach/shared';
import { AnalysisStatus } from '@cv-coach/shared';
import { resumeApi } from '../api/resumes.js';
import { jobAnalysisApi, JobAnalysisApiError } from '../api/job-analyses.js';
import { AppHeader } from '../components/AppHeader.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Alert } from '../components/ui/Alert.js';

export default function NewAnalysis() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    resumeApi.list().then((all) => {
      const analyzed = all.filter((r) => r.analysisStatus === AnalysisStatus.COMPLETED);
      setResumes(analyzed);
      const def = analyzed.find((r) => r.isDefault) ?? analyzed[0];
      if (def) setResumeId(def.id);
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resumeId) {
      setError('Vui lòng chọn CV đã phân tích');
      return;
    }
    setIsLoading(true);
    try {
      const result = await jobAnalysisApi.create({
        resumeId,
        jobTitle,
        companyName: companyName || undefined,
        jobDescription,
        location: location || undefined,
      });
      navigate(`/job-analyses/${result.id}`);
    } catch (err) {
      setError(err instanceof JobAnalysisApiError ? err.message : 'Phân tích thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh">
      <AppHeader />
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Phân tích theo công việc</h2>

        {resumes.length === 0 ? (
          <Alert variant="info">
            Bạn cần có ít nhất một CV đã phân tích. Hãy upload và phân tích CV trước.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div className="space-y-1">
              <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
                Chọn CV
              </label>
              <select
                id="resume"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fileName}
                    {r.isDefault ? ' (mặc định)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Tên vị trí"
              name="jobTitle"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="VD: Backend Developer"
            />
            <Input
              label="Tên công ty (tùy chọn)"
              name="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Input
              label="Địa điểm (tùy chọn)"
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <div className="space-y-1">
              <label htmlFor="jd" className="block text-sm font-medium text-gray-700">
                Job Description
              </label>
              <textarea
                id="jd"
                required
                rows={10}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Dán mô tả công việc vào đây..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            <Button type="submit" isLoading={isLoading}>
              Phân tích mức độ phù hợp
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
