
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Encargado } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { DateInput } from '../components/ui/DateInput';
import { useForm } from '../hooks/useForm';
import { formatDate } from '../utils/helpers';
import { RefreshIcon, PencilIcon, TrashIcon } from '../components/ui/Icons';

const Encargados: React.FC = () => {
    const { encargados, addEncargado, updateEncargado, deleteEncargado } = useData();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [editingEncargado, setEditingEncargado] = useState<Encargado | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [encargadoToDelete, setEncargadoToDelete] = useState<Encargado | null>(null);
    const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);

    const initialFormState: Omit<Encargado, 'id'> = {
        nombre: '', apellido: '', cedula: '', fechaNacimiento: '', 
        barrio: '', ciudad: '', telefono: '', email: ''
    };

    const { values, handleInputChange, setValues, resetForm } = useForm<Omit<Encargado, 'id'>>(initialFormState);

    const openModalForCreate = () => {
        setEditingEncargado(null);
        setFormError('');
        resetForm();
        setIsModalOpen(true);
    };

    const openModalForEdit = (encargado: Encargado) => {
        setEditingEncargado(encargado);
        setFormError('');
        setValues({ ...encargado });
        setIsModalOpen(true);
    };
    
    const forceCloseModal = () => {
        setIsModalOpen(false);
        setEditingEncargado(null);
        resetForm();
        setIsSaving(false);
        setFormError('');
    };

    const closeModal = () => {
        if (isSaving) return;
        if (editingEncargado) {
            const hasChanged = Object.keys(initialFormState).some(key => {
                const formKey = key as keyof typeof values;
                const originalKey = key as keyof Encargado;
                return String(values[formKey] ?? '') !== String(editingEncargado[originalKey] ?? '');
            });

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
        if (isSaving) return;
        setFormError('');

        const isCedulaDuplicate = encargados.some(enc => {
            if (editingEncargado) {
                return enc.cedula === values.cedula && enc.id !== editingEncargado.id;
            }
            return enc.cedula === values.cedula;
        });

        if (isCedulaDuplicate) {
            setFormError('La cédula ingresada ya existe en la base de datos.');
            return;
        }

        setIsSaving(true);
        try {
             // Timeout de 45 segundos
             const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("La operación tardó demasiado. Verifique su conexión.")), 45000)
            );

            const opPromise = editingEncargado
                ? updateEncargado({ ...values, id: editingEncargado.id })
                : addEncargado(values);

            await Promise.race([opPromise, timeoutPromise]);
            forceCloseModal();
        } catch (err: any) {
            setFormError(err.message || "Error al guardar el encargado.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (encargado: Encargado) => {
        setEncargadoToDelete(encargado);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (encargadoToDelete) {
            await deleteEncargado(encargadoToDelete.id);
            setIsConfirmModalOpen(false);
            setEncargadoToDelete(null);
        }
    };

    const filteredEncargados = useMemo(() => {
        return encargados.filter(e =>
            `${e.nombre} ${e.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.cedula.includes(searchTerm) ||
            (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [encargados, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Encargados</h1>
                {hasPermission('encargados', 'create') && (
                    <button 
                        onClick={openModalForCreate} 
                        className="min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 hover:from-primary/95 hover:to-indigo-500 active:scale-[0.97] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/35 border border-primary/40 transition-all duration-200 flex items-center gap-2 group btn-shine"
                    >
                        <span className="text-base transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110 inline-block font-bold leading-none">+</span>
                        <span>Agregar Encargado</span>
                    </button>
                )}
            </div>
            
            <input
                type="text"
                placeholder="Buscar por nombre, cédula o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-sm px-4 py-2 bg-surface border border-border rounded-md focus:ring-primary focus:border-primary transition outline-none"
            />
            
            <div className="hidden md:block bg-surface shadow-lg rounded-xl overflow-x-auto border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Nombre Completo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cédula</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Teléfono</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredEncargados.map((enc) => (
                            <tr key={enc.id} className="hover:bg-background/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-text-primary">{enc.nombre} {enc.apellido}</div>
                                    <div className="text-xs text-text-secondary uppercase">{enc.ciudad}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    <div className="font-mono">{enc.cedula}</div>
                                    {enc.fechaNacimiento && (
                                        <div className="text-[11px] text-text-secondary">Fec. Nac: {formatDate(enc.fechaNacimiento)}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{enc.email || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{enc.telefono}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {hasPermission('encargados', 'update') && (
                                        <button 
                                            onClick={() => openModalForEdit(enc)} 
                                            className="group inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white dark:hover:text-black border border-primary/30 hover:border-primary shadow-2xs hover:shadow-sm hover:shadow-primary/25 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200"
                                        >
                                            <PencilIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
                                            <span>Editar</span>
                                        </button>
                                    )}
                                    {hasPermission('encargados', 'delete') && (
                                        <button 
                                            onClick={() => handleDeleteClick(enc)} 
                                            className="group inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/30 hover:border-red-600 shadow-2xs hover:shadow-sm hover:shadow-red-500/25 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                                            <span>Eliminar</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="block md:hidden space-y-4">
                {filteredEncargados.map((enc) => (
                    <div key={enc.id} className="bg-surface p-4 rounded-lg border border-border shadow-md space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-base font-bold text-text-primary">{enc.nombre} {enc.apellido}</h3>
                                <span className="text-[10px] text-text-secondary uppercase">{enc.ciudad || '-'}</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
                            <div>
                                <p className="text-text-secondary font-medium">Cédula</p>
                                <p className="font-mono text-text-primary">{enc.cedula}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary font-medium">Teléfono</p>
                                <p className="text-text-primary font-bold">{enc.telefono || 'N/A'}</p>
                            </div>
                            {enc.fechaNacimiento && (
                                <div className="col-span-2">
                                    <p className="text-text-secondary font-medium">Fecha de Nacimiento</p>
                                    <p className="text-text-primary font-mono">{formatDate(enc.fechaNacimiento)}</p>
                                </div>
                            )}
                            <div className="col-span-2">
                                <p className="text-text-secondary font-medium">Email</p>
                                <p className="text-text-primary break-all">{enc.email || 'N/A'}</p>
                            </div>
                            {enc.barrio && (
                                <div className="col-span-2">
                                    <p className="text-text-secondary font-medium">Barrio</p>
                                    <p className="text-text-primary">{enc.barrio}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2.5 border-t border-border/50 pt-3">
                            {hasPermission('encargados', 'update') && (
                                <button 
                                    onClick={() => openModalForEdit(enc)} 
                                    className="min-h-[40px] px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs rounded-xl border border-primary/25 hover:border-primary shadow-xs hover:shadow-md hover:shadow-primary/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
                                >
                                    <PencilIcon className="w-3.5 h-3.5" />
                                    <span>Editar</span>
                                </button>
                            )}
                            {hasPermission('encargados', 'delete') && (
                                <button 
                                    onClick={() => handleDeleteClick(enc)} 
                                    className="min-h-[40px] px-4 py-2 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white font-bold text-xs rounded-xl border border-red-500/25 hover:border-red-600 shadow-xs hover:shadow-md hover:shadow-red-500/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                    <span>Eliminar</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredEncargados.length === 0 && (
                <div className="bg-surface p-8 text-center text-text-secondary italic rounded-xl border border-border">
                    No se encontraron encargados.
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingEncargado ? "Editar Encargado" : "Agregar Encargado"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="bg-red-600/20 border-l-4 border-red-500 text-red-100 p-4 rounded shadow-lg animate-pulse">
                            <p className="font-bold">Atención:</p>
                            <p className="text-sm">{formError}</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Nombre" name="nombre" value={values.nombre} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Apellido" name="apellido" value={values.apellido} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Cédula" name="cedula" value={values.cedula} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Email" name="email" type="email" value={values.email || ''} onChange={handleInputChange} disabled={isSaving} />
                        <InputField label="Teléfono" name="telefono" value={values.telefono} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Fecha de Nacimiento" name="fechaNacimiento" type="date" value={values.fechaNacimiento || ''} onChange={handleInputChange} disabled={isSaving} />
                        <InputField label="Barrio" name="barrio" value={values.barrio} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Ciudad" name="ciudad" value={values.ciudad} onChange={handleInputChange} required disabled={isSaving} />
                    </div>
                    <div className="flex justify-end space-x-3 pt-6 border-t border-border mt-4">
                        <button 
                            type="button" 
                            onClick={closeModal} 
                            disabled={isSaving} 
                            className="min-h-[44px] px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface/80 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 shadow-xs hover:shadow"
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
                                    Guardando...
                                </>
                            ) : 'Guardar Datos'}
                        </button>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={
                     <>
                        ¿Estás seguro de que quieres eliminar a <strong>{encargadoToDelete?.nombre} {encargadoToDelete?.apellido}</strong>? Esta acción no se puede deshacer.
                    </>
                }
                confirmText="Confirmar Eliminación"
            />

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
                confirmButtonClassName="bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
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

export default Encargados;
