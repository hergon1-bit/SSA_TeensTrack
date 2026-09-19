import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { TemaClase, MaterialAdjunto } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { 
  BookOpen, Plus, Search, Calendar, UserCheck, ArrowUp, ArrowDown, 
  FileText, Link as LinkIcon, File, CheckCircle2, Clock, AlertCircle, 
  Trash2, Edit, ExternalLink, Download, Layers, Check, Sparkles, Filter,
  Globe, Brain, Video
} from 'lucide-react';

const PlanClases: React.FC = () => {
  const { temasClases, encargados, addTemaClase, updateTemaClase, deleteTemaClase } = useData();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission('plan_clases', 'create') || hasPermission('reuniones', 'create');
  const canUpdate = hasPermission('plan_clases', 'update') || hasPermission('reuniones', 'update');
  const canDelete = hasPermission('plan_clases', 'delete') || hasPermission('reuniones', 'delete');

  const [activeTab, setActiveTab] = useState<'candidatos' | 'calendario'>('candidatos');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'todos' | 'desarrollados' | 'pendientes'>('todos');
  const [filterPrioridad, setFilterPrioridad] = useState<'todas' | 'Alta' | 'Media' | 'Baja'>('todas');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTema, setEditingTema] = useState<Partial<TemaClase> | null>(null);

  // Detail Modal State
  const [selectedTemaDetail, setSelectedTemaDetail] = useState<TemaClase | null>(null);

  // Confirm Delete
  const [temaToDelete, setTemaToDelete] = useState<TemaClase | null>(null);

  // Material Upload/Link Temporary State inside Modal
  const [materialesList, setMaterialesList] = useState<MaterialAdjunto[]>([]);
  const [linkNombre, setLinkNombre] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescripcion, setLinkDescripcion] = useState('');
  const [linkTipo, setLinkTipo] = useState<MaterialAdjunto['tipo']>('notebooklm');
  const [showAddLink, setShowAddLink] = useState(false);

  // Sorting & Filtering
  const sortedTemas = useMemo(() => {
    return [...temasClases].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }, [temasClases]);

  const filteredTemas = useMemo(() => {
    return sortedTemas.filter(tema => {
      const matchSearch = 
        tema.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (tema.descripcion && tema.descripcion.toLowerCase().includes(search.toLowerCase())) ||
        (tema.objetivos && tema.objetivos.toLowerCase().includes(search.toLowerCase()));

      const matchEstado = 
        filterEstado === 'todos' ? true :
        filterEstado === 'desarrollados' ? tema.desarrollado :
        !tema.desarrollado;

      const matchPrioridad = 
        filterPrioridad === 'todas' ? true :
        tema.prioridad === filterPrioridad;

      return matchSearch && matchEstado && matchPrioridad;
    });
  }, [sortedTemas, search, filterEstado, filterPrioridad]);

  // Calendar Scheduled Items
  const scheduledTemas = useMemo(() => {
    return sortedTemas
      .filter(t => t.fechaProgramada && t.fechaProgramada.trim() !== '')
      .sort((a, b) => new Date(a.fechaProgramada!).getTime() - new Date(b.fechaProgramada!).getTime());
  }, [sortedTemas]);

  // Stats
  const totalTemas = temasClases.length;
  const desarrolladosCount = temasClases.filter(t => t.desarrollado).length;
  const pendientesCount = totalTemas - desarrolladosCount;
  const programadosCount = scheduledTemas.length;

  // Handlers
  const handleOpenCreateModal = () => {
    const nextOrden = sortedTemas.length > 0 ? Math.max(...sortedTemas.map(t => t.orden || 0)) + 1 : 1;
    setEditingTema({
      titulo: '',
      descripcion: '',
      objetivos: '',
      prioridad: 'Media',
      orden: nextOrden,
      desarrollado: false,
      fechaDesarrollo: '',
      fechaProgramada: '',
      encargadoId: '',
      materiales: [],
      notas: ''
    });
    setMaterialesList([]);
    setShowAddLink(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tema: TemaClase) => {
    setEditingTema({ ...tema });
    setMaterialesList(tema.materiales || []);
    setShowAddLink(false);
    setIsModalOpen(true);
  };

  const handleSaveTema = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTema || !editingTema.titulo) return;

    const payload: Omit<TemaClase, 'id'> = {
      titulo: editingTema.titulo.trim(),
      descripcion: editingTema.descripcion?.trim() || '',
      objetivos: editingTema.objetivos?.trim() || '',
      prioridad: editingTema.prioridad || 'Media',
      orden: Number(editingTema.orden) || 1,
      desarrollado: !!editingTema.desarrollado,
      fechaDesarrollo: editingTema.desarrollado ? (editingTema.fechaDesarrollo || new Date().toISOString().split('T')[0]) : '',
      fechaProgramada: editingTema.fechaProgramada || '',
      encargadoId: editingTema.encargadoId || '',
      materiales: materialesList,
      notas: editingTema.notas?.trim() || ''
    };

    if (editingTema.id) {
      await updateTemaClase({ id: editingTema.id, ...payload });
    } else {
      await addTemaClase(payload);
    }

    setIsModalOpen(false);
    setEditingTema(null);
  };

  const handleConfirmDelete = async () => {
    if (temaToDelete) {
      await deleteTemaClase(temaToDelete.id);
      setTemaToDelete(null);
    }
  };

  // Reorder Handler (Move Up / Move Down)
  const handleMoveOrder = async (tema: TemaClase, direction: 'up' | 'down') => {
    const index = sortedTemas.findIndex(t => t.id === tema.id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedTemas.length) return;

    const otherTema = sortedTemas[targetIndex];
    const newOrdenCurrent = otherTema.orden;
    const newOrdenOther = tema.orden;

    await updateTemaClase({ ...tema, orden: newOrdenCurrent });
    await updateTemaClase({ ...otherTema, orden: newOrdenOther });
  };

  // Toggle Developed Status
  const handleToggleDesarrollado = async (tema: TemaClase) => {
    const newStatus = !tema.desarrollado;
    await updateTemaClase({
      ...tema,
      desarrollado: newStatus,
      fechaDesarrollo: newStatus ? (tema.fechaDesarrollo || new Date().toISOString().split('T')[0]) : ''
    });
  };

  // Material File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const fileDataUrl = reader.result as string;
        let extType: MaterialAdjunto['tipo'] = 'otro';
        const nameLower = file.name.toLowerCase();
        if (nameLower.endsWith('.pdf')) extType = 'pdf';
        else if (nameLower.endsWith('.docx') || nameLower.endsWith('.doc')) extType = 'docx';
        else if (nameLower.endsWith('.pptx') || nameLower.endsWith('.ppt')) extType = 'pptx';

        const newMaterial: MaterialAdjunto = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
          nombre: file.name,
          tipo: extType,
          url: fileDataUrl,
          fechaSubida: new Date().toISOString().split('T')[0]
        };

        setMaterialesList(prev => [...prev, newMaterial]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = ''; // Reset file input
  };

  // Extract YouTube Video ID from URL if valid
  const getYouTubeId = (url?: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Auto-detect URL type when typing or pasting
  const handleUrlChange = (urlVal: string) => {
    setLinkUrl(urlVal);
    const lower = urlVal.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      setLinkTipo('youtube');
    } else if (lower.includes('notebooklm.google') || lower.includes('notebooklm')) {
      setLinkTipo('notebooklm');
    } else if (lower.includes('docs.google.com/document')) {
      setLinkTipo('google_doc');
    } else if (lower.includes('docs.google.com/presentation') || lower.includes('drive.google')) {
      setLinkTipo('google_slide');
    } else if ((linkTipo === 'notebooklm' || linkTipo === 'youtube') && lower.startsWith('http')) {
      setLinkTipo('web_link');
    }
  };

  // Material Link Add Handler
  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    let autoName = linkNombre.trim();
    if (!autoName) {
      if (linkTipo === 'youtube') autoName = 'Video de YouTube';
      else if (linkTipo === 'notebooklm') autoName = 'Cuaderno Gemini NotebookLM';
      else if (linkTipo === 'web_link' || linkTipo === 'link') autoName = 'Página Web / Artículo sobre el tema';
      else if (linkTipo === 'google_doc') autoName = 'Documento de Google Docs';
      else if (linkTipo === 'google_slide') autoName = 'Presentación Google Slides / Drive';
      else autoName = linkUrl.trim();
    }

    const newMaterial: MaterialAdjunto = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      nombre: autoName,
      tipo: linkTipo,
      url: linkUrl.trim(),
      ...(linkDescripcion.trim() ? { descripcion: linkDescripcion.trim() } : {}),
      fechaSubida: new Date().toISOString().split('T')[0]
    };
    setMaterialesList(prev => [...prev, newMaterial]);
    setLinkNombre('');
    setLinkUrl('');
    setLinkDescripcion('');
    setShowAddLink(false);
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterialesList(prev => prev.filter(m => m.id !== id));
  };

  // Get Encargado Name
  const getEncargadoNombre = (encargadoId?: string) => {
    if (!encargadoId) return null;
    const enc = encargados.find(e => String(e.id) === String(encargadoId));
    return enc ? `${enc.nombre} ${enc.apellido}` : 'Encargado no encontrado';
  };

  // Material Icon Helper
  const renderMaterialIcon = (tipo: MaterialAdjunto['tipo']) => {
    switch (tipo) {
      case 'youtube': return <Video className="w-4 h-4 text-red-600" />;
      case 'notebooklm': return <Brain className="w-4 h-4 text-purple-600" />;
      case 'web_link':
      case 'link': return <Globe className="w-4 h-4 text-emerald-600" />;
      case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
      case 'docx': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'pptx': return <FileText className="w-4 h-4 text-orange-500" />;
      case 'google_doc': return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'google_slide': return <Layers className="w-4 h-4 text-amber-500" />;
      default: return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  // Material Badge Helper
  const renderMaterialBadge = (tipo: MaterialAdjunto['tipo']) => {
    switch (tipo) {
      case 'youtube':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
            <Video className="w-3 h-3 text-red-600 dark:text-red-400" />
            Video YouTube
          </span>
        );
      case 'notebooklm':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Gemini NotebookLM
          </span>
        );
      case 'web_link':
      case 'link':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Página Web / Artículo
          </span>
        );
      case 'google_doc':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            <FileText className="w-3 h-3 text-blue-600" />
            Google Doc
          </span>
        );
      case 'google_slide':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <Layers className="w-3 h-3 text-amber-600" />
            Google Slides / Drive
          </span>
        );
      case 'pdf':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
            <FileText className="w-3 h-3 text-red-600" />
            PDF
          </span>
        );
      case 'docx':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            <FileText className="w-3 h-3 text-blue-600" />
            DOCX
          </span>
        );
      case 'pptx':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20">
            <FileText className="w-3 h-3 text-orange-600" />
            PPTX
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-700 dark:text-gray-300 border border-gray-500/20">
            <File className="w-3 h-3 text-gray-600" />
            Archivo
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Plan de Clases y Temas para Teens</h1>
              <p className="text-sm text-text-secondary">
                Candidatos a temas, prioridad/orden, materiales de bosquejo (PDFs, DOCX, PPTX) y calendario.
              </p>
            </div>
          </div>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg shadow-md transition-all font-medium text-sm self-start md:self-auto"
          >
            <Plus className="w-5 h-5" />
            Nuevo Tema Candidato
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Candidatos</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{totalTemas}</p>
          </div>
          <div className="bg-primary/10 p-3 rounded-xl text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Desarrollados</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{desarrolladosCount}</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendientesCount}</p>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">En Calendario</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{programadosCount}</p>
          </div>
          <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-600">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-4">
        <button
          onClick={() => setActiveTab('candidatos')}
          className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'candidatos'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Temas Candidatos y Prioridad
        </button>
        <button
          onClick={() => setActiveTab('calendario')}
          className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'calendario'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Calendario / Plan de Clases ({programadosCount})
        </button>
      </div>

      {/* TAB 1: TEMAS CANDIDATOS */}
      {activeTab === 'candidatos' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por título, contenido u objetivos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Estado Filter */}
              <div className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-lg text-sm">
                <Filter className="w-3.5 h-3.5 text-text-secondary" />
                <span className="text-xs text-text-secondary">Estado:</span>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value as any)}
                  className="bg-transparent text-text-primary text-sm font-medium focus:outline-none"
                >
                  <option value="todos">Todos</option>
                  <option value="desarrollados">Desarrollados</option>
                  <option value="pendientes">Pendientes</option>
                </select>
              </div>

              {/* Prioridad Filter */}
              <div className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-lg text-sm">
                <span className="text-xs text-text-secondary">Prioridad:</span>
                <select
                  value={filterPrioridad}
                  onChange={(e) => setFilterPrioridad(e.target.value as any)}
                  className="bg-transparent text-text-primary text-sm font-medium focus:outline-none"
                >
                  <option value="todas">Todas</option>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>
          </div>

          {/* List of Candidate Topics */}
          {filteredTemas.length === 0 ? (
            <div className="bg-surface p-12 rounded-xl border border-border text-center">
              <BookOpen className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-medium text-text-primary">No se encontraron temas</h3>
              <p className="text-sm text-text-secondary mt-1">
                {search || filterEstado !== 'todos' || filterPrioridad !== 'todas'
                  ? 'Intenta ajustar tus filtros de búsqueda.'
                  : 'Aún no has agregado candidatos a temas para las clases.'}
              </p>
              {canCreate && !search && filterEstado === 'todos' && filterPrioridad === 'todas' && (
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Primer Tema
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemas.map((tema, index) => {
                const encargadoNombre = getEncargadoNombre(tema.encargadoId);
                const isFirst = index === 0;
                const isLast = index === filteredTemas.length - 1;

                return (
                  <div
                    key={tema.id}
                    className="bg-surface border border-border rounded-xl p-4 md:p-5 shadow-sm hover:border-primary/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Priority / Position & Details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Order buttons */}
                      {canUpdate && (
                        <div className="flex flex-col items-center justify-center bg-background border border-border rounded-lg p-1 text-xs text-text-secondary shrink-0">
                          <button
                            onClick={() => handleMoveOrder(tema, 'up')}
                            disabled={isFirst}
                            className="p-1 hover:text-primary disabled:opacity-30 transition-colors"
                            title="Subir prioridad"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-text-primary px-1">{tema.orden ?? (index + 1)}</span>
                          <button
                            onClick={() => handleMoveOrder(tema, 'down')}
                            disabled={isLast}
                            className="p-1 hover:text-primary disabled:opacity-30 transition-colors"
                            title="Bajar prioridad"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 
                            onClick={() => setSelectedTemaDetail(tema)}
                            className="text-base font-bold text-text-primary hover:text-primary cursor-pointer truncate"
                          >
                            {tema.titulo}
                          </h3>

                          {/* Prioridad Badge */}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                            tema.prioridad === 'Alta' 
                              ? 'bg-red-500/10 text-red-600 border-red-500/20' 
                              : tema.prioridad === 'Media'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }`}>
                            Prioridad {tema.prioridad}
                          </span>

                          {/* Estado Badge */}
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 border ${
                            tema.desarrollado
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          }`}>
                            {tema.desarrollado ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Desarrollado
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                Pendiente
                              </>
                            )}
                          </span>
                        </div>

                        {/* Description */}
                        {tema.descripcion && (
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {tema.descripcion}
                          </p>
                        )}

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-text-secondary pt-1">
                          {tema.desarrollado && tema.fechaDesarrollo && (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              Desarrollado el: {tema.fechaDesarrollo}
                            </span>
                          )}

                          {encargadoNombre && (
                            <span className="flex items-center gap-1 text-text-primary">
                              <UserCheck className="w-3.5 h-3.5 text-primary" />
                              Desarrollado por: <strong className="font-semibold">{encargadoNombre}</strong>
                            </span>
                          )}

                          {tema.fechaProgramada && (
                            <span className="flex items-center gap-1 text-indigo-600 font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              Clase programada: {tema.fechaProgramada}
                            </span>
                          )}

                          {/* Materiales & Links Categorized Badges */}
                          {tema.materiales && tema.materiales.length > 0 && (() => {
                            const ytCount = tema.materiales.filter(m => m.tipo === 'youtube').length;
                            const nbCount = tema.materiales.filter(m => m.tipo === 'notebooklm').length;
                            const webCount = tema.materiales.filter(m => m.tipo === 'web_link' || m.tipo === 'link').length;
                            const docsCount = tema.materiales.filter(m => m.tipo === 'google_doc' || m.tipo === 'google_slide').length;
                            const filesCount = tema.materiales.filter(m => m.tipo === 'pdf' || m.tipo === 'docx' || m.tipo === 'pptx' || m.tipo === 'otro').length;

                            return (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {ytCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
                                    <Video className="w-3 h-3 text-red-600 dark:text-red-400" />
                                    {ytCount} Video(s) YouTube
                                  </span>
                                )}
                                {nbCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                    <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                    {nbCount} NotebookLM
                                  </span>
                                )}
                                {webCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    {webCount} Link(s) Web
                                  </span>
                                )}
                                {docsCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                    <FileText className="w-3 h-3 text-blue-600" />
                                    {docsCount} Google Doc(s)
                                  </span>
                                )}
                                {filesCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-700 dark:text-gray-300 border border-gray-500/20">
                                    <File className="w-3 h-3 text-gray-600" />
                                    {filesCount} Archivo(s)
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Quick NotebookLM, YouTube & Web Link Access Row */}
                        {tema.materiales && tema.materiales.some(m => m.tipo === 'youtube' || m.tipo === 'notebooklm' || m.tipo === 'web_link' || m.tipo === 'link') && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                            {tema.materiales
                              .filter(m => m.tipo === 'youtube' || m.tipo === 'notebooklm' || m.tipo === 'web_link' || m.tipo === 'link')
                              .slice(0, 3)
                              .map(link => (
                                <a
                                  key={link.id}
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-all shadow-xs ${
                                    link.tipo === 'youtube'
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : link.tipo === 'notebooklm'
                                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                  title={link.descripcion || link.nombre}
                                >
                                  {link.tipo === 'youtube' ? <Video className="w-3.5 h-3.5" /> : link.tipo === 'notebooklm' ? <Brain className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                                  <span className="truncate max-w-[160px]">{link.nombre}</span>
                                  <ExternalLink className="w-3 h-3 opacity-80" />
                                </a>
                              ))}
                            {tema.materiales.filter(m => m.tipo === 'youtube' || m.tipo === 'notebooklm' || m.tipo === 'web_link' || m.tipo === 'link').length > 3 && (
                              <button
                                onClick={() => setSelectedTemaDetail(tema)}
                                className="text-xs text-primary hover:underline font-medium"
                              >
                                +{tema.materiales.filter(m => m.tipo === 'youtube' || m.tipo === 'notebooklm' || m.tipo === 'web_link' || m.tipo === 'link').length - 3} enlace(s) más
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border justify-end">
                      {/* Toggle Desarrollado Quick Action */}
                      {canUpdate && (
                        <button
                          onClick={() => handleToggleDesarrollado(tema)}
                          className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
                            tema.desarrollado
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                          title={tema.desarrollado ? "Marcar como pendiente" : "Marcar como desarrollado"}
                        >
                          {tema.desarrollado ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span className="hidden sm:inline">
                            {tema.desarrollado ? "Pendiente" : "Desarrollado"}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedTemaDetail(tema)}
                        className="p-2 text-text-secondary hover:text-primary hover:bg-background rounded-lg border border-border transition-colors"
                        title="Ver Bosquejo y Materiales"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>

                      {canUpdate && (
                        <button
                          onClick={() => handleOpenEditModal(tema)}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-background rounded-lg border border-border transition-colors"
                          title="Editar Tema"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => setTemaToDelete(tema)}
                          className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-500/10 rounded-lg border border-border transition-colors"
                          title="Eliminar Tema"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CALENDARIO DE CLASES */}
      {activeTab === 'calendario' && (
        <div className="space-y-4">
          <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-text-primary">Programación de Clases para Teens</h2>
            </div>
            <p className="text-xs text-text-secondary">
              Temas que tienen una fecha de clase asignada
            </p>
          </div>

          {scheduledTemas.length === 0 ? (
            <div className="bg-surface p-12 rounded-xl border border-border text-center">
              <Calendar className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-medium text-text-primary">No hay clases programadas en el calendario</h3>
              <p className="text-sm text-text-secondary mt-1">
                Edita cualquier tema candidato para asignarle una fecha de clase programada.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-primary/30 pl-6 space-y-6 ml-4">
              {scheduledTemas.map((tema) => {
                const encNombre = getEncargadoNombre(tema.encargadoId);

                return (
                  <div key={tema.id} className="relative bg-surface p-5 rounded-xl border border-border shadow-sm">
                    {/* Dot on timeline */}
                    <div className="absolute -left-[31px] top-6 w-4 h-4 rounded-full bg-primary border-4 border-surface shadow" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary font-bold text-xs px-2.5 py-1 rounded-md">
                            {tema.fechaProgramada}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            tema.desarrollado ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {tema.desarrollado ? 'Listo / Desarrollado' : 'Pendiente de desarrollo'}
                          </span>
                        </div>
                        <h3 
                          onClick={() => setSelectedTemaDetail(tema)}
                          className="text-lg font-bold text-text-primary mt-2 cursor-pointer hover:text-primary transition-colors"
                        >
                          {tema.titulo}
                        </h3>
                        {tema.descripcion && (
                          <p className="text-sm text-text-secondary mt-1">{tema.descripcion}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          onClick={() => setSelectedTemaDetail(tema)}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                        >
                          <BookOpen className="w-4 h-4" />
                          Ver Bosquejo
                        </button>
                      </div>
                    </div>

                    {/* Class Details Footer */}
                    <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
                      {encNombre && (
                        <span>Encargado asignado: <strong className="text-text-primary">{encNombre}</strong></span>
                      )}
                      {tema.materiales && tema.materiales.length > 0 && (
                        <span className="text-primary font-medium">
                          📁 {tema.materiales.length} material(es) listo(s) para la clase
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREAR / EDITAR TEMA */}
      {isModalOpen && editingTema && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingTema.id ? "Editar Tema Candidato" : "Nuevo Tema Candidato"}
        >
          <form onSubmit={handleSaveTema} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Título del Tema *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. La Armadura de Dios, Identidad en Cristo..."
                value={editingTema.titulo || ''}
                onChange={(e) => setEditingTema(prev => ({ ...prev, titulo: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
              />
            </div>

            {/* Grid Prioridad y Orden */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Prioridad
                </label>
                <select
                  value={editingTema.prioridad || 'Media'}
                  onChange={(e) => setEditingTema(prev => ({ ...prev, prioridad: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Orden de Prioridad (#)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingTema.orden || 1}
                  onChange={(e) => setEditingTema(prev => ({ ...prev, orden: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
                />
              </div>
            </div>

            {/* Descripción / Resumen */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Descripción / Bosquejo General
              </label>
              <textarea
                rows={3}
                placeholder="Breve resumen del tema o bosquejo general de la enseñanza..."
                value={editingTema.descripcion || ''}
                onChange={(e) => setEditingTema(prev => ({ ...prev, descripcion: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
              />
            </div>

            {/* Objetivos */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Objetivos de la Clase
              </label>
              <textarea
                rows={2}
                placeholder="¿Qué queremos que el adolescente aprenda o aplique?"
                value={editingTema.objetivos || ''}
                onChange={(e) => setEditingTema(prev => ({ ...prev, objetivos: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
              />
            </div>

            {/* Estado de Desarrollo */}
            <div className="bg-background/60 p-3 rounded-lg border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-text-primary block">
                    ¿Este tema ya fue desarrollado?
                  </span>
                  <span className="text-xs text-text-secondary">
                    Marca si el material o bosquejo preparado ya está listo.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={!!editingTema.desarrollado}
                  onChange={(e) => setEditingTema(prev => ({ 
                    ...prev, 
                    desarrollado: e.target.checked,
                    fechaDesarrollo: e.target.checked ? (prev?.fechaDesarrollo || new Date().toISOString().split('T')[0]) : ''
                  }))}
                  className="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                />
              </div>

              {editingTema.desarrollado && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Fecha de Desarrollo
                    </label>
                    <input
                      type="date"
                      value={editingTema.fechaDesarrollo || ''}
                      onChange={(e) => setEditingTema(prev => ({ ...prev, fechaDesarrollo: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Encargado que lo Desarrolló
                    </label>
                    <select
                      value={editingTema.encargadoId || ''}
                      onChange={(e) => setEditingTema(prev => ({ ...prev, encargadoId: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-text-primary"
                    >
                      <option value="">-- Seleccionar Encargado --</option>
                      {encargados.map(enc => (
                        <option key={enc.id} value={enc.id}>
                          {enc.nombre} {enc.apellido}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Fecha Programada de Clase (Calendario) */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Fecha Programada de la Clase (Calendario)
              </label>
              <input
                type="date"
                value={editingTema.fechaProgramada || ''}
                onChange={(e) => setEditingTema(prev => ({ ...prev, fechaProgramada: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"
              />
              <span className="text-xs text-text-secondary mt-1 block">
                Opcional. Asigna una fecha para fijar la clase en el calendario.
              </span>
            </div>

            {/* MATERIALES ADJUNTOS & ENLACES WEB / NOTEBOOKLM */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Materiales, Enlaces Web y NotebookLM
                </label>
                <span className="text-xs text-text-secondary">
                  Añade archivos o enlaces de estudio para este tema.
                </span>
              </div>

              {/* Materiales List */}
              {materialesList.length > 0 && (
                <div className="space-y-2 bg-background p-3 rounded-lg border border-border max-h-52 overflow-y-auto">
                  {materialesList.map((m) => (
                    <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs p-2.5 bg-surface rounded-lg border border-border/80 gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {renderMaterialIcon(m.tipo)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-text-primary truncate">{m.nombre}</span>
                            {renderMaterialBadge(m.tipo)}
                          </div>
                          {m.descripcion && (
                            <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">{m.descripcion}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-medium text-xs bg-primary/10 px-2 py-1 rounded"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Abrir
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterial(m.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-500/10"
                          title="Eliminar material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Material Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLinkTipo('youtube');
                    setShowAddLink(true);
                  }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30 text-xs px-3 py-2 rounded-lg font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Video className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  + Video de YouTube
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLinkTipo('notebooklm');
                    setShowAddLink(true);
                  }}
                  className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs px-3 py-2 rounded-lg font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  + Cuaderno Gemini NotebookLM
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLinkTipo('web_link');
                    setShowAddLink(true);
                  }}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs px-3 py-2 rounded-lg font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  + Enlace Web / Artículo
                </button>

                <label className="cursor-pointer bg-background hover:bg-surface border border-border text-text-primary text-xs px-3 py-2 rounded-lg font-medium inline-flex items-center gap-1.5 transition-colors shadow-xs">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  Subir Archivo Local (PDF, DOCX)
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setLinkTipo('google_doc');
                    setShowAddLink(true);
                  }}
                  className="bg-background hover:bg-surface border border-border text-text-primary text-xs px-3 py-2 rounded-lg font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                  + Google Docs / Slides
                </button>
              </div>

              {/* Add Link Sub-form */}
              {showAddLink && (
                <div className="p-3.5 bg-background border border-primary/30 rounded-xl space-y-3 text-xs shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-bold text-text-primary flex items-center gap-1.5">
                      {linkTipo === 'youtube' ? (
                        <>
                          <Video className="w-4 h-4 text-red-600" />
                          Cargar Video de YouTube
                        </>
                      ) : linkTipo === 'notebooklm' ? (
                        <>
                          <Brain className="w-4 h-4 text-purple-600" />
                          Cargar Cuaderno de Gemini NotebookLM
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4 text-emerald-600" />
                          Cargar Enlace Web o Documento en Línea
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddLink(false)}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-text-secondary font-medium mb-1">Categoría del Recurso</label>
                      <select
                        value={linkTipo}
                        onChange={(e) => setLinkTipo(e.target.value as any)}
                        className="w-full p-2 bg-surface border border-border rounded-lg text-text-primary focus:ring-2 focus:ring-primary"
                      >
                        <option value="youtube">▶️ Video de YouTube</option>
                        <option value="notebooklm">🧠 Gemini NotebookLM (Cuaderno Interactivo)</option>
                        <option value="web_link">🌐 Página Web / Artículo sobre el Tema</option>
                        <option value="google_doc">📄 Documento de Google Docs</option>
                        <option value="google_slide">📊 Presentación Google Slides / Drive</option>
                        <option value="link">🔗 Otro Enlace General</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-text-secondary font-medium mb-1">Título o Nombre del Recurso</label>
                      <input
                        type="text"
                        placeholder={
                          linkTipo === 'youtube'
                            ? "Ej. Explicación Bíblica sobre la Fe en los Adolescentes"
                            : linkTipo === 'notebooklm'
                            ? "Ej. Cuaderno NotebookLM - Estudio sobre el perdón"
                            : "Ej. Artículo: Principios Bíblicos para Adolescentes"
                        }
                        value={linkNombre}
                        onChange={(e) => setLinkNombre(e.target.value)}
                        className="w-full p-2 bg-surface border border-border rounded-lg text-text-primary focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-text-secondary font-medium mb-1">URL / Dirección Web *</label>
                    <input
                      type="url"
                      placeholder={
                        linkTipo === 'youtube'
                          ? "https://www.youtube.com/watch?v=..."
                          : linkTipo === 'notebooklm'
                          ? "https://notebooklm.google.com/notebook/..."
                          : "https://ejemplo.com/articulo-tema"
                      }
                      value={linkUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      className="w-full p-2 bg-surface border border-border rounded-lg text-text-primary focus:ring-2 focus:ring-primary font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-text-secondary font-medium mb-1">Notas u Observaciones del Enlace (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. Contiene preguntas de reflexión y lectura recomendada para la semana."
                      value={linkDescripcion}
                      onChange={(e) => setLinkDescripcion(e.target.value)}
                      className="w-full p-2 bg-surface border border-border rounded-lg text-text-primary"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => setShowAddLink(false)}
                      className="px-3 py-1.5 bg-surface text-text-secondary rounded-lg hover:bg-border transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="px-4 py-1.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-xs inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Guardar Enlace
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow"
              >
                Guardar Tema
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: VER DETALLE / BOSQUEJO COMPLETO */}
      {selectedTemaDetail && (
        <Modal
          isOpen={!!selectedTemaDetail}
          onClose={() => setSelectedTemaDetail(null)}
          title={`Detalle de Clase: ${selectedTemaDetail.titulo}`}
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 text-sm text-text-primary">
            {/* Header info */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                selectedTemaDetail.prioridad === 'Alta' 
                  ? 'bg-red-500/10 text-red-600 border-red-500/20' 
                  : selectedTemaDetail.prioridad === 'Media'
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
              }`}>
                Prioridad {selectedTemaDetail.prioridad}
              </span>

              <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 border ${
                selectedTemaDetail.desarrollado
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              }`}>
                {selectedTemaDetail.desarrollado ? 'Desarrollado' : 'Pendiente de desarrollo'}
              </span>

              {selectedTemaDetail.fechaProgramada && (
                <span className="text-xs bg-indigo-500/10 text-indigo-600 px-2.5 py-1 rounded-full font-medium border border-indigo-500/20">
                  📅 Programado para: {selectedTemaDetail.fechaProgramada}
                </span>
              )}
            </div>

            {/* Encargado & Fecha */}
            {(getEncargadoNombre(selectedTemaDetail.encargadoId) || selectedTemaDetail.fechaDesarrollo) && (
              <div className="bg-background p-3 rounded-lg border border-border text-xs space-y-1">
                {getEncargadoNombre(selectedTemaDetail.encargadoId) && (
                  <p>👤 <strong>Encargado desarrollador:</strong> {getEncargadoNombre(selectedTemaDetail.encargadoId)}</p>
                )}
                {selectedTemaDetail.fechaDesarrollo && (
                  <p>📅 <strong>Fecha de desarrollo:</strong> {selectedTemaDetail.fechaDesarrollo}</p>
                )}
              </div>
            )}

            {/* Descripcion / Bosquejo */}
            {selectedTemaDetail.descripcion && (
              <div>
                <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-1">
                  Bosquejo / Resumen del Tema:
                </h4>
                <p className="p-3 bg-background rounded-lg border border-border whitespace-pre-wrap leading-relaxed text-sm text-text-primary">
                  {selectedTemaDetail.descripcion}
                </p>
              </div>
            )}

            {/* Objetivos */}
            {selectedTemaDetail.objetivos && (
              <div>
                <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-1">
                  Objetivos de la Clase:
                </h4>
                <p className="p-3 bg-background rounded-lg border border-border whitespace-pre-wrap leading-relaxed text-sm text-text-primary">
                  {selectedTemaDetail.objetivos}
                </p>
              </div>
            )}

            {/* Materiales, Enlaces, YouTube y Cuadernos NotebookLM */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                Materiales, Videos, Enlaces y Cuadernos de Estudio:
              </h4>

              {!selectedTemaDetail.materiales || selectedTemaDetail.materiales.length === 0 ? (
                <p className="text-xs text-text-secondary italic p-3 bg-background rounded-lg border border-border">
                  No hay archivos ni enlaces de internet adjuntos para esta clase.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* SECTION 1: YouTube Videos */}
                  {selectedTemaDetail.materiales.some(m => m.tipo === 'youtube') && (
                    <div className="space-y-3 p-3.5 bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <h5 className="font-bold text-xs text-red-900 dark:text-red-200 uppercase tracking-wide">
                          Videos de YouTube Recomendados:
                        </h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedTemaDetail.materiales.filter(m => m.tipo === 'youtube').map((m) => {
                          const ytId = getYouTubeId(m.url);
                          return (
                            <div key={m.id} className="flex flex-col p-3 bg-surface border border-red-500/30 rounded-xl text-xs gap-2 shadow-2xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-text-primary text-sm line-clamp-1">{m.nombre}</span>
                                {renderMaterialBadge(m.tipo)}
                              </div>
                              {m.descripcion && (
                                <p className="text-xs text-text-secondary line-clamp-2">{m.descripcion}</p>
                              )}
                              
                              {ytId ? (
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/90 my-1 shadow-inner">
                                  <iframe
                                    src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                                    title={m.nombre}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              ) : null}

                              <div className="flex items-center justify-between pt-1">
                                <p className="text-[10px] text-text-secondary font-mono truncate max-w-[180px]">{m.url}</p>
                                <a
                                  href={m.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 transition-all text-xs shrink-0 shadow-xs"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Abrir en YouTube
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: NotebookLM */}
                  {selectedTemaDetail.materiales.some(m => m.tipo === 'notebooklm') && (
                    <div className="space-y-2 p-3 bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <h5 className="font-bold text-xs text-purple-900 dark:text-purple-200 uppercase tracking-wide">
                          Cuadernos de Gemini NotebookLM:
                        </h5>
                      </div>
                      <div className="space-y-2">
                        {selectedTemaDetail.materiales.filter(m => m.tipo === 'notebooklm').map((m) => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface border border-purple-500/30 rounded-lg text-xs gap-2 shadow-2xs">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-text-primary text-sm">{m.nombre}</span>
                                {renderMaterialBadge(m.tipo)}
                              </div>
                              {m.descripcion && (
                                <p className="text-xs text-text-secondary">{m.descripcion}</p>
                              )}
                              <p className="text-[10px] text-text-secondary font-mono truncate">{m.url}</p>
                            </div>
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-purple-600 text-white hover:bg-purple-700 px-3.5 py-2 rounded-lg font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
                            >
                              <Brain className="w-4 h-4" />
                              Abrir Cuaderno
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: Web links & Articles & Google Docs */}
                  {selectedTemaDetail.materiales.some(m => m.tipo === 'web_link' || m.tipo === 'link' || m.tipo === 'google_doc' || m.tipo === 'google_slide') && (
                    <div className="space-y-2 p-3 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h5 className="font-bold text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                          Páginas Web y Enlaces de Interés:
                        </h5>
                      </div>
                      <div className="space-y-2">
                        {selectedTemaDetail.materiales.filter(m => m.tipo === 'web_link' || m.tipo === 'link' || m.tipo === 'google_doc' || m.tipo === 'google_slide').map((m) => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface border border-emerald-500/30 rounded-lg text-xs gap-2 shadow-2xs">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-text-primary text-sm">{m.nombre}</span>
                                {renderMaterialBadge(m.tipo)}
                              </div>
                              {m.descripcion && (
                                <p className="text-xs text-text-secondary">{m.descripcion}</p>
                              )}
                              <p className="text-[10px] text-text-secondary font-mono truncate">{m.url}</p>
                            </div>
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-600 text-white hover:bg-emerald-700 px-3.5 py-2 rounded-lg font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
                            >
                              <Globe className="w-4 h-4" />
                              Visitar Enlace
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION 3: Local Files (PDFs, DOCX, PPTX) */}
                  {selectedTemaDetail.materiales.some(m => m.tipo === 'pdf' || m.tipo === 'docx' || m.tipo === 'pptx' || m.tipo === 'otro') && (
                    <div className="space-y-2 p-3 bg-background border border-border rounded-xl">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h5 className="font-bold text-xs text-text-primary uppercase tracking-wide">
                          Archivos y Documentos Adjuntos:
                        </h5>
                      </div>
                      <div className="space-y-2">
                        {selectedTemaDetail.materiales.filter(m => m.tipo === 'pdf' || m.tipo === 'docx' || m.tipo === 'pptx' || m.tipo === 'otro').map((m) => (
                          <div key={m.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg text-xs">
                            <div className="flex items-center gap-2.5 truncate">
                              {renderMaterialIcon(m.tipo)}
                              <div>
                                <p className="font-semibold text-text-primary truncate">{m.nombre}</p>
                                <span className="text-[10px] text-text-secondary uppercase">{m.tipo.replace('_', ' ')}</span>
                              </div>
                            </div>

                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-primary text-white px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Abrir / Descargar
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Close */}
            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setSelectedTemaDetail(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION DELETE MODAL */}
      {temaToDelete && (
        <ConfirmationModal
          isOpen={!!temaToDelete}
          onClose={() => setTemaToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Eliminar Tema Candidato"
          message={`¿Estás seguro de que deseas eliminar el tema "${temaToDelete.titulo}"? Esta acción no se puede deshacer.`}
        />
      )}
    </div>
  );
};

export default PlanClases;
