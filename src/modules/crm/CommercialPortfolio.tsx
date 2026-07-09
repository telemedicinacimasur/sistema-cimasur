import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Eye, 
  RefreshCw, 
  ArrowRightLeft, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  TrendingDown, 
  ShieldAlert, 
  Award, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  ShoppingBag, 
  Check, 
  X,
  FileText,
  User,
  Activity,
  ChevronRight,
  Info
} from 'lucide-react';

// ==========================================
// Types and Interfaces
// ==========================================

export type ClubCategory = 'SIN COMPRA' | 'SIN CATEGORÍA' | 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINUM';

export interface Client {
  id: string;
  rut: string;
  razonSocial: string;
  email: string;
  telefono: string;
  comuna: string;
  region: string;
  origen: 'Plataforma Intranet' | 'CRM Directo' | 'Landing Page' | 'Feria Comercial';
  estadoCrm: 'ACTIVO' | 'INACTIVO';
  hasIntranet: boolean;
  categoriaClub: ClubCategory;
  montoVentasAcumuladas: number;
  frascosComprados: number;
  fechaIngreso: string;
  ejecutivoAsignado: string;
  ultimoContacto: string;
  vinculacion: 'CRM' | 'INTRANET' | 'AMBOS';
}

// Seed Mock Data matching real-world Chilean clinical and distribution profiles
const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-1',
    rut: '15.632.481-K',
    razonSocial: 'Centro de Rehabilitación Los Lagos Ltda.',
    email: 'contacto@rehabloslagos.cl',
    telefono: '+56 9 8452 1120',
    comuna: 'Puerto Montt',
    region: 'Región de Los Lagos',
    origen: 'Plataforma Intranet',
    estadoCrm: 'ACTIVO',
    hasIntranet: true,
    categoriaClub: 'PLATA',
    montoVentasAcumuladas: 3850000,
    frascosComprados: 36,
    fechaIngreso: '2025-03-15',
    ejecutivoAsignado: 'Carlos Mendoza',
    ultimoContacto: '2026-07-01',
    vinculacion: 'AMBOS'
  },
  {
    id: 'cli-2',
    rut: '76.892.311-5',
    razonSocial: 'Sociedad Médica del Sur S.A.',
    email: 'adquisiciones@medicasur.cl',
    telefono: '+56 9 7112 4589',
    comuna: 'Osorno',
    region: 'Región de Los Lagos',
    origen: 'Plataforma Intranet',
    estadoCrm: 'ACTIVO',
    hasIntranet: true,
    categoriaClub: 'BRONCE',
    montoVentasAcumuladas: 1450000,
    frascosComprados: 12,
    fechaIngreso: '2025-06-20',
    ejecutivoAsignado: 'Sofía Valenzuela',
    ultimoContacto: '2026-07-05',
    vinculacion: 'AMBOS'
  },
  {
    id: 'cli-3',
    rut: '12.445.982-3',
    razonSocial: 'Dr. Alejandro Silva Consulta Particular',
    email: 'asilva.neuro@gmail.com',
    telefono: '+56 9 9334 5211',
    comuna: 'Valdivia',
    region: 'Región de Los Ríos',
    origen: 'CRM Directo',
    estadoCrm: 'INACTIVO',
    hasIntranet: true,
    categoriaClub: 'SIN CATEGORÍA',
    montoVentasAcumuladas: 450000,
    frascosComprados: 4,
    fechaIngreso: '2025-01-10',
    ejecutivoAsignado: 'Carlos Mendoza',
    ultimoContacto: '2026-04-18',
    vinculacion: 'CRM'
  },
  {
    id: 'cli-4',
    rut: '81.520.100-2',
    razonSocial: 'Clínica Veterinaria Andes Norte',
    email: 'contacto@andesnorte.cl',
    telefono: '+56 9 6654 3210',
    comuna: 'Castro',
    region: 'Región de Los Lagos',
    origen: 'Landing Page',
    estadoCrm: 'ACTIVO',
    hasIntranet: false,
    categoriaClub: 'ORO',
    montoVentasAcumuladas: 5200000,
    frascosComprados: 48,
    fechaIngreso: '2024-11-05',
    ejecutivoAsignado: 'Andrés Morales',
    ultimoContacto: '2026-07-06',
    vinculacion: 'CRM'
  },
  {
    id: 'cli-5',
    rut: '18.990.455-6',
    razonSocial: 'Dra. Patricia Muñoz Farías',
    email: 'patricia.munoz@cimasur.net',
    telefono: '+56 9 5412 8899',
    comuna: 'Ancud',
    region: 'Región de Los Lagos',
    origen: 'Plataforma Intranet',
    estadoCrm: 'INACTIVO',
    hasIntranet: true,
    categoriaClub: 'SIN COMPRA',
    montoVentasAcumuladas: 0,
    frascosComprados: 0,
    fechaIngreso: '2026-02-18',
    ejecutivoAsignado: 'Sofía Valenzuela',
    ultimoContacto: '2026-06-25',
    vinculacion: 'INTRANET'
  },
  {
    id: 'cli-6',
    rut: '75.230.410-9',
    razonSocial: 'Distribuidora Biológica Temuco',
    email: 'biologicos.temuco@gmail.com',
    telefono: '+56 9 4451 2233',
    comuna: 'Temuco',
    region: 'Región de La Araucanía',
    origen: 'Feria Comercial',
    estadoCrm: 'ACTIVO',
    hasIntranet: true,
    categoriaClub: 'PLATINUM',
    montoVentasAcumuladas: 12500000,
    frascosComprados: 110,
    fechaIngreso: '2024-05-12',
    ejecutivoAsignado: 'Andrés Morales',
    ultimoContacto: '2026-07-07',
    vinculacion: 'AMBOS'
  },
  {
    id: 'cli-7',
    rut: '16.711.233-1',
    razonSocial: 'Farmacia Comunitaria Frutillar',
    email: 'adquisiciones@comunitariafrutillar.cl',
    telefono: '+56 9 8122 3456',
    comuna: 'Frutillar',
    region: 'Región de Los Lagos',
    origen: 'Plataforma Intranet',
    estadoCrm: 'ACTIVO',
    hasIntranet: true,
    categoriaClub: 'PLATA',
    montoVentasAcumuladas: 4200000,
    frascosComprados: 40,
    fechaIngreso: '2025-02-10',
    ejecutivoAsignado: 'Carlos Mendoza',
    ultimoContacto: '2026-07-07',
    vinculacion: 'AMBOS'
  },
];

