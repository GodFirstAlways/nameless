import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';
import { getDashboardPath, setAuth } from '../lib/auth';

declare global {
  interface Window {
    turnstile?: any;
  }
}

export function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Turnstile (optional)
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

  // Mount animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Load Cloudflare Turnstile script
  useEffect(() => {
    if (!siteKey) return;

    const scriptId = 'cf-turnstile-script';
    if (document.getElementById(scriptId)) {
      setTurnstileLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setTurnstileLoaded(true);
    document.body.appendChild(script);

    return () => {
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, [siteKey]);

  // Render Turnstile widget
  useEffect(() => {
    if (!isSignUp || !turnstileLoaded || !siteKey) {
      setCaptchaToken('');
      return;
    }

    const timer = setTimeout(() => {
      const container = document.getElementById('turnstile-container');
      if (container && window.turnstile) {
        container.innerHTML = '';
        window.turnstile.render('#turnstile-container', {
          sitekey: siteKey,
          callback: (token: string) => setCaptchaToken(token),
          'error-callback': () => {
            setError('Captcha verification failed. Please try again.');
            setCaptchaToken('');
          },
          'expired-callback': () => setCaptchaToken('')
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isSignUp, turnstileLoaded, siteKey]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!username || !password || (isSignUp && !confirmPassword)) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    if (isSignUp) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (siteKey && !captchaToken) {
        setError('Please complete the captcha verification');
        setLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        const body: any = { username, password };
        if (siteKey) body.captcha_token = captchaToken;

        const resp = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.detail || data.message || 'Registration failed');
        }

        setSuccess('Account created. You can sign in now.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        setCaptchaToken('');
        setLoading(false);
        return;
      }

      const resp = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.detail || data.message || 'Login failed');
      }

      // Expected: { access_token, role, username, user_id }
      setAuth(
        {
          token: data.access_token,
          role: data.role,
          username: data.username || username,
          userId: data.user_id
        },
        rememberMe
      );

      const role = String(data.role || '').toLowerCase();
      navigate(getDashboardPath(role), { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center pt-20 pb-12 px-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 -right-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-48 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div
        className={`w-full max-w-md relative z-10 transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="text-center mb-8">
          <div className="inline-block">
            <div className="text-5xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-gradient">
              ∅
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isSignUp ? 'Join the Void' : 'Enter the Void'}
          </h1>
          <p className="text-gray-400">
            {isSignUp
              ? 'Create your account to get started'
              : 'Access your dashboard and manage your licenses'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6 shadow-2xl"
        >
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-400 text-sm">{success}</p>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>

            {/* KEY FIX: icon and input are siblings in a flex row; input is transparent (no bg/border) so it can't cover the icon */}
            <div className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/20 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
              <User className="h-5 w-5 text-gray-500 shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-white placeholder-gray-500 focus:outline-none"
                placeholder="your_username"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/20 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
              <Lock className="h-5 w-5 text-gray-500 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-white placeholder-gray-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Confirm Password */}
          {isSignUp && (
            <div className="animate-slideDown">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/20 px-4 py-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
                <Lock className="h-5 w-5 text-gray-500 shrink-0" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-white placeholder-gray-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {/* Captcha */}
          {isSignUp && siteKey && (
            <div className="flex justify-center animate-slideDown">
              <div id="turnstile-container"></div>
            </div>
          )}

          {/* Remember Me */}
          {!isSignUp && (
            <label className="flex items-center gap-2.5 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
              Remember me
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>

          <div className="text-center pt-2">
            <p className="text-gray-400 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                  setCaptchaToken('');
                }}
                className="text-cyan-400 hover:text-cyan-300 font-semibold ml-1.5 transition-colors"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          By proceeding, you agree to our{' '}
          <Link to="/tos" className="text-cyan-400 hover:text-cyan-300 underline transition-colors">
            Terms of Service
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}