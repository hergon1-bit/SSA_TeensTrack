import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Reunion, Adolescente, AsistenciaDetalle, Page, Asistencia } from '../types';
import { formatDate } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { DateInput } from '../components/ui/DateInput';
import { useForm } from '../hooks/useForm';
import { RefreshIcon, UsersIcon, PencilIcon, TrashIcon, CheckCircleIcon, EyeIcon } from '../components/ui/Icons';
import StatusBadge from '../components/ui/StatusBadge';
import { api } from '../services/api';

interface ReunionesProps {
  navigateTo: (page: Page, params?: { reunionId: string }) => void;
}

const Reuniones: React.FC<ReunionesProps> = ({ navigateTo }) => {
    const { reuniones, encargados, asistencias, adolescentes, addReunion, updateReunion, deleteReunion, fetchData } = useData();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReunion, setEditingReunion] = useState<Reunion | null>(null);
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [viewingAttendanceReunion, setViewingAttendanceReunion] = useState<Reunion | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // State for direct attendance fetching (reliable view)
    const [viewingAttendanceData, setViewingAttendanceData] = useState<Asistencia[]>([]);
    const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

    const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [reunionToDelete, setReunionToDelete] = useState<Reunion | null>(null);

    const initialFormState: Omit<Reunion, 'id'> = {
        fecha: new Date().toISOString().split('T')[0],
        tema: '',
        encargadoId: encargados[0]?.id || '',
        estado: 'En Proceso',
        esTeensPro: false,
    };

    const { values, handleInputChange, setValues, resetForm } = useForm(initialFormState);

    // Force data refresh on mount to ensure cards show latest totals
    useEffect(() => {
        const refresh = async () => {
            setIsRefreshing(true);
            await fetchData();
            setIsRefreshing(false);
        };
        refresh();
    }, [fetchData]);

    // Calculate stats directly from the raw asistencias array for reliability
    const attendanceStats = useMemo(() => {
        const stats = new Map<string, { presentes: number, ausentes: number }>();
        
        asistencias.forEach(a => {
            const rId = String(a.reunionId);
            if (!stats.has(rId)) {
                stats.set(rId, { presentes: 0, ausentes: 0 });
            }
            
            const current = stats.get(rId)!;
            if (a.estado === 'Presente') {
                current.presentes++;
            } else {
                current.ausentes++;
            }
        });
        
        console.log("attendanceStats calculated:", stats.size, "reuniones. Total asistencias:", asistencias.length);
        return stats;
    }, [asistencias]);

    // Fetch specific attendance when viewing a reunion (Modal Detail)
    useEffect(() => {
        const fetchSpecificAttendance = async () => {
            if (viewingAttendanceReunion) {
                setIsLoadingAttendance(true);
                try {
                    const data = await api.getAsistenciasByReunion(viewingAttendanceReunion.id);
                    setViewingAttendanceData(data);
                } catch (error) {
                    console.error("Error fetching specific attendance:", error);
                    // Fallback to global context if error
                    setViewingAttendanceData(asistencias.filter(a => String(a.reunionId) === String(viewingAttendanceReunion.id)));
                } finally {
                    setIsLoadingAttendance(false);
                }
            } else {
                setViewingAttendanceData([]);
            }
        };

        fetchSpecificAttendance();
    }, [viewingAttendanceReunion]); // Dependencies: only when the selected reunion changes

    const openModalForCreate = () => {
        setEditingReunion(null);
        resetForm();
        if (encargados.length > 0) {
            setValues(prev => ({...prev, encargadoId: encargados[0].id}));
        }
        setIsModalOpen(true);
    };

    const openModalForEdit = (reunion: Reunion) => {
        setEditingReunion(reunion);
        setValues({ ...reunion });
        setIsModalOpen(true);
    };
    
    const forceCloseModal = () => {
        setIsModalOpen(false);
        setEditingReunion(null);
        resetForm();
    };

    const closeModal = () => {
        if (editingReunion) {
            const hasChanged = 
                values.fecha !== editingReunion.fecha ||
                values.tema !== editingReunion.tema ||
                values.encargadoId !== editingReunion.encargadoId ||
                values.estado !== editingReunion.estado ||
                !!values.esTeensPro !== !!editingReunion.esTeensPro;
            
            if (hasChanged) {
                setIsUnsavedConfirmOpen(true);
            } else {
                forceCloseModal();
            }
        } else {
            forceCloseModal();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const selectedEncargadoId = values.encargadoId;
        if (!selectedEncargadoId) {
            alert("Error: Debe seleccionar un encargado válido. Si no hay encargados, registre uno primero.");
            return;
        }

        const dataToSave = { ...values, encargadoId: selectedEncargadoId };
        if (editingReunion) {
            await updateReunion({ ...dataToSave, id: editingReunion.id });
        } else {
            await addReunion(dataToSave);
        }
        forceCloseModal();
    };
    
    const handleDeleteClick = (reunion: Reunion) => {
        setReunionToDelete(reunion);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (reunionToDelete) {
            await deleteReunion(reunionToDelete.id);
            setIsDeleteConfirmOpen(false);
            setReunionToDelete(null);
        }
    };
    
    const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateFilter({
            ...dateFilter,
            [e.target.name]: e.target.value,
        });
    };

    const clearDateFilter = () => {
        setDateFilter({ start: '', end: '' });
    };

    const filteredReuniones = useMemo(() => {
        return reuniones
            .filter(reunion => {
                if (!dateFilter.start && !dateFilter.end) {
                    return true;
                }
                const [y, m, d] = reunion.fecha.split('-').map(Number);
                const reunionDate = new Date(Date.UTC(y, m - 1, d));

                if (dateFilter.start) {
                    const [sy, sm, sd] = dateFilter.start.split('-').map(Number);
                    const startDate = new Date(Date.UTC(sy, sm - 1, sd));
                    if (reunionDate < startDate) {
                        return false;
                    }
                }
                if (dateFilter.end) {
                    const [ey, em, ed] = dateFilter.end.split('-').map(Number);
                    const endDate = new Date(Date.UTC(ey, em - 1, ed));
                    if (reunionDate > endDate) {
                        return false;
                    }
                }
                return true;
            })
            .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }, [reuniones, dateFilter]);

    // Use LOCAL fetched data for the modal to ensure accuracy
    const attendanceDetails = useMemo(() => {
        if (!viewingAttendanceReunion) return { presentes: [], ausentes: [] };
        
        // Use the specifically fetched data instead of the global 'asistencias'
        const reunionAsistencias = viewingAttendanceData;

        // Map 'Presente' records to Adolescent objects
        const presentesData = reunionAsistencias
            .filter(a => a.estado === 'Presente')
            .flatMap((a): (Adolescente & { detalle?: AsistenciaDetalle })[] => {
                const ado = adolescentes.find(ado => String(ado.id) === String(a.adolescenteId));
                return ado ? [{ ...ado, detalle: a.detalle }] : [];
            });

        // Map 'Ausente' records to Adolescent objects
        const ausentesData = reunionAsistencias
            .filter(a => a.estado === 'Ausente')
            .flatMap(a => {
                const ado = adolescentes.find(ado => String(ado.id) === String(a.adolescenteId));
                return ado ? [ado] : [];
            });

        return { presentes: presentesData, ausentes: ausentesData };
    }, [viewingAttendanceReunion, viewingAttendanceData, adolescentes]);


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold">Gestión de Reuniones</h1>
                    {isRefreshing && <RefreshIcon className="w-5 h-5 animate-spin text-secondary" />}
                </div>
                {hasPermission('reuniones', 'create') && (
                    <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                        Crear Reunión
                    </button>
                )}
            </div>
            
            <div className="bg-surface p-3 sm:p-4 rounded-xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-text-secondary font-medium text-xs sm:text-sm whitespace-nowrap">Filtrar por fecha:</span>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1">
                    <div className="flex-1 sm:w-36">
                        <label htmlFor="start-date" className="sr-only">Desde</label>
                        <DateInput 
                            id="start-date"
                            name="start"
                            value={dateFilter.start}
                            onChange={handleDateFilterChange}
                        />
                    </div>
                    <span className="text-text-secondary hidden sm:inline">-</span>
                    <div className="flex-1 sm:w-36">
                        <label htmlFor="end-date" className="sr-only">Hasta</label>
                        <DateInput 
                            id="end-date"
                            name="end"
                            value={dateFilter.end}
                            onChange={handleDateFilterChange}
                        />
                    </div>
                    <button onClick={clearDateFilter} className="min-h-[44px] px-4 py-2 bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-700 active:scale-95 transition-all">
                        Limpiar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReuniones.map(reunion => {
                    const encargado = encargados.find(e => String(e.id) === String(reunion.encargadoId));
                    const stats = attendanceStats.get(String(reunion.id)) || { presentes: 0, ausentes: 0 };
                    
                    return (
                        <div key={reunion.id} className="bg-surface p-5 rounded-lg shadow-lg flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-primary font-bold uppercase tracking-wider block">Nro. {reunion.id}</span>
                                            {reunion.esTeensPro && (
                                                <span className="px-2 inline-flex text-[10px] leading-4 font-bold rounded-sm bg-purple-100 text-purple-800 border border-purple-200">TEENS PRO</span>
                                            )}
                                        </div>
                                        <h2 className="text-lg font-bold text-text-primary mb-2 leading-tight">{reunion.tema}</h2>
                                    </div>
                                    <StatusBadge status={reunion.estado} />
                                </div>
                                <p className="text-sm text-text-secondary">{formatDate(reunion.fecha)}</p>
                                <p className="text-sm text-text-secondary mb-2">Dirigido por: {encargado?.nombre} {encargado?.apellido}</p>
                                <div className="flex items-center gap-2 text-sm text-green-400 font-semibold bg-green-400/10 px-2 py-1 rounded w-fit">
                                    <UsersIcon className="w-4 h-4" />
                                    <span>{stats.presentes} Presentes</span>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {reunion.estado === 'En Proceso' && hasPermission('reuniones', 'update') && hasPermission('asistencias', 'create') &&
                                    <button 
                                        onClick={() => navigateTo('asistencia', { reunionId: reunion.id })} 
                                        className="flex-1 min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 group btn-shine"
                                    >
                                        <CheckCircleIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                                        <span>Tomar Asistencia</span>
                                    </button>
                                }
                                {reunion.estado === 'Finalizado' && hasPermission('reuniones', 'read') && hasPermission('asistencias', 'read') &&
                                    <button 
                                        onClick={() => setViewingAttendanceReunion(reunion)} 
                                        className="flex-1 min-h-[44px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 group btn-shine"
                                    >
                                        <EyeIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                                        <span>Ver Asistencia</span>
                                    </button>
                                }
                                {hasPermission('reuniones', 'update') &&
                                    <button 
                                        onClick={() => openModalForEdit(reunion)} 
                                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-surface hover:bg-surface/80 border border-border text-text-primary hover:text-primary font-semibold text-xs sm:text-sm shadow-xs hover:shadow active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 group"
                                    >
                                        <PencilIcon className="w-3.5 h-3.5 transition-transform group-hover:scale-110 group-hover:-rotate-12" />
                                        <span>Editar</span>
                                    </button>
                                }
                                {reunion.estado === 'En Proceso' && hasPermission('reuniones', 'delete') && (
                                    <button 
                                        onClick={() => handleDeleteClick(reunion)} 
                                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-600 border border-red-500/30 hover:border-red-600 text-red-400 hover:text-white font-semibold text-xs sm:text-sm shadow-xs hover:shadow-md hover:shadow-red-500/25 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 group"
                                        title="Eliminar Reunión"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5 transition-transform group-hover:scale-110 group-hover:rotate-12" />
                                        <span>Eliminar</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                 {filteredReuniones.length === 0 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center text-text-secondary py-8">
                        No se encontraron reuniones para el rango de fechas seleccionado.
                    </div>
                 )}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingReunion ? "Editar Reunión" : "Crear Reunión"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <InputField label="Tema de la Reunión" name="tema" value={values.tema} onChange={handleInputChange} required />
                    <InputField label="Fecha" name="fecha" type="date" value={values.fecha} onChange={handleInputChange} required />
                    <SelectField label="Encargado" name="encargadoId" value={values.encargadoId} onChange={handleInputChange} required>
                        {encargados.length === 0 && <option value="0">No hay encargados disponibles</option>}
                        {encargados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                    </SelectField>
                    <SelectField label="Estado" name="estado" value={values.estado} onChange={handleInputChange}>
                        <option value="En Proceso">En Proceso</option>
                        <option value="Finalizado">Finalizado</option>
                    </SelectField>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="esTeensPro"
                            name="esTeensPro"
                            checked={!!values.esTeensPro}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-primary focus:ring-primary border-border rounded bg-background"
                        />
                        <label htmlFor="esTeensPro" className="ml-2 block text-sm text-text-primary">
                            Es una clase TeensPro
                        </label>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-border mt-4">
                        <button type="button" onClick={closeModal} className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 active:scale-95 transition-all text-center">Cancelar</button>
                        <button type="submit" className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md text-center">Guardar</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!viewingAttendanceReunion} onClose={() => setViewingAttendanceReunion(null)} title={`Asistencia para: ${viewingAttendanceReunion?.tema}`}>
                {isLoadingAttendance ? (
                    <div className="flex justify-center items-center py-12">
                         <RefreshIcon className="w-8 h-8 animate-spin text-primary" />
                         <span className="ml-2 text-text-secondary">Cargando datos actualizados...</span>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold text-green-400 mb-2">Presentes ({attendanceDetails.presentes.length})</h3>
                                <ul className="space-y-2 text-sm text-text-secondary max-h-80 overflow-y-auto pr-2">
                                    {attendanceDetails.presentes.map(ado => (
                                        <li key={ado.id} className="bg-background p-2 rounded-md flex justify-between items-center">
                                            <span>{ado.nombre} {ado.apellido}</span>
                                            {ado.detalle && ado.detalle !== 'Regular' && <span className="text-xs bg-primary/50 text-white px-1.5 py-0.5 rounded-full">{ado.detalle}</span>}
                                        </li>
                                    ))}
                                    {attendanceDetails.presentes.length === 0 && <p className="p-2">No hubo asistentes.</p>}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-red-400 mb-2">Ausentes ({attendanceDetails.ausentes.length})</h3>
                                 <ul className="space-y-2 text-sm text-text-secondary max-h-80 overflow-y-auto pr-2">
                                    {attendanceDetails.ausentes.map(ado => <li key={ado.id} className="bg-background p-2 rounded-md">{ado.nombre} {ado.apellido}</li>)}
                                    {attendanceDetails.ausentes.length === 0 && <p className="p-2">No hubo ausentes.</p>}
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6 pt-4 border-t border-border">
                             <button
                                onClick={() => setViewingAttendanceReunion(null)}
                                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Cerrar Vista
                            </button>
                        </div>
                    </>
                )}
            </Modal>
            
            <ConfirmationModal
                isOpen={isUnsavedConfirmOpen}
                onClose={() => setIsUnsavedConfirmOpen(false)}
                onConfirm={() => {
                    setIsUnsavedConfirmOpen(false);
                    forceCloseModal();
                }}
                title="Descartar Cambios"
                message="Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar y descartar los cambios?"
                confirmText="Descartar"
                confirmButtonClassName="bg-yellow-500 text-background hover:bg-yellow-600"
            />

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Reunión"
                message={<>¿Estás seguro de que deseas eliminar la reunión <strong>{reunionToDelete?.tema}</strong>? Esta acción no se puede deshacer.</>}
                confirmText="Eliminar"
                confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
            />
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
        {props.type === 'date' ? (
            <DateInput
                {...props}
                id={props.name}
                value={props.value as string}
                onChange={(e) => props.onChange && props.onChange(e as any)}
            />
        ) : (
            <input {...props} id={props.name} className="block w-full px-3 py-2.5 min-h-[44px] bg-background border border-border rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base sm:text-sm text-text-primary placeholder:text-text-secondary/50 disabled:opacity-50 transition-all" />
        )}
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
        <select {...props} id={props.name} className="block w-full px-3 py-2.5 min-h-[44px] text-base sm:text-sm bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-xs">
            {children}
        </select>
    </div>
);

export default Reuniones;