import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Bảo vệ route yêu cầu xác thực.
 * Hiển thị loading khi đang kiểm tra auth,
 * redirect sang /login nếu chưa đăng nhập.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Đang kiểm tra...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
