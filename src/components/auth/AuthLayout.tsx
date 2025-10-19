import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Centered layout wrapper for authentication pages
 * Provides consistent styling for login and signup forms
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            CollabCanvas
          </h1>
          <p className="text-muted-foreground">
            Real-time collaborative design canvas
          </p>
        </div>

        {/* Auth Form Container */}
        <div className="bg-card border border-border rounded-lg shadow-xl p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Built with Supabase, React, and Fabric.js
        </p>
      </div>
    </div>
  );
}

