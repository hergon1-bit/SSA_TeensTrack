
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Adolescente, Encargado, Devocional, EntregaDevocional, Reunion, 
  Asistencia, Tutor, Evento, Usuario, Rol, TutorAdolescente,
  InscripcionEvento, PagoEvento, ParticipanteEvento, CelebracionCumpleanos,
  Servidor, InscripcionServidor, PagoServidor, TemaClase, EntregaAdhesion, PagoAdhesion
} from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface DataContextType {
  adolescentes: Adolescente[];
  encargados: Encargado[];
  reuniones: Reunion[];
  devocionales: Devocional[];
  entregasDevocionales: EntregaDevocional[];
  asistencias: Asistencia[];
  tutores: Tutor[];
  eventos: Evento[];
  usuarios: Usuario[];
  roles: Rol[];
  tutoresAdolescentes: TutorAdolescente[];
  inscripciones: InscripcionEvento[];
  pagos: PagoEvento[];
  participantes: ParticipanteEvento[];
  celebraciones: CelebracionCumpleanos[];
  
  // Servidores
  servidores: Servidor[];
  inscripcionesServidores: InscripcionServidor[];
  pagosServidores: PagoServidor[];
  
  // Temas y Plan de Clases
  temasClases: TemaClase[];
  addTemaClase: (t: Omit<TemaClase, 'id'>) => Promise<void>;
  updateTemaClase: (t: TemaClase) => Promise<void>;
  deleteTemaClase: (id: string) => Promise<void>;

  // Adhesiones / Entradas
  entregasAdhesiones: EntregaAdhesion[];
  pagosAdhesiones: PagoAdhesion[];
  addEntregaAdhesion: (e: Omit<EntregaAdhesion, 'id'>) => Promise<EntregaAdhesion>;
  updateEntregaAdhesion: (e: EntregaAdhesion) => Promise<void>;
  deleteEntregaAdhesion: (id: string) => Promise<void>;
  addPagoAdhesion: (p: Omit<PagoAdhesion, 'id'>) => Promise<PagoAdhesion>;
  deletePagoAdhesion: (id: string) => Promise<void>;
  
  fetchData: () => Promise<void>;
  addAdolescente: (a: Omit<Adolescente, 'id'>) => Promise<void>;
  updateAdolescente: (a: Adolescente) => Promise<void>;
  deleteAdolescente: (id: string) => Promise<void>;
  // Fix: changed parameter type to array to match implementation and usage
  addAdolescentesBulk: (a: Omit<Adolescente, 'id'>[]) => Promise<void>;
  
  addServidor: (s: Omit<Servidor, 'id'>) => Promise<void>;
  updateServidor: (s: Servidor) => Promise<void>;
  deleteServidor: (id: string) => Promise<void>;
  
  addInscripcionServidor: (i: Omit<InscripcionServidor, 'id'>) => Promise<InscripcionServidor>;
  updateInscripcionServidor: (i: InscripcionServidor) => Promise<void>;
  deleteInscripcionServidor: (id: string) => Promise<void>;
  
  addPagoServidor: (iId: string, m: number, fecha: string, notas?: string) => Promise<void>;
  deletePagoServidor: (id: string) => Promise<void>;

  addEncargado: (e: Omit<Encargado, 'id'>) => Promise<void>;
  updateEncargado: (e: Encargado) => Promise<void>;
  deleteEncargado: (id: string) => Promise<void>;
  addEncargadosBulk: (e: Omit<Encargado, 'id'>[]) => Promise<void>;
  
  addReunion: (r: Omit<Reunion, 'id'>) => Promise<void>;
  updateReunion: (r: Reunion) => Promise<void>;
  deleteReunion: (id: string) => Promise<void>;
  addReunionesBulk: (r: any[]) => Promise<void>;
  
  saveAsistencias: (a: Asistencia[]) => Promise<void>;
  
  addTutor: (t: Omit<Tutor, 'id'>, adolescentIds: string[]) => Promise<void>;
  updateTutor: (t: Tutor, adolescentIds: string[]) => Promise<void>;
  deleteTutor: (id: string) => Promise<void>;
  addTutoresAndLinkBulk: (t: any[]) => Promise<void>;
  
  addEvento: (e: Omit<Evento, 'id'>) => Promise<void>;
  updateEvento: (e: Evento) => Promise<void>;
  deleteEvento: (id: string) => Promise<void>;
  
  addInscripcion: (eId: string, aId?: string, tId?: string) => Promise<void>;
  updateInscripcion: (i: InscripcionEvento) => Promise<void>;
  deleteInscripcion: (id: string) => Promise<void>;
  
  addPago: (iId: string, m: number, fecha: string, notas?: string) => Promise<void>;
  deletePago: (id: string) => Promise<void>;
  
  addParticipante: (eId: string, aId: string) => Promise<void>;
  removeParticipante: (eId: string, aId: string) => Promise<void>;
  
  addCelebracionCumpleanos: (aId: string, ano: number) => Promise<void>;
  
  addUser: (u: any) => Promise<void>;
  updateUser: (u: Usuario) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  
  addRole: (r: Omit<Rol, 'id'>) => Promise<void>;
  updateRole: (r: Rol) => Promise<void>;
  deleteRole: (id: string) => Promise<{ success: boolean; message?: string }>;
  
  addDevocional: (d: Omit<Devocional, 'id'>) => Promise<void>;
  updateDevocional: (d: Devocional) => Promise<void>;
  deleteDevocional: (id: string) => Promise<void>;
  registrarEntregaBulk: (e: Omit<EntregaDevocional, 'id'>[]) => Promise<void>;
  updateEntrega: (e: EntregaDevocional) => Promise<void>;
  deleteEntrega: (id: string) => Promise<void>;
  
  clearTable: (table: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user } = useAuth();
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [devocionales, setDevocionales] = useState<Devocional[]>([]);
  const [entregasDevocionales, setEntregasDevocionales] = useState<EntregaDevocional[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [tutoresAdolescentes, setTutoresAdolescentes] = useState<TutorAdolescente[]>([]);
  const [inscripciones, setInscripciones] = useState<InscripcionEvento[]>([]);
  const [pagos, setPagos] = useState<PagoEvento[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteEvento[]>([]);
  const [celebraciones, setCelebraciones] = useState<CelebracionCumpleanos[]>([]);
  
  // Servidores state
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [inscripcionesServidores, setInscripcionesServidores] = useState<InscripcionServidor[]>([]);
  const [pagosServidores, setPagosServidores] = useState<PagoServidor[]>([]);
  
  // Temas y Plan de Clases state
  const [temasClases, setTemasClases] = useState<TemaClase[]>([]);

  // Adhesiones / Entradas state
  const [entregasAdhesiones, setEntregasAdhesiones] = useState<EntregaAdhesion[]>([]);
  const [pagosAdhesiones, setPagosAdhesiones] = useState<PagoAdhesion[]>([]);

  const fetchData = useCallback(async () => {
    try {
        const ados = await api.getAdolescentes();
        setAdolescentes(ados);
    } catch (e) { console.error("Error loading adolescents", e); }

    // Load tables in background
    const loadTable = async (fn: () => Promise<any>, set: (data: any) => void) => {
        try {
            const data = await fn();
            set(data);
        } catch (e) {
            console.warn(`Error loading table in background:`, e);
        }
    };

    loadTable(api.getEncargados, setEncargados);
    loadTable(api.getReuniones, setReuniones);
    loadTable(api.getDevocionales, setDevocionales);
    loadTable(api.getEntregasDevocionales, setEntregasDevocionales);
    loadTable(api.getAsistencias, setAsistencias);
    loadTable(api.getTutores, setTutores);
    loadTable(api.getEventos, setEventos);
    loadTable(api.getUsuarios, setUsuarios);
    loadTable(api.getRoles, setRoles);
    loadTable(api.getTutorAdolescente, setTutoresAdolescentes);
    loadTable(api.getInscripciones, setInscripciones);
    loadTable(api.getPagos, setPagos);
    loadTable(api.getParticipantes, setParticipantes);
    loadTable(api.getCumpleanosCelebrados, setCelebraciones);
    loadTable(api.getServidores, setServidores);
    loadTable(api.getInscripcionesServidores, setInscripcionesServidores);
    loadTable(api.getPagosServidores, setPagosServidores);
    loadTable(api.getTemasClases, setTemasClases);
    loadTable(api.getEntregasAdhesiones, setEntregasAdhesiones);
    loadTable(api.getPagosAdhesiones, setPagosAdhesiones);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [fetchData, user]);

  const addAdolescente = async (a: Omit<Adolescente, 'id'>) => { 
      const newAdo = await api.createAdolescente(a); 
      setAdolescentes(prev => [...prev, newAdo].sort((x, y) => x.nombre.localeCompare(y.nombre))); 
  };
  const updateAdolescente = async (a: Adolescente) => { 
      const updatedAdo = await api.updateAdolescente(a); 
      setAdolescentes(prev => prev.map(item => item.id === a.id ? updatedAdo : item));
  };
  const deleteAdolescente = async (id: string) => { 
      await api.deleteAdolescente(id); 
      setAdolescentes(prev => prev.filter(item => item.id !== id)); 
  };
  const addAdolescentesBulk = async (a: Omit<Adolescente, 'id'>[]) => { 
      await api.createAdolescentesBulk(a); 
      const freshAdos = await api.getAdolescentes();
      setAdolescentes(freshAdos);
  };

  const addServidor = async (s: Omit<Servidor, 'id'>) => {
    const newS = await api.createServidor(s);
    setServidores(prev => [...prev, newS].sort((x, y) => x.nombre.localeCompare(y.nombre)));
  };
  const updateServidor = async (s: Servidor) => {
    const updated = await api.updateServidor(s);
    setServidores(prev => prev.map(item => item.id === s.id ? updated : item));
  };
  const deleteServidor = async (id: string) => {
    await api.deleteServidor(id);
    setServidores(prev => prev.filter(item => item.id !== id));
  };
  const addInscripcionServidor = async (i: Omit<InscripcionServidor, 'id'>) => {
    const created = await api.createInscripcionServidor(i);
    const fresh = await api.getInscripcionesServidores();
    setInscripcionesServidores(fresh);
    return created;
  };
  const updateInscripcionServidor = async (i: InscripcionServidor) => {
    await api.updateInscripcionServidor(i);
    setInscripcionesServidores(prev => prev.map(item => item.id === i.id ? i : item));
  };
  const deleteInscripcionServidor = async (id: string) => {
    await api.deleteInscripcionServidor(id);
    setInscripcionesServidores(prev => prev.filter(item => item.id !== id));
  };
  const addPagoServidor = async (iId: string, m: number, fecha: string, notas?: string) => {
    const newPago = await api.createPagoServidor({ inscripcionServidorId: iId, monto: m, fecha, notas });
    setPagosServidores(prev => [...prev, newPago]);
    // Refresco de seguridad
    const fresh = await api.getPagosServidores();
    setPagosServidores(fresh);
  };
  const deletePagoServidor = async (id: string) => {
    await api.deletePagoServidor(id);
    setPagosServidores(prev => prev.filter(p => p.id !== id));
  };

  const addEncargado = async (e: Omit<Encargado, 'id'>) => { 
      const newEnc = await api.createEncargado(e); 
      setEncargados(prev => [...prev, newEnc]); 
  };
  const updateEncargado = async (e: Encargado) => { 
      const updatedEnc = await api.updateEncargado(e); 
      setEncargados(prev => prev.map(item => item.id === e.id ? updatedEnc : item)); 
  };
  const deleteEncargado = async (id: string) => { 
      await api.deleteEncargado(id); 
      setEncargados(prev => prev.filter(item => item.id !== id)); 
  };
  const addEncargadosBulk = async (e: Omit<Encargado, 'id'>[]) => { await api.createEncargadosBulk(e); await fetchData(); };

  const addReunion = async (r: Omit<Reunion, 'id'>) => { 
      const newReu = await api.createReunion(r); 
      setReuniones(prev => [newReu, ...prev]); 
  };
  const updateReunion = async (r: Reunion) => { 
      const updatedReu = await api.updateReunion(r); 
      setReuniones(prev => prev.map(item => item.id === r.id ? updatedReu : item)); 
  };
  const deleteReunion = async (id: string) => { 
      await api.deleteReunion(id); 
      setReuniones(prev => prev.filter(item => item.id !== id)); 
  };
  const addReunionesBulk = async (r: any[]) => { await api.createReunionesBulk(r); await fetchData(); };

  const saveAsistencias = async (a: Asistencia[]) => { 
      await api.saveAsistencias(a); 
      const freshAsis = await api.getAsistencias();
      setAsistencias(freshAsis);
  };

  const addTutor = async (t: Omit<Tutor, 'id'>, adolescentIds: string[]) => { 
    const nt = await api.createTutor(t); 
    await api.setTutorAdolescenteLinks(nt.id, adolescentIds);
    await fetchData(); 
  };
  const updateTutor = async (t: Tutor, adolescentIds: string[]) => { 
    await api.updateTutor(t); 
    await api.setTutorAdolescenteLinks(t.id, adolescentIds);
    await fetchData(); 
  };
  const deleteTutor = async (id: string) => { 
      await api.deleteTutor(id); 
      setTutores(prev => prev.filter(t => t.id !== id));
  };
  const addTutoresAndLinkBulk = async (t: any[]) => { await api.createTutoresAndLinkBulk(t); await fetchData(); };

  const addEvento = async (e: Omit<Evento, 'id'>) => { 
      const newEv = await api.createEvento(e); 
      setEventos(prev => [...prev, newEv]); 
  };
  const updateEvento = async (e: Evento) => { 
      const updatedEv = await api.updateEvento(e); 
      setEventos(prev => prev.map(item => item.id === e.id ? updatedEv : item)); 
  };
  const deleteEvento = async (id: string) => { 
      await api.deleteEvento(id); 
      setEventos(prev => prev.filter(e => e.id !== id));
  };

  const addInscripcion = async (eId: string, aId?: string, tId?: string) => { 
    await api.createInscripcion({ eventoId: eId, adolescenteId: aId, tutorId: tId, fechaInscripcion: new Date().toISOString().split('T')[0] }); 
    const freshIns = await api.getInscripciones();
    setInscripciones(freshIns);
  };
  const updateInscripcion = async (i: InscripcionEvento) => { 
      await api.updateInscripcion(i); 
      setInscripciones(prev => prev.map(item => item.id === i.id ? i : item));
  };
  const deleteInscripcion = async (id: string) => { 
      await api.deleteInscripcion(id); 
      setInscripciones(prev => prev.filter(i => i.id !== id));
  };

  const addPago = async (iId: string, m: number, fecha: string, notas?: string) => { 
    const newPago = await api.createPago({ inscripcionId: iId, monto: m, fecha, notas }); 
    setPagos(prev => [...prev, newPago]);
    // Refresco de seguridad desde el servidor
    const freshPagos = await api.getPagos();
    setPagos(freshPagos);
  };
  const deletePago = async (id: string) => { 
      await api.deletePago(id); 
      setPagos(prev => prev.filter(p => p.id !== id));
  };

  const addParticipante = async (eId: string, aId: string) => { 
      await api.addParticipante({ eventoId: eId, adolescenteId: aId }); 
      setParticipantes(prev => [...prev, { eventoId: eId, adolescenteId: aId }]);
  };
  const removeParticipante = async (eId: string, aId: string) => { 
      await api.removeParticipante(eId, aId); 
      setParticipantes(prev => prev.filter(p => !(p.eventoId === eId && p.adolescenteId === aId)));
  };

  const addCelebracionCumpleanos = async (aId: string, ano: number) => { 
      await api.addCumpleanosCelebrado({ adolescenteId: aId, ano }); 
      setCelebraciones(prev => [...prev, { adolescenteId: aId, ano }]);
  };

  const addUser = async (u: any) => { await api.createUsuario(u); await fetchData(); };
  const updateUser = async (u: Usuario) => { await api.updateUsuario(u); await fetchData(); };
  const deleteUser = async (id: string) => { await api.deleteUsuario(id); await fetchData(); };
  const sendPasswordReset = async (email: string) => { await api.resetPasswordForEmail(email); };

  const addRole = async (r: Omit<Rol, 'id'>) => { await api.createRole(r); await fetchData(); };
  const updateRole = async (r: Rol) => { await api.updateRole(r); await fetchData(); };
  const deleteRole = async (id: string) => { const res = await api.deleteRole(id); await fetchData(); return res; };

  const addDevocional = async (d: Omit<Devocional, 'id'>) => { 
      const newDev = await api.createDevocional(d); 
      setDevocionales(prev => [...prev, newDev]); 
  };
  const updateDevocional = async (d: Devocional) => { 
      const updatedDev = await api.updateDevocional(d); 
      setDevocionales(prev => prev.map(item => item.id === d.id ? updatedDev : item)); 
  };
  const deleteDevocional = async (id: string) => { 
      await api.deleteDevocional(id); 
      setDevocionales(prev => prev.filter(d => d.id !== id));
  };
  const registrarEntregaBulk = async (e: Omit<EntregaDevocional, 'id'>[]) => { 
      await api.registrarEntregasBulk(e); 
      const freshEntregas = await api.getEntregasDevocionales();
      setEntregasDevocionales(freshEntregas);
  };
  const updateEntrega = async (e: EntregaDevocional) => { 
      await api.updateEntregaDevocional(e); 
      setEntregasDevocionales(prev => prev.map(item => item.id === e.id ? e : item));
  };
  const deleteEntrega = async (id: string) => { 
      await api.deleteEntrega(id); 
      setEntregasDevocionales(prev => prev.filter(e => e.id !== id));
  };

  const addTemaClase = async (t: Omit<TemaClase, 'id'>) => {
    const newTema = await api.addTemaClase(t);
    setTemasClases(prev => [...prev, newTema]);
  };

  const updateTemaClase = async (t: TemaClase) => {
    await api.updateTemaClase(t);
    setTemasClases(prev => prev.map(item => item.id === t.id ? t : item));
  };

  const deleteTemaClase = async (id: string) => {
    await api.deleteTemaClase(id);
    setTemasClases(prev => prev.filter(item => item.id !== id));
  };

  const addEntregaAdhesion = async (e: Omit<EntregaAdhesion, 'id'>) => {
    const newEntrega = await api.createEntregaAdhesion(e);
    setEntregasAdhesiones(prev => [...prev, newEntrega]);
    return newEntrega;
  };

  const updateEntregaAdhesion = async (e: EntregaAdhesion) => {
    const updated = await api.updateEntregaAdhesion(e);
    setEntregasAdhesiones(prev => prev.map(item => item.id === e.id ? updated : item));
  };

  const deleteEntregaAdhesion = async (id: string) => {
    await api.deleteEntregaAdhesion(id);
    setEntregasAdhesiones(prev => prev.filter(item => item.id !== id));
    // Also remove associated payments
    setPagosAdhesiones(prev => prev.filter(p => p.entregaAdhesionId !== id));
  };

  const addPagoAdhesion = async (p: Omit<PagoAdhesion, 'id'>) => {
    const newPago = await api.createPagoAdhesion(p);
    setPagosAdhesiones(prev => [...prev, newPago]);
    return newPago;
  };

  const deletePagoAdhesion = async (id: string) => {
    await api.deletePagoAdhesion(id);
    setPagosAdhesiones(prev => prev.filter(p => p.id !== id));
  };

  const clearTable = async (table: any) => { await api.clearTable(table); await fetchData(); };

  return (
    <DataContext.Provider value={{
      adolescentes, encargados, reuniones, devocionales, entregasDevocionales, asistencias, tutores, eventos, usuarios, roles,
      tutoresAdolescentes, inscripciones, pagos, participantes, celebraciones,
      servidores, inscripcionesServidores, pagosServidores,
      temasClases, addTemaClase, updateTemaClase, deleteTemaClase,
      entregasAdhesiones, pagosAdhesiones, addEntregaAdhesion, updateEntregaAdhesion, deleteEntregaAdhesion, addPagoAdhesion, deletePagoAdhesion,
      fetchData, addAdolescente, updateAdolescente, deleteAdolescente, addAdolescentesBulk,
      addServidor, updateServidor, deleteServidor, addInscripcionServidor, updateInscripcionServidor, deleteInscripcionServidor,
      addPagoServidor, deletePagoServidor,
      addEncargado, updateEncargado, deleteEncargado, addEncargadosBulk,
      addReunion, updateReunion, deleteReunion, addReunionesBulk, saveAsistencias,
      addTutor, updateTutor, deleteTutor, addTutoresAndLinkBulk,
      addEvento, updateEvento, deleteEvento,
      addInscripcion, updateInscripcion, deleteInscripcion,
      addPago, deletePago, addParticipante, removeParticipante,
      addCelebracionCumpleanos, addUser, updateUser, deleteUser, sendPasswordReset,
      addRole, updateRole, deleteRole,
      addDevocional, updateDevocional, deleteDevocional, registrarEntregaBulk, updateEntrega, deleteEntrega,
      clearTable
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
