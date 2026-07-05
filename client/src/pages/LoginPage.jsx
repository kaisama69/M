import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Invalid email or password.');
        throw new Error(data.error || 'Failed to log in.');
      }

      showToast('Logged in successfully!', 'success');
      
      // Store user information in local storage
      localStorage.setItem('mindscale_user', JSON.stringify(data.user));
      
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }

      // Small delay to allow toast to be visible
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate demo user.');
      }
      showToast('Logged in as Demo User!', 'success');
      localStorage.setItem('mindscale_user', JSON.stringify(data.user));
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error launching guest account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {toast.show && <Toast message={toast.message} type={toast.type} />}

      <div className="w-full max-w-[450px] bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[24px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-neutral/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-[60px] h-[60px] bg-gradient-to-br from-primary to-primary/50 rounded-2xl flex items-center justify-center text-[1.75rem] text-white shadow-[0_0_25px_rgba(139,92,246,0.4)] mx-auto mb-4">
            <i className="fa-solid fa-brain"></i>
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-br from-white via-white to-violet-400 bg-clip-text text-transparent tracking-tight mb-2">
            MindScale
          </h1>
          <p className="text-textSecondary text-[0.95rem]">
            Sign in to track your mental well-being
          </p>
        </div>

        {/* Inline Error Banner */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-negative/10 border border-negative/20 rounded-xl flex items-center gap-3 animate-shake">
            <i className="fa-solid fa-circle-exclamation text-negative text-lg flex-shrink-0"></i>
            <p className="text-negative text-[0.9rem] font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[0.9rem] font-semibold text-textSecondary flex items-center">
              <i className="fa-regular fa-envelope mr-2 text-primary/80"></i>
              Email Address
            </label>
            <input
              type="email"
              required
              className={`w-full px-4 py-3 bg-white/[0.02] border rounded-xl text-white text-[1rem] outline-none transition-all duration-300 focus:border-primary/40 focus:bg-white/[0.04] ${errorMessage ? 'border-negative/30' : 'border-white/[0.08]'}`}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.9rem] font-semibold text-textSecondary flex items-center">
              <i className="fa-solid fa-lock mr-2 text-primary/80"></i>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className={`w-full px-4 py-3 pr-12 bg-white/[0.02] border rounded-xl text-white text-[1rem] outline-none transition-all duration-300 focus:border-primary/40 focus:bg-white/[0.04] ${errorMessage ? 'border-negative/30' : 'border-white/[0.08]'}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-white transition-colors p-1"
                tabIndex={-1}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-[0.95rem]`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-primary to-violet-600 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <i className="fa-solid fa-arrow-right"></i>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDemoClick}
            className="w-full py-3 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] text-textPrimary font-semibold rounded-xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
            disabled={isLoading}
          >
            <span>Explore as Guest / Demo</span>
            <i className="fa-solid fa-circle-play text-primary/80"></i>
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-8 pt-6 border-t border-white/[0.05]">
          <p className="text-textMuted text-[0.9rem]">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-semibold transition-all">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
