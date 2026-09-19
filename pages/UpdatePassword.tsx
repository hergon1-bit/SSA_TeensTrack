import React, { useState } from 'react';
import { api } from '../services/api';
import { Page } from '../types';
import { EyeIcon, EyeOffIcon } from '../components/ui/Icons';

interface UpdatePasswordProps {
    navigateTo: (page: Page) => void;
}

const UpdatePassword: React.FC<UpdatePasswordProps> = ({ navigateTo }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            await api.updateCurrentUserPassword(password);
            setMessage('Contraseña actualizada exitosamente. Redirigiendo al Dashboard...');
            setTimeout(() => {
                navigateTo('dashboard');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al actualizar contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="bg-surface p-8 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">Restablecer Contraseña</h2>
                
                {message && <div className="bg-green-500/20 text-green-300 p-3 rounded mb-4 text-sm">{message}</div>}
                {error && <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Nueva Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-primary focus:border-primary text-text-primary pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none"
                            >
                                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;