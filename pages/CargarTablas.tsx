
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { Adolescente, Encargado, Reunion, Tutor, Asistencia, TipoAsistencia, AsistenciaDetalle, GradoParentesco } from '../types';
import { UploadCloudIcon, RefreshIcon, CheckCircleIcon, CalculatorIcon, EyeIcon } from '../components/ui/Icons';
import { api } from '../services/api';
import { calcularEdad } from '../utils/helpers';

type EntityType = 'adolescentes' | 'encargados' | 'reuniones' | 'tutores' | 'asistencias';

interface ParsedRow {
    data: any;
    isValid: boolean;
    error?: string;
}

const CargarTablas: React.FC = () => {
    const { 
        adolescentes, encargados, reuniones, tutores,
        addAdolescentesBulk, addEncargadosBulk, addReunionesBulk, 
        addTutoresAndLinkBulk, saveAsistencias,
        fetchData 
    } = useData();

    const [selectedTab, setSelectedTab] = useState<EntityType>('adolescentes');
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('Por favor, selecciona un archivo para comenzar.');
    const [isFixingDates, setIsFixingDates] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    
    const [showDiagnosis, setShowDiagnosis] = useState(false);
    const [showOnlyErrors, setShowOnlyErrors] = useState(true);

    const [filterImportErrors, setFilterImportErrors] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const existingCedulas = useMemo(() => ({
        adolescentes: new Set(adolescentes.map(a => a.cedula)),
        encargados: new Set(encargados.map(e => e.cedula)),
        tutores: new Set(tutores.map(t => t.cedula)),
    }), [adolescentes, encargados, tutores]);

    const existingReuniones = useMemo(() => 
        new Set(reuniones.map(r => `${r.fecha}_${r.tema}`))
    , [reuniones]);

    const resetState = () => {
        setParsedData([]);
        setFileName(null);
        setFilterImportErrors(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleTabChange = (tab: EntityType) => {
        setSelectedTab(tab);
        resetState();
        setStatusMessage('Por favor, selecciona un archivo para comenzar.');
    };

    const normalizeDateStr = (dateStr: string): string | null => {
        if (!dateStr) return null;
        dateStr = dateStr.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
            return dateStr.replace(/\//g, '-');
        }
        const match = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const year = match[3];
            return `${year}-${month}-${day}`;
        }
        return null;
    };

    const parseAdolescentes = useCallback((rows: string[]): ParsedRow[] => {
        const cedulasInFile = new Set<string>();
        return rows.map(rowStr => {
            const row = rowStr.split(';');
            const [nombre, apellido, cedula, rawFechaNacimiento, barrio, ciudad, telefono, sexo, estado] = row.map(field => field?.trim());
            const fechaNacimiento = normalizeDateStr(rawFechaNacimiento) || rawFechaNacimiento;
            const rawData = { nombre, apellido, cedula, fechaNacimiento, barrio, ciudad, telefono, sexo, estado };

            if (!nombre || !apellido || !cedula || !fechaNacimiento) return { data: rawData, isValid: false, error: 'Faltan campos obligatorios.' };
            if (existingCedulas.adolescentes.has(cedula) || cedulasInFile.has(cedula)) return { data: rawData, isValid: false, error: `Cédula '${cedula}' duplicada.` };
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) return { data: rawData, isValid: false, error: `Formato de fecha inválido. Usar AAAA-MM-DD.`};
            
            cedulasInFile.add(cedula);
            return {
                data: {
                    nombre, apellido, cedula, fechaNacimiento,
                    barrio: barrio || '', ciudad: ciudad || '', telefono: telefono || '',
                    sexo: (sexo === 'Masculino' || sexo === 'Femenino' ? sexo : 'Masculino'),
                    estado: (estado === 'Activo' || estado === 'Inactivo' || estado === 'Anulado' ? estado : 'Activo'),
                },
                isValid: true
            };
        });
    }, [existingCedulas.adolescentes]);

    const parseEncargados = useCallback((rows: string[]): ParsedRow[] => {
        const cedulasInFile = new Set<string>();
        return rows.map(rowStr => {
            const row = rowStr.split(';');
            const [nombre, apellido, cedula, rawFechaNacimiento, barrio, ciudad, telefono, email] = row.map(field => field?.trim());
            const fechaNacimiento = rawFechaNacimiento ? (normalizeDateStr(rawFechaNacimiento) || rawFechaNacimiento) : undefined;
            const rawData = { nombre, apellido, cedula, fechaNacimiento, barrio, ciudad, telefono, email };

            if (!nombre || !apellido || !cedula) return { data: rawData, isValid: false, error: 'Faltan campos obligatorios (Nombre, Apellido, Cédula).' };
            if (existingCedulas.encargados.has(cedula) || cedulasInFile.has(cedula)) return { data: rawData, isValid: false, error: `Cédula '${cedula}' duplicada.` };
            if (fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) return { data: rawData, isValid: false, error: `Formato de fecha inválido.`};
            
            cedulasInFile.add(cedula);
            return {
                data: { nombre, apellido, cedula, fechaNacimiento, barrio: barrio || '', ciudad: ciudad || '', telefono: telefono || '', email: email || '' },
                isValid: true
            };
        });
    }, [existingCedulas.encargados]);

    const parseReuniones = useCallback((rows: string[]): ParsedRow[] => {
        const reunionesInFile = new Set<string>();
        return rows.map(rowStr => {
            const row = rowStr.split(';');
            const [rawFecha, tema, encargadoCedula, estado] = row.map(field => field?.trim());
            const fecha = normalizeDateStr(rawFecha) || rawFecha;
            const rawData = { fecha, tema, encargadoCedula, estado };
            const reunionKey = `${fecha}_${tema}`;

            if (!fecha || !tema || !encargadoCedula) return { data: rawData, isValid: false, error: 'Faltan campos obligatorios.' };
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { data: rawData, isValid: false, error: `Formato de fecha inválido.`};
            if (!existingCedulas.encargados.has(encargadoCedula)) return { data: rawData, isValid: false, error: `Encargado con CI '${encargadoCedula}' no existe.`};
            if (existingReuniones.has(reunionKey) || reunionesInFile.has(reunionKey)) return { data: rawData, isValid: false, error: `Reunión '${tema}' en fecha '${fecha}' duplicada.` };

            let finalEstado = 'En Proceso';
            if (estado) {
                if (estado === 'En Proceso' || estado === 'Finalizado') {
                    finalEstado = estado;
                } else {
                     return { data: rawData, isValid: false, error: `Estado '${estado}' inválido. Use 'En Proceso' o 'Finalizado'.` };
                }
            }

            reunionesInFile.add(reunionKey);
            return {
                data: { fecha, tema, encargadoCedula, estado: finalEstado },
                isValid: true
            };
        });
    }, [existingCedulas.encargados, existingReuniones]);

    const parseTutores = useCallback((rows: string[]): ParsedRow[] => {
        const cedulasInFile = new Set<string>();
        const parentescoOptions: GradoParentesco[] = ['Padre', 'Madre', 'Tío', 'Tía', 'Abuelo', 'Abuela', 'Tutor Legal'];
        return rows.map(rowStr => {
            const row = rowStr.split(';');
            const [nombre, apellido, cedula, telefono, parentesco, barrio, ciudad, adolescenteCedulas] = row.map(field => field?.trim());
            const rawData = { nombre, apellido, cedula, telefono, parentesco, barrio, ciudad, adolescenteCedulas };

            if (!nombre || !apellido || !cedula || !parentesco || !adolescenteCedulas) return { data: rawData, isValid: false, error: 'Faltan campos obligatorios.' };
            if (existingCedulas.tutores.has(cedula) || cedulasInFile.has(cedula)) return { data: rawData, isValid: false, error: `Cédula '${cedula}' duplicada.` };
            if (!parentescoOptions.includes(parentesco as any)) return { data: rawData, isValid: false, error: `Parentesco '${parentesco}' inválido.` };
            const linkedCIs = adolescenteCedulas.split(',').map(c => c.trim());
            const notFoundCIs = linkedCIs.filter(ci => !existingCedulas.adolescentes.has(ci));
            if (notFoundCIs.length > 0) return { data: rawData, isValid: false, error: `Adolescentes no encontrados: ${notFoundCIs.join(', ')}` };
            
            cedulasInFile.add(cedula);
            return {
                data: { nombre, apellido, cedula, telefono: telefono || '', parentesco, barrio: barrio || '', ciudad: ciudad || '', adolescenteCedulas },
                isValid: true
            };
        });
    }, [existingCedulas.tutores, existingCedulas.adolescentes]);

    const parseAsistencias = useCallback((rows: string[]): ParsedRow[] => {
        const asistenciasInFile = new Set<string>();
        const validDetalles = ['Regular', 'Primera Vez', 'Regresa'];

        const adolescentesMap = new Map<string, Adolescente>((adolescentes as Adolescente[]).map(a => [a.cedula, a]));
        const reunionesMap = new Map<string, Reunion>((reuniones as Reunion[]).map(r => [r.id, r]));

        return rows.map(rowStr => {
            const row = rowStr.split(';');
            const [rawReunionId, adolescenteCedula, estado, detalle] = row.map(field => field?.trim());
            
            const rawData = { reunionId: rawReunionId, adolescenteCedula, estado, detalle };

            if (!rawReunionId || !adolescenteCedula || !estado) {
                 return { data: rawData, isValid: false, error: 'Faltan campos obligatorios.' };
            }

            const reunionIdInt = rawReunionId;
            if (!reunionIdInt) {
                return { data: rawData, isValid: false, error: `ID de Reunión '${rawReunionId}' inválido.` };
            }

            const reunion = reunionesMap.get(reunionIdInt);
            if (!reunion) {
                return { data: rawData, isValid: false, error: `Reunión ID '${rawReunionId}' no encontrada.` };
            }

            const adolescente = adolescentesMap.get(adolescenteCedula);
            if (!adolescente) {
                return { data: rawData, isValid: false, error: `Adolescente con CI '${adolescenteCedula}' no encontrado.` };
            }
            
            if (estado !== 'Presente' && estado !== 'Ausente') {
                return { data: rawData, isValid: false, error: `Estado '${estado}' inválido. Use 'Presente' o 'Ausente'.`};
            }
            
            if (detalle && !validDetalles.includes(detalle)) {
                return { data: rawData, isValid: false, error: `Detalle '${detalle}' inválido. Opciones: ${validDetalles.join(', ')}.` };
            }

            const asistenciaKey = `${reunion.id}_${adolescente.id}`;
            if (asistenciasInFile.has(asistenciaKey)) return { data: rawData, isValid: false, error: `Asistencia duplicada en el archivo.` };

            asistenciasInFile.add(asistenciaKey);
            return {
                data: { 
                    reunionId: reunion.id,
                    adolescenteId: adolescente.id,
                    estado: estado as TipoAsistencia, 
                    detalle: (detalle || 'Regular') as AsistenciaDetalle 
                },
                isValid: true
            };
        });
    }, [reuniones, adolescentes]);

    const handleNormalizeDates = async () => {
        setIsFixingDates(true);
        setStatusMessage("Analizando fechas en la base de datos...");
        let fixedCount = 0;
        try {
            const promises = adolescentes.map(async (ado) => {
                const originalDate = ado.fechaNacimiento;
                if (!originalDate) return;
                const isStrictlyValid = /^\d{4}-\d{2}-\d{2}$/.test(originalDate);
                if (!isStrictlyValid) {
                    const normalized = normalizeDateStr(originalDate);
                    if (normalized && normalized !== originalDate) {
                        await api.updateAdolescente({ ...ado, fechaNacimiento: normalized });
                        fixedCount++;
                    }
                }
            });
            await Promise.all(promises);
            await fetchData();
            setStatusMessage(`Proceso completado. Se corrigieron ${fixedCount} fechas al formato AAAA-MM-DD.`);
        } catch (error) {
            console.error(error);
            setStatusMessage("Hubo un error al intentar corregir las fechas.");
        } finally {
            setIsFixingDates(false);
        }
    };

    const handleRecalculateAges = async () => {
        setIsRecalculating(true);
        setStatusMessage("Sincronizando datos y recalculando edades...");
        try {
            await fetchData();
            setStatusMessage("Datos sincronizados. Las edades se han recalculado en el Dashboard.");
        } catch (e) {
            console.error(e);
            setStatusMessage("Error al actualizar datos.");
        } finally {
            setIsRecalculating(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setStatusMessage('Procesando archivo...');
        setParsedData([]);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) { setStatusMessage('El archivo está vacío.'); return; }
            
            const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
            if (rows.length <= 1) { setStatusMessage('El archivo no contiene datos para importar.'); return; }
            
            const dataRows = rows.slice(1);
            let newParsedData: ParsedRow[] = [];
            switch(selectedTab) {
                case 'adolescentes': newParsedData = parseAdolescentes(dataRows); break;
                case 'encargados': newParsedData = parseEncargados(dataRows); break;
                case 'reuniones': newParsedData = parseReuniones(dataRows); break;
                case 'tutores': newParsedData = parseTutores(dataRows); break;
                case 'asistencias': newParsedData = parseAsistencias(dataRows); break;
            }
            
            setParsedData(newParsedData);
            setStatusMessage(`${newParsedData.length} filas cargadas para revisión.`);
        };
        reader.onerror = () => setStatusMessage('Error al leer el archivo.');
        reader.readAsText(file, 'UTF-8');
    };
    
    const handleImport = async () => {
        const validData = parsedData.filter(p => p.isValid).map(p => p.data);
        if (validData.length === 0) {
            setStatusMessage('No hay datos válidos para importar.');
            return;
        }

        setStatusMessage(`Importando ${validData.length} registros...`);
        try {
            switch(selectedTab) {
                case 'adolescentes': await addAdolescentesBulk(validData); break;
                case 'encargados': await addEncargadosBulk(validData); break;
                case 'reuniones': await addReunionesBulk(validData); break;
                case 'tutores': await addTutoresAndLinkBulk(validData); break;
                case 'asistencias': await saveAsistencias(validData); break;
            }
            setStatusMessage(`¡${validData.length} registros importados con éxito!`);
            resetState();
        } catch (error) {
            setStatusMessage('Ocurrió un error durante la importación.');
            console.error(error);
        }
    };

    const diagnosisList = useMemo(() => {
        return adolescentes.map(ado => {
            const edad = calcularEdad(ado.fechaNacimiento);
            const isError = edad === 0;
            return { ...ado, edad, isError };
        });
    }, [adolescentes]);

    const displayDiagnosis = showOnlyErrors 
        ? diagnosisList.filter(d => d.isError) 
        : diagnosisList.slice(0, 50);

    const TABS_CONFIG = {
        adolescentes: {
            title: 'Adolescentes',
            instructions: <ol className="list-decimal list-inside space-y-1">
                <li>Nombre (Requerido)</li><li>Apellido (Requerido)</li><li>Cédula (Requerido, único)</li><li>Fecha Nacimiento (Requerido, AAAA-MM-DD)</li><li>Barrio</li><li>Ciudad</li><li>Teléfono</li><li>Sexo ('Masculino' o 'Femenino')</li><li>Estado ('Activo', 'Inactivo', o 'Anulado')</li>
            </ol>,
            previewHeaders: ['Nombre', 'Cédula', 'Fecha Nac.', 'Estado', 'Validación', 'Observación'],
            renderRow: (row: ParsedRow, index: number) => <tr key={index} className={`border-t border-border ${!row.isValid ? 'bg-red-900/40' : ''}`}>
                <td className="p-2">{row.data.nombre || 'N/A'} {row.data.apellido || ''}</td><td className="p-2">{row.data.cedula || 'N/A'}</td><td className="p-2">{row.data.fechaNacimiento || 'N/A'}</td><td className="p-2">{row.data.estado || 'Activo'}</td><td className={`p-2 font-semibold ${!row.isValid ? 'text-red-300' : 'text-green-300'}`}>{row.isValid ? "Válido" : "Error"}</td><td className="p-2 text-yellow-400">{row.error}</td>
            </tr>
        },
        encargados: {
            title: 'Encargados',
            instructions: <ol className="list-decimal list-inside space-y-1">
                <li>Nombre (Requerido)</li><li>Apellido (Requerido)</li><li>Cédula (Requerido, único)</li><li>Fecha Nacimiento (Opcional, AAAA-MM-DD)</li><li>Barrio</li><li>Ciudad</li><li>Teléfono</li><li>Email</li>
            </ol>,
            previewHeaders: ['Nombre', 'Cédula', 'Email', 'Validación', 'Observación'],
            renderRow: (row: ParsedRow, index: number) => <tr key={index} className={`border-t border-border ${!row.isValid ? 'bg-red-900/40' : ''}`}>
                <td className="p-2">{row.data.nombre || 'N/A'} {row.data.apellido || ''}</td><td className="p-2">{row.data.cedula || 'N/A'}</td><td className="p-2">{row.data.email || 'N/A'}</td><td className={`p-2 font-semibold ${!row.isValid ? 'text-red-300' : 'text-green-300'}`}>{row.isValid ? "Válido" : "Error"}</td><td className="p-2 text-yellow-400">{row.error}</td>
            </tr>
        },
        reuniones: {
            title: 'Reuniones',
            instructions: <ol className="list-decimal list-inside space-y-1">
                <li>Fecha (Requerido, AAAA-MM-DD)</li><li>Tema (Requerido)</li><li>Cédula del Encargado (Requerido, debe existir)</li><li>Estado (Opcional: 'En Proceso' o 'Finalizado'. Por defecto: 'En Proceso')</li>
            </ol>,
            previewHeaders: ['Tema', 'Fecha', 'CI Encargado', 'Estado', 'Validación', 'Observación'],
            renderRow: (row: ParsedRow, index: number) => <tr key={index} className={`border-t border-border ${!row.isValid ? 'bg-red-900/40' : ''}`}>
                <td className="p-2">{row.data.tema || 'N/A'}</td><td className="p-2">{row.data.fecha || 'N/A'}</td><td className="p-2">{row.data.encargadoCedula || 'N/A'}</td><td className="p-2">{row.data.estado || 'En Proceso'}</td><td className={`p-2 font-semibold ${!row.isValid ? 'text-red-300' : 'text-green-300'}`}>{row.isValid ? "Válido" : "Error"}</td><td className="p-2 text-yellow-400">{row.error}</td>
            </tr>
        },
        tutores: {
            title: 'Tutores',
            instructions: <ol className="list-decimal list-inside space-y-1">
                <li>Nombre (Requerido)</li><li>Apellido (Requerido)</li><li>Cédula (Requerido, único)</li><li>Teléfono</li><li>Parentesco (Requerido)</li><li>Barrio</li><li>Ciudad</li><li>Cédulas de Adolescentes (Requerido, separadas por coma)</li>
            </ol>,
            previewHeaders: ['Tutor', 'Cédula', 'Teléfono', 'Adolescentes Vinculados', 'Validación', 'Observación'],
            renderRow: (row: ParsedRow, index: number) => <tr key={index} className={`border-t border-border ${!row.isValid ? 'bg-red-900/40' : ''}`}>
                <td className="p-2">{row.data.nombre || 'N/A'} {row.data.apellido || ''}</td><td className="p-2">{row.data.cedula || 'N/A'}</td><td className="p-2">{row.data.telefono || '-'}</td><td className="p-2">{row.data.adolescenteCedulas || 'N/A'}</td><td className={`p-2 font-semibold ${!row.isValid ? 'text-red-300' : 'text-green-300'}`}>{row.isValid ? "Válido" : "Error"}</td><td className="p-2 text-yellow-400">{row.error}</td>
            </tr>
        },
        asistencias: {
            title: 'Asistencias a Reuniones',
            instructions: (
                <div>
                    <p className="mb-2 text-sm font-semibold">El archivo debe tener exactamente las 4 columnas citadas abajo:</p>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>ID Reunión (Entero)</li>
                        <li>Cédula Adolescente (Requerido)</li>
                        <li>Estado (Texto: 'Presente' o 'Ausente')</li>
                        <li>Detalle (Texto: 'Regular', 'Primera Vez', etc.)</li>
                    </ol>
                    <p className="mt-2 text-xs text-text-secondary italic">
                        <strong>Importante:</strong> Para identificar al adolescente, debe ingresar su número de <strong>Cédula</strong>.
                    </p>
                </div>
            ),
            previewHeaders: ['ID Reunión', 'Adolescente CI', 'Estado', 'Detalle', 'Validación', 'Observación'],
            renderRow: (row: ParsedRow, index: number) => {
                 const ado = (adolescentes as Adolescente[]).find((a: Adolescente) => a.id === row.data.adolescenteId);
                 const reu = (reuniones as Reunion[]).find((r: Reunion) => r.id === row.data.reunionId);
                 
                 const adoDisplay = ado ? `${ado.nombre} ${ado.apellido} (${ado.cedula})` : (row.data.adolescenteCedula || row.data.adolescenteId || 'N/A');
                 const reuDisplay = reu ? `${reu.tema} (ID:${reu.id})` : (row.data.reunionId || 'N/A');

                 return (
                    <tr key={index} className={`border-t border-border ${!row.isValid ? 'bg-red-900/40' : ''}`}>
                        <td className="p-2">{reuDisplay}</td>
                        <td className="p-2">{adoDisplay}</td>
                        <td className="p-2">{row.data.estado || 'N/A'}</td>
                        <td className="p-2">{row.data.detalle || 'Regular'}</td>
                        <td className={`p-2 font-semibold ${!row.isValid ? 'text-red-300' : 'text-green-300'}`}>{row.isValid ? "Válido" : "Error"}</td>
                        <td className="p-2 text-yellow-400">{row.error}</td>
                    </tr>
                 );
            }
        }
    };

    const currentTabConfig = TABS_CONFIG[selectedTab];
    const validRowsCount = parsedData.filter(r => r.isValid).length;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Cargar Datos desde Archivo</h1>
            
            <div className="flex border-b border-border overflow-x-auto">
                {Object.keys(TABS_CONFIG).map(key => (
                    <button key={key} onClick={() => handleTabChange(key as EntityType)} className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${selectedTab === key ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                        {TABS_CONFIG[key as EntityType].title}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                     <div className="bg-surface p-6 rounded-lg shadow-lg space-y-4">
                        <h2 className="text-xl font-semibold text-text-primary">Instrucciones</h2>
                        <p className="text-text-secondary text-sm">Use un archivo .csv o .txt con valores separados por punto y coma (;). La primera fila debe ser un encabezado y será ignorada.</p>
                        <div className="text-xs text-gray-400 bg-background p-3 rounded-md overflow-x-auto">{currentTabConfig.instructions}</div>
                    </div>

                    {selectedTab === 'adolescentes' && (
                        <div className="bg-surface p-6 rounded-lg shadow-lg border border-border space-y-4">
                            <div>
                                <h2 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
                                    <RefreshIcon className="w-5 h-5 text-secondary" />
                                    Mantenimiento de Datos
                                </h2>
                                <p className="text-sm text-text-secondary mb-4">
                                    Utilice esta herramienta si las fechas de nacimiento se cargaron con formatos incorrectos.
                                    Esto convertirá todas las fechas al formato estándar <strong>(AAAA-MM-DD)</strong>.
                                </p>
                                <button 
                                    onClick={handleNormalizeDates}
                                    disabled={isFixingDates || isRecalculating}
                                    className="w-full bg-secondary/20 text-secondary border border-secondary hover:bg-secondary/30 font-medium py-2 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isFixingDates ? (
                                        <>
                                            <RefreshIcon className="w-4 h-4 animate-spin" />
                                            Corrigiendo...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-4 h-4" />
                                            Normalizar Fechas
                                        </>
                                    )}
                                </button>
                            </div>
                            
                            <div className="pt-4 border-t border-border">
                                <p className="text-sm text-text-secondary mb-3">
                                    Si los datos ya están grabados correctamente pero no ves las edades o gráficos actualizados, usa este botón para refrescar.
                                </p>
                                <button 
                                    onClick={handleRecalculateAges}
                                    disabled={isFixingDates || isRecalculating}
                                    className="w-full bg-primary/20 text-primary border border-primary hover:bg-primary/30 font-medium py-2 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isRecalculating ? (
                                        <>
                                            <RefreshIcon className="w-4 h-4 animate-spin" />
                                            Recalculando...
                                        </>
                                    ) : (
                                        <>
                                            <CalculatorIcon className="w-4 h-4" />
                                            Recalcular Edades (Refrescar)
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <button 
                                    onClick={() => setShowDiagnosis(!showDiagnosis)}
                                    className="w-full text-text-secondary hover:text-white text-sm flex items-center justify-center gap-2"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    {showDiagnosis ? 'Ocultar Diagnóstico de Fechas' : 'Ver Diagnóstico de Fechas'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-2 bg-surface p-6 rounded-lg shadow-lg space-y-4">
                    {selectedTab === 'adolescentes' && showDiagnosis && (
                        <div className="mb-6 border-b border-border pb-6">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xl font-semibold text-text-primary">Diagnóstico de Edades</h2>
                                <label className="flex items-center space-x-2 text-sm text-text-secondary cursor-pointer hover:text-white">
                                    <input 
                                        type="checkbox" 
                                        checked={showOnlyErrors} 
                                        onChange={(e) => setShowOnlyErrors(e.target.checked)}
                                        className="h-4 w-4 text-primary rounded border-gray-600 focus:ring-primary bg-background"
                                    />
                                    <span>Ver solo errores</span>
                                </label>
                            </div>
                            <p className="text-sm text-text-secondary mb-4">Esta tabla muestra cómo el sistema está interpretando las fechas de nacimiento actuales.</p>
                            
                            <div className="max-h-60 overflow-y-auto bg-background p-2 rounded-md">
                                {displayDiagnosis.length > 0 ? (
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="text-text-secondary border-b border-border">
                                                <th className="p-2">Nombre</th>
                                                <th className="p-2">Fecha (Base de Datos)</th>
                                                <th className="p-2">Edad Calc.</th>
                                                <th className="p-2">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayDiagnosis.map(ado => (
                                                <tr key={ado.id} className={ado.isError ? 'text-red-400 bg-red-900/10' : 'text-text-secondary'}>
                                                    <td className="p-2">{ado.nombre} {ado.apellido}</td>
                                                    <td className="p-2 font-mono">{ado.fechaNacimiento}</td>
                                                    <td className="p-2 font-bold">{ado.edad}</td>
                                                    <td className="p-2">{ado.isError ? 'Error / Formato Inválido' : 'OK'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center">
                                        {showOnlyErrors ? (
                                            <div className="text-green-400 flex flex-col items-center">
                                                <CheckCircleIcon className="w-10 h-10 mb-2" />
                                                <p className="font-semibold text-lg">¡Excelente!</p>
                                                <p className="text-sm">No se encontraron registros con fechas inválidas o edades en 0.</p>
                                            </div>
                                        ) : (
                                             <p className="text-text-secondary">No hay datos disponibles.</p>
                                        )}
                                    </div>
                                )}
                                
                                {!showOnlyErrors && displayDiagnosis.length > 0 && (
                                    <p className="text-xs text-center mt-2 text-gray-500">Mostrando muestra de 50 registros...</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => fileInputRef.current?.click()}>
                        <input ref={fileInputRef} type="file" accept=".csv, .txt" className="hidden" onChange={handleFileChange} />
                        <div className="flex flex-col items-center justify-center"><UploadCloudIcon className="w-12 h-12 text-text-secondary" /><p className="mt-2 text-text-secondary">{fileName ? `Archivo: ${fileName}` : 'Haz clic para seleccionar un archivo'}</p></div>
                    </div>
                    <p className="text-sm text-text-secondary h-5 text-center">{statusMessage}</p>
                    {parsedData.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-border">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-text-primary">Revisión de Datos</h2>
                                <label className="flex items-center space-x-2 text-sm text-text-secondary cursor-pointer hover:text-white">
                                    <input 
                                        type="checkbox" 
                                        checked={filterImportErrors} 
                                        onChange={(e) => setFilterImportErrors(e.target.checked)}
                                        className="h-4 w-4 text-primary rounded border-gray-600 focus:ring-primary bg-background"
                                    />
                                    <span>Ver solo filas con error</span>
                                </label>
                            </div>
                            
                            <div className="max-h-80 overflow-y-auto bg-background p-2 rounded-md">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-text-secondary">
                                            {currentTabConfig.previewHeaders.map(h => <th key={h} className="p-2">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData
                                            .filter(row => !filterImportErrors || !row.isValid)
                                            .map(currentTabConfig.renderRow)
                                        }
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={handleImport} disabled={validRowsCount === 0} className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                                {`Importar ${validRowsCount} Registros Válidos`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CargarTablas;
