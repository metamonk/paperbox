import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// W2.D10: Code splitting - lazy load route components
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const CanvasPage = lazy(() => import('./pages/CanvasPage').then(m => ({ default: m.CanvasPage })));
const CanvasRedirect = lazy(() => import('./pages/CanvasRedirect').then(m => ({ default: m.CanvasRedirect })));
const CanvasSelectorPage = lazy(() => import('./pages/CanvasSelectorPage').then(m => ({ default: m.CanvasSelectorPage })));

/**
 * W2.D10: Loading fallback component for code splitting
 * Shows while lazy-loaded components are being fetched
 */
function RouteLoadingFallback() {
  return <LoadingScreen />;
}

/**
 * Protected route wrapper
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Public route wrapper
 * Redirects to canvas if user is already authenticated
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/canvas" replace />;
  }

  return <>{children}</>;
}

/**
 * Main App component with routing
 * Wrapped in ErrorBoundary for graceful error handling
 * W4.D1: Using Sonner for toast notifications (replaced custom Toast)
 * W2.D10: Wrapped in Suspense for code splitting support
 */
function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Public Routes - redirect to canvas if authenticated */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          {/* Protected Routes - require authentication */}
          {/* W5.D5.3: Canvas Selector Dashboard - Browse all canvases */}
          <Route
            path="/canvases"
            element={
              <ProtectedRoute>
                <CanvasSelectorPage />
              </ProtectedRoute>
            }
          />

          {/* W5.D4: Canvas routing with dynamic canvasId parameter */}
          <Route
            path="/canvas/:canvasId"
            element={
              <ProtectedRoute>
                <CanvasPage />
              </ProtectedRoute>
            }
          />

          {/* Redirect /canvas to user's active or first canvas */}
          <Route
            path="/canvas"
            element={
              <ProtectedRoute>
                <CanvasRedirect />
              </ProtectedRoute>
            }
          />

          {/* Default Route - redirect to canvas or login */}
          <Route path="/" element={<Navigate to="/canvas" replace />} />

          {/* 404 - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
