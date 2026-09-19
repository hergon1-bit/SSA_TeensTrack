
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Rol, Permisos } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';

// Helper Components
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <input {...props} id={props.name} className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
    </div>
);

// Role Editor Modal Component
interface RoleEditorModalProps {
    role: Rol;
    isOpen: boolean;
    onClose: () => void;
    onSave: (role: Rol) => void;
}

const RoleEditorModal: React.FC<RoleEditorModalProps> = ({ role, isOpen, onClose, onSave }) => {
    const [currentRole, setCurrentRole] = useState<Rol>(role);

    useEffect(() => {
        setCurrentRole(role);
    }, [role]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentRole(prev => ({ ...prev, nombre: e.target.value }));
    };
    
    const handlePermissionChange = (module: keyof Rol['permisos'], action: keyof Permisos) => {
        setCurrentRole(prev => {
            const newPerms = JSON.parse(JSON.stringify(prev.permisos));
            newPerms[module][action] = !newPerms[module][action];
            return { ...prev, permisos: newPerms };
        });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(currentRole);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={role.id === '' ? "Crear Nuevo Rol" : "Editar Rol"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField label="Nombre del Rol" value={currentRole.nombre} onChange={handleNameChange} required />
                
                <div className="overflow-x-auto">
                    <table className="min-w-full text-center text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="py-2 text-left font-medium text-text-secondary">Módulo</th>
                                <th className="py-2 font-medium text-text-secondary">Leer</th>
                                <th className="py-2 font-medium text-text-secondary">Crear</th>
                                <th className="py-2 font-medium text-text-secondary">Editar</th>
                                <th className="py-2 font-medium text-text-secondary">Borrar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(currentRole.permisos).map((module) => (
                                <tr key={module} className="border-b border-border">
                                    <td className="py-2 text-left capitalize text-text-primary">{module.replace('_', ' ')}</td>
                                    {Object.keys(currentRole.permisos[module as keyof Rol['permisos']]).map(action => (
                                        <td key={action} className="py-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                                                checked={currentRole.permisos[module as keyof Rol['permisos']][action as keyof Permisos]}
                                                onChange={() => handlePermissionChange(module as keyof Rol['permisos'], action as keyof Permisos)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                    <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};

// Main Component
const Roles: React.FC = () => {
    const { roles, addRole, updateRole, deleteRole } = useData();
    const { hasPermission } = useAuth();
    
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Rol | null>(null);
    const [isRoleConfirmOpen, setIsRoleConfirmOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Rol | null>(null);

    const selectedRole = roles.find(r => r.id === selectedRoleId) || null;

    useEffect(() => {
        if (roles.length > 0 && !selectedRoleId) {
            setSelectedRoleId(roles[0].id);
        }
    }, [roles, selectedRoleId]);

    // --- Role Handlers ---
    const handleCreateRole = () => {
        const defaultPermissions: Rol['permisos'] = {
            adolescentes: { read: false, create: false, update: false, delete: false },
            asistencias: { read: false, create: false, update: false, delete: false },
            celebraciones_cumpleanos: { read: false, create: false, update: false, delete: false },
            devocionales: { read: false, create: false, update: false, delete: false },
            encargados: { read: false, create: false, update: false, delete: false },
            entregas_devocionales: { read: false, create: false, update: false, delete: false },
            eventos: { read: false, create: false, update: false, delete: false },
            inscripciones_eventos: { read: false, create: false, update: false, delete: false },
            inscripciones_servidores: { read: false, create: false, update: false, delete: false },
            pagos_eventos: { read: false, create: false, update: false, delete: false },
            pagos_servidores: { read: false, create: false, update: false, delete: false },
            participantes_eventos: { read: false, create: false, update: false, delete: false },
            plan_clases: { read: false, create: false, update: false, delete: false },
            reuniones: { read: false, create: false, update: false, delete: false },
            roles: { read: false, create: false, update: false, delete: false },
            servidores: { read: false, create: false, update: false, delete: false },
            tutor_adolescente: { read: false, create: false, update: false, delete: false },
            tutores: { read: false, create: false, update: false, delete: false },
            usuarios: { read: false, create: false, update: false, delete: false },
        };
        setEditingRole({ id: '', nombre: '', permisos: defaultPermissions });
        setIsRoleModalOpen(true);
    };

    const handleEditRole = () => {
        if (!selectedRole) return;
        setEditingRole(JSON.parse(JSON.stringify(selectedRole))); // Deep copy
        setIsRoleModalOpen(true);
    };

    const handleSaveRole = async (role: Rol) => {
        if (role.id === '') {
            const { id, ...newRole } = role;
            await addRole(newRole);
        } else {
            await updateRole(role);
        }
        setIsRoleModalOpen(false);
        setEditingRole(null);
    };
    
    const handleDeleteRoleClick = () => {
        if (!selectedRole) return;
        setRoleToDelete(selectedRole);
        setIsRoleConfirmOpen(true);
    };

    const handleConfirmRoleDelete = async () => {
        if (roleToDelete) {
            const result = await deleteRole(roleToDelete.id);
            if (!result.success) {
                alert(result.message);
            } else {
                setSelectedRoleId(roles[0]?.id || null);
            }
            setIsRoleConfirmOpen(false);
            setRoleToDelete(null);
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestión de Roles y Permisos</h1>
                    <div className="flex gap-2">
                        {hasPermission('roles', 'create') && <button onClick={handleCreateRole} className="bg-secondary text-white px-4 py-2 rounded-lg text-sm">Crear Rol</button>}
                        {hasPermission('roles', 'update') && <button onClick={handleEditRole} disabled={!selectedRole} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Editar Rol</button>}
                        {hasPermission('roles', 'delete') && <button onClick={handleDeleteRoleClick} disabled={!selectedRole} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Eliminar Rol</button>}
                    </div>
            </div>

            <div className="bg-surface p-6 rounded-lg shadow-lg">
                <label htmlFor="role-select" className="block text-sm font-medium text-text-secondary mb-1">Seleccionar Rol</label>
                <select id="role-select" value={selectedRoleId || ''} onChange={(e) => setSelectedRoleId(e.target.value)} className="bg-background border border-border p-2 rounded-md mb-4 w-full max-w-sm">
                    {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.nombre}</option>
                    ))}
                </select>

                {selectedRole && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-center text-sm">
                            <thead className="border-b-2 border-border">
                                <tr>
                                    <th className="py-2 px-4 text-left font-medium text-text-secondary uppercase tracking-wider">Módulo</th>
                                    <th className="py-2 px-4 font-medium text-text-secondary uppercase tracking-wider">Leer</th>
                                    <th className="py-2 px-4 font-medium text-text-secondary uppercase tracking-wider">Crear</th>
                                    <th className="py-2 px-4 font-medium text-text-secondary uppercase tracking-wider">Editar</th>
                                    <th className="py-2 px-4 font-medium text-text-secondary uppercase tracking-wider">Borrar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {Object.keys(selectedRole.permisos).map((module) => (
                                    <tr key={module} className="hover:bg-background/50">
                                        <td className="py-3 px-4 text-left capitalize text-text-primary font-medium">{module.replace('_', ' ')}</td>
                                        {Object.keys(selectedRole.permisos[module as keyof Rol['permisos']]).map(action => (
                                            <td key={action} className="py-3 px-4">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary disabled:opacity-70"
                                                    checked={(selectedRole.permisos as any)[module][action]}
                                                    disabled
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {editingRole && <RoleEditorModal role={editingRole} isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} onSave={handleSaveRole} />}
            
            <ConfirmationModal
                isOpen={isRoleConfirmOpen}
                onClose={() => setIsRoleConfirmOpen(false)}
                onConfirm={handleConfirmRoleDelete}
                title="Confirmar Eliminación de Rol"
                message={<>¿Estás seguro de que quieres eliminar el rol <strong>{roleToDelete?.nombre}</strong>? Esta acción no se puede deshacer.</>}
            />
        </div>
    );
};

export default Roles;
