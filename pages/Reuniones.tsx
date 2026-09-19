import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Reunion, Adolescente, AsistenciaDetalle, Page, Asistencia } from '../types';
import { formatDate } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { RefreshIcon, UsersIcon } from '../components/ui/Icons';
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
            
            <div className="bg-surface p-4 rounded-lg flex flex-wrap gap-4 items-center">
                <span className="text-text-secondary font-medium">Filtrar por fecha:</span>
                <div>
                    <label htmlFor="start-date" className="sr-only">Desde</label>
                    <input 
                        type="date"
                        id="start-date"
                        name="start"
                        value={dateFilter.start}
                        onChange={handleDateFilterChange}
                        className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                    />
                </div>
                <span className="text-text-secondary">-</span>
                 <div>
                    <label htmlFor="end-date" className="sr-only">Hasta</label>
                    <input 
                        type="date"
                        id="end-date"
                        name="end"
                        value={dateFilter.end}
                        onChange={handleDateFilterChange}
                        className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                    />
                </div>
                <button onClick={clearDateFilter} className="bg-gray-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-gray-700 transition">
                    Limpiar
                </button>
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
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full shrink-0 ${
                                        reunion.estado === 'En Proceso' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                    }`}>{reunion.estado}</span>
                                </div>
                                <p className="text-sm text-text-secondary">{formatDate(reunion.fecha)}</p>
                                <p className="text-sm text-text-secondary mb-2">Dirigido por: {encargado?.nombre} {encargado?.apellido}</p>
                                <div className="flex items-center gap-2 text-sm text-green-400 font-semibold bg-green-400/10 px-2 py-1 rounded w-fit">
                                    <UsersIcon className="w-4 h-4" />
                                    <span>{stats.presentes} Presentes</span>
                                </div>
                            </div>
                            <div className="mt-4 flex space-x-2">
                                {reunion.estado === 'En Proceso' && hasPermission('reuniones', 'update') && hasPermission('asistencias', 'create') &&
                                    <button onClick={() => navigateTo('asistencia', { reunionId: reunion.id })} className="flex-1 bg-secondary text-white px-3 py-1.5 rounded-md text-sm hover:bg-emerald-500 transition">
                                        Tomar Asistencia
                                    </button>
                                }
                                {reunion.estado === 'Finalizado' && hasPermission('reuniones', 'read') && hasPermission('asistencias', 'read') &&
                                    <button onClick={() => setViewingAttendanceReunion(reunion)} className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 transition">
                                        Ver Asistencia
                                    </button>
                                }
                                {hasPermission('reuniones', 'update') &&
                                    <button onClick={() => openModalForEdit(reunion)} className="flex-1 bg-gray-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-gray-700 transition">
                                        Editar
                                    </button>
                                }
                                {reunion.estado === 'En Proceso' && hasPermission('reuniones', 'delete') && (
                                    <button 
                                        onClick={() => handleDeleteClick(reunion)} 
                                        className="flex-1 bg-red-600/80 text-white px-3 py-1.5 rounded-md text-sm hover:bg-red-600 transition"
                                        title="Eliminar Reunión"
                                    >
                                        Eliminar
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
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={closeModal} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Guardar</button>
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
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <input {...props} id={props.name} className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <select {...props} id={props.name} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-background border-border focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
            {children}
        </select>
    </div>
);

export default Reuniones;