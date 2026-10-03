
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, calcularEdad } from '../utils/helpers';
import { Adolescente } from '../types';
import { RefreshIcon, PrinterIcon, UsersIcon, CalendarDaysIcon, ClipboardListIcon, DocumentDownloadIcon } from '../components/ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'cumpleanos' | 'asistenciaReunion' | 'ausencias' | 'activos' | 'adolescentesTutores' | 'tutores' | 'documentos' | 'asistenciaTeensPro' | 'primeraVez';
type DocumentFilter = 'Todos' | 'Ficha Pendiente' | 'Ficha Entregada' | 'Autorización Pendiente' | 'Autorización Entregada' | 'Todo Entregado' | 'Todo Pendiente';

const Reportes: React.FC = () => {
    const { 
        adolescentes, reuniones, asistencias, encargados, tutores, tutoresAdolescentes, fetchData 
    } = useData();
    const [activeReport, setActiveReport] = useState<ReportType>('cumpleanos');
    const [selectedReunionId, setSelectedReunionId] = useState<string | null>(null);
    const [docFilter, setDocFilter] = useState<DocumentFilter>('Todos');
    const [filterTeensProAtLeastOne, setFilterTeensProAtLeastOne] = useState(false);
    const [filter15OrOlder, setFilter15OrOlder] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filtros para reporte de Primera Vez
    const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        const loadFreshData = async () => {
            setIsRefreshing(true);
            await fetchData();
            setIsRefreshing(false);
        };
        loadFreshData();
    }, [fetchData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
    }

    const getBirthdayThisYear = (birthDate: string) => {
        if (!birthDate) return 'N/A';
        // Asumimos formato ISO o similar de la DB
        const parts = birthDate.split('T')[0].split('-');
        if (parts.length !== 3) return 'N/A';
        const day = parts[2];
        const month = parts[1];
        const year = new Date().getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getUltimaAsistencia = (adolescenteId: string | number) => {
        const asistenciasAdolescente = asistencias.filter(a => String(a.adolescenteId) === String(adolescenteId) && a.estado === 'Presente');
        if (asistenciasAdolescente.length === 0) return '-';
        
        const reunionIds = asistenciasAdolescente.map(a => String(a.reunionId));
        const reunionesAsistidas = reuniones.filter(r => reunionIds.includes(String(r.id)) && r.fecha);
        
        if (reunionesAsistidas.length === 0) return '-';
        
        const sortedReuniones = reunionesAsistidas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        return formatDate(sortedReuniones[0].fecha);
    };

    const reportData = useMemo(() => {
        switch (activeReport) {
            case 'cumpleanos':
                const currentMonth = new Date().getMonth();
                return adolescentes
                    .filter(a => a.estado === 'Activo' && a.fechaNacimiento && new Date(a.fechaNacimiento).getMonth() === currentMonth)
                    .sort((a, b) => new Date(a.fechaNacimiento).getDate() - new Date(b.fechaNacimiento).getDate());

            case 'activos':
                let listActivos = adolescentes.filter(a => a.estado === 'Activo');
                if (filterTeensProAtLeastOne) {
                    const teensProReusIds = reuniones.filter(r => r.esTeensPro).map(r => String(r.id));
                    listActivos = listActivos.filter(a => {
                        return asistencias.some(asis => 
                            teensProReusIds.includes(String(asis.reunionId)) && 
                            String(asis.adolescenteId) === String(a.id) && 
                            asis.estado === 'Presente'
                        );
                    });
                }
                return listActivos.sort((a,b) => a.nombre.localeCompare(b.nombre));

            case 'ausencias':
                // Adolescentes con más de 3 ausencias en las últimas 5 reuniones
                const ultimas5 = reuniones.slice(0, 5).map(r => String(r.id));
                return adolescentes.filter(a => {
                    if (a.estado !== 'Activo') return false;
                    const ausencias = asistencias.filter(asis => ultimas5.includes(String(asis.reunionId)) && String(asis.adolescenteId) === String(a.id) && asis.estado === 'Ausente');
                    return ausencias.length >= 3;
                });

            case 'asistenciaReunion':
                if (!selectedReunionId) return [];
                const presentes = asistencias
                    .filter(a => String(a.reunionId) === String(selectedReunionId) && a.estado === 'Presente')
                    .map(a => adolescentes.find(ado => String(ado.id) === String(a.adolescenteId)))
                    .filter(Boolean) as Adolescente[];
                return presentes.sort((a, b) => {
                    const nameA = `${a.nombre} ${a.apellido}`.toLowerCase();
                    const nameB = `${b.nombre} ${b.apellido}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });

            case 'adolescentesTutores':
                let filteredAdoTutores = adolescentes;
                if (filterTeensProAtLeastOne) {
                    const teensProReusIds = reuniones.filter(r => r.esTeensPro).map(r => String(r.id));
                    filteredAdoTutores = filteredAdoTutores.filter(ado => {
                        return asistencias.some(asis => 
                            teensProReusIds.includes(String(asis.reunionId)) && 
                            String(asis.adolescenteId) === String(ado.id) && 
                            asis.estado === 'Presente'
                        );
                    });
                }
                return filteredAdoTutores.map(ado => {
                    const adoTutoresIds = tutoresAdolescentes.filter(ta => String(ta.adolescenteId) === String(ado.id)).map(ta => String(ta.tutorId));
                    const adoTutores = tutores.filter(t => adoTutoresIds.includes(String(t.id)));
                    return { ...ado, tutores: adoTutores };
                }).sort((a, b) => a.nombre.localeCompare(b.nombre));

            case 'tutores':
                return tutores.sort((a, b) => a.nombre.localeCompare(b.nombre));

            case 'documentos':
                let filteredDocs = adolescentes.filter(a => a.estado === 'Activo');
                if (docFilter === 'Ficha Pendiente') {
                    filteredDocs = filteredDocs.filter(a => !a.fichaInscripcion && a.autorizacion);
                } else if (docFilter === 'Ficha Entregada') {
                    filteredDocs = filteredDocs.filter(a => a.fichaInscripcion && !a.autorizacion);
                } else if (docFilter === 'Autorización Pendiente') {
                    filteredDocs = filteredDocs.filter(a => a.fichaInscripcion && !a.autorizacion);
                } else if (docFilter === 'Autorización Entregada') {
                    filteredDocs = filteredDocs.filter(a => !a.fichaInscripcion && a.autorizacion);
                } else if (docFilter === 'Todo Entregado') {
                    filteredDocs = filteredDocs.filter(a => a.fichaInscripcion && a.autorizacion);
                } else if (docFilter === 'Todo Pendiente') {
                    filteredDocs = filteredDocs.filter(a => !a.fichaInscripcion && !a.autorizacion);
                }
                return filteredDocs.sort((a, b) => {
                    const aMissing = (!a.fichaInscripcion || !a.autorizacion) ? 1 : 0;
                    const bMissing = (!b.fichaInscripcion || !b.autorizacion) ? 1 : 0;
                    if (aMissing !== bMissing) return bMissing - aMissing;
                    return a.nombre.localeCompare(b.nombre);
                });

            case 'asistenciaTeensPro':
                let activeTeensForPro = adolescentes.filter(a => a.estado === 'Activo').sort((a, b) => a.nombre.localeCompare(b.nombre));
                
                if (filter15OrOlder) {
                    activeTeensForPro = activeTeensForPro.filter(a => calcularEdad(a.fechaNacimiento) >= 15);
                }

                if (filterTeensProAtLeastOne) {
                    const teensProReusIds = reuniones.filter(r => r.esTeensPro).map(r => String(r.id));
                    activeTeensForPro = activeTeensForPro.filter(a => {
                        return asistencias.some(asis => teensProReusIds.includes(String(asis.reunionId)) && String(asis.adolescenteId) === String(a.id) && asis.estado === 'Presente');
                    });
                }
                return activeTeensForPro;

            case 'primeraVez':
                // Crear un mapa de ID de reunión a objeto reunión
                const reunionesMap = new Map(reuniones.map(r => [String(r.id), r]));

                // Filtrar adolescentes que vinieron por primera vez en el mes/año seleccionado
                const primeraVezAdoIds = new Set<string>();

                asistencias.forEach(asis => {
                    if (asis.estado !== 'Presente') return;
                    const r = reunionesMap.get(String(asis.reunionId));
                    if (!r || !r.fecha) return;

                    const [yStr, mStr] = r.fecha.split('-');
                    const rYear = parseInt(yStr, 10);
                    const rMonth = parseInt(mStr, 10);

                    if (rYear === filterYear && rMonth === filterMonth) {
                        // Verifica si tiene la marca de 'Primera Vez'
                        if (asis.detalle === 'Primera Vez') {
                            primeraVezAdoIds.add(String(asis.adolescenteId));
                        }
                    }
                });

                return adolescentes
                    .filter(a => primeraVezAdoIds.has(String(a.id)))
                    .sort((a, b) => a.nombre.localeCompare(b.nombre));

            default: return [];
        }
    }, [activeReport, adolescentes, reuniones, asistencias, selectedReunionId, tutores, tutoresAdolescentes, docFilter, filterTeensProAtLeastOne, filter15OrOlder, filterMonth, filterYear]);

    const handlePrint = () => {
        const doc = new jsPDF();
        const title = activeReport === 'cumpleanos' ? 'CUMPLEAÑOS DEL MES' :
                      activeReport === 'asistenciaReunion' ? 'ASISTENCIA POR REUNIÓN' :
                      activeReport === 'ausencias' ? 'ALERTA DE AUSENCIAS' : 
                      activeReport === 'adolescentesTutores' ? 'ADOLESCENTES Y SUS TUTORES' :
                      activeReport === 'tutores' ? 'LISTADO DE TUTORES' : 
                      activeReport === 'documentos' ? 'ESTADO DE DOCUMENTACIÓN' : 
                      activeReport === 'asistenciaTeensPro' ? 'ASISTENCIA TEENSPRO' : 
                      activeReport === 'primeraVez' ? `PRIMERA VEZ (${String(filterMonth).padStart(2, '0')}/${filterYear})` : 'LISTA DE ACTIVOS';
        
        doc.setFontSize(16);
        doc.text(`Reporte de Seguimiento: ${title}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);

        if (activeReport === 'asistenciaReunion' && selectedReunionId) {
            const reu = reuniones.find(r => r.id === selectedReunionId);
            if (reu) {
                doc.text(`Reunión: ${reu.tema} - Fecha: ${formatDate(reu.fecha)}`, 14, 28);
                const enc = encargados.find(e => e.id === reu.encargadoId);
                if (enc) {
                    doc.text(`Encargado: ${enc.nombre} ${enc.apellido}`, 14, 34);
                }
            }
        }

        const headers = activeReport === 'cumpleanos' 
            ? [['Nombre', 'Fecha Cumpleaños', 'Reg. Salud', 'Edad', 'Barrio', 'Teléfono']]
            : activeReport === 'adolescentesTutores'
            ? [['Adolescente', 'Cédula', 'Tutores (Nombre y Teléfono)']]
            : activeReport === 'tutores'
            ? [['Nombre', 'Cédula', 'Teléfono', 'Parentesco', 'Barrio', 'Ciudad']]
            : activeReport === 'documentos'
            ? [['Nombre', 'Cédula', 'Ficha Inscripción', 'Autorización', 'Estado Documentación']]
            : (activeReport === 'activos' || activeReport === 'primeraVez')
            ? [['Nombre', 'Fecha Nacimiento', 'Reg. Salud', 'Edad', 'Barrio', 'Teléfono']]
            : activeReport === 'asistenciaTeensPro'
            ? [['Nombre y Apellido', ...reuniones.filter(r => r.esTeensPro).sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()).map((_, index) => `ID TEEN ${index + 1}`)]]
            : activeReport === 'asistenciaReunion'
            ? [['Nombre', 'Reg. Salud', 'Edad', 'Barrio', 'Teléfono']]
            : [['Nombre', 'Cédula CI', 'Reg. Salud', 'Edad', 'Barrio', 'Teléfono']];

        const tableData = reportData.map((item: any) => {
            if (activeReport === 'asistenciaTeensPro') {
                const teensProReus = reuniones.filter(r => r.esTeensPro).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                const row = [`${item.nombre} ${item.apellido}`];
                teensProReus.forEach(reu => {
                    const asistencia = asistencias.find(asis => String(asis.reunionId) === String(reu.id) && String(asis.adolescenteId) === String(item.id));
                    row.push(asistencia?.estado === 'Presente' ? '1' : '0');
                });
                return row;
            }
            if (activeReport === 'adolescentesTutores') {
                const tutoresStr = item.tutores.map((t: any) => `${t.nombre} ${t.apellido} (${t.telefono || 'Sin tel'})`).join('\n');
                return [`${item.nombre} ${item.apellido}`, item.cedula, tutoresStr || 'Sin tutores'];
            }
            if (activeReport === 'tutores') {
                return [`${item.nombre} ${item.apellido}`, item.cedula, item.telefono || '-', item.parentesco || '-', item.barrio || '-', item.ciudad || '-'];
            }
            if (activeReport === 'documentos') {
                const a = item as Adolescente;
                let estadoDoc = 'Al día';
                if (!a.fichaInscripcion && !a.autorizacion) estadoDoc = 'Faltan ambos';
                else if (!a.fichaInscripcion) estadoDoc = 'Falta Ficha';
                else if (!a.autorizacion) estadoDoc = 'Falta Autorización';
                
                return [
                    `${a.nombre} ${a.apellido}`, 
                    a.cedula, 
                    a.fichaInscripcion ? 'Sí' : 'No', 
                    a.autorizacion ? 'Sí' : 'No',
                    estadoDoc
                ];
            }

            const a = item as Adolescente;
            const row = [`${a.nombre} ${a.apellido}`];
            if (activeReport === 'cumpleanos') {
                row.push(getBirthdayThisYear(a.fechaNacimiento));
            } else if (activeReport === 'activos' || activeReport === 'primeraVez') {
                row.push(formatDate(a.fechaNacimiento));
            } else if (activeReport !== 'asistenciaReunion') {
                row.push(a.cedula);
            }
            row.push(
                a.registro || 'N/A',
                calcularEdad(a.fechaNacimiento).toString(),
                a.barrio || 'N/A',
                a.telefono || 'N/A'
            );
            return row;
        });

        autoTable(doc, {
            startY: activeReport === 'asistenciaReunion' ? 40 : 28,
            head: headers,
            body: tableData,
            headStyles: { fillColor: [79, 70, 229] },
        });

        doc.save(`reporte_${activeReport}.pdf`);
    };

    const handleExportExcel = () => {
        if (activeReport === 'activos' || activeReport === 'primeraVez') {
            // Create CSV content for 'activos'
            const headers = ['Nombre y Apellido', 'Edad', 'Ciudad', 'Teléfono', 'Tutores'];
            
            const csvRows = [];
            csvRows.push(headers.join(',')); // Add headers
            
            reportData.forEach((item: any) => {
                const a = item as Adolescente;
                const age = calcularEdad(a.fechaNacimiento);
                const city = a.ciudad ? a.ciudad : (a.barrio ? `Barrio ${a.barrio}` : '');
                
                // Find tutors for this teen
                const adoTutoresIds = tutoresAdolescentes
                    .filter(ta => String(ta.adolescenteId) === String(a.id))
                    .map(ta => String(ta.tutorId));
                    
                const adoTutores = tutores.filter(t => adoTutoresIds.includes(String(t.id)));
                const tutoresNames = adoTutores.length > 0 
                    ? adoTutores.map(t => `${t.nombre} ${t.apellido}`).join('; ')
                    : 'Ninguno';

                // Escape quotes and commas
                const escapeCsv = (str: string) => `"${String(str).replace(/"/g, '""')}"`;
                
                const row = [
                    escapeCsv(`${a.nombre} ${a.apellido}`),
                    age,
                    escapeCsv(city),
                    escapeCsv(a.telefono || ''),
                    escapeCsv(tutoresNames)
                ];
                
                csvRows.push(row.join(','));
            });

            const csvString = csvRows.join('\n');
            const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Lista_Activos_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (activeReport === 'asistenciaTeensPro') {
            const teensProReus = reuniones.filter(r => r.esTeensPro).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            
            const headers = ['Nombre y Apellido', ...teensProReus.map((_, index) => `ID TEEN ${index + 1}`)];
            const csvRows = [];
            csvRows.push(headers.join(','));

            reportData.forEach((item: any) => {
                const row = [`"${item.nombre} ${item.apellido}"`];
                teensProReus.forEach(reu => {
                    const asistencia = asistencias.find(asis => String(asis.reunionId) === String(reu.id) && String(asis.adolescenteId) === String(item.id));
                    row.push(asistencia?.estado === 'Presente' ? '1' : '0');
                });
                csvRows.push(row.join(','));
            });

            const csvString = csvRows.join('\n');
            const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Asistencia_TeensPro_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reportes de Seguimiento</h1>
                <div className="flex gap-2">
                    {(activeReport === 'activos' || activeReport === 'asistenciaTeensPro' || activeReport === 'primeraVez') && (
                        <button 
                            onClick={handleExportExcel} 
                            className="bg-green-600 border border-green-700 p-2 rounded-lg text-white hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium px-4"
                            title="Desgargar Excel (CSV)"
                        >
                            <DocumentDownloadIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Exportar Excel</span>
                        </button>
                    )}
                    <button 
                        onClick={handlePrint} 
                        className="bg-surface border border-border p-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                        title="Imprimir PDF"
                    >
                        <PrinterIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handleRefresh} className="p-2 text-text-secondary hover:text-primary transition-colors">
                        <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveReport('cumpleanos')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'cumpleanos' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <CalendarDaysIcon className="w-4 h-4" /> Cumpleaños del Mes
                </button>
                <button onClick={() => setActiveReport('ausencias')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'ausencias' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <UsersIcon className="w-4 h-4" /> Alerta de Ausencias
                </button>
                <button onClick={() => setActiveReport('activos')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'activos' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <UsersIcon className="w-4 h-4" /> Lista de Activos
                </button>
                <button onClick={() => setActiveReport('primeraVez')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'primeraVez' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <UsersIcon className="w-4 h-4" /> Primera Vez
                </button>
                <button onClick={() => setActiveReport('asistenciaReunion')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'asistenciaReunion' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <ClipboardListIcon className="w-4 h-4" /> Asistencia por Reunión
                </button>
                <button onClick={() => setActiveReport('adolescentesTutores')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'adolescentesTutores' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <UsersIcon className="w-4 h-4" /> Adolescentes y Tutores
                </button>
                <button onClick={() => setActiveReport('tutores')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'tutores' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <UsersIcon className="w-4 h-4" /> Listado de Tutores
                </button>
                <button onClick={() => setActiveReport('documentos')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'documentos' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <ClipboardListIcon className="w-4 h-4" /> Estado de Documentos
                </button>
                <button onClick={() => setActiveReport('asistenciaTeensPro')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'asistenciaTeensPro' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <ClipboardListIcon className="w-4 h-4" /> Asistencia TeensPro
                </button>
            </div>

            {activeReport === 'primeraVez' && (
                <div className="bg-surface p-4 rounded-lg border border-border flex flex-wrap items-center gap-4">
                    <span className="text-sm font-bold text-text-primary">Seleccionar Mes y Año:</span>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-text-secondary">Mes:</label>
                        <select 
                            value={filterMonth} 
                            onChange={(e) => setFilterMonth(Number(e.target.value))}
                            className="bg-background border border-border px-3 py-1.5 rounded-md text-sm text-text-primary focus:ring-2 ring-primary outline-none"
                        >
                            <option value={1}>Enero</option>
                            <option value={2}>Febrero</option>
                            <option value={3}>Marzo</option>
                            <option value={4}>Abril</option>
                            <option value={5}>Mayo</option>
                            <option value={6}>Junio</option>
                            <option value={7}>Julio</option>
                            <option value={8}>Agosto</option>
                            <option value={9}>Septiembre</option>
                            <option value={10}>Octubre</option>
                            <option value={11}>Noviembre</option>
                            <option value={12}>Diciembre</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-text-secondary">Año:</label>
                        <select 
                            value={filterYear} 
                            onChange={(e) => setFilterYear(Number(e.target.value))}
                            className="bg-background border border-border px-3 py-1.5 rounded-md text-sm text-text-primary focus:ring-2 ring-primary outline-none"
                        >
                            {[...Array(6)].map((_, i) => {
                                const y = new Date().getFullYear() - 3 + i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                    </div>
                </div>
            )}

            {(activeReport === 'asistenciaTeensPro' || activeReport === 'adolescentesTutores' || activeReport === 'activos') && (
                <div className="flex flex-col gap-2 mt-2 px-1">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="filterTeensPro"
                            checked={filterTeensProAtLeastOne}
                            onChange={(e) => setFilterTeensProAtLeastOne(e.target.checked)}
                            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                        />
                        <label htmlFor="filterTeensPro" className="ml-2 text-sm font-medium text-text-primary">
                            Mostrar sólo a quienes asistieron a por lo menos una clase TeensPro
                        </label>
                    </div>
                    {activeReport === 'asistenciaTeensPro' && (
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="filter15OrOlder"
                                checked={filter15OrOlder}
                                onChange={(e) => setFilter15OrOlder(e.target.checked)}
                                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                            />
                            <label htmlFor="filter15OrOlder" className="ml-2 text-sm font-medium text-text-primary">
                                Mostrar sólo adolescentes de 15 años o más
                            </label>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-surface p-6 rounded-lg shadow-lg border border-border">
                {activeReport === 'asistenciaReunion' && (
                    <div className="mb-6 bg-background/50 p-4 rounded-lg border border-border/50">
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Seleccionar Reunión</label>
                        <select 
                            value={selectedReunionId || ''} 
                            onChange={e => setSelectedReunionId(e.target.value || null)} 
                            className="bg-background border border-border p-2.5 rounded-md w-full max-w-md text-text-primary focus:ring-2 ring-primary outline-none"
                        >
                            <option value="">-- Selecciona una reunión --</option>
                            {reuniones.map(r => <option key={r.id} value={r.id}>{formatDate(r.fecha)} - {r.tema}</option>)}
                        </select>
                    </div>
                )}

                {activeReport === 'documentos' && (
                    <div className="mb-6 bg-background/50 p-4 rounded-lg border border-border/50">
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Filtrar por Estado</label>
                        <select 
                            value={docFilter} 
                            onChange={e => setDocFilter(e.target.value as DocumentFilter)} 
                            className="bg-background border border-border p-2.5 rounded-md w-full max-w-md text-text-primary focus:ring-2 ring-primary outline-none"
                        >
                            <option value="Todos">Todos</option>
                            <option value="Ficha Pendiente">Ficha Pendiente</option>
                            <option value="Ficha Entregada">Ficha Entregada</option>
                            <option value="Autorización Pendiente">Autorización Pendiente</option>
                            <option value="Autorización Entregada">Autorización Entregada</option>
                            <option value="Todo Entregado">Todo Entregado</option>
                            <option value="Todo Pendiente">Todo Pendiente</option>
                        </select>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-background text-text-secondary uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                {activeReport === 'adolescentesTutores' ? (
                                    <>
                                        <th className="p-4">Adolescente</th>
                                        <th className="p-4">Cédula</th>
                                        <th className="p-4">Tutores (Nombre y Teléfono)</th>
                                    </>
                                ) : activeReport === 'tutores' ? (
                                    <>
                                        <th className="p-4">Nombre Completo</th>
                                        <th className="p-4">Cédula</th>
                                        <th className="p-4">Teléfono</th>
                                        <th className="p-4">Parentesco</th>
                                        <th className="p-4">Barrio</th>
                                        <th className="p-4">Ciudad</th>
                                    </>
                                ) : activeReport === 'documentos' ? (
                                    <>
                                        <th className="p-4">Nombre Completo</th>
                                        <th className="p-4">Cédula</th>
                                        <th className="p-4">Ficha Inscripción</th>
                                        <th className="p-4">Autorización</th>
                                        <th className="p-4">Estado Documentación</th>
                                    </>
                                ) : activeReport === 'asistenciaTeensPro' ? (
                                    <>
                                        <th className="p-4 bg-background sticky left-0 z-10 border-r border-border min-w-[200px]">Nombre y Apellido</th>
                                        {reuniones.filter(r => r.esTeensPro).sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()).map((_, index) => (
                                            <th key={index} className="p-4 whitespace-nowrap text-center">ID TEEN {index + 1}</th>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <th className="p-4">Nombre Completo</th>
                                        {activeReport !== 'asistenciaReunion' && (
                                            <th className="p-4">
                                                {activeReport === 'cumpleanos' ? 'Fecha Cumpleaños' : 
                                                 activeReport === 'activos' ? 'Fecha Nacimiento' : 'Cédula CI'}
                                            </th>
                                        )}
                                        <th className="p-4">Reg. Salud</th>
                                        <th className="p-4">Edad</th>
                                        <th className="p-4">Ciudad / Barrio</th>
                                        <th className="p-4">Teléfono</th>
                                        {activeReport === 'activos' && (
                                            <th className="p-4">Ultima Asistencia</th>
                                        )}
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {reportData.map((item: any) => {
                                if (activeReport === 'adolescentesTutores') {
                                    return (
                                        <tr key={item.id} className="hover:bg-background/40 transition-colors group">
                                            <td className="p-4 font-bold text-text-primary group-hover:text-primary">{item.nombre} {item.apellido}</td>
                                            <td className="p-4 text-text-secondary font-mono font-bold">{item.cedula}</td>
                                            <td className="p-4 text-text-secondary text-xs">
                                                {item.tutores.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {item.tutores.map((t: any) => (
                                                            <span key={t.id}>{t.nombre} {t.apellido} {t.telefono ? `(${t.telefono})` : ''}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="italic">Sin tutores</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }
                                if (activeReport === 'tutores') {
                                    return (
                                        <tr key={item.id} className="hover:bg-background/40 transition-colors group">
                                            <td className="p-4 font-bold text-text-primary group-hover:text-primary">{item.nombre} {item.apellido}</td>
                                            <td className="p-4 text-text-secondary font-mono font-bold">{item.cedula}</td>
                                            <td className="p-4 text-text-secondary text-xs">{item.telefono || '-'}</td>
                                            <td className="p-4 text-text-secondary text-xs">{item.parentesco || '-'}</td>
                                            <td className="p-4 text-text-secondary text-xs">{item.barrio || '-'}</td>
                                            <td className="p-4 text-text-secondary text-xs">{item.ciudad || '-'}</td>
                                        </tr>
                                    );
                                }
                                if (activeReport === 'documentos') {
                                    const a = item as Adolescente;
                                    let estadoDoc = 'Al día';
                                    let estadoColor = 'text-green-500';
                                    if (!a.fichaInscripcion && !a.autorizacion) {
                                        estadoDoc = 'Faltan ambos';
                                        estadoColor = 'text-red-500';
                                    } else if (!a.fichaInscripcion) {
                                        estadoDoc = 'Falta Ficha';
                                        estadoColor = 'text-orange-500';
                                    } else if (!a.autorizacion) {
                                        estadoDoc = 'Falta Autorización';
                                        estadoColor = 'text-orange-500';
                                    }
                                    
                                    return (
                                        <tr key={a.id} className="hover:bg-background/40 transition-colors group">
                                            <td className="p-4 font-bold text-text-primary group-hover:text-primary">{a.nombre} {a.apellido}</td>
                                            <td className="p-4 text-text-secondary font-mono font-bold">{a.cedula}</td>
                                            <td className="p-4">
                                                <span className={`text-xs font-bold uppercase ${a.fichaInscripcion ? 'text-green-500' : 'text-red-500'}`}>
                                                    {a.fichaInscripcion ? 'Sí' : 'No'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-xs font-bold uppercase ${a.autorizacion ? 'text-green-500' : 'text-red-500'}`}>
                                                    {a.autorizacion ? 'Sí' : 'No'}
                                                </span>
                                            </td>
                                            <td className={`p-4 text-xs font-bold uppercase ${estadoColor}`}>
                                                {estadoDoc}
                                            </td>
                                        </tr>
                                    );
                                }
                                
                                if (activeReport === 'asistenciaTeensPro') {
                                    const a = item as Adolescente;
                                    const teensProReus = reuniones.filter(r => r.esTeensPro).sort((ra, rb) => new Date(ra.fecha).getTime() - new Date(rb.fecha).getTime());
                                    return (
                                        <tr key={a.id} className="hover:bg-background/40 transition-colors group">
                                            <td className="p-4 font-bold text-text-primary group-hover:text-primary bg-background/50 sticky left-0 z-10 border-r border-border">{a.nombre} {a.apellido}</td>
                                            {teensProReus.map(reu => {
                                                const asistencia = asistencias.find(asis => String(asis.reunionId) === String(reu.id) && String(asis.adolescenteId) === String(a.id));
                                                return (
                                                    <td key={reu.id} className="p-4 text-center font-mono">
                                                        {asistencia?.estado === 'Presente' ? (
                                                            <span className="text-green-600 font-black">1</span>
                                                        ) : (
                                                            <span className="text-red-500 font-bold">0</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                }

                                const a = item as Adolescente;
                                return (
                                <tr key={a.id} className="hover:bg-background/40 transition-colors group">
                                    <td className="p-4 font-bold text-text-primary group-hover:text-primary">{a.nombre} {a.apellido}</td>
                                    {activeReport !== 'asistenciaReunion' && (
                                        <td className="p-4 text-text-secondary font-mono font-bold">
                                            {activeReport === 'cumpleanos' ? getBirthdayThisYear(a.fechaNacimiento) : 
                                             (activeReport === 'activos' || activeReport === 'primeraVez') ? formatDate(a.fechaNacimiento) : a.cedula}
                                        </td>
                                    )}
                                    <td className="p-4 text-text-secondary text-xs">{a.registro || '-'}</td>
                                    <td className="p-4 font-medium">{calcularEdad(a.fechaNacimiento)} años</td>
                                    <td className="p-4 text-text-secondary text-xs">{a.ciudad} {a.barrio ? `/ ${a.barrio}` : ''}</td>
                                    <td className="p-4 text-text-secondary text-xs">{a.telefono || '-'}</td>
                                    {activeReport === 'activos' && (
                                        <td className="p-4 text-text-secondary font-mono text-xs whitespace-nowrap">{getUltimaAsistencia(a.id)}</td>
                                    )}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {reportData.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="bg-background/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                                <ClipboardListIcon className="w-8 h-8 text-border" />
                            </div>
                            <p className="text-text-secondary italic">No hay datos disponibles para los criterios seleccionados.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reportes;
