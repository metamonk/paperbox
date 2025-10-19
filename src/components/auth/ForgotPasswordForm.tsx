import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mapAuthError } from '@/utils/auth-errors';
import { CheckCircle2 } from 'lucide-react';

/**
 * Forgot password form component
 * Sends password reset email to user
 */
export function ForgotPasswordForm() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setIsSuccess(true);
      toast.success('Password reset email sent!', {
        description: 'Check your inbox for the reset link.',
      });
    } catch (err) {
      const authError = mapAuthError(err instanceof Error ? err : new Error('Failed to send reset email'));
      setError(authError.message);
      toast.error(authError.message, {
        description: authError.suggestedAction,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-3">Check your email</h2>
        <p className="text-muted-foreground mb-6">
          We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>
        </p>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setIsSuccess(false)}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              try again
            </button>
          </p>

          <Link to="/login">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Reset password</h2>
      <p className="text-muted-foreground text-center mb-6">
        Enter your email and we'll send you a link to reset your password
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isSubmitting}
            required
            autoFocus
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      {/* Link to Login */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium cursor-pointer">
          Sign in
        </Link>
      </p>
    </div>
  );
}

