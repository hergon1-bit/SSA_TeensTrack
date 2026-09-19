
export interface Permisos {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface Rol {
  id: string;
  nombre: string;
  permisos: {
    adolescentes: Permisos;
    asistencias: Permisos;
    celebraciones_cumpleanos: Permisos;
    devocionales: Permisos;
    encargados: Permisos;
    entregas_devocionales: Permisos;
    eventos: Permisos;
    inscripciones_eventos: Permisos;
    inscripciones_servidores: Permisos;
    pagos_eventos: Permisos;
    pagos_servidores: Permisos;
    participantes_eventos: Permisos;
    plan_clases: Permisos;
    reuniones: Permisos;
    roles: Permisos;
    servidores: Permisos;
    tutor_adolescente: Permisos;
    tutores: Permisos;
    usuarios: Permisos;
  };
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rolId: string;
  avatarUrl?: string;
  lastSignInAt?: string;
}

export type Sexo = 'Masculino' | 'Femenino';
export type EstadoAdolescente = 'Activo' | 'Inactivo' | 'Anulado';

export interface Adolescente {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  registro: string;
  fechaNacimiento: string;
  barrio: string;
  ciudad: string;
  telefono: string;
  sexo: Sexo;
  estado: EstadoAdolescente;
  fichaInscripcion?: boolean;
  autorizacion?: boolean;
}

// --- SERVIDORES (APOYO) ---
export type RolServidor = 'Pastor' | 'Padre' | 'Madre' | 'Lider de Color' | 'Lider de Campamento' | 'Cuidador' | 'Apoyo' | 'Cocina' | 'Sonido' | 'Alabanza' | 'Otro';
export type TipoBeca = 'Ninguna' | 'Parcial' | 'Total';

export interface Servidor {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  registro: string;
  telefono: string;
  ciudad: string;
}

export interface InscripcionServidor {
  id: string;
  eventoId: string;
  servidorId: string;
  rol: RolServidor;
  tipoBeca?: TipoBeca;
  montoAcordado?: number;
  iglesiaPagaSaldo?: boolean;
  precioEspecialLocal?: boolean;
  notas?: string;
}

export interface PagoServidor {
  id: string;
  inscripcionServidorId: string;
  fecha: string;
  monto: number;
  notas?: string;
}

export interface Encargado {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  fechaNacimiento?: string;
  barrio: string;
  ciudad: string;
  telefono: string;
  email?: string;
}

export type EstadoReunion = 'En Proceso' | 'Finalizado';

export interface Reunion {
  id: string;
  fecha: string;
  tema: string;
  encargadoId: string;
  estado: EstadoReunion;
  esTeensPro?: boolean;
}

export type TipoAsistencia = 'Presente' | 'Ausente';
export type AsistenciaDetalle = 'Regular' | 'Primera Vez' | 'Regresa';

export interface Asistencia {
  reunionId: string;
  adolescenteId: string;
  estado: TipoAsistencia;
  detalle?: AsistenciaDetalle;
}

export interface ResumenReunion {
  reunionId: string;
  presentes: number;
  ausentes: number;
}

export type GradoParentesco = 'Padre' | 'Madre' | 'Tío' | 'Tía' | 'Abuelo' | 'Abuela' | 'Tutor Legal';

export interface Tutor {
    id: string;
    nombre: string;
    apellido: string;
    cedula: string;
    telefono: string;
    parentesco: GradoParentesco;
    barrio: string;
    ciudad: string;
}

export interface TutorAdolescente {
    tutorId: string;
    adolescenteId: string;
}

export interface Evento {
  id: string;
  tema: string;
  lugar: string;
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  tieneCosto: boolean;
  costoTotal?: number;
  costoPersona?: number;
  esParaPadres?: boolean;
  finalizado?: boolean;
  // Venta de Adhesiones / Entradas
  esVentaAdhesiones?: boolean;
  precioCostoUnitario?: number;
  precioVentaUnitario?: number;
  cantidadTotalEntradas?: number;
}

export interface EntregaAdhesion {
  id: string;
  eventoId: string;
  fechaEntrega: string;
  nombrePersona: string;
  adolescenteId?: string;
  tutorId?: string;
  servidorId?: string;
  cantidadEntradas: number;
  numerosEntradas?: string;
  precioVentaUnitario: number;
  costoTotal: number;
  notas?: string;
}

export interface PagoAdhesion {
  id: string;
  entregaAdhesionId: string;
  eventoId: string;
  fechaPago: string;
  monto: number;
  registradoPor?: string;
  notas?: string;
}

export interface InscripcionEvento {
  id: string;
  eventoId: string;
  adolescenteId?: string;
  tutorId?: string;
  fechaInscripcion: string;
  notas?: string;
  asistio?: boolean;
}

export interface PagoEvento {
  id: string;
  inscripcionId: string;
  fecha: string;
  monto: number;
  notas?: string;
}

export interface ParticipanteEvento {
  eventoId: string;
  adolescenteId: string;
}

export interface CelebracionCumpleanos {
  adolescenteId: string;
  ano: number;
}

export interface Devocional {
  id: string;
  numeroSemana: number;
  tema: string;
  fechaDistribucion: string;
  fechaVencimiento: string;
}

export interface EntregaDevocional {
  id: string;
  devocionalId: string;
  adolescenteId: string;
  fechaEntrega: string;
  observaciones?: string;
}

export interface MaterialAdjunto {
  id: string;
  nombre: string;
  tipo: 'pdf' | 'docx' | 'pptx' | 'google_doc' | 'google_slide' | 'notebooklm' | 'web_link' | 'youtube' | 'link' | 'otro';
  url: string;
  fechaSubida?: string;
  descripcion?: string;
}

export interface TemaClase {
  id: string;
  titulo: string;
  descripcion?: string;
  objetivos?: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  orden: number;
  desarrollado: boolean;
  fechaDesarrollo?: string;
  fechaProgramada?: string;
  encargadoId?: string;
  materiales: MaterialAdjunto[];
  notas?: string;
}

export type Page = 'dashboard' | 'adolescentes' | 'encargados' | 'reuniones' | 'tutores' | 'eventos' | 'reportes' | 'reportes-financieros' | 'usuarios' | 'roles' | 'asistencia' | 'limpiar-tablas' | 'cargar-tablas' | 'update-password' | 'tareas' | 'servidores' | 'migracion-supabase' | 'ver-tablas' | 'inactivar-teens' | 'workspace' | 'plan-clases';
