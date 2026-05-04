import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Login Page
 * Handles user authentication with ID Number and password
 */
export default function Login() {
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!idNumber || !password) {
      setError('Please enter both ID Number and password');
      return;
    }

    // ID Number validation (alphanumeric, 3-50 characters)
    const idNumberRegex = /^[a-zA-Z0-9-_]{3,50}$/;
    if (!idNumberRegex.test(idNumber)) {
      setError('Please enter a valid ID Number (3-50 alphanumeric characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(idNumber, password);

      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 shadow-lg shadow-blue-900/30 mb-4">
            <span className="text-xl font-black text-white tracking-wider">PAF</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            P.A.F.R
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Philippine Air Force Reservists
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ID Number Field */}
            <div>
              <label
                htmlFor="idNumber"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                ID Number
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  id="idNumber"
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter your ID Number"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 dark:text-neutral-100 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 dark:text-neutral-100 transition-colors"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-6">
          Personnel & Attendance Force Readiness System
        </p>
      </div>
    </div>
  );
}
