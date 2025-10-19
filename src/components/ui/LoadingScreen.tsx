import { Logo } from './Logo';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  /**
   * Logo size
   * @default 'default'
   */
  size?: 'default' | 'small';
  /**
   * Whether to take up full viewport height
   * @default true
   */
  fullscreen?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Loading screen component with animated Paperbox logo
 * - Minimal, design-system-aligned loading indicator
 * - Subtle pulse animation
 * - Theme-aware (respects light/dark mode)
 * - Supports reduced motion preferences
 */
export function LoadingScreen({ 
  size = 'default', 
  fullscreen = true,
  className 
}: LoadingScreenProps) {
  const logoSize = size === 'small' ? 48 : 64;

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background',
        fullscreen ? 'min-h-screen' : 'absolute inset-0 z-50',
        className
      )}
    >
      <div className="animate-logo-pulse">
        <Logo size={logoSize} useAccent />
      </div>
    </div>
  );
}

