import React, { useState, useEffect } from 'react';

const ResetPasswordPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setIsValidToken(false);
      setIsLoading(false);
      return;
    }
    setToken(t);

    // Validar el token con el backend
    fetch(`/api/auth/validate-reset-token?token=${t}`)
      .then(r => r.json())
      .then(data => {
        setIsValidToken(data.valid);
        if (data.valid) setEmail(data.email);
        else setError(data.error || 'El enlace es inválido o expiró.');
      })
      .catch(() => {
        setIsValidToken(false);
        setError('Error al validar el enlace.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password-with-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la contraseña.');
      setIsDone(true);
      setMessage('¡Contraseña actualizada correctamente! Ya podés iniciar sesión.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0c0e] text-white font-sans p-6"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }}
    >
      <div className="w-full max-w-md bg-[#141417] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0c0c0e] to-[#1a1a1f] p-8 text-center border-b border-white/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-xl font-bold m-0">Nueva Contraseña</h1>
          <p className="text-xs font-mono text-white/40 mt-2 uppercase tracking-widest">
            SISTEMA DE SEGUIMIENTO DE ADOLESCENTES
          </p>
        </div>

        <div className="p-8">
          {isLoading && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-2 border-white/10 border-t-[#00ff88] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/50 text-sm">Validando enlace...</p>
            </div>
          )}

          {!isLoading && !isValidToken && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">⛔</div>
              <p className="text-red-400 font-semibold mb-2">Enlace inválido o expirado</p>
              <p className="text-white/40 text-sm mb-6">{error || 'Este enlace ya no es válido. Solicitá uno nuevo desde la pantalla de inicio.'}</p>
              <button onClick={goToLogin}
                className="bg-[#00ff88] hover:bg-[#00e077] text-black font-bold px-6 py-3 rounded-md transition-colors text-sm">
                Volver al Inicio
              </button>
            </div>
          )}

          {!isLoading && isValidToken && !isDone && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {email && (
                <p className="text-white/50 text-sm text-center">
                  Cambiando contraseña para <strong className="text-white/80">{email}</strong>
                </p>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-md text-sm text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs mb-2 text-white/40 uppercase tracking-widest">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-transparent border-0 border-b-2 border-white/10 text-white py-3 text-base outline-none focus:border-[#00ff88] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs mb-2 text-white/40 uppercase tracking-widest">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repetí la contraseña"
                  className="w-full bg-transparent border-0 border-b-2 border-white/10 text-white py-3 text-base outline-none focus:border-[#00ff88] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#00ff88] hover:bg-[#00e077] text-black border-none py-4 font-bold text-sm cursor-pointer rounded-md transition-colors disabled:opacity-50 uppercase tracking-wider mt-2"
              >
                {isSubmitting ? 'GUARDANDO...' : 'GUARDAR NUEVA CONTRASEÑA'}
              </button>
            </form>
          )}

          {isDone && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-[#00ff88] font-semibold mb-2">{message}</p>
              <button onClick={goToLogin}
                className="mt-6 bg-[#00ff88] hover:bg-[#00e077] text-black font-bold px-6 py-3 rounded-md transition-colors text-sm uppercase tracking-wider">
                Ir al Inicio de Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
