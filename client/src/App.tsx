import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { BusinessDashboardPage } from '@/pages/BusinessDashboardPage';
import { EnrichmentSpreadsheetPage } from '@/pages/EnrichmentSpreadsheetPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { ExerciseWizardPage } from '@/pages/ExerciseWizardPage';
import { PipelineBuilderPage } from '@/pages/PipelineBuilderPage';
import { PipelineRunsPage } from '@/pages/PipelineRunsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RootRedirect />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <BusinessDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercises/:exerciseId"
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <EnrichmentSpreadsheetPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercises/new"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ExerciseWizardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipelines"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PipelineRunsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipelines/new"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PipelineBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipelines/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PipelineBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipelines/:id/runs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PipelineRunsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
