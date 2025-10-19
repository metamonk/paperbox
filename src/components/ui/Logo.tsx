import { cn } from '@/lib/utils';

interface LogoProps {
  /**
   * Size of the logo in pixels
   * @default 40
   */
  size?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to use accent colors for visual interest
   * @default false
   */
  useAccent?: boolean;
}

/**
 * Paperbox logo component - an isometric cube design
 * Automatically adapts to light/dark mode using theme variables
 */
export function Logo({ size = 40, className, useAccent = false }: LogoProps) {
  const viewBoxSize = 280;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('logo-paperbox', className)}
      role="img"
      aria-label="Paperbox Logo"
    >
      {/* Define colors using CSS custom properties */}
      <defs>
        <style>{`
          .logo-cube-top { 
            fill: var(--logo-top, oklch(1 0 0));
          }
          .logo-cube-left { 
            fill: var(--logo-left, oklch(0.7 0 0));
          }
          .logo-cube-right { 
            fill: var(--logo-right, oklch(0.5 0 0));
          }
          
          .dark .logo-cube-top { 
            fill: var(--logo-top, oklch(0.95 0 0));
          }
          .dark .logo-cube-left { 
            fill: var(--logo-left, oklch(0.5 0 0));
          }
          .dark .logo-cube-right { 
            fill: var(--logo-right, oklch(0.3 0 0));
          }

          /* Accent variant for branding */
          .logo-accent .logo-cube-top { 
            fill: var(--logo-top, oklch(0.95 0 0));
          }
          .logo-accent .logo-cube-left { 
            fill: var(--logo-left, oklch(0.4 0.15 240));
          }
          .logo-accent .logo-cube-right { 
            fill: var(--logo-right, oklch(0.3 0.12 260));
          }
        `}</style>
      </defs>
      
      <g className={useAccent ? 'logo-accent' : ''}>
        {/* Row 1 (Top row) - 3 cubes */}
        
        {/* Cube 1,1 - Top Left */}
        <path className="logo-cube-top" d="M 70 45 L 105 25 L 140 45 L 105 65 Z" />
        <path className="logo-cube-left" d="M 70 45 L 105 65 L 105 105 L 70 85 Z" />
        <path className="logo-cube-right" d="M 105 65 L 140 45 L 140 85 L 105 105 Z" />
        
        {/* Cube 1,2 - Top Center */}
        <path className="logo-cube-top" d="M 140 45 L 175 25 L 210 45 L 175 65 Z" />
        <path className="logo-cube-left" d="M 140 45 L 175 65 L 175 105 L 140 85 Z" />
        <path className="logo-cube-right" d="M 175 65 L 210 45 L 210 85 L 175 105 Z" />
        
        {/* Cube 1,3 - Top Right */}
        <path className="logo-cube-top" d="M 210 45 L 245 25 L 280 45 L 245 65 Z" />
        <path className="logo-cube-left" d="M 210 45 L 245 65 L 245 105 L 210 85 Z" />
        <path className="logo-cube-right" d="M 245 65 L 280 45 L 280 85 L 245 105 Z" />

        {/* Row 2 (Middle row) - 3 cubes */}
        
        {/* Cube 2,1 - Middle Left */}
        <path className="logo-cube-top" d="M 70 85 L 105 65 L 140 85 L 105 105 Z" />
        <path className="logo-cube-left" d="M 70 85 L 105 105 L 105 145 L 70 125 Z" />
        <path className="logo-cube-right" d="M 105 105 L 140 85 L 140 125 L 105 145 Z" />
        
        {/* Cube 2,2 - Middle Center (skipped/empty for visual interest) */}
        
        {/* Cube 2,3 - Middle Right */}
        <path className="logo-cube-top" d="M 210 85 L 245 65 L 280 85 L 245 105 Z" />
        <path className="logo-cube-left" d="M 210 85 L 245 105 L 245 145 L 210 125 Z" />
        <path className="logo-cube-right" d="M 245 105 L 280 85 L 280 125 L 245 145 Z" />

        {/* Row 3 (Bottom row) - 3 cubes */}
        
        {/* Cube 3,1 - Bottom Left */}
        <path className="logo-cube-top" d="M 70 125 L 105 105 L 140 125 L 105 145 Z" />
        <path className="logo-cube-left" d="M 70 125 L 105 145 L 105 185 L 70 165 Z" />
        <path className="logo-cube-right" d="M 105 145 L 140 125 L 140 165 L 105 185 Z" />
        
        {/* Cube 3,2 - Bottom Center */}
        <path className="logo-cube-top" d="M 140 125 L 175 105 L 210 125 L 175 145 Z" />
        <path className="logo-cube-left" d="M 140 125 L 175 145 L 175 185 L 140 165 Z" />
        <path className="logo-cube-right" d="M 175 145 L 210 125 L 210 165 L 175 185 Z" />
        
        {/* Cube 3,3 - Bottom Right */}
        <path className="logo-cube-top" d="M 210 125 L 245 105 L 280 125 L 245 145 Z" />
        <path className="logo-cube-left" d="M 210 125 L 245 145 L 245 185 L 210 165 Z" />
        <path className="logo-cube-right" d="M 245 145 L 280 125 L 280 165 L 245 185 Z" />

        {/* Layer 2 - Back row, visible cubes */}
        
        {/* Cube 1,1 - Back Top Left */}
        <path className="logo-cube-top" d="M 0 85 L 35 65 L 70 85 L 35 105 Z" />
        <path className="logo-cube-left" d="M 0 85 L 35 105 L 35 145 L 0 125 Z" />
        <path className="logo-cube-right" d="M 35 105 L 70 85 L 70 125 L 35 145 Z" />
        
        {/* Cube 1,3 - Back Top Right */}
        <path className="logo-cube-top" d="M 140 85 L 175 65 L 210 85 L 175 105 Z" />
        <path className="logo-cube-left" d="M 140 85 L 175 105 L 175 145 L 140 125 Z" />
        <path className="logo-cube-right" d="M 175 105 L 210 85 L 210 125 L 175 145 Z" />
        
        {/* Cube 2,1 - Back Middle Left */}
        <path className="logo-cube-top" d="M 0 125 L 35 105 L 70 125 L 35 145 Z" />
        <path className="logo-cube-left" d="M 0 125 L 35 145 L 35 185 L 0 165 Z" />
        <path className="logo-cube-right" d="M 35 145 L 70 125 L 70 165 L 35 185 Z" />
        
        {/* Cube 2,3 - Back Middle Right */}
        <path className="logo-cube-top" d="M 140 125 L 175 105 L 210 125 L 175 145 Z" />
        <path className="logo-cube-left" d="M 140 125 L 175 145 L 175 185 L 140 165 Z" />
        <path className="logo-cube-right" d="M 175 145 L 210 125 L 210 165 L 175 185 Z" />

        {/* Cube 3,1 - Back Bottom Left */}
        <path className="logo-cube-top" d="M 0 165 L 35 145 L 70 165 L 35 185 Z" />
        <path className="logo-cube-left" d="M 0 165 L 35 185 L 35 225 L 0 205 Z" />
        <path className="logo-cube-right" d="M 35 185 L 70 165 L 70 205 L 35 225 Z" />
        
        {/* Cube 3,2 - Back Bottom Center (skipped for visual interest) */}
        
        {/* Cube 3,3 - Back Bottom Right */}
        <path className="logo-cube-top" d="M 140 165 L 175 145 L 210 165 L 175 185 Z" />
        <path className="logo-cube-left" d="M 140 165 L 175 185 L 175 225 L 140 205 Z" />
        <path className="logo-cube-right" d="M 175 185 L 210 165 L 210 205 L 175 225 Z" />
      </g>
    </svg>
  );
}

