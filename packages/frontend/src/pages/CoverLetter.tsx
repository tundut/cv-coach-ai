import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { aiWritingApi, AiWritingApiError } from '../api/ai-writing.js';
import { AppHeader } from '../components/AppHeader.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Alert } from '../components/ui/Alert.js';

const TONES = ['Chuyên nghiệp', 'Thân thiện', 'Nhiệt huyết', 'Trang trọng'];

export default function CoverLetter() {
  const [params] = useSearchParams();
  const resumeId = params.get('resumeId') ?? '';
  const jobAnalysisId = params.get('jobAnalysisId') ?? undefined;

  const [jobTitle, setJobTitle] = useState(params.get('jobTitle') ?? '');
  const [companyName, setCompanyName] = useState(params.get('companyName') ?? '');
  const [tone, setTone] = useState(TONES[0]);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResult('');
    if (!resumeId) {
      setError('Thiếu thông tin CV. Vào từ trang kết quả phân tích để tạo cover letter.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await aiWritingApi.coverLetter({
        resumeId,
        jobAnalysisId,
        companyName,
        jobTitle,
        tone,
      });
      setResult(res.coverLetter);
    } catch (err) {
      setError(err instanceof AiWritingApiError ? err.message : 'Tạo cover letter thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${companyName || 'cv-coach'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-mesh">
      <AppHeader />
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800">Tạo Cover Letter</h2>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Tên vị trí"
            name="jobTitle"
            required
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
          <Input
            label="Tên công ty"
            name="companyName"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <div className="space-y-1">
            <label htmlFor="tone" className="block text-sm font-medium text-gray-700">
              Giọng văn
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" isLoading={isLoading}>
            Tạo cover letter
          </Button>
        </form>

        {result && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Kết quả</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="text-sm text-primary-600 hover:underline"
                >
                  {copied ? 'Đã sao chép!' : 'Sao chép'}
                </button>
                <button
                  onClick={handleDownload}
                  className="text-sm text-primary-600 hover:underline"
                >
                  Tải xuống
                </button>
              </div>
            </div>
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={16}
              className="w-full whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm leading-relaxed text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        )}
      </main>
    </div>
  );
}
