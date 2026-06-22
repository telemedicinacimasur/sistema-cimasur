import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, Users, Shield, Sliders, Send, FileText, Sparkles, Lightbulb, 
  Search, Trash2, Edit3, Plus, ArrowUpRight, ArrowDownRight, Award, Check, 
  RotateCcw, Copy, CheckCircle, Save, Download, Mail, Phone, ExternalLink, 
  Calendar, MapPin, Notebook, MessageSquare, AlertTriangle, TrendingUp, TrendingDown 
} from 'lucide-react';
import { localDB } from '../../lib/auth';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces for Business Logic
interface ClientVentas {
  v2024: number;
  v2025: number;
  v2026: number; // Current commercial cycle: Jun 2025 - May 2026
}

interface ClubClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  rut: string;
  categoria: string; // Real database category
  region?: string;
  ventas?: ClientVentas;
  historialUnificado?: string;
  clinica?: string; // Optional custom clinic/razonSocial name
}

interface TierConfig {
  name: string;
  min: number;
  max: number;
  color: string;
  badge: string;
  primaryBenefit: string;
  benefits: string[];
}

const TIERS_DEFAULT: TierConfig[] = [
  {
    name: 'Sin categoría',
    min: 0,
    max: 499999,
    color: 'from-slate-800 to-slate-900 border-slate-700 text-slate-200',
    badge: 'bg-slate-800/80 text-slate-350 border-slate-700',
    primaryBenefit: 'Acceso general digital',
    benefits: ['Acceso general a catálogos online de CIMASUR', 'Boletín técnico mensual por correo electrónico']
  },
  {
    name: 'Bronce',
    min: 500000,
    max: 1999999,
    color: 'from-amber-900/40 to-amber-950/40 border-amber-800/50 text-amber-200',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    primaryBenefit: 'Descuento Base & Formación',
    benefits: ['Descuento por volumen en Productos Base', 'Invitación a todos los eventos gratuitos en línea (prioridad técnica)', 'Boletín informativo digital trimestral vía email']
  },
  {
    name: 'Plata',
    min: 2000000,
    max: 4999999,
    color: 'from-slate-700/40 to-slate-800/40 border-slate-600/50 text-slate-100',
    badge: 'bg-slate-300/10 text-slate-200 border-slate-300/20',
    primaryBenefit: '3 despachos gratis + Muestras',
    benefits: ['Descuento por volumen en Productos Base y Avanzados', '3 despachos gratuitos anuales vía Blue Express', '5 muestras gratis de productos promocionales anuales', '1 material pop/promoción gratis anual']
  },
  {
    name: 'Oro',
    min: 5000000,
    max: 11999999,
    color: 'from-yellow-950/45 to-amber-950/40 border-yellow-700/50 text-yellow-150',
    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    primaryBenefit: 'Canal preferente + Devolución + 10 muestras',
    benefits: ['Descuento en Productos Base, Avanzados, Especiales y Flores', '3 despachos gratuitos priorizados anuales', '10 muestras gratis anuales con 10% de gracia en nuevos lanzamientos', 'Estatus de devolución especial de productos cimasur', 'Soporte prioritario online directo por WhatsApp']
  },
  {
    name: 'Platinum',
    min: 12000000,
    max: Infinity,
    color: 'from-purple-950/40 to-indigo-950/40 border-purple-800/50 text-purple-200',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    primaryBenefit: 'Envíos GRATIS + Soporte Máximo prioritario + 20 muestras',
    benefits: ['Descuento máximo garantizado en todo el vademécum', 'Despacho SIN COSTO ilimitado en todos los envíos', '20 muestras gratis anuales y preventa garantizada', 'Permite devolución total ágil', '2 Vademécum impresos anuales + 2 artefactos POP']
  }
];

// Fallback logic for client sales
function getDefaultVentasForClient(categoria: string): ClientVentas {
  const cat = (categoria || 'Sin categoría').toLowerCase();
  if (cat.includes('platinum')) {
    return { v2024: 11500000, v2025: 12100000, v2026: 13500000 };
  } else if (cat.includes('oro')) {
    return { v2024: 4800000, v2025: 5100000, v2026: 6200000 };
  } else if (cat.includes('plata')) {
    return { v2024: 2100000, v2025: 2350000, v2026: 3100000 };
  } else if (cat.includes('bronce')) {
    return { v2024: 900000, v2025: 1050000, v2026: 1250000 };
  } else if (cat.includes('compra')) {
    return { v2024: 0, v2025: 0, v2026: 120000 };
  } else {
    return { v2024: 300000, v2025: 450000, v2026: 480000 };
  }
}

// Helper to check which tier is matching sales
function getTierBySales(sales: number, tiers: TierConfig[]) {
  const list = tiers.length > 0 ? tiers : TIERS_DEFAULT;
  for (const t of list) {
    if (sales >= t.min && sales <= t.max) {
      return t;
    }
  }
  return list[0];
}

// B2B CRM Custom Script Templates
const PRESET_TEMPLATES: Record<string, string> = {
  activo: "Estimado/a colega {{NOMBRE}} de la clínica {{CLINICA}},\n\nLe saludamos desde CIMASUR laboratorios veterinarios. Su cuenta registra compras por un total de {{VENTAS}} en este ciclo comercial anual, manteniéndose activo en la categoría {{CATEGORIA}}.\n\nDisfruta de su beneficio exclusivo: {{BENEFICIO}}.\n\nRecuerde que está a solo {{BRECHA}} de alcanzar el siguiente nivel de beneficios corporativos. ¡Quedamos atentos a sus recetas!",
  crecio: "¡Hola Dr./Dra. {{NOMBRE}}! Felicitaciones a su centro {{CLINICA}}.\n\nHemos detectado un valiosioso crecimiento de sus compras anuales acumuladas de este ciclo, llegando a {{VENTAS}}. Por este motivo, ha ascendido satisfactoriamente a la categoría {{CATEGORIA_NUEVA}}.\n\nSu beneficio asignado es: {{BENEFICIO}}. ¡Seguiremos impulsando el éxito de su centro médico!",
  estable: "Estimado/a {{NOMBRE}} de {{CLINICA}},\n\nQueremos agradecerle por su constancia comercial. Con compras acumuladas de {{VENTAS}} este año, se mantiene sólido en la categoría {{CATEGORIA}} con acceso a: {{BENEFICIO}}.\n\nLe deseamos una excelente jornada, CIMASUR.",
  disminuyo: "Estimado/a doctor/a {{NOMBRE}},\n\nLe escribimos prioritariamente de CIMASUR. Al revisar su historial comercial, notamos que sus compras han disminuido en este ciclo comercial acumulando un total de {{VENTAS}} comparado con el año anterior.\n\nSu categoría actual de compras es {{CATEGORIA}}, pero se encuentra en riesgo debido a la brecha comercial. Queremos brindarle un beneficio de gracia o una asesoría directa para reactivar sus recetas magistrales con su descuento habitual. ¡Conversemos hoy para coordinar condiciones especiales!\n\nAtte,\nGerencia de Servicios CIMASUR.",
  dormido: "¡Hola Dr./Dra. {{NOMBRE}}! Esperamos que esté muy bien.\n\nNotamos que en el ciclo actual no registra transacciones ($0), luego de haber sido un valioso cliente con compras en el ciclo anterior.\n\nNos encantaría volver a atenderle en su clínica {{CLINICA}}. De forma excepcional para sus siguientes 3 recetas, queremos ofrecerle el estatus preferencial {{CATEGORIA_NUEVA}} con el beneficio de: {{BENEFICIO}}.\n\n¿Agendamos un llamado técnico explicativo?",
  perdido: "Estimado/a {{NOMBRE}},\n\nLe saluda el equipo directivo de CIMASUR. Con motivo de relanzamiento técnico de nuestro vademécum de diluciones homeopáticas, queremos extenderle una invitación exclusiva para volver a trabajar juntos en su clínica {{CLINICA}}.\n\n¿Desea solicitar un kit promocional sin costo por WhatsApp?",
  riesgo_alto: "🚨 Alerta de Soporte - CIMASUR\n\nEstimado/a doctor/a {{NOMBRE}},\n\nNuestros reportes automatizados de Business Intelligence han emitido una alerta de riesgo crítico: sus compras en el ciclo actual han caído en más de un 50% respecto al año pasado, registrando solo {{VENTAS}} acumulados.\n\nSu estatus actual es {{CATEGORIA}}. Para evitar la pérdida de sus precios preferenciales y el beneficio de {{BENEFICIO}}, le extendemos un plazo de gracia de 30 días para colocar pedidos de reposición.\n\nEstamos para apoyarle y queremos conocer si requiere facilidades especiales con sus fórmulas homeopáticas magistrales. ¡Conversemos!\n\nAtte,\nContacto Directo CIMASUR."
};

