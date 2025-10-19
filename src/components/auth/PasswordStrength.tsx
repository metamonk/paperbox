import { useMemo } from 'react';
import { getPasswordStrength, validatePasswordStrength } from '@/utils/auth-errors';
import { CheckCircle2, Circle } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

/**
 * Password strength indicator component
 * Shows visual strength meter and optionally requirements list
 */
export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const failedRequirements = useMemo(() => validatePasswordStrength(password), [password]);

  // Don't show anything if password is empty
  if (!password) {
    return null;
  }

  const requirements = [
    'At least 8 characters',
    'At least one uppercase letter',
    'At least one lowercase letter',
    'At least one number',
    'At least one special character',
  ];

  return (
    <div className="space-y-3">
      {/* Strength Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span
            className={`font-medium capitalize ${
              strength.label === 'weak'
                ? 'text-destructive'
                : strength.label === 'fair'
                  ? 'text-yellow-600 dark:text-yellow-500'
                  : strength.label === 'good'
                    ? 'text-blue-600 dark:text-blue-500'
                    : 'text-green-600 dark:text-green-500'
            }`}
          >
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < strength.score
                  ? strength.label === 'weak'
                    ? 'bg-destructive'
                    : strength.label === 'fair'
                      ? 'bg-yellow-500'
                      : strength.label === 'good'
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1.5">
          {requirements.map((requirement) => {
            const isMet = !failedRequirements.includes(requirement);
            return (
              <div
                key={requirement}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  isMet ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'
                }`}
              >
                {isMet ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5" />
                )}
                <span>{requirement}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

