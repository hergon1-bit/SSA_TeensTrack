import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ShieldIcon, UsersIcon } from '../components/ui/Icons';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Modal from '../components/ui/Modal';
import { Adolescente } from '../types';

const InactivarTeens: React.FC = () => {
    const { adolescentes, reuniones, asistencias, updateAdolescente } = useData();
    const { rol } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const [paraInactivar, setParaInactivar] = useState<Adolescente[]>([]);
    const [showFirstConfirm, setShowFirstConfirm] = useState(false);
    const [showSecondConfirm, setShowSecondConfirm] = useState(false);
    const [alertMessage, setAlertMessage] = useState<{title: string, message: string} | null>(null);

    const isAdmin = rol?.id === '1' || rol?.nombre?.toLowerCase().includes('administrador') || rol?.nombre?.toLowerCase() === 'admin';

    const handleInactivarAusentes = () => {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const reunionesUltimoAnioIds = reuniones
            .filter(r => new Date(r.fecha) >= oneYearAgo)
            .map(r => String(r.id));

        const activos = adolescentes.filter(a => a.estado === 'Activo');

        const detectados = activos.filter(a => {
            const asistioEnElAnio = asistencias.some(asis => 
                String(asis.adolescenteId) === String(a.id) && 
                asis.estado === 'Presente' && 
                reunionesUltimoAnioIds.includes(String(asis.reunionId))
            );
            return !asistioEnElAnio;
        });

        if (detectados.length === 0) {
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] No hay adolescentes activos con más de 1 año de inasistencia.`]);
            setAlertMessage({
                title: "Análisis Completado",
                message: "No hay adolescentes activos con más de 1 año de inasistencia."
            });
            return;
        }

        setParaInactivar(detectados);
        setShowFirstConfirm(true);
    };

    const confirmFirst = () => {
        setShowFirstConfirm(false);
        setShowSecondConfirm(true);
    };

    const confirmSecond = async () => {
        setShowSecondConfirm(false);
        setIsSaving(true);
        setProgress({ current: 0, total: paraInactivar.length });
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Iniciando proceso de inactivación para ${paraInactivar.length} adolescentes...`]);
        
        let successCount = 0;
        let errorCount = 0;
        
        try {
            for (let i = 0; i < paraInactivar.length; i++) {
                const ado = paraInactivar[i];
                try {
                    await updateAdolescente({ ...ado, estado: 'Inactivo' });
                    successCount++;
                } catch (err) {
                    errorCount++;
                    console.error("Error inactivando adolescente ID " + ado.id, err);
                }
                setProgress({ current: i + 1, total: paraInactivar.length });
            }
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Proceso completado. Éxito: ${successCount}, Errores: ${errorCount}`]);
            setAlertMessage({
                title: "Proceso Completado",
                message: `Se inactivaron ${successCount} adolescentes correctamente.`
            });
        } catch (error) {
            console.error("Error inactivando:", error);
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Ocurrió un error general durante la inactivación.`]);
            setAlertMessage({
                title: "Error",
                message: "Hubo un error inactivando a los adolescentes."
            });
        } finally {
            setIsSaving(false);
            setProgress({ current: 0, total: 0 });
            setParaInactivar([]);
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-6 rounded-lg max-w-lg text-center">
                    <ShieldIcon className="w-12 h-12 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
                    <p>Esta opción solo está disponible para Administradores.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-surface p-8 rounded-lg shadow-lg border border-border">
                <div className="flex items-center gap-4 mb-6 text-red-500 border-b border-border pb-4">
                    <div className="p-3 bg-red-500/10 rounded-full">
                        <UsersIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Inactivar Adolescentes Ausentes</h1>
                        <p className="text-text-secondary text-sm">Limpieza anual de base de datos</p>
                    </div>
                </div>

                <div className="bg-background p-6 rounded-lg mb-8 border border-red-500/30">
                    <h3 className="text-lg font-bold mb-2 text-text-primary">¿Qué hace esta función?</h3>
                    <p className="text-text-secondary mb-4">
                        Esta herramienta permite limpiar la base de datos marcando como <strong>Inactivos</strong> a aquellos adolescentes que han dejado de asistir. 
                    </p>
                    <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2">
                        <li>Serán inactivados los adolescentes activos que <strong>no asisten a ninguna reunión en los últimos 365 días</strong> (1 año hacia atrás).</li>
                        <li>Si el adolescente asistió a <strong>por lo menos una reunión</strong> en el transcurso del último año, <strong>NO</strong> será marcado como inactivo.</li>
                        <li><strong>IMPORTANTE:</strong> Solo se cambiará el estado del adolescente a "Inactivo". <strong>NO se borrará su historial de asistencia</strong> ni ninguno de sus datos.</li>
                        <li>Podrá reactivar a estos adolescentes manualmente desde la pantalla de Gestión de Adolescentes en el futuro si regresan.</li>
                    </ul>
                    
                    <button 
                        onClick={handleInactivarAusentes} 
                        disabled={isSaving} 
                        className="w-full sm:w-auto bg-red-600 border-2 border-red-800 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-md font-bold disabled:opacity-50 mt-4"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {progress.total > 0 ? `Procesando ${progress.current} de ${progress.total}...` : "Procesando..."}
                            </>
                        ) : (
                            <>Ejecutar Análisis y Limpieza Anual</>
                        )}
                    </button>
                    {isSaving && progress.total > 0 && (
                        <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                            <div className="bg-red-600 h-2.5 transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                        </div>
                    )}
                </div>

                {logs.length > 0 && (
                    <div className="bg-black/50 p-4 rounded-md border border-border">
                        <h4 className="text-text-secondary font-bold text-sm mb-2 uppercase tracking-wider">Registro de Operaciones</h4>
                        <div className="space-y-1 font-mono text-sm">
                            {logs.map((log, index) => (
                                <div key={index} className="text-green-400">{log}</div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            <ConfirmationModal
                isOpen={showFirstConfirm}
                onClose={() => setShowFirstConfirm(false)}
                onConfirm={confirmFirst}
                title="Confirmar Limpieza"
                message={`Se encontraron ${paraInactivar.length} adolescentes activos sin asistencias en el último año. ¿Desea marcarlos como 'Inactivos'?`}
                confirmText="Siguiente paso"
            />

            <ConfirmationModal
                isOpen={showSecondConfirm}
                onClose={() => setShowSecondConfirm(false)}
                onConfirm={confirmSecond}
                title="CONFIRMACIÓN REQUERIDA"
                message={`¿Está totalmente seguro de que desea aplicar el estado 'Inactivo' a estos ${paraInactivar.length} adolescentes? Esta operación no borrará el historial de asistencias.`}
                confirmText="Sí, Inactivar ahora"
                confirmButtonClassName="bg-red-600 hover:bg-red-700 text-white font-bold"
            />

            {alertMessage && (
                <Modal isOpen={true} onClose={() => setAlertMessage(null)} title={alertMessage.title}>
                    <div className="p-4">
                        <p className="text-text-secondary mb-6">{alertMessage.message}</p>
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setAlertMessage(null)} 
                                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default InactivarTeens;
