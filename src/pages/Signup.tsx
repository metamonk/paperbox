import { AuthLayout } from '../components/auth/AuthLayout';
import { SignupForm } from '../components/auth/SignupForm';

/**
 * Signup page
 * Renders the auth layout with signup form
 */
export function Signup() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}

