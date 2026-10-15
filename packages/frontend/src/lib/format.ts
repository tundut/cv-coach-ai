import { AnalysisStatus } from '@cv-coach/shared';

/** Định dạng kích thước file sang KB/MB. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Định dạng thời gian ISO sang chuỗi dễ đọc. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Nhãn + màu + gradient cho fit level. */
export function fitLevelLabel(level: string): {
  text: string;
  className: string;
  gradient: string;
} {
  switch (level) {
    case 'STRONG':
      return {
        text: 'Phù hợp cao',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        gradient: 'from-emerald-500 to-green-600',
      };
    case 'MODERATE':
      return {
        text: 'Phù hợp vừa',
        className: 'bg-amber-100 text-amber-700 border-amber-300',
        gradient: 'from-amber-500 to-orange-500',
      };
    case 'NEEDS_IMPROVEMENT':
      return {
        text: 'Cần cải thiện',
        className: 'bg-red-100 text-red-700 border-red-300',
        gradient: 'from-red-500 to-rose-600',
      };
    default:
      return {
        text: level,
        className: 'bg-slate-100 text-slate-600 border-slate-300',
        gradient: 'from-slate-400 to-slate-500',
      };
  }
}

/** Nhãn + màu + dot cho trạng thái phân tích. */
export function statusLabel(status: AnalysisStatus): {
  text: string;
  className: string;
  dot: string;
} {
  switch (status) {
    case AnalysisStatus.PENDING:
      return { text: 'Chờ xử lý', className: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
    case AnalysisStatus.PROCESSING:
      return { text: 'Đang phân tích', className: 'bg-primary-100 text-primary-700', dot: 'bg-primary-500 animate-pulse' };
    case AnalysisStatus.COMPLETED:
      return { text: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
    case AnalysisStatus.FAILED:
      return { text: 'Thất bại', className: 'bg-red-100 text-red-700', dot: 'bg-red-500' };
    default:
      return { text: status, className: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  }
}
