
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HomeIcon, UsersIcon, UserCheckIcon, ClipboardListIcon, HeartHandshakeIcon, CalendarDaysIcon, BarChartIcon, SettingsIcon, ChevronDownIcon, ShieldIcon, TrashIcon, UploadCloudIcon, BookOpenIcon, CalculatorIcon } from '../ui/Icons';
import { Page } from '../../types';
import { useAjustes } from '../../contexts/AjustesContext';
import { LogoViewer } from '../ui/LogoViewer';

interface SidebarProps {
  currentPage: Page;
  navigateTo: (page: Page) => void;
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <li>
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`flex items-center min-h-[44px] px-3 py-2.5 text-base font-normal rounded-lg transition-all active:scale-[0.98] ${
        isActive
          ? 'bg-primary text-white shadow-md'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="ml-3 flex-1 whitespace-nowrap truncate">{label}</span>
    </a>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ currentPage, navigateTo, isOpen, setOpen }) => {
  const { user, hasPermission } = useAuth();
  const { ajustes } = useAjustes();
  
  const adminSubPages: Page[] = ['usuarios', 'roles', 'logos-ajustes', 'inactivar-teens', 'limpiar-tablas', 'cargar-tablas'];
  const [isAdminOpen, setIsAdminOpen] = useState(adminSubPages.includes(currentPage));
  
  if (!user) return null;

  const menuItems = [
    { page: 'dashboard', label: 'Dashboard', icon: <HomeIcon />, requiredPermission: true },
    { page: 'adolescentes', label: 'Adolescentes', icon: <UsersIcon />, requiredPermission: hasPermission('adolescentes', 'read') },
    { page: 'servidores', label: 'Servidores de Apoyo', icon: <UserCheckIcon />, requiredPermission: hasPermission('servidores', 'read') },
    { page: 'encargados', label: 'Encargados', icon: <UserCheckIcon />, requiredPermission: hasPermission('encargados', 'read') },
    { page: 'reuniones', label: 'Reuniones', icon: <ClipboardListIcon />, requiredPermission: hasPermission('reuniones', 'read') },
    { page: 'plan-clases', label: 'Plan de Clases y Temas', icon: <BookOpenIcon />, requiredPermission: hasPermission('plan_clases', 'read') },
    { page: 'tareas', label: 'Tareas / Devocional', icon: <BookOpenIcon />, requiredPermission: hasPermission('devocionales', 'read') || hasPermission('entregas_devocionales', 'read') },
    { page: 'tutores', label: 'Tutores', icon: <HeartHandshakeIcon />, requiredPermission: hasPermission('tutores', 'read') },
    { page: 'eventos', label: 'Eventos', icon: <CalendarDaysIcon />, requiredPermission: hasPermission('eventos', 'read') },
    { page: 'reportes-financieros', label: 'Balance de Eventos', icon: <CalculatorIcon />, requiredPermission: hasPermission('eventos', 'read') },
    { page: 'workspace', label: 'Google Workspace', icon: <SettingsIcon />, requiredPermission: true },
    { page: 'reportes', label: 'Reportes de Seguimiento', icon: <BarChartIcon />, requiredPermission: true },
  ];

  return (
    <>
      <aside className={`fixed top-0 left-0 z-40 w-72 max-w-[85vw] h-dvh min-h-[100dvh] pb-[env(safe-area-inset-bottom)] transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} bg-surface border-r border-border shadow-xl lg:shadow-none`} aria-label="Sidebar">
        <div className="h-full px-3 py-4 overflow-y-auto flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pl-2.5 pr-1 mb-5 border-b border-border pb-4">
              <div className="flex items-center min-w-0 pr-2">
                <LogoViewer
                  src={ajustes.logoBase64}
                  alt={ajustes.nombreSistema}
                  fallbackText={ajustes.nombreSistema}
                  className="w-9 h-9 mr-2.5 rounded-lg shrink-0 shadow-sm"
                  imgClassName="w-full h-full object-contain p-0.5"
                />
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-text-primary truncate">
                    {ajustes.nombreSistema || 'Seguimiento'}
                  </h1>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary rounded-lg active:scale-95"
                title="Cerrar menú"
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-1.5">
              {menuItems.filter(item => item.requiredPermission).map((item) => (
                <NavItem
                  key={item.page}
                  icon={item.icon}
                  label={item.label}
                  isActive={currentPage === item.page}
                  onClick={() => navigateTo(item.page as Page)}
                />
              ))}
               {hasPermission('usuarios', 'read') && (
                <li>
                  <button
                    onClick={() => setIsAdminOpen(!isAdminOpen)}
                    className={`flex items-center justify-between w-full min-h-[44px] px-3 py-2.5 text-base font-normal rounded-lg transition-all active:scale-[0.98] ${
                      adminSubPages.includes(currentPage)
                        ? 'bg-primary/20 text-primary'
                        : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center truncate">
                      <SettingsIcon />
                      <span className="ml-3 flex-1 whitespace-nowrap truncate">Administración</span>
                    </div>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isAdminOpen ? 'rotate-180' : ''}`} />
                  </button>
                {isAdminOpen && (
                  <ul className="pl-4 mt-2 space-y-2 border-l border-border ml-4">
                    <NavItem
                      icon={<UsersIcon className="w-5 h-5" />}
                      label="Usuarios"
                      isActive={currentPage === 'usuarios'}
                      onClick={() => navigateTo('usuarios')}
                    />
                    <NavItem
                      icon={<ShieldIcon className="w-5 h-5" />}
                      label="Roles y Permisos"
                      isActive={currentPage === 'roles'}
                      onClick={() => navigateTo('roles')}
                    />
                    <NavItem
                      icon={<SettingsIcon className="w-5 h-5" />}
                      label="Logos y Ajustes"
                      isActive={currentPage === 'logos-ajustes'}
                      onClick={() => navigateTo('logos-ajustes')}
                    />
                    <NavItem
                      icon={<UsersIcon className="w-5 h-5" />}
                      label="Inactivar Teens"
                      isActive={currentPage === 'inactivar-teens'}
                      onClick={() => navigateTo('inactivar-teens')}
                    />
                    <NavItem
                      icon={<TrashIcon className="w-5 h-5" />}
                      label="Limpiar Tablas"
                      isActive={currentPage === 'limpiar-tablas'}
                      onClick={() => navigateTo('limpiar-tablas')}
                    />
                    <NavItem
                      icon={<UploadCloudIcon className="w-5 h-5" />}
                      label="Cargar Tablas"
                      isActive={currentPage === 'cargar-tablas'}
                      onClick={() => navigateTo('cargar-tablas')}
                    />
                  </ul>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </aside>
       {isOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)}></div>}
    </>
  );
};

export default Sidebar;
