import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MenuIcon, LogOutIcon, SunIcon, MoonIcon } from '../ui/Icons';

interface HeaderProps {
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, rol, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleLogout = async () => {
      try {
          await logout();
      } catch (error) {
          console.error("Error logging out", error);
      }
  };

  return (
    <header className="bg-surface border-b border-border shadow-sm px-4 py-2.5 sm:p-4 pt-[max(0.625rem,env(safe-area-inset-top))] flex justify-between items-center shrink-0">
        <div className="flex items-center">
            <button
                onClick={toggleSidebar}
                className="text-text-secondary hover:text-text-primary focus:outline-none mr-2 sm:mr-4 lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:scale-95 transition"
                aria-label="Abrir menú de navegación"
            >
                <MenuIcon className="w-6 h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                Bienvenido, {user?.nombre || 'Usuario'}
            </h1>
        </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
            onClick={toggleTheme}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-text-secondary hover:bg-primary/10 hover:text-primary active:scale-95 transition-colors focus:outline-none"
            title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
            {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
        </button>
        <div className="flex items-center">
            <div className="text-right mr-3 hidden md:block">
                <p className="font-semibold text-text-primary text-sm">{user?.nombre}</p>
                <p className="text-xs text-text-secondary">{rol?.nombre}</p>
            </div>
            <img 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-primary/20 shrink-0" 
                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.nombre || 'User'}&background=random`} 
                alt="User Avatar" 
            />
        </div>
        <button 
            onClick={handleLogout}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-text-secondary hover:bg-red-500/10 hover:text-red-400 active:scale-95 transition-colors"
            title="Cerrar Sesión"
            aria-label="Cerrar Sesión"
        >
            <LogOutIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};

export default Header;