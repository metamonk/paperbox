import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { mapAuthError } from '@/utils/auth-errors';

interface ResendVerificationButtonProps {
  email: string;
}

/**
 * Resend verification email button
 * Includes rate limiting to prevent spam
 */
export function ResendVerificationButton({ email }: ResendVerificationButtonProps) {
  const { resendVerificationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);

  const handleResend = async () => {
    if (!canResend) return;

    setIsResending(true);
    try {
      await resendVerificationEmail(email);
      toast.success('Verification email sent!', {
        description: 'Please check your inbox.',
      });

      // Disable button for 60 seconds to prevent spam
      setCanResend(false);
      setTimeout(() => setCanResend(true), 60000);
    } catch (err) {
      const authError = mapAuthError(err instanceof Error ? err : new Error('Failed to resend email'));
      toast.error(authError.message, {
        description: authError.suggestedAction,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleResend}
      disabled={isResending || !canResend}
    >
      {isResending ? 'Sending...' : canResend ? 'Resend verification email' : 'Email sent'}
    </Button>
  );
}

