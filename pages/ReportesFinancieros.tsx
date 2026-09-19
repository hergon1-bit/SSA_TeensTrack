
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Adolescente } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import { RefreshIcon, CalculatorIcon, PrinterIcon, DownloadCloudIcon, UsersIcon, CheckCircleIcon, ClipboardListIcon, ShieldIcon, HeartHandshakeIcon } from '../components/ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FinReportType = 'balance' | 'historial';
type BalanceFilterStatus = 'all' | 'pending' | 'paid' | 'scholarship' | 'local';

interface GroupedPayment {
    fecha: string;
    monto: number;
    notas: string;
}

interface GroupedHistoryEntry {
    key: string;
    nombre: string;
    registro: string;
    tipo: string;
    rol: string;
    montoTotal: number;
    ultimaFecha: string;
    pagos: GroupedPayment[];
}

const ReportesFinancieros: React.FC = () => {
    const { 
        adolescentes, tutores, eventos, inscripciones, pagos, servidores, 
        inscripcionesServidores, pagosServidores, fetchData 
    } = useData();
    const [activeReport, setActiveReport] = useState<FinReportType>('balance');
    const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Estados para filtros de Balance General
    const [searchTermBalance, setSearchTermBalance] = useState('');
    const [activeStatusFilter, setActiveStatusFilter] = useState<BalanceFilterStatus>('all');

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

    // Datos base para el Balance
    const summaryData = useMemo(() => {
        if (!selectedEventoId) return [];
        const event = eventos.find(e => String(e.id) === String(selectedEventoId));
        const costoPersonaDefault = event?.costoPersona || 0;

        const dataChicos = inscripciones.filter(i => String(i.eventoId) === String(selectedEventoId)).map(i => {
            const persona = event?.esParaPadres 
                ? tutores.find(t => String(t.id) === String(i.tutorId))
                : adolescentes.find(a => String(a.id) === String(i.adolescenteId));
            const pagosAdo = pagos.filter(p => String(p.inscripcionId) === String(i.id));
            const totalPagado = pagosAdo.reduce((sum, p) => sum + p.monto, 0);
            return {
                tipo: event?.esParaPadres ? 'TUTOR' : 'CHICO',
                nombre: persona ? `${persona.nombre} ${persona.apellido}` : 'Desconocido',
                registro: event?.esParaPadres ? 'N/A' : (persona as Adolescente)?.registro || 'N/A',
                rol: 'Participante',
                pagado: totalPagado,
                saldo: Math.max(0, costoPersonaDefault - totalPagado),
                beca: 'Ninguna' as string,
                precioLocal: false
            };
        });

        const dataServidores = inscripcionesServidores.filter(i => String(i.eventoId) === String(selectedEventoId)).map(i => {
            const s = servidores.find(ser => String(ser.id) === String(i.servidorId));
            const pagosS = pagosServidores.filter(p => String(p.inscripcionServidorId) === String(i.id));
            const totalPagado = pagosS.reduce((sum, p) => sum + p.monto, 0);
            
            let saldoCalculado = 0;
            const montoAcordado = i.montoAcordado || 0;

            if (i.precioEspecialLocal) {
                saldoCalculado = Math.max(0, montoAcordado - totalPagado);
            } else if (i.tipoBeca === 'Total') {
                saldoCalculado = 0;
            } else if (i.tipoBeca === 'Parcial') {
                saldoCalculado = Math.max(0, montoAcordado - totalPagado);
            } else {
                saldoCalculado = Math.max(0, costoPersonaDefault - totalPagado);
            }

            return {
                tipo: 'APOYO',
                nombre: s ? `${s.nombre} ${s.apellido}` : 'Desconocido',
                registro: s?.registro || 'N/A',
                rol: i.rol,
                pagado: totalPagado,
                saldo: saldoCalculado,
                beca: i.tipoBeca || 'Ninguna',
                precioLocal: i.precioEspecialLocal || false
            };
        });

        return [...dataChicos, ...dataServidores].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [adolescentes, eventos, inscripciones, pagos, servidores, inscripcionesServidores, pagosServidores, selectedEventoId]);

    // Aplicación de filtros en Balance General
    const filteredSummaryData = useMemo(() => {
        return summaryData.filter(item => {
            const matchesSearch = item.nombre.toLowerCase().includes(searchTermBalance.toLowerCase());
            
            let matchesStatus = true;
            if (activeStatusFilter === 'pending') matchesStatus = item.saldo > 0;
            else if (activeStatusFilter === 'paid') matchesStatus = item.saldo <= 0;
            else if (activeStatusFilter === 'scholarship') matchesStatus = (item.beca !== 'Ninguna' && !item.precioLocal);
            else if (activeStatusFilter === 'local') matchesStatus = item.precioLocal === true;

            return matchesSearch && matchesStatus;
        });
    }, [summaryData, searchTermBalance, activeStatusFilter]);

    // Datos para la pestaña de Historial (AGRUPADOS POR PERSONA)
    const historyData = useMemo(() => {
        if (!selectedEventoId) return [];
        
        const eventAdoInsc = inscripciones.filter(i => String(i.eventoId) === String(selectedEventoId));
        const eventSerInsc = inscripcionesServidores.filter(i => String(i.eventoId) === String(selectedEventoId));

        const groups = new Map<string, GroupedHistoryEntry>();

        // Procesar pagos de Chicos / Tutores
        pagos.filter(p => eventAdoInsc.some(i => String(i.id) === String(p.inscripcionId))).forEach(p => {
            const insc = eventAdoInsc.find(i => String(i.id) === String(p.inscripcionId))!;
            const event = eventos.find(e => String(e.id) === String(selectedEventoId));
            const persona = event?.esParaPadres 
                ? tutores.find(t => String(t.id) === String(insc.tutorId))
                : adolescentes.find(a => String(a.id) === String(insc.adolescenteId));
            const key = event?.esParaPadres ? `TUTOR-${insc.tutorId}` : `CHICO-${insc.adolescenteId}`;
            
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    nombre: persona ? `${persona.nombre} ${persona.apellido}` : 'Desconocido',
                    registro: event?.esParaPadres ? 'N/A' : (persona as Adolescente)?.registro || 'N/A',
                    tipo: event?.esParaPadres ? 'TUTOR' : 'CHICO',
                    rol: 'Participante',
                    montoTotal: 0,
                    ultimaFecha: p.fecha,
                    pagos: []
                });
            }

            const group = groups.get(key)!;
            group.montoTotal += p.monto;
            group.pagos.push({ fecha: p.fecha, monto: p.monto, notas: '' });
            if (new Date(p.fecha) > new Date(group.ultimaFecha)) group.ultimaFecha = p.fecha;
        });

        // Procesar pagos de Apoyos
        pagosServidores.filter(p => eventSerInsc.some(i => String(i.id) === String(p.inscripcionServidorId))).forEach(p => {
            const insc = eventSerInsc.find(i => String(i.id) === String(p.inscripcionServidorId))!;
            const ser = servidores.find(s => String(s.id) === String(insc.servidorId));
            const key = `APOYO-${insc.servidorId}`;

            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    nombre: ser ? `${ser.nombre} ${ser.apellido}` : 'Desconocido',
                    registro: ser?.registro || 'N/A',
                    tipo: 'APOYO',
                    rol: insc.rol,
                    montoTotal: 0,
                    ultimaFecha: p.fecha,
                    pagos: []
                });
            }

            const group = groups.get(key)!;
            group.montoTotal += p.monto;
            group.pagos.push({ fecha: p.fecha, monto: p.monto, notas: p.notas || '' });
            if (new Date(p.fecha) > new Date(group.ultimaFecha)) group.ultimaFecha = p.fecha;
        });

        // Ordenar pagos internos por fecha ascendente
        groups.forEach(g => {
            g.pagos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        });

        // UI muestra ordenado por Persona (Nombre)
        return Array.from(groups.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [selectedEventoId, inscripciones, inscripcionesServidores, pagos, pagosServidores, adolescentes, servidores]);

    const balanceTotals = useMemo(() => {
        if (!selectedEventoId) return null;
        const ev = eventos.find(e => String(e.id) === String(selectedEventoId));
        const costoBase = ev?.costoPersona || 0;
        
        let sumaBecasReal = 0;
        let montoTotalAgreements = 0;

        inscripcionesServidores.filter(i => i.eventoId === selectedEventoId).forEach(i => {
            const agreed = i.montoAcordado || 0;
            if (i.precioEspecialLocal) {
                montoTotalAgreements += agreed;
            } else {
                if (i.tipoBeca === 'Total') sumaBecasReal += costoBase;
                else if (i.tipoBeca === 'Parcial') sumaBecasReal += (costoBase - agreed);
            }
        });

        // Cálculos de cantidades (sobre summaryData base, sin filtros de visualización)
        const cantInscriptos = summaryData.length;
        const cantPagadosFull = summaryData.filter(r => r.saldo <= 0).length;
        const cantPendientes = summaryData.filter(r => r.saldo > 0).length;
        const cantBecados = summaryData.filter(r => (r.beca === 'Parcial' || r.beca === 'Total') && !r.precioLocal).length;
        const cantAcuerdosLocales = summaryData.filter(r => r.precioLocal).length;

        return {
            pagosRealizados: summaryData.reduce((acc, r) => acc + (r.pagado || 0), 0),
            saldosPendientes: summaryData.reduce((acc, r) => acc + (r.saldo || 0), 0),
            becasCargoIglesia: sumaBecasReal,
            ahorroAcuerdoLocal: montoTotalAgreements,
            cantInscriptos,
            cantPagadosFull,
            cantPendientes,
            cantBecados,
            cantAcuerdosLocales
        };
    }, [selectedEventoId, summaryData, inscripcionesServidores, eventos]);

    const handleExportExcel = () => {
        if (!selectedEventoId || historyData.length === 0) return;
        
        const event = eventos.find(e => String(e.id) === String(selectedEventoId));
        const now = new Date();
        const reportDate = formatDate(now);
        const reportTime = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

        const headers = ["Fecha pago", "Persona", "Registro de salud", "Tipo / Rol", "Monto Total"];
        
        // Generar filas basadas en los datos agrupados de la pantalla
        const dataRows = historyData.map((h) => [
            formatDate(h.ultimaFecha),
            h.nombre,
            h.registro,
            `${h.tipo} / ${h.rol}`,
            h.montoTotal
        ].join(';'));

        const csvContent = [
            [`Fecha y Hora de Generación:;${reportDate} ${reportTime}`],
            [`TITULO:;HISTORIAL DE PAGOS`],
            [`EVENTO SELECCIONADO:;----- ${event?.tema.toUpperCase()} -----`],
            [`Total de Inscriptos registrados:;${balanceTotals?.cantInscriptos || 0}`],
            [""], // Fila vacía
            [headers.join(';')],
            ...dataRows
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Historial_Pagos_${event?.tema.replace(/\s+/g, '_') || 'evento'}.csv`;
        link.click();
    };

    const handleExportBalanceExcel = () => {
        if (!selectedEventoId || !balanceTotals) return;
        const event = eventos.find(e => String(e.id) === String(selectedEventoId));
        const now = new Date();
        const reportDate = formatDate(now);
        const reportTime = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

        const headers = ["Orden", "Tipo", "Nombre", "Reg / CI", "Función"];
        
        // Generar filas basadas en los datos filtrados actualmente en pantalla
        const dataRows = filteredSummaryData.map((r, index) => [
            index + 1,
            r.tipo,
            r.nombre,
            r.registro || 'N/A',
            r.rol
        ].join(';'));

        const csvContent = [
            [`Fecha y Hora de Generación:;${reportDate} ${reportTime}`],
            [`EVENTO SELECCIONADO:;----- ${event?.tema.toUpperCase()} -----`],
            [`Total de Inscriptos registrados:;${balanceTotals.cantInscriptos}`],
            [""], // Fila vacía
            [headers.join(';')],
            ...dataRows
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Balance_Excel_${event?.tema.replace(/\s+/g, '_')}.csv`;
        link.click();
    };

    const handlePrintBalancePDF = () => {
        if (!selectedEventoId || !balanceTotals) return;
        const event = eventos.find(e => String(e.id) === String(selectedEventoId));
        const doc = new jsPDF('landscape'); 
        const now = new Date();
        const printDate = `${formatDate(now)} ${now.toLocaleTimeString('es-PY')}`;

        const filterLabels: Record<BalanceFilterStatus, string> = {
            all: 'Todos',
            pending: 'Solo con Saldo Pendiente',
            paid: 'Totalmente Pagados',
            scholarship: 'Solo Becados (Staff)',
            local: 'Solo con Acuerdo Local'
        };

        const marginX = 14;
        let currentY = 15;

        const addHeader = (data: any) => {
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Impreso el: ${printDate}`, marginX, 10);
            doc.text(`Página ${data.pageNumber} / ${data.pageCount}`, 280, 10, { align: 'right' });
        };

        doc.setFontSize(22);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text("Balances y Deudas de Inscriptos", 148, currentY + 10, { align: 'center' });
        
        currentY += 25;
        doc.setFontSize(14);
        doc.text(`Evento: ${event?.tema}`, marginX, currentY);
        
        currentY += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const fechaFinStr = event?.fechaFin ? ` - ${formatDate(event.fechaFin)}` : '';
        doc.text(`Fecha: ${formatDate(event?.fechaInicio || '')}${fechaFinStr}`, marginX, currentY);
        
        currentY += 6;
        doc.setFont('helvetica', 'bold');
        doc.text(`Filtro aplicado: ${filterLabels[activeStatusFilter]}`, marginX, currentY);
        doc.setFont('helvetica', 'normal');

        currentY += 6;
        if (event?.tieneCosto) {
            doc.text(`Costo por Persona: ${formatCurrency(event.costoPersona || 0)}`, marginX, currentY);
            currentY += 6;
        }
        doc.text(`Total Inscriptos: ${balanceTotals.cantInscriptos}`, marginX, currentY);

        currentY += 10;

        const tableBody = filteredSummaryData.map(r => {
            let acuerdoBecaStr = 'Estándar';
            if (r.precioLocal) acuerdoBecaStr = 'Acuerdo Local';
            else if (r.beca !== 'Ninguna') acuerdoBecaStr = `Beca ${r.beca}`;

            return [
                r.tipo,
                r.nombre,
                r.registro,
                acuerdoBecaStr,
                formatCurrency(r.pagado),
                formatCurrency(r.saldo)
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Tipo', 'Nombre', 'Reg. Salud', 'Acuerdo / Beca', 'Monto Pagado', 'Monto Pendiente']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, 
            styles: { fontSize: 9 },
            didDrawPage: (data) => addHeader(data),
            margin: { top: 20 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        
        let summaryY = finalY;
        if (summaryY > 160) {
            doc.addPage();
            summaryY = 30;
        }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Resumen Financiero Consolidado", marginX, summaryY);
        
        summaryY += 10;
        doc.setFontSize(10);
        
        const totalsData = [
            ["Cobrado en Caja:", formatCurrency(balanceTotals.pagosRealizados)],
            ["Saldo Pendiente:", formatCurrency(balanceTotals.saldosPendientes)],
            ["Becas (Iglesia):", formatCurrency(balanceTotals.becasCargoIglesia)],
            ["Acuerdos Locales:", formatCurrency(balanceTotals.ahorroAcuerdoLocal)]
        ];

        autoTable(doc, {
            startY: summaryY,
            body: totalsData,
            theme: 'plain',
            styles: { cellPadding: 2, fontSize: 10 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
            margin: { left: marginX }
        });

        const countsY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Estadísticas de Participación", marginX, countsY);

        const countsData = [
            ["Inscriptos Totales:", balanceTotals.cantInscriptos.toString()],
            ["Totalmente Pagados:", balanceTotals.cantPagadosFull.toString()],
            ["Con Saldo Pendiente:", balanceTotals.cantPendientes.toString()],
            ["Becados (Staff):", balanceTotals.cantBecados.toString()],
            ["Acuerdos Locales:", balanceTotals.cantAcuerdosLocales.toString()]
        ];

        autoTable(doc, {
            startY: countsY + 5,
            body: countsData,
            theme: 'plain',
            styles: { cellPadding: 2, fontSize: 10 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
            margin: { left: marginX }
        });

        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} / ${totalPages}`, 280, 10, { align: 'right' });
        }

        doc.save(`Balance_General_${event?.tema.replace(/\s+/g, '_')}.pdf`);
    };

    const handlePrintHistoryPDF = () => {
        if (!selectedEventoId || historyData.length === 0) return;
        const event = eventos.find(e => String(e.id) === String(selectedEventoId));
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.text(`Historial de Pagos (Agrupado)`, 14, 15);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Evento: ${event?.tema}`, 14, 25);
        doc.text(`Fecha del Informe: ${new Date().toLocaleString()}`, 14, 32);

        // Para el PDF, listamos todos los pagos individuales para transparencia
        const tableData: any[] = [];
        historyData.forEach(g => {
            g.pagos.forEach(p => {
                tableData.push([
                    formatDate(p.fecha),
                    g.nombre,
                    g.tipo,
                    g.rol,
                    formatCurrency(p.monto),
                    p.notas || '-'
                ]);
            });
        });

        autoTable(doc, {
            startY: 40,
            head: [['Fecha', 'Nombre', 'Tipo', 'Rol', 'Monto', 'Notas']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, 
            foot: [['', '', '', 'TOTAL COBRADO:', formatCurrency(balanceTotals?.pagosRealizados || 0), '']],
            footStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' }
        });

        doc.save(`historial_pagos_${event?.tema}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <CalculatorIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">Balance Financiero</h1>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => setActiveReport('balance')} 
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeReport === 'balance' ? 'bg-primary text-white shadow-md' : 'bg-surface text-text-secondary border border-border hover:bg-background'}`}
                    >
                        Balance General
                    </button>
                    <button 
                        onClick={() => setActiveReport('historial')} 
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeReport === 'historial' ? 'bg-primary text-white shadow-md' : 'bg-surface text-text-secondary border border-border hover:bg-background'}`}
                    >
                        Historial de Pagos
                    </button>
                </div>
            </div>
            
            <div className="bg-surface p-6 rounded-xl shadow-lg border border-border">
                <div className="flex justify-between items-end mb-8 gap-4 flex-wrap">
                    <div className="flex-1 min-w-[300px]">
                        <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Seleccionar Evento</label>
                        <select 
                            value={selectedEventoId || ''} 
                            onChange={e => { setSelectedEventoId(e.target.value || null); setSearchTermBalance(''); setActiveStatusFilter('all'); }} 
                            className="bg-background border border-border p-3 rounded-lg w-full text-text-primary focus:ring-2 ring-primary outline-none transition-all"
                        >
                            <option value="">-- Seleccione un evento para ver finanzas --</option>
                            {eventos.filter(e => e.tieneCosto).map(e => (
                                <option key={e.id} value={e.id}>{e.tema} ({formatDate(e.fechaInicio)})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        {activeReport === 'balance' && selectedEventoId && (
                            <>
                                <button 
                                    onClick={handleExportBalanceExcel}
                                    className="bg-secondary text-white p-3 rounded-lg hover:bg-emerald-600 transition-colors shadow-md"
                                    title="Exportar a Excel"
                                >
                                    <DownloadCloudIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={handlePrintBalancePDF}
                                    className="bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 transition-colors shadow-md border border-border"
                                    title="Imprimir PDF del Balance"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        {activeReport === 'historial' && selectedEventoId && historyData.length > 0 && (
                            <>
                                <button 
                                    onClick={handleExportExcel}
                                    className="bg-secondary text-white p-3 rounded-lg hover:bg-emerald-600 transition-colors shadow-md"
                                    title="Exportar a Excel"
                                >
                                    <DownloadCloudIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={handlePrintHistoryPDF}
                                    className="bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 transition-colors shadow-md border border-border"
                                    title="Imprimir PDF del Historial"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <button onClick={handleRefresh} className="bg-background border border-border p-3 rounded-lg text-text-secondary hover:text-primary transition-all">
                            <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {selectedEventoId && balanceTotals ? (
                    <div className="space-y-8 animate-fade-in">
                        {/* Indicadores Clave de Montos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-5 bg-background/50 rounded-xl border border-border shadow-inner group text-center md:text-left">
                                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter mb-1">Cobrado en Caja</p>
                                <p className="text-2xl font-black text-green-400">{formatCurrency(balanceTotals.pagosRealizados)}</p>
                            </div>
                            <div className="p-5 bg-background/50 rounded-xl border border-border shadow-inner group text-center md:text-left">
                                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter mb-1">Saldo Pendiente</p>
                                <p className="text-2xl font-black text-red-400">{formatCurrency(balanceTotals.saldosPendientes)}</p>
                            </div>
                            <div className="p-5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner group text-center md:text-left">
                                <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-tighter mb-1">Becas (Iglesia)</p>
                                <p className="text-2xl font-black text-indigo-400">{formatCurrency(balanceTotals.becasCargoIglesia)}</p>
                            </div>
                            <div className="p-5 bg-orange-500/10 rounded-xl border border-orange-500/20 shadow-inner group text-center md:text-left">
                                <p className="text-[10px] text-orange-300 uppercase font-bold tracking-tighter mb-1">Acuerdos Locales</p>
                                <p className="text-2xl font-black text-orange-400">{formatCurrency(balanceTotals.ahorroAcuerdoLocal)}</p>
                            </div>
                        </div>

                        {/* Indicadores de Cantidades */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="p-3 bg-surface border border-border rounded-lg flex flex-col items-center justify-center text-center">
                                <ClipboardListIcon className="w-5 h-5 text-text-secondary mb-1" />
                                <span className="text-[9px] uppercase font-bold text-text-secondary">Inscriptos</span>
                                <span className="text-xl font-black text-text-primary">{balanceTotals.cantInscriptos}</span>
                            </div>
                            <div className="p-3 bg-surface border border-border rounded-lg flex flex-col items-center justify-center text-center">
                                <CheckCircleIcon className="w-5 h-5 text-green-400 mb-1" />
                                <span className="text-[9px] uppercase font-bold text-green-400">Totalmente Pagados</span>
                                <span className="text-xl font-black text-green-400">{balanceTotals.cantPagadosFull}</span>
                            </div>
                            <div className="p-3 bg-surface border border-border rounded-lg flex flex-col items-center justify-center text-center">
                                <RefreshIcon className="w-5 h-5 text-red-400 mb-1" />
                                <span className="text-[9px] uppercase font-bold text-red-400">Con Saldo</span>
                                <span className="text-xl font-black text-red-400">{balanceTotals.cantPendientes}</span>
                            </div>
                            <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg flex flex-col items-center justify-center text-center">
                                <ShieldIcon className="w-5 h-5 text-indigo-400 mb-1" />
                                <span className="text-[9px] uppercase font-bold text-indigo-400">Becados (Staff)</span>
                                <span className="text-xl font-black text-indigo-400">{balanceTotals.cantBecados}</span>
                            </div>
                            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg flex flex-col items-center justify-center text-center">
                                <HeartHandshakeIcon className="w-5 h-5 text-orange-400 mb-1" />
                                <span className="text-[9px] uppercase font-bold text-orange-400">Acuerdos Locales</span>
                                <span className="text-xl font-black text-orange-400">{balanceTotals.cantAcuerdosLocales}</span>
                            </div>
                        </div>

                        {/* Barra de Filtros (Balance General) */}
                        {activeReport === 'balance' && (
                            <div className="flex flex-col lg:flex-row gap-4 p-4 bg-background/20 rounded-xl border border-border/50">
                                <div className="flex-1">
                                    <label className="block text-[10px] uppercase font-black text-text-secondary mb-1">Buscar por Nombre</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Ej: Juan Pérez..." 
                                            value={searchTermBalance}
                                            onChange={(e) => setSearchTermBalance(e.target.value)}
                                            className="w-full bg-background border border-border p-2 rounded-lg text-sm pl-10 focus:ring-2 ring-primary outline-none transition-all"
                                        />
                                        <UsersIcon className="w-4 h-4 absolute left-3 top-2.5 text-text-secondary" />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-end gap-2">
                                    <button 
                                        onClick={() => setActiveStatusFilter('all')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeStatusFilter === 'all' ? 'bg-primary text-white border-primary shadow-md' : 'bg-surface text-text-secondary border-border hover:bg-background'}`}
                                    >
                                        Todos
                                    </button>
                                    <button 
                                        onClick={() => setActiveStatusFilter('pending')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeStatusFilter === 'pending' ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-md' : 'bg-surface text-text-secondary border-border hover:bg-background'}`}
                                    >
                                        Pendientes
                                    </button>
                                    <button 
                                        onClick={() => setActiveStatusFilter('paid')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeStatusFilter === 'paid' ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-md' : 'bg-surface text-text-secondary border-border hover:bg-background'}`}
                                    >
                                        Total Pagados
                                    </button>
                                    <button 
                                        onClick={() => setActiveStatusFilter('scholarship')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeStatusFilter === 'scholarship' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-md' : 'bg-surface text-text-secondary border-border hover:bg-background'}`}
                                    >
                                        Becados
                                    </button>
                                    <button 
                                        onClick={() => setActiveStatusFilter('local')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${activeStatusFilter === 'local' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-md' : 'bg-surface text-text-secondary border-border hover:bg-background'}`}
                                    >
                                        Acuerdos Locales
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Contenido de la Tabla según Pestaña */}
                        <div className="overflow-x-auto rounded-xl border border-border bg-background/30">
                            {activeReport === 'balance' ? (
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-background text-text-secondary uppercase text-[10px] font-black tracking-widest">
                                        <tr>
                                            <th className="p-4">Tipo</th>
                                            <th className="p-4">Nombre</th>
                                            <th className="p-4">Reg. Salud</th>
                                            <th className="p-4">Acuerdo / Beca</th>
                                            <th className="p-4 text-right">Pagado</th>
                                            <th className="p-4 text-right">Pendiente</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredSummaryData.map((r, i) => (
                                            <tr key={i} className="hover:bg-background/40 transition-colors group">
                                                <td className={`p-4 font-bold text-[10px] ${r.tipo === 'CHICO' ? 'text-primary' : 'text-purple-400'}`}>{r.tipo}</td>
                                                <td className="p-4 font-medium text-text-primary group-hover:text-primary">{r.nombre}</td>
                                                <td className="p-4 text-xs font-mono text-text-secondary">{r.registro}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {r.beca !== 'Ninguna' && !r.precioLocal && <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded uppercase font-black border border-indigo-500/30">Beca {r.beca}</span>}
                                                        {r.precioLocal && <span className="text-[8px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded uppercase font-black border border-orange-500/30">Acuerdo Local</span>}
                                                        {!r.precioLocal && r.beca === 'Ninguna' && <span className="text-[8px] text-text-secondary uppercase">Estándar</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-black text-green-400">{formatCurrency(r.pagado)}</td>
                                                <td className={`p-4 text-right font-black ${r.saldo > 0 ? 'text-red-400' : 'text-green-500'}`}>{formatCurrency(r.saldo)}</td>
                                            </tr>
                                        ))}
                                        {filteredSummaryData.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-10 text-center text-text-secondary italic">No se encontraron registros con los filtros aplicados.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-background text-text-secondary uppercase text-[10px] font-black tracking-widest">
                                        <tr>
                                            <th className="p-4">Última Fecha</th>
                                            <th className="p-4">Persona</th>
                                            <th className="p-4">Tipo / Rol</th>
                                            <th className="p-4 text-right">Monto Total</th>
                                            <th className="p-4">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {historyData.map((h) => (
                                            <tr key={h.key} className="hover:bg-background/40 transition-colors group align-top">
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-xs text-text-primary font-bold">{formatDate(h.ultimaFecha)}</span>
                                                        {h.pagos.length > 1 && (
                                                            <div className="mt-2 flex flex-col space-y-0.5 opacity-60">
                                                                {h.pagos.map((p, pi) => (
                                                                    <span key={pi} className="text-[9px] font-mono">{formatDate(p.fecha)}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-text-primary group-hover:text-primary transition-colors">{h.nombre}</span>
                                                        {h.pagos.length > 1 && (
                                                            <div className="mt-2 flex flex-col space-y-0.5 opacity-60 italic">
                                                                {h.pagos.map((_, pi) => (
                                                                    <span key={pi} className="text-[9px]">Pago parcial {pi + 1}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-black uppercase ${h.tipo === 'CHICO' ? 'text-primary' : 'text-purple-400'}`}>{h.tipo}</span>
                                                        <span className="text-[9px] text-text-secondary italic">{h.rol}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-green-400 text-base">{formatCurrency(h.montoTotal)}</span>
                                                        {h.pagos.length > 1 && (
                                                            <div className="mt-1.5 flex flex-col space-y-0.5 opacity-70">
                                                                {h.pagos.map((p, pi) => (
                                                                    <span key={pi} className="text-[10px] font-bold text-green-500/80">{formatCurrency(p.monto)}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs text-text-secondary italic max-w-xs">
                                                    <div className="flex flex-col space-y-1">
                                                        {h.pagos.map((p, pi) => p.notas ? (
                                                            <span key={pi} className="block truncate">"{p.notas}"</span>
                                                        ) : (
                                                            h.pagos.length > 1 ? <span key={pi} className="text-[10px] opacity-30">-</span> : '-'
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {historyData.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-10 text-center text-text-secondary italic">No se han registrado pagos para este evento todavía.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <div className="bg-background/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                            <CalculatorIcon className="w-10 h-10 text-border" />
                        </div>
                        <p className="text-text-secondary italic">Selecciona un evento con costo en la parte superior para visualizar los informes financieros detallados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportesFinancieros;
