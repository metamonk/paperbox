import { AuthLayout } from '../components/auth/AuthLayout';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

/**
 * Reset password page
 * Renders the auth layout with reset password form
 * User lands here after clicking reset link in email
 */
export function ResetPassword() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}

