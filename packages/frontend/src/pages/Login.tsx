import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, AuthError } from '../contexts/AuthContext.js';
import { AuthLayout } from '../components/AuthLayout.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Alert } from '../components/ui/Alert.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { message?: string })?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err instanceof AuthError && err.code === 'USER_NOT_CONFIRMED') {
        navigate('/confirm-signup', { state: { email } });
        return;
      }
      setError(err instanceof AuthError ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Đăng nhập để phân tích và cải thiện CV của bạn"
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-primary-600 hover:underline font-medium">
            Đăng ký
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        <Button type="submit" isLoading={isLoading}>
          Đăng nhập
        </Button>
      </form>
    </AuthLayout>
  );
}
