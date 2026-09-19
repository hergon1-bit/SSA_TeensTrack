
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Servidor } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { RefreshIcon } from '../components/ui/Icons';
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
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Personal de Apoyo (Servidores)</h1>
                {hasPermission('servidores', 'create') && (
                    <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md font-bold">
                        + Nuevo Servidor
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
            
            <div className="bg-surface shadow-xl rounded-lg overflow-hidden border border-border">
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
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                    {hasPermission('servidores', 'update') && <button onClick={() => openModalForEdit(s)} className="text-primary hover:text-indigo-400 font-bold">Editar</button>}
                                    {hasPermission('servidores', 'delete') && <button onClick={() => handleDeleteClick(s)} className="text-red-500 hover:text-red-400 font-bold">Eliminar</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredServidores.length === 0 && <p className="text-center text-text-secondary py-8 italic">No se encontraron servidores.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingServidor ? "Editar Servidor" : "Agregar Servidor"}>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Nombre" name="nombre" value={values.nombre} onChange={handleInputChange} required />
                    <InputField label="Apellido" name="apellido" value={values.apellido} onChange={handleInputChange} required />
                    <InputField label="Cédula" name="cedula" value={values.cedula} onChange={handleInputChange} required />
                    <InputField label="Registro de Salud" name="registro" value={values.registro} onChange={handleInputChange} />
                    <InputField label="Ciudad" name="ciudad" value={values.ciudad} onChange={handleInputChange} required />
                    <InputField label="Teléfono" name="telefono" value={values.telefono} onChange={handleInputChange} required />
                    <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t border-border">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-8 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg">Guardar</button>
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
