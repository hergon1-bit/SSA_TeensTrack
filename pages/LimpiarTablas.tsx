import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import ConfirmationModal from '../components/ui/ConfirmationModal';

type ClearableTable = 'adolescentes' | 'encargados' | 'reuniones' | 'tutores' | 'eventos';

interface TableInfo {
  key: ClearableTable;
  title: string;
  description: string;
}

const tablesToClear: TableInfo[] = [
  {
    key: 'adolescentes',
    title: 'Adolescentes',
    description: 'Elimina todos los adolescentes y sus datos relacionados: asistencias, vínculos con tutores, inscripciones a eventos, pagos y celebraciones de cumpleaños.'
  },
  {
    key: 'encargados',
    title: 'Encargados',
    description: 'Elimina todos los registros de encargados del sistema.'
  },
  {
    key: 'reuniones',
    title: 'Reuniones',
    description: 'Elimina todas las reuniones y sus correspondientes registros de asistencia.'
  },
  {
    key: 'tutores',
    title: 'Tutores',
    description: 'Elimina todos los tutores y los vínculos que tengan con los adolescentes.'
  },
  {
    key: 'eventos',
    title: 'Eventos',
    description: 'Elimina todos los eventos, junto con todas las inscripciones y pagos asociados.'
  }
];

const LimpiarTablas: React.FC = () => {
  const { clearTable } = useData();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [tableToClear, setTableToClear] = useState<TableInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClearClick = (table: TableInfo) => {
    setTableToClear(table);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmClear = async () => {
    if (tableToClear) {
      setIsLoading(true);
      await clearTable(tableToClear.key);
      setIsLoading(false);
      setIsConfirmModalOpen(false);
      setTableToClear(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Limpiar Tablas del Sistema</h1>
        <p className="text-text-secondary max-w-2xl">
          Esta sección permite eliminar de forma masiva los datos de las tablas principales.
          Esta acción es irreversible y debe usarse con precaución. No se eliminarán usuarios ni roles.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tablesToClear.map((table) => (
          <div key={table.key} className="bg-surface p-6 rounded-lg shadow-lg flex flex-col justify-between border border-border hover:border-red-500/50 transition-colors">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{table.title}</h2>
              <p className="text-sm text-text-secondary mt-2">{table.description}</p>
            </div>
            <button 
              onClick={() => handleClearClick(table)}
              className="mt-6 w-full bg-red-600/80 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Limpiar Tabla
            </button>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmClear}
        title={`Confirmar Limpieza de Tabla: ${tableToClear?.title}`}
        message={
          <>
            <p>¿Estás absolutamente seguro de que quieres eliminar todos los datos de la tabla <strong>{tableToClear?.title}</strong>?</p>
            <p className="mt-2 text-yellow-400 font-semibold">Esta acción no se puede deshacer y los datos se perderán para siempre.</p>
          </>
        }
      />
    </div>
  );
};

export default LimpiarTablas;