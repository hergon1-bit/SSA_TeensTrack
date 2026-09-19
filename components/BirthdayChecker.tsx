import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useGoogleWorkspace } from '../contexts/GoogleWorkspaceContext';
import { calcularEdad } from '../utils/helpers';
import { 
  Cake, Mail, CheckCircle2, AlertCircle, RefreshCw, X, Send, Sparkles, 
  GripHorizontal, Edit3, ChevronDown, ChevronUp, Copy, Eye, Bell, Settings
} from 'lucide-react';

export const BirthdayChecker: React.FC = () => {
  const { adolescentes, encargados } = useData();
  const { sendEmail, isGoogleConnected, connectGoogle } = useGoogleWorkspace();

  // Floating window visibility states
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  // Email state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Custom email message template & additional announcement
  const [showEditMsg, setShowEditMsg] = useState(false);
  const [customAnnouncement, setCustomAnnouncement] = useState<string>(() => {
    return localStorage.getItem('birthday_custom_announcement') || '';
  });
  const [customSubject, setCustomSubject] = useState<string>('');

  // Draggable position logic
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number }>({
    mouseX: 0, mouseY: 0, posX: 0, posY: 0
  });

  const adminEmail = 'hergon1@gmail.com';

  // Calculate today's birthday teens
  const todayCumpleaneros = useMemo(() => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    return adolescentes.filter(ado => {
      if (!ado.fechaNacimiento || ado.estado !== 'Activo') return false;
      try {
        const parts = ado.fechaNacimiento.split('-');
        if (parts.length < 3) return false;
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return month === todayMonth && day === todayDay;
      } catch {
        return false;
      }
    });
  }, [adolescentes]);

  // Recipient emails (Admin + Encargados)
  const recipientEmails = useMemo(() => {
    const emailsSet = new Set<string>();
    emailsSet.add(adminEmail);

    encargados.forEach(enc => {
      if (enc.email && enc.email.trim() !== '') {
        emailsSet.add(enc.email.trim());
      }
    });

    return Array.from(emailsSet);
  }, [encargados]);

  // Set default subject when birthday teens change
  useEffect(() => {
    if (todayCumpleaneros.length > 0) {
      setCustomSubject(
        `🎉 ¡Hoy hay Cumpleaños en Teens! (${todayCumpleaneros.length} ${todayCumpleaneros.length === 1 ? 'cumpleañero' : 'cumpleañeros'})`
      );
    }
  }, [todayCumpleaneros]);

  // Daily check timer at 08:00 AM or on load
  useEffect(() => {
    if (todayCumpleaneros.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastNotifiedDate = localStorage.getItem('birthday_notified_date');

    // Show banner if today hasn't been notified yet
    if (lastNotifiedDate !== todayStr) {
      setIsOpen(true);
      setIsClosed(false);
    }

    const timer = setInterval(() => {
      const now = new Date();
      if (now.getHours() >= 8 && localStorage.getItem('birthday_notified_date') !== todayStr) {
        setIsOpen(true);
        setIsClosed(false);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [todayCumpleaneros]);

  // Save custom announcement to localStorage when changed
  const handleAnnouncementChange = (text: string) => {
    setCustomAnnouncement(text);
    localStorage.setItem('birthday_custom_announcement', text);
  };

  // Generate complete email body dynamically
  const emailBody = useMemo(() => {
    const todayFormatted = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let body = `Hola equipo y encargados de Teens,\n\n`;
    body += `Hoy ${todayFormatted}, queremos felicitar a nuestros adolescentes que están de cumpleaños:\n\n`;

    todayCumpleaneros.forEach((ado, i) => {
      const edad = calcularEdad(ado.fechaNacimiento);
      body += `${i + 1}. 🎂 ${ado.nombre} ${ado.apellido} - Cumple ${edad} años.\n`;
      if (ado.telefono) body += `   📱 Teléfono: ${ado.telefono}\n`;
      if (ado.barrio || ado.ciudad) body += `   📍 Ubicación: ${ado.barrio || ''} ${ado.ciudad || ''}\n`;
      body += `\n`;
    });

    if (customAnnouncement.trim()) {
      body += `--------------------------------------------------\n`;
      body += `📢 AVISO / ANUNCIO IMPORTANTE DE LA ADMINISTRACIÓN:\n`;
      body += `${customAnnouncement.trim()}\n`;
      body += `--------------------------------------------------\n\n`;
    }

    body += `¡Recordemos enviarles un mensaje de felicitación y oración en este día especial!\n\n`;
    body += `Atentamente,\nSistema de Seguimiento de Adolescentes (Teens)`;

    return body;
  }, [todayCumpleaneros, customAnnouncement]);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow drag on header or grip
    setIsDragging(true);
    const initialPosX = position?.x ?? (window.innerWidth - 520);
    const initialPosY = position?.y ?? (window.innerHeight - 450);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: initialPosX,
      posY: initialPosY
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      // Clamp position inside screen viewport
      const newX = Math.max(10, Math.min(window.innerWidth - 380, dragStartRef.current.posX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 120, dragStartRef.current.posY + dy));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Copy email text to clipboard
  const handleCopyBody = () => {
    navigator.clipboard.writeText(`Asunto: ${customSubject}\n\n${emailBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Trigger send email
  const handleSendEmails = async () => {
    if (todayCumpleaneros.length === 0) return;
    setIsSending(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      if (isGoogleConnected) {
        await sendEmail(recipientEmails, customSubject, emailBody);
        setSendSuccess(`¡Correo enviado exitosamente a ${recipientEmails.length} destinatario(s) mediante Gmail API!`);
      } else {
        // Fallback: Open mailto link
        const mailtoUrl = `mailto:${recipientEmails.join(',')}?subject=${encodeURIComponent(customSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailtoUrl, '_blank');
        setSendSuccess(`Se abrió el cliente de correo predeterminado para enviar las notificaciones.`);
      }

      // Mark today as notified in localStorage
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem('birthday_notified_date', todayStr);
    } catch (err: any) {
      console.error('Error sending birthday email:', err);
      setSendError(err.message || 'Error al enviar notificaciones por correo.');
    } finally {
      setIsSending(false);
    }
  };

  if (todayCumpleaneros.length === 0) return null;

  // Floating trigger button when closed or minimized
  if (isClosed || !isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => {
            setIsOpen(true);
            setIsClosed(false);
          }}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-extrabold px-4 py-3 rounded-full shadow-2xl border-2 border-amber-300 transition-all transform hover:scale-105 active:scale-95 animate-bounce-once cursor-pointer"
          title="Ver notificación de Cumpleaños del Día"
        >
          <Cake className="w-6 h-6 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Cumpleaños ({todayCumpleaneros.length})
          </span>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white font-extrabold items-center justify-center">
              {todayCumpleaneros.length}
            </span>
          </span>
        </button>
      </div>
    );
  }

  // Position styling calculation
  const stylePos: React.CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px`, bottom: 'auto', right: 'auto' }
    : { bottom: '20px', right: '20px' };

  return (
    <div
      style={stylePos}
      className={`fixed z-50 max-w-md w-full px-2 sm:px-0 transition-shadow ${
        isDragging ? 'select-none opacity-95 scale-[1.01]' : ''
      }`}
    >
      <div className="bg-surface/95 border-2 border-amber-500/80 shadow-2xl rounded-2xl text-text-primary overflow-hidden backdrop-blur-xl relative transition-all">
        {/* Top header glow */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500" />

        {/* Draggable Header Bar */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between px-4 py-2.5 bg-background/60 border-b border-border/80 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2 text-text-secondary text-xs font-semibold">
            <GripHorizontal className="w-4 h-4 text-amber-500" />
            <span className="text-amber-500 font-bold uppercase tracking-wider text-[11px]">
              Panel Arrastrable
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
              title={isMinimized ? 'Expandir' : 'Minimizar'}
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsClosed(true)}
              className="p-1 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Cerrar y ocultar ventana"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Banner Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 text-amber-500 p-2.5 rounded-xl shrink-0">
                <Cake className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-text-primary">
                    ¡Cumpleaños del Día (08:00 AM)!
                  </h3>
                  <span className="bg-amber-500 text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    {todayCumpleaneros.length} {todayCumpleaneros.length === 1 ? 'Teen' : 'Teens'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Verificación automática de fecha de nacimiento.
                </p>
              </div>
            </div>
          </div>

          {!isMinimized && (
            <div className="pt-2 border-t border-border space-y-3 text-xs">
              {/* List of birthday teens */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Cumpleañeros de hoy:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {todayCumpleaneros.map(ado => (
                    <div
                      key={ado.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎂</span>
                        <div>
                          <strong className="text-text-primary font-bold">
                            {ado.nombre} {ado.apellido}
                          </strong>
                          <p className="text-[11px] text-text-secondary">
                            Cumple {calcularEdad(ado.fechaNacimiento)} años • 📱 {ado.telefono || 'Sin tel.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggle Custom Email / Announcements Section */}
              <div className="border border-border/80 rounded-xl bg-background/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowEditMsg(!showEditMsg)}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-text-primary hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Personalizar Mensaje / Añadir Avisos</span>
                  </div>
                  {showEditMsg ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showEditMsg && (
                  <div className="p-3 border-t border-border space-y-2.5 bg-background">
                    <div>
                      <label className="block text-[11px] font-medium text-text-secondary mb-1">
                        Asunto del Correo:
                      </label>
                      <input
                        type="text"
                        value={customSubject}
                        onChange={e => setCustomSubject(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-primary text-xs focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-text-secondary mb-1">
                        Anuncio o Aviso Adicional (Administración):
                      </label>
                      <textarea
                        rows={3}
                        value={customAnnouncement}
                        onChange={e => handleAnnouncementChange(e.target.value)}
                        placeholder="Ej: Recuerden la reunión de servidores este sábado a las 16:00 hs. Traer plan de clases."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-primary text-xs focus:ring-1 focus:ring-primary resize-y"
                      />
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        Este aviso se incluirá dentro del correo junto con la lista de cumpleaños.
                      </p>
                    </div>

                    {/* Body preview */}
                    <div>
                      <span className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                        Vista Previa del Correo:
                      </span>
                      <pre className="p-2 rounded-lg bg-surface border border-border text-[11px] text-text-primary font-mono whitespace-pre-wrap max-h-28 overflow-y-auto">
                        {emailBody}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Recipients Info */}
              <div className="bg-background/80 p-2 rounded-lg border border-border text-xs space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3 text-primary" />
                    Destinatarios ({recipientEmails.length}):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBody}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? '¡Copiado!' : 'Copiar Texto'}
                  </button>
                </div>
                <p className="text-[10px] text-text-primary font-mono truncate">
                  {recipientEmails.join(', ')}
                </p>
              </div>

              {/* Messages */}
              {sendSuccess && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{sendSuccess}</span>
                </div>
              )}

              {sendError && (
                <div className="p-2 bg-red-500/10 border border-red-500/30 text-red-600 rounded-lg text-xs space-y-1">
                  <div className="flex items-start gap-2 text-red-500">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-semibold">{sendError}</span>
                  </div>

                  {(sendError.includes('insufficient authentication scopes') || sendError.includes('insufficient scope')) && (
                    <div className="text-[11px] text-text-secondary bg-surface p-2 rounded border border-border space-y-1.5 mt-1">
                      <p className="font-bold text-amber-500 flex items-center gap-1">
                        🔑 Permisos de Gmail Insuficientes
                      </p>
                      <p>
                        Tu sesión actual de Google no otorgó los permisos requeridos para enviar correos.
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          await connectGoogle();
                          setSendError(null);
                        }}
                        className="w-full mt-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold py-1 px-2 rounded border border-amber-500/40 text-center transition-colors"
                      >
                        Reconectar y Conceder Permisos de Gmail
                      </button>
                    </div>
                  )}

                  {sendError.includes('Gmail API has not been used') && (
                    <div className="text-[11px] text-text-secondary bg-surface p-2 rounded border border-border space-y-1 mt-1">
                      <p className="font-bold text-text-primary">💡 ¿Cómo solucionar este error de Gmail?</p>
                      <p>
                        1. Debes habilitar la API de Gmail en la consola de Google Cloud.
                      </p>
                      <p>
                        2. O bien, haz clic en "Copiar Texto" arriba o usa el envío mediante tu cliente de correo local.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {!isGoogleConnected && (
                  <button
                    type="button"
                    onClick={() => connectGoogle()}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Conectar Gmail API
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSendEmails}
                  disabled={isSending}
                  className="ml-auto bg-amber-500 hover:bg-amber-600 text-black font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Enviar Notificación por Correo
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
