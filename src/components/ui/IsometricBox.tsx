import { cn } from '@/lib/utils';

interface IsometricBoxProps {
  /**
   * Size of the box in pixels
   * @default 48
   */
  size?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * IsometricBox - A single isometric cube matching the Paperbox logo style
 * Automatically adapts to light/dark mode using theme variables
 */
export function IsometricBox({ size = 48, className }: IsometricBoxProps) {
  const viewBoxSize = 100;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('isometric-box', className)}
      role="img"
      aria-label="Isometric Box"
    >
      {/* Define colors using CSS custom properties */}
      <defs>
        <style>{`
          .box-cube-top { 
            fill: var(--box-top, oklch(0.95 0 0));
          }
          .box-cube-left { 
            fill: var(--box-left, oklch(0.65 0 0));
          }
          .box-cube-right { 
            fill: var(--box-right, oklch(0.45 0 0));
          }
          
          .dark .box-cube-top { 
            fill: var(--box-top, oklch(0.85 0 0));
          }
          .dark .box-cube-left { 
            fill: var(--box-left, oklch(0.45 0 0));
          }
          .dark .box-cube-right { 
            fill: var(--box-right, oklch(0.25 0 0));
          }
        `}</style>
      </defs>
      
      <g>
        {/* Single centered isometric cube */}
        {/* Top face */}
        <path className="box-cube-top" d="M 50 20 L 75 10 L 100 20 L 75 30 Z" />
        {/* Left face */}
        <path className="box-cube-left" d="M 50 20 L 75 30 L 75 60 L 50 50 Z" />
        {/* Right face */}
        <path className="box-cube-right" d="M 75 30 L 100 20 L 100 50 L 75 60 Z" />
      </g>
    </svg>
  );
}

