import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { IncidentStoreProvider } from './context/IncidentStoreContext';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <AuthProvider>
      <IncidentStoreProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents/:id"
            element={
              <ProtectedRoute>
                <IncidentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </IncidentStoreProvider>
    </AuthProvider>
  );
}
