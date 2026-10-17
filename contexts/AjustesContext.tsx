import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AjustesSistema } from '../types';
import { api } from '../services/api';

interface AjustesContextType {
  ajustes: AjustesSistema;
  loading: boolean;
  updateAjustes: (data: Partial<AjustesSistema>) => Promise<AjustesSistema>;
  resetLogo: () => Promise<AjustesSistema>;
  refreshAjustes: () => Promise<void>;
}

const defaultAjustes: AjustesSistema = {
  id: 'default',
  tenantId: 'main',
  nombreSistema: 'Seguimiento',
  subtitulo: 'Sistema de Gestión',
  logoBase64: null
};

const AjustesContext = createContext<AjustesContextType | undefined>(undefined);

export const AjustesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ajustes, setAjustes] = useState<AjustesSistema>(() => {
    // Intentar leer de caché local para rendering instantáneo sin flash
    try {
      const cached = localStorage.getItem('app_ajustes_sistema');
      if (cached) return JSON.parse(cached);
    } catch {}
    return defaultAjustes;
  });
  const [loading, setLoading] = useState(true);

  const refreshAjustes = useCallback(async () => {
    try {
      const data = await api.getAjustes();
      if (data && data.nombreSistema) {
        setAjustes(data);
        try {
          localStorage.setItem('app_ajustes_sistema', JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.warn('[AjustesContext] No se pudieron cargar los ajustes del servidor:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAjustes();
  }, [refreshAjustes]);

  // Actualizar el título de la pestaña del navegador dinámicamente
  useEffect(() => {
    if (ajustes?.nombreSistema) {
      document.title = `${ajustes.nombreSistema} | ${ajustes.subtitulo || 'Sistema de Gestión'}`;
    }
  }, [ajustes?.nombreSistema, ajustes?.subtitulo]);

  const updateAjustes = async (data: Partial<AjustesSistema>): Promise<AjustesSistema> => {
    const updated = await api.updateAjustes(data);
    setAjustes(updated);
    try {
      localStorage.setItem('app_ajustes_sistema', JSON.stringify(updated));
    } catch {}
    return updated;
  };

  const resetLogo = async (): Promise<AjustesSistema> => {
    const updated = await api.resetLogo();
    setAjustes(updated);
    try {
      localStorage.setItem('app_ajustes_sistema', JSON.stringify(updated));
    } catch {}
    return updated;
  };

  return (
    <AjustesContext.Provider
      value={{
        ajustes,
        loading,
        updateAjustes,
        resetLogo,
        refreshAjustes
      }}
    >
      {children}
    </AjustesContext.Provider>
  );
};

export const useAjustes = (): AjustesContextType => {
  const context = useContext(AjustesContext);
  if (!context) {
    throw new Error('useAjustes debe ser usado dentro de un AjustesProvider');
  }
  return context;
};