export function ClubSocialManager() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [clients, setClients] = useState<ClubClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Custom Tiers List stored in localStorage
  const [tiersList, setTiersList] = useState<TierConfig[]>(() => {
    const saved = localStorage.getItem('cimasur_club_tiers_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Error formatting saved tiers", e);
      }
    }
    return TIERS_DEFAULT;
  });

  // Simulator values
  const [simulatedVentas, setSimulatedVentas] = useState<number>(1500000);
  const [campaignRecipients, setCampaignRecipients] = useState<ClubClient[]>([]);
  
  // Filter settings for tables
  const [clientSearch, setClientSearch] = useState<string>('');
  const [clientCategoryFilter, setClientCategoryFilter] = useState<string>('Todas');

  // Intelligent logical segment filters
  const [segCategory, setSegCategory] = useState<string>('Todas');
  const [segGrowth, setSegGrowth] = useState<string>('Todas'); // Todas, Crecieron, Disminuyeron, Estables, Dormidos, Perdidos
  const [segLastPurchase, setSegLastPurchase] = useState<string>('Todas'); // Todas, En ciclo actual, Solo ciclo anterior

  // Campaign State
  const [campaignChannel, setCampaignChannel] = useState<'whatsapp' | 'email' | 'both'>('whatsapp');
  const [messageTemplate, setMessageTemplate] = useState<string>(PRESET_TEMPLATES['activo']);
  const [campaignTriggered, setCampaignTriggered] = useState<boolean>(false);
  const [campaignLog, setCampaignLog] = useState<string[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Graphics Customizer State
  const [postcardType, setPostcardType] = useState<'ascenso' | 'reactivacion' | 'felicitacion' | 'beneficios'>('ascenso');
  const [postcardTitle, setPostcardTitle] = useState<string>('Bienvenido al Siguiente Nivel');
  const [postcardSubtext, setPostcardSubtext] = useState<string>('Tu compromiso clínico veterinario te destaca de forma única en la región.');

  // Form states for manual Client edit
  const [isEditingClient, setIsEditingClient] = useState<boolean>(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRut, setEditRut] = useState('');
  const [editClinica, setEditClinica] = useState('');
  const [editSales2024, setEditSales2024] = useState(0);
  const [editSales2025, setEditSales2025] = useState(0);
  const [editSales2026, setEditSales2026] = useState(0);
  const [newNote, setNewNote] = useState('');

  // Import annual sales state
  const [showSalesImportModal, setShowSalesImportModal] = useState<boolean>(false);
  const [salesImportText, setSalesImportText] = useState<string>('');
  const [colMapping, setColMapping] = useState({
    rutIdx: 0,
    v2024Idx: 1, // 0-based index, -1 for none
    v2025Idx: 2,
    v2026Idx: 3,
  });
  
  interface VisualImportRow {
    rutOriginal: string;
    rutNormalized: string;
    v2024: number;
    v2025: number;
    v2026: number;
    clientName?: string;
    found: boolean;
    clientId?: string;
  }
  
  const [salesImportResults, setSalesImportResults] = useState<{
    totalRows: number;
    matched: number;
    unmatched: number;
    details: VisualImportRow[];
  } | null>(null);

  // Normalization helper for RUTs
  const normalizeRUTForImport = (val: string): string => {
    if (!val) return '';
    return val.replace(/[^0-9kK]/g, '').toLowerCase();
  };

  const handlePreviewImport = () => {
    if (!salesImportText.trim()) {
      setSalesImportResults(null);
      return;
    }

    const lines = salesImportText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setSalesImportResults(null);
      return;
    }

    // Heuristically detect delimiter
    const firstLine = lines[0];
    let delimiter = '\t'; // Default tab
    if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes(',')) delimiter = ',';
    else if (firstLine.includes('|')) delimiter = '|';

    const details: VisualImportRow[] = [];
    let matchedCount = 0;
    let unmatchedCount = 0;

    const clientMap = new Map<string, ClubClient>();
    clients.forEach(c => {
      const norm = normalizeRUTForImport(c.rut);
      if (norm) {
        clientMap.set(norm, c);
      }
    });

    // Detect if first line is headers
    const looksLikeHeader = (cols: string[]) => {
      return cols.some(col => {
        const c = col.toLowerCase();
        return c.includes('rut') || c.includes('name') || c.includes('nombre') || c.includes('venta') || c.includes('monto') || c.includes('clien') || c.includes('202') || c.includes('factura');
      });
    };

    const hasHeader = looksLikeHeader(firstLine.split(delimiter));
    const startIdx = hasHeader ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length === 0 || !cols[0]) continue;

      const rutOriginal = cols[colMapping.rutIdx] || '';
      const rutNormalized = normalizeRUTForImport(rutOriginal);

      if (!rutNormalized) continue;

      const v2024 = colMapping.v2024Idx !== -1 && colMapping.v2024Idx < cols.length
        ? (parseFloat((cols[colMapping.v2024Idx] || '').replace(/[^0-9.-]/g, '')) || 0)
        : 0;
      const v2025 = colMapping.v2025Idx !== -1 && colMapping.v2025Idx < cols.length
        ? (parseFloat((cols[colMapping.v2025Idx] || '').replace(/[^0-9.-]/g, '')) || 0)
        : 0;
      const v2026 = colMapping.v2026Idx !== -1 && colMapping.v2026Idx < cols.length
        ? (parseFloat((cols[colMapping.v2026Idx] || '').replace(/[^0-9.-]/g, '')) || 0)
        : 0;

      const matchedClient = clientMap.get(rutNormalized);
      if (matchedClient) {
        matchedCount++;
        details.push({
          rutOriginal,
          rutNormalized,
          v2024,
          v2025,
          v2026,
          clientName: matchedClient.name,
          found: true,
          clientId: matchedClient.id
        });
      } else {
        unmatchedCount++;
        details.push({
          rutOriginal,
          rutNormalized,
          v2024,
          v2025,
          v2026,
          found: false
        });
      }
    }

    setSalesImportResults({
      totalRows: details.length,
      matched: matchedCount,
      unmatched: unmatchedCount,
      details
    });
  };

  useEffect(() => {
    handlePreviewImport();
  }, [salesImportText, colMapping, clients]);

  const handleExecuteSalesImport = async () => {
    if (!salesImportResults || salesImportResults.details.length === 0) {
      alert("No hay registros válidos para importar.");
      return;
    }

    setIsSending(true);
    try {
      let importedCount = 0;

      for (const row of salesImportResults.details) {
        if (!row.found || !row.clientId) continue;

        const originalClient = clients.find(c => c.id === row.clientId);
        if (!originalClient) continue;

        const updatedSales: ClientVentas = {
          v2024: row.v2024,
          v2025: row.v2025,
          v2026: row.v2026
        };

        const autoTier = getTierBySales(updatedSales.v2026, tiersList);

        await localDB.updateInCollection('contacts', row.clientId, {
          clubVentasDetail: JSON.stringify(updatedSales),
          categoria: autoTier.name
        });

        importedCount++;
      }

      window.dispatchEvent(new Event('db-change'));
      setSalesImportText('');
      setSalesImportResults(null);
      setShowSalesImportModal(false);
      alert(`¡Importación exitosa! Se actualizaron las ventas de ${importedCount} clientes según su RUT.`);
    } catch (err) {
      console.error("Error executing sales import", err);
      alert("Ocurrió un error al procesar la importación.");
    } finally {
      setIsSending(false);
    }
  };

  // Load clients and sync with Database changes
  const loadData = async () => {
    try {
      const contacts = await localDB.getCollection('contacts');
      const formatted: ClubClient[] = contacts.map(c => {
        let salesDetail = c.clubVentasDetail;
        if (typeof salesDetail === 'string') {
          try {
            salesDetail = JSON.parse(salesDetail);
          } catch {
            salesDetail = null;
          }
        }
        const defaultSales = getDefaultVentasForClient(c.categoria || 'Sin categoría');
        return {
          id: c.id,
          name: c.name || c.nombre || 'Sin Nombre',
          email: c.email || 'Sin Email',
          phone: c.phone || c.celular || 'Sin Teléfono',
          rut: c.rut || 'Sin RUT',
          categoria: c.categoria || 'Sin categoría',
          region: c.region || c.comuna || 'Metropolitana',
          ventas: salesDetail || defaultSales,
          historialUnificado: c.historialUnificado || '',
          clinica: c.razonSocial || c.clinica || (c.name ? `${c.name} Vet` : 'Clínica Veterinaria')
        };
      });
      setClients(formatted);
      if (formatted.length > 0 && !selectedClientId) {
        setSelectedClientId(formatted[0].id);
      }
    } catch (e) {
      console.error("Error loading contacts for ClubCRM", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-change', loadData);
    return () => window.removeEventListener('db-change', loadData);
  }, []);

  // Save new client configurations
  const handleSaveClientInfo = async () => {
    if (!selectedClientId) return;
    try {
      const current = clients.find(c => c.id === selectedClientId);
      if (!current) return;
      
      const salesObj: ClientVentas = {
        v2024: Number(editSales2024) || 0,
        v2025: Number(editSales2025) || 0,
        v2026: Number(editSales2026) || 0
      };

      // Recalculate automatic tier based on sales cycles
      const autoTier = getTierBySales(salesObj.v2026, tiersList);

      const appendNote = newNote.trim() 
        ? `\n[${new Date().toLocaleDateString('es-CL')} - Directiva]: ${newNote.trim()}` 
        : '';

      const updates = {
        name: editName,
        nombre: editName,
        email: editEmail,
        phone: editPhone,
        celular: editPhone,
        rut: editRut,
        clinica: editClinica,
        razonSocial: editClinica,
        categoria: autoTier.name,
        clubVentasDetail: JSON.stringify(salesObj),
        historialUnificado: (current.historialUnificado || '') + appendNote
      };

      await localDB.updateInCollection('contacts', selectedClientId, updates);
      setIsEditingClient(false);
      setNewNote('');
      window.dispatchEvent(new Event('db-change'));
      alert("Ficha individual y ventas anuales del ciclo actualizadas correctamente.");
    } catch (err) {
      console.error(err);
      alert("Error al guardar la información del cliente.");
    }
  };

  // Select a client and load in detail panel
  const selectedClient = useMemo(() => {
    const found = clients.find(c => c.id === selectedClientId);
    if (found) return found;
    return clients[0] || null;
  }, [clients, selectedClientId]);

  // Handle setting parameters when selected client changes
  useEffect(() => {
    if (selectedClient) {
      setEditName(selectedClient.name);
      setEditEmail(selectedClient.email);
      setEditPhone(selectedClient.phone);
      setEditRut(selectedClient.rut);
      setEditClinica(selectedClient.clinica || '');
      setEditSales2024(selectedClient.ventas?.v2024 || 0);
      setEditSales2025(selectedClient.ventas?.v2025 || 0);
      setEditSales2026(selectedClient.ventas?.v2026 || 0);
    }
  }, [selectedClient]);

  // Core intelligence classifier for all clients based on Sales Cycles
  const enrichedClients = useMemo(() => {
    return clients.map(client => {
      const sales = client.ventas || { v2024: 0, v2025: 0, v2026: 0 };
      const v2024 = sales.v2024 || 0;
      const v2025 = sales.v2025 || 0;
      const v2026 = sales.v2026 || 0;

      const activeTier2026 = getTierBySales(v2026, tiersList);
      const activeTier2025 = getTierBySales(v2025, tiersList);

      const isCrecio = v2026 > v2025;
      const isDisminuyo = v2026 < v2025 && v2026 > 0 && v2025 > 0;
      const percentChange = v2025 > 0 ? (v2026 - v2025) / v2025 : 0;
      const isEstables = Math.abs(percentChange) <= 0.10 && v2026 > 0 && v2025 > 0;
      const isDormidos = v2025 > 0 && v2026 === 0;
      const isPerdidos = v2024 > 0 && v2025 === 0 && v2026 === 0;
      const isRiesgoAlto = percentChange <= -0.50 && v2025 > 0;

      // Classify
      let segmentGroup: 'activo' | 'crecer' | 'estable' | 'disminuyo' | 'dormido' | 'perdido' | 'riesgo_alto' = 'estable';
      if (isPerdidos) segmentGroup = 'perdido';
      else if (isDormidos) segmentGroup = 'dormido';
      else if (isRiesgoAlto) segmentGroup = 'riesgo_alto';
      else if (isCrecio) segmentGroup = 'crecer';
      else if (isEstables) segmentGroup = 'estable';
      else if (isDisminuyo) segmentGroup = 'disminuyo';

      // Near Upgrade threshold check (within 15% range of NEXT tier min)
      const currentTierIndex = tiersList.findIndex(t => t.name === activeTier2026.name);
      const nextTierConfig = (currentTierIndex !== -1 && currentTierIndex < tiersList.length - 1) 
        ? tiersList[currentTierIndex + 1] 
        : null;
      const isProximoAscenso = nextTierConfig 
        ? (nextTierConfig.min - v2026 > 0) && (v2026 >= nextTierConfig.min * 0.85)
        : false;

      // Near Downgrade threshold check (drops below base tier, or drops within 15% margin close to losing standard classification)
      const isProximoDescenso = activeTier2026.min > 0 
        ? (v2026 >= activeTier2026.min) && (v2026 <= activeTier2026.min * 1.15)
        : false;

      return {
        ...client,
        ventas: sales,
        calculatedTier: activeTier2026,
        calculatedTierPrev: activeTier2025,
        segmentGroup,
        isCrecio,
        isDisminuyo,
        isEstables,
        isDormidos,
        isPerdidos,
        isRiesgoAlto,
        isProximoAscenso,
        isProximoDescenso,
        percentChange,
        nextTier: nextTierConfig,
        brechaAscenso: nextTierConfig ? Math.max(0, nextTierConfig.min - v2026) : 0,
        brechaDescenso: activeTier2026.min > 0 ? Math.max(0, v2026 - activeTier2026.min) : 0
      };
    });
  }, [clients, tiersList]);

  // Executive Dashboard Sums
  const dashboardStats = useMemo(() => {
    let crecieronCount = 0;
    let disminuyeronCount = 0;
    let establesCount = 0;
    let riesgoCount = 0;
    let ascensosCount = 0;
    let descensosCount = 0;
    let totalSalesPeriod = 0;

    enrichedClients.forEach(c => {
      totalSalesPeriod += c.ventas.v2026;
      if (c.isCrecio) crecieronCount++;
      if (c.isDisminuyo) disminuyeronCount++;
      if (c.isEstables) establesCount++;
      if (c.isRiesgoAlto) riesgoCount++;
      if (c.isProximoAscenso) ascensosCount++;
      if (c.isProximoDescenso) descensosCount++;
    });

    return {
      totalClients: enrichedClients.length,
      crecieron: crecieronCount,
      disminuyeron: disminuyeronCount,
      estables: establesCount,
      riesgo: riesgoCount,
      ascensos: ascensosCount,
      descensos: descensosCount,
      totalSales: totalSalesPeriod
    };
  }, [enrichedClients]);

  // Master Intelligent Segment Filter Results
  const segmentedClients = useMemo(() => {
    return enrichedClients.filter(c => {
      // Category Match
      const matchesCategory = segCategory === 'Todas' || c.calculatedTier.name === segCategory;

      // Behavior / Growth Match
      let matchesBehavior = true;
      if (segGrowth === 'Crecieron') matchesBehavior = c.isCrecio;
      else if (segGrowth === 'Disminuyeron') matchesBehavior = c.isDisminuyo;
      else if (segGrowth === 'Estables') matchesBehavior = c.isEstables;
      else if (segGrowth === 'Dormidos') matchesBehavior = c.isDormidos;
      else if (segGrowth === 'Perdidos') matchesBehavior = c.isPerdidos;
      else if (segGrowth === 'Riesgo Alto') matchesBehavior = c.isRiesgoAlto;

      // Cycle Recency Match
      let matchesLastPurchase = true;
      if (segLastPurchase === 'En ciclo actual') matchesLastPurchase = c.ventas.v2026 > 0;
      else if (segLastPurchase === 'Solo ciclo anterior') matchesLastPurchase = c.ventas.v2025 > 0 && c.ventas.v2026 === 0;

      return matchesCategory && matchesBehavior && matchesLastPurchase;
    });
  }, [enrichedClients, segCategory, segGrowth, segLastPurchase]);

  // Simulated upgrade values for active client
  const activeSimulatedMetrics = useMemo(() => {
    if (!selectedClient) return null;
    const currentSales = selectedClient.ventas?.v2026 || 0;
    const finalSales = currentSales + simulatedVentas;
    const futureTier = getTierBySales(finalSales, tiersList);
    
    const nextIndex = tiersList.findIndex(t => t.name === futureTier.name) + 1;
    const nextTier = nextIndex < tiersList.length ? tiersList[nextIndex] : null;
    const nextBrecha = nextTier ? Math.max(0, nextTier.min - finalSales) : 0;
    const progressPercent = nextTier ? Math.min(100, Math.round((finalSales / nextTier.min) * 100)) : 100;

    return {
      futureSales: finalSales,
      futureTier,
      nextTier,
      nextBrecha,
      progressPercent
    };
  }, [selectedClient, simulatedVentas, tiersList]);

  // Variables template replacer utility
  const replaceMessageVariables = (textTemplate: string, clientInfo: any) => {
    if (!clientInfo) return textTemplate;
    const v2026 = clientInfo.ventas?.v2026 || 0;
    const bestBenefit = clientInfo.calculatedTier?.primaryBenefit || 'Beneficios generales';
    const destinationTier = clientInfo.nextTier?.name || 'Máxima Categoría';
    const nextTierMin = clientInfo.nextTier?.min || 0;
    const brechaVal = nextTierMin > 0 ? Math.max(0, nextTierMin - v2026) : 0;

    return textTemplate
      .replace(/\{\{NOMBRE\}\}/g, clientInfo.name || 'Médico')
      .replace(/\{\{CLINICA\}\}/g, clientInfo.clinica || 'Clínica Veterinaria')
      .replace(/\{\{CATEGORIA\}\}/g, clientInfo.calculatedTier?.name || 'General')
      .replace(/\{\{CATEGORIA_NUEVA\}\}/g, destinationTier)
      .replace(/\{\{VENTAS\}\}/g, `$${v2026.toLocaleString('es-CL')}`)
      .replace(/\{\{BRECHA\}\}/g, `$${brechaVal.toLocaleString('es-CL')}`)
      .replace(/\{\{BENEFICIO\}\}/g, bestBenefit);
  };

  // Preloaded variables button helper
  const handleInsertVariable = (variable: string) => {
    setMessageTemplate(prev => prev + ' ' + variable);
  };

  // Mass campaign multi-select dispatch simulator
  const handleLaunchCampaign = async () => {
    if (campaignRecipients.length === 0) {
      alert("Por favor, selecciona o agrega destinatarios al lote de la campaña.");
      return;
    }
    setIsSending(true);
    setCampaignTriggered(true);
    setCampaignLog([]);

    try {
      // Stream batch simulation
      for (let i = 0; i < campaignRecipients.length; i++) {
        const item = campaignRecipients[i];
        const personalized = replaceMessageVariables(messageTemplate, enrichedClients.find(ec => ec.id === item.id));
        
        // Simulating delay for bulk server delivery
        await new Promise(resolve => setTimeout(resolve, 600));

        // Add to live audit logs
        setCampaignLog(prev => [
          ...prev, 
          `[OK - ${new Date().toLocaleTimeString()}] Canal ${campaignChannel.toUpperCase()} - Entregado a: ${item.name} (${item.clinica || 'Vet'})`
        ]);

        // Append to local database client commercial logs
        const auditHeader = `\n[Campaña Masiva ${new Date().toLocaleDateString('es-CL')}]`;
        const auditLogMsg = `\n${auditHeader}\nCanal: ${campaignChannel.toUpperCase()}\nAsunto/Mensaje:\n"${personalized.substring(0, 150)}..."`;
        
        await localDB.updateInCollection('contacts', item.id, {
          historialUnificado: (item.historialUnificado || '') + auditLogMsg
        });
      }

      // Record a global Campaign Action Activity log
      await localDB.saveToCollection('crm_activities', {
        id: `act_${Date.now()}`,
        campania: `Campaña CRM - ${new Date().toLocaleDateString('es-CL')}`,
        tipo: campaignChannel === 'both' ? 'WhatsApp + Correo' : campaignChannel === 'email' ? 'Correo Electrónico' : 'WhatsApp',
        segmento: `${campaignRecipients.length} Clientes contactados`,
        targetCategories: Array.from(new Set(campaignRecipients.map(r => r.categoria))),
        createdAt: new Date().toISOString()
      });

      window.dispatchEvent(new Event('db-change'));
      alert("Campaña masiva enviada correctamente. El historial clínico de cada cliente ha sido actualizado.");
    } catch (e) {
      console.error(e);
      alert("Error ejecutando la campaña.");
    } finally {
      setIsSending(false);
    }
  };

  // Download Postcard using HTML5 Canvas render engine safely
  const handleDownloadPostcard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient based on category colors
    let grad = ctx.createLinearGradient(0, 0, 800, 500);
    const catLow = (selectedClient?.categoria || '').toLowerCase();
    
    if (catLow.includes('platinum')) {
      grad.addColorStop(0, '#1E1B4B');
      grad.addColorStop(1, '#581C87');
    } else if (catLow.includes('oro')) {
      grad.addColorStop(0, '#78350F');
      grad.addColorStop(1, '#D97706');
    } else if (catLow.includes('plata')) {
      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(1, '#64748B');
    } else {
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(1, '#334155');
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);

    // Subtle modern patterns
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 800; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 150, 500);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 15;
    ctx.strokeRect(7.5, 7.5, 785, 485);

    // Title / Topic
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText("CIMASUR CLUB SOCIAL", 50, 75);

    // Decorative Icon / Award Graphic Placeholder shape
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(650, 250, 110, 0, Math.PI * 2);
    ctx.fill();

    // Secondary inner decorative ring
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(650, 250, 95, 0, Math.PI * 2);
    ctx.stroke();

    // Visual star inside ring
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("★", 650, 265);
    ctx.textAlign = 'left';

    // Badge Label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(50, 115, 280, 45);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`CATEGORÍA: ${selectedClient?.categoria.toUpperCase() || 'GENERAL'}`, 65, 143);

    // Client Name & Clinic Info
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(selectedClient?.name || 'PRESTIGIADO SOCIO', 50, 230);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 18px sans-serif';
    ctx.fillText(`Clínica: ${selectedClient?.clinica || 'Establecimiento Técnico'}`, 50, 265);

    // Custom Customizer Title
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(postcardTitle || 'Reconocimiento VIP', 50, 330);

    // Custom Customizer Subtext wrapped
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px sans-serif';
    const sub = postcardSubtext || 'Garantía oficial de fidelización preferente.';
    ctx.fillText(sub.substring(0, 80), 50, 370);
    if (sub.length > 80) {
      ctx.fillText(sub.substring(80, 160), 50, 392);
    }

    // Foot Note
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`ID Registro: ${selectedClient?.id || 'CIMASUR-B2B'}`, 50, 450);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px sans-serif';
    ctx.fillText("© 2026 CIMASUR S.A. Todos los derechos reservados.", 490, 450);

    // Trigger immediate browser trigger
    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `cimasur_fidelizacion_${selectedClient?.name || 'cliente'}.png`;
    link.href = imgData;
    link.click();
    alert("¡Pieza de fidelización personalizada descargada exitosamente!");
  };

  // Helper lists & state computed items
  const filteredClientList = useMemo(() => {
    return enrichedClients.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                          c.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          c.rut.toLowerCase().includes(clientSearch.toLowerCase());
      const catMatch = clientCategoryFilter === 'Todas' || c.calculatedTier.name === clientCategoryFilter;
      return nameMatch && catMatch;
    });
  }, [enrichedClients, clientSearch, clientCategoryFilter]);

  return (
    <div className="bg-[#0b1324] text-white min-h-screen rounded-2xl border border-slate-800 shadow-2xl overflow-hidden font-sans">
      
      {/* HEADER SECTION */}
      <div className="p-6 bg-[#0e192f] border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-sky-500/10 text-sky-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-sky-500/20 tracking-wider">
              Business Intelligence & Fidelización
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-emerald-500/20 tracking-wider">
              UX/UI Corporativo
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            CRM Inteligente <span className="text-sky-450 text-sky-400 font-extrabold">CIMASUR</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Análisis de comportamiento anual de compra, segmentación automática y motor de campañas masivas corporativas.
          </p>
        </div>
        
        {/* Dynamic Total Billing Display */}
        <div className="bg-[#122240] px-4 py-3 rounded-xl border border-[#1e345c] text-right">
          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Facturación Consolidada Ciclo 2026</span>
          <span className="text-xl font-mono font-black text-emerald-400">
            ${dashboardStats.totalSales.toLocaleString('es-CL')}
          </span>
        </div>
      </div>

      {/* CORE 8-TAB NAVIGATION SIDEBAR LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 min-h-[500px]">
        
        {/* SIDE BAR NAVIGATION */}
        <div className="lg:col-span-1 bg-[#0b1527] border-r border-slate-800 p-4 space-y-1.5">
          <div className="text-[9px] text-slate-500 font-extrabold uppercase px-3 tracking-widest mb-3">Módulos Estratégicos</div>
          
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>1. Dashboard Ejecutivo</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('clients')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'clients' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Users className="w-4 h-4" />
            <span>2. Cartera & Fichas</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('club_config')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'club_config' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Shield className="w-4 h-4" />
            <span>3. Club Categorías</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('segmentation')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'segmentation' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Sliders className="w-4 h-4" />
            <span>4. Segmentación IA</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'campaigns' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Send className="w-4 h-4" />
            <span className="flex items-center justify-between w-full">
              <span>5. Campañas Masivas</span>
              {campaignRecipients.length > 0 && (
                <span className="bg-indigo-505 bg-indigo-500 text-[9px] text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                  {campaignRecipients.length}
                </span>
              )}
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('templates')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'templates' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <FileText className="w-4 h-4" />
            <span>6. Plantillas Dinámicas</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('image_gen')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'image_gen' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Sparkles className="w-4 h-4" />
            <span>7. Generador Gráfico</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('opportunities')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'opportunities' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>8. Oportunidades</span>
          </button>
        </div>

        {/* WORKSPACE AREA */}
        <div className="lg:col-span-4 p-6 bg-[#090f1d]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* ----------------- SUBTAB 1: EXECUTIVE DASHBOARD ----------------- */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-sky-400" /> Analítica y Comportamiento Ejecutivo
                    </h2>
                    <span className="text-[10px] text-slate-500 font-mono">Última actualización: hoy 2026</span>
                  </div>

                  {/* HIGH METRIC CARDS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="bg-[#0f1b35] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div className="flex justify-between items-start text-slate-400 text-xs font-bold">
                        <span>TOTAL CLIENTES</span>
                        <Users className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-3xl font-mono font-black">{dashboardStats.totalClients}</span>
                        <span className="text-[10px] block text-slate-500 mt-1">Sincronizados localmente</span>
                      </div>
                    </div>

                    <div className="bg-[#0f1b35] p-4 rounded-xl border border-[#166534]/30 flex flex-col justify-between">
                      <div className="flex justify-between items-start text-emerald-400 text-xs font-bold">
                        <span>CRECIERON</span>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-3xl font-mono font-black text-emerald-400">+{dashboardStats.crecieron}</span>
                        <span className="text-[10px] block text-slate-400 mt-1">Ventas {'>'} ciclo anterior</span>
                      </div>
                    </div>

                    <div className="bg-[#0f1b35] p-4 rounded-xl border border-[#991b1b]/30 flex flex-col justify-between">
                      <div className="flex justify-between items-start text-rose-400 text-xs font-bold">
                        <span>DISMINUYERON</span>
                        <TrendingDown className="w-4 h-4" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-3xl font-mono font-black text-rose-400">-{dashboardStats.disminuyeron}</span>
                        <span className="text-[10px] block text-slate-400 mt-1">Compras reducidas</span>
                      </div>
                    </div>

                    <div className="bg-[#0f1b35] p-4 rounded-xl border border-[#854d0e]/30 flex flex-col justify-between">
                      <div className="flex justify-between items-start text-yellow-500 text-xs font-bold">
                        <span>ESTABLES</span>
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-3xl font-mono font-black text-yellow-500">{dashboardStats.estables}</span>
                        <span className="text-[10px] block text-slate-400 mt-1">Margen similar (±10%)</span>
                      </div>
                    </div>

                  </div>

                  {/* SECONDARY ROW */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    <div className="bg-[#121c33] p-4 rounded-xl border border-red-900/40 relative overflow-hidden">
                      <div className="absolute right-3 top-3 bg-red-500/10 text-red-400 p-1.5 rounded-lg border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 animate-bounce" />
                      </div>
                      <span className="text-[10px] text-red-400 font-extrabold uppercase block tracking-wider">RIESGO CRÍTICO (CAÍDA {'>'}50%)</span>
                      <span className="text-3xl font-mono font-black mt-2 block text-red-500">{dashboardStats.riesgo} Clientes</span>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">Requieren plan de rescate inmediato o gracia para mantener estatus de club.</p>
                    </div>

                    <div className="bg-[#121c33] p-4 rounded-xl border border-emerald-900/40 relative overflow-hidden">
                      <div className="absolute right-3 top-3 bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/20">
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase block tracking-wider">PRÓXIMOS ASCENSOS</span>
                      <span className="text-3xl font-mono font-black mt-2 block text-emerald-400">{dashboardStats.ascensos} Clientes</span>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">Están en el rango de 15% para desbloquear la categoría siguiente.</p>
                    </div>

                    <div className="bg-[#121c33] p-4 rounded-xl border border-amber-900/40 relative overflow-hidden">
                      <div className="absolute right-3 top-3 bg-amber-500/10 text-amber-400 p-1.5 rounded-lg border border-amber-500/20">
                        <ArrowDownRight className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-[10px] text-amber-400 font-extrabold uppercase block tracking-wider">PRÓXIMOS DESCENSOS</span>
                      <span className="text-3xl font-mono font-black mt-2 block text-amber-500">{dashboardStats.descensos} Clientes</span>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">Están al límite marginal o a menos del 15% de caer de su categoría actual.</p>
                    </div>

                  </div>

                  {/* MINI HISTORIC TREND GRAPH (SVG) */}
                  <div className="bg-[#0c182e] p-5 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase block">Tendencia Anual de Facturación Agrupada</span>
                    <h3 className="text-sm font-bold text-white mb-4">Evolución Comercial Ciclos 2024 - 2026</h3>
                    
                    <div className="h-28 flex items-end justify-between gap-6 px-10 pt-4 relative">
                      {/* Grid Line lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                        <div className="border-b border-white w-full"></div>
                        <div className="border-b border-white w-full"></div>
                        <div className="border-b border-white w-full"></div>
                      </div>

                      {/* Bar 1 */}
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-16 bg-slate-700/50 hover:bg-slate-700 rounded-t-md transition-all h-16"></div>
                        <span className="text-[10px] text-slate-500 mt-2 font-bold font-mono">Ciclo 2024</span>
                      </div>

                      {/* Bar 2 */}
                      <div className="flex-1 flex flex-col items-center">
                        <div className="w-16 bg-[#1D4ED8]/60 hover:bg-[#1D4ED8] rounded-t-md transition-all h-20"></div>
                        <span className="text-[10px] text-[#38BDF8] mt-2 font-bold font-mono">Ciclo 2025</span>
                      </div>

                      {/* Bar 3 */}
                      <div className="flex-1 flex flex-col items-center animate-pulse">
                        <div className="w-16 bg-emerald-500/60 hover:bg-emerald-500 rounded-t-md h-24"></div>
                        <span className="text-[10px] text-emerald-400 mt-2 font-black font-mono">Ciclo 2026 (Actual)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------- SUBTAB 2: CLIENTES & FICHAS ----------------- */}
              {activeTab === 'clients' && (
                <div className="space-y-4">
                  {/* Actions Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101a30] p-4 rounded-xl border border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-sky-400" /> Administración de Fichas del Club
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Busca socios, ajusta montos manuales o importa planillas masivas de facturación anual.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSalesImportModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all border border-emerald-500/20"
                    >
                      <Download className="w-4 h-4" /> Importar Ventas Anuales
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  
                  {/* LEFT COLUMN: CLIENT LIST EQUIPMENT WITH SEARCH */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-[#101a30] p-3 rounded-xl border border-slate-800 space-y-3">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar por nombre, email o rut..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full bg-[#0a101e] px-9 py-2 rounded-xl text-xs border border-slate-700 focus:outline-none focus:border-sky-500 text-white placeholder-slate-400"
                        />
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      </div>
                      
                      <select
                        value={clientCategoryFilter}
                        onChange={(e) => setClientCategoryFilter(e.target.value)}
                        className="w-full bg-[#0a101e] px-2 py-2 rounded-xl text-xs border border-slate-700 focus:outline-none focus:border-sky-500 text-white"
                      >
                        <option value="Todas">Todas las categorías</option>
                        {tiersList.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>

                    {/* RENDERED LIST */}
                    <div className="bg-[#0f172a] rounded-xl border border-slate-800 max-h-[380px] overflow-y-auto divide-y divide-slate-800">
                      {filteredClientList.map(c => (
                        <div 
                          key={c.id}
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setIsEditingClient(false);
                          }}
                          className={`p-3 text-left cursor-pointer transition-all ${selectedClientId === c.id ? 'bg-[#1e2e4a] border-l-4 border-sky-400' : 'hover:bg-[#121c2f]'}`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold block text-white truncate max-w-[130px]">{c.name}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded border ${
                              c.calculatedTier.name.includes('Platinum') ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                              c.calculatedTier.name.includes('Oro') ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                              c.calculatedTier.name.includes('Plata') ? 'bg-sky-500/10 text-sky-450 border-sky-500/20' :
                              'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {c.calculatedTier.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#94a3b8] block mt-0.5">{c.clinica || 'Sin clínica registrada'}</span>
                          <span className="text-[9px] font-mono text-emerald-400 block mt-1">2026: ${c.ventas.v2026.toLocaleString('es-CL')}</span>
                        </div>
                      ))}
                      {filteredClientList.length === 0 && (
                        <div className="p-8 text-center text-slate-500 italic text-xs">Sin registros de coincidencia.</div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: DETAILED INTERACTIVE VIEW */}
                  <div className="md:col-span-3">
                    {selectedClient ? (
                      <div className="bg-[#0f1b35] rounded-xl border border-slate-800 p-5 space-y-5">
                        
                        {/* Header card with category status */}
                        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                          <div>
                            <span className="text-[9px] text-[#38bdf8] font-bold block tracking-wider uppercase">Ficha de Cliente Integrada</span>
                            <h3 className="text-lg font-black text-white">{selectedClient.name}</h3>
                            <span className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> Comuna: {selectedClient.region || 'No especificada'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 text-[11px] font-black uppercase rounded-full border ${
                              selectedClient.categoria.includes('Platinum') ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                              selectedClient.categoria.includes('Oro') ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                              'bg-slate-700/30 text-slate-300 border-slate-700'
                            }`}>
                              Socio {selectedClient.categoria}
                            </span>
                            <span className="text-[10px] block text-slate-400 mt-2 font-mono">RUT: {selectedClient.rut}</span>
                          </div>
                        </div>

                        {!isEditingClient ? (
                          <div className="space-y-4">
                            
                            {/* Contact data pane */}
                            <div className="grid grid-cols-2 gap-4 text-xs bg-[#0b1324] p-3 rounded-lg border border-slate-800">
                              <div>
                                <span className="text-slate-500 block">Establecimiento / Clínica:</span>
                                <span className="text-slate-200 font-bold">{selectedClient.clinica || '---'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">E-mail:</span>
                                <span className="text-slate-200 font-bold">{selectedClient.email || '---'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Teléfono / WhatsApp:</span>
                                <span className="text-slate-200 font-bold">{selectedClient.phone || '---'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Categoría de Facturación:</span>
                                <span className="text-emerald-400 font-extrabold">{selectedClient.categoria}</span>
                              </div>
                            </div>

                            {/* Historic cycle chart metrics */}
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block mb-3">Historial Comercial del Ciclo Anual (Ventas)</span>
                              <div className="space-y-3.5">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-400">Ciclo Anual 2024:</span>
                                    <span className="font-mono text-slate-200">${selectedClient.ventas?.v2024.toLocaleString('es-CL')}</span>
                                  </div>
                                  <div className="w-full bg-[#0d1527] h-2 rounded-full overflow-hidden">
                                    <div className="bg-slate-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(10, ((selectedClient.ventas?.v2024 || 0) / 12000000) * 100))}%` }}></div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-400">Ciclo Anual 2025:</span>
                                    <span className="font-mono text-slate-200">${selectedClient.ventas?.v2025.toLocaleString('es-CL')}</span>
                                  </div>
                                  <div className="w-full bg-[#0d1527] h-2 rounded-full overflow-hidden">
                                    <div className="bg-indigo-505 bg-[#38bdf8] h-full rounded-full" style={{ width: `${Math.min(100, Math.max(10, ((selectedClient.ventas?.v2025 || 0) / 12000000) * 100))}%` }}></div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-400">Ciclo Anual 2026 (Mayo Cierre):</span>
                                    <span className="font-mono text-emerald-400 font-extrabold">${selectedClient.ventas?.v2026.toLocaleString('es-CL')}</span>
                                  </div>
                                  <div className="w-full bg-[#0d1527] h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(10, ((selectedClient.ventas?.v2026 || 0) / 12000000) * 100))}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Commercial Notes logs */}
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block">Notas Comerciales e Historial de Comunicación CRM</span>
                              <div className="bg-[#0b1324] p-3 rounded-lg border border-slate-800 text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-line text-slate-300">
                                {selectedClient.historialUnificado || 'Sin bitácora registrada para este cliente.'}
                              </div>
                            </div>

                            <button 
                              onClick={() => {
                                setIsEditingClient(true);
                              }}
                              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ml-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Editar Datos & Ventas
                            </button>

                          </div>
                        ) : (
                          /* EDITING PANE FORM */
                          <div className="space-y-4">
                            <span className="text-xs font-black text-sky-450 block uppercase text-sky-400 mb-2">Editar Ficha y Valores de Ciclo en Base de Datos</span>
                            
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-slate-400">Nombre de Médico:</label>
                                <input type="text" value={editName} onChange={(e)=>setEditName(e.target.value)} className="w-full bg-[#0d1527] px-3 py-1.5 rounded-lg border border-slate-700 text-white" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-400">Clínica Razón Social:</label>
                                <input type="text" value={editClinica} onChange={(e)=>setEditClinica(e.target.value)} className="w-full bg-[#0d1527] px-3 py-1.5 rounded-lg border border-slate-700 text-white" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-400">E-mail corporativo:</label>
                                <input type="email" value={editEmail} onChange={(e)=>setEditEmail(e.target.value)} className="w-full bg-[#0d1527] px-3 py-1.5 rounded-lg border border-slate-700 text-white" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-400">Celular / WhatsApp:</label>
                                <input type="text" value={editPhone} onChange={(e)=>setEditPhone(e.target.value)} className="w-full bg-[#0d1527] px-3 py-1.5 rounded-lg border border-slate-700 text-white" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-slate-400">RUT Empresa:</label>
                                <input type="text" value={editRut} onChange={(e)=>setEditRut(e.target.value)} className="w-full bg-[#0d1527] px-3 py-1.5 rounded-lg border border-slate-700 text-white" />
                              </div>
                            </div>

                            <div className="border-t border-slate-800 pt-3 grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold block">VENTAS 2024 (Ciclo):</label>
                                <input type="number" value={editSales2024} onChange={(e)=>setEditSales2024(Number(e.target.value))} className="w-full bg-[#0d1527] px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-xs text-white" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold block">VENTAS 2025 (Ciclo):</label>
                                <input type="number" value={editSales2025} onChange={(e)=>setEditSales2025(Number(e.target.value))} className="w-full bg-[#0d1527] px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-xs text-white" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-emerald-400 font-bold block">VENTAS 2026 (Actual):</label>
                                <input type="number" value={editSales2026} onChange={(e)=>setEditSales2026(Number(e.target.value))} className="w-full bg-[#0d1527] px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-xs text-white" />
                              </div>
                            </div>

                            <div className="space-y-1 border-t border-slate-800 pt-3">
                              <label className="text-slate-400 text-xs block">Nueva Bitácora Comercial / Comentario:</label>
                              <textarea
                                value={newNote}
                                onChange={(e)=>setNewNote(e.target.value)}
                                placeholder="Escribe un reporte de contacto o motivo del ajuste comercial..."
                                className="w-full bg-[#0d1527] p-2.5 rounded-lg border border-slate-700 text-xs text-white resize-none h-16"
                              ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                              <button 
                                onClick={()=>setIsEditingClient(false)} 
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs"
                              >
                                Cancelar
                              </button>
                              <button 
                                onClick={handleSaveClientInfo} 
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                              >
                                <Save className="w-3.5 h-3.5" /> Guardar Cambios
                              </button>
                            </div>

                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="p-10 text-center text-slate-500 italic">No hay clientes en la base de datos de Intranet. Abra la pestaña Clientes Intranet para importar.</div>
                    )}
                  </div>

                </div>
              </div>
            )}

              {/* ----------------- SUBTAB 3: CLUB CATEGORIAS & CONFIGURATION ----------------- */}
              {activeTab === 'club_config' && (
                <div className="space-y-6">
                  
                  {/* CATEGORIES CARD BOARD */}
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-400" /> Configuración de Niveles de Club Social
                      </h2>
                      <p className="text-xs text-slate-400">Reglas comerciales fijas basadas en facturación anual consolidada</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {tiersList.map((t, idx) => (
                      <div key={t.name} className={`p-4 rounded-xl border border-slate-800 bg-gradient-to-b ${t.color}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black uppercase font-mono tracking-wider">{t.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/35 text-white">Nivel {idx + 1}</span>
                        </div>
                        <span className="text-[17px] font-mono font-black block mt-2 text-white">
                          {t.min === 0 ? '$0' : `$${(t.min / 1000000).toFixed(1)}M`} 
                          <span className="text-[10px] text-slate-400 font-normal"> a </span>
                          {t.max === Infinity ? 'Infinito' : `$${(t.max / 1000000).toFixed(1)}M`}
                        </span>
                        
                        <div className="mt-3.5 pt-2 border-t border-white/5 space-y-1.5 text-[9px] text-[#e2e8f0]">
                          <span className="block font-bold uppercase text-[#94a3b8]">Beneficio Estrella:</span>
                          <span className="bg-sky-550 block bg-[#1d4ed8]/30 px-1.5 py-1 rounded text-white italic font-bold">
                            {t.primaryBenefit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* SIMULATOR TOOL */}
                  {selectedClient && (
                    <div className="bg-[#121c33] p-5 rounded-xl border border-[#3b82f6]/20 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="bg-[#3b82f6]/20 text-[#38bdf8] text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-[#3b82f6]/30 tracking-wider">
                            Herramienta de Simulación de Venta & Fidelidad
                          </span>
                          <h4 className="text-md font-bold mt-1 text-white">Prueba de Ascenso para: <span className="text-sky-400">{selectedClient.name}</span></h4>
                          <p className="text-xs text-slate-400">Suma compras simuladas para ver qué categoría comercial alcanzaría automáticamente en el ciclo 2026.</p>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block text-[10px]">VENTAS REALES 2026</span>
                          <span className="text-sm font-mono font-black text-slate-300">${selectedClient.ventas?.v2026.toLocaleString('es-CL')}</span>
                        </div>
                      </div>

                      {/* Simulator Control */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono font-bold text-slate-350">
                          <span>$0 compra extra</span>
                          <span className="text-sky-450 text-sky-400">Monto simulación: +${simulatedVentas.toLocaleString('es-CL')}</span>
                          <span>+$15.000.000</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="15000000"
                          step="100000"
                          value={simulatedVentas}
                          onChange={(e) => setSimulatedVentas(Number(e.target.value))}
                          className="w-full accent-sky-500 h-2 bg-[#090f1d] rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Display Results */}
                      {activeSimulatedMetrics && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3.5 border-t border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block">PROYECCIÓN DE COMPRAS:</span>
                            <span className="text-lg font-mono font-black text-white">
                              ${activeSimulatedMetrics.futureSales.toLocaleString('es-CL')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">CATEGORÍA OBTENIDA:</span>
                            <span className="text-md font-black text-sky-400 flex items-center gap-1.5 mt-1">
                              <Award className="w-5 h-5 text-yellow-400" /> {activeSimulatedMetrics.futureTier.name}
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-[10px] text-slate-400 block">PROGRESO PRÓXIMA CATEGORÍA ({activeSimulatedMetrics.nextTier?.name}):</span>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex-1 bg-slate-800 h-3 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${activeSimulatedMetrics.progressPercent}%` }}></div>
                              </div>
                              <span className="text-xs font-mono font-black text-emerald-400">{activeSimulatedMetrics.progressPercent}%</span>
                            </div>
                            <span className="text-[9px] text-[#94a3b8] block mt-1">
                              {activeSimulatedMetrics.nextBrecha > 0 
                                ? `Faltan $${activeSimulatedMetrics.nextBrecha.toLocaleString('es-CL')} de compra para subir de nivel` 
                                : '¡Felicidades, se encuentra en el nivel Premium máximo del club comercial!'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* ----------------- SUBTAB 4: SMART SEGMENTATION ENGINE ----------------- */}
              {activeTab === 'segmentation' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-sky-450 text-sky-400" /> Segmentador Analítico de Cartera
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">Combina filtros dinámicos basados estrictamente en ciclos anuales para construir campañas precisas</p>
                    </div>
                  </div>

                  {/* FILTER CRITERIA BOX */}
                  <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">1. CATEGORÍA DE CLUB (2026):</span>
                      <select
                        value={segCategory}
                        onChange={(e)=>setSegCategory(e.target.value)}
                        className="w-full bg-[#0a101e] px-2 py-2.5 rounded-lg border border-slate-700 text-xs text-white"
                      >
                        <option value="Todas">Todas las categorías</option>
                        {tiersList.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">2. COMPORTAMIENTO COMERCIAL:</span>
                      <select
                        value={segGrowth}
                        onChange={(e)=>setSegGrowth(e.target.value)}
                        className="w-full bg-[#0a101e] px-2 py-2.5 rounded-lg border border-slate-700 text-xs text-white"
                      >
                        <option value="Todas">Todos los estados</option>
                        <option value="Crecieron">Aumentaron compras (Crecieron)</option>
                        <option value="Disminuyeron">Redujeron compras (Disminuyeron)</option>
                        <option value="Estables">Comportamiento similar (Estables)</option>
                        <option value="Dormidos">Dormidos (2025 compra & 2026 cero)</option>
                        <option value="Perdidos">Perdidos (2024 compra & 2025/2026 cero)</option>
                        <option value="Riesgo Alto">Caída severa de compras ({'>'}50%)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">3. ÚLTIMA ADQUISICIÓN REGISTRADA:</span>
                      <select
                        value={segLastPurchase}
                        onChange={(e)=>setSegLastPurchase(e.target.value)}
                        className="w-full bg-[#0a101e] px-2 py-2.5 rounded-lg border border-slate-700 text-xs text-white"
                      >
                        <option value="Todas">Cualquier periodo</option>
                        <option value="En ciclo actual">Durante ciclo 2026 vigente</option>
                        <option value="Solo ciclo anterior">Ventas solo en ciclo anterior (Dormidos)</option>
                      </select>
                    </div>
                  </div>

                  {/* RESULTS GRID */}
                  <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-450 text-slate-400 text-[11px] uppercase">
                        Clientes que califican en este segmento: <span className="text-sky-400 font-black font-mono">{segmentedClients.length}</span>
                      </span>
                      {segmentedClients.length > 0 && (
                        <button 
                          onClick={() => {
                            setCampaignRecipients(segmentedClients);
                            setActiveTab('campaigns');
                            alert(`Se han exportado ${segmentedClients.length} clientes seleccionados al módulo de Campañas Masivas.`);
                          }}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" /> Enviar este Segmento a Campaña 💬
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-450 text-slate-400 uppercase font-extrabold font-mono text-[9px]">
                            <th className="p-2">Médico / Centro</th>
                            <th className="p-2">Clínica</th>
                            <th className="p-2 text-right">Compra 2025</th>
                            <th className="p-2 text-right text-emerald-400">Compra 2026</th>
                            <th className="p-2 text-center">Desviación</th>
                            <th className="p-2 text-center">Estatus</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {segmentedClients.map(c => (
                            <tr key={c.id} className="hover:bg-slate-850 hover:bg-[#121c2e]">
                              <td className="p-2 font-bold text-slate-100">{c.name}</td>
                              <td className="p-2 text-slate-400">{c.clinica || '---'}</td>
                              <td className="p-2 text-right font-mono text-slate-350">${c.ventas.v2025.toLocaleString('es-CL')}</td>
                              <td className="p-2 text-right font-mono text-emerald-400 font-extrabold">${c.ventas.v2026.toLocaleString('es-CL')}</td>
                              <td className="p-2 text-center font-mono">
                                <span className={c.percentChange > 0 ? 'text-emerald-400' : c.percentChange < 0 ? 'text-rose-400' : 'text-slate-400'}>
                                  {c.percentChange === 0 ? '0%' : `${c.percentChange > 0 ? '+' : ''}${(c.percentChange * 100).toFixed(0)}%`}
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                  c.segmentGroup === 'crecer' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  c.segmentGroup === 'riesgo_alto' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                  'bg-slate-800 text-slate-300'
                                }`}>
                                  {c.segmentGroup === 'crecer' ? 'Creció' : 
                                   c.segmentGroup === 'riesgo_alto' ? 'Riesgo Alto' : 
                                   c.segmentGroup === 'dormido' ? 'Dormido' : 'Estable'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {segmentedClients.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-500 italic">No hay registros que coincidan con la estrategia del filtro lógico establecido.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ----------------- SUBTAB 5: CAMPAÑAS MASIVAS ----------------- */}
              {activeTab === 'campaigns' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        <Send className="w-5 h-5 text-indigo-400 animate-pulse" /> Motor de Despliegue de Campañas Masivas
                      </h2>
                      <p className="text-xs text-slate-400">Automatiza envíos directos a WhatsApp, Emails o ambos canales selectivamente</p>
                    </div>
                    {campaignRecipients.length > 0 && (
                      <button 
                        onClick={() => {
                          setCampaignRecipients([]);
                          setCampaignTriggered(false);
                          setCampaignLog([]);
                        }}
                        className="text-[10px] text-slate-400 underline font-mono cursor-pointer"
                      >
                        Vaciar Lote de Campaña
                      </button>
                    )}
                  </div>

                  {/* CAMPAIGN INTERFACE GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Setup controls */}
                    <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 space-y-4">
                      <span className="text-xs font-bold text-sky-400 block uppercase">⚙️ Configuración del Envío</span>
                      
                      <div className="space-y-1.5 text-xs">
                        <label className="text-slate-400 block">Canal Predilecto de Comunicación:</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            type="button"
                            onClick={() => setCampaignChannel('whatsapp')}
                            className={`p-2 rounded-lg font-bold border text-[11px] ${campaignChannel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-[#0d1527] border-slate-700 text-slate-400'}`}
                          >
                            <span className="block text-center text-lg">💬</span>
                            <span>WhatsApp</span>
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => setCampaignChannel('email')}
                            className={`p-2 rounded-lg font-bold border text-[11px] ${campaignChannel === 'email' ? 'bg-sky-500/20 text-sky-300 border-sky-500/50' : 'bg-[#0d1527] border-slate-700 text-slate-400'}`}
                          >
                            <span className="block text-center text-lg">✉️</span>
                            <span>Email</span>
                          </button>

                          <button 
                            type="button"
                            onClick={() => setCampaignChannel('both')}
                            className={`p-2 rounded-lg font-bold border text-[11px] ${campaignChannel === 'both' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'bg-[#0d1527] border-slate-700 text-slate-400'}`}
                          >
                            <span className="block text-center text-lg">⚡</span>
                            <span>Ambos</span>
                          </button>
                        </div>
                      </div>

                      {/* Client Recipient Counts */}
                      <div className="bg-[#0b1324] p-3 rounded-lg border border-slate-800 text-xs">
                        <div className="flex justify-between font-bold mb-1">
                          <span className="text-slate-400">Total Destinatarios:</span>
                          <span className="text-sky-400 font-mono text-sm font-black">{campaignRecipients.length}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          {campaignRecipients.length > 0 
                            ? 'Clientes cargados para envío de variables automatizado.' 
                            : 'Faltan destinatarios. Primero use el Segmentador IA o agregue de la cartera de clientes.'}
                        </p>
                      </div>

                      {campaignRecipients.length > 0 && (
                        <button
                          type="button"
                          disabled={isSending}
                          onClick={handleLaunchCampaign}
                          className={`w-full py-3 bg-emerald-600 hover:bg-emerald-700 font-black text-white text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors ${isSending ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {isSending ? (
                            <span>Transmitiendo con variables en vivo...</span>
                          ) : (
                            <>
                              <Send className="w-4 h-4 animate-bounce" />
                              <span>Lanzar Campaña Masiva</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Preview Area & Console */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 space-y-3">
                        <span className="text-xs font-bold text-slate-400 block uppercase">🔍 Vista Previa Dinámica (Primer Destinatario)</span>
                        
                        {campaignRecipients.length > 0 ? (
                          <div className="space-y-3">
                            <div className="bg-[#0b1324] p-3.5 rounded-lg border border-slate-700 text-xs space-y-1">
                              <div><span className="text-slate-500 font-bold">Para:</span> <span className="text-slate-200">{campaignRecipients[0].name} ({campaignRecipients[0].clinica})</span></div>
                              <div><span className="text-slate-500 font-bold">Mail:</span> <span className="text-slate-200">{campaignRecipients[0].email}</span></div>
                              <div><span className="text-slate-500 font-bold">Canal:</span> <span className="text-sky-400 font-bold uppercase">{campaignChannel}</span></div>
                            </div>
                            
                            <div className="bg-[#121f37] p-3.5 rounded-lg border border-slate-700 font-serif text-sm text-[#e2e8f0] leading-relaxed whitespace-pre-line overflow-y-auto max-h-48">
                              {replaceMessageVariables(messageTemplate, enrichedClients.find(ec => ec.id === campaignRecipients[0].id))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-10 text-slate-550 text-slate-500 italic text-xs">
                            Cargue destinatarios desde el Segmentador IA para ver la simulación en vivo de las plantillas de correo magistral.
                          </div>
                        )}
                      </div>

                      {/* Simulated sending screen */}
                      {campaignTriggered && (
                        <div className="bg-black/40 rounded-xl border border-slate-800 p-4 space-y-2 font-mono">
                          <span className="text-[10px] text-sky-400 font-black tracking-wider uppercase block">Transmisión de Comunicado Técnico en Lote</span>
                          <div className="bg-black p-3.5 rounded-lg h-36 overflow-y-auto text-[10px] space-y-1 text-slate-350 select-text">
                            {campaignLog.map((log, idx) => (
                              <div key={idx} className="leading-relaxed">{log}</div>
                            ))}
                            {isSending && (
                              <div className="text-yellow-400 font-bold animate-pulse">⚙️ Conectando pasarela API Cimasur, despachando cola...</div>
                            )}
                            {!isSending && campaignLog.length > 0 && (
                              <div className="text-emerald-400 font-bold">✓ Envío completado. Bitácoras y auditoría salvadas de forma segura.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* ----------------- SUBTAB 6: CUSTOM TEMPLATE STRATEGIES ----------------- */}
              {activeTab === 'templates' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-450 text-sky-400" /> Estrategias de Plantilla
                      </h2>
                      <p className="text-xs text-slate-400">Personaliza la redacción y scripts de tu fuerza comercial con variables dinámicas de Cimasur</p>
                    </div>
                  </div>

                  {/* TEMPLATES WORKSPACE */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    
                    {/* Left Quick Helpers list */}
                    <div className="space-y-4">
                      <div className="bg-[#101b33] p-3 rounded-xl border border-slate-800 space-y-2.5">
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Ayuda de Redacción</span>
                        <p className="text-[11px] text-slate-400 leading-normal">Haz clic sobre cualquier etiqueta dinámica para insertarla automáticamente al final de la plantilla de mensaje.</p>
                        
                        <div className="space-y-1.5 pt-2">
                          <button onClick={()=>handleInsertVariable('{{NOMBRE}}')} className="w-full text-left bg-[#0a101e] hover:bg-slate-800 px-2 py-1.5 rounded text-[10px] text-[#38bdf8] font-mono font-bold block">
                            {"{{NOMBRE}}"} - Nombre Veterinario
                          </button>
                          <button onClick={()=>handleInsertVariable('{{CLINICA}}')} className="w-full text-left bg-[#0a101e] hover:bg-slate-800 px-2 py-1.5 rounded text-[10px] text-[#38bdf8] font-mono font-bold block">
                            {"{{CLINICA}}"} - Establecimiento
                          </button>
                          <button onClick={()=>handleInsertVariable('{{CATEGORIA}}')} className="w-full text-left bg-[#0a101e] hover:bg-slate-800 px-2 py-1.5 rounded text-[10px] text-[#38bdf8] font-mono font-bold block">
                            {"{{CATEGORIA}}"} - Categoría Actual
                          </button>
                          <button onClick={()=>handleInsertVariable('{{CATEGORIA_NUEVA}}')} className="w-full text-left bg-[#0a101e] hover:bg-slate-800 px-2 py-1.5 rounded text-[10px] text-[#38bdf8] font-mono font-bold block">
                            {"{{CATEGORIA_NUEVA}}"} - Nueva para Upgrade
                          </button>
                          <button onClick={()=>handleInsertVariable('{{VENTAS}}')} className="w-full text-left bg-[#0a101e] hover:bg-slate-800 px-2 py-1.5 rounded text-[10px] text-[#38bdf8] font-mono font-bold block">
                            {"{{VENTAS}}"} - Compras Ciclo 2026
                          </button>
                          <button onClick={()=>handleInsertVariable('{{BRECHA}}')} className="w-full text-left bg-[#0a101e] hover:bg-slate-800 px-2 py-1.5 rounded text-[10px] text-[#38bdf8] font-mono font-bold block">
                            {"{{BRECHA}}"} - Falta para próximo nivel
                          </button>
                          <button onClick={()=>handleInsertVariable('{{BENEFICIO}}')} className="w-full text-left bg-[#0a101e] hover:bg-slate-800 px-2 py-1.5 rounded text-[10px] text-[#38bdf8] font-mono font-bold block">
                            {"{{BENEFICIO}}"} - Beneficio Clave
                          </button>
                        </div>
                      </div>

                      {/* Quick preset selector */}
                      <div className="bg-[#101b33] p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Cargar Modelo de Negocio</span>
                        <button onClick={()=>setMessageTemplate(PRESET_TEMPLATES['activo'])} className="w-full text-left bg-[#1d2d50] hover:bg-[#253965] px-2 py-1 text-[10px] py-1.5 rounded font-black block">
                          Fidelización Socio Activo
                        </button>
                        <button onClick={()=>setMessageTemplate(PRESET_TEMPLATES['crecio'])} className="w-full text-left bg-[#1d2d50] hover:bg-[#253965] px-2 py-1 text-[10px] py-1.5 rounded font-black block">
                          Reconocimiento y Crecimiento
                        </button>
                        <button onClick={()=>setMessageTemplate(PRESET_TEMPLATES['disminuyo'])} className="w-full text-left bg-[#1d2d50] hover:bg-[#253965] px-2 py-1 text-[10px] py-1.5 rounded font-black block">
                          Alerta de Reducción / Plan de Rescate
                        </button>
                        <button onClick={()=>setMessageTemplate(PRESET_TEMPLATES['dormido'])} className="w-full text-left bg-[#1d2d50] hover:bg-[#253965] px-2 py-1 text-[10px] py-1.5 rounded font-black block">
                          Plan de Recuperación Dormido
                        </button>
                      </div>
                    </div>

                    {/* Master Editor */}
                    <div className="md:col-span-3 space-y-4">
                      <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 space-y-3">
                        <span className="text-xs font-bold text-slate-450 text-slate-400 block uppercase">✍️ Editor de Texto de Plantilla de Mensaje</span>
                        
                        <textarea
                          value={messageTemplate}
                          onChange={(e)=>setMessageTemplate(e.target.value)}
                          className="w-full h-80 bg-[#070b14] p-3.5 rounded-xl border border-slate-705 border-slate-700 text-xs font-serif text-white leading-relaxed focus:outline-none focus:border-sky-500"
                        ></textarea>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[10px] text-slate-500">Maneja etiquetas dinámicas sensibles para WhatsApp e Email corporativo magistral.</span>
                          <button 
                            onClick={()=>{
                              alert("Configuración de plantilla guardada localmente para sesión actual.");
                            }}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-lg"
                          >
                            Guardar Plantilla
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* ----------------- SUBTAB 7: VISUAL PIECES GENERATOR ----------------- */}
              {activeTab === 'image_gen' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" /> Generador de Piezas Promocionales de Fidelidad
                      </h2>
                      <p className="text-xs text-slate-400">Genera hermosas postales de fidelización con el nombre del cliente y su categoría para WhatsApp</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    
                    {/* Controls Panel */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 space-y-4">
                        <span className="text-xs font-bold text-sky-400 block uppercase">🎨 Personalizador Gráfico</span>
                        
                        <div className="space-y-3 text-xs">
                          <div className="space-y-1">
                            <label className="text-slate-400">Tipo de Campaña Gráfica / Tema:</label>
                            <select 
                              value={postcardType}
                              onChange={(e)=> {
                                const type = e.target.value as any;
                                setPostcardType(type);
                                if (type === 'ascenso') {
                                  setPostcardTitle('¡Felicidades por tu Ascenso!');
                                  setPostcardSubtext('Has desbloqueado un nuevo nivel preferencial de descuentos y asistencia homeopática.');
                                } else if (type === 'reactivacion') {
                                  setPostcardTitle('¡Queremos Volver a Verte!');
                                  setPostcardSubtext('Te otorgamos de manera excepcional estatus preferente y beneficios para tus siguientes pedidos.');
                                } else if (type === 'felicitacion') {
                                  setPostcardTitle('¡CIMASUR te Saluda!');
                                  setPostcardSubtext('Felicitamos tu sólida trayectoria profesional cuidando el bienestar de tus pacientes veterinarios.');
                                } else {
                                  setPostcardTitle('Beneficios Exclusivos Desbloqueados');
                                  setPostcardSubtext('Disfruta de muestras gratis, vademécums y despachos prioritarios en nuestra línea magistral.');
                                }
                              }}
                              className="w-full bg-[#0a101e] px-2.5 py-2 rounded-lg border border-slate-700 text-white focus:outline-none"
                            >
                              <option value="ascenso">Mejora / Ascenso de Categoría</option>
                              <option value="reactivacion">Plan de Reactivación / Recate</option>
                              <option value="felicitacion">Felicitaciones / Constancia Técnica</option>
                              <option value="beneficios">Beneficios Desbloqueados</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-400 font-bold">Título Principal:</label>
                            <input
                              type="text"
                              value={postcardTitle}
                              onChange={(e)=>setPostcardTitle(e.target.value)}
                              className="w-full bg-[#0a101e] px-2.5 py-2 rounded-lg border border-slate-700 text-white focus:outline-none text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-400 font-bold">Mensaje de Apoyo:</label>
                            <textarea
                              rows={3}
                              value={postcardSubtext}
                              onChange={(e)=>setPostcardSubtext(e.target.value)}
                              className="w-full bg-[#0a101e] p-2.5 rounded-lg border border-slate-700 text-white focus:outline-none text-xs resize-none"
                            ></textarea>
                          </div>
                        </div>

                        {selectedClient ? (
                          <button
                            type="button"
                            onClick={handleDownloadPostcard}
                            className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 font-black text-white text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            <span>Descargar Pieza en PNG</span>
                          </button>
                        ) : (
                          <div className="p-3 bg-red-500/10 text-red-400 text-center rounded text-xs">Debe seleccionar un cliente del módulo 2 para renderizar.</div>
                        )}
                      </div>
                    </div>

                    {/* LIVE VECTOR/CSS PREVIEW DISPLAY MOCKUP */}
                    <div className="lg:col-span-3 space-y-4">
                      
                      <span className="text-xs font-bold text-slate-400 block uppercase">🖥️ Vista Previa en Vivo de la Postal en Alta Definición</span>
                      
                      {selectedClient ? (
                        <div 
                          id="cimasur-promo-card-mockup" 
                          className={`w-full max-w-[500px] h-[320px] rounded-2xl border p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b shadow-lg text-left ${
                            selectedClient.categoria.includes('Platinum') ? 'from-[#1e1b4b] to-[#581c87] border-purple-800' :
                            selectedClient.categoria.includes('Oro') ? 'from-[#65320e] to-[#c2410c] border-yellow-700' :
                            selectedClient.categoria.includes('Plata') ? 'from-[#1e293b] to-[#475569] border-slate-600' :
                            'from-[#0f172a] to-[#1e293b] border-slate-750'
                          }`}
                        >
                          {/* Radial glowing vector layer */}
                          <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full filter blur-3xl pointer-events-none"></div>

                          {/* Top row */}
                          <div className="flex justify-between items-start z-10">
                            <div>
                              <span className="text-[10px] font-black tracking-widest text-[#38bdf8] uppercase block">CIMASUR CLUB</span>
                              <span className="text-xs text-white/40 block font-mono">ID: {selectedClient.id.substring(0, 8)}</span>
                            </div>
                            <span className="bg-white/10 text-white border border-white/20 text-[9px] font-bold px-3 py-1 rounded-full uppercase">
                              {selectedClient.categoria}
                            </span>
                          </div>

                          {/* Mid Row: Info */}
                          <div className="space-y-1.5 z-10 mt-6">
                            <span className="text-[10px] text-slate-350 block uppercase font-mono tracking-wider">PRESTIGIADO SOCIO COMERCIAL</span>
                            <h4 className="text-xl font-bold tracking-tight text-white leading-none">
                              {selectedClient.name}
                            </h4>
                            <span className="text-xs text-slate-300 block italic">
                              Clínica: {selectedClient.clinica || 'Socio Veterinario Autorizado'}
                            </span>
                          </div>

                          {/* Bottom Row Message */}
                          <div className="border-t border-white/10 pt-4 z-10 space-y-1">
                            <h5 className="text-[#38bdf8] font-bold text-sm leading-tight">{postcardTitle}</h5>
                            <p className="text-[11px] text-[#94a3b8] leading-tight line-clamp-2">
                              {postcardSubtext}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-16 border-2 border-dashed border-slate-800 text-center rounded-2xl text-slate-500 italic text-xs">
                          Cargando simulación del cliente...
                        </div>
                      )}

                    </div>

                  </div>

                </div>
              )}

              {/* ----------------- SUBTAB 8: COMMERCIAL OPPORTUNITIES ----------------- */}
              {activeTab === 'opportunities' && (
                <div className="space-y-6">
                  
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-sky-400" /> Oportunidades Comerciales & Alertas Algorítmicas
                      </h2>
                      <p className="text-xs text-slate-400">Análisis proactivo de brechas de nivel, caídas por ciclo y recomendaciones comerciales automáticas</p>
                    </div>
                  </div>

                  {/* MAIN ALERTS TABLE */}
                  <div className="bg-[#0f172a] rounded-xl border border-slate-800 overflow-hidden">
                    <div className="p-4 bg-[#10192e] border-b border-slate-800">
                      <span className="text-xs font-bold uppercase text-slate-400">Disparadores del Ciclo anual vigente</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[9px] font-mono">
                            <th className="p-3">Cliente Veterinario</th>
                            <th className="p-3">Facturación 2026</th>
                            <th className="p-3">Diferencia Comercial</th>
                            <th className="p-3">Brecha Próxima Categoría</th>
                            <th className="p-3">Acción Sugerida</th>
                            <th className="p-3">Campaña Recomendada</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {enrichedClients.map(c => {
                            // Suggest CRM Actions
                            let suggestedAction = 'Fidelizar estatus normal';
                            let campaignRec = 'Comunicado técnico';
                            let subColor = 'text-slate-300';

                            if (c.isPerdidos) {
                              suggestedAction = 'Recuperación prioritaria de cuenta inactiva';
                              campaignRec = 'CampañaVIP de Retorno';
                              subColor = 'text-red-400 font-bold';
                            } else if (c.isDormidos) {
                              suggestedAction = 'Reactivar con estatus Platinum promocional inmediato';
                              campaignRec = 'Recuperación de Cliente Dormido';
                              subColor = 'text-amber-400 font-bold';
                            } else if (c.isRiesgoAlto) {
                              suggestedAction = 'Llamado consultivo o plazo de gracia ampliado';
                              campaignRec = 'Alerta de Riesgo - Grace Period';
                              subColor = 'text-rose-500 font-bold';
                            } else if (c.isProximoAscenso) {
                              suggestedAction = `Promocionar compra de recetas para subir a ${c.nextTier?.name}`;
                              campaignRec = 'Invitación de Ascenso Magistral';
                              subColor = 'text-emerald-400 font-bold';
                            } else if (c.isProximoDescenso) {
                              suggestedAction = `Alertar peligro marginal de perder nivel ${c.calculatedTier.name}`;
                              campaignRec = 'Notificación de gracia y resguardo';
                              subColor = 'text-yellow-400';
                            }

                            return (
                              <tr key={c.id} className="hover:bg-slate-800/40">
                                <td className="p-3">
                                  <span className="font-bold block text-white">{c.name}</span>
                                  <span className="text-[10px] text-slate-500 block">{c.clinica}</span>
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-200">${c.ventas.v2026.toLocaleString('es-CL')}</td>
                                <td className="p-3 font-mono">
                                  <span className={c.percentChange >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-450 text-rose-400'}>
                                    {c.percentChange >= 0 ? `+` : ''}${(c.ventas.v2026 - c.ventas.v2025).toLocaleString('es-CL')}
                                  </span>
                                </td>
                                <td className="p-3 font-mono">
                                  {c.brechaAscenso > 0 ? (
                                    <span className="text-yellow-400">${c.brechaAscenso.toLocaleString('es-CL')}</span>
                                  ) : (
                                    <span className="text-slate-500">Nivel Máximo</span>
                                  )}
                                </td>
                                <td className={`p-3 text-[11px] ${subColor}`}>
                                  {suggestedAction}
                                </td>
                                <td className="p-3 text-[11px] text-sky-400">
                                  <button
                                    onClick={() => {
                                      setCampaignRecipients([c]);
                                      let tempKey = 'activo';
                                      if (c.isPerdidos) tempKey = 'perdido';
                                      else if (c.isDormidos) tempKey = 'dormido';
                                      else if (c.isRiesgoAlto) tempKey = 'riesgo_alto';
                                      else if (c.isProximoAscenso) tempKey = 'crecio';
                                      else if (c.isProximoDescenso) tempKey = 'disminuyo';
                                      
                                      setMessageTemplate(PRESET_TEMPLATES[tempKey]);
                                      setActiveTab('campaigns');
                                      alert(`Copiaste la plantilla recomendada de "${campaignRec}" para el cliente ${c.name}.`);
                                    }}
                                    className="px-2.5 py-1 bg-slate-800 text-sky-400 hover:bg-slate-705 hover:bg-[#1a2b4b] rounded text-[10px] font-bold tracking-tight transition-colors cursor-pointer"
                                  >
                                    Cargar Campaña 💬
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* SALES IMPORT MODAL OVERLAY */}
      {showSalesImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e192f] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#122240]">
              <div className="flex items-center gap-3 text-left">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-black text-white">Importador Inteligente de Ventas Anuales</h3>
                  <p className="text-[11px] text-slate-400">Pega datos desde Excel o CSV para sincronizar las compras de tus clientes</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowSalesImportModal(false);
                  setSalesImportText('');
                  setSalesImportResults(null);
                }}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1.5 bg-[#0b1324] rounded-lg border border-slate-800 cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Instructions */}
              <div className="bg-sky-500/10 border border-sky-500/25 p-3.5 rounded-xl text-xs space-y-2 leading-relaxed text-sky-200 text-left">
                <p className="font-bold flex items-center gap-1">
                  💡 ¿Cómo funciona la importación de ventas?
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-sky-300">
                  <li>Copia tus columnas directamente desde Excel o Sheets.</li>
                  <li>Las columnas deben contener el <strong className="text-white">RUT</strong> del cliente, seguido de las ventas de cada año.</li>
                  <li>Si un RUT existe pero no aparece con ventas en algún año, su valor para ese año quedará en <strong className="text-white">0</strong>.</li>
                  <li>Usa los selectores inferiores para mapear el número de columna correspondiente a cada dato.</li>
                </ol>
              </div>

              {/* Paste Textarea */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs text-slate-350 font-bold block">Pega el contenido tabulado de tu planilla aquí:</label>
                <textarea
                  value={salesImportText}
                  onChange={(e) => setSalesImportText(e.target.value)}
                  placeholder="Ejemplo de copiado de Excel (RUT / 2024 / 2025 / 2026):&#10;12.345.678-9&#9;1200000&#9;2300000&#9;3500000&#10;9.876.543-2&#9;0&#9;450000&#9;120000"
                  className="w-full h-32 bg-[#090f1d] p-3 rounded-xl border border-slate-705 text-xs text-white resize-none font-mono focus:outline-none focus:border-sky-500 placeholder-slate-600 focus:ring-1 focus:ring-sky-500"
                ></textarea>
              </div>

              {salesImportText.trim() && (
                <div className="space-y-4 text-left">
                  
                  {/* Column Configuration Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#111f38] p-3 rounded-xl border border-slate-800">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold block">Columna RUT:</label>
                      <select 
                        value={colMapping.rutIdx} 
                        onChange={(e) => setColMapping(prev => ({ ...prev, rutIdx: Number(e.target.value) }))}
                        className="w-full bg-[#0a101e] border border-slate-700 text-xs px-2 py-1.5 rounded-lg text-white"
                      >
                        <option value={0}>Columna 1</option>
                        <option value={1}>Columna 2</option>
                        <option value={2}>Columna 3</option>
                        <option value={3}>Columna 4</option>
                        <option value={4}>Columna 5</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold block">Ventas 2024:</label>
                      <select 
                        value={colMapping.v2024Idx} 
                        onChange={(e) => setColMapping(prev => ({ ...prev, v2024Idx: Number(e.target.value) }))}
                        className="w-full bg-[#0a101e] border border-slate-700 text-xs px-2 py-1.5 rounded-lg text-white"
                      >
                        <option value={-1}>Ninguna (Queda en 0)</option>
                        <option value={0}>Columna 1</option>
                        <option value={1}>Columna 2</option>
                        <option value={2}>Columna 3</option>
                        <option value={3}>Columna 4</option>
                        <option value={4}>Columna 5</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold block">Ventas 2025:</label>
                      <select 
                        value={colMapping.v2025Idx} 
                        onChange={(e) => setColMapping(prev => ({ ...prev, v2025Idx: Number(e.target.value) }))}
                        className="w-full bg-[#0a101e] border border-slate-700 text-xs px-2 py-1.5 rounded-lg text-white"
                      >
                        <option value={-1}>Ninguna (Queda en 0)</option>
                        <option value={0}>Columna 1</option>
                        <option value={1}>Columna 2</option>
                        <option value={2}>Columna 3</option>
                        <option value={3}>Columna 4</option>
                        <option value={4}>Columna 5</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-emerald-400 font-bold block">Ventas 2026 (Actual cierre):</label>
                      <select 
                        value={colMapping.v2026Idx} 
                        onChange={(e) => setColMapping(prev => ({ ...prev, v2026Idx: Number(e.target.value) }))}
                        className="w-full bg-[#0a101e] border border-slate-700 text-xs px-2 py-1.5 rounded-lg text-white"
                      >
                        <option value={-1}>Ninguna (Queda en 0)</option>
                        <option value={0}>Columna 1</option>
                        <option value={1}>Columna 2</option>
                        <option value={2}>Columna 3</option>
                        <option value={3}>Columna 4</option>
                        <option value={4}>Columna 5</option>
                      </select>
                    </div>
                  </div>

                  {/* Live Parsed Preview */}
                  {salesImportResults && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-355 text-slate-300 flex items-center gap-1">
                          📋 Vista previa interpretada ({salesImportResults.totalRows} filas detectadas)
                        </span>
                        <div className="flex items-center gap-4 text-[11px] font-mono">
                          <span className="text-emerald-400">✓ Encontrados en DB: {salesImportResults.matched}</span>
                          <span className="text-slate-450 text-slate-400">✗ No Encontrados: {salesImportResults.unmatched}</span>
                        </div>
                      </div>

                      {/* Preview Table */}
                      <div className="bg-[#0b1324] border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="sticky top-0 bg-[#070b15] border-b border-slate-800 text-[10px] text-slate-400 uppercase font-bold">
                            <tr>
                              <th className="p-2.5">RUT Planilla</th>
                              <th className="p-2.5">Socio Encontrado</th>
                              <th className="p-2.5">Ciclo 2024</th>
                              <th className="p-2.5">Ciclo 2025</th>
                              <th className="p-2.5 text-emerald-400">Ciclo 2026</th>
                              <th className="p-2.5 text-right">Estatus</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                            {salesImportResults.details.map((row, rIdx) => (
                              <tr key={rIdx} className={row.found ? "hover:bg-slate-800/40" : "bg-rose-500/5 opacity-50 text-slate-500 hover:bg-rose-500/10"}>
                                <td className="p-2.5">{row.rutOriginal || '---'}</td>
                                <td className="p-2.5 font-sans">
                                  {row.found ? (
                                    <span className="text-slate-200 font-semibold">{row.clientName}</span>
                                  ) : (
                                    <span className="text-slate-500 italic">RUT no registrado</span>
                                  )}
                                </td>
                                <td className="p-2.5">${row.v2024.toLocaleString('es-CL')}</td>
                                <td className="p-2.5">${row.v2025.toLocaleString('es-CL')}</td>
                                <td className="p-2.5 text-emerald-400 font-extrabold">${row.v2026.toLocaleString('es-CL')}</td>
                                <td className="p-2.5 text-right">
                                  {row.found ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20">Vinculado</span>
                                  ) : (
                                    <span className="bg-slate-850 text-slate-450 text-[9px] px-1.5 py-0.5 rounded border border-slate-800">Ignorado</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-850 bg-[#0d162a] flex justify-between items-center text-left">
              <span className="text-[11px] text-slate-400 italic font-medium">
                {salesImportResults && salesImportResults.matched > 0 
                  ? `Se actualizarán ${salesImportResults.matched} cuentas de socios. Los niveles VIP se re-calcularán según el año 2026.`
                  : "Por favor, ingresa los datos de compras anuales con RUT correspondiente."
                }
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSalesImportModal(false);
                    setSalesImportText('');
                    setSalesImportResults(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-xs text-slate-300 font-bold hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSalesImport}
                  disabled={!salesImportResults || salesImportResults.matched === 0 || isSending}
                  className={`px-5 py-2 text-xs font-black text-white rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    !salesImportResults || salesImportResults.matched === 0 || isSending
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border-slate-750"
                      : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-500/10"
                  }`}
                >
                  {isSending ? (
                    <>Cargando...</>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" /> Importar e Integrar Ventas
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
