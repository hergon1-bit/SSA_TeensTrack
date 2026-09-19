
export type Role = 'admin' | 'encargado';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface Adolescente {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  activo: boolean;
  telefono?: string;
}

export interface Encargado {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
}

export interface Devocional {
  id: string;
  semana: number;
  tema: string;
  fecha_inicio: string;
}

export interface Entrega {
  id: string;
  adolescente_id: string;
  devocional_id: string;
  fecha_entrega: string;
  observaciones?: string;
  // Campos join
  adolescente_nombre?: string;
  devocional_tema?: string;
  devocional_semana?: number;
}