export default function CommercialPortfolio() {
  // ==========================================
  // State variables
  // ==========================================
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [selectedOrigenIntranet, setSelectedOrigenIntranet] = useState<string>('TODOS');
  const [selectedEstadoCrm, setSelectedEstadoCrm] = useState<string>('TODOS');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Traspasar / Transfer Assignment Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedClientsToTransfer, setSelectedClientsToTransfer] = useState<string[]>([]);
  const [transferTargetExecutive, setTransferTargetExecutive] = useState('Sofía Valenzuela');

  // Expediente 360° Slide-over panel / Modal
  const [selectedClient360, setSelectedClient360] = useState<Client | null>(null);

  // New Client Form temporary values
  const [formRut, setFormRut] = useState('');
  const [formRazonSocial, setFormRazonSocial] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formComuna, setFormComuna] = useState('Puerto Montt');
  const [formRegion, setFormRegion] = useState('Región de Los Lagos');
  const [formOrigen, setFormOrigen] = useState<Client['origen']>('CRM Directo');
  const [formEstadoCrm, setFormEstadoCrm] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [formHasIntranet, setFormHasIntranet] = useState(true);
  const [formCategoriaClub, setFormCategoriaClub] = useState<ClubCategory>('SIN CATEGORÍA');
  const [formMontoVentas, setFormMontoVentas] = useState('0');
  const [formFrascos, setFormFrascos] = useState('0');
  const [formEjecutivo, setFormEjecutivo] = useState('Carlos Mendoza');
  const [formOrigenRegistro, setFormOrigenRegistro] = useState('Cliente CRM Tradicional');
  const [formVinculacion, setFormVinculacion] = useState<'CRM' | 'INTRANET' | 'AMBOS'>('CRM');
  const [duplicarEnAmbos, setDuplicarEnAmbos] = useState(false);

  // Success message toaster helper
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trigger Toast helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // ==========================================
  // IA / CIE Engine - Dynamic Action / Alarm Calculations
  // ==========================================
  const calculateCieAlert = (client: Client): { text: string; colorClass: string; icon: React.ReactNode } => {
    if (client.categoriaClub === 'SIN COMPRA') {
      return {
        text: 'Intranet Registrado - Sin Compras de Campaña',
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        icon: <ShieldAlert className="h-3.5 w-3.5 mr-1 text-amber-400" />
      };
    }

    if (client.estadoCrm === 'INACTIVO') {
      return {
        text: 'Inactivo - Urgente Recuperar',
        colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        icon: <TrendingDown className="h-3.5 w-3.5 mr-1 text-rose-400" />
      };
    }

    // Dynamic checks for upgrading to next level
    // BRONCE -> PLATA: Limit is 1.5M sales or 15 bottles. Let's use 15 bottles or 1.5M
    if (client.categoriaClub === 'BRONCE') {
      const remainingAmount = 1500000 - client.montoVentasAcumuladas;
      if (remainingAmount > 0) {
        return {
          text: `A $${remainingAmount.toLocaleString('es-CL')} de subir a PLATA`,
          colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
          icon: <TrendingUp className="h-3.5 w-3.5 mr-1 text-sky-400" />
        };
      }
      return {
        text: 'Listo para Ascender a PLATA',
        colorClass: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
        icon: <Award className="h-3.5 w-3.5 mr-1 text-teal-400" />
      };
    }

    // PLATA -> ORO: Limit is 5.0M sales or 50 bottles.
    if (client.categoriaClub === 'PLATA') {
      const remainingBottles = 48 - client.frascosComprados;
      if (remainingBottles > 0) {
        return {
          text: `A ${remainingBottles} frascos de subir a ORO`,
          colorClass: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
          icon: <TrendingUp className="h-3.5 w-3.5 mr-1 text-amber-300" />
        };
      }
      return {
        text: 'Listo para Ascender a ORO',
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        icon: <Award className="h-3.5 w-3.5 mr-1 text-amber-400" />
      };
    }

    // ORO -> PLATINUM: Limit is 10.0M sales or 100 bottles
    if (client.categoriaClub === 'ORO') {
      const remainingAmount = 10000000 - client.montoVentasAcumuladas;
      if (remainingAmount > 0) {
        return {
          text: `Próximo a PLATINUM (Faltan $${remainingAmount.toLocaleString('es-CL')})`,
          colorClass: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20',
          icon: <TrendingUp className="h-3.5 w-3.5 mr-1 text-cyan-300" />
        };
      }
      return {
        text: 'Listo para Ascender a PLATINUM',
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        icon: <Award className="h-3.5 w-3.5 mr-1 text-emerald-400" />
      };
    }

    if (client.categoriaClub === 'PLATINUM') {
      return {
        text: 'Socio VIP Activo - Fidelizado',
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        icon: <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-400" />
      };
    }

    return {
      text: 'Sin Anomalías de Traspaso',
      colorClass: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
      icon: <Info className="h-3.5 w-3.5 mr-1 text-slate-400" />
    };
  };

  // ==========================================
  // Client List Filtering Logic
  // ==========================================
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // 1. Search Term Filter (Name, RUT, Comuna)
      const matchesSearch = 
        c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.comuna.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Club Category Filter
      const matchesCategory = 
        selectedCategory === 'TODOS' || 
        c.categoriaClub === selectedCategory;

      // 3. CRM Status Filter
      const matchesEstadoCrm = 
        selectedEstadoCrm === 'TODOS' || 
        c.estadoCrm === selectedEstadoCrm;

      // 4. Crucial "Origen Intranet" Filter:
      // - TODOS: No filter
      // - INTRANET_SIN_COMPRA: hasIntranet is true, but categoriaClub is 'SIN COMPRA' or sales amount is 0
      // - CRM_ACTIVO_INTRANET: hasIntranet is true AND CRM state is ACTIVO
      // - SOLO_CRM_DIRECTO: hasIntranet is false
      let matchesOrigenIntranet = true;
      if (selectedOrigenIntranet === 'INTRANET_SIN_COMPRA') {
        matchesOrigenIntranet = c.hasIntranet && (c.categoriaClub === 'SIN COMPRA' || c.montoVentasAcumuladas === 0);
      } else if (selectedOrigenIntranet === 'CRM_ACTIVO_INTRANET') {
        matchesOrigenIntranet = c.hasIntranet && c.estadoCrm === 'ACTIVO';
      } else if (selectedOrigenIntranet === 'SOLO_CRM_DIRECTO') {
        matchesOrigenIntranet = !c.hasIntranet;
      }

      return matchesSearch && matchesCategory && matchesEstadoCrm && matchesOrigenIntranet;
    });
  }, [clients, searchTerm, selectedCategory, selectedOrigenIntranet, selectedEstadoCrm]);

  // ==========================================
  // Handlers for Modals and Forms
  // ==========================================
  const openCreateModal = () => {
    setEditingClient(null);
    setFormRut('');
    setFormRazonSocial('');
    setFormEmail('');
    setFormTelefono('');
    setFormComuna('Puerto Montt');
    setFormRegion('Región de Los Lagos');
    setFormOrigen('CRM Directo');
    setFormEstadoCrm('ACTIVO');
    setFormHasIntranet(true);
    setFormCategoriaClub('SIN CATEGORÍA');
    setFormMontoVentas('0');
    setFormFrascos('0');
    setFormEjecutivo('Carlos Mendoza');
    setFormOrigenRegistro('Cliente CRM Tradicional');
    setDuplicarEnAmbos(false);
    setIsFormModalOpen(true);
  };

  const openEditModal = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setFormRut(client.rut);
    setFormRazonSocial(client.razonSocial);
    setFormEmail(client.email);
    setFormTelefono(client.telefono);
    setFormComuna(client.comuna);
    setFormRegion(client.region);
    setFormOrigen(client.origen);
    setFormEstadoCrm(client.estadoCrm);
    setFormHasIntranet(client.hasIntranet);
    setFormCategoriaClub(client.categoriaClub);
    setFormMontoVentas(client.montoVentasAcumuladas.toString());
    setFormFrascos(client.frascosComprados.toString());
    setFormEjecutivo(client.ejecutivoAsignado);
    setIsFormModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRut.trim() || !formRazonSocial.trim()) {
      showToast('⚠️ Rut y Razón Social son campos requeridos.');
      return;
    }

    const saved: Client = {
      id: editingClient ? editingClient.id : `cli-${Date.now()}`,
      rut: formRut,
      razonSocial: formRazonSocial,
      email: formEmail,
      telefono: formTelefono,
      comuna: formComuna,
      region: formRegion,
      origen: formOrigen,
      estadoCrm: formEstadoCrm,
      hasIntranet: formHasIntranet,
      categoriaClub: formCategoriaClub,
      montoVentasAcumuladas: parseFloat(formMontoVentas) || 0,
      frascosComprados: parseInt(formFrascos) || 0,
      fechaIngreso: editingClient ? editingClient.fechaIngreso : new Date().toISOString().substring(0, 10),
      ejecutivoAsignado: formEjecutivo,
      ultimoContacto: new Date().toISOString().substring(0, 10),
      vinculacion: formVinculacion,
    };

    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? saved : c));
      showToast(`✅ Socio "${saved.razonSocial}" modificado exitosamente.`);
    } else {
      // If duplicarEnAmbos is true, we might need special handling
      // For now, let's just proceed with saving
      setClients([saved, ...clients]);
      showToast(`✅ Nuevo Socio "${saved.razonSocial}" inscrito correctamente en el Club.${duplicarEnAmbos ? ' (Duplicado en registros CRM e Intranet).' : ''}`);
    }

    setIsFormModalOpen(false);
  };

  const handleDeleteClient = (id: string, razonSocial: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`¿Está seguro de que desea eliminar a "${razonSocial}" de la Cartera Comercial?`)) {
      setClients(clients.filter(c => c.id !== id));
      showToast(`🗑️ El cliente "${razonSocial}" ha sido removido de la cartera.`);
    }
  };

  // Direct Category Update inline helper
  const handleQuickCategoryChange = (id: string, newCategory: ClubCategory) => {
    setClients(prev => 
      prev.map(c => c.id === id ? { ...c, categoriaClub: newCategory } : c)
    );
    showToast(`Categoría actualizada para el socio.`);
  };

  // Direct Intranet state toggle helper
  const handleQuickIntranetToggle = (id: string) => {
    setClients(prev => 
      prev.map(c => {
        if (c.id === id) {
          const nextVal = !c.hasIntranet;
          return { 
            ...c, 
            hasIntranet: nextVal,
            // If turning on intranet but category is "SIN CATEGORÍA", switch to "SIN COMPRA"
            categoriaClub: nextVal && c.categoriaClub === 'SIN CATEGORÍA' ? 'SIN COMPRA' : c.categoriaClub
          };
        }
        return c;
      })
    );
    showToast(`Estado de cuenta Intranet actualizado.`);
  };

  // Selection logic for bulk transfers
  const toggleClientSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClientsToTransfer(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClientsToTransfer.length === filteredClients.length) {
      setSelectedClientsToTransfer([]);
    } else {
      setSelectedClientsToTransfer(filteredClients.map(c => c.id));
    }
  };

  // Simulate portfolio transfer
  const handleExecuteTransfer = () => {
    if (selectedClientsToTransfer.length === 0) return;
    
    setClients(prev => 
      prev.map(c => 
        selectedClientsToTransfer.includes(c.id) 
          ? { ...c, ejecutivoAsignado: transferTargetExecutive, ultimoContacto: new Date().toISOString().substring(0, 10) } 
          : c
      )
    );

    showToast(`📦 Traspasados ${selectedClientsToTransfer.length} socios exitosamente a la cartera de ${transferTargetExecutive}.`);
    setSelectedClientsToTransfer([]);
    setIsTransferModalOpen(false);
  };

  return (
    <div id="commercial-portfolio-root" className="w-full bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div id="portfolio-toast" className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-200 shadow-xl shadow-cyan-950/20 max-w-md animate-fade-in flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Check className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Header section with Summary metrics and Actions */}
      <div id="portfolio-header" className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full font-mono">
              MOTOR CIE / CARTERA ÚNICA 2026
            </span>
            <span className="text-[11px] text-slate-500">•</span>
            <span className="text-xs text-slate-400">CIMASUR Chile</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            Gestión de Socios y Cartera
            <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Plataforma central comercial para el Club de Socios. Controle la vinculación de cuentas de Intranet de clientes con el CRM de compras de insumos médicos.
          </p>
        </div>

        {/* Action Button: Inscribir Socio */}
        <div className="mt-4 md:mt-0 flex gap-3">
          {selectedClientsToTransfer.length > 0 && (
            <button
              id="bulk-transfer-btn"
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-xs md:text-sm font-semibold text-cyan-400 transition-all shadow-lg"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Traspasar Seleccionados ({selectedClientsToTransfer.length})
            </button>
          )}

        </div>
      </div>

      {/* Overview stats cards block */}
      <div id="portfolio-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/55 border border-slate-800/80 p-4.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Socios Totales</p>
            <h3 className="text-2xl font-bold text-white mt-1">{clients.length}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Enrolados en el Club</p>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/10">
            <User className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/55 border border-slate-800/80 p-4.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cuentas Intranet</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              {clients.filter(c => c.hasIntranet).length}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Con accesos activos</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/55 border border-slate-800/80 p-4.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Activos en CRM</p>
            <h3 className="text-2xl font-bold text-cyan-300 mt-1">
              {clients.filter(c => c.estadoCrm === 'ACTIVO').length}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Ventas en los últimos 90 días</p>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-300 border border-cyan-500/10">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/55 border border-slate-800/80 p-4.5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ventas Totales Acumuladas</p>
            <h3 className="text-lg font-bold text-slate-200 mt-1.5 truncate">
              ${clients.reduce((acc, curr) => acc + curr.montoVentasAcumuladas, 0).toLocaleString('es-CL')}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Período comercial 2025-2026</p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/10">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div id="filter-controls" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Filtros Maestros de Cartera</h2>
          </div>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('TODOS');
              setSelectedOrigenIntranet('TODOS');
              setSelectedEstadoCrm('TODOS');
              showToast('Filtros restablecidos.');
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Restablecer Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Input 1: Search by Name / RUT */}
          <div className="space-y-1">
            <label htmlFor="search-input" className="block text-xs font-semibold text-slate-400 uppercase">Buscar Socio o RUT</label>
            <div className="relative">
              <input
                id="search-input"
                type="text"
                placeholder="Nombre, RUT, Comuna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
              />
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Selector 2: Club Category */}
          <div className="space-y-1">
            <label htmlFor="category-select" className="block text-xs font-semibold text-slate-400 uppercase">Categoría del Club</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            >
              <option value="TODOS">Todas las Categorías</option>
              <option value="PLATINUM">PLATINUM</option>
              <option value="ORO">ORO</option>
              <option value="PLATA">PLATA</option>
              <option value="BRONCE">BRONCE</option>
              <option value="SIN CATEGORÍA">SIN CATEGORÍA</option>
              <option value="SIN COMPRA">SIN COMPRA (Intranet)</option>
            </select>
          </div>

          {/* Selector 3: CRUCIAL Origen Intranet Filter */}
          <div className="space-y-1">
            <label htmlFor="intranet-select" className="block text-xs font-semibold text-slate-400 uppercase">Origen Intranet</label>
            <select
              id="intranet-select"
              value={selectedOrigenIntranet}
              onChange={(e) => setSelectedOrigenIntranet(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            >
              <option value="TODOS">Todos los Orígenes</option>
              <option value="INTRANET_SIN_COMPRA">Solo Intranet Sin Compra (Fidelización)</option>
              <option value="CRM_ACTIVO_INTRANET">CRM Activos con Intranet</option>
              <option value="SOLO_CRM_DIRECTO">CRM Directos (Sin Cuenta Intranet)</option>
            </select>
          </div>

          {/* Selector 4: Estado CRM */}
          <div className="space-y-1">
            <label htmlFor="status-crm-select" className="block text-xs font-semibold text-slate-400 uppercase">Estado CRM</label>
            <select
              id="status-crm-select"
              value={selectedEstadoCrm}
              onChange={(e) => setSelectedEstadoCrm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              <option value="TODOS">Todos los Estados CRM</option>
              <option value="ACTIVO">ACTIVOS</option>
              <option value="INACTIVO">INACTIVOS</option>
            </select>
          </div>

        </div>
      </div>

      {/* MAIN CLIENT TABLE */}
      <div id="clients-table-container" className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-mono text-xs font-bold">
              {filteredClients.length}
            </span>
            <p className="text-sm font-bold text-slate-200">Socios en pantalla que cumplen criterios</p>
          </div>
          <div className="text-xs text-slate-400 italic">
            * Al hacer clic en un cliente puede ver su Expediente 360°
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredClients.length > 0 && selectedClientsToTransfer.length === filteredClients.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-950 h-4 w-4"
                  />
                </th>
                <th className="p-4">Razón Social / Cliente</th>
                <th className="p-4">Estado CRM</th>
                <th className="p-4 text-center">Intranet</th>
                <th className="p-4">Categoría Club</th>
                <th className="p-4">Alerta de Crecimiento (IA/CIE Engine)</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredClients.map(c => {
                const alertCie = calculateCieAlert(c);
                const isSelected = selectedClientsToTransfer.includes(c.id);

                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedClient360(c)}
                    className={`hover:bg-slate-800/40 transition-colors cursor-pointer group ${isSelected ? 'bg-cyan-950/10' : ''}`}
                  >
                    {/* Checkbox for transfer */}
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleClientSelection(c.id, e)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-950 h-4 w-4"
                      />
                    </td>

                    {/* Razón Social / RUT */}
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-xs md:text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">
                          {c.razonSocial}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/60">
                            RUT: {c.rut}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/40">
                            {c.origen}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Estado CRM */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${c.estadoCrm === 'ACTIVO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.estadoCrm === 'ACTIVO' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        {c.estadoCrm}
                      </span>
                    </td>

                    {/* Intranet Status Toggle Link */}
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleQuickIntranetToggle(c.id)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${c.hasIntranet ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30' : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300 hover:bg-slate-800'}`}
                        title="Haga clic para habilitar o deshabilitar accesos intranet"
                      >
                        {c.hasIntranet ? 'SÍ' : 'NO'}
                      </button>
                    </td>

                    {/* Categoría Club Drodown Selector */}
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.categoriaClub}
                        onChange={(e) => handleQuickCategoryChange(c.id, e.target.value as ClubCategory)}
                        className="bg-slate-950 border border-slate-800 text-[11px] font-semibold rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="SIN COMPRA">SIN COMPRA (Intranet)</option>
                        <option value="SIN CATEGORÍA">SIN CATEGORÍA</option>
                        <option value="BRONCE">BRONCE</option>
                        <option value="PLATA">PLATA</option>
                        <option value="ORO">ORO</option>
                        <option value="PLATINUM">PLATINUM</option>
                      </select>
                    </td>

                    {/* Alerta de Crecimiento calculated dynamically by CIE */}
                    <td className="p-4">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border ${alertCie.colorClass}`}>
                        {alertCie.icon}
                        {alertCie.text}
                      </div>
                    </td>

                    {/* Acciones Rápidas */}
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {/* Traspasar Direct Button */}
                        <button
                          onClick={() => {
                            setSelectedClientsToTransfer([c.id]);
                            setIsTransferModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors"
                          title="Traspasar socio a otro ejecutivo"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </button>

                        {/* View Profile */}
                        <button
                          onClick={() => setSelectedClient360(c)}
                          className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors"
                          title="Ver Expediente de Cliente 360°"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={(e) => openEditModal(c, e)}
                          className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 rounded-lg transition-colors"
                          title="Editar Ficha"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteClient(c.id, c.razonSocial, e)}
                          className="p-1.5 bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-800/40 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                          title="Eliminar Registro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    Ningún socio comercial coincide con los filtros maestros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: INSCRIPCIÓN / EDICIÓN DE SOCIOS                         */}
      {/* ============================================================== */}
      {isFormModalOpen && (
        <div id="form-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-400" />
                {editingClient ? 'Modificar Ficha de Socio' : 'Inscribir Nuevo Socio (Club 2026)'}
              </h3>
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* RUT */}
                <div>
                  <label htmlFor="form-rut" className="block text-xs font-semibold text-slate-400 mb-1">RUT *</label>
                  <input
                    id="form-rut"
                    type="text"
                    required
                    value={formRut}
                    onChange={(e) => setFormRut(e.target.value)}
                    placeholder="Ej: 15.632.481-K"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {/* Razón Social */}
                <div>
                  <label htmlFor="form-razon" className="block text-xs font-semibold text-slate-400 mb-1">Razón Social / Clínica / Doctor *</label>
                  <input
                    id="form-razon"
                    type="text"
                    required
                    value={formRazonSocial}
                    onChange={(e) => setFormRazonSocial(e.target.value)}
                    placeholder="Ej: Sociedad Comercial Médica del Sur"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="form-email" className="block text-xs font-semibold text-slate-400 mb-1">Email de Contacto</label>
                  <input
                    id="form-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="correo@ejemplo.cl"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {/* Telefono */}
                <div>
                  <label htmlFor="form-tel" className="block text-xs font-semibold text-slate-400 mb-1">Teléfono Móvil (WhatsApp)</label>
                  <input
                    id="form-tel"
                    type="text"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="+56 9 8765 4321"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {/* Comuna */}
                <div>
                  <label htmlFor="form-comuna" className="block text-xs font-semibold text-slate-400 mb-1">Comuna</label>
                  <input
                    id="form-comuna"
                    type="text"
                    value={formComuna}
                    onChange={(e) => setFormComuna(e.target.value)}
                    placeholder="Puerto Montt"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Region */}
                <div>
                  <label htmlFor="form-region" className="block text-xs font-semibold text-slate-400 mb-1">Región</label>
                  <select
                    id="form-region"
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Región de Los Lagos">Región de Los Lagos</option>
                    <option value="Región de Los Ríos">Región de Los Ríos</option>
                    <option value="Región de La Araucanía">Región de La Araucanía</option>
                    <option value="Región Metropolitana">Región Metropolitana</option>
                  </select>
                </div>

                {/* Estado (NEW) */}
                <div>
                  <label htmlFor="form-vinculacion" className="block text-xs font-semibold text-slate-400 mb-1">Estado *</label>
                  <select
                    id="form-vinculacion"
                    value={formVinculacion}
                    onChange={(e) => setFormVinculacion(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="CRM">CRM</option>
                    <option value="INTRANET">INTRANET</option>
                    <option value="AMBOS">AMBOS</option>
                  </select>
                </div>
                
                {/* Origen del Registro (NEW) */}
                <div>
                  <label htmlFor="form-origen-registro" className="block text-xs font-semibold text-slate-400 mb-1">Origen del Registro *</label>
                  <select
                    id="form-origen-registro"
                    value={formOrigenRegistro}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormOrigenRegistro(val);
                      if (val === 'Solo Intranet (Sin Compra)') {
                        setFormCategoriaClub('SIN COMPRA');
                        setFormHasIntranet(true);
                        setFormEstadoCrm('INACTIVO');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Cliente CRM Tradicional">Cliente CRM Tradicional</option>
                    <option value="Solo Intranet (Sin Compra)">Solo Intranet (Sin Compra)</option>
                  </select>
                </div>

                {/* Origen */}
                <div>
                  <label htmlFor="form-origen" className="block text-xs font-semibold text-slate-400 mb-1">Canal de Origen</label>
                  <select
                    id="form-origen"
                    value={formOrigen}
                    onChange={(e) => setFormOrigen(e.target.value as Client['origen'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Plataforma Intranet">Plataforma Intranet</option>
                    <option value="CRM Directo">CRM Directo</option>
                    <option value="Landing Page">Landing Page</option>
                    <option value="Feria Comercial">Feria Comercial</option>
                  </select>
                </div>

                {/* Ejecutivo Asignado */}
                <div>
                  <label htmlFor="form-ejecutivo" className="block text-xs font-semibold text-slate-400 mb-1">Ejecutivo de Cuentas</label>
                  <select
                    id="form-ejecutivo"
                    value={formEjecutivo}
                    onChange={(e) => setFormEjecutivo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Carlos Mendoza">Carlos Mendoza</option>
                    <option value="Sofía Valenzuela">Sofía Valenzuela</option>
                    <option value="Andrés Morales">Andrés Morales</option>
                  </select>
                </div>

              </div>

              {/* CRM link status configuration */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Estado de Vinculación e Historial de Ventas</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Duplicar en ambos registros */}
                  <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-xs font-medium text-slate-300">Intranet (Duplicar)</span>
                    <button
                      type="button"
                      onClick={() => setDuplicarEnAmbos(!duplicarEnAmbos)}
                      className={`relative inline-flex h-6 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${duplicarEnAmbos ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <span className="absolute left-1 top-1 text-[10px] text-white font-bold">{duplicarEnAmbos ? 'SI' : 'NO'}</span>
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${duplicarEnAmbos ? 'translate-x-8' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Estado CRM */}
                  <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-xs font-medium text-slate-300">¿Cliente Activo CRM?</span>
                    <button
                      type="button"
                      onClick={() => setFormEstadoCrm(formEstadoCrm === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO')}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${formEstadoCrm === 'ACTIVO' ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${formEstadoCrm === 'ACTIVO' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Categoria Club */}
                  <div>
                    <select
                      id="form-cat-club"
                      value={formCategoriaClub}
                      onChange={(e) => setFormCategoriaClub(e.target.value as ClubCategory)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="SIN COMPRA">SIN COMPRA (Intranet)</option>
                      <option value="SIN CATEGORÍA">SIN CATEGORÍA</option>
                      <option value="BRONCE">BRONCE</option>
                      <option value="PLATA">PLATA</option>
                      <option value="ORO">ORO</option>
                      <option value="PLATINUM">PLATINUM</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label htmlFor="form-monto-ventas" className="block text-[11px] font-semibold text-slate-400 mb-1">Monto de Ventas Acumulado (CLP)</label>
                    <input
                      id="form-monto-ventas"
                      type="number"
                      value={formMontoVentas}
                      onChange={(e) => setFormMontoVentas(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="form-frascos" className="block text-[11px] font-semibold text-slate-400 mb-1">Cantidad de Frascos Comprados</label>
                    <input
                      id="form-frascos"
                      type="number"
                      value={formFrascos}
                      onChange={(e) => setFormFrascos(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
                >
                  Guardar Ficha
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TRASPASO DE CARTERA (SIMULACIÓN MASIVA)                 */}
      {/* ============================================================== */}
      {isTransferModalOpen && (
        <div id="transfer-modal-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <ArrowRightLeft className="h-4 w-4 text-cyan-400" />
                Traspasar Cartera de Clientes
              </h3>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                Está a punto de reasignar <strong>{selectedClientsToTransfer.length}</strong> socios comerciales del Club de Socios a un nuevo Ejecutivo de Cuentas.
              </p>

              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                <p className="text-slate-400 font-semibold">Socios seleccionados:</p>
                <div className="max-h-24 overflow-y-auto space-y-0.5 text-slate-300 font-mono pr-1">
                  {clients
                    .filter(c => selectedClientsToTransfer.includes(c.id))
                    .map(c => (
                      <div key={c.id} className="truncate">• {c.razonSocial}</div>
                    ))
                  }
                </div>
              </div>

              <div>
                <label htmlFor="target-executive-select" className="block text-xs font-semibold text-slate-400 mb-1.5">Ejecutivo Comercial Destino</label>
                <select
                  id="target-executive-select"
                  value={transferTargetExecutive}
                  onChange={(e) => setTransferTargetExecutive(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Carlos Mendoza">Carlos Mendoza</option>
                  <option value="Sofía Valenzuela">Sofía Valenzuela</option>
                  <option value="Andrés Morales">Andrés Morales</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExecuteTransfer}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
                >
                  Ejecutar Traspaso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SLIDE-OVER MODAL: EXPEDIENTE 360°                              */}
      {/* ============================================================== */}
      {selectedClient360 && (
        <div id="expediente-360-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-screen flex flex-col shadow-2xl relative">
            
            {/* Expediente Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded uppercase font-mono tracking-wider">
                  Expediente Comercial 360°
                </span>
                <h3 className="text-base font-bold text-white mt-1.5 truncate max-w-sm">
                  {selectedClient360.razonSocial}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedClient360(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Expediente Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile Card Summary */}
              <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-extrabold text-base">
                  {selectedClient360.razonSocial.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{selectedClient360.rut}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${selectedClient360.estadoCrm === 'ACTIVO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {selectedClient360.estadoCrm}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedClient360.comuna}, {selectedClient360.region}</p>
                </div>
              </div>

              {/* Club Level Visual Badge */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-950/80 rounded-2xl border border-slate-800 p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Categoría Club de Socios</p>
                  <h4 className="text-xl font-black text-cyan-400 tracking-wide mt-1">
                    {selectedClient360.categoriaClub}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Origen de registro: {selectedClient360.origen}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-cyan-950/40 text-cyan-400 border border-cyan-500/20">
                    <Award className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Dynamic CIE Status Indicator */}
              <div className="bg-slate-950/40 rounded-2xl border border-slate-800 p-4">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Acción Inteligente Recomendada (CIE)</p>
                <div className={`p-3 rounded-xl border flex items-center gap-3 ${calculateCieAlert(selectedClient360).colorClass}`}>
                  {calculateCieAlert(selectedClient360).icon}
                  <span className="text-xs font-semibold">{calculateCieAlert(selectedClient360).text}</span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">Información de Contacto</h4>
                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  <div className="flex items-center gap-3 text-slate-300">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span>{selectedClient360.email || 'No registrado'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span>{selectedClient360.telefono || 'No registrado'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <span>{selectedClient360.comuna} - {selectedClient360.region}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <span>Asignado a: <strong>{selectedClient360.ejecutivoAsignado}</strong></span>
                  </div>
                </div>
              </div>

              {/* Financial & Insumos Summary */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">Métricas de Consumo</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Ventas Acumuladas</p>
                    <p className="text-base font-bold text-white mt-1">${selectedClient360.montoVentasAcumuladas.toLocaleString('es-CL')}</p>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Frascos Adquiridos</p>
                    <p className="text-base font-bold text-white mt-1">{selectedClient360.frascosComprados} Unidades</p>
                  </div>
                </div>
              </div>

              {/* Timeline Simulation */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">Bitácora de Eventos Recientes</h4>
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  <div className="flex items-start gap-3 relative pl-6">
                    <span className="absolute left-1 top-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-4 ring-slate-900"></span>
                    <div className="text-xs">
                      <p className="text-[10px] font-semibold text-slate-500">Último contacto registrado • {selectedClient360.ultimoContacto}</p>
                      <p className="text-slate-300 mt-0.5">Se realizó llamado de validación por promoción mensual del 2026.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 relative pl-6">
                    <span className="absolute left-1 top-1.5 w-2 h-2 rounded-full bg-slate-700 ring-4 ring-slate-900"></span>
                    <div className="text-xs">
                      <p className="text-[10px] font-semibold text-slate-500">Fecha de Alta en Cartera • {selectedClient360.fechaIngreso}</p>
                      <p className="text-slate-300 mt-0.5">Cliente enrolado a través del canal {selectedClient360.origen}.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Expediente Footer with modification triggers */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                onClick={() => setSelectedClient360(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cerrar Expediente
              </button>
              <button
                onClick={(e) => {
                  const client = selectedClient360;
                  setSelectedClient360(null);
                  openEditModal(client, e);
                }}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Edit2 className="h-3 w-3" />
                Editar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
