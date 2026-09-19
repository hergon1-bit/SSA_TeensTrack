import React, { useState, useEffect } from 'react';
import { useGoogleWorkspace } from '../contexts/GoogleWorkspaceContext';
import { useData } from '../contexts/DataContext';

import { motion } from 'motion/react';
import { formatDate } from '../utils/helpers';
import { 
  Mail, CheckSquare, Video, MessageSquare, RefreshCw, 
  Plus, CheckCircle, Search, ExternalLink, Trash2, Calendar, 
  ArrowRight, ShieldCheck, LogOut, ChevronRight, Check
} from 'lucide-react';

type SubTab = 'gmail' | 'tasks' | 'meet' | 'chat';

const Workspace: React.FC = () => {
  const {
    googleToken,
    isGoogleConnected,
    isConnecting,
    error,
    connectGoogle,
    disconnectGoogle,
    fetchEmails,
    fetchEmailDetails,
    fetchTaskLists,
    fetchTasks,
    createTask,
    completeTask,
    createMeetSpace,
    sendChatMessage
  } = useGoogleWorkspace();

  const { devocionales, reuniones } = useData();

  // Navigation and feedback state
  const [activeTab, setActiveTab] = useState<SubTab>('gmail');
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Gmail states
  const [emails, setEmails] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [readingEmail, setReadingEmail] = useState(false);

  // Google Tasks states
  const [taskLists, setTaskLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');

  // Google Meet states
  const [generatedMeetLink, setGeneratedMeetLink] = useState<string | null>(null);

  // Google Chat states
  const [chatSpaceId, setChatSpaceId] = useState('');
  const [chatMessage, setChatMessage] = useState('');

  // Automatically refresh lists on connection
  useEffect(() => {
    if (isGoogleConnected) {
      handleLoadGmail();
      handleLoadTaskLists();
    }
  }, [isGoogleConnected]);

  useEffect(() => {
    if (selectedListId) {
      handleLoadTasks(selectedListId);
    }
  }, [selectedListId]);

  // Flash messages
  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 5000);
  };

  // --- Gmail Handlers ---
  const handleLoadGmail = async () => {
    setLoading(true);
    try {
      const msgs = await fetchEmails(searchQuery || undefined);
      setEmails(msgs);
    } catch (err: any) {
      showError(err.message || 'Error al cargar correos');
    } finally {
      setLoading(false);
    }
  };

  const handleReadEmail = async (id: string) => {
    setReadingEmail(true);
    try {
      const full = await fetchEmailDetails(id);
      setSelectedEmail(full);
    } catch (err: any) {
      showError(err.message || 'Error al leer detalle del correo');
    } finally {
      setReadingEmail(false);
    }
  };

  // --- Google Tasks Handlers ---
  const handleLoadTaskLists = async () => {
    try {
      const lists = await fetchTaskLists();
      setTaskLists(lists);
      if (lists.length > 0 && !selectedListId) {
        setSelectedListId(lists[0].id);
      }
    } catch (err: any) {
      showError(err.message || 'Error al cargar listas de tareas');
    }
  };

  const handleLoadTasks = async (listId: string) => {
    setLoading(true);
    try {
      const tks = await fetchTasks(listId);
      setTasks(tks);
    } catch (err: any) {
      showError(err.message || 'Error al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedListId) return;

    try {
      const created = await createTask(
        selectedListId, 
        newTaskTitle, 
        newTaskNotes || undefined, 
        newTaskDue || undefined
      );
      setTasks(prev => [created, ...prev]);
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDue('');
      showSuccess('Tarea creada exitosamente en Google Tasks');
    } catch (err: any) {
      if (err.message !== 'Operación cancelada por el usuario') {
        showError(err.message || 'Error al crear la tarea');
      }
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (!selectedListId) return;
    const isCompleted = currentStatus === 'completed';
    const targetStatus = !isCompleted;

    try {
      await completeTask(selectedListId, taskId, targetStatus);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus ? 'completed' : 'needsAction' } : t));
      showSuccess(`Tarea marcada como ${targetStatus ? 'completada' : 'pendiente'}`);
    } catch (err: any) {
      if (err.message !== 'Operación cancelada por el usuario') {
        showError(err.message || 'Error al actualizar el estado de la tarea');
      }
    }
  };

  // Bulk Sync of Devocionales/Activities to Google Tasks
  const handleSyncDevocionalesToTasks = async () => {
    if (!selectedListId) {
      showError('Por favor selecciona una lista de tareas primero.');
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas sincronizar los ${devocionales.length} devocionales registrados en la base de datos con Google Tasks?\nEsto creará un recordatorio para cada uno de ellos.`
    );
    if (!confirmed) return;

    setLoading(true);
    let count = 0;
    try {
      for (const dev of devocionales) {
        const title = `Devocional Semana ${dev.numeroSemana}: ${dev.tema}`;
        const notes = `Distribución: ${dev.fechaDistribucion}\nVencimiento: ${dev.fechaVencimiento || 'No especificada'}`;
        // Create task
        await createTask(selectedListId, title, notes, dev.fechaVencimiento || dev.fechaDistribucion);
        count++;
      }
      showSuccess(`Sincronización completada: se crearon ${count} tareas.`);
      handleLoadTasks(selectedListId);
    } catch (err: any) {
      if (err.message !== 'Operación cancelada por el usuario') {
        showError(`Error durante la sincronización: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Google Meet Handlers ---
  const handleCreateMeet = async () => {
    try {
      const uri = await createMeetSpace();
      setGeneratedMeetLink(uri);
      showSuccess('Enlace de Google Meet generado exitosamente.');
    } catch (err: any) {
      if (err.message !== 'Operación cancelada por el usuario') {
        showError(err.message || 'Error al generar espacio de reunión');
      }
    }
  };

  // --- Google Chat Handlers ---
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatSpaceId.trim() || !chatMessage.trim()) return;

    try {
      await sendChatMessage(chatSpaceId, chatMessage);
      setChatMessage('');
      showSuccess('Mensaje enviado exitosamente a Google Chat');
    } catch (err: any) {
      if (err.message !== 'Operación cancelada por el usuario') {
        showError(err.message || 'Error al enviar mensaje');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title & Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            Centro de Integración Google Workspace
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Vincula tu cuenta para gestionar el ecosistema de herramientas de Google (Gmail, Tasks, Meet, Chat)
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          {isGoogleConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
              <ShieldCheck className="w-4 h-4" />
              Ecosistema Conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              <ShieldCheck className="w-4 h-4" />
              Sin Conexión
            </span>
          )}
        </div>
      </div>

      {/* Connection Card / Branded Button */}
      {!isGoogleConnected ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-border rounded-xl p-8 text-center space-y-6 shadow-sm max-w-2xl mx-auto"
        >
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-text-primary">Conecta tu Cuenta de Google Workspace</h3>
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              Para sincronizar las actividades de tu grupo juvenil con Gmail, Google Tasks, Google Meet y Google Chat, por favor inicia sesión y autoriza los permisos.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={connectGoogle}
              disabled={isConnecting}
              className="gsi-material-button transition-transform duration-200 hover:scale-[1.02] shadow-md hover:shadow-lg"
              style={{ margin: '0 auto' }}
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-medium">Inicia Sesión con Google</span>
              </div>
            </button>
            {isConnecting && <p className="text-xs text-text-secondary animate-pulse">Abriendo ventana de autenticación...</p>}
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Navigation & Session controls */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Conectado a Google</span>
                <button 
                  onClick={disconnectGoogle}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Desconectar
                </button>
              </div>
            </div>

            {/* Sidebar Sub-Tabs */}
            <div className="bg-surface border border-border rounded-xl p-2 shadow-sm space-y-1">
              <button
                onClick={() => setActiveTab('gmail')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'gmail' 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                }`}
              >
                <Mail className="w-4 h-4" />
                Gmail Inbox
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'tasks' 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                Google Tasks
              </button>
              <button
                onClick={() => setActiveTab('meet')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'meet' 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                }`}
              >
                <Video className="w-4 h-4" />
                Google Meet
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'chat' 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Google Chat Space
              </button>
            </div>
          </div>

          {/* Right Column - Dynamic Actions View */}
          <div className="lg:col-span-3 space-y-4">
            {/* Action Feedback */}
            {actionSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 text-green-500 text-sm font-medium border border-green-500/20 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm"
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{actionSuccess}</span>
              </motion.div>
            )}

            {actionError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 text-red-500 text-sm font-medium border border-red-500/20 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm"
              >
                <span className="font-bold flex-shrink-0">⚠️</span>
                <span>{actionError}</span>
              </motion.div>
            )}

            {/* TAB: GMAIL INBOX */}
            {activeTab === 'gmail' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6"
              >
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" />
                      Bandeja de Entrada (Gmail)
                    </h2>
                    <p className="text-xs text-text-secondary">Visualiza tus últimos correos recibidos o realiza búsquedas avanzadas</p>
                  </div>
                  <button
                    onClick={handleLoadGmail}
                    disabled={loading}
                    className="p-2 bg-background border border-border hover:bg-surface-hover rounded-lg text-text-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Email Search Bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Buscar en correos (ej. teens, reuniones...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoadGmail()}
                      className="w-full bg-background border border-border pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleLoadGmail}
                    className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                  >
                    Buscar
                  </button>
                </div>

                {/* Email List or Detail */}
                {selectedEmail ? (
                  <div className="border border-border rounded-lg p-5 bg-background space-y-4">
                    <button 
                      onClick={() => setSelectedEmail(null)}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      &larr; Volver a la lista
                    </button>
                    <div className="border-b border-border pb-3">
                      <h3 className="text-lg font-bold text-text-primary">{selectedEmail.subject}</h3>
                      <div className="flex flex-col md:flex-row justify-between text-xs text-text-secondary mt-1 gap-1">
                        <span><strong>De:</strong> {selectedEmail.from}</span>
                        <span>{selectedEmail.date}</span>
                      </div>
                    </div>
                    <div className="text-sm text-text-primary leading-relaxed whitespace-pre-line p-3 bg-surface rounded border border-border/50 max-h-96 overflow-y-auto">
                      {selectedEmail.body || selectedEmail.snippet}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-center py-12 space-y-2">
                        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
                        <p className="text-sm text-text-secondary">Cargando correos de Gmail...</p>
                      </div>
                    ) : emails.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                        <Mail className="w-12 h-12 text-border mx-auto mb-2" />
                        <p className="text-sm font-semibold text-text-secondary">No se encontraron correos</p>
                        <p className="text-xs text-text-secondary">Prueba con otra palabra clave o haz clic en actualizar</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                        {emails.map((email) => (
                          <div 
                            key={email.id} 
                            onClick={() => handleReadEmail(email.id)}
                            className="p-4 hover:bg-background transition-colors cursor-pointer flex justify-between items-start gap-4"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-primary truncate max-w-[150px]">{email.from.split('<')[0]}</span>
                                <span className="text-xs text-text-secondary">{email.date}</span>
                              </div>
                              <h4 className="text-sm font-semibold text-text-primary truncate">{email.subject}</h4>
                              <p className="text-xs text-text-secondary line-clamp-1">{email.snippet}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-secondary mt-1 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: GOOGLE TASKS */}
            {activeTab === 'tasks' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-primary" />
                      Gestor de Google Tasks
                    </h2>
                    <p className="text-xs text-text-secondary">Sincroniza y gestiona las actividades juveniles con tus tareas de Google</p>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    {/* List Selector */}
                    <select
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className="bg-background border border-border px-3 py-1.5 rounded-lg text-xs font-medium text-text-primary focus:outline-none"
                    >
                      {taskLists.map(list => (
                        <option key={list.id} value={list.id}>{list.title}</option>
                      ))}
                    </select>

                    <button
                      onClick={handleSyncDevocionalesToTasks}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sincronizar Devocionales
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Task Creation Form */}
                  <div className="border border-border rounded-xl p-5 bg-background space-y-4">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-primary" />
                      Crear Nueva Tarea
                    </h3>
                    <form onSubmit={handleCreateTask} className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-text-secondary block mb-1">Título de la Tarea *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Preparar folletos del devocional de la semana"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full bg-surface border border-border px-3 py-2 rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-text-secondary block mb-1">Notas / Detalles</label>
                        <textarea
                          placeholder="Notas opcionales..."
                          value={newTaskNotes}
                          onChange={(e) => setNewTaskNotes(e.target.value)}
                          rows={2}
                          className="w-full bg-surface border border-border px-3 py-2 rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-text-secondary block mb-1">Fecha de Vencimiento (Due Date)</label>
                        <input
                          type="date"
                          value={newTaskDue}
                          onChange={(e) => setNewTaskDue(e.target.value)}
                          className="w-full bg-surface border border-border px-3 py-2 rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                      >
                        Añadir a Google Tasks
                      </button>
                    </form>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-text-primary flex items-center justify-between">
                      <span>Lista de Tareas</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-border text-text-secondary">
                        {tasks.length} tareas
                      </span>
                    </h3>

                    {loading ? (
                      <div className="text-center py-12">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-xs text-text-secondary">Cargando tareas...</p>
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg bg-background">
                        <CheckSquare className="w-10 h-10 text-border mx-auto mb-2" />
                        <p className="text-xs font-semibold text-text-secondary">No hay tareas en esta lista</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {tasks.map(task => {
                          const isComp = task.status === 'completed';
                          return (
                            <div 
                              key={task.id}
                              className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                                isComp ? 'bg-background/40 border-border text-text-secondary' : 'bg-background border-border hover:bg-background/70'
                              }`}
                            >
                              <button
                                onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                                  isComp 
                                    ? 'bg-green-500 border-green-500 text-white' 
                                    : 'border-text-secondary hover:border-primary'
                                }`}
                              >
                                {isComp && <Check className="w-3 h-3" />}
                              </button>
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <p className={`text-xs font-semibold truncate ${isComp ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                                  {task.title}
                                </p>
                                {task.notes && <p className="text-[10px] text-text-secondary line-clamp-2">{task.notes}</p>}
                                {task.due && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-yellow-600 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded mt-1">
                                    <Calendar className="w-2.5 h-2.5" />
                                    Vence: {formatDate(task.due)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: GOOGLE MEET */}
            {activeTab === 'meet' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6"
              >
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Google Meet Launcher
                  </h2>
                  <p className="text-xs text-text-secondary">Genera espacios virtuales y enlaces de Google Meet al instante para tus coordinaciones o reuniones virtuales</p>
                </div>

                <div className="bg-background border border-border rounded-xl p-8 text-center max-w-xl mx-auto space-y-6 shadow-sm">
                  <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <Video className="w-7 h-7" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-text-primary">Generar Sala Virtual de Google Meet</h3>
                    <p className="text-xs text-text-secondary max-w-sm mx-auto">
                      Crea un enlace permanente que podrás compartir con líderes, tutores o padres del grupo para realizar llamadas virtuales seguras.
                    </p>
                  </div>

                  <button
                    onClick={handleCreateMeet}
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm inline-flex items-center gap-2"
                  >
                    Crear Enlace de Reunión
                  </button>

                  {generatedMeetLink && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="border border-green-500/30 bg-green-500/5 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3"
                    >
                      <div className="text-left min-w-0">
                        <p className="text-xs font-bold text-green-500 flex items-center gap-1">
                          <CheckSquare className="w-4 h-4" /> Enlace Listo
                        </p>
                        <p className="text-sm font-semibold text-text-primary truncate break-all">{generatedMeetLink}</p>
                      </div>
                      <a 
                        href={generatedMeetLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors flex-shrink-0"
                      >
                        Entrar <ExternalLink className="w-3 h-3" />
                      </a>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: GOOGLE CHAT */}
            {activeTab === 'chat' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6"
              >
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Consola de Notificaciones Google Chat
                  </h2>
                  <p className="text-xs text-text-secondary">Envía mensajes informativos directamente a espacios (Spaces) de tu equipo de Google Chat</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="border border-border rounded-xl p-5 bg-background space-y-4">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      Enviar Mensaje Directo
                    </h3>
                    <form onSubmit={handleSendChatMessage} className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-text-secondary block mb-1">ID del Espacio de Google Chat (Space ID) *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. spaces/AAAA1234bca"
                          value={chatSpaceId}
                          onChange={(e) => setChatSpaceId(e.target.value)}
                          className="w-full bg-surface border border-border px-3 py-2 rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                        <p className="text-[10px] text-text-secondary mt-1">Suele extraerse de la URL del espacio de Google Chat</p>
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-text-secondary block mb-1">Mensaje *</label>
                        <textarea
                          required
                          placeholder="Escribe el mensaje para el espacio juvenil..."
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          rows={3}
                          className="w-full bg-surface border border-border px-3 py-2 rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                      >
                        Publicar Mensaje
                      </button>
                    </form>
                  </div>

                  <div className="border border-border rounded-xl p-5 bg-background space-y-3">
                    <h3 className="text-sm font-bold text-text-primary">Integraciones Rápidas</h3>
                    <p className="text-xs text-text-secondary">
                      Puedes configurar tus espacios de Google Chat para recibir alertas automáticas del sistema, como cuando se registra un adolescente nuevo o se agenda una reunión.
                    </p>
                    <div className="bg-surface border border-border p-3.5 rounded-lg space-y-2">
                      <p className="text-xs font-bold text-text-primary">Ejemplo de Alerta:</p>
                      <div className="border-l-2 border-primary pl-2 text-[11px] text-text-secondary space-y-1">
                        <p className="font-semibold text-text-primary">📢 NOTIFICACIÓN GRUPO JUVENIL</p>
                        <p>Se ha registrado un nuevo adolescente:</p>
                        <p>• <strong>Nombre:</strong> Mateo Pérez</p>
                        <p>• <strong>Fecha de Registro:</strong> {formatDate(new Date())}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
