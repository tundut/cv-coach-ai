import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Resume } from '@cv-coach/shared';
import { RESUME_LIMITS, AnalysisStatus } from '@cv-coach/shared';
import { resumeApi, ResumeApiError } from '../api/resumes.js';
import { AppHeader } from '../components/AppHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { formatFileSize, formatDate, statusLabel } from '../lib/format.js';

export default function Resumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumes = async () => {
    try {
      const data = await resumeApi.list();
      setResumes(data);
    } catch (err) {
      setError(err instanceof ResumeApiError ? err.message : 'Không tải được danh sách CV');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadResumes();
  }, []);

  // Polling: nếu có CV đang xử lý, refetch mỗi 3s
  useEffect(() => {
    const hasProcessing = resumes.some(
      (r) =>
        r.analysisStatus === AnalysisStatus.PENDING ||
        r.analysisStatus === AnalysisStatus.PROCESSING,
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      void loadResumes();
    }, 3000);
    return () => clearInterval(interval);
  }, [resumes]);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');

    // Validate phía client trước
    if (file.type !== 'application/pdf') {
      setError('Chỉ hỗ trợ file PDF');
      return;
    }
    if (file.size > RESUME_LIMITS.MAX_FILE_SIZE) {
      setError('File vượt quá 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Lấy presigned URL + tạo metadata
      const { uploadUrl } = await resumeApi.getUploadUrl({
        fileName: file.name,
        mimeType: 'application/pdf',
        fileSize: file.size,
      });

      // 2. Upload trực tiếp lên S3
      await resumeApi.uploadToS3(uploadUrl, file);

      setSuccess(`Đã tải lên "${file.name}" thành công`);
      await loadResumes();
    } catch (err) {
      setError(err instanceof ResumeApiError ? err.message : 'Tải CV lên thất bại');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (resume: Resume) => {
    if (!confirm(`Xóa CV "${resume.fileName}"?`)) return;
    setError('');
    try {
      await resumeApi.delete(resume.id);
      setResumes((prev) => prev.filter((r) => r.id !== resume.id));
    } catch (err) {
      setError(err instanceof ResumeApiError ? err.message : 'Xóa CV thất bại');
    }
  };

  const handleSetDefault = async (resume: Resume) => {
    setError('');
    try {
      await resumeApi.setDefault(resume.id);
      setResumes((prev) =>
        prev.map((r) => ({ ...r, isDefault: r.id === resume.id })),
      );
    } catch (err) {
      setError(err instanceof ResumeApiError ? err.message : 'Đặt mặc định thất bại');
    }
  };

  const handleAnalyze = async (resume: Resume) => {
    setError('');
    try {
      await resumeApi.analyze(resume.id);
      // Cập nhật trạng thái tạm thời để polling bắt đầu
      setResumes((prev) =>
        prev.map((r) =>
          r.id === resume.id ? { ...r, analysisStatus: AnalysisStatus.PENDING } : r,
        ),
      );
    } catch (err) {
      setError(err instanceof ResumeApiError ? err.message : 'Bắt đầu phân tích thất bại');
    }
  };

  return (
    <div className="min-h-screen bg-mesh">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">CV của tôi</h2>
            <p className="text-slate-500 mt-0.5">Tải CV PDF lên để AI phân tích.</p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="resume-upload"
            />
            <label
              htmlFor="resume-upload"
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white cursor-pointer shadow-sm transition-all ${
                isUploading
                  ? 'bg-primary-400 cursor-wait'
                  : 'bg-primary-600 hover:bg-primary-700 hover:shadow-md active:scale-[0.98]'
              }`}
            >
              {isUploading ? 'Đang tải lên...' : '＋ Tải CV lên'}
            </label>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {isLoading ? (
          <p className="text-slate-400">Đang tải...</p>
        ) : resumes.length === 0 ? (
          <div className="card border-dashed p-14 text-center space-y-3">
            <div className="text-5xl">📄</div>
            <p className="text-slate-600 font-medium">Chưa có CV nào</p>
            <p className="text-sm text-slate-400">
              Tải CV PDF đầu tiên của bạn lên để bắt đầu phân tích.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {resumes.map((resume) => {
              const status = statusLabel(resume.analysisStatus);
              return (
                <div
                  key={resume.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xl" aria-hidden="true">
                      📄
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 truncate">{resume.fileName}</p>
                        {resume.isDefault && (
                          <span className="badge bg-primary-100 text-primary-700">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatFileSize(resume.fileSize)} · {formatDate(resume.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`badge ${status.className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                      {status.text}
                    </span>

                    {resume.analysisStatus === AnalysisStatus.COMPLETED && (
                      <Link
                        to={`/resumes/${resume.id}`}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Xem kết quả
                      </Link>
                    )}

                    {(resume.analysisStatus === AnalysisStatus.COMPLETED ||
                      resume.analysisStatus === AnalysisStatus.FAILED) && (
                      <button
                        onClick={() => handleAnalyze(resume)}
                        className="text-xs text-slate-500 hover:text-primary-600"
                      >
                        Phân tích lại
                      </button>
                    )}

                    {resume.analysisStatus === AnalysisStatus.PENDING &&
                      !resume.structuredProfile && (
                        <button
                          onClick={() => handleAnalyze(resume)}
                          className="text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Phân tích
                        </button>
                      )}

                    {!resume.isDefault && (
                      <button
                        onClick={() => handleSetDefault(resume)}
                        className="text-xs text-slate-500 hover:text-primary-600"
                      >
                        Đặt mặc định
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(resume)}
                      className="text-xs text-slate-400 hover:text-red-500"
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
