import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario, Rol, Permisos } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: Usuario | null;
  rol: Rol | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: keyof Rol['permisos'], action: keyof Permisos) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'teenstracker_session';

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          if (parsed?.user?.id) {
            // Verify and refresh user and role from database
            const latestUser = await api.getUsuarioById(parsed.user.id);
            if (latestUser) {
              setUser(latestUser);
              const latestRol = await api.getRolById(latestUser.rolId);
              setRol(latestRol);
              api.updateLastSignIn(latestUser.id).catch(() => {});
            } else {
              localStorage.removeItem(AUTH_STORAGE_KEY);
            }
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error al iniciar sesión' }));
        throw new Error(err.error || 'Correo o contraseña incorrectos.');
      }

      const data = await response.json();
      const authUser: Usuario = data.user;
      let authRol: Rol | null = data.rol;

      if (!authRol) {
        authRol = await api.getRolById(authUser.rolId);
      }

      setUser(authUser);
      setRol(authRol);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: authUser, rol: authRol }));
    } catch (error: any) {
      throw new Error(error.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
      setRol(null);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: keyof Rol['permisos'], action: keyof Permisos): boolean => {
    if (!rol) return false;
    const roleName = (rol.nombre || '').toLowerCase();
    if (rol.id === '1' || roleName.includes('administrador') || roleName === 'admin') return true;
    if (!rol.permisos) return false;
    const modulePerms = (rol.permisos as any)[module];
    return modulePerms ? !!modulePerms[action] : false;
  };

  return (
    <AuthContext.Provider value={{ user, rol, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
