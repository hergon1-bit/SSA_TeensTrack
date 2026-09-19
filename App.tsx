
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { GoogleWorkspaceProvider } from './contexts/GoogleWorkspaceContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Page } from './types';

import Dashboard from './pages/Dashboard';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Adolescentes from './pages/Adolescentes';
import Encargados from './pages/Encargados';
import Reuniones from './pages/Reuniones';
import Asistencia from './pages/Asistencia';
import Tareas from './pages/Tareas';
import Tutores from './pages/Tutores';
import Eventos from './pages/Eventos';
import Reportes from './pages/Reportes';
import ReportesFinancieros from './pages/ReportesFinancieros';
import Usuarios from './pages/Usuarios';
import Roles from './pages/Roles';
import LimpiarTablas from './pages/LimpiarTablas';
import CargarTablas from './pages/CargarTablas';
import UpdatePassword from './pages/UpdatePassword';
import LoginPage from './pages/LoginPage';
import ResetPassword from './pages/ResetPassword';

import Servidores from './pages/Servidores';
import Workspace from './pages/Workspace';
import PlanClases from './pages/PlanClases';
import InactivarTeens from './pages/InactivarTeens';
import { BirthdayChecker } from './components/BirthdayChecker';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [pageParams, setPageParams] = useState<any>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navigateTo = (page: Page, params?: any) => {
    setCurrentPage(page);
    setPageParams(params);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  // Detectar si la URL es /reset-password (viene del email)
  if (window.location.pathname === '/reset-password') return <ResetPassword />;

  if (!user) return <LoginPage />;


  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard navigateTo={navigateTo} />;
      case 'adolescentes': return <Adolescentes />;
      case 'servidores': return <Servidores />;
      case 'encargados': return <Encargados />;
      case 'reuniones': return <Reuniones navigateTo={navigateTo} />;
      case 'plan-clases': return <PlanClases />;
      case 'asistencia': return <Asistencia reunionId={pageParams?.reunionId} navigateTo={navigateTo} />;
      case 'tareas': return <Tareas />;
      case 'tutores': return <Tutores />;
      case 'eventos': return <Eventos />;
      case 'reportes': return <Reportes />;
      case 'reportes-financieros': return <ReportesFinancieros />;
      case 'usuarios': return <Usuarios />;
      case 'roles': return <Roles />;
      case 'limpiar-tablas': return <LimpiarTablas />;
      case 'cargar-tablas': return <CargarTablas />;
      case 'inactivar-teens': return <InactivarTeens />;
      case 'update-password': return <UpdatePassword navigateTo={navigateTo} />;
      case 'workspace': return <Workspace />;
      default: return <Dashboard navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        currentPage={currentPage} 
        navigateTo={navigateTo} 
        isOpen={isSidebarOpen} 
        setOpen={setSidebarOpen} 
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-0 lg:ml-64">
        <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderPage()}
        </main>
        <BirthdayChecker />
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <GoogleOAuthProvider clientId={(import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "PROVIDE_YOUR_CLIENT_ID"}>
        <GoogleWorkspaceProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </GoogleWorkspaceProvider>
      </GoogleOAuthProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
