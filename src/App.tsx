import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import MainLayout from './views/components/MainLayout';
import LoginView from './views/LoginView';

const DashboardView = React.lazy(() => import('./views/DashboardView'));
const SchoolView = React.lazy(() => import('./views/SchoolView'));
const LabView = React.lazy(() => import('./views/LabView'));
const AdminView = React.lazy(() => import('./views/AdminView'));
const CRMView = React.lazy(() => import('./views/CRMView'));


function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center font-sans text-primary">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function RoleRoute({ children, roles }: { children: React.ReactNode, roles: string[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }
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
                        <Route path="/" element={<DashboardView />} />
                        <Route 
                          path="/laboratorio" 
                          element={<RoleRoute roles={['admin', 'lab']}><LabView /></RoleRoute>} 
                        />
                        <Route 
                          path="/administracion" 
                          element={<RoleRoute roles={['admin']}><AdminView /></RoleRoute>} 
                        />
                        <Route 
                          path="/crm" 
                          element={<RoleRoute roles={['admin', 'crm']}><CRMView /></RoleRoute>} 
                        />
                        <Route 
                          path="/escuela" 
                          element={<RoleRoute roles={['admin', 'school']}><SchoolView /></RoleRoute>} 
                        />
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
