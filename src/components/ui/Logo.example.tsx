/**
 * Logo Component Examples
 * 
 * This file demonstrates different ways to use the Logo component.
 * You can copy these examples into your components as needed.
 * 
 * To view this in your app, temporarily import and render it somewhere.
 */

import { Logo } from './Logo';

export function LogoExamples() {
  return (
    <div className="p-8 space-y-8 bg-background">
      <h2 className="text-2xl font-bold text-foreground mb-4">Logo Component Examples</h2>
      
      {/* Size Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Size Variants</h3>
        <div className="flex items-end gap-6 p-6 bg-card rounded-lg border border-border">
          <div className="text-center">
            <Logo size={16} />
            <p className="text-xs text-muted-foreground mt-2">16px</p>
          </div>
          <div className="text-center">
            <Logo size={24} />
            <p className="text-xs text-muted-foreground mt-2">24px</p>
          </div>
          <div className="text-center">
            <Logo size={32} />
            <p className="text-xs text-muted-foreground mt-2">32px</p>
          </div>
          <div className="text-center">
            <Logo size={40} />
            <p className="text-xs text-muted-foreground mt-2">40px (default)</p>
          </div>
          <div className="text-center">
            <Logo size={64} />
            <p className="text-xs text-muted-foreground mt-2">64px</p>
          </div>
          <div className="text-center">
            <Logo size={80} />
            <p className="text-xs text-muted-foreground mt-2">80px</p>
          </div>
        </div>
      </div>

      {/* Accent Mode */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Accent Mode</h3>
        <div className="flex items-center gap-8 p-6 bg-card rounded-lg border border-border">
          <div className="text-center">
            <Logo size={64} />
            <p className="text-xs text-muted-foreground mt-2">Default</p>
          </div>
          <div className="text-center">
            <Logo size={64} useAccent />
            <p className="text-xs text-muted-foreground mt-2">With Accent</p>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Common Use Cases</h3>
        
        {/* Navigation Bar */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Navigation Bar</h4>
          <div className="h-14 bg-card border-b border-border px-4 flex items-center gap-3">
            <Logo size={32} />
            <span className="text-xl font-bold text-foreground">Paperbox</span>
          </div>
        </div>

        {/* Login/Signup */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Login/Signup Page</h4>
          <div className="bg-card border border-border rounded-lg p-8 text-center max-w-md mx-auto">
            <div className="flex justify-center mb-4">
              <Logo size={80} useAccent />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Paperbox</h1>
            <p className="text-muted-foreground">Real-time collaborative design canvas</p>
          </div>
        </div>

        {/* Loading State */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Loading Spinner</h4>
          <div className="bg-card border border-border rounded-lg p-8 text-center max-w-md mx-auto">
            <Logo size={48} className="animate-pulse mx-auto" />
            <p className="text-muted-foreground mt-4">Loading canvas...</p>
          </div>
        </div>

        {/* Button Icon */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Icon Button</h4>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
            <Logo size={20} className="brightness-0 invert" />
            <span>Open Canvas</span>
          </button>
        </div>
      </div>

      {/* Dark Mode Preview */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Theme Adaptation</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Light Mode Simulation */}
          <div className="p-6 bg-white rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-4">Light Mode</p>
            <div className="flex items-center gap-4">
              <Logo size={48} />
              <Logo size={48} useAccent />
            </div>
          </div>
          
          {/* Dark Mode Simulation */}
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 mb-4">Dark Mode</p>
            <div className="flex items-center gap-4">
              <Logo size={48} />
              <Logo size={48} useAccent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Example: Using Logo with React Router Link
export function LogoWithLink() {
  return (
    <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <Logo size={32} />
      <span className="text-xl font-bold">Paperbox</span>
    </a>
  );
}

// Example: Animated Logo
export function AnimatedLogo() {
  return (
    <div className="relative">
      <Logo 
        size={64} 
        className="hover:scale-110 transition-transform duration-300 cursor-pointer"
      />
    </div>
  );
}

