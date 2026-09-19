import { 
  Adolescente, Encargado, Reunion, Asistencia, ResumenReunion, Tutor, TutorAdolescente, 
  InscripcionEvento, PagoEvento, ParticipanteEvento, Evento, Usuario, Rol, 
  CelebracionCumpleanos, Devocional, EntregaDevocional, Servidor, InscripcionServidor, 
  PagoServidor, Permisos, TemaClase, EntregaAdhesion, PagoAdhesion 
} from '../types';

const API_BASE = '/api';

const http = {
  get: async <T>(url: string): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  },
  post: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  put: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  delete: async <T>(url: string, body?: any): Promise<T> => {
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }
};

const normalizeRol = (raw: any): Rol => {
  if (!raw) return raw;
  let permisos = raw.permisos;
  if (typeof permisos === 'string') {
    try { permisos = JSON.parse(permisos); } catch {}
  }
  return { ...raw, id: String(raw.id), permisos };
};

export const api = {
  // --- AUTHENTICATION & USERS ---
  getUsuarioById: async (id: string): Promise<Usuario | null> => {
    try {
      return await http.get<Usuario>(`/usuarios/${id}`);
    } catch {
      return null;
    }
  },

  getUsuarioByEmail: async (email: string): Promise<Usuario | null> => {
    try {
      return await http.get<Usuario>(`/usuarios/by-email?email=${encodeURIComponent(email)}`);
    } catch {
      return null;
    }
  },

  migrateUsuarioId: async (oldId: string, newId: string, userData: any): Promise<void> => {
    try {
      await http.post(`/usuarios`, { id: newId, ...userData });
      await http.delete(`/usuarios/${oldId}`);
    } catch (e) {
      console.error('Error migrating usuario ID:', e);
    }
  },

  getRolById: async (id: string): Promise<Rol | null> => {
    try {
      const rol = await http.get<Rol>(`/roles/${id}`);
      return normalizeRol(rol);
    } catch {
      return null;
    }
  },

  isFirstRun: async (): Promise<boolean> => {
    try {
      const users = await http.get<Usuario[]>('/usuarios');
      return users.length === 0;
    } catch {
      return false;
    }
  },

  ensureDefaultRoles: async (): Promise<void> => {
    // Roles are pre-populated in PostgreSQL schema/migration
  },

  updateLastSignIn: async (id: string): Promise<void> => {
    try {
      await http.post(`/auth/update-last-signin/${id}`);
    } catch {}
  },

  resetPasswordForEmail: async (email: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/auth/send-reset-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al enviar email' }));
      throw new Error(err.error || 'No se pudo enviar el email de recuperación.');
    }
  },

  updateCurrentUserPassword: async (password: string, userId?: string): Promise<void> => {
    if (userId) {
      await http.post('/auth/update-password', { userId, newPassword: password });
    }
  },

  // --- ADOLESCEentes ---
  getAdolescentes: async (): Promise<Adolescente[]> => {
    try {
      return await http.get<Adolescente[]>('/adolescentes');
    } catch {
      return [];
    }
  },

  createAdolescente: async (adolescente: Omit<Adolescente, 'id'>): Promise<Adolescente> => {
    return await http.post<Adolescente>('/adolescentes', adolescente);
  },

  updateAdolescente: async (adolescente: Adolescente): Promise<Adolescente> => {
    return await http.put<Adolescente>(`/adolescentes/${adolescente.id}`, adolescente);
  },

  deleteAdolescente: async (id: string): Promise<void> => {
    await http.delete(`/adolescentes/${id}`);
  },

  createAdolescentesBulk: async (adolescentes: Omit<Adolescente, 'id'>[]): Promise<void> => {
    await http.post('/adolescentes/bulk', adolescentes);
  },

  // --- SERVIDORES ---
  getServidores: async (): Promise<Servidor[]> => {
    try {
      return await http.get<Servidor[]>('/servidores');
    } catch {
      return [];
    }
  },

  createServidor: async (s: Omit<Servidor, 'id'>): Promise<Servidor> => {
    return await http.post<Servidor>('/servidores', s);
  },

  updateServidor: async (s: Servidor): Promise<Servidor> => {
    return await http.put<Servidor>(`/servidores/${s.id}`, s);
  },

  deleteServidor: async (id: string): Promise<void> => {
    await http.delete(`/servidores/${id}`);
  },

  getInscripcionesServidores: async (): Promise<InscripcionServidor[]> => {
    try {
      return await http.get<InscripcionServidor[]>('/inscripciones-servidores');
    } catch {
      return [];
    }
  },

  createInscripcionServidor: async (i: Omit<InscripcionServidor, 'id'>): Promise<InscripcionServidor> => {
    return await http.post<InscripcionServidor>('/inscripciones-servidores', i);
  },

  updateInscripcionServidor: async (i: InscripcionServidor): Promise<void> => {
    await http.put(`/inscripciones-servidores/${i.id}`, i);
  },

  deleteInscripcionServidor: async (id: string): Promise<void> => {
    await http.delete(`/inscripciones-servidores/${id}`);
  },

  getPagosServidores: async (): Promise<PagoServidor[]> => {
    try {
      return await http.get<PagoServidor[]>('/pagos-servidores');
    } catch {
      return [];
    }
  },

  createPagoServidor: async (p: Omit<PagoServidor, 'id'>): Promise<PagoServidor> => {
    return await http.post<PagoServidor>('/pagos-servidores', p);
  },

  deletePagoServidor: async (id: string): Promise<void> => {
    await http.delete(`/pagos-servidores/${id}`);
  },

  // --- ENCARGADOS ---
  getEncargados: async (): Promise<Encargado[]> => {
    try {
      return await http.get<Encargado[]>('/encargados');
    } catch {
      return [];
    }
  },

  createEncargado: async (encargado: Omit<Encargado, 'id'>): Promise<Encargado> => {
    return await http.post<Encargado>('/encargados', encargado);
  },

  updateEncargado: async (encargado: Encargado): Promise<Encargado> => {
    return await http.put<Encargado>(`/encargados/${encargado.id}`, encargado);
  },

  deleteEncargado: async (id: string): Promise<void> => {
    await http.delete(`/encargados/${id}`);
  },

  createEncargadosBulk: async (encargados: Omit<Encargado, 'id'>[]): Promise<void> => {
    await http.post('/encargados/bulk', encargados);
  },

  // --- REUNIONES ---
  getReuniones: async (): Promise<Reunion[]> => {
    try {
      return await http.get<Reunion[]>('/reuniones');
    } catch {
      return [];
    }
  },

  createReunion: async (reunion: Omit<Reunion, 'id'>): Promise<Reunion> => {
    return await http.post<Reunion>('/reuniones', reunion);
  },

  updateReunion: async (reunion: Reunion): Promise<Reunion> => {
    return await http.put<Reunion>(`/reuniones/${reunion.id}`, reunion);
  },

  deleteReunion: async (id: string): Promise<void> => {
    await http.delete(`/reuniones/${id}`);
  },

  createReunionesBulk: async (reuniones: any[]): Promise<void> => {
    await http.post('/reuniones/bulk', reuniones);
  },

  getResumenReuniones: async (): Promise<ResumenReunion[]> => {
    try {
      return await http.get<ResumenReunion[]>('/reuniones/resumen');
    } catch {
      return [];
    }
  },

  // --- TUTORES ---
  getTutores: async (): Promise<Tutor[]> => {
    try {
      return await http.get<Tutor[]>('/tutores');
    } catch {
      return [];
    }
  },

  createTutor: async (tutor: Omit<Tutor, 'id'>): Promise<Tutor> => {
    return await http.post<Tutor>('/tutores', tutor);
  },

  updateTutor: async (tutor: Tutor): Promise<Tutor> => {
    return await http.put<Tutor>(`/tutores/${tutor.id}`, tutor);
  },

  deleteTutor: async (id: string): Promise<void> => {
    await http.delete(`/tutores/${id}`);
  },

  getTutorAdolescente: async (): Promise<TutorAdolescente[]> => {
    try {
      return await http.get<TutorAdolescente[]>('/tutor-adolescente');
    } catch {
      return [];
    }
  },

  setTutorAdolescenteLinks: async (tutorId: string, adolescenteIds: string[]): Promise<void> => {
    await http.post('/tutor-adolescente/links', { tutorId, adolescenteIds });
  },

  createTutoresAndLinkBulk: async (tutores: any[]): Promise<void> => {
    // Optional bulk helper
  },

  // --- ASISTENCIAS ---
  getAsistencias: async (): Promise<Asistencia[]> => {
    try {
      return await http.get<Asistencia[]>('/asistencias');
    } catch {
      return [];
    }
  },

  getAsistenciasByReunion: async (reunionId: string): Promise<Asistencia[]> => {
    try {
      return await http.get<Asistencia[]>(`/asistencias/by-reunion/${reunionId}`);
    } catch {
      return [];
    }
  },

  saveAsistencias: async (nuevasAsistencias: Asistencia[]): Promise<void> => {
    await http.post('/asistencias/bulk', nuevasAsistencias);
  },

  // --- EVENTOS ---
  getEventos: async (): Promise<Evento[]> => {
    try {
      return await http.get<Evento[]>('/eventos');
    } catch {
      return [];
    }
  },

  createEvento: async (evento: Omit<Evento, 'id'>): Promise<Evento> => {
    return await http.post<Evento>('/eventos', evento);
  },

  updateEvento: async (evento: Evento): Promise<Evento> => {
    return await http.put<Evento>(`/eventos/${evento.id}`, evento);
  },

  deleteEvento: async (id: string): Promise<void> => {
    await http.delete(`/eventos/${id}`);
  },

  getInscripciones: async (): Promise<InscripcionEvento[]> => {
    try {
      return await http.get<InscripcionEvento[]>('/inscripciones-eventos');
    } catch {
      return [];
    }
  },

  createInscripcion: async (i: Omit<InscripcionEvento, 'id'>): Promise<InscripcionEvento> => {
    return await http.post<InscripcionEvento>('/inscripciones-eventos', i);
  },

  updateInscripcion: async (i: InscripcionEvento): Promise<InscripcionEvento> => {
    return await http.put<InscripcionEvento>(`/inscripciones-eventos/${i.id}`, i);
  },

  deleteInscripcion: async (id: string): Promise<void> => {
    await http.delete(`/inscripciones-eventos/${id}`);
  },

  getPagos: async (): Promise<PagoEvento[]> => {
    try {
      return await http.get<PagoEvento[]>('/pagos-eventos');
    } catch {
      return [];
    }
  },

  createPago: async (p: Omit<PagoEvento, 'id'>): Promise<PagoEvento> => {
    return await http.post<PagoEvento>('/pagos-eventos', p);
  },

  deletePago: async (id: string): Promise<void> => {
    await http.delete(`/pagos-eventos/${id}`);
  },

  getParticipantes: async (): Promise<ParticipanteEvento[]> => {
    try {
      return await http.get<ParticipanteEvento[]>('/participantes-eventos');
    } catch {
      return [];
    }
  },

  addParticipante: async (p: ParticipanteEvento): Promise<ParticipanteEvento> => {
    return await http.post<ParticipanteEvento>('/participantes-eventos', p);
  },

  removeParticipante: async (eventoId: string, adolescenteId: string): Promise<void> => {
    await http.delete('/participantes-eventos', { eventoId, adolescenteId });
  },

  // --- DEVOCIONALES ---
  getDevocionales: async (): Promise<Devocional[]> => {
    try {
      return await http.get<Devocional[]>('/devocionales');
    } catch {
      return [];
    }
  },

  createDevocional: async (d: Omit<Devocional, 'id'>): Promise<Devocional> => {
    return await http.post<Devocional>('/devocionales', d);
  },

  updateDevocional: async (d: Devocional): Promise<Devocional> => {
    return await http.put<Devocional>(`/devocionales/${d.id}`, d);
  },

  deleteDevocional: async (id: string): Promise<void> => {
    await http.delete(`/devocionales/${id}`);
  },

  getEntregasDevocionales: async (): Promise<EntregaDevocional[]> => {
    try {
      return await http.get<EntregaDevocional[]>('/entregas-devocionales');
    } catch {
      return [];
    }
  },

  registrarEntregasBulk: async (entregas: Omit<EntregaDevocional, 'id'>[]): Promise<void> => {
    await http.post('/entregas-devocionales/bulk', entregas);
  },

  updateEntregaDevocional: async (entrega: EntregaDevocional): Promise<void> => {
    await http.put(`/entregas-devocionales/${entrega.id}`, entrega);
  },

  deleteEntrega: async (id: string): Promise<void> => {
    await http.delete(`/entregas-devocionales/${id}`);
  },

  // --- CELEBRACIONES CUMPLEAÑOS ---
  getCumpleanosCelebrados: async (): Promise<CelebracionCumpleanos[]> => {
    try {
      return await http.get<CelebracionCumpleanos[]>('/celebraciones-cumpleanos');
    } catch {
      return [];
    }
  },

  addCumpleanosCelebrado: async (c: CelebracionCumpleanos): Promise<CelebracionCumpleanos> => {
    return await http.post<CelebracionCumpleanos>('/celebraciones-cumpleanos', c);
  },

  // --- USUARIOS Y ROLES ---
  getUsuarios: async (): Promise<Usuario[]> => {
    try {
      return await http.get<Usuario[]>('/usuarios');
    } catch {
      return [];
    }
  },

  getRoles: async (): Promise<Rol[]> => {
    try {
      const roles = await http.get<Rol[]>('/roles');
      return roles.map(normalizeRol);
    } catch {
      return [];
    }
  },

  setupFirstAdmin: async (usuario: any): Promise<void> => {
    await http.post('/usuarios', { ...usuario, rolId: '1' });
  },

  createUsuario: async (usuario: any): Promise<Usuario> => {
    return await http.post<Usuario>('/usuarios', usuario);
  },

  updateUsuario: async (usuario: Usuario): Promise<Usuario> => {
    return await http.put<Usuario>(`/usuarios/${usuario.id}`, usuario);
  },

  deleteUsuario: async (id: string): Promise<void> => {
    await http.delete(`/usuarios/${id}`);
  },

  createRole: async (role: Omit<Rol, 'id'>): Promise<Rol> => {
    const raw = await http.post<Rol>('/roles', role);
    return normalizeRol(raw);
  },

  updateRole: async (role: Rol): Promise<Rol> => {
    const raw = await http.put<Rol>(`/roles/${role.id}`, role);
    return normalizeRol(raw);
  },

  deleteRole: async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
      return await http.delete<{ success: boolean; message?: string }>(`/roles/${id}`);
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  createUserProfileWithId: async (id: string, userData: any): Promise<Usuario> => {
    return await http.post<Usuario>('/usuarios', { id, ...userData });
  },

  createUserProfile: async (profile: Usuario): Promise<Usuario> => {
    return api.createUsuario(profile);
  },

  clearTable: async (table: string): Promise<void> => {
    console.warn('clearTable not directly exposed via API for safety');
  },

  // --- TEMAS Y PLAN DE CLASES ---
  getTemasClases: async (): Promise<TemaClase[]> => {
    try {
      return await http.get<TemaClase[]>('/temas-clases');
    } catch {
      return [];
    }
  },

  addTemaClase: async (tema: Omit<TemaClase, 'id'>): Promise<TemaClase> => {
    return await http.post<TemaClase>('/temas-clases', tema);
  },

  updateTemaClase: async (tema: TemaClase): Promise<void> => {
    await http.put(`/temas-clases/${tema.id}`, tema);
  },

  deleteTemaClase: async (id: string): Promise<void> => {
    await http.delete(`/temas-clases/${id}`);
  },

  // --- ADHESIONES / ENTRADAS ---
  getEntregasAdhesiones: async (): Promise<EntregaAdhesion[]> => {
    try {
      return await http.get<EntregaAdhesion[]>('/entregas-adhesiones');
    } catch {
      return [];
    }
  },

  createEntregaAdhesion: async (entrega: Omit<EntregaAdhesion, 'id'>): Promise<EntregaAdhesion> => {
    return await http.post<EntregaAdhesion>('/entregas-adhesiones', entrega);
  },

  updateEntregaAdhesion: async (entrega: EntregaAdhesion): Promise<EntregaAdhesion> => {
    return await http.put<EntregaAdhesion>(`/entregas-adhesiones/${entrega.id}`, entrega);
  },

  deleteEntregaAdhesion: async (id: string): Promise<void> => {
    await http.delete(`/entregas-adhesiones/${id}`);
  },

  getPagosAdhesiones: async (): Promise<PagoAdhesion[]> => {
    try {
      return await http.get<PagoAdhesion[]>('/pagos-adhesiones');
    } catch {
      return [];
    }
  },

  createPagoAdhesion: async (pago: Omit<PagoAdhesion, 'id'>): Promise<PagoAdhesion> => {
    return await http.post<PagoAdhesion>('/pagos-adhesiones', pago);
  },

  deletePagoAdhesion: async (id: string): Promise<void> => {
    await http.delete(`/pagos-adhesiones/${id}`);
  }
};
