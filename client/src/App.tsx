import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { BusinessDashboardPage } from '@/pages/BusinessDashboardPage';
import { EnrichmentSpreadsheetPage } from '@/pages/EnrichmentSpreadsheetPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { ExercisesPage } from '@/pages/ExercisesPage';
import { ExerciseWizardPage } from '@/pages/ExerciseWizardPage';
import { PipelinesPage } from '@/pages/PipelinesPage';
import { PipelineBuilderPage } from '@/pages/PipelineBuilderPage';
import { PipelineRunsPage } from '@/pages/PipelineRunsPage';
import { ReferenceTablesPage } from '@/pages/ReferenceTablesPage';
import { CredentialsPage } from '@/pages/CredentialsPage';
import { BigQueryExplorerPage } from '@/pages/BigQueryExplorerPage';

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
          <ThemeProvider>
          <Toaster />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RootRedirect />} />

            {/* User routes */}
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
                <ProtectedRoute allowedRoles={['user', 'admin']}>
                  <EnrichmentSpreadsheetPage />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercises"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ExercisesPage />
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
                  <PipelinesPage />
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
            <Route
              path="/reference-tables"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ReferenceTablesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/credentials"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CredentialsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bigquery-explorer"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <BigQueryExplorerPage />
                </ProtectedRoute>
              }
            />
          </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
