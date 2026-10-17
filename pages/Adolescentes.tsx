
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Adolescente, Sexo, EstadoAdolescente } from '../types';
import { calcularEdad, formatDate } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { DateInput } from '../components/ui/DateInput';
import { useForm } from '../hooks/useForm';
import { DownloadCloudIcon, RefreshIcon, PencilIcon, TrashIcon } from '../components/ui/Icons';
import StatusBadge from '../components/ui/StatusBadge';

const Adolescentes: React.FC = () => {
    const { adolescentes, tutores, tutoresAdolescentes, addAdolescente, updateAdolescente, deleteAdolescente, reuniones, asistencias } = useData();
    const { hasPermission, rol } = useAuth();
    const isAdmin = rol?.id === '1' || rol?.nombre?.toLowerCase().includes('administrador') || rol?.nombre?.toLowerCase() === 'admin';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [formError, setFormError] = useState('');
    const [editingAdolescente, setEditingAdolescente] = useState<Adolescente | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState<'Todos' | EstadoAdolescente>('Todos');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [adolescenteToDelete, setAdolescenteToDelete] = useState<Adolescente | null>(null);
    const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);

    const initialFormState: Omit<Adolescente, 'id'> = {
        nombre: '', apellido: '', cedula: '', registro: '', fechaNacimiento: '', barrio: '', 
        ciudad: '', telefono: '', sexo: 'Masculino', estado: 'Activo',
        fichaInscripcion: false, autorizacion: false
    };

    const { values, handleInputChange, setValues, resetForm } = useForm<Omit<Adolescente, 'id'>>(initialFormState);

    // Contador de tiempo para el estado de guardado
    useEffect(() => {
        let timer: any;
        if (isSaving) {
            timer = setInterval(() => {
                setSecondsElapsed(prev => {
                    if (prev > 0 && prev % 7 === 0) setRetryCount(r => r + 1);
                    return prev + 1;
                });
            }, 1000);
        } else {
            setSecondsElapsed(0);
            setRetryCount(0);
        }
        return () => clearInterval(timer);
    }, [isSaving]);

    const openModalForCreate = () => {
        setEditingAdolescente(null);
        setFormError('');
        resetForm();
        setIsModalOpen(true);
    };

    const openModalForEdit = (adolescente: Adolescente) => {
        setEditingAdolescente(adolescente);
        setFormError('');
        const { id, ...rest } = adolescente;
        setValues({
            ...rest,
            registro: rest.registro || '',
            barrio: rest.barrio || '',
            ciudad: rest.ciudad || '',
            telefono: rest.telefono || '',
            fichaInscripcion: rest.fichaInscripcion || false,
            autorizacion: rest.autorizacion || false
        });
        setIsModalOpen(true);
    };
    
    const forceCloseModal = () => {
        setIsModalOpen(false);
        setEditingAdolescente(null);
        resetForm();
        setIsSaving(false);
        setFormError('');
    };

    const checkIfChanged = () => {
        if (!editingAdolescente) return true;
        const norm = (v: any) => v === null || v === undefined ? '' : String(v).trim();
        const normBool = (v: any) => v === true;
        return (
            norm(values.nombre) !== norm(editingAdolescente.nombre) ||
            norm(values.apellido) !== norm(editingAdolescente.apellido) ||
            norm(values.cedula) !== norm(editingAdolescente.cedula) ||
            norm(values.registro) !== norm(editingAdolescente.registro) ||
            norm(values.fechaNacimiento) !== norm(editingAdolescente.fechaNacimiento) ||
            norm(values.barrio) !== norm(editingAdolescente.barrio) ||
            norm(values.ciudad) !== norm(editingAdolescente.ciudad) ||
            norm(values.telefono) !== norm(editingAdolescente.telefono) ||
            norm(values.sexo) !== norm(editingAdolescente.sexo) ||
            norm(values.estado) !== norm(editingAdolescente.estado) ||
            normBool(values.fichaInscripcion) !== normBool(editingAdolescente.fichaInscripcion) ||
            normBool(values.autorizacion) !== normBool(editingAdolescente.autorizacion)
        );
    };

    const closeModal = () => {
        if (isSaving) return;
        if (editingAdolescente && checkIfChanged()) {
            setIsUnsavedConfirmOpen(true);
        } else {
            forceCloseModal();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        setFormError('');

        if (editingAdolescente && !checkIfChanged()) {
            forceCloseModal();
            return;
        }

        setIsSaving(true);

        try {
            const cleanValues = {
                nombre: (values.nombre || '').trim(),
                apellido: (values.apellido || '').trim(),
                cedula: (values.cedula || '').trim(),
                registro: (values.registro || '').trim(),
                fechaNacimiento: values.fechaNacimiento,
                barrio: (values.barrio || '').trim(),
                ciudad: (values.ciudad || '').trim(),
                telefono: (values.telefono || '').trim(),
                sexo: values.sexo || 'Masculino',
                estado: values.estado || 'Activo',
                fichaInscripcion: values.fichaInscripcion || false,
                autorizacion: values.autorizacion || false,
            };

            if (!cleanValues.nombre || !cleanValues.apellido || !cleanValues.cedula) {
                throw new Error("Nombre, Apellido y Cédula son obligatorios.");
            }

            const operationPromise = editingAdolescente
                ? updateAdolescente({ ...cleanValues, id: editingAdolescente.id })
                : addAdolescente(cleanValues);

            await operationPromise;
            forceCloseModal();
        } catch (error: any) {
            console.error("Error al guardar:", error);
            let msg = error.message || "Error inesperado.";
            if (msg.includes('fetch') || msg.includes('Timeout') || msg.includes('no responde')) {
                msg = "⚠️ FALLO DE CONEXIÓN: El servidor tardó demasiado en responder. Los datos podrían NO haberse guardado. Por favor, verifique su internet e intente de nuevo.";
            }
            setFormError(msg);
            setIsSaving(false); // IMPORTANTE: Liberar el estado de guardado si falla
        }
    };

    const handleDeleteClick = (adolescente: Adolescente) => {
        setAdolescenteToDelete(adolescente);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (adolescenteToDelete) {
            await deleteAdolescente(adolescenteToDelete.id);
            setIsConfirmModalOpen(false);
            setAdolescenteToDelete(null);
        }
    };

    const filteredAdolescentes = useMemo(() => {
        return adolescentes
            .filter(a =>
                `${a.nombre} ${a.apellido} ${a.registro}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.cedula.includes(searchTerm)
            )
            .filter(a => 
                estadoFilter === 'Todos' ? true : a.estado === estadoFilter
            )
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [adolescentes, searchTerm, estadoFilter]);

    const handleExportCSV = () => {
        if (filteredAdolescentes.length === 0) return;
        const headers = ["ID", "Nombre", "Apellido", "Cedula", "Reg. Salud", "Edad", "Estado"];
        const csvRows = [
            headers.join(';'),
            ...filteredAdolescentes.map(ado => [
                ado.id, ado.nombre, ado.apellido, ado.cedula, ado.registro || 'N/A',
                calcularEdad(ado.fechaNacimiento), ado.estado
            ].join(';'))
        ];
        const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'adolescentes.csv';
        link.click();
    };

    const handleInactivarAusentes = async () => {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const reunionesUltimoAnioIds = reuniones
            .filter(r => new Date(r.fecha) >= oneYearAgo)
            .map(r => String(r.id));

        const activos = adolescentes.filter(a => a.estado === 'Activo');

        const paraInactivar = activos.filter(a => {
            const asistioEnElAnio = asistencias.some(asis => 
                String(asis.adolescenteId) === String(a.id) && 
                asis.estado === 'Presente' && 
                reunionesUltimoAnioIds.includes(String(asis.reunionId))
            );
            return !asistioEnElAnio;
        });

        if (paraInactivar.length === 0) {
            alert("No hay adolescentes activos con más de 1 año de inasistencia.");
            return;
        }

        if (confirm(`Se encontraron ${paraInactivar.length} adolescentes activos sin asistencias en el último año. ¿Desea marcarlos como 'Inactivos'?`)) {
            setIsSaving(true);
            try {
                for (const ado of paraInactivar) {
                    await updateAdolescente({ ...ado, estado: 'Inactivo' });
                }
                alert(`Se inactivaron ${paraInactivar.length} adolescentes correctamente.`);
            } catch (error) {
                console.error("Error inactivando:", error);
                alert("Hubo un error inactivando a los adolescentes.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">Gestión de Adolescentes</h1>
                    <p className="text-xs sm:text-sm text-text-secondary mt-0.5">Control de registros, estados y fichas documentales</p>
                </div>
                <div className="flex items-center flex-wrap gap-2.5">
                    {isAdmin && (
                        <button 
                            onClick={handleInactivarAusentes} 
                            disabled={isSaving} 
                            className="min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-[0.97] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:shadow-red-600/30 border border-red-500/30 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 group"
                            title="Inactivar adolescentes que no asistieron en más de 1 año"
                        >
                            <span className="transition-transform duration-200 group-hover:scale-110">⚠️</span>
                            <span>Inactivar Ausentes {'>'} 1 Año</span>
                        </button>
                    )}
                    <button 
                        onClick={handleExportCSV} 
                        className="min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.97] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:shadow-emerald-600/30 border border-emerald-500/30 transition-all duration-200 flex items-center gap-2 group"
                        title="Exportar base de datos a CSV"
                    >
                        <DownloadCloudIcon className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                        <span>Exportar CSV</span>
                    </button>
                    {hasPermission('adolescentes', 'create') && (
                        <button 
                            onClick={openModalForCreate} 
                            className="min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 hover:from-primary/95 hover:to-indigo-500 active:scale-[0.97] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/35 border border-primary/40 transition-all duration-200 flex items-center gap-2 group btn-shine"
                        >
                            <span className="text-lg leading-none font-black transition-transform duration-300 group-hover:rotate-90 inline-block">+</span>
                            <span>Agregar Adolescente</span>
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
                <input
                    type="text"
                    placeholder="Buscar por nombre, cédula o registro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto flex-grow max-w-sm px-4 py-2 bg-surface border border-border rounded-md focus:ring-primary focus:border-primary transition outline-none"
                />
                <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value as 'Todos' | EstadoAdolescente)}
                    className="w-full sm:w-auto bg-surface border border-border rounded-md px-4 py-2 focus:ring-primary focus:border-primary transition outline-none"
                >
                    <option value="Todos">Todos los Estados</option>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Anulado">Anulado</option>
                </select>
            </div>
            
            <div className="hidden md:block bg-surface shadow-xl rounded-lg overflow-hidden border border-border">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Nombre Completo</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Cédula / Reg.</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Edad</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Tutores</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Documentos</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Estado</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-text-secondary uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAdolescentes.map((ado) => {
                                const adoTutoresIds = tutoresAdolescentes.filter(ta => ta.adolescenteId === ado.id).map(ta => ta.tutorId);
                                const adoTutores = tutores.filter(t => adoTutoresIds.includes(t.id));

                                return (
                                <tr key={ado.id} className="hover:bg-primary/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-text-primary">{ado.nombre} {ado.apellido}</div>
                                        <div className="text-[10px] text-text-secondary uppercase">{ado.ciudad || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono text-text-secondary">{ado.cedula}</div>
                                        <div className="text-[10px] text-primary font-bold">REG: {ado.registro || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-text-secondary font-bold">{calcularEdad(ado.fechaNacimiento)} años</div>
                                        {ado.fechaNacimiento && (
                                            <div className="text-[11px] text-text-secondary font-mono">{formatDate(ado.fechaNacimiento)}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {adoTutores.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {adoTutores.map(t => (
                                                    <div key={t.id} className="text-xs">
                                                        <span className="font-bold text-text-primary">{t.nombre} {t.apellido}</span>
                                                        {t.telefono && <span className="text-text-secondary ml-1">({t.telefono})</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-text-secondary italic">Sin tutores</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                                ado.fichaInscripcion 
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${ado.fichaInscripcion ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-rose-400'}`}></span>
                                                Ficha: {ado.fichaInscripcion ? 'Sí' : 'No'}
                                            </span>
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                                ado.autorizacion 
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${ado.autorizacion ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-rose-400'}`}></span>
                                                Autorización: {ado.autorizacion ? 'Sí' : 'No'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={ado.estado} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {hasPermission('adolescentes', 'update') && (
                                            <button 
                                                onClick={() => openModalForEdit(ado)} 
                                                className="group inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white dark:hover:text-black border border-primary/30 hover:border-primary shadow-xs hover:shadow-md hover:shadow-primary/25 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200"
                                            >
                                                <PencilIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
                                                <span>Editar</span>
                                            </button>
                                        )}
                                        {hasPermission('adolescentes', 'delete') && (
                                            <button 
                                                onClick={() => handleDeleteClick(ado)} 
                                                className="group inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/30 hover:border-red-600 shadow-xs hover:shadow-md hover:shadow-red-500/25 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                                                <span>Eliminar</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View (Cards) */}
            <div className="block md:hidden space-y-4">
                {filteredAdolescentes.map((ado) => {
                    const adoTutoresIds = tutoresAdolescentes.filter(ta => ta.adolescenteId === ado.id).map(ta => ta.tutorId);
                    const adoTutores = tutores.filter(t => adoTutoresIds.includes(t.id));

                    return (
                        <div key={ado.id} className="bg-surface p-4 rounded-lg border border-border shadow-md space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-base font-bold text-text-primary">{ado.nombre} {ado.apellido}</h3>
                                    <span className="text-[10px] text-text-secondary uppercase">{ado.ciudad || '-'}</span>
                                </div>
                                <StatusBadge status={ado.estado} size="sm" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
                                <div>
                                    <p className="text-text-secondary font-medium">Cédula</p>
                                    <p className="font-mono text-text-primary">{ado.cedula}</p>
                                </div>
                                <div>
                                    <p className="text-text-secondary font-medium">Registro Salud</p>
                                    <p className="text-primary font-bold">{ado.registro || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-text-secondary font-medium">Edad</p>
                                    <p className="text-text-primary font-bold">{calcularEdad(ado.fechaNacimiento)} años</p>
                                    {ado.fechaNacimiento && (
                                        <p className="text-[10px] text-text-secondary font-mono">({formatDate(ado.fechaNacimiento)})</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-text-secondary font-medium mb-1">Documentos</p>
                                    <div className="flex flex-col gap-1">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                            ado.fichaInscripcion 
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${ado.fichaInscripcion ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-rose-400'}`}></span>
                                            Ficha: {ado.fichaInscripcion ? 'Sí' : 'No'}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                            ado.autorizacion 
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${ado.autorizacion ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-rose-400'}`}></span>
                                            Autorización: {ado.autorizacion ? 'Sí' : 'No'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {adoTutores.length > 0 && (
                                <div className="border-t border-border/50 pt-2 text-xs">
                                    <p className="text-text-secondary font-medium mb-1">Tutores</p>
                                    <div className="space-y-1">
                                        {adoTutores.map(t => (
                                            <div key={t.id} className="flex justify-between items-center bg-background/50 p-1.5 rounded">
                                                <span className="font-bold text-text-primary">{t.nombre} {t.apellido}</span>
                                                {t.telefono && <span className="text-text-secondary">{t.telefono}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2.5 border-t border-border/50 pt-3">
                                {hasPermission('adolescentes', 'update') && (
                                    <button 
                                        onClick={() => openModalForEdit(ado)} 
                                        className="group min-h-[40px] px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white dark:hover:text-black font-bold text-xs rounded-xl border border-primary/30 hover:border-primary shadow-xs hover:shadow-md hover:shadow-primary/25 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
                                    >
                                        <PencilIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
                                        <span>Editar</span>
                                    </button>
                                )}
                                {hasPermission('adolescentes', 'delete') && (
                                    <button 
                                        onClick={() => handleDeleteClick(ado)} 
                                        className="group min-h-[40px] px-4 py-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white font-bold text-xs rounded-xl border border-red-500/30 hover:border-red-600 shadow-xs hover:shadow-md hover:shadow-red-500/25 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                                        <span>Eliminar</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredAdolescentes.length === 0 && (
                <div className="bg-surface p-8 text-center text-text-secondary italic rounded-lg border border-border">
                    No se encontraron registros activos.
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAdolescente ? "Editar Adolescente" : "Agregar Adolescente"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="bg-red-900/40 border-l-4 border-red-500 text-red-100 p-4 rounded shadow-lg" role="alert">
                            <p className="font-bold">Error al guardar:</p>
                            <p className="text-sm leading-relaxed">{formError}</p>
                            <button type="button" onClick={() => setFormError('')} className="mt-2 text-[10px] uppercase font-bold underline">Cerrar este aviso</button>
                        </div>
                    )}
                    
                    {isSaving && (
                        <div className="bg-blue-600/20 border-l-4 border-blue-500 text-blue-100 p-4 rounded animate-pulse">
                            <p className="font-bold flex items-center gap-2">
                                <RefreshIcon className="w-4 h-4 animate-spin" />
                                Guardando en el servidor...
                            </p>
                            <p className="text-xs">Tiempo: {secondsElapsed}s {retryCount > 0 ? `| Reintento nro: ${retryCount}` : ''}</p>
                            {secondsElapsed > 10 && (
                                <button 
                                    type="button" 
                                    onClick={() => forceCloseModal()} 
                                    className="mt-2 bg-red-600/40 hover:bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-all"
                                >
                                    Cancelar y revisar conexión
                                </button>
                            )}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Nombre" name="nombre" value={values.nombre || ''} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Apellido" name="apellido" value={values.apellido || ''} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Cédula" name="cedula" value={values.cedula || ''} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Registro de Salud" name="registro" value={values.registro || ''} onChange={handleInputChange} disabled={isSaving} />
                        <InputField label="Fecha de Nacimiento" name="fechaNacimiento" type="date" value={values.fechaNacimiento || ''} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Barrio" name="barrio" value={values.barrio || ''} onChange={handleInputChange} disabled={isSaving} />
                        <InputField label="Ciudad" name="ciudad" value={values.ciudad || ''} onChange={handleInputChange} disabled={isSaving} />
                        <InputField label="Teléfono" name="telefono" value={values.telefono || ''} onChange={handleInputChange} disabled={isSaving} />
                        <SelectField label="Sexo" name="sexo" value={values.sexo || 'Masculino'} onChange={handleInputChange} disabled={isSaving}>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                        </SelectField>
                        <SelectField label="Estado" name="estado" value={values.estado || 'Activo'} onChange={handleInputChange} disabled={isSaving}>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                            <option value="Anulado">Anulado</option>
                        </SelectField>
                        <div className="flex flex-col justify-center space-y-2 mt-4 md:mt-0">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="fichaInscripcion" 
                                    checked={values.fichaInscripcion || false} 
                                    onChange={(e) => setValues({...values, fichaInscripcion: e.target.checked})} 
                                    disabled={isSaving}
                                    className="rounded border-border text-primary focus:ring-primary bg-background w-4 h-4"
                                />
                                <span className="text-sm font-medium text-text-primary">Entregó Ficha de Inscripción</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="autorizacion" 
                                    checked={values.autorizacion || false} 
                                    onChange={(e) => setValues({...values, autorizacion: e.target.checked})} 
                                    disabled={isSaving}
                                    className="rounded border-border text-primary focus:ring-primary bg-background w-4 h-4"
                                />
                                <span className="text-sm font-medium text-text-primary">Entregó Autorización</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-border mt-4">
                        <button 
                            type="button" 
                            onClick={closeModal} 
                            disabled={isSaving} 
                            className="min-h-[44px] px-5 py-2.5 rounded-xl border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface/80 active:scale-[0.97] transition-all duration-200 font-semibold text-sm disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving} 
                            className={`min-h-[44px] px-7 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-500 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:shadow-primary/30 active:scale-[0.97] transition-all duration-200 flex items-center gap-2 disabled:opacity-70 ${isSaving ? 'cursor-wait' : ''} btn-shine`}
                        >
                            {isSaving ? (
                                <>
                                    <RefreshIcon className="w-5 h-5 animate-spin" />
                                    <span>Guardando datos...</span>
                                </>
                            ) : (
                                <span>{editingAdolescente ? 'Actualizar Adolescente' : 'Grabar Datos'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={<>¿Estás seguro de que quieres eliminar a <strong>{adolescenteToDelete?.nombre} {adolescenteToDelete?.apellido}</strong>? Esta acción no se puede deshacer.</>}
                confirmText="Eliminar"
            />
            
            <ConfirmationModal
                isOpen={isUnsavedConfirmOpen}
                onClose={() => setIsUnsavedConfirmOpen(false)}
                onConfirm={() => {
                    setIsUnsavedConfirmOpen(false);
                    forceCloseModal();
                }}
                title="Descartar Cambios"
                message="Tienes cambios sin guardar en el formulario. ¿Estás seguro de que quieres salir y perder los cambios?"
                confirmText="Descartar"
                confirmButtonClassName="bg-yellow-600 text-white hover:bg-yellow-700"
            />
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, type, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        {type === 'date' ? (
            <DateInput
                id={props.name}
                name={props.name}
                value={String(props.value || '')}
                onChange={props.onChange as any}
                required={props.required}
                disabled={props.disabled}
            />
        ) : (
            <input {...props} id={props.name} type={type} className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary disabled:opacity-50 transition-all sm:text-sm" />
        )}
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <select {...props} id={props.name} className="block w-full pl-3 pr-10 py-2 bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent rounded-md text-text-primary disabled:opacity-50 transition-all sm:text-sm">
            {children}
        </select>
    </div>
);

export default Adolescentes;
