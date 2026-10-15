import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, AuthError } from '../contexts/AuthContext.js';
import { AuthLayout } from '../components/AuthLayout.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Alert } from '../components/ui/Alert.js';

type Step = 'request' | 'confirm';

export default function ForgotPassword() {
  const { forgotPassword, confirmForgotPassword } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await confirmForgotPassword(email, code, newPassword);
      navigate('/login', { state: { message: 'Đặt lại mật khẩu thành công!' } });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Quên mật khẩu"
      subtitle={
        step === 'request'
          ? 'Nhập email để nhận mã xác nhận'
          : `Nhập mã xác nhận đã gửi đến ${email}`
      }
      footer={
        <Link to="/login" className="text-primary-600 hover:underline font-medium">
          Quay lại đăng nhập
        </Link>
      }
    >
      {step === 'request' ? (
        <form onSubmit={handleRequest} className="space-y-4">
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
          <Button type="submit" isLoading={isLoading}>
            Gửi mã xác nhận
          </Button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Mã xác nhận"
            name="code"
            required
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Input
            label="Mật khẩu mới"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="text-xs text-gray-400">
            Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số
          </p>
          <Button type="submit" isLoading={isLoading}>
            Đặt lại mật khẩu
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
