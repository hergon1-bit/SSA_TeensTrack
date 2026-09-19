import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Devocional, EntregaDevocional, Adolescente } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { formatDate } from '../utils/helpers';
import { BookOpenIcon, CheckCircleIcon, TrashIcon, PencilIcon, RefreshIcon, BarChartIcon, TrophyIcon, UsersIcon, CalendarDaysIcon } from '../components/ui/Icons';

type Tab = 'dashboard' | 'registro' | 'gestion' | 'historial';

const Tareas: React.FC = () => {
    const { devocionales, entregasDevocionales, adolescentes, addDevocional, updateDevocional, deleteDevocional, registrarEntregaBulk, deleteEntrega, updateEntrega, fetchData } = useData();
    const { hasPermission } = useAuth();
    
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [dashboardYear, setDashboardYear] = useState<number>(new Date().getFullYear());
    
    // --- State for Tab Gestion (Definitions) ---
    const [isDevocionalModalOpen, setIsDevocionalModalOpen] = useState(false);
    const [editingDevocional, setEditingDevocional] = useState<Devocional | null>(null);
    const [devocionalToDelete, setDevocionalToDelete] = useState<Devocional | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // --- State for Tab Registro (Submissions) ---
    const [selectedAdolescenteId, setSelectedAdolescenteId] = useState<number | string>('');
    const [selectedDevocionalIds, setSelectedDevocionalIds] = useState<Set<string>>(new Set());
    const [fechaEntrega, setFechaEntrega] = useState<string>(new Date().toISOString().split('T')[0]);
    const [observaciones, setObservaciones] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // --- State for Tab Historial (Filters & Table) ---
    const [filterAdo, setFilterAdo] = useState<string>('');
    const [filterDev, setFilterDev] = useState<string>('');
    const [filterDateStart, setFilterDateStart] = useState<string>('');
    const [filterDateEnd, setFilterDateEnd] = useState<string>('');
    
    const [isDeleteEntregaConfirmOpen, setIsDeleteEntregaConfirmOpen] = useState(false);
    const [entregaToDelete, setEntregaToDelete] = useState<EntregaDevocional | null>(null);
    const [isEditEntregaModalOpen, setIsEditEntregaModalOpen] = useState(false);
    const [editingEntrega, setEditingEntrega] = useState<EntregaDevocional | null>(null);
    const [editSubmissionValues, setEditSubmissionValues] = useState({
        adolescenteId: '',
        devocionalId: '',
        fechaEntrega: '',
        observaciones: ''
    });

    // --- State for Tab Dashboard ---
    const [searchDashboard, setSearchDashboard] = useState('');

    const initialFormState: Omit<Devocional, 'id'> = {
        numeroSemana: 0,
        tema: '',
        fechaDistribucion: new Date().toISOString().split('T')[0],
        fechaVencimiento: '',
    };

    const { values, handleInputChange, setValues, resetForm } = useForm(initialFormState);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
    };

    // --- Years Available for Filter ---
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear());
        devocionales.forEach(d => {
            if (d.fechaDistribucion) years.add(new Date(d.fechaDistribucion).getFullYear());
        });
        entregasDevocionales.forEach(e => {
            if (e.fechaEntrega) years.add(new Date(e.fechaEntrega).getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [devocionales, entregasDevocionales]);

    // --- Computed Data for Dashboard ---
    const statsAnuales = useMemo(() => {
        const devsYear = devocionales.filter(d => new Date(d.fechaDistribucion).getFullYear() === dashboardYear);
        const totalDevsMeta = devsYear.length;
        
        const entregasYear = entregasDevocionales.filter(e => new Date(e.fechaEntrega).getFullYear() === dashboardYear);
        
        const ranking = adolescentes
            .filter(a => a.estado === 'Activo')
            .map(ado => {
                const misEntregas = entregasYear.filter(e => String(e.adolescenteId) === String(ado.id));
                const count = misEntregas.length;
                const porcentaje = totalDevsMeta > 0 ? (count / totalDevsMeta) * 100 : 0;
                return {
                    ...ado,
                    count,
                    porcentaje
                };
            })
            .sort((a, b) => b.count - a.count);

        const totalEntregasPosibles = ranking.length * totalDevsMeta;
        const totalEntregasReales = ranking.reduce((acc, curr) => acc + curr.count, 0);
        const cumplimientoGlobal = totalEntregasPosibles > 0 ? (totalEntregasReales / totalEntregasPosibles) * 100 : 0;

        return {
            totalDevsMeta,
            ranking,
            cumplimientoGlobal,
            topLider: ranking[0] && ranking[0].count > 0 ? ranking[0] : null
        };
    }, [devocionales, entregasDevocionales, adolescentes, dashboardYear]);

    const top10Ranking = useMemo(() => {
        return statsAnuales.ranking
            .filter(item => 
                `${item.nombre} ${item.apellido}`.toLowerCase().includes(searchDashboard.toLowerCase())
            )
            .slice(0, 10);
    }, [statsAnuales.ranking, searchDashboard]);

    // --- Handlers for Gestion (Devocionales Definition) ---
    const openModalForCreate = () => {
        setEditingDevocional(null);
        resetForm();
        setValues(prev => ({...prev, numeroSemana: devocionales.length + 1}));
        setIsDevocionalModalOpen(true);
    };

    const openModalForEdit = (d: Devocional) => {
        setEditingDevocional(d);
        setValues(d);
        setIsDevocionalModalOpen(true);
    };

    const handleSubmitDevocional = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...values };
        if (editingDevocional) {
            await updateDevocional({ ...payload, id: editingDevocional.id });
        } else {
            await addDevocional(payload);
        }
        setIsDevocionalModalOpen(false);
    };

    const handleDeleteClick = (d: Devocional) => {
        setDevocionalToDelete(d);
        setIsDeleteConfirmOpen(true);
    }
    
    const handleConfirmDelete = async () => {
        if(devocionalToDelete) {
            await deleteDevocional(devocionalToDelete.id);
            setDevocionalToDelete(null);
            setIsDeleteConfirmOpen(false);
        }
    }

    // --- Handlers for Registro (New Submissions) ---
    const handleToggleDevocional = (id: string) => {
        setSelectedDevocionalIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRegistrarEntrega = async () => {
        if (!selectedAdolescenteId) {
            alert("Seleccione un adolescente");
            return;
        }
        if (selectedDevocionalIds.size === 0) {
            alert("Seleccione al menos un devocional");
            return;
        }

        const entregas: Omit<EntregaDevocional, 'id'>[] = Array.from(selectedDevocionalIds).map((devId: string) => ({
            devocionalId: devId,
            adolescenteId: String(selectedAdolescenteId),
            fechaEntrega: fechaEntrega,
            observaciones: observaciones
        }));

        try {
            await registrarEntregaBulk(entregas);
            setSuccessMessage("¡Entregas registradas con éxito!");
            setSelectedDevocionalIds(new Set());
            setObservaciones('');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            alert("Error al registrar entregas.");
            console.error(error);
        }
    };
    
    // --- Handlers for Historial (Filters, Delete, Edit) ---
    const clearFilters = () => {
        setFilterAdo('');
        setFilterDev('');
        setFilterDateStart('');
        setFilterDateEnd('');
    };

    const handleDeleteEntrega = (entrega: EntregaDevocional) => {
        setEntregaToDelete(entrega);
        setIsDeleteEntregaConfirmOpen(true);
    }

    const handleConfirmDeleteEntrega = async () => {
        if (entregaToDelete) {
            await deleteEntrega(entregaToDelete.id);
            setIsDeleteEntregaConfirmOpen(false);
            setEntregaToDelete(null);
        }
    }

    const handleEditEntrega = (entrega: EntregaDevocional) => {
        setEditingEntrega(entrega);
        setEditSubmissionValues({
            adolescenteId: String(entrega.adolescenteId),
            devocionalId: String(entrega.devocionalId),
            fechaEntrega: entrega.fechaEntrega,
            observaciones: entrega.observaciones || ''
        });
        setIsEditEntregaModalOpen(true);
    }

    const handleSaveEditedEntrega = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingEntrega) {
            const updated: EntregaDevocional = {
                id: editingEntrega.id,
                adolescenteId: editSubmissionValues.adolescenteId,
                devocionalId: editSubmissionValues.devocionalId,
                fechaEntrega: editSubmissionValues.fechaEntrega,
                observaciones: editSubmissionValues.observaciones
            };
            await updateEntrega(updated);
            setIsEditEntregaModalOpen(false);
            setEditingEntrega(null);
        }
    }

    // --- Computed Data Sorting ---
    const sortedDevocionales = useMemo(() => 
        [...devocionales].sort((a,b) => b.numeroSemana - a.numeroSemana), 
    [devocionales]);
    
    const filteredEntregas = useMemo(() => {
        return entregasDevocionales
            .filter(ent => {
                const matchAdo = filterAdo === '' || ent.adolescenteId === filterAdo;
                const matchDev = filterDev === '' || ent.devocionalId === filterDev;
                
                let matchDate = true;
                if (filterDateStart) {
                    matchDate = matchDate && new Date(ent.fechaEntrega) >= new Date(filterDateStart);
                }
                if (filterDateEnd) {
                    matchDate = matchDate && new Date(ent.fechaEntrega) <= new Date(filterDateEnd);
                }
                
                return matchAdo && matchDev && matchDate;
            })
            .sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
    }, [entregasDevocionales, filterAdo, filterDev, filterDateStart, filterDateEnd]);

    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <BookOpenIcon className="w-8 h-8 text-primary" />
                    Devocionales
                </h1>
                <button 
                    onClick={handleRefresh} 
                    disabled={isRefreshing}
                    className="p-2 text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
                >
                    <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex border-b border-border overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Dashboard Anual
                </button>
                {(hasPermission('entregas_devocionales', 'create') || hasPermission('entregas_devocionales', 'read')) && (
                    <button 
                        onClick={() => setActiveTab('registro')} 
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'registro' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Registrar Entregas
                    </button>
                )}
                {(hasPermission('devocionales', 'read') || hasPermission('devocionales', 'update')) && (
                    <button 
                        onClick={() => setActiveTab('gestion')} 
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'gestion' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Definir Temas
                    </button>
                )}
                {hasPermission('entregas_devocionales', 'read') && (
                    <button 
                        onClick={() => setActiveTab('historial')} 
                        className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'historial' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Historial Completo
                    </button>
                )}
            </div>

            {/* TAB: DASHBOARD ANUAL */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Filtro de Año y Búsqueda */}
                    <div className="flex flex-col md:flex-row gap-4 items-center bg-surface p-4 rounded-xl border border-border">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <CalendarDaysIcon className="w-5 h-5 text-primary" />
                            <label className="text-sm font-bold text-text-secondary whitespace-nowrap">Año del Dashboard:</label>
                            <select 
                                value={dashboardYear}
                                onChange={(e) => setDashboardYear(Number(e.target.value))}
                                className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 w-full relative">
                            <input 
                                type="text" 
                                placeholder="Buscar en el ranking..." 
                                value={searchDashboard}
                                onChange={(e) => setSearchDashboard(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg pl-4 pr-4 py-2 focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* Tarjetas de Resumen */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-surface p-6 rounded-xl border border-border shadow-lg flex items-center gap-4">
                            <div className="p-3 bg-primary/20 rounded-lg text-primary">
                                <BookOpenIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Meta Año {dashboardYear}</p>
                                <p className="text-2xl font-bold">{statsAnuales.totalDevsMeta} Temas</p>
                            </div>
                        </div>
                        <div className="bg-surface p-6 rounded-xl border border-border shadow-lg flex items-center gap-4">
                            <div className="p-3 bg-secondary/20 rounded-lg text-secondary">
                                <BarChartIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Cumplimiento Global</p>
                                <p className="text-2xl font-bold">{statsAnuales.cumplimientoGlobal.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="bg-surface p-6 rounded-xl border border-border shadow-lg flex items-center gap-4">
                            <div className="p-3 bg-yellow-500/20 rounded-lg text-yellow-500">
                                <TrophyIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Líder {dashboardYear}</p>
                                <p className="text-2xl font-bold truncate">
                                    {statsAnuales.topLider ? `${statsAnuales.topLider.nombre}` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-xl border border-border shadow-lg space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
                                <TrophyIcon className="w-6 h-6" />
                                TOP 10 - Ranking de Entregas {dashboardYear}
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="text-left text-xs font-bold text-text-secondary uppercase tracking-widest border-b border-border">
                                        <th className="pb-4 px-2">Pos</th>
                                        <th className="pb-4 px-2">Adolescente</th>
                                        <th className="pb-4 px-2">Progreso</th>
                                        <th className="pb-4 px-2 text-center">Entregas</th>
                                        <th className="pb-4 px-2 text-right">% Éxito</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {top10Ranking.map((item, index) => {
                                        return (
                                            <tr key={item.id} className="hover:bg-background/50 transition-colors group">
                                                <td className="py-4 px-2">
                                                    {index === 0 ? <span className="text-xl">🥇</span> : 
                                                     index === 1 ? <span className="text-xl">🥈</span> :
                                                     index === 2 ? <span className="text-xl">🥉</span> :
                                                     <span className="text-sm font-bold text-text-secondary">{index + 1}</span>}
                                                </td>
                                                <td className="py-4 px-2">
                                                    <p className="font-bold text-text-primary group-hover:text-primary transition-colors">{item.nombre} {item.apellido}</p>
                                                    <p className="text-[10px] text-text-secondary font-mono">{item.cedula}</p>
                                                </td>
                                                <td className="py-4 px-2 min-w-[150px] md:min-w-[300px]">
                                                    <div className="w-full bg-background rounded-full h-3 border border-border overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${
                                                                item.porcentaje >= 80 ? 'bg-secondary' : 
                                                                item.porcentaje >= 50 ? 'bg-primary' : 
                                                                'bg-red-500/60'
                                                            }`}
                                                            style={{ width: `${item.porcentaje}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-2 text-center font-bold text-lg">
                                                    {item.count} <span className="text-xs text-text-secondary">/ {statsAnuales.totalDevsMeta}</span>
                                                </td>
                                                <td className="py-4 px-2 text-right">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                                        item.porcentaje >= 80 ? 'bg-secondary/20 text-secondary border border-secondary/30' : 
                                                        item.porcentaje >= 50 ? 'bg-primary/20 text-primary border border-primary/30' : 
                                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                        {item.porcentaje.toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {top10Ranking.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-text-secondary italic">
                                                {statsAnuales.ranking.length === 0 
                                                    ? `No hay entregas registradas en el año ${dashboardYear}.` 
                                                    : `No se encontraron resultados para "${searchDashboard}" dentro del TOP 10.`}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: REGISTRO DE ENTREGAS */}
            {activeTab === 'registro' && (
                <div className="bg-surface p-6 rounded-lg shadow-lg animate-fade-in border border-border">
                    {successMessage && (
                        <div className="mb-4 bg-green-500/20 text-green-300 p-3 rounded flex items-center gap-2 border border-green-500/30">
                            <CheckCircleIcon className="w-5 h-5"/> {successMessage}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-lg font-semibold mb-6 text-text-primary border-b border-border pb-2">1. Datos de la Entrega</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Adolescente</label>
                                    <select 
                                        value={selectedAdolescenteId} 
                                        onChange={(e) => setSelectedAdolescenteId(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md p-2 outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {adolescentes.filter(a => a.estado === 'Activo').map(a => (
                                            <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Fecha de Devolución</label>
                                    <input 
                                        type="date" 
                                        value={fechaEntrega} 
                                        onChange={(e) => setFechaEntrega(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md p-2 outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Observaciones (Opcional)</label>
                                    <textarea 
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md p-2 outline-none focus:ring-2 focus:ring-primary"
                                        rows={3}
                                        placeholder="Ej: Entregó fuera de fecha..."
                                    />
                                </div>
                                {hasPermission('entregas_devocionales', 'create') ? (
                                    <button 
                                        onClick={handleRegistrarEntrega}
                                        className="w-full bg-primary text-white py-3 rounded-lg hover:bg-indigo-700 transition font-bold shadow-lg"
                                    >
                                        Guardar Entrega
                                    </button>
                                ) : (
                                    <p className="text-xs text-red-400 italic text-center">No tienes permiso para registrar entregas.</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold mb-6 text-text-primary border-b border-border pb-2">2. Seleccionar Temas Entregados</h2>
                            <div className="bg-background rounded-lg border border-border overflow-hidden h-[400px] overflow-y-auto custom-scrollbar">
                                {sortedDevocionales.length === 0 ? (
                                    <p className="p-4 text-text-secondary text-center">No hay devocionales definidos.</p>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {sortedDevocionales.map(dev => {
                                            const isSelected = selectedDevocionalIds.has(dev.id);
                                            const alreadySubmitted = selectedAdolescenteId ? entregasDevocionales.some(e => e.devocionalId === dev.id && e.adolescenteId === selectedAdolescenteId) : false;

                                            return (
                                                <div 
                                                    key={dev.id} 
                                                    onClick={() => !alreadySubmitted && hasPermission('entregas_devocionales', 'create') && handleToggleDevocional(dev.id)}
                                                    className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-surface transition ${isSelected ? 'bg-primary/10' : ''} ${alreadySubmitted ? 'opacity-50 cursor-not-allowed bg-green-500/5' : ''}`}
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        disabled={alreadySubmitted || !hasPermission('entregas_devocionales', 'create')}
                                                        onChange={() => {}} 
                                                        className="mt-1 h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-text-primary">Semana {dev.numeroSemana}: {dev.tema}</p>
                                                        <p className="text-[10px] text-text-secondary uppercase tracking-widest">Meta: {formatDate(dev.fechaVencimiento)}</p>
                                                        {alreadySubmitted && <span className="text-[10px] bg-secondary/20 text-secondary px-1.5 py-0.5 rounded font-bold">✅ YA ENTREGADO</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: GESTION DE DEVOCIONALES */}
            {activeTab === 'gestion' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        {hasPermission('devocionales', 'create') && (
                            <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-md font-bold">
                                + Definir Nuevo Tema
                            </button>
                        )}
                    </div>
                    <div className="bg-surface shadow-lg rounded-lg overflow-x-auto border border-border">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-background">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Semana</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Tema / Título</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Distribución</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Vencimiento</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-text-secondary uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedDevocionales.map(dev => (
                                    <tr key={dev.id} className="hover:bg-background/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-primary">S{dev.numeroSemana.toString().padStart(2, '0')}</td>
                                        <td className="px-6 py-4 font-bold">{dev.tema}</td>
                                        <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(dev.fechaDistribucion)}</td>
                                        <td className="px-6 py-4 text-sm text-text-secondary">{formatDate(dev.fechaVencimiento)}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {hasPermission('devocionales', 'update') && (
                                                <button onClick={() => openModalForEdit(dev)} className="text-primary hover:text-indigo-300 p-1"><PencilIcon className="w-5 h-5"/></button>
                                            )}
                                            {hasPermission('devocionales', 'delete') && (
                                                <button onClick={() => handleDeleteClick(dev)} className="text-red-500 hover:text-red-300 p-1"><TrashIcon className="w-5 h-5"/></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: HISTORIAL */}
            {activeTab === 'historial' && (
                <div className="space-y-4 animate-fade-in">
                    {/* Barra de Filtros */}
                    <div className="bg-surface p-4 rounded-lg shadow-lg border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Adolescente</label>
                            <select 
                                value={filterAdo} 
                                onChange={(e) => setFilterAdo(e.target.value)}
                                className="w-full bg-background border border-border rounded-md p-2 text-sm outline-none"
                            >
                                <option value="">Todos</option>
                                {adolescentes.map(a => (
                                    <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Tema</label>
                            <select 
                                value={filterDev} 
                                onChange={(e) => setFilterDev(e.target.value)}
                                className="w-full bg-background border border-border rounded-md p-2 text-sm outline-none"
                            >
                                <option value="">Todos</option>
                                {sortedDevocionales.map(d => (
                                    <option key={d.id} value={d.id}>S{d.numeroSemana}: {d.tema}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Desde</label>
                            <input 
                                type="date" 
                                value={filterDateStart}
                                onChange={(e) => setFilterDateStart(e.target.value)}
                                className="w-full bg-background border border-border rounded-md p-2 text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Hasta</label>
                            <input 
                                type="date" 
                                value={filterDateEnd}
                                onChange={(e) => setFilterDateEnd(e.target.value)}
                                className="w-full bg-background border border-border rounded-md p-2 text-sm outline-none"
                            />
                        </div>
                        <div>
                            <button 
                                onClick={clearFilters}
                                className="w-full bg-gray-700 text-text-primary hover:bg-gray-600 p-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors border border-border"
                            >
                                <RefreshIcon className="w-4 h-4"/> Limpiar
                            </button>
                        </div>
                    </div>

                    <div className="bg-surface shadow-lg rounded-lg overflow-x-auto border border-border">
                         <table className="min-w-full divide-y divide-border">
                                <thead className="bg-background">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Fecha Entrega</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Adolescente</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Semana / Tema</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Observación</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-text-secondary uppercase tracking-widest">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredEntregas.map(ent => {
                                        const ado = adolescentes.find(a => String(a.id) === String(ent.adolescenteId));
                                        const dev = devocionales.find(d => String(d.id) === String(ent.devocionalId));
                                        return (
                                            <tr key={ent.id} className="hover:bg-background/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(ent.fechaEntrega)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-bold text-text-primary">{ado ? `${ado.nombre} ${ado.apellido}` : 'Desconocido'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{dev ? `Sem ${dev.numeroSemana}: ${dev.tema}` : 'Borrado'}</td>
                                                <td className="px-6 py-4 text-sm text-text-secondary italic">{ent.observaciones || '-'}</td>
                                                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                    {hasPermission('entregas_devocionales', 'update') && (
                                                        <button onClick={() => handleEditEntrega(ent)} className="text-primary hover:text-indigo-400 p-1" title="Editar registro">
                                                            <PencilIcon className="w-5 h-5 inline" />
                                                        </button>
                                                    )}
                                                    {hasPermission('entregas_devocionales', 'delete') && (
                                                        <button onClick={() => handleDeleteEntrega(ent)} className="text-red-500 hover:text-red-400 p-1" title="Eliminar registro">
                                                            <TrashIcon className="w-5 h-5 inline" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                    </div>
                </div>
            )}

            {/* MODALS */}
            <Modal isOpen={isDevocionalModalOpen} onClose={() => setIsDevocionalModalOpen(false)} title={editingDevocional ? "Editar Tema" : "Nuevo Tema"}>
                <form onSubmit={handleSubmitDevocional} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">Número de Semana</label>
                        <input type="number" name="numeroSemana" value={values.numeroSemana} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">Tema / Título</label>
                        <input type="text" name="tema" value={values.tema} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Fecha Distribución</label>
                            <input type="date" name="fechaDistribucion" value={values.fechaDistribucion} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Fecha Vencimiento</label>
                            <input type="date" name="fechaVencimiento" value={values.fechaVencimiento} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={() => setIsDevocionalModalOpen(false)} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Guardar</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isEditEntregaModalOpen} onClose={() => setIsEditEntregaModalOpen(false)} title="Editar Entrega">
                <form onSubmit={handleSaveEditedEntrega} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">Adolescente</label>
                        <select 
                            value={editSubmissionValues.adolescenteId} 
                            onChange={(e) => setEditSubmissionValues({...editSubmissionValues, adolescenteId: e.target.value})}
                            className="w-full bg-background border border-border rounded-md p-2 outline-none focus:ring-2 focus:ring-primary"
                        >
                            {adolescentes.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">Tema</label>
                        <select 
                            value={editSubmissionValues.devocionalId} 
                            onChange={(e) => setEditSubmissionValues({...editSubmissionValues, devocionalId: e.target.value})}
                            className="w-full bg-background border border-border rounded-md p-2 outline-none focus:ring-2 focus:ring-primary"
                        >
                            {devocionales.map(d => <option key={d.id} value={d.id}>S{d.numeroSemana}: {d.tema}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">Fecha Entrega</label>
                        <input 
                            type="date" 
                            value={editSubmissionValues.fechaEntrega} 
                            onChange={(e) => setEditSubmissionValues({...editSubmissionValues, fechaEntrega: e.target.value})}
                            className="w-full bg-background border border-border rounded-md p-2 outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">Observaciones</label>
                        <textarea 
                            value={editSubmissionValues.observaciones}
                            onChange={(e) => setEditSubmissionValues({...editSubmissionValues, observaciones: e.target.value})}
                            className="w-full bg-background border border-border rounded-md p-2 outline-none focus:ring-2 focus:ring-primary"
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={() => setIsEditEntregaModalOpen(false)} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Guardar Cambios</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Devocional"
                message={<>¿Estás seguro de que quieres eliminar el devocional <strong>{devocionalToDelete?.tema}</strong>? Se eliminarán también todas las entregas asociadas.</>}
            />

            <ConfirmationModal
                isOpen={isDeleteEntregaConfirmOpen}
                onClose={() => setIsDeleteEntregaConfirmOpen(false)}
                onConfirm={handleConfirmDeleteEntrega}
                title="Eliminar Registro de Entrega"
                message="¿Estás seguro de que quieres eliminar este registro de entrega?"
            />
        </div>
    );
};

export default Tareas;