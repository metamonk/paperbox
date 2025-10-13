import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';

/**
 * Login page
 * Renders the auth layout with login form
 */
export function Login() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}

