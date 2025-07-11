import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

interface EmailAuthFormProps {
  onBack: () => void;
}

export function EmailAuthForm({ onBack }: EmailAuthFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: 'https://www.riverwalks.co.uk/river-walks',
        }
      });

      if (error) throw error;

      setSent(true);
    } catch (error) {
      console.error('Error sending magic link:', error);
      setError(error instanceof Error ? error.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mb-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Check your email!</h3>
          <p className="text-muted-foreground text-sm">
            We've sent a magic link to <strong>{email}</strong>
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-xs font-medium mb-1">
            📧 Click the link in your email to sign in
          </p>
          <p className="text-blue-700 text-xs">
            The link will expire in 1 hour. Check your spam folder if you don't see it.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => {
              setSent(false);
              setEmail('');
            }}
            variant="outline"
            className="w-full text-sm"
          >
            Send another link
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
        <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Sign in with Email</h3>
        <p className="text-muted-foreground text-sm">
          Enter your email and we'll send you a magic link to sign in
        </p>
      </div>

      <form onSubmit={handleMagicLink} className="space-y-4">
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !email}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending magic link...
            </div>
          ) : (
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Send magic link
            </div>
          )}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          New to Riverwalks? The magic link will create your account automatically.
        </p>
      </div>
    </div>
  );
}