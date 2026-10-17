
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Servidor } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { RefreshIcon, PencilIcon, TrashIcon } from '../components/ui/Icons';
import { useAuth } from '../contexts/AuthContext';

const Servidores: React.FC = () => {
    const { servidores, addServidor, updateServidor, deleteServidor } = useData();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingServidor, setEditingServidor] = useState<Servidor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [servidorToDelete, setServidorToDelete] = useState<Servidor | null>(null);

    const initialFormState: Omit<Servidor, 'id'> = {
        nombre: '', apellido: '', cedula: '', registro: '', telefono: '', ciudad: ''
    };

    const { values, handleInputChange, setValues, resetForm } = useForm<Omit<Servidor, 'id'>>(initialFormState);

    const openModalForCreate = () => {
        setEditingServidor(null);
        resetForm();
        setIsModalOpen(true);
    };

    const openModalForEdit = (s: Servidor) => {
        setEditingServidor(s);
        setValues({ ...s });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingServidor) {
            await updateServidor({ ...values, id: editingServidor.id });
        } else {
            await addServidor(values);
        }
        setIsModalOpen(false);
    };

    const handleDeleteClick = (s: Servidor) => {
        setServidorToDelete(s);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (servidorToDelete) {
            await deleteServidor(servidorToDelete.id);
            setIsConfirmModalOpen(false);
            setServidorToDelete(null);
        }
    };

    const filteredServidores = useMemo(() => {
        return servidores
            .filter(s =>
                `${s.nombre} ${s.apellido} ${s.cedula} ${s.registro}`.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [servidores, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Personal de Apoyo (Servidores)</h1>
                {hasPermission('servidores', 'create') && (
                    <button 
                        onClick={openModalForCreate} 
                        className="min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 hover:from-primary/95 hover:to-indigo-500 active:scale-[0.97] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/35 border border-primary/40 transition-all duration-200 flex items-center gap-2 group btn-shine"
                    >
                        <span className="text-base transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110 inline-block font-bold leading-none">+</span>
                        <span>Nuevo Servidor</span>
                    </button>
                )}
            </div>
            
            <input
                type="text"
                placeholder="Buscar por nombre, apellido o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-sm px-4 py-2 bg-surface border border-border rounded-md focus:ring-primary outline-none transition"
            />
            
            {/* Desktop Table View */}
            <div className="hidden md:block bg-surface shadow-xl rounded-xl overflow-x-auto border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Nombre</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Cédula / Registro</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Ciudad</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Teléfono</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-text-secondary uppercase tracking-widest">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredServidores.map((s) => (
                            <tr key={s.id} className="hover:bg-primary/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-text-primary">{s.nombre} {s.apellido}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-mono text-text-secondary">{s.cedula}</div>
                                    <div className="text-[10px] text-primary font-bold">REG: {s.registro || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{s.ciudad}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{s.telefono}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {hasPermission('servidores', 'update') && (
                                        <button 
                                            onClick={() => openModalForEdit(s)} 
                                            className="group inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white dark:hover:text-black border border-primary/30 hover:border-primary shadow-2xs hover:shadow-sm hover:shadow-primary/25 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200"
                                        >
                                            <PencilIcon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
                                            <span>Editar</span>
                                        </button>
                                    )}
                                    {hasPermission('servidores', 'delete') && (
                                        <button 
                                            onClick={() => handleDeleteClick(s)} 
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
                {filteredServidores.map((s) => (
                    <div key={s.id} className="bg-surface p-4 rounded-xl border border-border shadow-md space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-base font-bold text-text-primary">{s.nombre} {s.apellido}</h3>
                                <span className="text-[10px] text-text-secondary uppercase">{s.ciudad || '-'}</span>
                            </div>
                            {s.registro && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25">
                                    REG: {s.registro}
                                </span>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
                            <div>
                                <p className="text-text-secondary font-medium">Cédula</p>
                                <p className="font-mono text-text-primary">{s.cedula}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary font-medium">Teléfono</p>
                                <p className="text-text-primary font-bold">{s.telefono || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 border-t border-border/50 pt-3">
                            {hasPermission('servidores', 'update') && (
                                <button 
                                    onClick={() => openModalForEdit(s)} 
                                    className="min-h-[40px] px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs rounded-xl border border-primary/25 hover:border-primary shadow-xs hover:shadow-md hover:shadow-primary/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5"
                                >
                                    <PencilIcon className="w-3.5 h-3.5" />
                                    <span>Editar</span>
                                </button>
                            )}
                            {hasPermission('servidores', 'delete') && (
                                <button 
                                    onClick={() => handleDeleteClick(s)} 
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

            {filteredServidores.length === 0 && <p className="text-center text-text-secondary py-8 italic bg-surface rounded-xl border border-border">No se encontraron servidores.</p>}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingServidor ? "Editar Servidor" : "Agregar Servidor"}>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Nombre" name="nombre" value={values.nombre} onChange={handleInputChange} required />
                    <InputField label="Apellido" name="apellido" value={values.apellido} onChange={handleInputChange} required />
                    <InputField label="Cédula" name="cedula" value={values.cedula} onChange={handleInputChange} required />
                    <InputField label="Registro de Salud" name="registro" value={values.registro} onChange={handleInputChange} />
                    <InputField label="Ciudad" name="ciudad" value={values.ciudad} onChange={handleInputChange} required />
                    <InputField label="Teléfono" name="telefono" value={values.telefono} onChange={handleInputChange} required />
                    <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t border-border mt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)} 
                            className="min-h-[44px] px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface/80 active:scale-[0.97] transition-all duration-200 shadow-xs hover:shadow"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="min-h-[44px] px-7 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-500 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:shadow-primary/30 active:scale-[0.97] transition-all duration-200 flex items-center gap-2 btn-shine"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Servidor"
                message={<>¿Deseas eliminar a <strong>{servidorToDelete?.nombre} {servidorToDelete?.apellido}</strong>? Se perderán sus históricos de eventos.</>}
            />
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <input {...props} className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-2 focus:ring-primary text-text-primary" />
    </div>
);

export default Servidores;
