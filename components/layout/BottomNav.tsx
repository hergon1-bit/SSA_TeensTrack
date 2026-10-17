import React from 'react';
import { Page } from '../../types';
import { HomeIcon, UsersIcon, ClipboardListIcon, CalendarDaysIcon, MenuIcon } from '../ui/Icons';

interface BottomNavProps {
  currentPage: Page;
  navigateTo: (page: Page) => void;
  openSidebar: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, navigateTo, openSidebar }) => {
  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'dashboard', label: 'Inicio', icon: <HomeIcon className="w-5 h-5" /> },
    { page: 'adolescentes', label: 'Teens', icon: <UsersIcon className="w-5 h-5" /> },
    { page: 'reuniones', label: 'Reuniones', icon: <ClipboardListIcon className="w-5 h-5" /> },
    { page: 'eventos', label: 'Eventos', icon: <CalendarDaysIcon className="w-5 h-5" /> },
  ];

  const isMenuSelected = !navItems.some(item => item.page === currentPage);

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border shadow-lg transition-transform"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      aria-label="Navegación Móvil Inferior"
    >
      <div className="flex items-center justify-around px-2 pt-1.5">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => navigateTo(item.page)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 ${
                isActive 
                  ? 'text-primary font-bold' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-primary/15' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 font-medium truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Botón de Menú Completo (Abre el Drawer lateral con el resto de opciones) */}
        <button
          onClick={openSidebar}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 ${
            isMenuSelected 
              ? 'text-primary font-bold' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
          aria-label="Abrir todas las opciones del menú"
        >
          <div className={`p-1 rounded-lg transition-colors ${isMenuSelected ? 'bg-primary/15' : ''}`}>
            <MenuIcon className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium truncate max-w-[64px]">
            {isMenuSelected ? currentPage : 'Más'}
          </span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
