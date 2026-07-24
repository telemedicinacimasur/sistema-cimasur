import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import MainLayout from './views/components/MainLayout';
import LoginView from './views/LoginView';

import DashboardView from './views/DashboardView';
import PizarraView from './views/PizarraView';
import SchoolView from './views/SchoolView';
import LabView from './views/LabView';
import AdminView from './views/AdminView';
import CRMView from './views/CRMView';
import GestionView from './views/GestionView';
import CPanelView from './views/CPanelView';


function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center font-sans text-primary">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function RoleRoute({ children, roles }: { children: React.ReactNode, roles: string[] }) {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;

  // Support both single role and roles array
  const userRoles = user.roles || [user.role];
  const hasAccess = roles.some(r => userRoles.includes(r));

  if (!hasAccess) {
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
                          path="/pizarra" 
                          element={<PizarraView />} 
                        />
                        <Route 
                          path="/laboratorio" 
                          element={<RoleRoute roles={['admin', 'lab']}><LabView /></RoleRoute>} 
                        />
                        <Route 
                          path="/administracion" 
                          element={<RoleRoute roles={['admin', 'manager', 'crm']}><AdminView /></RoleRoute>} 
                        />
                        <Route 
                          path="/crm" 
                          element={<RoleRoute roles={['admin', 'crm']}><CRMView /></RoleRoute>} 
                        />
                        <Route 
                          path="/escuela" 
                          element={<RoleRoute roles={['admin', 'school']}><SchoolView /></RoleRoute>} 
                        />
                        <Route 
                          path="/gestion" 
                          element={<RoleRoute roles={['admin', 'gestion']}><GestionView /></RoleRoute>} 
                        />
                        <Route 
                          path="/cpanel" 
                          element={<RoleRoute roles={['admin']}><CPanelView /></RoleRoute>} 
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
