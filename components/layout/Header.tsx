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
    <header className="bg-surface border-b border-border shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center">
            <button
                onClick={toggleSidebar}
                className="text-text-secondary hover:text-text-primary focus:outline-none mr-4 lg:hidden"
            >
                <MenuIcon />
            </button>
            <h1 className="text-xl font-bold text-text-primary hidden sm:block">
                Bienvenido, {user?.nombre || 'Usuario'}
            </h1>
        </div>
      <div className="flex items-center gap-4">
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors focus:outline-none"
            title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
            {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
        </button>
        <div className="flex items-center">
            <div className="text-right mr-3 hidden md:block">
                <p className="font-semibold text-text-primary text-sm">{user?.nombre}</p>
                <p className="text-xs text-text-secondary">{rol?.nombre}</p>
            </div>
            <img 
                className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" 
                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.nombre || 'User'}&background=random`} 
                alt="User Avatar" 
            />
        </div>
        <button 
            onClick={handleLogout}
            className="p-2 rounded-full text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Cerrar Sesión"
        >
            <LogOutIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};

export default Header;