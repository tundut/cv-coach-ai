import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import Dashboard from './pages/Dashboard.js';
import Resumes from './pages/Resumes.js';
import ResumeAnalysis from './pages/ResumeAnalysis.js';
import NewAnalysis from './pages/NewAnalysis.js';
import JobAnalyses from './pages/JobAnalyses.js';
import JobAnalysisResult from './pages/JobAnalysisResult.js';
import CoverLetter from './pages/CoverLetter.js';
import Chat from './pages/Chat.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import ConfirmSignUp from './pages/ConfirmSignUp.js';
import ForgotPassword from './pages/ForgotPassword.js';

/**
 * Redirect người dùng đã đăng nhập khỏi trang auth.
 */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resumes"
        element={
          <ProtectedRoute>
            <Resumes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resumes/:resumeId"
        element={
          <ProtectedRoute>
            <ResumeAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analyze"
        element={
          <ProtectedRoute>
            <NewAnalysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-analyses"
        element={
          <ProtectedRoute>
            <JobAnalyses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-analyses/:analysisId"
        element={
          <ProtectedRoute>
            <JobAnalysisResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cover-letter"
        element={
          <ProtectedRoute>
            <CoverLetter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />

      {/* Auth routes — chỉ cho guest */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        }
      />
      <Route
        path="/confirm-signup"
        element={
          <GuestRoute>
            <ConfirmSignUp />
          </GuestRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPassword />
          </GuestRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
