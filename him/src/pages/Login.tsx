import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';
import { TurnstileWidget } from '../components/TurnstileWidget';
import { getDashboardPath, setAuth } from '../lib/auth';

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

  const loginTurnstileRequired = String(import.meta.env.VITE_TURNSTILE_LOGIN_REQUIRED || '').toLowerCase() === 'true';
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
  const [forceTurnstileOnLogin, setForceTurnstileOnLogin] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setSuccess('');

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
    }

    const loginNeedsTurnstile = forceTurnstileOnLogin || loginTurnstileRequired;
    // Turnstile: required for sign-up; optionally required for login.
    if (isSignUp && !turnstileToken) {
      setError('Complete the verification');
      setLoading(false);
      return;
    }
    if (!isSignUp && loginNeedsTurnstile && !turnstileToken) {
      setError('Complete the verification');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const resp = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, turnstile_token: turnstileToken })
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.detail || data.message || 'Registration failed');
        }

        setSuccess('Account created. You can sign in now.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        setLoading(false);
        return;
      }

      const resp = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, turnstile_token: turnstileToken || undefined })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.detail || data.message || 'Login failed');
      }

      // Expected from your current site: { access_token, role, username, user_id }
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
      const msg = String(err?.message || 'Authentication failed');
      // If backend requires Turnstile for login, force it on.
      if (!isSignUp && /turnstile/i.test(msg)) {
        setForceTurnstileOnLogin(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
      // Tokens are single-use; reset after each attempt.
      if (turnstileWidgetId && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(turnstileWidgetId);
        } catch {
          // ignore
        }
      }
      setTurnstileToken(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center pt-20 pb-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            ∅
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
          className="p-8 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-6"
        >
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-400 text-sm">{success}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="your_username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {(isSignUp || forceTurnstileOnLogin || loginTurnstileRequired) && (
            <div className="flex justify-center">
              <TurnstileWidget
                key={isSignUp ? 'signup' : 'login'}
                action={isSignUp ? 'register' : 'login'}
                onToken={setTurnstileToken}
                onWidgetId={setTurnstileWidgetId}
                className="mt-2"
              />
            </div>
          )}

          {!isSignUp && (
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-white/10"
              />
              Remember me
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold transition-all"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setTurnstileToken(null);
                  setTurnstileWidgetId(null);
                  setForceTurnstileOnLogin(false);
                  setError('');
                  setSuccess('');
                }}
                className="text-cyan-400 hover:text-cyan-300 font-semibold ml-1"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          By proceeding, you agree to our{' '}
          <Link to="/tos" className="text-cyan-400 hover:text-cyan-300 underline">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
