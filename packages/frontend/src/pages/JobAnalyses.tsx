import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { JobAnalysis } from '@cv-coach/shared';
import { jobAnalysisApi, JobAnalysisApiError } from '../api/job-analyses.js';
import { AppHeader } from '../components/AppHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { fitLevelLabel, formatDate } from '../lib/format.js';

export default function JobAnalyses() {
  const [analyses, setAnalyses] = useState<JobAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    jobAnalysisApi
      .list()
      .then(setAnalyses)
      .catch((err) =>
        setError(err instanceof JobAnalysisApiError ? err.message : 'Không tải được danh sách'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa kết quả phân tích này?')) return;
    await jobAnalysisApi.delete(id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-mesh">
      <AppHeader />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-800">Lịch sử phân tích</h2>
          <Link
            to="/analyze"
            className="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700"
          >
            + Phân tích mới
          </Link>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {isLoading ? (
          <p className="text-gray-400">Đang tải...</p>
        ) : analyses.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">Chưa có phân tích nào. Bắt đầu phân tích CV theo công việc.</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {analyses.map((a) => {
              const fit = fitLevelLabel(a.fitLevel);
              return (
                <div key={a.id} className="flex items-center justify-between p-4">
                  <Link to={`/job-analyses/${a.id}`} className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">
                      {a.jobTitle}
                      {a.companyName ? ` · ${a.companyName}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(a.createdAt)}</p>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full border ${fit.className}`}>
                      {fit.text}
                    </span>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
