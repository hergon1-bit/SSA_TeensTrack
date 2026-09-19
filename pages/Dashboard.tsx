
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { calcularEdad, formatDate, calcularProximoCumpleanos, formatCurrency, formatRelativeTime } from '../utils/helpers';
import { UsersIcon, ClipboardListIcon, CalendarDaysIcon, HeartHandshakeIcon, CheckCircleIcon, RefreshIcon, UserCheckIcon, TrophyIcon, KeyIcon, BookOpenIcon } from '../components/ui/Icons';
import { Page } from '../types';


interface DashboardProps {
  navigateTo: (page: Page, params?: { reunionId: string }) => void;
}


const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string; onClick?: () => void }> = ({ icon, title, value, color, onClick }) => (
    <div 
        className={`bg-surface p-6 rounded-lg shadow-lg flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:bg-gray-700 transition-colors' : ''}`}
        onClick={onClick}
    >
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-text-secondary">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
    const { adolescentes, reuniones, encargados, tutores, eventos, celebraciones, asistencias, usuarios, roles, devocionales, entregasDevocionales, addCelebracionCumpleanos, fetchData } = useData();
    const { user, rol, hasPermission } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadFreshData = async () => {
            setIsLoading(true);
            await fetchData();
            setIsLoading(false);
        };
        loadFreshData();
    }, [fetchData]);

    const handleRefresh = async () => {
        setIsLoading(true);
        await fetchData();
        setIsLoading(false);
    };
    
    const stats = useMemo(() => {
        const adolescentesActivosData = adolescentes.filter(a => a.estado?.toLowerCase() === 'activo');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        const eventosProximos = eventos.filter(evento => {
            if (!evento.fechaInicio) return false;
            try {
                const d = new Date(evento.fechaInicio);
                return d >= today && d < sevenDaysLater;
            } catch { return false; }
        }).length;

        return {
            adolescentesActivos: adolescentesActivosData.length,
            reunionesTotales: reuniones.length,
            encargados: encargados.length,
            tutores: tutores.length,
            eventosProximos,
            adolescentesActivosData,
        };
    }, [adolescentes, reuniones, encargados, tutores, eventos]);
    
    const topDevocionales = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const entregasEsteAno = entregasDevocionales.filter(e => 
            new Date(e.fechaEntrega).getFullYear() === currentYear
        );

        const conteo: { [key: string]: number } = {};
        entregasEsteAno.forEach(e => {
            conteo[e.adolescenteId] = (conteo[e.adolescenteId] || 0) + 1;
        });

        const metaTotal = devocionales.filter(d => new Date(d.fechaDistribucion).getFullYear() === currentYear).length || 1;

        return Object.entries(conteo)
            .map(([id, count]) => {
                const ado = adolescentes.find(a => a.id === id);
                return { 
                    ado, 
                    count, 
                    percentage: (count / metaTotal) * 100 
                };
            })
            .filter(item => item.ado && item.ado.estado === 'Activo')
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [entregasDevocionales, devocionales, adolescentes]);

    const topAsistentes = useMemo(() => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const reunionesUltimos6Meses = reuniones.filter(r => new Date(r.fecha) >= sixMonthsAgo);
        const reunionesIds = new Set(reunionesUltimos6Meses.map(r => String(r.id)));
        const totalReuniones = reunionesUltimos6Meses.length;
        const conteo: { [key: string]: number } = {};
        asistencias.forEach(a => {
            if (reunionesIds.has(String(a.reunionId)) && a.estado === 'Presente') {
                conteo[String(a.adolescenteId)] = (conteo[String(a.adolescenteId)] || 0) + 1;
            }
        });
        return Object.entries(conteo)
            .map(([id, count]) => {
                const ado = adolescentes.find(a => String(a.id) === String(id));
                return { ado, count, percentage: totalReuniones > 0 ? (count / totalReuniones) * 100 : 0 };
            })
            .filter(item => item.ado && item.ado.estado === 'Activo')
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [reuniones, asistencias, adolescentes]);


    const proximosCumpleaneros = useMemo(() => {
        const hoy = new Date();
        const currentYear = hoy.getFullYear();
        const currentMonth = hoy.getMonth();
        const finalAdolescentes = stats.adolescentesActivosData.filter(a => {
            if (!a.fechaNacimiento) return false;
            const nextBday = calcularProximoCumpleanos(a.fechaNacimiento);
            return nextBday.getMonth() === currentMonth;
        }).filter(a => !celebraciones.some(c => c.adolescenteId === a.id && c.ano === currentYear));
        return finalAdolescentes.sort((a, b) => calcularProximoCumpleanos(a.fechaNacimiento).getDate() - calcularProximoCumpleanos(b.fechaNacimiento).getDate());
    }, [stats.adolescentesActivosData, celebraciones]);

    const isAdmin = useMemo(() => rol?.id === '1' || rol?.nombre?.toLowerCase().includes('administrador'), [rol]);

    if (isLoading && reuniones.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center">
                 <div className="flex flex-col items-center gap-4">
                    <RefreshIcon className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-text-secondary">Sincronizando con base de datos...</p>
                 </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
                <button onClick={handleRefresh} disabled={isLoading} className="p-2 rounded-full text-text-secondary hover:bg-surface transition-colors">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <StatCard icon={<UsersIcon className="text-white"/>} title="Adolescentes Activos" value={stats.adolescentesActivos} color="bg-blue-500" onClick={() => navigateTo('adolescentes')}/>
                <StatCard icon={<ClipboardListIcon className="text-white"/>} title="Reuniones Totales" value={stats.reunionesTotales} color="bg-green-500" onClick={() => navigateTo('reuniones')}/>
                <StatCard icon={<CalendarDaysIcon className="text-white"/>} title="Eventos Próximos" value={stats.eventosProximos} color="bg-orange-500" onClick={() => navigateTo('eventos')}/>
                <StatCard icon={<UserCheckIcon className="text-white"/>} title="Encargados" value={stats.encargados} color="bg-purple-500" onClick={() => navigateTo('encargados')}/>
                <StatCard icon={<HeartHandshakeIcon className="text-white"/>} title="Tutores" value={stats.tutores} color="bg-yellow-500" onClick={() => navigateTo('tutores')}/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna Izquierda: Reuniones y Líderes Devocionales */}
                <div className="space-y-8">
                    {/* Top 5 Devocionales (NUEVO) */}
                    <div className="bg-surface p-6 rounded-lg shadow-lg border border-secondary/20">
                        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <TrophyIcon className="w-5 h-5 text-secondary"/>
                            Top 5 Líderes en Devocionales (Año Actual)
                        </h2>
                        <div className="space-y-4">
                            {topDevocionales.length > 0 ? topDevocionales.map((item, index) => (
                                <div key={item.ado!.id} className="bg-background/50 p-3 rounded-md flex items-center gap-4">
                                    <span className={`text-xl font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-orange-400'}`}>
                                        {index + 1}°
                                    </span>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-end mb-1">
                                            <p className="font-bold text-text-primary">{item.ado!.nombre} {item.ado!.apellido}</p>
                                            <p className="text-xs font-bold text-secondary">{item.count} Entregas</p>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-secondary h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(item.percentage, 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-text-secondary italic text-sm text-center py-4">No se han registrado entregas este año.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <ClipboardListIcon className="w-5 h-5 text-primary"/> 
                            Próximas Reuniones
                        </h2>
                        <div className="space-y-4">
                            {reuniones.filter(r => r.estado === 'En Proceso').slice(0, 3).map(reunion => (
                                <div key={reunion.id} className="bg-background p-4 rounded-md flex justify-between items-center border-l-4 border-primary">
                                    <div>
                                        <p className="font-bold text-primary">{reunion.tema}</p>
                                        <p className="text-sm text-text-secondary">{formatDate(reunion.fecha)}</p>
                                    </div>
                                    {hasPermission('asistencias', 'create') && (
                                        <button onClick={() => navigateTo('asistencia', { reunionId: reunion.id })} className="bg-primary text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700 transition">Asistencia</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Cumpleaños y Top Asistencia */}
                <div className="space-y-8">
                    <div className="bg-surface p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <TrophyIcon className="w-5 h-5 text-yellow-400"/>
                            Top 10 Asistencia (6 Meses)
                        </h2>
                        <div className="space-y-3">
                            {topAsistentes.map((item, index) => (
                                <div key={item.ado!.id} className="flex items-center gap-3">
                                    <span className="w-6 text-center font-bold text-text-secondary">{index + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-sm font-semibold text-text-primary">{item.ado!.nombre} {item.ado!.apellido}</p>
                                            <p className="text-xs text-primary">{item.count} Asist.</p>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-lg shadow-lg h-fit">
                        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <span className="text-yellow-500">🎂</span> Cumpleaños del Mes
                        </h2>
                        <div className="space-y-3">
                            {proximosCumpleaneros.map(persona => (
                                <div key={persona.id} className="bg-background p-3 rounded-md flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <img src={`https://ui-avatars.com/api/?name=${persona.nombre}+${persona.apellido}&background=random`} alt="avatar" className="w-10 h-10 rounded-full" />
                                        <div>
                                            <p className="font-semibold text-text-primary">{persona.nombre} {persona.apellido}</p>
                                            <p className="text-sm text-text-secondary">{formatDate(persona.fechaNacimiento)}</p>
                                        </div>
                                    </div>
                                    {hasPermission('celebraciones_cumpleanos', 'create') && (
                                        <button onClick={() => addCelebracionCumpleanos(persona.id, new Date().getFullYear())} className="p-1.5 rounded-full text-gray-400 hover:text-green-400 transition-all"><CheckCircleIcon className="w-6 h-6" /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
