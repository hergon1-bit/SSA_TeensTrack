
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Encargado } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { formatDate } from '../utils/helpers';
import { RefreshIcon } from '../components/ui/Icons';

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
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestión de Encargados</h1>
                {hasPermission('encargados', 'create') && (
                    <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md">
                        Agregar Encargado
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
            
            <div className="hidden md:block bg-surface shadow-lg rounded-lg overflow-x-auto border border-border">
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary font-mono">{enc.cedula}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{enc.email || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{enc.telefono}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {hasPermission('encargados', 'update') && <button onClick={() => openModalForEdit(enc)} className="text-primary hover:text-indigo-400 font-bold">Editar</button>}
                                    {hasPermission('encargados', 'delete') && <button onClick={() => handleDeleteClick(enc)} className="text-red-500 hover:text-red-400 font-bold">Eliminar</button>}
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

                        <div className="flex justify-end gap-3 border-t border-border/50 pt-2">
                            {hasPermission('encargados', 'update') && (
                                <button 
                                    onClick={() => openModalForEdit(enc)} 
                                    className="text-primary hover:text-indigo-400 font-bold text-xs px-3 py-1.5 bg-primary/10 rounded-md transition-colors"
                                >
                                    Editar
                                </button>
                            )}
                            {hasPermission('encargados', 'delete') && (
                                <button 
                                    onClick={() => handleDeleteClick(enc)} 
                                    className="text-red-500 hover:text-red-400 font-bold text-xs px-3 py-1.5 bg-red-500/10 rounded-md transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredEncargados.length === 0 && (
                <div className="bg-surface p-8 text-center text-text-secondary italic rounded-lg border border-border">
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
                        <button type="button" onClick={closeModal} disabled={isSaving} className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-primary text-white px-8 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg">
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
                confirmButtonClassName="bg-yellow-600 text-white hover:bg-yellow-700"
            />
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <input {...props} id={props.name} className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary disabled:opacity-50 transition-all sm:text-sm" />
    </div>
);

export default Encargados;
