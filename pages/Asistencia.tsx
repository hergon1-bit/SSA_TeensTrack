import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { type Asistencia, AsistenciaDetalle, TipoAsistencia, Page } from '../types';
import { formatDate } from '../utils/helpers';
import { RefreshIcon, CheckCircleIcon } from '../components/ui/Icons';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface AsistenciaProps {
  reunionId: string;
  navigateTo: (page: Page) => void;
}

const Asistencia: React.FC<AsistenciaProps> = ({ reunionId, navigateTo }) => {
    const { reuniones, adolescentes, asistencias: initialAsistencias, updateReunion, fetchData } = useData();
    const { hasPermission } = useAuth();
    const [asistenciaLocal, setAsistenciaLocal] = useState<Map<string, Asistencia>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyPresent, setShowOnlyPresent] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isInitialized, setIsInitialized] = useState(false);

    const reunion = reuniones.find(r => r.id === reunionId);

    // Force refresh data on mount to ensure we are editing the latest records
    useEffect(() => {
        const loadFreshData = async () => {
            setIsLoading(true);
            await fetchData();
            setIsLoading(false);
        };
        loadFreshData();
    }, [fetchData]);

    // Use useMemo to prevent creating a new array reference on every render
    const adolescentesActivos = useMemo(() => 
        adolescentes.filter(a => a.estado === 'Activo'), 
    [adolescentes]);

    // Filter logic updated to include "Show Only Present" toggle
    const filteredAdolescentes = useMemo(() => 
        adolescentesActivos.filter(a => {
            const matchesSearch = `${a.nombre} ${a.apellido}`.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!showOnlyPresent) {
                return matchesSearch;
            }

            // Check current local status if filter is active
            const currentStatus = asistenciaLocal.get(a.id)?.estado;
            return matchesSearch && currentStatus === 'Presente';
        }).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [adolescentesActivos, searchTerm, showOnlyPresent, asistenciaLocal]);

    const initializeAsistencias = useCallback(() => {
        if (adolescentesActivos.length === 0) return;

        const newMap = new Map<string, Asistencia>();
        adolescentesActivos.forEach(ado => {
            const existingAsistencia = initialAsistencias.find(a => a.reunionId === reunionId && a.adolescenteId === ado.id);
            if (existingAsistencia) {
                newMap.set(ado.id, existingAsistencia);
            } else {
                newMap.set(ado.id, {
                    reunionId: reunionId,
                    adolescenteId: ado.id,
                    estado: 'Ausente',
                    detalle: 'Regular',
                });
            }
        });
        setAsistenciaLocal(newMap);
        setIsInitialized(true);
    }, [reunionId, adolescentesActivos, initialAsistencias]);

    // Initialize local state when data is available
    useEffect(() => {
       initializeAsistencias();
    }, [initializeAsistencias]);
    
    const handleAsistenciaChange = (adolescenteId: string, estado: TipoAsistencia) => {
        setAsistenciaLocal(prevMap => {
            const current = prevMap.get(adolescenteId);
            if (!current) return prevMap;

            const newMap = new Map(prevMap);
            const updatedAsistencia: Asistencia = {
                ...current,
                estado,
                // If status is 'Ausente', reset detail to 'Regular', otherwise keep the current detail.
                detalle: estado === 'Ausente' ? 'Regular' : current.detalle,
            };
            newMap.set(adolescenteId, updatedAsistencia);
            return newMap;
        });
        setSaveStatus('idle'); // Reset status on change
    };

    const handleDetalleChange = (adolescenteId: string, detalle: AsistenciaDetalle) => {
        setAsistenciaLocal(prevMap => {
            const current = prevMap.get(adolescenteId);
            if (current) {
                const newMap = new Map(prevMap);
                newMap.set(adolescenteId, { ...current, detalle });
                return newMap;
            }
            return prevMap;
        });
        setSaveStatus('idle'); // Reset status on change
    };
    
    const handleGuardar = async (finalizar: boolean) => {
        setIsLoading(true);
        setSaveStatus('idle');
        try {
            // Convert Map values to array for saving
            const asistenciasArray = [...asistenciaLocal.values()];
            
            // CRITICAL FIX: Use api directly instead of context method.
            // This avoids triggering a global fetch which might overwrite local changes with stale data.
            await api.saveAsistencias(asistenciasArray);
            
            if (finalizar && reunion) {
                await updateReunion({ ...reunion, estado: 'Finalizado' });
                navigateTo('reuniones');
            } else {
                setSaveStatus('success');
                // Auto hide success message after 3 seconds
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        } catch (error) {
            console.error(error);
            setSaveStatus('error');
            alert("Ocurrió un error al guardar los datos.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!hasPermission('asistencias', 'create') && !hasPermission('asistencias', 'update')) {
        return <div className="p-8 text-center text-red-500 font-bold">No tienes permisos para tomar asistencia.</div>;
    }

    if (!reunion) {
        return <div className="text-center text-text-secondary">Reunión no encontrada.</div>;
    }

    // Recalculate counts based on local state
    const presentes = [...asistenciaLocal.values()].filter(a => a.estado === 'Presente').length;
    const ausentes = adolescentesActivos.length - presentes;

    return (
        <div className="space-y-6">
            <div>
                <button onClick={() => navigateTo('reuniones')} className="text-primary hover:underline mb-4">&larr; Volver a Reuniones</button>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold">Toma de Asistencia</h1>
                            <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-sm font-bold">
                                Nro. {reunion.id}
                            </span>
                        </div>
                        <p className="text-xl text-text-secondary">{reunion.tema} - {formatDate(reunion.fecha)}</p>
                    </div>
                    {saveStatus === 'success' && (
                        <div className="flex items-center text-green-400 bg-green-400/10 px-4 py-2 rounded-lg animate-fade-in-out">
                            <CheckCircleIcon className="w-6 h-6 mr-2" />
                            <span className="font-semibold">Datos actualizados correctamente</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 bg-surface rounded-lg">
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-1">
                    <input
                        type="text"
                        placeholder="Buscar adolescente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-80 px-4 py-2 bg-background border border-border rounded-md focus:ring-primary focus:border-primary"
                    />
                    <label className="flex items-center space-x-2 text-text-secondary cursor-pointer bg-background border border-border px-3 py-2 rounded-md hover:bg-surface/80 select-none">
                        <input 
                            type="checkbox" 
                            checked={showOnlyPresent} 
                            onChange={(e) => setShowOnlyPresent(e.target.checked)}
                            className="h-4 w-4 text-primary rounded border-gray-600 focus:ring-primary bg-background"
                        />
                        <span>Ver solo Presentes</span>
                    </label>
                </div>

                <div className="flex space-x-6 text-center w-full xl:w-auto justify-around xl:justify-end">
                    <div>
                        <p className="text-2xl font-bold text-green-400">{presentes}</p>
                        <p className="text-sm text-text-secondary">Presentes</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-400">{ausentes}</p>
                        <p className="text-sm text-text-secondary">Ausentes</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-text-primary">{adolescentesActivos.length}</p>
                        <p className="text-sm text-text-secondary">Total</p>
                    </div>
                </div>
            </div>

            <div className="hidden md:block bg-surface shadow-lg rounded-lg overflow-hidden">
                <div className="overflow-y-auto max-h-[60vh]">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Adolescente</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase">Estado</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAdolescentes.map(ado => {
                                const asistencia = asistenciaLocal.get(ado.id);
                                if (!asistencia) return null;

                                return (
                                <tr key={ado.id} className={asistencia.estado === 'Presente' ? 'bg-green-900/10' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">{ado.nombre} {ado.apellido}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex justify-center space-x-2">
                                            <button onClick={() => handleAsistenciaChange(ado.id, 'Presente')} className={`px-3 py-1 text-sm rounded-full transition ${asistencia.estado === 'Presente' ? 'bg-green-500 text-white' : 'bg-surface hover:bg-green-500/20'}`}>Presente</button>
                                            <button onClick={() => handleAsistenciaChange(ado.id, 'Ausente')} className={`px-3 py-1 text-sm rounded-full transition ${asistencia.estado === 'Ausente' ? 'bg-red-500 text-white' : 'bg-surface hover:bg-red-500/20'}`}>Ausente</button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <select 
                                            value={asistencia.detalle} 
                                            onChange={(e) => handleDetalleChange(ado.id, e.target.value as AsistenciaDetalle)} 
                                            className="bg-background border border-border rounded-md px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:ring-primary focus:border-primary"
                                            disabled={asistencia.estado === 'Ausente'}
                                        >
                                            <option value="Regular">Regular</option>
                                            <option value="Primera Vez">Primera Vez</option>
                                            <option value="Regresa">Regresa</option>
                                        </select>
                                    </td>
                                </tr>
                            )})}
                            {filteredAdolescentes.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-text-secondary">
                                        {showOnlyPresent 
                                            ? "No hay adolescentes marcados como 'Presente' que coincidan con la búsqueda." 
                                            : "No se encontraron adolescentes."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Touch-Friendly View */}
            <div className="block md:hidden space-y-3">
                {filteredAdolescentes.map(ado => {
                    const asistencia = asistenciaLocal.get(ado.id);
                    if (!asistencia) return null;

                    return (
                        <div 
                            key={ado.id} 
                            className={`p-4 rounded-lg border transition-all ${
                                asistencia.estado === 'Presente' 
                                    ? 'bg-green-500/10 border-green-500/30 shadow-sm' 
                                    : 'bg-surface border-border'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-base text-text-primary">
                                    {ado.nombre} {ado.apellido}
                                </span>
                                {asistencia.estado === 'Presente' && asistencia.detalle !== 'Regular' && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-white">
                                        {asistencia.detalle}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* Large touch target attendance buttons */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => handleAsistenciaChange(ado.id, 'Presente')} 
                                        className={`py-2.5 px-4 text-sm font-semibold rounded-lg transition-all focus:outline-none flex justify-center items-center gap-1.5 ${
                                            asistencia.estado === 'Presente' 
                                                ? 'bg-green-500 text-white shadow-md' 
                                                : 'bg-background hover:bg-green-500/10 text-text-secondary border border-border'
                                        }`}
                                    >
                                        <span>Presente</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleAsistenciaChange(ado.id, 'Ausente')} 
                                        className={`py-2.5 px-4 text-sm font-semibold rounded-lg transition-all focus:outline-none flex justify-center items-center gap-1.5 ${
                                            asistencia.estado === 'Ausente' 
                                                ? 'bg-red-500 text-white shadow-md' 
                                                : 'bg-background hover:bg-red-500/10 text-text-secondary border border-border'
                                        }`}
                                    >
                                        <span>Ausente</span>
                                    </button>
                                </div>

                                {/* Detail selection shown contextually */}
                                {asistencia.estado === 'Presente' && (
                                    <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border/60">
                                        <label htmlFor={`detail-select-${ado.id}`} className="text-xs font-medium text-text-secondary whitespace-nowrap">
                                            Detalle:
                                        </label>
                                        <select 
                                            id={`detail-select-${ado.id}`}
                                            value={asistencia.detalle} 
                                            onChange={(e) => handleDetalleChange(ado.id, e.target.value as AsistenciaDetalle)} 
                                            className="w-full bg-surface border-0 rounded-md px-2 py-1 text-sm text-text-primary font-medium focus:ring-1 focus:ring-primary outline-none"
                                        >
                                            <option value="Regular">Regular</option>
                                            <option value="Primera Vez">★ Primera Vez</option>
                                            <option value="Regresa">Regresa</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {filteredAdolescentes.length === 0 && (
                    <div className="p-8 text-center text-text-secondary bg-surface border border-border rounded-lg italic text-sm">
                        {showOnlyPresent 
                            ? "No hay adolescentes marcados como 'Presente' que coincidan con la búsqueda." 
                            : "No se encontraron adolescentes."}
                    </div>
                )}
            </div>
            
            <div className="flex justify-end space-x-4 pb-4">
                 <button 
                    onClick={() => handleGuardar(false)} 
                    disabled={isLoading}
                    className="flex items-center bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? <RefreshIcon className="w-5 h-5 animate-spin mr-2" /> : null}
                    {isLoading ? 'Guardando...' : 'Guardar Parcial'}
                </button>
                <button 
                    onClick={() => handleGuardar(true)} 
                    disabled={isLoading}
                    className="flex items-center bg-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? <RefreshIcon className="w-5 h-5 animate-spin mr-2" /> : null}
                    {isLoading ? 'Finalizando...' : 'Guardar y Finalizar Reunión'}
                </button>
            </div>
        </div>
    );
};

export default Asistencia;