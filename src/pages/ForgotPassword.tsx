import { AuthLayout } from '../components/auth/AuthLayout';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

/**
 * Forgot password page
 * Renders the auth layout with forgot password form
 */
export function ForgotPassword() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}

