import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth, AuthError } from '../contexts/AuthContext.js';
import { AuthLayout } from '../components/AuthLayout.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Alert } from '../components/ui/Alert.js';

export default function ConfirmSignUp() {
  const { confirmSignUp, resendCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = (location.state as { email?: string })?.email ?? '';

  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await confirmSignUp(email, code);
      navigate('/login', { state: { message: 'Xác nhận thành công! Bạn có thể đăng nhập.' } });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setError('');
    setSuccess('');
    try {
      await resendCode(email);
      setSuccess('Mã xác nhận đã được gửi lại.');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Đã xảy ra lỗi');
    }
  };

  return (
    <AuthLayout
      title="Xác nhận email"
      subtitle={`Nhập mã xác nhận đã gửi đến ${email || 'email của bạn'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        {!emailFromState && (
          <Input
            label="Email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <Input
          label="Mã xác nhận"
          name="code"
          required
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="submit" isLoading={isLoading}>
          Xác nhận
        </Button>
        <button
          type="button"
          onClick={handleResend}
          className="w-full text-sm text-primary-600 hover:underline"
        >
          Gửi lại mã xác nhận
        </button>
        <div className="text-center">
          <Link to="/login" className="text-sm text-gray-500 hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
