import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();

  // Password validation rules
  const [validation, setValidation] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // Run validation whenever password changes
  useEffect(() => {
    setValidation({
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(validation).every(Boolean);

  const handleSendCode = async () => {
    if (!email.trim()) {
      showToast('Please enter an email address first.', 'error');
      return;
    }
    // Simple email regex
    if (!/[^@]+@[^@]+\.[^@]+/.test(email)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    setIsSendingCode(true);
    setDemoCode('');
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setIsCodeSent(true);
      if (data.is_mocked) {
        setDemoCode(data.mock_code);
        showToast('Demo Mode: Code generated! Copy it from the terminal or the banner below.', 'success');
      } else {
        showToast('Verification code sent to your email!', 'success');
      }
    } catch (error) {
      console.error('Error sending code:', error);
      showToast(error.message || 'Error requesting code.', 'error');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password || !code.trim()) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    if (!isPasswordValid) {
      showToast('Password does not meet all complexity requirements.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          code: code.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      showToast('Account created successfully! Redirecting to login...', 'success');
      
      // Delay to show toast
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error) {
      console.error('Signup error:', error);
      showToast(error.message || 'Registration failed. Try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      {toast.show && <Toast message={toast.message} type={toast.type} />}

      <div className="w-full max-w-[500px] bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-[24px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-neutral/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-[60px] h-[60px] bg-gradient-to-br from-primary to-primary/50 rounded-2xl flex items-center justify-center text-[1.75rem] text-white shadow-[0_0_25px_rgba(139,92,246,0.4)] mx-auto mb-4">
            <i className="fa-solid fa-user-plus"></i>
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-br from-white via-white to-violet-400 bg-clip-text text-transparent tracking-tight mb-2">
            Create Account
          </h1>
          <p className="text-textSecondary text-[0.95rem]">
            Register to start tracking your mental health journey
          </p>
        </div>

        {/* Demo Mode Code Banner */}
        {demoCode && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl text-center">
            <p className="text-primary text-[0.9rem] font-semibold mb-1">
              <i className="fa-solid fa-circle-info mr-2"></i>
              Demo Mode Active
            </p>
            <p className="text-white text-[0.85rem] mb-2">
              SMTP settings are not configured. The verification code logged to your server is:
            </p>
            <div className="inline-block px-4 py-1.5 bg-black/40 border border-primary/30 rounded-lg text-lg font-mono font-bold text-white tracking-widest">
              {demoCode}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email input + Send Verification button */}
          <div className="flex flex-col gap-2">
            <label className="text-[0.9rem] font-semibold text-textSecondary flex items-center">
              <i className="fa-regular fa-envelope mr-2 text-primary/80"></i>
              Email Address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                className="flex-1 px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white text-[1rem] outline-none transition-all duration-300 focus:border-primary/40 focus:bg-white/[0.04] disabled:opacity-60"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSendingCode || isLoading || isCodeSent}
              />
              <button
                type="button"
                onClick={handleSendCode}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[0.9rem] font-medium transition-all hover:bg-white/10 active:scale-[0.97] flex items-center justify-center min-w-[120px] disabled:opacity-50 disabled:pointer-events-none"
                disabled={isSendingCode || isLoading || isCodeSent}
              >
                {isSendingCode ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : isCodeSent ? (
                  <span>Code Sent</span>
                ) : (
                  <span>Send Code</span>
                )}
              </button>
            </div>
            {isCodeSent && (
              <span className="text-[0.8rem] text-primary mt-1">
                Email locked. If you need to change it, refresh the page.
              </span>
            )}
          </div>

          {/* Verification Code field (renders/activates only after sending) */}
          <div className={`flex flex-col gap-2 transition-all duration-300 ${isCodeSent ? 'opacity-100 max-h-40' : 'opacity-40 pointer-events-none select-none max-h-40'}`}>
            <label className="text-[0.9rem] font-semibold text-textSecondary flex items-center">
              <i className="fa-solid fa-key mr-2 text-primary/80"></i>
              Verification Code
            </label>
            <input
              type="text"
              required
              disabled={!isCodeSent || isLoading}
              className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white text-[1rem] font-mono tracking-widest outline-none transition-all duration-300 focus:border-primary/40 focus:bg-white/[0.04]"
              placeholder="123456"
              maxLength="6"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          {/* Password field */}
          <div className="flex flex-col gap-2">
            <label className="text-[0.9rem] font-semibold text-textSecondary flex items-center">
              <i className="fa-solid fa-lock mr-2 text-primary/80"></i>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full px-4 py-3 pr-12 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white text-[1rem] outline-none transition-all duration-300 focus:border-primary/40 focus:bg-white/[0.04]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Password Validation UI */}
            <div className="mt-2 p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl flex flex-col gap-2">
              <p className="text-[0.8rem] font-semibold text-textSecondary mb-1">
                Password Requirements:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className={`flex items-center text-[0.8rem] transition-colors ${validation.minLength ? 'text-positive' : 'text-textMuted'}`}>
                  <i className={`fa-solid ${validation.minLength ? 'fa-circle-check' : 'fa-circle-dot'} mr-2`}></i>
                  Min. 8 characters
                </div>
                <div className={`flex items-center text-[0.8rem] transition-colors ${validation.hasUpper ? 'text-positive' : 'text-textMuted'}`}>
                  <i className={`fa-solid ${validation.hasUpper ? 'fa-circle-check' : 'fa-circle-dot'} mr-2`}></i>
                  1 uppercase letter (A-Z)
                </div>
                <div className={`flex items-center text-[0.8rem] transition-colors ${validation.hasLower ? 'text-positive' : 'text-textMuted'}`}>
                  <i className={`fa-solid ${validation.hasLower ? 'fa-circle-check' : 'fa-circle-dot'} mr-2`}></i>
                  1 lowercase letter (a-z)
                </div>
                <div className={`flex items-center text-[0.8rem] transition-colors ${validation.hasNumber ? 'text-positive' : 'text-textMuted'}`}>
                  <i className={`fa-solid ${validation.hasNumber ? 'fa-circle-check' : 'fa-circle-dot'} mr-2`}></i>
                  1 number (0-9)
                </div>
                <div className={`flex items-center text-[0.8rem] transition-colors ${validation.hasSpecial ? 'text-positive' : 'text-textMuted'}`}>
                  <i className={`fa-solid ${validation.hasSpecial ? 'fa-circle-check' : 'fa-circle-dot'} mr-2`}></i>
                  1 special char (!@#$..)
                </div>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-primary to-violet-600 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-40 disabled:pointer-events-none"
            disabled={isLoading || !isCodeSent || !isPasswordValid || !code}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Sign Up</span>
                <i className="fa-solid fa-user-check"></i>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-8 pt-6 border-t border-white/[0.05]">
          <p className="text-textMuted text-[0.9rem]">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold transition-all">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
