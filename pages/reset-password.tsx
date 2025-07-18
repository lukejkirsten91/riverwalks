import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No valid session, redirect to home
        router.push('/');
      }
    };
    
    checkSession();
  }, [router]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Please choose a password with at least 8 characters';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Please add at least one lowercase letter (a-z)';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Please add at least one uppercase letter (A-Z)';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Please add at least one number (0-9)';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError('Please enter both password fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords don\'t match. Please try again');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to river-walks after a brief delay
      setTimeout(() => {
        router.push('/river-walks');
      }, 2000);
    } catch (error) {
      console.error('Error updating password:', error);
      setError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full max-w-md">
          <div className="text-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Password Updated!</h1>
            <p className="text-muted-foreground text-sm mb-4">
              Your password has been successfully updated.
            </p>
            <p className="text-muted-foreground text-xs">
              Redirecting you to your river studies...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Set New Password</h1>
            <p className="text-muted-foreground text-sm">
              Choose a strong password for your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a secure password"
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Choose a strong password with at least 8 characters, including uppercase, lowercase, and numbers
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Type your password again"
                  className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-3"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating password...
                </div>
              ) : (
                <div className="flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Update Password
                </div>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}