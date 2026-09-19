
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Tutor, GradoParentesco } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';

const Tutores: React.FC = () => {
    const { tutores, adolescentes, tutoresAdolescentes, addTutor, updateTutor, deleteTutor } = useData();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTutor, setEditingTutor] = useState<Tutor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estado para el filtro interno del modal
    const [adolescenteModalSearch, setAdolescenteModalSearch] = useState('');
    
    const [linkedAdolescenteIds, setLinkedAdolescenteIds] = useState<Set<string>>(new Set());
    const [originalLinkedIds, setOriginalLinkedIds] = useState<Set<string>>(new Set());
    const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [tutorToDelete, setTutorToDelete] = useState<Tutor | null>(null);


    const initialFormState: Omit<Tutor, 'id'> = {
        nombre: '',
        apellido: '',
        cedula: '',
        telefono: '',
        parentesco: 'Padre',
        barrio: '',
        ciudad: '',
    };

    const { values, handleInputChange, setValues, resetForm } = useForm<Omit<Tutor, 'id'>>(initialFormState);

    const adolescentesActivos = useMemo(() => adolescentes.filter(a => a.estado === 'Activo'), [adolescentes]);

    const openModalForCreate = () => {
        setEditingTutor(null);
        resetForm();
        setLinkedAdolescenteIds(new Set());
        setOriginalLinkedIds(new Set());
        setAdolescenteModalSearch(''); // Resetear filtro del modal
        setIsModalOpen(true);
    };

    const openModalForEdit = (tutor: Tutor) => {
        setEditingTutor(tutor);
        setValues({ ...tutor });
        const currentLinks = tutoresAdolescentes
            .filter(ta => ta.tutorId === tutor.id)
            .map(ta => ta.adolescenteId);
        const linksSet = new Set(currentLinks);
        setLinkedAdolescenteIds(linksSet);
        setOriginalLinkedIds(linksSet);
        setAdolescenteModalSearch(''); // Resetear filtro del modal
        setIsModalOpen(true);
    };

    const forceCloseModal = () => {
        setIsModalOpen(false);
        setEditingTutor(null);
        resetForm();
        setLinkedAdolescenteIds(new Set());
        setOriginalLinkedIds(new Set());
        setAdolescenteModalSearch('');
    };
    
    const closeModal = () => {
        if (editingTutor) {
             const tutorDataChanged = Object.keys(initialFormState).some(key => {
                 const formKey = key as keyof typeof values;
                 const originalKey = key as keyof Tutor;
                 return String(values[formKey] ?? '') !== String(editingTutor[originalKey] ?? '');
            });

            const areSetsEqual = (a: Set<string>, b: Set<string>) =>
                a.size === b.size && [...a].every(value => b.has(value));

            const linksChanged = !areSetsEqual(linkedAdolescenteIds, originalLinkedIds);

            if (tutorDataChanged || linksChanged) {
                setIsUnsavedConfirmOpen(true);
            } else {
                forceCloseModal();
            }
        } else {
            forceCloseModal();
        }
    };

    const handleLinkChange = (adolescenteId: string) => {
        setLinkedAdolescenteIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(adolescenteId)) {
                newSet.delete(adolescenteId);
            } else {
                newSet.add(adolescenteId);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // FIX: Replaced `Array.from` with spread syntax to correctly convert the Set to an array.
        const ids = [...linkedAdolescenteIds];
        if (editingTutor) {
            await updateTutor({ ...values, id: editingTutor.id }, ids);
        } else {
            await addTutor(values, ids);
        }
        forceCloseModal();
    };

    const handleDeleteClick = (tutor: Tutor) => {
        setTutorToDelete(tutor);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (tutorToDelete) {
            await deleteTutor(tutorToDelete.id);
            setIsDeleteConfirmOpen(false);
            setTutorToDelete(null);
        }
    };

    const filteredTutores = useMemo(() => {
        return tutores.map(tutor => {
            const linkedCount = tutoresAdolescentes.filter(ta => ta.tutorId === tutor.id).length;
            return { ...tutor, linkedCount };
        }).filter(t =>
            `${t.nombre} ${t.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.cedula.includes(searchTerm)
        );
    }, [tutores, tutoresAdolescentes, searchTerm]);

    const parentescoOptions: GradoParentesco[] = ['Padre', 'Madre', 'Tío', 'Tía', 'Abuelo', 'Abuela', 'Tutor Legal'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestión de Tutores</h1>
                {hasPermission('tutores', 'create') && (
                    <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                        Agregar Tutor
                    </button>
                )}
            </div>

            <input
                type="text"
                placeholder="Buscar por nombre o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-sm px-4 py-2 bg-surface border border-border rounded-md focus:ring-primary focus:border-primary transition"
            />

            <div className="hidden md:block bg-surface shadow-lg rounded-lg overflow-x-auto border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Nombre Completo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cédula</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Teléfono</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Parentesco</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Vínculos</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredTutores.map((tutor) => (
                            <tr key={tutor.id} className="hover:bg-background/50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-text-primary">{tutor.nombre} {tutor.apellido}</div>
                                    <div className="text-sm text-text-secondary">{tutor.ciudad}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tutor.cedula}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tutor.telefono || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tutor.parentesco}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{tutor.linkedCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {hasPermission('tutores', 'update') && <button onClick={() => openModalForEdit(tutor)} className="text-primary hover:text-indigo-400 font-bold">Editar</button>}
                                    {hasPermission('tutores', 'delete') && <button onClick={() => handleDeleteClick(tutor)} className="text-red-500 hover:text-red-400 font-bold">Eliminar</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="block md:hidden space-y-4">
                {filteredTutores.map((tutor) => (
                    <div key={tutor.id} className="bg-surface p-4 rounded-lg border border-border shadow-md space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-base font-bold text-text-primary">{tutor.nombre} {tutor.apellido}</h3>
                                <span className="text-[10px] text-text-secondary uppercase">{tutor.ciudad || '-'}</span>
                            </div>
                            <span className="bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase">
                                {tutor.parentesco}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-2">
                            <div>
                                <p className="text-text-secondary font-medium">Cédula</p>
                                <p className="font-mono text-text-primary">{tutor.cedula}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary font-medium">Teléfono</p>
                                <p className="text-text-primary font-bold">{tutor.telefono || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary font-medium">Barrio</p>
                                <p className="text-text-primary">{tutor.barrio || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-text-secondary font-medium">Vínculos</p>
                                <p className="text-text-primary font-bold">{tutor.linkedCount} adolescentes</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-border/50 pt-2">
                            {hasPermission('tutores', 'update') && (
                                <button 
                                    onClick={() => openModalForEdit(tutor)} 
                                    className="text-primary hover:text-indigo-400 font-bold text-xs px-3 py-1.5 bg-primary/10 rounded-md transition-colors"
                                >
                                    Editar
                                </button>
                            )}
                            {hasPermission('tutores', 'delete') && (
                                <button 
                                    onClick={() => handleDeleteClick(tutor)} 
                                    className="text-red-500 hover:text-red-400 font-bold text-xs px-3 py-1.5 bg-red-500/10 rounded-md transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredTutores.length === 0 && (
                <div className="bg-surface p-8 text-center text-text-secondary italic rounded-lg border border-border">
                    No se encontraron tutores.
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTutor ? "Editar Tutor" : "Agregar Tutor"} size="3xl">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="md:col-span-2">
                        <h3 className="text-lg font-medium text-text-primary border-b border-border pb-2 mb-4">Datos Personales</h3>
                    </div>
                    <InputField label="Nombre" name="nombre" value={values.nombre} onChange={handleInputChange} required />
                    <InputField label="Apellido" name="apellido" value={values.apellido} onChange={handleInputChange} required />
                    <InputField label="Cédula" name="cedula" value={values.cedula} onChange={handleInputChange} required />
                    <InputField label="Teléfono" name="telefono" value={values.telefono} onChange={handleInputChange} required />
                    <SelectField label="Parentesco" name="parentesco" value={values.parentesco} onChange={handleInputChange}>
                        {parentescoOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </SelectField>
                    <InputField label="Barrio" name="barrio" value={values.barrio} onChange={handleInputChange} required />
                    <InputField label="Ciudad" name="ciudad" value={values.ciudad} onChange={handleInputChange} required />
                    
                    <div className="md:col-span-2 mt-4">
                         <h3 className="text-lg font-medium text-text-primary border-b border-border pb-2 mb-4">Vincular Adolescentes</h3>
                         
                         {/* Campo de búsqueda interno del modal */}
                         <input
                            type="text"
                            placeholder="Filtrar lista por nombre..."
                            value={adolescenteModalSearch}
                            onChange={(e) => setAdolescenteModalSearch(e.target.value)}
                            className="w-full mb-3 px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-primary focus:border-primary transition placeholder-gray-500"
                        />

                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto bg-background/50 p-3 rounded-md border border-border">
                            {adolescentesActivos
                                .filter(ado => `${ado.nombre} ${ado.apellido}`.toLowerCase().includes(adolescenteModalSearch.toLowerCase()))
                                .map(ado => (
                                <label key={ado.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-surface cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={linkedAdolescenteIds.has(ado.id)}
                                        onChange={() => handleLinkChange(ado.id)}
                                        className="h-4 w-4 rounded border-gray-500 text-primary focus:ring-primary bg-background"
                                    />
                                    <span className="text-sm text-text-secondary">{ado.nombre} {ado.apellido}</span>
                                </label>
                            ))}
                            {adolescentesActivos.filter(ado => `${ado.nombre} ${ado.apellido}`.toLowerCase().includes(adolescenteModalSearch.toLowerCase())).length === 0 && (
                                <div className="col-span-full text-center text-xs text-text-secondary py-2">
                                    No se encontraron adolescentes con ese nombre.
                                </div>
                            )}
                         </div>
                    </div>

                    <div className="md:col-span-2 flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={closeModal} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Guardar</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={
                    <>
                        ¿Estás seguro de que quieres eliminar a <strong>{tutorToDelete?.nombre} {tutorToDelete?.apellido}</strong>? Se eliminarán todos sus vínculos.
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
                confirmButtonClassName="bg-yellow-500 text-background hover:bg-yellow-600"
            />
        </div>
    );
};

// Reusable components (can be moved to a shared file later)
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <input {...props} id={props.name} className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <select {...props} id={props.name} className="mt-1 block w-full pl-3 pr-10 py-2 text-base text-text-primary bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
            {children}
        </select>
    </div>
);


export default Tutores;