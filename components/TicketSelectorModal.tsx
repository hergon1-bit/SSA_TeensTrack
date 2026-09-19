import React, { useState, useMemo } from 'react';
import Modal from './ui/Modal';
import { TicketIcon, CheckCircleIcon } from './ui/Icons';

interface TicketSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalTickets: number;
  committedNumbers: number[]; // números ya comprometidos/asignados por otras entregas
  initialSelectedNumbers: number[]; // números previamente seleccionados (si estamos editando o refinando)
  onConfirm: (selected: number[]) => void;
  personName?: string;
}

export const TicketSelectorModal: React.FC<TicketSelectorModalProps> = ({
  isOpen,
  onClose,
  totalTickets,
  committedNumbers,
  initialSelectedNumbers,
  onConfirm,
  personName,
}) => {
  const committedSet = useMemo(() => new Set(committedNumbers), [committedNumbers]);
  const [selected, setSelected] = useState<number[]>(initialSelectedNumbers);

  // Sincronizar cuando el modal abre o cambian las selecciones iniciales
  React.useEffect(() => {
    if (isOpen) {
      setSelected(initialSelectedNumbers);
    }
  }, [isOpen, initialSelectedNumbers]);

  const toggleNumber = (num: number) => {
    if (committedSet.has(num)) return; // No se puede clickear si está comprometido
    if (selected.includes(num)) {
      setSelected(selected.filter((n) => n !== num));
    } else {
      setSelected([...selected, num].sort((a, b) => a - b));
    }
  };

  const handleConfirm = () => {
    onConfirm(selected);
    onClose();
  };

  const availableCount = totalTickets - committedSet.size;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Selección Visual de Entradas (Estilo Sala de Cine)"
      size="3xl"
    >
      <div className="space-y-5">
        {/* Pantalla Simulada / Header */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-3/4 h-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)] mb-1" />
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-text-secondary">
            ESCENARIO / PANTALLA
          </span>
        </div>

        {personName && (
          <div className="bg-primary/10 border border-primary/30 p-2.5 rounded-lg text-center">
            <span className="text-xs text-text-secondary font-medium">Asignando entradas a: </span>
            <strong className="text-sm text-primary font-bold">{personName}</strong>
          </div>
        )}

        {/* Leyenda de Colores */}
        <div className="flex items-center justify-center gap-6 bg-background/50 p-3 rounded-lg border border-border/50 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gray-700/60 border border-gray-600/50 flex items-center justify-center text-[10px] font-bold text-gray-400 opacity-60">
              00
            </div>
            <span className="text-text-secondary font-medium">Comprometido / Vendido (Gris)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
              00
            </div>
            <span className="text-text-secondary font-medium">Disponible (Vivo)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary text-white font-bold flex items-center justify-center text-[10px] shadow-sm">
              00
            </div>
            <span className="text-text-secondary font-medium">Seleccionado</span>
          </div>
        </div>

        {/* Grid de Butacas / Números */}
        <div className="max-h-[380px] overflow-y-auto p-4 bg-background/40 rounded-xl border border-border/60 custom-scrollbar">
          {totalTickets <= 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm italic">
              No se ha definido la cantidad total de entradas en el evento.
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
              {Array.from({ length: totalTickets }, (_, i) => i + 1).map((num) => {
                const isCommitted = committedSet.has(num);
                const isSelected = selected.includes(num);

                let btnClasses =
                  'relative h-11 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center shadow-sm ';

                if (isCommitted) {
                  btnClasses +=
                    'bg-gray-800/60 border-gray-700/50 text-gray-500 cursor-not-allowed opacity-50 select-none';
                } else if (isSelected) {
                  btnClasses +=
                    'bg-primary border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-105 ring-2 ring-primary/40';
                } else {
                  btnClasses +=
                    'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400 hover:scale-105 active:scale-95 cursor-pointer';
                }

                const paddedNum = String(num).padStart(3, '0');

                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isCommitted}
                    onClick={() => toggleNumber(num)}
                    className={btnClasses}
                    title={
                      isCommitted
                        ? `Número ${paddedNum} no disponible`
                        : `Número ${paddedNum}`
                    }
                  >
                    <TicketIcon className="w-3.5 h-3.5 opacity-70 mb-0.5" />
                    <span>{paddedNum}</span>
                    {isSelected && (
                      <CheckCircleIcon className="w-3 h-3 absolute top-0.5 right-0.5 text-white" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie de selección y Botones */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-border gap-3">
          <div className="text-xs text-text-secondary font-semibold">
            Seleccionados: <strong className="text-primary text-sm">{selected.length}</strong> entradas
            <span className="mx-2">|</span>
            Disponibles: <strong className="text-emerald-400">{availableCount}</strong> de {totalTickets}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-lg font-bold text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none bg-primary hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <CheckCircleIcon className="w-4 h-4" /> Confirmar Selección
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
