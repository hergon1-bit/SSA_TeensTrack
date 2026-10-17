import React from 'react';

export type StatusType = 
  | 'Activo' 
  | 'Inactivo' 
  | 'Anulado'
  | 'Presente' 
  | 'Ausente' 
  | 'En Proceso' 
  | 'Finalizado' 
  | 'Pendiente'
  | 'Completada'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  pulse = true,
  className = '',
}) => {
  const normStatus = (status || '').trim().toLowerCase();

  // Emerald / Green family (Activo, Presente, Completada, Al día, Sí)
  const isPositive = ['activo', 'presente', 'completada', 'completado', 'al día', 'si', 'sí', 'finalizado'].includes(normStatus);
  
  // Amber / Yellow family (Inactivo, Pendiente, En Proceso)
  const isWarning = ['inactivo', 'pendiente', 'en proceso', 'falta ficha', 'falta autorización'].includes(normStatus);
  
  // Rose / Red family (Anulado, Ausente, Cancelado, No, Faltan ambos)
  const isNegative = ['anulado', 'ausente', 'cancelado', 'no', 'faltan ambos', 'baja', 'eliminado'].includes(normStatus);

  // Configuration for colors, glow, and beacon animation
  let containerStyles = 'bg-primary/10 text-primary border-primary/30 hover:border-primary/60 hover:shadow-primary/20';
  let dotPing = 'bg-primary';
  let dotSolid = 'bg-primary shadow-primary/50';

  if (isPositive) {
    containerStyles = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/25 hover:shadow-emerald-500/20';
    dotPing = 'bg-emerald-400';
    dotSolid = 'bg-emerald-500 shadow-emerald-400/50';
  } else if (isWarning) {
    containerStyles = 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-500/25 hover:shadow-amber-500/20';
    dotPing = 'bg-amber-400';
    dotSolid = 'bg-amber-400 shadow-amber-400/50';
  } else if (isNegative) {
    containerStyles = 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:border-rose-400/60 hover:bg-rose-500/25 hover:shadow-rose-500/20';
    dotPing = 'bg-rose-400';
    dotSolid = 'bg-rose-500 shadow-rose-400/50';
  }

  const sizeStyles = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-2.5 py-1 text-[11px] gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border shadow-2xs hover:shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 cursor-default select-none backdrop-blur-xs ${sizeStyles} ${containerStyles} ${className}`}
      title={`Estado: ${status}`}
    >
      {/* Animated Glowing Beacon */}
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotPing}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 shadow-xs ${dotSolid}`}
        />
      </span>
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;
