/**
 * Auth Error Mapping Utility
 * Maps Supabase auth error codes to user-friendly messages
 */

export interface AuthError {
  message: string;
  suggestedAction?: string;
  isVerificationRequired?: boolean;
}

/**
 * Maps Supabase auth errors to user-friendly messages
 */
export function mapAuthError(error: Error): AuthError {
  const message = error.message.toLowerCase();

  // Email not verified
  if (message.includes('email not confirmed')) {
    return {
      message: 'Please verify your email before signing in.',
      suggestedAction: 'Check your inbox for a verification email.',
      isVerificationRequired: true,
    };
  }

  // Invalid credentials
  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
    return {
      message: 'Invalid email or password.',
      suggestedAction: 'Please check your credentials and try again.',
    };
  }

  // User already exists
  if (message.includes('user already registered') || message.includes('already been registered')) {
    return {
      message: 'This email is already registered.',
      suggestedAction: 'Try signing in instead, or use a different email.',
    };
  }

  // Password too weak
  if (message.includes('password') && (message.includes('weak') || message.includes('strength'))) {
    return {
      message: 'Password is too weak.',
      suggestedAction: 'Use at least 8 characters with uppercase, lowercase, numbers, and symbols.',
    };
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return {
      message: 'Too many attempts.',
      suggestedAction: 'Please wait a few minutes before trying again.',
    };
  }

  // Email sending issues
  if (message.includes('email') && (message.includes('send') || message.includes('delivery'))) {
    return {
      message: 'Unable to send email.',
      suggestedAction: 'Please check your email address and try again.',
    };
  }

  // Invalid reset token
  if (message.includes('invalid') && message.includes('token')) {
    return {
      message: 'This password reset link is invalid or has expired.',
      suggestedAction: 'Please request a new password reset link.',
    };
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return {
      message: 'Network connection error.',
      suggestedAction: 'Please check your internet connection and try again.',
    };
  }

  // Generic fallback
  return {
    message: 'An error occurred during authentication.',
    suggestedAction: 'Please try again or contact support if the problem persists.',
  };
}

/**
 * Validates password strength
 * Returns array of failed requirements
 */
export function validatePasswordStrength(password: string): string[] {
  const requirements: { test: boolean; message: string }[] = [
    {
      test: password.length >= 8,
      message: 'At least 8 characters',
    },
    {
      test: /[A-Z]/.test(password),
      message: 'At least one uppercase letter',
    },
    {
      test: /[a-z]/.test(password),
      message: 'At least one lowercase letter',
    },
    {
      test: /[0-9]/.test(password),
      message: 'At least one number',
    },
    {
      test: /[^A-Za-z0-9]/.test(password),
      message: 'At least one special character',
    },
  ];

  return requirements.filter((req) => !req.test).map((req) => req.message);
}

/**
 * Calculates password strength score (0-4)
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: 'weak' | 'fair' | 'good' | 'strong';
  color: string;
} {
  const failedRequirements = validatePasswordStrength(password);
  const score = 5 - failedRequirements.length;

  if (score <= 1) {
    return { score, label: 'weak', color: 'destructive' };
  } else if (score === 2) {
    return { score, label: 'fair', color: 'yellow-500' };
  } else if (score === 3) {
    return { score, label: 'good', color: 'blue-500' };
  } else {
    return { score, label: 'strong', color: 'green-500' };
  }
}

