
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Usuario } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { KeyIcon, EyeIcon, EyeOffIcon, UsersIcon, RefreshIcon } from '../components/ui/Icons';
import { formatRelativeTime, formatDate } from '../utils/helpers';

// Helper Components
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <input {...props} id={props.name} className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
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

const RoleBadge: React.FC<{ roleName?: string }> = ({ roleName }) => {
    if (!roleName) return <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-500/30 text-gray-300">Sin Rol</span>;

    const colorClasses: { [key: string]: string } = {
        'Administrador': 'bg-red-500/30 text-red-300 border border-red-500/20',
        'Encargado': 'bg-blue-500/30 text-blue-300 border border-blue-500/20',
        'Staff': 'bg-green-500/30 text-green-300 border border-green-500/20',
    };
    
    const defaultColor = 'bg-gray-500/30 text-gray-300 border border-gray-500/20';
    
    const className = colorClasses[roleName] || defaultColor;

    return (
        <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold uppercase tracking-wider rounded-md ${className}`}>
            {roleName}
        </span>
    );
};

// Main Component
const Usuarios: React.FC = () => {
    const { usuarios, roles, addUser, updateUser, deleteUser, sendPasswordReset, fetchData } = useData();
    const { user: currentUser, hasPermission } = useAuth();
    
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    
    // Delete States
    const [isUserConfirmOpen, setIsUserConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [actionError, setActionError] = useState('');
    
    const initialFormState = {
        nombre: '',
        email: '',
        password: '',
        rolId: roles[0]?.id || 1,
    };
    
    const { values, handleInputChange, setValues, resetForm } = useForm(initialFormState);
    
    const filteredUsuarios = useMemo(() => {
        return [...usuarios]
            .filter(user =>
                user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                const dateA = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
                const dateB = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
                return dateB - dateA; // Mostrar más recientes arriba
            });
    }, [usuarios, searchTerm]);

    // --- User Handlers ---
    const openModalForCreateUser = () => {
        setEditingUser(null);
        resetForm();
        setShowPassword(false);
        setActionError('');
        setIsUserModalOpen(true);
    };

    const openModalForEditUser = (user: Usuario) => {
        setEditingUser(user);
        setValues({ ...user, password: '' });
        setActionError('');
        setIsUserModalOpen(true);
    };
    
    const handleSubmitUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionError('');

        const isEmailDuplicate = usuarios.some(u => {
            if (editingUser) {
                return u.email === values.email && u.id !== editingUser.id;
            }
            return u.email === values.email;
        });

        if (isEmailDuplicate) {
            setActionError('Error: El correo electrónico ingresado ya existe.');
            return;
        }

        const userData = { ...values, rolId: String(values.rolId) };
        
        try {
            if (editingUser) {
                await updateUser({ ...userData, id: editingUser.id });
            } else {
                if (!userData.password) { setActionError('La contraseña es obligatoria para nuevos usuarios.'); return; }
                if (userData.password.length < 6) { setActionError('La contraseña debe tener al menos 6 caracteres.'); return; }

                // Make sure to pass the password explicitly
                await addUser({ ...userData, password: values.password }); 
            }
            setIsUserModalOpen(false);
        } catch (error: any) {
            const msg = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
            setActionError(msg || "Ocurrió un error al guardar el usuario.");
        }
    };

    const handleDeleteUserClick = (user: Usuario) => {
        setUserToDelete(user);
        setActionError('');
        setIsUserConfirmOpen(true);
    };

    const handleConfirmUserDelete = async () => {
        if (!userToDelete) return;
        
        setIsDeleting(true);
        setActionError('');
        
        try {
            await deleteUser(userToDelete.id);
            // Si tiene éxito, cerramos modal y limpiamos estado
            setIsUserConfirmOpen(false);
            setUserToDelete(null);
        } catch (error: any) {
            console.error("Delete error:", error);
            const msg = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
            
            // Intentamos refrescar los datos de todas formas, por si el borrado parcial ocurrió
            await fetchData();
            
            setActionError(`Error al eliminar: ${msg}`);
            setIsUserConfirmOpen(false); 
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSendResetEmail = async (email: string) => {
        const confirmSend = window.confirm(`¿Enviar correo de restablecimiento de contraseña a ${email}?`);
        if (confirmSend) {
            try {
                await sendPasswordReset(email);
                alert(`Correo enviado a ${email}.`);
            } catch (error: any) {
                setActionError(`Error al enviar correo: ${error.message}`);
            }
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <UsersIcon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
                        <p className="text-text-secondary text-sm">Control de acceso y auditoría de conexiones</p>
                    </div>
                </div>
                {hasPermission('usuarios', 'create') && (
                    <button onClick={openModalForCreateUser} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition shadow-lg font-bold">
                        + Agregar Usuario
                    </button>
                )}
            </div>

            {/* Error Banner */}
            {actionError && (
                <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center shadow-md animate-pulse">
                    <span className="font-bold mr-2">Atención:</span> {actionError}
                    <button onClick={() => setActionError('')} className="ml-auto text-red-200 hover:text-white">&times;</button>
                </div>
            )}
            
            <div className="bg-surface p-4 rounded-lg border border-border flex items-center gap-4">
                <div className="flex-1 max-w-sm">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-md focus:ring-primary focus:border-primary transition"
                    />
                </div>
                <div className="text-xs text-text-secondary italic">
                    Mostrando {filteredUsuarios.length} usuarios
                </div>
            </div>
            
            <div className="bg-surface rounded-lg shadow-2xl overflow-hidden border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background/80">
                        <tr>
                            <th className="py-4 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Nombre del Usuario</th>
                            <th className="py-4 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Email</th>
                            <th className="py-4 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Rol</th>
                            <th className="py-4 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Última Conexión (Fecha - Hora)</th>
                            <th className="py-4 px-6 text-right text-xs font-bold text-text-secondary uppercase tracking-widest">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface/30">
                        {filteredUsuarios.map(user => (
                            <tr key={user.id} className={`hover:bg-background/50 transition-colors ${user.id === currentUser?.id ? 'bg-primary/5' : ''}`}>
                                <td className="py-4 px-6 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs mr-3 shadow-inner ${user.id === currentUser?.id ? 'bg-primary' : 'bg-gray-600'}`}>
                                            {user.nombre.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="text-sm font-bold text-text-primary">
                                            {user.nombre}
                                            {user.id === currentUser?.id && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Tú</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-6 whitespace-nowrap text-sm text-text-secondary font-medium">{user.email}</td>
                                <td className="py-4 px-6 whitespace-nowrap">
                                    <RoleBadge roleName={roles.find(r => r.id === user.rolId)?.nombre} />
                                </td>
                                <td className="py-4 px-6 whitespace-nowrap">
                                    {user.lastSignInAt ? (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-secondary">
                                                {formatDate(user.lastSignInAt)}
                                            </span>
                                            <span className="text-[10px] text-text-secondary">
                                                {formatRelativeTime(user.lastSignInAt)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-black text-red-600 bg-red-600/10 px-3 py-1 rounded">
                                            NUNCA
                                        </span>
                                    )}
                                </td>
                                <td className="py-4 px-6 whitespace-nowrap text-right space-x-3 text-sm">
                                    {hasPermission('usuarios', 'update') && (
                                        <>
                                            <button 
                                                onClick={() => handleSendResetEmail(user.email)} 
                                                className="p-1.5 rounded-md text-yellow-500 hover:bg-yellow-500/10 transition-colors" 
                                                title="Enviar recuperación"
                                            >
                                                <KeyIcon className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => openModalForEditUser(user)} 
                                                className="text-primary hover:text-indigo-400 font-bold transition-colors"
                                            >
                                                Editar
                                            </button>
                                        </>
                                    )}
                                    {hasPermission('usuarios', 'delete') && (
                                        <button 
                                            onClick={() => handleDeleteUserClick(user)} 
                                            className="text-red-500 hover:text-red-400 font-bold transition-colors"
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsuarios.length === 0 && (
                    <div className="py-12 text-center text-text-secondary italic bg-background/10">
                        No se encontraron usuarios que coincidan con la búsqueda.
                    </div>
                )}
            </div>
            
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={editingUser ? 'Editar Usuario' : 'Agregar Usuario'}>
                 <form onSubmit={handleSubmitUser} className="space-y-4">
                    {editingUser && (
                        <InputField label="ID de Usuario (UUID)" name="id" value={editingUser.id} disabled />
                    )}
                    <InputField label="Nombre Completo" name="nombre" value={values.nombre} onChange={handleInputChange} required />
                    <InputField label="Correo Electrónico" name="email" type="email" value={values.email} onChange={handleInputChange} required />
                    
                    {!editingUser ? (
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary">Contraseña</label>
                            <div className="relative mt-1">
                                <input 
                                    id="password" 
                                    name="password" 
                                    type={showPassword ? "text" : "password"} 
                                    value={values.password} 
                                    onChange={handleInputChange} 
                                    required
                                    className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm pr-10 text-text-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none"
                                >
                                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-background/50 p-4 rounded-lg border border-border/50 shadow-inner">
                            <p className="text-xs text-text-secondary mb-3 leading-relaxed">
                                <span className="font-bold text-yellow-500">Nota:</span> Por seguridad, no se puede ver la contraseña actual. Si el usuario la olvidó, envíe un correo de recuperación.
                            </p>
                            <button 
                                type="button"
                                onClick={() => handleSendResetEmail(values.email)}
                                className="text-xs bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 px-4 py-2 rounded-md flex items-center gap-2 transition-all font-bold"
                            >
                                <KeyIcon className="w-4 h-4" /> Enviar email para nueva contraseña
                            </button>
                        </div>
                    )}

                    <SelectField label="Rol del Usuario" name="rolId" value={values.rolId} onChange={handleInputChange}>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </SelectField>
                    <div className="flex justify-end space-x-2 pt-6 border-t border-border mt-4">
                        <button type="button" onClick={() => setIsUserModalOpen(false)} className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 font-medium transition-colors">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-5 py-2 rounded-lg hover:bg-indigo-700 font-bold transition-all shadow-lg">Guardar Usuario</button>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal
                isOpen={isUserConfirmOpen}
                onClose={() => !isDeleting && setIsUserConfirmOpen(false)}
                onConfirm={handleConfirmUserDelete}
                title="Confirmar Eliminación de Usuario"
                message={<>¿Estás seguro de que quieres eliminar al usuario <strong>{userToDelete?.nombre}</strong>? Esta acción revocará su acceso de inmediato.</>}
                confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
                confirmButtonClassName={isDeleting ? 'bg-red-800 text-gray-300 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}
            />
        </div>
    );
};

export default Usuarios;
