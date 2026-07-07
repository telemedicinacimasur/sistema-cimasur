import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import MainLayout from './views/components/MainLayout';
import LoginView from './views/LoginView';

const CRMView = React.lazy(() => import('./views/CRMView'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center font-sans text-primary">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ModalProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginView />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <MainLayout>
                    <Suspense fallback={<div className="h-full flex items-center justify-center font-sans text-primary">Cargando módulo...</div>}>
                      <Routes>
                        <Route path="/" element={<Navigate to="/crm" />} />
                        <Route path="/crm" element={<CRMView />} />
                      </Routes>
                    </Suspense>
                  </MainLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ModalProvider>
  );
}
