import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';

// W2.D10: Code splitting - lazy load route components
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const CanvasPage = lazy(() => import('./pages/CanvasPage').then(m => ({ default: m.CanvasPage })));

/**
 * W2.D10: Loading fallback component for code splitting
 * Shows while lazy-loaded components are being fetched
 */
function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Protected route wrapper
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/canvas" replace />;
  }

  return <>{children}</>;
}

/**
 * Main App component with routing
 * Wrapped in ErrorBoundary for graceful error handling
 * Wrapped in ToastProvider for user notifications (W1.D8)
 * W2.D10: Wrapped in Suspense for code splitting support
 */
function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
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

          {/* Protected Routes - require authentication */}
          <Route
            path="/canvas"
            element={
              <ProtectedRoute>
                <CanvasPage />
              </ProtectedRoute>
            }
          />

          {/* Default Route - redirect to canvas or login */}
          <Route path="/" element={<Navigate to="/canvas" replace />} />

          {/* 404 - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  </ErrorBoundary>
  );
}

export default App;
