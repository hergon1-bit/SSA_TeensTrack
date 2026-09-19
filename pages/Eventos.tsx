
import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Evento, Adolescente, InscripcionEvento, PagoEvento, Servidor, InscripcionServidor, RolServidor, PagoServidor, TipoBeca, EntregaAdhesion, PagoAdhesion } from '../types';
import { formatDate, formatCurrency, parseNumeros, formatNumerosComprometidos } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { TicketSelectorModal } from '../components/TicketSelectorModal';
import { useForm } from '../hooks/useForm';
import { ChevronDownIcon, TrashIcon, UsersIcon, PencilIcon, RefreshIcon, CheckCircleIcon, ClipboardListIcon, ShieldIcon, HeartHandshakeIcon, CalculatorIcon, TicketIcon, PrinterIcon, DownloadIcon } from '../components/ui/Icons';

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <input {...props} id={props.name} className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary disabled:opacity-50 transition-all sm:text-sm" />
    </div>
);

const CheckboxField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="flex items-center mt-4">
        <input {...props} id={props.name} type="checkbox" className="h-4 w-4 text-primary bg-background border-border rounded focus:ring-primary" />
        <label htmlFor={props.name} className="ml-2 block text-sm font-medium text-text-secondary">{label}</label>
    </div>
);

