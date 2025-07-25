import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { trackSignup, trackEvent } from '../../lib/analytics';

interface PasswordAuthFormProps {
  onBack: () => void;
}

export function PasswordAuthForm({ onBack }: PasswordAuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

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
    
    if (!email || !password) {
      setError('Please enter both your email and password');
      return;
    }

    if (isSignUp) {
      if (!confirmPassword) {
        setError('Please confirm your password to continue');
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
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: 'https://www.riverwalks.co.uk/river-walks',
          }
        });

        if (error) throw error;

        trackSignup('email');
        trackEvent('user_signup', {
          provider: 'email',
          method: 'password'
        });
        
        setSuccess(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) throw error;

        trackEvent('user_authenticated', {
          provider: 'email',
          method: 'password'
        });
        
        // Redirect to river-walks page
        router.push('/river-walks');
      }
    } catch (error) {
      console.error('Password auth error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('We couldn\'t find an account with those details. Please check your email and password, or create a new account.');
        } else if (error.message.includes('User already registered')) {
          setError('Good news! You already have an account with this email. Please sign in instead.');
        } else {
          setError(error.message);
        }
      } else {
        setError('Something went wrong. Please try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Attempting to send password reset email to:', email);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://www.riverwalks.co.uk/reset-password',
      });

      console.log('Reset password response:', { data, error });

      if (error) {
        console.error('Supabase reset password error:', error);
        throw error;
      }

      console.log('Password reset email sent successfully');
      setForgotPasswordSent(true);
    } catch (error) {
      console.error('Error sending reset email:', error);
      if (error instanceof Error) {
        // Check for specific error messages
        if (error.message.includes('User not found')) {
          setError('No account found with this email address. Please check your email or create a new account.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link first, then try resetting your password.');
        } else if (error.message.includes('too many requests') || error.message.includes('rate limit')) {
          setError('Too many requests. Please wait a few minutes before trying again.');
        } else if (error.message.includes('SMTP') || error.message.includes('email')) {
          setError('Email service temporarily unavailable. Please try again later or contact support.');
        } else {
          setError(`Unable to send reset email: ${error.message}`);
        }
      } else {
        setError('Email service temporarily unavailable. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (forgotPasswordSent) {
    return (
      <div className="text-center">
        <div className="mb-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Check your email!</h3>
          <p className="text-muted-foreground text-sm">
            We've sent password reset instructions to <strong>{email}</strong>
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-xs font-medium mb-1">
            📧 Click the link in your email to reset your password
          </p>
          <p className="text-blue-700 text-xs">
            The link expires in 1 hour. Don't forget to check your spam folder!
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => {
              setForgotPasswordSent(false);
              setShowForgotPassword(false);
              setError(null);
            }}
            variant="outline"
            className="w-full text-sm"
          >
            Back to sign in
          </Button>
          
          <Button
            onClick={onBack}
            variant="ghost"
            className="w-full text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in options
          </Button>
        </div>
      </div>
    );
  }

  if (success && isSignUp) {
    return (
      <div className="text-center">
        <div className="mb-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Almost there!</h3>
          <p className="text-muted-foreground text-sm">
            We've sent a confirmation link to <strong>{email}</strong>
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-xs font-medium mb-1">
            📧 Click the link in your email to complete your account setup
          </p>
          <p className="text-blue-700 text-xs">
            The link expires in 1 hour. Don't forget to check your spam folder!
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => {
              setSuccess(false);
              setIsSignUp(false);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            variant="outline"
            className="w-full text-sm"
          >
            Back to sign in
          </Button>
          
          <Button
            onClick={onBack}
            variant="ghost"
            className="w-full text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in options
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Button
          onClick={onBack}
          variant="ghost"
          className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="text-center mb-6">
        <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {showForgotPassword ? 'Reset Your Password' : (isSignUp ? 'Create Your Account' : 'Welcome Back')}
        </h3>
        <p className="text-muted-foreground text-sm">
          {showForgotPassword 
            ? 'Enter your email and we\'ll send you a reset link'
            : (isSignUp 
              ? 'Join thousands of users already using Riverwalks'
              : 'Sign in to access your saved river studies'
            )
          }
        </p>
      </div>

      <form onSubmit={showForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            disabled={loading}
            required
          />
        </div>

        {!showForgotPassword && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Choose a secure password' : 'Enter your password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isSignUp && (
              <div className="mt-2 text-xs text-muted-foreground">
                Choose a strong password with at least 8 characters, including uppercase, lowercase, and numbers
              </div>
            )}
          </div>
        )}

        {isSignUp && !showForgotPassword && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Type your password again"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !email || (!showForgotPassword && (!password || (isSignUp && !confirmPassword)))}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {showForgotPassword ? 'Sending reset link...' : (isSignUp ? 'Creating account...' : 'Signing in...')}
            </div>
          ) : (
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              {showForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Sign In')}
            </div>
          )}
        </Button>
      </form>

      <div className="mt-4 text-center space-y-2">
        {!showForgotPassword && !isSignUp && (
          <button
            type="button"
            onClick={() => {
              setShowForgotPassword(true);
              setError(null);
            }}
            className="text-sm text-primary hover:text-primary/80 underline block w-full"
          >
            Forgot your password?
          </button>
        )}
        
        {showForgotPassword ? (
          <button
            type="button"
            onClick={() => {
              setShowForgotPassword(false);
              setError(null);
            }}
            className="text-sm text-primary hover:text-primary/80 underline"
          >
            Back to sign in
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-sm text-primary hover:text-primary/80 underline"
          >
            {isSignUp 
              ? 'Already have an account? Sign in here'
              : 'New to Riverwalks? Create your free account'
            }
          </button>
        )}
      </div>
    </div>
  );
}