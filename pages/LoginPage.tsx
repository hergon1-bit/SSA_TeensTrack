
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { KeyIcon, UsersIcon, EyeIcon, EyeOffIcon, MailIcon, ArrowLeftIcon, RefreshIcon } from '../components/ui/Icons';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectionError, setIsConnectionError] = useState(false);
  
  // Recovery state
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  // Initial Setup State
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [statusText, setStatusText] = useState('Iniciando sistema...');
  const [adminName, setAdminName] = useState('');

  const checkUsers = async () => {
    setIsConnectionError(false);
    setStatusText('Iniciando sistema...');
    
    // Ciclo de mensajes informativo
    const statusInterval = setInterval(() => {
        setStatusText(prev => {
            if (prev === 'Iniciando sistema...') return 'Despertando base de datos...';
            if (prev === 'Despertando base de datos...') return 'Sincronizando esquemas...';
            if (prev === 'Sincronizando esquemas...') return 'Estableciendo conexión segura...';
            return 'Iniciando sistema...';
        });
    }, 8000);

    try {
        const isFirst = await api.isFirstRun();
        
        clearInterval(statusInterval);
        setIsFirstRun(isFirst);
    } catch (e: any) {
        clearInterval(statusInterval);
        const errStr = String(e.message || e);
        console.error("Error en checkUsers:", errStr);
        
        if (errStr.includes('Could not find the function public.is_first_run')) {
            setError("Falta configuración en la base de datos PostgreSQL. Por favor, asegúrese de ejecutar las migraciones necesarias para crear las funciones.");
            setIsFirstRun(false); // Evitar que se quede cargando
            return;
        }
        
        // En lugar de bloquear toda la pantalla, asumimos que NO es la primera ejecución
        // y permitimos al usuario intentar iniciar sesión.
        setIsFirstRun(false);
        
        if (errStr.includes('fetch') || errStr.includes('No se pudo conectar') || errStr.includes('Timeout') || errStr.includes('tardando demasiado') || errStr.includes('aborted')) {
            setError("Advertencia: La conexión inicial tardó demasiado. Puedes intentar iniciar sesión, pero si falla, verifica si el servidor backend está en ejecución.");
        }
    }
  };

  useEffect(() => {
    checkUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      const errStr = String(err.message || err);
      if (errStr.includes('fetch')) {
          setError("Error de conexión. Asegúrese de que el servidor esté activo.");
      } else {
          setError(errStr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
          await api.setupFirstAdmin({
              nombre: adminName,
              email: email,
              password: password,
              rolId: 1 // Admin
          });
          await login(email, password);
      } catch (err: any) {
          setError(err instanceof Error ? err.message : String(err));
      } finally {
          setIsLoading(false);
      }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setRecoveryMessage('');
      setIsLoading(true);
      
      try {
          await api.resetPasswordForEmail(recoveryEmail);
          setRecoveryMessage('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
      } catch (err: any) {
          setError(err instanceof Error ? err.message : String(err));
      } finally {
          setIsLoading(false);
      }
  };

  const toggleView = () => {
      setIsRecovering(!isRecovering);
      setError('');
      setRecoveryMessage('');
      setRecoveryEmail('');
  };

  if (isConnectionError) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
            <div className="bg-red-500/20 p-6 rounded-full mb-6 border border-red-500/50">
                <RefreshIcon className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">Fallo de Conexión Detectado</h2>
            <div className="max-w-md bg-surface p-6 rounded-lg border border-border shadow-2xl mb-8">
                <p className="text-text-secondary text-sm leading-relaxed mb-4">
                    La aplicación no puede comunicarse con el servidor backend PostgreSQL.
                </p>
                <div className="text-xs bg-black/40 p-4 rounded text-left font-mono text-red-300 border border-red-900/50 mb-4">
                    {error}
                </div>
                <p className="text-xs text-text-secondary italic">
                    Acción sugerida: Asegúrese de que el servidor backend (server.ts) esté en ejecución y PostgreSQL esté activo en el puerto 5432.
                </p>
            </div>
            <button 
                onClick={checkUsers}
                className="flex items-center gap-2 bg-primary hover:bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg"
            >
                <RefreshIcon className="w-5 h-5" />
                Reintentar Conexión
            </button>
        </div>
    );
  }

  if (isFirstRun === null) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
              <div className="relative">
                  <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <UsersIcon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                  <p className="text-text-primary font-bold text-lg">{statusText}</p>
                  <p className="text-text-secondary text-sm animate-pulse mt-1">Por favor, no cierres esta ventana.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] h-screen overflow-hidden bg-[#0c0c0e] text-white font-sans relative">
      <div 
        className="absolute inset-0 pointer-events-none opacity-50 z-0"
        style={{
            backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
        }}
      ></div>

      <section className="hidden lg:flex flex-col justify-between p-16 z-10 border-r border-white/10" style={{ background: 'radial-gradient(circle at top left, rgba(0, 255, 136, 0.1), transparent 40%)' }}>
        <div>
          <div className="uppercase tracking-[0.15em] text-[#00ff88] text-[0.65rem] font-mono">EST. 2024 / SSA</div>
        </div>
        
        <div>
          <h1 className="font-oswald text-[7rem] leading-[0.85] uppercase tracking-[-0.05em] m-0">Seguimiento<br/>Activo</h1>
          <p className="text-xl mt-8 max-w-[400px] opacity-80 leading-relaxed">
            Sistema de gestión y seguimiento integral para adolescentes en entornos institucionales.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="border-t border-white/10 pt-4">
            <div className="uppercase tracking-[0.15em] text-[#00ff88] text-[0.65rem] font-mono mb-2">Estado del Sistema</div>
            <div className="text-lg font-medium">Operativo</div>
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="uppercase tracking-[0.15em] text-[#00ff88] text-[0.65rem] font-mono mb-2">Protocolo</div>
            <div className="text-lg font-medium">Cifrado AES-256</div>
          </div>
        </div>
      </section>

      <section className="flex flex-col justify-center p-8 lg:p-20 bg-[#141417] z-10 h-screen overflow-y-auto">
        <div className="mb-12">
          <h2 className="text-[1.8rem] font-semibold m-0">{isFirstRun ? 'Configuración Inicial' : isRecovering ? 'Recuperar Cuenta' : 'Iniciar Sesión'}</h2>
          <p className="font-mono text-[0.75rem] opacity-50 mt-2 uppercase">
            {isFirstRun ? 'CREA LA PRIMERA CUENTA DE ADMINISTRADOR' : 'INGRESE SUS CREDENCIALES DE ACCESO'}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded-sm mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}
        
        {recoveryMessage && (
             <div className="bg-[#00ff88]/10 border border-[#00ff88] text-[#00ff88] px-4 py-3 rounded-sm mb-6 text-sm text-center">
                {recoveryMessage}
             </div>
        )}

        {isFirstRun && (
            <form onSubmit={handleInitialSetup} className="flex flex-col gap-7">
                <div>
                    <label className="block text-[0.75rem] mb-3 text-white/50 uppercase">Tu Nombre</label>
                    <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                        className="w-full bg-transparent border-0 border-b-2 border-white/10 text-white py-3 text-[1.1rem] outline-none focus:border-[#00ff88] transition-colors"
                        placeholder="Nombre completo"
                    />
                </div>
                <div>
                    <label className="block text-[0.75rem] mb-3 text-white/50 uppercase">Correo Electrónico</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-transparent border-0 border-b-2 border-white/10 text-white py-3 text-[1.1rem] outline-none focus:border-[#00ff88] transition-colors"
                        placeholder="admin@ejemplo.com"
                    />
                </div>
                <div>
                    <label className="block text-[0.75rem] mb-3 text-white/50 uppercase">Contraseña (Mín. 6 caracteres)</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full bg-transparent border-0 border-b-2 border-white/10 text-white py-3 text-[1.1rem] outline-none focus:border-[#00ff88] transition-colors"
                        placeholder="••••••••"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#00ff88] hover:bg-[#00e077] text-black border-none p-5 font-semibold text-base cursor-pointer flex items-center justify-center gap-4 mt-4 rounded-sm transition-colors disabled:opacity-50"
                >
                    {isLoading ? <RefreshIcon className="w-5 h-5 animate-spin mr-2" /> : 'CREAR ADMIN E INICIAR'}
                </button>
                
                <div className="text-center mt-2">
                    <button
                        type="button"
                        onClick={() => setIsFirstRun(false)}
                        className="mt-4 bg-transparent border-none text-white/50 text-sm cursor-pointer underline underline-offset-4 hover:text-[#00ff88] transition-colors mx-auto block"
                    >
                        ¿Ya tienes una cuenta? Inicia sesión aquí
                    </button>
                </div>
            </form>
        )}

        {!isRecovering && !isFirstRun && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-7">
            <div>
                <label className="block text-[0.75rem] mb-3 text-white/50 uppercase">Correo Electrónico</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-transparent border-0 border-b-2 border-white/10 text-white py-3 text-[1.1rem] outline-none focus:border-[#00ff88] transition-colors"
                    placeholder="nombre@ejemplo.com"
                />
            </div>

            <div className="relative">
                <label className="block text-[0.75rem] mb-3 text-white/50 uppercase">Contraseña</label>
                <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-transparent border-0 border-b-2 border-white/10 text-white py-3 text-[1.1rem] outline-none focus:border-[#00ff88] transition-colors pr-12"
                    placeholder="••••••••"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 bottom-4 text-white/30 hover:text-white/80 focus:outline-none transition-colors"
                >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#00ff88] hover:bg-[#00e077] text-black border-none p-5 font-semibold text-base cursor-pointer flex items-center justify-center gap-4 mt-4 rounded-sm transition-colors disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <RefreshIcon className="w-5 h-5 animate-spin mr-2" />
                        VALIDANDO...
                    </>
                ) : (
                    <>
                        INGRESAR AL SISTEMA
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                    </>
                )}
            </button>
            </form>
        )}

        {isRecovering && !isFirstRun && (
             <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-7">
                <p className="text-sm text-white/50 text-center -mt-4 mb-2">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                <div>
                    <label className="block text-[0.75rem] mb-3 text-white/50 uppercase">Correo Electrónico</label>
                    <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        required
                        className="w-full bg-transparent border-0 border-b-2 border-white/10 text-white py-3 text-[1.1rem] outline-none focus:border-[#00ff88] transition-colors"
                        placeholder="nombre@ejemplo.com"
                    />
                </div>
                 <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#00ff88] hover:bg-[#00e077] text-black border-none p-5 font-semibold text-base cursor-pointer flex items-center justify-center gap-4 mt-4 rounded-sm transition-colors disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                             <RefreshIcon className="w-5 h-5 animate-spin mr-2" />
                            ENVIANDO...
                        </>
                    ) : (
                        <>
                            ENVIAR ENLACE
                            <MailIcon className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
             </form>
        )}
        
        {!isFirstRun && (
            <div className="mt-8 text-center">
                {!isRecovering ? (
                    <button 
                        onClick={toggleView}
                        className="bg-transparent border-none text-white/50 text-[0.85rem] cursor-pointer underline underline-offset-4 hover:text-[#00ff88] transition-colors mx-auto block"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                ) : (
                    <button 
                        onClick={toggleView}
                        className="bg-transparent border-none text-white/50 text-[0.85rem] cursor-pointer underline underline-offset-4 hover:text-[#00ff88] transition-colors flex items-center justify-center mx-auto"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-1" />
                        Volver al inicio de sesión
                    </button>
                )}
            </div>
        )}
      </section>
    </div>
  );
};

export default LoginPage;
