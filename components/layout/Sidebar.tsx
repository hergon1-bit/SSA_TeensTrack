
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { HomeIcon, UsersIcon, UserCheckIcon, ClipboardListIcon, HeartHandshakeIcon, CalendarDaysIcon, BarChartIcon, SettingsIcon, ChevronDownIcon, ShieldIcon, TrashIcon, UploadCloudIcon, BookOpenIcon, CalculatorIcon } from '../ui/Icons';
import { Page } from '../../types';

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
      className={`flex items-center p-2 text-base font-normal rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-primary text-white shadow-lg'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary transform hover:scale-105'
      }`}
    >
      {icon}
      <span className="ml-3 flex-1 whitespace-nowrap">{label}</span>
    </a>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ currentPage, navigateTo, isOpen, setOpen }) => {
  const { user, hasPermission } = useAuth();
  
  const adminSubPages: Page[] = ['usuarios', 'roles', 'inactivar-teens', 'limpiar-tablas', 'cargar-tablas'];
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
      <aside className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} bg-surface border-r border-border`} aria-label="Sidebar">
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center pl-2.5 mb-5 border-b border-border pb-4">
            <div className="bg-primary p-2 rounded-lg mr-2">
                <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Seguimiento</h1>
          </div>
          <ul className="space-y-2">
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
                  className={`flex items-center justify-between w-full p-2 text-base font-normal rounded-lg transition-all duration-200 ${
                    adminSubPages.includes(currentPage)
                      ? 'bg-primary/20 text-primary'
                      : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center">
                    <SettingsIcon />
                    <span className="ml-3 flex-1 whitespace-nowrap">Administración</span>
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
      </aside>
       {isOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)}></div>}
    </>
  );
};

export default Sidebar;
