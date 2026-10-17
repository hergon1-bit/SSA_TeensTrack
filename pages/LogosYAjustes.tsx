import React, { useState, useRef } from 'react';
import { useAjustes } from '../contexts/AjustesContext';
import { useAuth } from '../contexts/AuthContext';
import { LogoViewer } from '../components/ui/LogoViewer';
import { validateLogoFile, fileToBase64 } from '../utils/logoOptimizer';
import { 
  SettingsIcon, 
  UploadCloudIcon, 
  TrashIcon, 
  CheckCircleIcon, 
  AlertTriangleIcon, 
  RefreshIcon,
  EyeIcon,
  ShieldIcon
} from '../components/ui/Icons';

export const LogosYAjustes: React.FC = () => {
  const { ajustes, updateAjustes, resetLogo, loading: contextLoading } = useAjustes();
  const { rol } = useAuth();
  const isAdmin = rol?.id === '1' || rol?.nombre?.toLowerCase().includes('administrador') || rol?.nombre?.toLowerCase() === 'admin';

  // Form states
  const [nombreSistema, setNombreSistema] = useState(ajustes.nombreSistema || 'Seguimiento');
  const [subtitulo, setSubtitulo] = useState(ajustes.subtitulo || 'Sistema de Gestión');
  const [tenantId, setTenantId] = useState(ajustes.tenantId || 'main');
  
  // Logo upload state
  const [tempLogoBase64, setTempLogoBase64] = useState<string | null>(ajustes.logoBase64 || null);
  const [logoChanged, setLogoChanged] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Status states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if ajustes changes externally
  React.useEffect(() => {
    if (!logoChanged) {
      setTempLogoBase64(ajustes.logoBase64 || null);
    }
    setNombreSistema(ajustes.nombreSistema || 'Seguimiento');
    setSubtitulo(ajustes.subtitulo || 'Sistema de Gestión');
    setTenantId(ajustes.tenantId || 'main');
  }, [ajustes, logoChanged]);

  const handleFileProcess = async (file: File) => {
    setFileError(null);
    setErrorMessage(null);
    setSaveSuccess(false);

    const validation = validateLogoFile(file);
    if (!validation.valid) {
      setFileError(validation.error || 'Archivo inválido');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setTempLogoBase64(base64);
      setLogoChanged(true);
    } catch (err: any) {
      setFileError('Ocurrió un error al procesar la imagen: ' + (err.message || err));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleRemoveLogo = () => {
    setTempLogoBase64(null);
    setLogoChanged(true);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMessage('Solo los Administradores tienen permisos para modificar los ajustes del sistema.');
      return;
    }

    if (!nombreSistema.trim()) {
      setErrorMessage('El nombre del ecosistema no puede estar vacío.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      await updateAjustes({
        nombreSistema: nombreSistema.trim(),
        subtitulo: subtitulo.trim() || undefined,
        tenantId: tenantId.trim() || 'main',
        logoBase64: tempLogoBase64
      });

      setLogoChanged(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los ajustes en el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
          <ShieldIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Acceso Restringido</h2>
        <p className="text-text-secondary max-w-md">
          Este módulo está reservado exclusivamente para Administradores del sistema. Comunícate con un administrador para solicitar cambios de imagen corporativa.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-full">
              Administración
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-surface text-text-secondary border border-border rounded-full">
              Multi-Tenant / Marca Blanca
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-1 tracking-tight">
            Logos y Ajustes del Sistema
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mt-1">
            Personaliza el logotipo institucional, nombre del ecosistema y textos corporativos que se reflejarán en la plataforma y reportes PDF.
          </p>
        </div>
      </div>

      {/* Alertas */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircleIcon className="w-5 h-5 shrink-0" />
          <div className="text-sm sm:text-base font-medium">
            ¡Ajustes guardados correctamente! El logo y nombre se actualizaron en toda la aplicación.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <AlertTriangleIcon className="w-5 h-5 shrink-0" />
          <div className="text-sm sm:text-base font-medium">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Carga de Logo & Ajustes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Logo Corporativo */}
          <div className="bg-surface rounded-2xl border border-border p-4 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
                  <UploadCloudIcon className="w-5 h-5 text-primary" />
                  Logo Corporativo
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                  Formato PNG transparente recomendado. Máximo 2 MB.
                </p>
              </div>
              {tempLogoBase64 && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="min-h-[44px] px-3 py-2 text-xs sm:text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                  title="Quitar logo actual y usar iniciales"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Quitar logo</span>
                </button>
              )}
            </div>

            {/* Zona de Drop & Carga */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] ${
                isDragging 
                  ? 'border-primary bg-primary/10 scale-[1.01]' 
                  : 'border-border hover:border-primary/50 hover:bg-surface/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Cargar logo"
              />

              {tempLogoBase64 ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-background/80 rounded-xl border border-border shadow-inner max-w-[240px] max-h-[120px] flex items-center justify-center">
                    <img
                      src={tempLogoBase64}
                      alt="Vista previa del logo"
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-text-primary font-medium">
                    Haz clic o arrastra para reemplazar este logo
                  </p>
                  <span className="text-xs text-text-secondary">
                    PNG transparente, JPG, WEBP o SVG (Máx. 2MB)
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <UploadCloudIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-text-primary">
                      Haz clic para seleccionar o arrastra tu archivo aquí
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      PNG (fondo transparente recomendado), JPG, WEBP o SVG hasta 2 MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {fileError && (
              <div className="text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            <div className="text-xs text-text-secondary bg-surface-secondary/40 p-3 rounded-lg border border-border/50">
              💡 <strong>Nota técnica:</strong> El logo se convierte en el cliente a Base64 y se almacena directamente en la base de datos PostgreSQL, garantizando 100% de persistencia incluso en contenedores efímeros (Docker, Render, Railway).
            </div>
          </div>

          {/* Card: Identidad y Textos del Ecosistema */}
          <div className="bg-surface rounded-2xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              Identidad del Ecosistema
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              Personaliza el nombre de la organización para operar bajo modalidad de Marca Blanca / Tenant.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  Nombre del Ecosistema / Institución <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nombreSistema}
                  onChange={(e) => setNombreSistema(e.target.value)}
                  placeholder="Ej: Seguimiento, TeensTracker, Mi Organización"
                  required
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-background border border-border rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
                <span className="text-xs text-text-secondary mt-1 block">
                  Aparece en la barra lateral, títulos de reportes y encabezados.
                </span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  Subtítulo o Lema Corporativo
                </label>
                <input
                  type="text"
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  placeholder="Ej: Sistema de Gestión y Seguimiento Integral"
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-background border border-border rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  Identificador de Tenant
                </label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="main"
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-background border border-border rounded-xl text-base text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
                <span className="text-xs text-text-secondary mt-1 block">
                  Código de espacio de trabajo para aislamiento de datos.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Previsualización en Vivo */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-4 sm:p-6 shadow-sm space-y-5 sticky top-4">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
              <EyeIcon className="w-5 h-5 text-primary" />
              Previsualización en Vivo
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">
              Así es como los usuarios verán la marca en las diferentes áreas de la plataforma:
            </p>

            {/* Mockup 1: Barra Lateral (Sidebar) */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                1. Cabecera del Menú Lateral
              </span>
              <div className="bg-[#18181b] border border-white/10 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center min-w-0">
                  <LogoViewer
                    src={tempLogoBase64}
                    alt={nombreSistema}
                    fallbackText={nombreSistema}
                    className="w-9 h-9 mr-3 rounded-lg"
                    imgClassName="w-full h-full object-contain p-0.5"
                  />
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white truncate leading-tight">
                      {nombreSistema || 'Seguimiento'}
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {subtitulo || 'Sistema de Gestión'}
                    </p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
              </div>
            </div>

            {/* Mockup 2: Pantalla de Login (Mini) */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                2. Pantalla de Acceso (Login)
              </span>
              <div className="bg-[#0e0e11] border border-white/10 rounded-xl p-4 text-center space-y-2 shadow-sm">
                <div className="flex justify-center">
                  <LogoViewer
                    src={tempLogoBase64}
                    alt={nombreSistema}
                    fallbackText={nombreSistema}
                    className="w-14 h-14 rounded-xl shadow-md"
                    imgClassName="w-full h-full object-contain p-1"
                  />
                </div>
                <div className="text-lg font-extrabold text-white tracking-wide uppercase">
                  {nombreSistema || 'Seguimiento'}
                </div>
                <div className="text-xs text-zinc-400 max-w-[220px] mx-auto truncate">
                  {subtitulo || 'Gestión integral'}
                </div>
                <div className="pt-2">
                  <div className="w-full h-8 bg-primary/20 border border-primary/30 rounded-lg text-primary text-xs flex items-center justify-center font-medium">
                    Ingresar con Credenciales
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup 3: Reporte PDF */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                3. Encabezado de Reportes y Documentos PDF
              </span>
              <div className="bg-white text-zinc-900 border border-zinc-200 rounded-xl p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                  <div className="flex items-center gap-2">
                    {tempLogoBase64 ? (
                      <img
                        src={tempLogoBase64}
                        alt="Logo PDF"
                        className="h-7 max-w-[80px] object-contain"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-indigo-600 text-white rounded flex items-center justify-center text-xs font-bold">
                        {nombreSistema.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-zinc-800 leading-tight">
                        {nombreSistema.toUpperCase()}
                      </div>
                      <div className="text-[9px] text-zinc-500">
                        REPORTE OFICIAL DEL SISTEMA
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-zinc-400 text-right">
                    Fecha: {new Date().toLocaleDateString('es-PY')}
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono bg-zinc-50 p-1.5 rounded">
                  [TABLA DE DATOS, PLANILLA O BALANCE CON MARCA CORPORATIVA]
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Sticky Móvil / Desktop */}
        <div className="lg:col-span-12 sticky bottom-0 z-30 bg-surface/90 backdrop-blur-md border-t border-border -mx-3.5 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3.5 shadow-lg flex items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-text-secondary truncate">
            {logoChanged ? (
              <span className="text-amber-400 font-medium">● Tienes cambios pendientes de guardar</span>
            ) : (
              <span>Configuración actual sincronizada</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshIcon className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Guardar Ajustes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LogosYAjustes;