const Eventos: React.FC = () => {
    const { 
        eventos, adolescentes, tutores, inscripciones, pagos, servidores, inscripcionesServidores, pagosServidores,
        entregasAdhesiones, pagosAdhesiones, addEntregaAdhesion, updateEntregaAdhesion, deleteEntregaAdhesion, addPagoAdhesion, deletePagoAdhesion,
        addEvento, updateEvento, deleteEvento,
        addInscripcion, updateInscripcion, deleteInscripcion, addPago, deletePago,
        addInscripcionServidor, updateInscripcionServidor, deleteInscripcionServidor, addPagoServidor, deletePagoServidor
    } = useData();
    const { hasPermission, user } = useAuth();
    
    const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
    const [activeTabModal, setActiveTabModal] = useState<'chicos' | 'servidores' | 'adhesiones'>('chicos');
    
    // States for Loading / Actions
    const [isSavingPayment, setIsSavingPayment] = useState<{ [key: string]: boolean }>({});

    // Server Enrollment State
    const [servidorToInscribe, setServidorToInscribe] = useState<string>('');
    const [rolServidorToInscribe, setRolServidorToInscribe] = useState<RolServidor>('Apoyo');
    const [becaServidorToInscribe, setBecaServidorToInscribe] = useState<TipoBeca>('Ninguna');
    const [montoServidorToInscribe, setMontoServidorToInscribe] = useState<string>('0');
    const [precioEspecialToInscribe, setPrecioEspecialToInscribe] = useState<boolean>(false);
    const [iglesiaPagaSaldoToInscribe, setIglesiaPagaSaldoToInscribe] = useState<boolean>(false);
    const [isAddConditionsModalOpen, setIsAddConditionsModalOpen] = useState(false);
    
    // Edit Enrollment State
    const [editingInscripcion, setEditingInscripcion] = useState<InscripcionServidor | null>(null);
    const [isEditInscripcionModalOpen, setIsEditInscripcionModalOpen] = useState(false);
    
    const [adolescenteToInscribe, setAdolescenteToInscribe] = useState<string>('');
    
    // Filtros de la lista interna (Modal Gestionar)
    const [searchInscribedChico, setSearchInscribedChico] = useState('');
    const [showOnlyDeudores, setShowOnlyDeudores] = useState(false);
    const [showOnlyPagadosFull, setShowOnlyPagadosFull] = useState(false);

    const [searchInscribedServidor, setSearchInscribedServidor] = useState('');
    const [showOnlyBecados, setShowOnlyBecados] = useState(false);
    const [showOnlyPrecioLocal, setShowOnlyPrecioLocal] = useState(false);

    // States for Adhesiones / Ticket sales
    const [searchAdhesionPersona, setSearchAdhesionPersona] = useState('');
    const [showOnlyAdhesionPendientes, setShowOnlyAdhesionPendientes] = useState(false);
    const [newEntregaPersona, setNewEntregaPersona] = useState('');
    const [newEntregaFecha, setNewEntregaFecha] = useState(new Date().toISOString().split('T')[0]);
    const [newEntregaCantidad, setNewEntregaCantidad] = useState<string>('');
    const [newEntregaNumeros, setNewEntregaNumeros] = useState('');
    const [newEntregaPagoInicial, setNewEntregaPagoInicial] = useState<string>('');
    const [newEntregaQuienEntrego, setNewEntregaQuienEntrego] = useState(user?.nombre || '');
    const [newEntregaNotasPago, setNewEntregaNotasPago] = useState('');
    const [isSavingEntrega, setIsSavingEntrega] = useState(false);

    // Payment states for Adhesiones
    const [newAdhesionPayment, setNewAdhesionPayment] = useState<{ [key: string]: string }>({});
    const [newAdhesionPaymentDate, setNewAdhesionPaymentDate] = useState<{ [key: string]: string }>({});
    const [newAdhesionPaymentQuien, setNewAdhesionPaymentQuien] = useState<{ [key: string]: string }>({});
    const [newAdhesionPaymentNote, setNewAdhesionPaymentNote] = useState<{ [key: string]: string }>({});

    // Edit and Delete Entrega State
    const [editingEntrega, setEditingEntrega] = useState<EntregaAdhesion | null>(null);
    const [isEditEntregaModalOpen, setIsEditEntregaModalOpen] = useState(false);
    const [entregaToDelete, setEntregaToDelete] = useState<EntregaAdhesion | null>(null);
    const [isDeleteEntregaConfirmOpen, setIsDeleteEntregaConfirmOpen] = useState(false);

    // Interactive Ticket Selector Modal State
    const [isTicketSelectorOpen, setIsTicketSelectorOpen] = useState(false);
    const [ticketSelectorTarget, setTicketSelectorTarget] = useState<'create' | 'edit'>('create');

    // Numbers calculation for committed tickets in current event
    const committedTicketNumbers = useMemo(() => {
        if (!selectedEvent) return [];
        const eventEntregas = entregasAdhesiones.filter(e => String(e.eventoId) === String(selectedEvent.id));
        const set = new Set<number>();
        eventEntregas.forEach(e => {
            // Si estamos editando una entrega, ignoramos sus números actuales del cálculo de comprometidos
            if (ticketSelectorTarget === 'edit' && editingEntrega && String(e.id) === String(editingEntrega.id)) {
                return;
            }
            const nums = parseNumeros(e.numerosEntradas);
            nums.forEach(n => set.add(n));
        });
        return Array.from(set).sort((a, b) => a - b);
    }, [selectedEvent, entregasAdhesiones, ticketSelectorTarget, editingEntrega]);

    // Printable Report Modal
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const [newPayment, setNewPayment] = useState<{ [key: string]: string }>({});
    const [newPaymentDate, setNewPaymentDate] = useState<{ [key: string]: string }>({});
    const [newPaymentNote, setNewPaymentNote] = useState<{ [key: string]: string }>({});
    
    const [newPaymentServidor, setNewPaymentServidor] = useState<{ [key: string]: string }>({});
    const [newPaymentDateServidor, setNewPaymentDateServidor] = useState<{ [key: string]: string }>({});
    const [newPaymentNoteServidor, setNewPaymentNoteServidor] = useState<{ [key: string]: string }>({});

    const [expandedHistory, setExpandedHistory] = useState<{ [key: string]: boolean }>({});
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<Evento | null>(null);

    // Nuevos estados para eliminar inscripciones
    const [inscripcionToDelete, setInscripcionToDelete] = useState<InscripcionEvento | null>(null);
    const [isDeleteInscripcionConfirmOpen, setIsDeleteInscripcionConfirmOpen] = useState(false);
    const [inscripcionServidorToDelete, setInscripcionServidorToDelete] = useState<InscripcionServidor | null>(null);
    const [isDeleteInscripcionServidorConfirmOpen, setIsDeleteInscripcionServidorConfirmOpen] = useState(false);

    const initialEventFormState: Omit<Evento, 'id'> = {
        tema: '', lugar: '', fechaInicio: '', horaInicio: '', fechaFin: '', horaFin: '',
        tieneCosto: false, costoTotal: 0, costoPersona: 0, esParaPadres: false,
        esVentaAdhesiones: false, precioCostoUnitario: 0, precioVentaUnitario: 0, cantidadTotalEntradas: 0
    };

    const { values, handleInputChange, setValues, resetForm } = useForm(initialEventFormState);

    const toggleHistory = (type: 'ado' | 'ser' | 'adh', id: string) => {
        const key = `${type}-${id}`;
        setExpandedHistory(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const openModalForCreate = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingEvent(null);
        resetForm();
        setIsEventModalOpen(true);
    };

    const openModalForEdit = (e: React.MouseEvent, event: Evento) => {
        e.stopPropagation();
        setEditingEvent(event);
        setValues({
            tema: event.tema,
            lugar: event.lugar,
            fechaInicio: event.fechaInicio,
            horaInicio: event.horaInicio || '',
            fechaFin: event.fechaFin || '',
            horaFin: event.horaFin || '',
            tieneCosto: event.tieneCosto,
            costoTotal: event.costoTotal || 0,
            costoPersona: event.costoPersona || 0,
            esParaPadres: event.esParaPadres || false,
            esVentaAdhesiones: event.esVentaAdhesiones || false,
            precioCostoUnitario: event.precioCostoUnitario || 0,
            precioVentaUnitario: event.precioVentaUnitario || 0,
            cantidadTotalEntradas: event.cantidadTotalEntradas || 0
        });
        setIsEventModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, event: Evento) => {
        e.stopPropagation();
        setEventToDelete(event);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (eventToDelete) {
            await deleteEvento(eventToDelete.id);
            setIsDeleteConfirmOpen(false);
            setEventToDelete(null);
        }
    };

    const handleEventSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...values };
        if (payload.esVentaAdhesiones) {
            payload.tieneCosto = true;
            if (!payload.costoTotal || payload.costoTotal === 0) {
                payload.costoTotal = (payload.precioCostoUnitario || 0) * (payload.cantidadTotalEntradas || 0);
            }
        } else if (!payload.tieneCosto) {
            payload.costoTotal = 0;
            payload.costoPersona = 0;
        }
        if (!payload.esVentaAdhesiones) {
            payload.precioCostoUnitario = 0;
            payload.precioVentaUnitario = 0;
            payload.cantidadTotalEntradas = 0;
        }
        if (editingEvent) {
            await updateEvento({ ...payload, id: editingEvent.id });
        } else {
            await addEvento(payload);
        }
        setIsEventModalOpen(false);
        resetForm();
    };

    const handleCreateEntregaAdhesion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEvent || !newEntregaPersona.trim() || !newEntregaCantidad) return;
        setIsSavingEntrega(true);
        try {
            const cantidad = Number(newEntregaCantidad);
            const precioVentaUnitario = selectedEvent.precioVentaUnitario || 0;
            const costoTotal = cantidad * precioVentaUnitario;
            const entrega = await addEntregaAdhesion({
                eventoId: selectedEvent.id,
                fechaEntrega: newEntregaFecha || new Date().toISOString().split('T')[0],
                nombrePersona: newEntregaPersona.trim(),
                cantidadEntradas: cantidad,
                numerosEntradas: newEntregaNumeros.trim(),
                precioVentaUnitario,
                costoTotal
            });

            if (newEntregaPagoInicial && Number(newEntregaPagoInicial) > 0) {
                await addPagoAdhesion({
                    entregaAdhesionId: entrega.id,
                    eventoId: selectedEvent.id,
                    monto: Number(newEntregaPagoInicial),
                    fechaPago: newEntregaFecha || new Date().toISOString().split('T')[0],
                    registradoPor: newEntregaQuienEntrego || user?.nombre || 'Administrador',
                    notas: newEntregaNotasPago.trim()
                });
            }

            setNewEntregaPersona('');
            setNewEntregaCantidad('');
            setNewEntregaNumeros('');
            setNewEntregaPagoInicial('');
            setNewEntregaNotasPago('');
        } catch (err) {
            console.error("Error al registrar entrega de adhesión", err);
        } finally {
            setIsSavingEntrega(false);
        }
    };

    const handleAddPagoAdhesionItem = async (entregaId: string) => {
        const montoStr = newAdhesionPayment[entregaId];
        if (!montoStr || Number(montoStr) <= 0) return;
        setIsSavingPayment(prev => ({ ...prev, [entregaId]: true }));
        try {
            await addPagoAdhesion({
                entregaAdhesionId: entregaId,
                eventoId: selectedEvent?.id || '',
                monto: Number(montoStr),
                fechaPago: newAdhesionPaymentDate[entregaId] || new Date().toISOString().split('T')[0],
                registradoPor: newAdhesionPaymentQuien[entregaId] || user?.nombre || 'Administrador',
                notas: newAdhesionPaymentNote[entregaId] || ''
            });

            setNewAdhesionPayment(prev => ({ ...prev, [entregaId]: '' }));
            setNewAdhesionPaymentQuien(prev => ({ ...prev, [entregaId]: '' }));
            setNewAdhesionPaymentNote(prev => ({ ...prev, [entregaId]: '' }));
        } catch (err) {
            console.error("Error abonando adhesión", err);
        } finally {
            setIsSavingPayment(prev => ({ ...prev, [entregaId]: false }));
        }
    };

    const handleUpdateEntregaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEntrega) return;
        await updateEntregaAdhesion(editingEntrega);
        setIsEditEntregaModalOpen(false);
        setEditingEntrega(null);
    };

    const handleConfirmDeleteEntrega = async () => {
        if (entregaToDelete) {
            await deleteEntregaAdhesion(entregaToDelete.id);
            setIsDeleteEntregaConfirmOpen(false);
            setEntregaToDelete(null);
        }
    };

    const eventAdhesionesDetails = useMemo(() => {
        if (!selectedEvent || !selectedEvent.esVentaAdhesiones) return null;

        const eventEntregas = entregasAdhesiones.filter(e => String(e.eventoId) === String(selectedEvent.id));
        
        const entregasConPagos = eventEntregas.map(entrega => {
            const precioVenta = selectedEvent.precioVentaUnitario || 0;
            const totalAbonar = entrega.cantidadEntradas * precioVenta;
            const pagosE = pagosAdhesiones.filter(p => String(p.entregaAdhesionId) === String(entrega.id))
                .sort((a,b) => new Date(a.fechaPago).getTime() - new Date(b.fechaPago).getTime());
            const totalPagado = pagosE.reduce((sum, p) => sum + p.monto, 0);
            const saldoPendiente = totalAbonar - totalPagado;

            return {
                entrega,
                totalAbonar,
                totalPagado,
                saldoPendiente,
                pagos: pagosE
            };
        })
        .filter(item => {
            const matchesSearch = item.entrega.nombrePersona.toLowerCase().includes(searchAdhesionPersona.toLowerCase());
            const matchesPendiente = !showOnlyAdhesionPendientes || item.saldoPendiente > 0;
            return matchesSearch && matchesPendiente;
        })
        .sort((a, b) => a.entrega.nombrePersona.localeCompare(b.entrega.nombrePersona));

        const allEntregasSorted = eventEntregas.map(entrega => {
            const precioVenta = selectedEvent.precioVentaUnitario || 0;
            const totalAbonar = entrega.cantidadEntradas * precioVenta;
            const pagosE = pagosAdhesiones.filter(p => String(p.entregaAdhesionId) === String(entrega.id))
                .sort((a,b) => new Date(a.fechaPago).getTime() - new Date(b.fechaPago).getTime());
            const totalPagado = pagosE.reduce((sum, p) => sum + p.monto, 0);
            const saldoPendiente = totalAbonar - totalPagado;

            return {
                entrega,
                totalAbonar,
                totalPagado,
                saldoPendiente,
                pagos: pagosE
            };
        }).sort((a, b) => new Date(a.entrega.fechaEntrega).getTime() - new Date(b.entrega.fechaEntrega).getTime() || a.entrega.nombrePersona.localeCompare(b.entrega.nombrePersona));

        const cantTotalEntradas = selectedEvent.cantidadTotalEntradas || 0;
        const totalEntradasEntregadas = eventEntregas.reduce((sum, e) => sum + e.cantidadEntradas, 0);
        const totalEntradasDisponibles = cantTotalEntradas - totalEntradasEntregadas;

        const precioCosto = selectedEvent.precioCostoUnitario || 0;
        const precioVenta = selectedEvent.precioVentaUnitario || 0;

        const montoCostoTotalEvento = cantTotalEntradas * precioCosto;
        const montoEsperadoRecaudar = cantTotalEntradas * precioVenta;
        const montoEntregadoVentaTotal = totalEntradasEntregadas * precioVenta;

        const totalRecaudadoReal = pagosAdhesiones
            .filter(p => eventEntregas.some(e => String(e.id) === String(p.entregaAdhesionId)))
            .reduce((sum, p) => sum + p.monto, 0);

        const totalSaldoPendienteCobrar = montoEntregadoVentaTotal - totalRecaudadoReal;
        const gananciaEstimada = (precioVenta - precioCosto) * cantTotalEntradas;

        return {
            eventEntregas,
            entregasConPagos,
            allEntregasSorted,
            cantTotalEntradas,
            totalEntradasEntregadas,
            totalEntradasDisponibles,
            precioCosto,
            precioVenta,
            montoCostoTotalEvento,
            montoEsperadoRecaudar,
            montoEntregadoVentaTotal,
            totalRecaudadoReal,
            totalSaldoPendienteCobrar,
            gananciaEstimada
        };
    }, [selectedEvent, entregasAdhesiones, pagosAdhesiones, searchAdhesionPersona, showOnlyAdhesionPendientes]);

    const handleExportPDF = () => {
        if (!selectedEvent || !eventAdhesionesDetails) return;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

        // Title Header
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`PLANILLA DE COBROS ENTRADAS: ${selectedEvent.tema.toUpperCase()}`, 40, 40);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatDate(selectedEvent.fechaInicio)} ${selectedEvent.horaInicio ? `- ${selectedEvent.horaInicio}hs` : ''} | Lugar: ${selectedEvent.lugar}`, 40, 55);

        // Summary Table (PEDIDO | PAGADO | SALDO)
        autoTable(doc, {
            startY: 68,
            head: [['PEDIDO', 'PAGADO', 'SALDO']],
            body: [[
                formatCurrency(eventAdhesionesDetails.montoEntregadoVentaTotal),
                formatCurrency(eventAdhesionesDetails.totalRecaudadoReal),
                formatCurrency(eventAdhesionesDetails.totalSaldoPendienteCobrar)
            ]],
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 9 },
            bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 9.5, textColor: [15, 23, 42] },
            margin: { left: 40, right: 40 }
        });

        const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 110;

        // Main Detailed Table
        autoTable(doc, {
            startY: finalY + 12,
            head: [['Nro', 'Fecha', 'Nombre y Apellido', 'Cuantas', 'Números', 'COSTO TOTAL', 'ENTREGA(S)', 'SALDO']],
            body: eventAdhesionesDetails.allEntregasSorted.map((item, idx) => [
                idx + 1,
                formatDate(item.entrega.fechaEntrega),
                item.entrega.nombrePersona,
                item.entrega.cantidadEntradas,
                item.entrega.numerosEntradas || '-',
                formatCurrency(item.totalAbonar),
                formatCurrency(item.totalPagado),
                formatCurrency(item.saldoPendiente)
            ]),
            foot: [[
                'TOTALES:', '', '',
                eventAdhesionesDetails.allEntregasSorted.reduce((s, i) => s + i.entrega.cantidadEntradas, 0),
                '',
                formatCurrency(eventAdhesionesDetails.allEntregasSorted.reduce((s, i) => s + i.totalAbonar, 0)),
                formatCurrency(eventAdhesionesDetails.allEntregasSorted.reduce((s, i) => s + i.totalPagado, 0)),
                formatCurrency(eventAdhesionesDetails.allEntregasSorted.reduce((s, i) => s + i.saldoPendiente, 0))
            ]],
            theme: 'grid',
            headStyles: { fillColor: [203, 213, 225], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center', fontSize: 8.5 },
            bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
            footStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 28 },
                1: { halign: 'center', cellWidth: 55 },
                2: { cellWidth: 140 },
                3: { halign: 'center', cellWidth: 45 },
                4: { halign: 'center', cellWidth: 60 },
                5: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right' }
            },
            margin: { left: 40, right: 40 }
        });

        const safeTitle = selectedEvent.tema.replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save(`Planilla_Cobros_${safeTitle}.pdf`);
    };

    const handlePrintPlanilla = () => {
        try {
            const printContent = document.getElementById('printable-report-content');
            if (printContent) {
                const printWindow = window.open('', '_blank', 'width=1000,height=800');
                if (printWindow) {
                    printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Planilla de Cobros - ${selectedEvent?.tema || ''}</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <style>
                                @page { size: auto; margin: 10mm; }
                                body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #ffffff; color: #0f172a; padding: 20px; }
                            </style>
                        </head>
                        <body>
                            <div>
                                ${printContent.innerHTML}
                            </div>
                            <script>
                                setTimeout(() => {
                                    window.print();
                                    window.close();
                                }, 600);
                            </script>
                        </body>
                        </html>
                    `);
                    printWindow.document.close();
                    return;
                }
            }
        } catch (err) {
            console.error("Popup window print error:", err);
        }
        window.print();
    };

    const eventDetails = useMemo(() => {
        if (!selectedEvent) return null;
        
        const eventInscripciones = inscripciones.filter(i => String(i.eventoId) === String(selectedEvent.id));
        
        const adolescentesInscritos = eventInscripciones.map(inscripcion => {
            const persona = selectedEvent.esParaPadres 
                ? tutores.find(t => String(t.id) === String(inscripcion.tutorId))
                : adolescentes.find(a => String(a.id) === String(inscripcion.adolescenteId));
                
            const pagosRealizados = pagos.filter(p => String(p.inscripcionId) === String(inscripcion.id)).sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            const totalPagado = pagosRealizados.reduce((sum, p) => sum + p.monto, 0);
            return {
                persona: persona,
                inscripcion: inscripcion,
                totalPagado,
                pagos: pagosRealizados,
                debe: (selectedEvent.costoPersona || 0) - totalPagado,
            };
        })
        .filter(item => {
            const matchesSearch = item.persona && `${item.persona.nombre} ${item.persona.apellido}`.toLowerCase().includes(searchInscribedChico.toLowerCase());
            const matchesDeuda = !showOnlyDeudores || item.debe > 0;
            const matchesPagado = !showOnlyPagadosFull || item.debe <= 0;
            return matchesSearch && matchesDeuda && matchesPagado;
        })
        .sort((a, b) => {
            if (!a.persona || !b.persona) return 0;
            return `${a.persona.nombre} ${a.persona.apellido}`.localeCompare(`${b.persona.nombre} ${b.persona.apellido}`);
        });

        const inscritosServidores = inscripcionesServidores.filter(i => String(i.eventoId) === String(selectedEvent.id)).map(insc => {
            const s = servidores.find(ser => String(ser.id) === String(insc.servidorId));
            const pagosS = pagosServidores.filter(p => String(p.inscripcionServidorId) === String(insc.id)).sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            const totalP = pagosS.reduce((acc, curr) => acc + curr.monto, 0);
            
            let costoEsperado = selectedEvent.costoPersona || 0;
            if (insc.precioEspecialLocal) {
                costoEsperado = insc.montoAcordado || 0;
            } else if (insc.tipoBeca === 'Total') {
                costoEsperado = 0;
            } else if (insc.tipoBeca === 'Parcial') {
                costoEsperado = insc.montoAcordado || 0;
            }

            return {
                servidor: s,
                inscripcion: insc,
                totalPagado: totalP,
                pagos: pagosS,
                debe: costoEsperado - totalP,
                costoEsperado
            };
        })
        .filter(item => {
            const matchesSearch = item.servidor && `${item.servidor.nombre} ${item.servidor.apellido}`.toLowerCase().includes(searchInscribedServidor.toLowerCase());
            const matchesBeca = !showOnlyBecados || (item.inscripcion.tipoBeca !== 'Ninguna');
            const matchesPrecioLocal = !showOnlyPrecioLocal || item.inscripcion.precioEspecialLocal;
            return matchesSearch && matchesBeca && matchesPrecioLocal;
        })
        .sort((a, b) => `${a.servidor!.nombre} ${a.servidor!.apellido}`.localeCompare(`${b.servidor!.nombre} ${b.servidor!.apellido}`));

        return {
            inscritos: adolescentesInscritos,
            inscritosServidores,
            noInscritos: selectedEvent.esParaPadres 
                ? tutores.filter(t => !eventInscripciones.some(i => String(i.tutorId) === String(t.id))).sort((a,b) => a.nombre.localeCompare(b.nombre))
                : adolescentes.filter(a => a.estado === 'Activo' && !eventInscripciones.some(i => String(i.adolescenteId) === String(a.id))).sort((a,b) => a.nombre.localeCompare(b.nombre)),
            noInscritosServidores: servidores.filter(s => !inscripcionesServidores.some(i => String(i.eventoId) === String(selectedEvent.id) && String(i.servidorId) === String(s.id))).sort((a,b) => a.nombre.localeCompare(b.nombre)),
        };
    }, [selectedEvent, adolescentes, tutores, inscripciones, pagos, servidores, inscripcionesServidores, pagosServidores, searchInscribedChico, showOnlyDeudores, showOnlyPagadosFull, searchInscribedServidor, showOnlyBecados, showOnlyPrecioLocal]);

    const handleAddPago = async (inscripcionId: string) => {
        // Limpiamos el valor de posibles puntos de miles que el usuario pueda escribir (Gs. 270.000 -> 270000)
        const rawMonto = String(newPayment[inscripcionId] || '0').replace(/\./g, '');
        const monto = parseFloat(rawMonto);
        const fecha = newPaymentDate[inscripcionId] || new Date().toISOString().split('T')[0];
        const notas = newPaymentNote[inscripcionId] || '';
        
        if (monto <= 0) {
            alert("Por favor, ingrese un monto válido mayor a cero.");
            return;
        }

        setIsSavingPayment(prev => ({ ...prev, [inscripcionId]: true }));
        try {
            await addPago(inscripcionId, monto, fecha, notas);
            setNewPayment(prev => ({ ...prev, [inscripcionId]: '' }));
            setNewPaymentDate(prev => ({ ...prev, [inscripcionId]: '' }));
            setNewPaymentNote(prev => ({ ...prev, [inscripcionId]: '' }));
        } catch (error: any) {
            console.error("Error al registrar pago:", error);
            alert("Hubo un error al grabar el pago: " + (error.message || "Error desconocido."));
        } finally {
            setIsSavingPayment(prev => ({ ...prev, [inscripcionId]: false }));
        }
    };

    const handleAddPagoServidor = async (inscId: string) => {
        const rawMonto = String(newPaymentServidor[inscId] || '0').replace(/\./g, '');
        const monto = parseFloat(rawMonto);
        const fecha = newPaymentDateServidor[inscId] || new Date().toISOString().split('T')[0];
        const notas = newPaymentNoteServidor[inscId] || '';
        
        if (monto <= 0) {
            alert("Por favor, ingrese un monto válido mayor a cero.");
            return;
        }

        setIsSavingPayment(prev => ({ ...prev, [inscId]: true }));
        try {
            await addPagoServidor(inscId, monto, fecha, notas);
            setNewPaymentServidor(prev => ({ ...prev, [inscId]: '' }));
            setNewPaymentDateServidor(prev => ({ ...prev, [inscId]: '' }));
            setNewPaymentNoteServidor(prev => ({ ...prev, [inscId]: '' }));
        } catch (error: any) {
            console.error("Error al registrar pago servidor:", error);
            alert("Hubo un error al grabar el pago: " + (error.message || "Error desconocido."));
        } finally {
            setIsSavingPayment(prev => ({ ...prev, [inscId]: false }));
        }
    };

    const handleTriggerInscripcionServidor = () => {
        if (servidorToInscribe) {
            setRolServidorToInscribe('Apoyo');
            setBecaServidorToInscribe('Ninguna');
            setMontoServidorToInscribe('0');
            setPrecioEspecialToInscribe(false);
            setIglesiaPagaSaldoToInscribe(false);
            setIsAddConditionsModalOpen(true);
        }
    };

    const handleAddInscripcionServidorConfirm = async () => {
        if (selectedEvent && servidorToInscribe) {
            await addInscripcionServidor({
                eventoId: selectedEvent.id,
                servidorId: servidorToInscribe,
                rol: rolServidorToInscribe,
                tipoBeca: becaServidorToInscribe,
                montoAcordado: Number(montoServidorToInscribe),
                iglesiaPagaSaldo: iglesiaPagaSaldoToInscribe,
                precioEspecialLocal: precioEspecialToInscribe
            });
            setIsAddConditionsModalOpen(false);
            setServidorToInscribe('');
        }
    };

    const handleOpenEditInscripcion = (insc: InscripcionServidor) => {
        setEditingInscripcion({ ...insc });
        setIsEditInscripcionModalOpen(true);
    };

    const handleUpdateInscripcionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingInscripcion && selectedEvent) {
            await updateInscripcionServidor(editingInscripcion);
            setIsEditInscripcionModalOpen(false);
            setEditingInscripcion(null);
        }
    };

    // Handlers para eliminación de inscripciones
    const handleConfirmDeleteInscripcion = async () => {
        if (inscripcionToDelete) {
            await deleteInscripcion(inscripcionToDelete.id);
            setInscripcionToDelete(null);
            setIsDeleteInscripcionConfirmOpen(false);
        }
    };

    const handleConfirmDeleteInscripcionServidor = async () => {
        if (inscripcionServidorToDelete) {
            await deleteInscripcionServidor(inscripcionServidorToDelete.id);
            setInscripcionServidorToDelete(null);
            setIsDeleteInscripcionServidorConfirmOpen(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestión de Eventos</h1>
                {hasPermission('eventos', 'create') && (
                    <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-bold shadow-md">
                        + Agregar Evento
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventos.map(evento => {
                    const eventAdoInsc = inscripciones.filter(i => String(i.eventoId) === String(evento.id));
                    const eventSerInsc = inscripcionesServidores.filter(i => String(i.eventoId) === String(evento.id));
                    const costoBase = evento.costoPersona || 0;

                    let totalCobrado = 0;
                    let totalEsperadoReal = 0;
                    let becasMonto = 0;
                    let acuerdosMonto = 0;
                    let cantPagados = 0;
                    let cantConSaldo = 0;
                    let cantBecados = 0;
                    let cantAcuerdos = 0;

                    // Procesar Chicos
                    eventAdoInsc.forEach(i => {
                        const personaPagos = pagos.filter(p => String(p.inscripcionId) === String(i.id)).reduce((sum, p) => sum + p.monto, 0);
                        totalCobrado += personaPagos;
                        totalEsperadoReal += costoBase;
                        if (costoBase - personaPagos <= 0) cantPagados++;
                        else cantConSaldo++;
                    });

                    // Procesar Servidores
                    eventSerInsc.forEach(i => {
                        const personaPagos = pagosServidores.filter(p => String(p.inscripcionServidorId) === String(i.id)).reduce((sum, p) => sum + p.monto, 0);
                        totalCobrado += personaPagos;
                        
                        let miEsperado = costoBase;
                        if (i.precioEspecialLocal) {
                            miEsperado = i.montoAcordado || 0;
                            acuerdosMonto += miEsperado;
                            cantAcuerdos++;
                        } else if (i.tipoBeca === 'Total') {
                            miEsperado = 0;
                            becasMonto += costoBase;
                            cantBecados++;
                        } else if (i.tipoBeca === 'Parcial') {
                            miEsperado = i.montoAcordado || 0;
                            becasMonto += (costoBase - miEsperado);
                            cantBecados++;
                        }

                        totalEsperadoReal += miEsperado;
                        if (miEsperado - personaPagos <= 0) cantPagados++;
                        else cantConSaldo++;
                    });

                    const saldoPendiente = totalEsperadoReal - totalCobrado;
                    const cantTotal = eventAdoInsc.length + eventSerInsc.length;
                    const cantAsistentes = eventAdoInsc.filter(i => i.asistio).length;

                    // Procesar Adhesiones si aplica
                    const eventAdh = entregasAdhesiones.filter(e => String(e.eventoId) === String(evento.id));
                    const totalAdhEntregadas = eventAdh.reduce((sum, e) => sum + e.cantidadEntradas, 0);
                    const totalAdhRecaudado = pagosAdhesiones.filter(p => eventAdh.some(e => String(e.id) === String(p.entregaAdhesionId))).reduce((sum, p) => sum + p.monto, 0);
                    const totalAdhVenta = totalAdhEntregadas * (evento.precioVentaUnitario || 0);
                    const totalAdhSaldo = totalAdhVenta - totalAdhRecaudado;

                    return (
                        <div key={evento.id} className={`bg-surface p-5 rounded-lg shadow-lg flex flex-col justify-between cursor-pointer hover:ring-2 ring-primary transition-all relative group ${evento.finalizado ? 'opacity-80' : ''}`} onClick={() => { setSelectedEvent(evento); if (evento.esVentaAdhesiones) { setActiveTabModal('adhesiones'); } else { setActiveTabModal('chicos'); } }}>
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col">
                                        <h2 className="text-xl font-bold text-text-primary pr-12 line-clamp-1">{evento.tema}</h2>
                                        {evento.finalizado && (
                                            <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest w-max mt-1 border border-red-500/50">Finalizado</span>
                                        )}
                                    </div>
                                    <div className="absolute top-4 right-4 flex space-x-1">
                                        {hasPermission('eventos', 'update') && <button onClick={(e) => openModalForEdit(e, evento)} className="bg-gray-700 text-white p-2 rounded-md hover:bg-gray-600 transition shadow" title="Editar Evento"><PencilIcon className="w-4 h-4" /></button>}
                                        {hasPermission('eventos', 'delete') && <button onClick={(e) => handleDeleteClick(e, evento)} className="bg-red-600/80 text-white p-2 rounded-md hover:bg-red-600 transition shadow" title="Borrar Evento"><TrashIcon className="w-4 h-4" /></button>}
                                    </div>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <p className="text-xs text-text-secondary uppercase font-bold tracking-widest">{evento.lugar}</p>
                                    <p className="text-sm text-text-secondary">{formatDate(evento.fechaInicio)} {evento.horaInicio ? ` - ${evento.horaInicio}` : ''}</p>
                                </div>
                                
                                {evento.esVentaAdhesiones ? (
                                    <div className="space-y-3 bg-background/40 p-3 rounded-lg border border-primary/30">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary border-b border-border/30 pb-1.5">
                                            <TicketIcon className="w-4 h-4" /> Venta de Adhesiones / Entradas
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-[9px] text-text-secondary uppercase font-bold block">Entradas Totales</span>
                                                <span className="font-bold text-text-primary">{evento.cantidadTotalEntradas || 0} ent.</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-text-secondary uppercase font-bold block">Entregadas</span>
                                                <span className="font-bold text-indigo-400">{totalAdhEntregadas} ent.</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-text-secondary uppercase font-bold block">Recaudado</span>
                                                <span className="font-bold text-green-400">{formatCurrency(totalAdhRecaudado)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-text-secondary uppercase font-bold block">Saldo Pendiente</span>
                                                <span className={`font-bold ${totalAdhSaldo > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(totalAdhSaldo)}</span>
                                            </div>
                                        </div>
                                        <div className="pt-1.5 border-t border-border/30">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedEvent(evento);
                                                    setActiveTabModal('adhesiones');
                                                    setIsReportModalOpen(true);
                                                }}
                                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
                                            >
                                                <PrinterIcon className="w-3.5 h-3.5" /> Ver / Imprimir Planilla Reporte
                                            </button>
                                        </div>
                                    </div>
                                ) : evento.tieneCosto ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3 bg-background/40 p-3 rounded-lg border border-border/50">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-text-secondary uppercase font-black">Cobrado en Caja</span>
                                                <span className="text-sm font-black text-green-400">{formatCurrency(totalCobrado)}</span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[9px] text-text-secondary uppercase font-black">Saldo Pendiente</span>
                                                <span className={`text-sm font-black ${saldoPendiente > 0 ? 'text-red-400' : 'text-green-500'}`}>{formatCurrency(saldoPendiente)}</span>
                                            </div>
                                            <div className="flex flex-col border-t border-border/20 pt-1">
                                                <span className="text-[9px] text-indigo-300 uppercase font-black">Becas (Iglesia)</span>
                                                <span className="text-xs font-bold text-indigo-400">{formatCurrency(becasMonto)}</span>
                                            </div>
                                            <div className="flex flex-col text-right border-t border-border/20 pt-1">
                                                <span className="text-[9px] text-orange-300 uppercase font-black">Acuerdos Locales</span>
                                                <span className="text-xs font-bold text-orange-400">{formatCurrency(acuerdosMonto)}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="bg-background/20 rounded p-2 text-center border border-border/30">
                                                <p className="text-[8px] uppercase text-text-secondary font-bold">Inscriptos</p>
                                                <p className="text-sm font-black">{cantTotal}</p>
                                            </div>
                                            <div className="bg-background/20 rounded p-2 text-center border border-border/30">
                                                <p className="text-[8px] uppercase text-green-400/70 font-bold">Asistentes</p>
                                                <p className="text-sm font-black text-green-400">{cantAsistentes}</p>
                                            </div>
                                            <div className="bg-background/20 rounded p-2 text-center border border-border/30">
                                                <p className="text-[8px] uppercase text-green-400/70 font-bold">Pagados</p>
                                                <p className="text-sm font-black text-green-400">{cantPagados}</p>
                                            </div>
                                            <div className="bg-background/20 rounded p-2 text-center border border-border/30">
                                                <p className="text-[8px] uppercase text-red-400/70 font-bold">Con Saldo</p>
                                                <p className="text-sm font-black text-red-400">{cantConSaldo}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="bg-background/20 rounded p-3 text-center border border-border/30">
                                            <p className="text-[10px] uppercase text-text-secondary font-bold mb-1">Inscriptos</p>
                                            <p className="text-2xl font-black text-primary">{cantTotal}</p>
                                        </div>
                                        <div className="bg-background/20 rounded p-3 text-center border border-border/30">
                                            <p className="text-[10px] uppercase text-green-400/70 font-bold mb-1">Asistentes</p>
                                            <p className="text-2xl font-black text-green-400">{cantAsistentes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-[10px]">
                                <span className="text-text-secondary uppercase italic">Click para gestionar</span>
                                <div className="flex gap-1 flex-wrap justify-end">
                                    {evento.esParaPadres && (
                                        <span className="font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                            Para Padres
                                        </span>
                                    )}
                                    {evento.esVentaAdhesiones ? (
                                        <span className="font-black uppercase px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                                            <TicketIcon className="w-3 h-3" /> Venta Adhesiones
                                        </span>
                                    ) : (
                                        <span className={`font-black uppercase px-2 py-0.5 rounded ${evento.tieneCosto ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                            {evento.tieneCosto ? 'Evento con Costo' : 'Gratuito'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title={editingEvent ? "Editar Evento" : "Crear Nuevo Evento"}>
                <form onSubmit={handleEventSubmit} className="space-y-4">
                    <InputField label="Tema / Título del Evento" name="tema" value={values.tema} onChange={handleInputChange} required />
                    <InputField label="Lugar" name="lugar" value={values.lugar} onChange={handleInputChange} required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Fecha Inicio" name="fechaInicio" type="date" value={values.fechaInicio} onChange={handleInputChange} required />
                        <InputField label="Hora Inicio" name="horaInicio" type="time" value={values.horaInicio} onChange={handleInputChange} />
                        <InputField label="Fecha Fin" name="fechaFin" type="date" value={values.fechaFin} onChange={handleInputChange} />
                        <InputField label="Hora Fin" name="horaFin" type="time" value={values.horaFin} onChange={handleInputChange} />
                    </div>
                    <CheckboxField label="Este evento es para Padres/Tutores" name="esParaPadres" checked={values.esParaPadres} onChange={handleInputChange} />
                    
                    <div className="p-3 bg-background/30 rounded-lg border border-border/50 space-y-3 mt-2">
                        <CheckboxField label="Es Venta de Adhesiones o Entradas" name="esVentaAdhesiones" checked={values.esVentaAdhesiones} onChange={handleInputChange} />
                        {values.esVentaAdhesiones && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                <InputField label="Costo Unitario (Costo)" name="precioCostoUnitario" type="number" value={values.precioCostoUnitario} onChange={handleInputChange} required={values.esVentaAdhesiones} />
                                <InputField label="Precio Venta Unitario" name="precioVentaUnitario" type="number" value={values.precioVentaUnitario} onChange={handleInputChange} required={values.esVentaAdhesiones} />
                                <InputField label="Cant. Total Entradas" name="cantidadTotalEntradas" type="number" value={values.cantidadTotalEntradas} onChange={handleInputChange} required={values.esVentaAdhesiones} />
                            </div>
                        )}
                    </div>

                    <CheckboxField label="Este evento tiene costo de inscripción" name="tieneCosto" checked={values.tieneCosto || values.esVentaAdhesiones} onChange={handleInputChange} disabled={values.esVentaAdhesiones} />
                    {values.tieneCosto && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Costo Total Proyectado" name="costoTotal" type="number" value={values.costoTotal} onChange={handleInputChange} />
                            <InputField label="Costo por Persona" name="costoPersona" type="number" value={values.costoPersona} onChange={handleInputChange} required />
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
                        <button type="button" onClick={() => setIsEventModalOpen(false)} className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-bold transition-all">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-8 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all">
                            {editingEvent ? 'Actualizar Evento' : 'Crear Evento'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación de Evento"
                message={<>¿Estás seguro de que deseas eliminar el evento <strong>{eventToDelete?.tema}</strong>? Esta acción es irreversible y borrará todos los pagos e inscripciones asociados.</>}
                confirmText="Eliminar Evento"
            />

            {selectedEvent && eventDetails && (
                <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={`Gestionar: ${selectedEvent.tema}`} size="4xl">
                    <div className="space-y-6">
                        <div className="flex border-b border-border overflow-x-auto">
                            {selectedEvent.esVentaAdhesiones && (
                                <button onClick={() => setActiveTabModal('adhesiones')} className={`px-4 py-2 font-bold transition flex items-center gap-2 whitespace-nowrap ${activeTabModal === 'adhesiones' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>
                                    <TicketIcon className="w-4 h-4" /> Venta de Adhesiones / Entradas ({eventAdhesionesDetails?.eventEntregas.length || 0})
                                </button>
                            )}
                            <button onClick={() => setActiveTabModal('chicos')} className={`px-4 py-2 font-bold transition whitespace-nowrap ${activeTabModal === 'chicos' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>{selectedEvent.esParaPadres ? 'Tutores' : 'Chicos'} ({eventDetails.inscritos.length})</button>
                            <button onClick={() => setActiveTabModal('servidores')} className={`px-4 py-2 font-bold transition whitespace-nowrap ${activeTabModal === 'servidores' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>Servidores Apoyo ({eventDetails.inscritosServidores.length})</button>
                        </div>

                        {activeTabModal === 'adhesiones' && eventAdhesionesDetails && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Resumen Financiero y Contadores */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-background/30 p-4 rounded-xl border border-border/50">
                                    <div className="bg-surface p-3 rounded-lg border border-border/30">
                                        <p className="text-[10px] text-text-secondary font-bold uppercase">Entradas Entregadas</p>
                                        <p className="text-xl font-black text-primary">{eventAdhesionesDetails.totalEntradasEntregadas} / {eventAdhesionesDetails.cantTotalEntradas}</p>
                                        <p className="text-[10px] text-text-secondary mt-1">Disponibles: <strong className="text-emerald-400">{eventAdhesionesDetails.totalEntradasDisponibles}</strong></p>
                                    </div>
                                    <div className="bg-surface p-3 rounded-lg border border-border/30">
                                        <p className="text-[10px] text-text-secondary font-bold uppercase">Monto Entregado (Venta)</p>
                                        <p className="text-xl font-black text-indigo-400">{formatCurrency(eventAdhesionesDetails.montoEntregadoVentaTotal)}</p>
                                        <p className="text-[10px] text-text-secondary mt-1">Total Esperado: {formatCurrency(eventAdhesionesDetails.montoEsperadoRecaudar)}</p>
                                    </div>
                                    <div className="bg-surface p-3 rounded-lg border border-border/30">
                                        <p className="text-[10px] text-text-secondary font-bold uppercase">Recaudado (En Caja)</p>
                                        <p className="text-xl font-black text-green-400">{formatCurrency(eventAdhesionesDetails.totalRecaudadoReal)}</p>
                                        <p className="text-[10px] text-text-secondary mt-1">Costo Evento: {formatCurrency(eventAdhesionesDetails.montoCostoTotalEvento)}</p>
                                    </div>
                                    <div className="bg-surface p-3 rounded-lg border border-border/30">
                                        <p className="text-[10px] text-text-secondary font-bold uppercase">Saldo por Cobrar</p>
                                        <p className={`text-xl font-black ${eventAdhesionesDetails.totalSaldoPendienteCobrar > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(eventAdhesionesDetails.totalSaldoPendienteCobrar)}</p>
                                        <p className="text-[10px] text-emerald-400 font-bold mt-1">Utilidad Est.: {formatCurrency(eventAdhesionesDetails.gananciaEstimada)}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-xs text-text-secondary font-semibold">Costo unitario: {formatCurrency(eventAdhesionesDetails.precioCosto)} | Precio venta: {formatCurrency(eventAdhesionesDetails.precioVenta)}</span>
                                    <button onClick={() => setIsReportModalOpen(true)} className="bg-purple-600/90 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-purple-700 transition shadow">
                                        <PrinterIcon className="w-4 h-4" /> Generar Reporte de Adhesiones
                                    </button>
                                </div>

                                {/* Formulario para Registrar Nueva Entrega */}
                                {hasPermission('eventos', 'update') && (
                                    <form onSubmit={handleCreateEntregaAdhesion} className="bg-background/40 p-4 rounded-xl border border-border/50 space-y-3">
                                        <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                            <TicketIcon className="w-4 h-4" /> Registrar Entrega de Adhesiones / Entradas
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-text-secondary mb-1">Nombre Completo de la Persona *</label>
                                                <input type="text" required placeholder="Ej: Juan Pérez" value={newEntregaPersona} onChange={e => setNewEntregaPersona(e.target.value)} className="w-full bg-surface border border-border p-2 text-sm rounded outline-none focus:ring-1 ring-primary" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-text-secondary mb-1">Fecha de Entrega *</label>
                                                <input type="date" required value={newEntregaFecha} onChange={e => setNewEntregaFecha(e.target.value)} className="w-full bg-surface border border-border p-2 text-sm rounded outline-none focus:ring-1 ring-primary" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-text-secondary mb-1">Número de Entradas *</label>
                                                <input type="number" min="1" required placeholder="Ej: 5" value={newEntregaCantidad} onChange={e => setNewEntregaCantidad(e.target.value)} className="w-full bg-surface border border-border p-2 text-sm rounded outline-none focus:ring-1 ring-primary" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-text-secondary mb-1">Números Entregados</label>
                                                <div className="flex gap-1.5">
                                                    <input type="text" placeholder="Ej: 001 al 005" value={newEntregaNumeros} onChange={e => setNewEntregaNumeros(e.target.value)} className="flex-1 min-w-0 bg-surface border border-border p-2 text-sm rounded outline-none focus:ring-1 ring-primary" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setTicketSelectorTarget('create');
                                                            setIsTicketSelectorOpen(true);
                                                        }}
                                                        className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white px-2.5 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                                                        title="Seleccionar entradas estilo cine"
                                                    >
                                                        <TicketIcon className="w-4 h-4" /> Seleccionar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-3 bg-surface/50 border border-border/30 rounded-lg space-y-2">
                                            <p className="text-[11px] font-bold text-text-secondary uppercase">Pago Inicial (Opcional en el momento de entrega)</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <input type="number" min="0" placeholder="Monto pagado hoy" value={newEntregaPagoInicial} onChange={e => setNewEntregaPagoInicial(e.target.value)} className="w-full bg-background border border-border p-2 text-xs rounded outline-none focus:ring-1 ring-primary" />
                                                </div>
                                                <div>
                                                    <input type="text" placeholder="¿Quién recibió el pago?" value={newEntregaQuienEntrego} onChange={e => setNewEntregaQuienEntrego(e.target.value)} className="w-full bg-background border border-border p-2 text-xs rounded outline-none focus:ring-1 ring-primary" />
                                                </div>
                                                <div>
                                                    <input type="text" placeholder="Notas / Observaciones" value={newEntregaNotasPago} onChange={e => setNewEntregaNotasPago(e.target.value)} className="w-full bg-background border border-border p-2 text-xs rounded outline-none focus:ring-1 ring-primary" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2">
                                            {newEntregaCantidad ? (
                                                <span className="text-xs font-semibold text-text-secondary">
                                                    Monto total a cobrar: <strong className="text-indigo-400">{formatCurrency(Number(newEntregaCantidad) * (selectedEvent.precioVentaUnitario || 0))}</strong>
                                                </span>
                                            ) : <span />}
                                            <button type="submit" disabled={isSavingEntrega || !newEntregaPersona || !newEntregaCantidad} className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold shadow hover:bg-indigo-700 disabled:opacity-50 transition">
                                                {isSavingEntrega ? 'Guardando...' : '+ Registrar Entrega'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Lista de Entregas */}
                                <div className="space-y-3">
                                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                                        <div className="relative flex-1 w-full">
                                            <input type="text" placeholder="🔍 Buscar por nombre de persona..." value={searchAdhesionPersona} onChange={e => setSearchAdhesionPersona(e.target.value)} className="w-full bg-background border border-border p-2 pl-10 rounded-md text-sm outline-none focus:ring-1 ring-primary" />
                                            <UsersIcon className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
                                        </div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60 whitespace-nowrap">
                                            <input type="checkbox" checked={showOnlyAdhesionPendientes} onChange={e => setShowOnlyAdhesionPendientes(e.target.checked)} className="h-4 w-4 text-primary rounded border-border" />
                                            <span>Solo Personas con Saldo Pendiente</span>
                                        </label>
                                    </div>

                                    <div className="max-h-[450px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                        {eventAdhesionesDetails.entregasConPagos.length === 0 ? (
                                            <div className="text-center p-8 bg-background/20 rounded-lg border border-border/30 text-text-secondary text-sm italic">
                                                No hay entregas registradas que coincidan con la búsqueda.
                                            </div>
                                        ) : (
                                            eventAdhesionesDetails.entregasConPagos.map(item => (
                                                <div key={item.entrega.id} className="bg-background/20 p-4 rounded-xl border border-border space-y-3">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="font-bold text-base text-text-primary">{item.entrega.nombrePersona}</p>
                                                                <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded border border-primary/30">
                                                                    {item.entrega.cantidadEntradas} entradas
                                                                </span>
                                                                {item.entrega.numerosEntradas && (
                                                                    <span className="text-[10px] bg-surface text-text-secondary px-2 py-0.5 rounded border border-border">
                                                                        Nº: {item.entrega.numerosEntradas}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-text-secondary mt-1">
                                                                Entrega: {formatDate(item.entrega.fechaEntrega)} | Total A Pagar: <strong>{formatCurrency(item.totalAbonar)}</strong>
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <p className="text-xs text-text-secondary">Pagado: <span className="font-bold text-green-400">{formatCurrency(item.totalPagado)}</span></p>
                                                                <p className="text-xs">Saldo: <span className={item.saldoPendiente > 0 ? 'font-bold text-red-400' : 'font-bold text-emerald-400'}>{item.saldoPendiente > 0 ? formatCurrency(item.saldoPendiente) : 'SALDADO'}</span></p>
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => toggleHistory('adh', item.entrega.id)} className="text-[10px] uppercase font-bold text-primary hover:underline px-2 py-1 rounded bg-primary/10">
                                                                    {expandedHistory[`adh-${item.entrega.id}`] ? 'Ocultar Pagos' : 'Pagos'}
                                                                </button>
                                                                {hasPermission('eventos', 'update') && (
                                                                    <button onClick={() => { setEditingEntrega({ ...item.entrega }); setIsEditEntregaModalOpen(true); }} className="text-indigo-400 hover:text-indigo-300 p-1.5 rounded hover:bg-surface" title="Editar Entrega">
                                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                {hasPermission('eventos', 'delete') && (
                                                                    <button onClick={() => { setEntregaToDelete(item.entrega); setIsDeleteEntregaConfirmOpen(true); }} className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-surface" title="Eliminar Entrega">
                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Historial de Pagos de la Entrega */}
                                                    {expandedHistory[`adh-${item.entrega.id}`] && (
                                                        <div className="bg-background/60 p-3 rounded-lg border border-border/50 text-xs space-y-2 animate-fade-in">
                                                            <p className="font-bold text-text-secondary uppercase text-[10px]">Historial de Pagos Registrados</p>
                                                            <table className="min-w-full text-[11px]">
                                                                <thead>
                                                                    <tr className="text-left text-text-secondary border-b border-border/30">
                                                                        <th className="pb-1">Fecha</th>
                                                                        <th className="pb-1">Monto</th>
                                                                        <th className="pb-1">Entregado a</th>
                                                                        <th className="pb-1">Notas</th>
                                                                        <th className="pb-1 text-right"></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-border/20">
                                                                    {item.pagos.map(p => (
                                                                        <tr key={p.id} className="hover:bg-primary/5">
                                                                            <td className="py-1 font-mono">{formatDate(p.fechaPago)}</td>
                                                                            <td className="py-1 font-bold text-green-400">{formatCurrency(p.monto)}</td>
                                                                            <td className="py-1">{p.registradoPor || '-'}</td>
                                                                            <td className="py-1 italic text-text-secondary">{p.notas || '-'}</td>
                                                                            <td className="py-1 text-right">
                                                                                {hasPermission('eventos', 'delete') && (
                                                                                    <button onClick={() => deletePagoAdhesion(p.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded">
                                                                                        <TrashIcon className="w-3 h-3" />
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                    {item.pagos.length === 0 && (
                                                                        <tr><td colSpan={5} className="py-2 text-center italic text-text-secondary">No hay pagos registrados para esta persona.</td></tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}

                                                    {/* Formulario para Abonar */}
                                                    {item.saldoPendiente > 0 && hasPermission('eventos', 'update') && (
                                                        <div className="pt-2 border-t border-border/30 flex flex-col sm:flex-row gap-2 items-center">
                                                            <input 
                                                                type="number" 
                                                                min="1" 
                                                                max={item.saldoPendiente} 
                                                                placeholder="Monto a cobrar" 
                                                                value={newAdhesionPayment[item.entrega.id] || ''} 
                                                                onChange={e => setNewAdhesionPayment({ ...newAdhesionPayment, [item.entrega.id]: e.target.value })} 
                                                                className="w-full sm:w-32 bg-surface border border-border p-1.5 text-xs rounded outline-none focus:ring-1 ring-primary" 
                                                            />
                                                            <input 
                                                                type="date" 
                                                                value={newAdhesionPaymentDate[item.entrega.id] || new Date().toISOString().split('T')[0]} 
                                                                onChange={e => setNewAdhesionPaymentDate({ ...newAdhesionPaymentDate, [item.entrega.id]: e.target.value })} 
                                                                className="w-full sm:w-32 bg-surface border border-border p-1.5 text-xs rounded outline-none focus:ring-1 ring-primary" 
                                                            />
                                                            <input 
                                                                type="text" 
                                                                placeholder="Cobrado por..." 
                                                                value={newAdhesionPaymentQuien[item.entrega.id] || ''} 
                                                                onChange={e => setNewAdhesionPaymentQuien({ ...newAdhesionPaymentQuien, [item.entrega.id]: e.target.value })} 
                                                                className="w-full sm:flex-1 bg-surface border border-border p-1.5 text-xs rounded outline-none focus:ring-1 ring-primary" 
                                                            />
                                                            <input 
                                                                type="text" 
                                                                placeholder="Notas..." 
                                                                value={newAdhesionPaymentNote[item.entrega.id] || ''} 
                                                                onChange={e => setNewAdhesionPaymentNote({ ...newAdhesionPaymentNote, [item.entrega.id]: e.target.value })} 
                                                                className="w-full sm:flex-1 bg-surface border border-border p-1.5 text-xs rounded outline-none focus:ring-1 ring-primary" 
                                                            />
                                                            <button 
                                                                onClick={() => handleAddPagoAdhesionItem(item.entrega.id)} 
                                                                disabled={isSavingPayment[item.entrega.id] || !newAdhesionPayment[item.entrega.id]} 
                                                                className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition whitespace-nowrap"
                                                            >
                                                                Registrar Pago
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTabModal === 'chicos' ? (
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-4 p-4 bg-background/30 rounded-lg border border-border/50">
                                    <div className="relative flex-1">
                                        <input type="text" placeholder="🔍 Buscar por nombre..." value={searchInscribedChico} onChange={(e) => setSearchInscribedChico(e.target.value)} className="w-full bg-background border border-border p-2 pl-10 rounded-md text-sm outline-none focus:ring-1 ring-primary" />
                                        <UsersIcon className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {selectedEvent.esParaPadres && (
                                            <button 
                                                onClick={async () => {
                                                    const promises = eventDetails.inscritos
                                                        .filter(i => !i.inscripcion.asistio)
                                                        .map(i => updateInscripcion({ ...i.inscripcion, asistio: true }));
                                                    await Promise.all(promises);
                                                }}
                                                className="bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-2 rounded-md border border-green-500/50 text-xs font-bold transition-colors"
                                            >
                                                Marcar todos Asistió
                                            </button>
                                        )}
                                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60">
                                            <input type="checkbox" checked={showOnlyDeudores} onChange={(e) => { setShowOnlyDeudores(e.target.checked); if(e.target.checked) setShowOnlyPagadosFull(false); }} className="h-4 w-4 text-primary rounded border-border" />
                                            <span>Solo con Deuda</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60">
                                            <input type="checkbox" checked={showOnlyPagadosFull} onChange={(e) => { setShowOnlyPagadosFull(e.target.checked); if(e.target.checked) setShowOnlyDeudores(false); }} className="h-4 w-4 text-primary rounded border-border" />
                                            <span>Solo Pagados</span>
                                        </label>
                                    </div>
                                </div>
                                {hasPermission('inscripciones_eventos', 'create') && (
                                    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-background/30 rounded-lg">
                                        <select value={adolescenteToInscribe} onChange={e => setAdolescenteToInscribe(e.target.value)} className="flex-1 bg-surface border border-border rounded-md p-2 text-sm">
                                            <option value="">-- Inscribir Nuevo {selectedEvent.esParaPadres ? 'Tutor' : 'Adolescente'} --</option>
                                            {eventDetails.noInscritos.map(ado => <option key={ado.id} value={ado.id}>{ado.nombre} {ado.apellido}</option>)}
                                        </select>
                                        <button onClick={() => { 
                                            if (selectedEvent && adolescenteToInscribe) {
                                                if (selectedEvent.esParaPadres) {
                                                    addInscripcion(selectedEvent.id, undefined, adolescenteToInscribe);
                                                } else {
                                                    addInscripcion(selectedEvent.id, adolescenteToInscribe, undefined);
                                                }
                                            }
                                            setAdolescenteToInscribe(''); 
                                        }} disabled={!adolescenteToInscribe} className="bg-primary text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 whitespace-nowrap">Inscribir</button>
                                    </div>
                                )}
                                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                    {eventDetails.inscritos.map(item => (
                                        <div key={item.inscripcion.id} className="bg-background/20 p-4 rounded-lg border border-border">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-lg">{item.persona?.nombre} {item.persona?.apellido}</p>
                                                        {hasPermission('inscripciones_eventos', 'delete') && (
                                                            <button 
                                                                onClick={() => { setInscripcionToDelete(item.inscripcion); setIsDeleteInscripcionConfirmOpen(true); }}
                                                                className="text-red-500 hover:text-red-400 p-1"
                                                                title="Eliminar Inscripción"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {selectedEvent.tieneCosto && (
                                                        <p className="text-xs text-text-secondary">Pagado: {formatCurrency(item.totalPagado)} | Deuda: <span className={item.debe > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>{formatCurrency(item.debe)}</span></p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {selectedEvent.tieneCosto && (
                                                        <button onClick={() => toggleHistory('ado', item.inscripcion.id)} className={`text-[10px] uppercase font-black transition-colors ${expandedHistory[`ado-${item.inscripcion.id}`] ? 'text-text-primary' : 'text-primary hover:underline'}`}>
                                                            {expandedHistory[`ado-${item.inscripcion.id}`] ? 'Cerrar Historial' : 'Ver Historial'}
                                                        </button>
                                                    )}
                                                    {selectedEvent.esParaPadres && (
                                                        <label className="flex items-center gap-2 cursor-pointer bg-background/50 px-3 py-1.5 rounded-md border border-border/50 hover:bg-background/80 transition-colors">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={item.inscripcion.asistio || false} 
                                                                onChange={(e) => {
                                                                    updateInscripcion({ ...item.inscripcion, asistio: e.target.checked });
                                                                }}
                                                                className="h-4 w-4 text-green-500 rounded border-border focus:ring-green-500 bg-background"
                                                            />
                                                            <span className={`text-xs font-bold uppercase ${item.inscripcion.asistio ? 'text-green-400' : 'text-text-secondary'}`}>
                                                                {item.inscripcion.asistio ? 'Asistió' : 'No Asistió'}
                                                            </span>
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                            {expandedHistory[`ado-${item.inscripcion.id}`] && selectedEvent.tieneCosto && (
                                                <div className="mb-4 bg-background/50 rounded-lg border border-border/50 overflow-hidden animate-fade-in">
                                                    <table className="min-w-full text-[11px]">
                                                        <tbody className="divide-y divide-border/20">
                                                            {item.pagos.map(p => (
                                                                <tr key={p.id} className="hover:bg-primary/5">
                                                                    <td className="p-2 font-mono text-text-secondary">{formatDate(p.fecha)}</td>
                                                                    <td className="p-2 font-bold text-green-400">{formatCurrency(p.monto)}</td>
                                                                    <td className="p-2 italic text-text-secondary">{p.notas || '-'}</td>
                                                                    <td className="p-2 text-right">
                                                                        {hasPermission('pagos_eventos', 'delete') && (
                                                                            <button onClick={() => deletePago(p.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {item.pagos.length === 0 && <tr><td colSpan={4} className="p-4 text-center italic text-text-secondary">No hay pagos registrados.</td></tr>}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            {selectedEvent.tieneCosto && item.debe > 0 && hasPermission('pagos_eventos', 'create') && (
                                                <div className="space-y-2">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="number" 
                                                            placeholder="Monto" 
                                                            value={newPayment[item.inscripcion.id] || ''} 
                                                            onChange={e => setNewPayment({...newPayment, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="flex-1 bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                        <input 
                                                            type="date" 
                                                            value={newPaymentDate[item.inscripcion.id] || new Date().toISOString().split('T')[0]} 
                                                            onChange={e => setNewPaymentDate({...newPaymentDate, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="w-32 bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Observaciones / Notas" 
                                                            value={newPaymentNote[item.inscripcion.id] || ''} 
                                                            onChange={e => setNewPaymentNote({...newPaymentNote, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="flex-1 bg-surface border border-border p-1.5 text-xs rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                        <button 
                                                            onClick={() => handleAddPago(item.inscripcion.id)} 
                                                            disabled={isSavingPayment[item.inscripcion.id] || !newPayment[item.inscripcion.id]}
                                                            className={`bg-secondary text-white px-4 py-1 rounded text-sm font-bold shadow-md hover:bg-emerald-600 transition-colors flex items-center gap-2 ${isSavingPayment[item.inscripcion.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {isSavingPayment[item.inscripcion.id] ? <RefreshIcon className="w-4 h-4 animate-spin" /> : null}
                                                            Abonar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-4">
                                    <div className="relative flex-1 w-full">
                                        <input type="text" placeholder="🔍 Buscar servidor inscripto..." value={searchInscribedServidor} onChange={(e) => setSearchInscribedServidor(e.target.value)} className="w-full bg-background border border-border p-2 pl-10 rounded-md text-sm outline-none focus:ring-1 ring-primary" />
                                        <UsersIcon className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60">
                                            <input type="checkbox" checked={showOnlyBecados} onChange={(e) => setShowOnlyBecados(e.target.checked)} className="h-4 w-4 text-primary rounded border-border" />
                                            <span>Solo Becados</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60">
                                            <input type="checkbox" checked={showOnlyPrecioLocal} onChange={(e) => setShowOnlyPrecioLocal(e.target.checked)} className="h-4 w-4 text-primary rounded border-border" />
                                            <span>Solo Acuerdo Local</span>
                                        </label>
                                    </div>
                                </div>
                                {hasPermission('inscripciones_servidores', 'create') && (
                                    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-background/30 rounded-lg">
                                        <select value={servidorToInscribe} onChange={e => setServidorToInscribe(e.target.value)} className="flex-1 bg-surface border border-border rounded-md p-2 text-sm">
                                            <option value="">-- Seleccionar Servidor --</option>
                                            {eventDetails.noInscritosServidores.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>)}
                                        </select>
                                        <button onClick={handleTriggerInscripcionServidor} disabled={!servidorToInscribe} className="bg-primary text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 whitespace-nowrap">Inscribir</button>
                                    </div>
                                )}
                                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                    {eventDetails.inscritosServidores.map(item => (
                                        <div key={item.inscripcion.id} className="bg-background/20 p-4 rounded-lg border border-border">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-lg">{item.servidor!.nombre} {item.servidor!.apellido}</p>
                                                        <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded uppercase font-bold">{item.inscripcion.rol}</span>
                                                        {hasPermission('inscripciones_servidores', 'delete') && (
                                                            <button 
                                                                onClick={() => { setInscripcionServidorToDelete(item.inscripcion); setIsDeleteInscripcionServidorConfirmOpen(true); }}
                                                                className="text-red-500 hover:text-red-400 p-1"
                                                                title="Eliminar Inscripción Servidor"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-text-secondary mt-1">Pagado: {formatCurrency(item.totalPagado)} / Compromiso: {formatCurrency(item.costoEsperado)}{item.debe > 0 && <span className="ml-2 text-red-400 font-bold">Adeuda: {formatCurrency(item.debe)}</span>}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <button onClick={() => toggleHistory('ser', item.inscripcion.id)} className="text-[10px] text-primary font-black uppercase hover:underline">{expandedHistory[`ser-${item.inscripcion.id}`] ? 'Ocultar Pagos' : 'Historial Pagos'}</button>
                                                    <button onClick={() => handleOpenEditInscripcion(item.inscripcion)} className="text-[10px] text-indigo-400 uppercase font-bold hover:underline flex items-center gap-1"><PencilIcon className="w-3.5 h-3.5" /> Editar</button>
                                                </div>
                                            </div>
                                            {expandedHistory[`ser-${item.inscripcion.id}`] && (
                                                <div className="my-3 bg-background/50 rounded-lg border border-border/50 overflow-hidden animate-fade-in">
                                                    <table className="min-w-full text-[11px]">
                                                        <tbody className="divide-y divide-border/20">
                                                            {item.pagos.map(p => (
                                                                <tr key={p.id} className="hover:bg-primary/5">
                                                                    <td className="p-2 font-mono text-text-secondary">{formatDate(p.fecha)}</td>
                                                                    <td className="p-2 font-bold text-green-400">{formatCurrency(p.monto)}</td>
                                                                    <td className="p-2 italic text-text-secondary">{p.notas || '-'}</td>
                                                                    <td className="p-2 text-right">
                                                                        {hasPermission('pagos_servidores', 'delete') && (
                                                                            <button onClick={() => deletePagoServidor(p.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded"><TrashIcon className="w-3.5 h-3.5" /></button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            {item.inscripcion.tipoBeca !== 'Total' && item.debe > 0 && hasPermission('pagos_servidores', 'create') && (
                                                <div className="space-y-2 mt-3">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="number" 
                                                            placeholder="Monto" 
                                                            value={newPaymentServidor[item.inscripcion.id] || ''} 
                                                            onChange={e => setNewPaymentServidor({...newPaymentServidor, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="flex-1 bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                        <input 
                                                            type="date" 
                                                            value={newPaymentDateServidor[item.inscripcion.id] || new Date().toISOString().split('T')[0]} 
                                                            onChange={e => setNewPaymentDateServidor({...newPaymentDateServidor, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="w-32 bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Observaciones / Notas" 
                                                            value={newPaymentNoteServidor[item.inscripcion.id] || ''} 
                                                            onChange={e => setNewPaymentNoteServidor({...newPaymentNoteServidor, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="flex-1 bg-surface border border-border p-1.5 text-xs rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                        <button 
                                                            onClick={() => handleAddPagoServidor(item.inscripcion.id)} 
                                                            disabled={isSavingPayment[item.inscripcion.id] || !newPaymentServidor[item.inscripcion.id]}
                                                            className={`bg-secondary text-white px-4 py-1 rounded text-sm font-bold shadow-md hover:bg-emerald-600 transition-colors flex items-center gap-2 ${isSavingPayment[item.inscripcion.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {isSavingPayment[item.inscripcion.id] ? <RefreshIcon className="w-4 h-4 animate-spin" /> : null}
                                                            Abonar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-4 border-t border-border">
                            <div>
                                {selectedEvent.finalizado ? (
                                    <button 
                                        onClick={() => updateEvento({ ...selectedEvent, finalizado: false }).then(() => setSelectedEvent({ ...selectedEvent, finalizado: false }))} 
                                        className="bg-yellow-500/20 text-yellow-500 px-4 py-2 rounded-lg hover:bg-yellow-500/30 font-bold border border-yellow-500/50 transition-colors"
                                    >
                                        Reabrir Evento
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => updateEvento({ ...selectedEvent, finalizado: true }).then(() => setSelectedEvent({ ...selectedEvent, finalizado: true }))} 
                                        className="bg-red-500/20 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500/30 font-bold border border-red-500/50 transition-colors"
                                    >
                                        Finalizar Evento
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-bold">Cerrar Gestión</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL PARA INDICAR CONDICIONES AL INSCRIBIR NUEVO SERVIDOR */}
            <Modal isOpen={isAddConditionsModalOpen} onClose={() => setIsAddConditionsModalOpen(false)} title="Condiciones de Inscripción">
                <div className="space-y-4">
                    <div className="bg-background/50 p-4 rounded-lg mb-4 border border-border/50">
                        <p className="text-xs font-bold text-primary uppercase">Inscribiendo a:</p>
                        <p className="text-xl font-bold">
                            {servidores.find(s => s.id === servidorToInscribe)?.nombre} {servidores.find(s => s.id === servidorToInscribe)?.apellido}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Rol en el Evento</label>
                            <select 
                                value={rolServidorToInscribe} 
                                onChange={e => setRolServidorToInscribe(e.target.value as RolServidor)}
                                className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-primary text-text-primary text-sm"
                            >
                                <option value="Pastor">Pastor</option>
                                <option value="Lider de Color">Lider de Color</option>
                                <option value="Lider de Campamento">Lider de Campamento</option>
                                <option value="Cuidador">Cuidador</option>
                                <option value="Cocina">Cocina</option>
                                <option value="Apoyo">Apoyo</option>
                                <option value="Alabanza">Alabanza</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Tipo de Beca</label>
                            <select 
                                value={becaServidorToInscribe} 
                                onChange={e => setBecaServidorToInscribe(e.target.value as TipoBeca)}
                                className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-primary text-text-primary text-sm"
                            >
                                <option value="Ninguna">Ninguna</option>
                                <option value="Parcial">Beca Parcial</option>
                                <option value="Total">Beca Total (100%)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-background/20 rounded-lg border border-border/40">
                        <div className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                            <input 
                                type="checkbox" 
                                id="chk-local-new"
                                checked={precioEspecialToInscribe} 
                                onChange={e => setPrecioEspecialToInscribe(e.target.checked)}
                                className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background"
                            />
                            <label htmlFor="chk-local-new" className="text-sm font-bold text-orange-400 cursor-pointer">Precio Acuerdo Local</label>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                            <input 
                                type="checkbox" 
                                id="chk-church-new"
                                checked={iglesiaPagaSaldoToInscribe} 
                                onChange={e => setIglesiaPagaSaldoToInscribe(e.target.checked)}
                                className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background"
                            />
                            <label htmlFor="chk-church-new" className="text-sm font-bold text-blue-400 cursor-pointer">Iglesia paga saldo</label>
                        </div>
                    </div>

                    {(becaServidorToInscribe === 'Parcial' || precioEspecialToInscribe) && (
                        <InputField 
                            label="Monto Acordado (Su compromiso a pagar)" 
                            type="number" 
                            value={montoServidorToInscribe} 
                            onChange={e => setMontoServidorToInscribe(e.target.value)}
                        />
                    )}

                    <div className="flex justify-end space-x-3 pt-6 border-t border-border">
                        <button type="button" onClick={() => setIsAddConditionsModalOpen(false)} className="bg-gray-600 text-white px-5 py-2 rounded-lg font-bold">Cancelar</button>
                        <button onClick={handleAddInscripcionServidorConfirm} className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg transition-all hover:bg-indigo-700">Confirmar e Inscribir</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isEditInscripcionModalOpen} onClose={() => setIsEditInscripcionModalOpen(false)} title="Editar Condiciones del Servidor">
                {editingInscripcion && (
                    <form onSubmit={handleUpdateInscripcionSubmit} className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg mb-4 border border-border/50">
                            <p className="text-xs font-bold text-primary uppercase">Servidor:</p>
                            <p className="text-xl font-bold">{servidores.find(s => s.id === editingInscripcion.servidorId)?.nombre} {servidores.find(s => s.id === editingInscripcion.servidorId)?.apellido}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Tipo de Beca</label>
                            <select value={editingInscripcion.tipoBeca} onChange={e => setEditingInscripcion({...editingInscripcion, tipoBeca: e.target.value as TipoBeca})} className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-primary text-text-primary text-sm">
                                <option value="Ninguna">Ninguna</option>
                                <option value="Parcial">Beca Parcial</option>
                                <option value="Total">Beca Total (100%)</option>
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                                <input 
                                    type="checkbox" 
                                    id="chk-local-edit"
                                    checked={editingInscripcion.precioEspecialLocal} 
                                    onChange={e => setEditingInscripcion({...editingInscripcion, precioEspecialLocal: e.target.checked})} 
                                    className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background" 
                                />
                                <label htmlFor="chk-local-edit" className="text-sm font-bold text-orange-400 cursor-pointer">Precio Acuerdo Local</label>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                                <input 
                                    type="checkbox" 
                                    id="chk-church-edit"
                                    checked={editingInscripcion.iglesiaPagaSaldo} 
                                    onChange={e => setEditingInscripcion({...editingInscripcion, iglesiaPagaSaldo: e.target.checked})} 
                                    className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background" 
                                />
                                <label htmlFor="chk-church-edit" className="text-sm font-bold text-blue-400 cursor-pointer">Iglesia paga saldo</label>
                            </div>
                        </div>

                        {(editingInscripcion.tipoBeca === 'Parcial' || editingInscripcion.precioEspecialLocal) && (
                            <InputField label="Monto Acordado (Su compromiso)" type="number" value={editingInscripcion.montoAcordado || 0} onChange={e => setEditingInscripcion({...editingInscripcion, montoAcordado: Number(e.target.value)})} />
                        )}
                        <div className="flex justify-end space-x-3 pt-6 border-t border-border">
                            <button type="button" onClick={() => setIsEditInscripcionModalOpen(false)} className="bg-gray-600 text-white px-5 py-2 rounded-lg font-bold">Cancelar</button>
                            <button type="submit" className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg transition-all hover:bg-indigo-700">Actualizar</button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modales de Confirmación para eliminar inscripciones */}
            <ConfirmationModal
                isOpen={isDeleteInscripcionConfirmOpen}
                onClose={() => setIsDeleteInscripcionConfirmOpen(false)}
                onConfirm={handleConfirmDeleteInscripcion}
                title="Quitar Adolescente del Evento"
                message={<>¿Estás seguro de que quieres quitar al adolescente del evento? Se perderán también sus pagos registrados en este evento.</>}
                confirmText="Quitar del Evento"
            />

            <ConfirmationModal
                isOpen={isDeleteInscripcionServidorConfirmOpen}
                onClose={() => setIsDeleteInscripcionServidorConfirmOpen(false)}
                onConfirm={handleConfirmDeleteInscripcionServidor}
                title="Quitar Servidor del Evento"
                message={<>¿Estás seguro de que quieres quitar a este servidor del evento? Se perderán también sus pagos registrados en este evento.</>}
                confirmText="Quitar del Evento"
            />

            {/* Modal para Editar Entrega de Adhesiones */}
            <Modal isOpen={isEditEntregaModalOpen} onClose={() => setIsEditEntregaModalOpen(false)} title="Editar Entrega de Adhesiones">
                {editingEntrega && (
                    <form onSubmit={handleUpdateEntregaSubmit} className="space-y-4">
                        <InputField label="Nombre de la Persona" value={editingEntrega.nombrePersona} onChange={e => setEditingEntrega({ ...editingEntrega, nombrePersona: e.target.value })} required />
                        <InputField label="Fecha de Entrega" type="date" value={editingEntrega.fechaEntrega} onChange={e => setEditingEntrega({ ...editingEntrega, fechaEntrega: e.target.value })} required />
                        <InputField label="Cantidad de Entradas" type="number" min="1" value={editingEntrega.cantidadEntradas} onChange={e => setEditingEntrega({ ...editingEntrega, cantidadEntradas: Number(e.target.value) })} required />
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Números Entregados</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ej: 001 al 005"
                                    value={editingEntrega.numerosEntradas || ''}
                                    onChange={e => setEditingEntrega({ ...editingEntrega, numerosEntradas: e.target.value })}
                                    className="flex-1 bg-background border border-border px-3 py-2 text-sm rounded outline-none focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTicketSelectorTarget('edit');
                                        setIsTicketSelectorOpen(true);
                                    }}
                                    className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-white px-3 py-2 rounded text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap"
                                    title="Seleccionar entradas estilo cine"
                                >
                                    <TicketIcon className="w-4 h-4" /> Seleccionar
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                            <button type="button" onClick={() => setIsEditEntregaModalOpen(false)} className="bg-gray-600 text-white px-5 py-2 rounded-lg font-bold">Cancelar</button>
                            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-indigo-700">Guardar Cambios</button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal de Selección Interactiva de Entradas Estilo Cine */}
            {selectedEvent && (
                <TicketSelectorModal
                    isOpen={isTicketSelectorOpen}
                    onClose={() => setIsTicketSelectorOpen(false)}
                    totalTickets={selectedEvent.cantidadTotalEntradas || 0}
                    committedNumbers={committedTicketNumbers}
                    initialSelectedNumbers={parseNumeros(
                        ticketSelectorTarget === 'create' ? newEntregaNumeros : editingEntrega?.numerosEntradas
                    )}
                    personName={ticketSelectorTarget === 'create' ? newEntregaPersona : editingEntrega?.nombrePersona}
                    onConfirm={(selectedNums) => {
                        const formattedRange = formatNumerosComprometidos(selectedNums);
                        if (ticketSelectorTarget === 'create') {
                            setNewEntregaNumeros(formattedRange);
                            setNewEntregaCantidad(String(selectedNums.length));
                        } else if (editingEntrega) {
                            setEditingEntrega({
                                ...editingEntrega,
                                numerosEntradas: formattedRange,
                                cantidadEntradas: selectedNums.length > 0 ? selectedNums.length : editingEntrega.cantidadEntradas
                            });
                        }
                    }}
                />
            )}

            {/* Modal de Confirmación para Eliminar Entrega de Adhesiones */}
            <ConfirmationModal
                isOpen={isDeleteEntregaConfirmOpen}
                onClose={() => setIsDeleteEntregaConfirmOpen(false)}
                onConfirm={handleConfirmDeleteEntrega}
                title="Eliminar Entrega de Adhesiones"
                message={<>¿Estás seguro de eliminar la entrega a <strong>{entregaToDelete?.nombrePersona}</strong>? Esto también eliminará todos sus pagos registrados.</>}
                confirmText="Eliminar Entrega"
            />

            {/* Modal del Reporte de Adhesiones Imprimible */}
            {isReportModalOpen && selectedEvent && eventAdhesionesDetails && (
                <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Planilla de Cobros - Adhesiones / Entradas" size="5xl">
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-background/60 p-4 rounded-xl border border-border gap-3 no-print">
                            <div>
                                <h3 className="text-lg font-black text-text-primary">Planilla de Cobros de Entradas</h3>
                                <p className="text-xs text-text-secondary">{selectedEvent.tema} | {selectedEvent.lugar} | {formatDate(selectedEvent.fechaInicio)}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={handleExportPDF} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow hover:bg-purple-700 transition">
                                    <DownloadIcon className="w-4 h-4" /> Descargar PDF
                                </button>
                                <button onClick={handlePrintPlanilla} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow hover:bg-emerald-700 transition">
                                    <PrinterIcon className="w-4 h-4" /> Imprimir Planilla
                                </button>
                                <button onClick={() => setIsReportModalOpen(false)} className="bg-gray-700 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-600 transition">
                                    Cerrar
                                </button>
                            </div>
                        </div>

                        {/* PLANILLA PRINTABLE REPORT CONTAINER (Estilo Excel idéntico a la imagen) */}
                        <div id="printable-report-content" className="printable-report bg-white text-slate-900 p-6 rounded-lg shadow border border-slate-300 font-sans text-xs">
                            {/* Header de la planilla */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-slate-900 pb-4 mb-4 gap-4">
                                <div>
                                    <h1 className="text-base md:text-lg font-black tracking-tight text-slate-900 uppercase">
                                        PLANILLA DE COBROS ENTRADAS: {selectedEvent.tema.toUpperCase()}
                                    </h1>
                                    <p className="text-xs font-bold text-slate-700 mt-1">
                                        {formatDate(selectedEvent.fechaInicio)} {selectedEvent.horaInicio ? `- ${selectedEvent.horaInicio}hs` : ''} | Lugar: {selectedEvent.lugar}
                                    </p>
                                </div>

                                {/* Resumen Superior Derecho (PEDIDO | PAGADO | SALDO) como la imagen del usuario */}
                                <div className="border-2 border-slate-900 rounded overflow-hidden min-w-[280px]">
                                    <div className="grid grid-cols-3 bg-slate-800 text-white text-[10px] font-black uppercase text-center py-1">
                                        <div className="border-r border-slate-700 px-2">PEDIDO</div>
                                        <div className="border-r border-slate-700 px-2">PAGADO</div>
                                        <div className="px-2">SALDO</div>
                                    </div>
                                    <div className="grid grid-cols-3 bg-slate-100 text-slate-900 text-xs font-black text-center py-2">
                                        <div className="border-r border-slate-300 px-2">{formatCurrency(eventAdhesionesDetails.montoEntregadoVentaTotal)}</div>
                                        <div className="border-r border-slate-300 px-2 text-green-700">{formatCurrency(eventAdhesionesDetails.totalRecaudadoReal)}</div>
                                        <div className={`px-2 ${eventAdhesionesDetails.totalSaldoPendienteCobrar > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                            {formatCurrency(eventAdhesionesDetails.totalSaldoPendienteCobrar)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabla de la Planilla estilo Excel (Nro | Fecha | Nombre y Apellido | Cuantas | Números | COSTO TOTAL | ENTREGA(S) | SALDO) */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse border border-slate-900">
                                    <thead>
                                        <tr className="bg-slate-300 text-slate-900 font-black uppercase text-[11px] border-b border-slate-900">
                                            <th className="border border-slate-900 p-2 text-center w-12">Nro</th>
                                            <th className="border border-slate-900 p-2 text-center w-24">Fecha</th>
                                            <th className="border border-slate-900 p-2">Nombre y Apellido</th>
                                            <th className="border border-slate-900 p-2 text-center w-16">Cuantas</th>
                                            <th className="border border-slate-900 p-2 text-center w-28">Números</th>
                                            <th className="border border-slate-900 p-2 text-right w-28">COSTO TOTAL</th>
                                            <th className="border border-slate-900 p-2 text-right w-28">ENTREGA(S)</th>
                                            <th className="border border-slate-900 p-2 text-right w-28">SALDO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eventAdhesionesDetails.allEntregasSorted.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="p-4 text-center text-slate-500 italic border border-slate-900">
                                                    No hay entregas registradas en esta planilla.
                                                </td>
                                            </tr>
                                        ) : (
                                            eventAdhesionesDetails.allEntregasSorted.map((item, idx) => (
                                                <tr key={item.entrega.id} className="hover:bg-slate-100 border-b border-slate-400">
                                                    <td className="border border-slate-900 p-2 text-center font-bold text-slate-700">{idx + 1}</td>
                                                    <td className="border border-slate-900 p-2 text-center font-mono">{formatDate(item.entrega.fechaEntrega)}</td>
                                                    <td className="border border-slate-900 p-2 font-bold text-slate-900">{item.entrega.nombrePersona}</td>
                                                    <td className="border border-slate-900 p-2 text-center font-bold">{item.entrega.cantidadEntradas}</td>
                                                    <td className="border border-slate-900 p-2 text-center font-mono text-slate-700">{item.entrega.numerosEntradas || '-'}</td>
                                                    <td className="border border-slate-900 p-2 text-right font-black text-slate-900">{formatCurrency(item.totalAbonar)}</td>
                                                    <td className={`border border-slate-900 p-2 text-right font-black ${item.totalPagado > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {formatCurrency(item.totalPagado)}
                                                    </td>
                                                    <td className={`border border-slate-900 p-2 text-right font-black ${item.saldoPendiente > 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                                                        {formatCurrency(item.saldoPendiente)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-200 text-slate-900 font-black border-t-2 border-slate-900 uppercase">
                                            <td colSpan={3} className="border border-slate-900 p-2 text-right">TOTALES:</td>
                                            <td className="border border-slate-900 p-2 text-center font-black">
                                                {eventAdhesionesDetails.allEntregasSorted.reduce((s, i) => s + i.entrega.cantidadEntradas, 0)}
                                            </td>
                                            <td className="border border-slate-900 p-2"></td>
                                            <td className="border border-slate-900 p-2 text-right font-black">
                                                {formatCurrency(eventAdhesionesDetails.allEntregasSorted.reduce((s, i) => s + i.totalAbonar, 0))}
                                            </td>
                                            <td className="border border-slate-900 p-2 text-right font-black text-red-600">
                                                {formatCurrency(eventAdhesionesDetails.allEntregasSorted.reduce((s, i) => s + i.totalPagado, 0))}
                                            </td>
                                            <td className="border border-slate-900 p-2 text-right font-black">
                                                {formatCurrency(eventAdhesionesDetails.allEntregasSorted.reduce((s, i) => s + i.saldoPendiente, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-border no-print">
                            <button onClick={() => setIsReportModalOpen(false)} className="bg-gray-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-700">Cerrar Reporte</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Eventos;
