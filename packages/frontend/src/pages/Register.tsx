import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, AuthError } from '../contexts/AuthContext.js';
import { AuthLayout } from '../components/AuthLayout.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { Alert } from '../components/ui/Alert.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên';
    if (!email.trim()) errors.email = 'Vui lòng nhập email';
    if (password.length < 8) errors.password = 'Mật khẩu tối thiểu 8 ký tự';
    else if (!/[a-z]/.test(password)) errors.password = 'Cần ít nhất 1 chữ thường';
    else if (!/[A-Z]/.test(password)) errors.password = 'Cần ít nhất 1 chữ hoa';
    else if (!/[0-9]/.test(password)) errors.password = 'Cần ít nhất 1 chữ số';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setIsLoading(true);

    try {
      await register(email, password, fullName);
      navigate('/confirm-signup', { state: { email } });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng ký"
      subtitle="Tạo tài khoản để bắt đầu cải thiện CV"
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Input
          label="Họ và tên"
          name="fullName"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={fieldErrors.fullName}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <Input
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <p className="text-xs text-gray-400">
          Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số
        </p>
        <Button type="submit" isLoading={isLoading}>
          Đăng ký
        </Button>
      </form>
    </AuthLayout>
  );
}
