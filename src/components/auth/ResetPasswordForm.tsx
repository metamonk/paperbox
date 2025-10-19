import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrength } from './PasswordStrength';
import { mapAuthError, validatePasswordStrength } from '@/utils/auth-errors';

/**
 * Reset password form component
 * Updates user password after clicking reset link
 */
export function ResetPasswordForm() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const failedRequirements = validatePasswordStrength(password);
    if (failedRequirements.length > 0) {
      setError('Password does not meet requirements');
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);
      toast.success('Password updated!', {
        description: 'You can now sign in with your new password.',
      });
      navigate('/login');
    } catch (err) {
      const authError = mapAuthError(err instanceof Error ? err : new Error('Failed to update password'));
      setError(authError.message);
      toast.error(authError.message, {
        description: authError.suggestedAction,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Create new password</h2>
      <p className="text-muted-foreground text-center mb-6">
        Enter a new password for your account
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password Input */}
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isSubmitting}
            required
            autoFocus
          />
        </div>

        {/* Confirm Password Input */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Password Strength Indicator */}
        {password && <PasswordStrength password={password} />}

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Updating password...' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}

