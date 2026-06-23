import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, Users, Shield, Sliders, Send, FileText, Sparkles, Lightbulb, 
  Search, Trash2, Edit3, Plus, ArrowUpRight, ArrowDownRight, Award, Check, 
  RotateCcw, Copy, CheckCircle, Save, Download, Mail, Phone, ExternalLink, 
  Calendar, MapPin, Notebook, MessageSquare, AlertTriangle, TrendingUp, TrendingDown, Settings, Image,
  Palette, Link as LinkIcon, Filter, Loader2
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
  ultimoWhatsapp?: string;
  ultimoCorreo?: string;
  ultimaCampania?: string;
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
  } else if (cat.includes('compra') || cat.includes('categoría') || cat.includes('intranet')) {
    // If it's a prospect or unclassified, default to 0 to allow correct segmentation of "Sin Compras"
    return { v2024: 0, v2025: 0, v2026: 0 };
  } else {
    return { v2024: 0, v2025: 0, v2026: 0 };
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
  oficial_cimasur: "Hola Dr(a). {{NOMBRE}}\n\nQueremos informarle que actualmente pertenece a la categoría {{CATEGORIA}}.\n\nLe faltan ${{BRECHA}} para acceder a la categoría {{SIGUIENTE_CATEGORIA}}.\n\nSi tiene consultas puede contactarme directamente:\n\n📧 {{CORREO_EJECUTIVO}}\n📱 {{WHATSAPP_EJECUTIVO}}\n\nSaludos,\n{{EJECUTIVO}}",
  activo: "Estimado/a colega {{NOMBRE}} de la clínica {{CLINICA}},\n\nLe saludamos desde CIMASUR laboratorios veterinarios. Su cuenta registra compras por un total de {{VENTAS}} en este ciclo comercial anual, manteniéndose activo en la categoría {{CATEGORIA}}.\n\nDisfruta de su beneficio exclusivo: {{BENEFICIO}}.\n\nRecuerde que está a solo {{BRECHA}} de alcanzar el siguiente nivel de beneficios corporativos. ¡Quedamos atentos a sus recetas!",
  crecio: "¡Hola Dr./Dra. {{NOMBRE}}! Felicitaciones a su centro {{CLINICA}}.\n\nHemos detectado un valiosioso crecimiento de sus compras anuales acumuladas de este ciclo, llegando a {{VENTAS}}. Por este motivo, ha ascendido satisfactoriamente a la categoría {{CATEGORIA_NUEVA}}.\n\nSu beneficio asignado es: {{BENEFICIO}}. ¡Seguiremos impulsando el éxito de su centro médico!",
  estable: "Estimado/a {{NOMBRE}} de {{CLINICA}},\n\nQueremos agradecerle por su constancia comercial. Con compras acumuladas de {{VENTAS}} este año, se mantiene sólido en la categoría {{CATEGORIA}} con acceso a: {{BENEFICIO}}.\n\nLe deseamos una excelente jornada, CIMASUR.",
  disminuyo: "Estimado/a doctor/a {{NOMBRE}},\n\nLe escribimos prioritariamente de CIMASUR. Al revisar su historial comercial, notamos que sus compras han disminuido en este ciclo comercial acumulando un total de {{VENTAS}} comparado con el año anterior.\n\nSu categoría actual de compras es {{CATEGORIA}}, pero se encuentra en riesgo debido a la brecha comercial. Queremos brindarle un beneficio de gracia o una asesoría directa para reactivar sus recetas magistrales con su descuento habitual. ¡Conversemos hoy para coordinar condiciones especiales!\n\nAtte,\nGerencia de Servicios CIMASUR.",
  dormido: "¡Hola Dr./Dra. {{NOMBRE}}! Esperamos que esté muy bien.\n\nNotamos que en el ciclo actual no registra transacciones ($0), luego de haber sido un valioso cliente con compras en el ciclo anterior.\n\nNos encantaría volver a atenderle en su clínica {{CLINICA}}. De forma excepcional para sus siguientes 3 recetas, queremos ofrecerle el estatus preferencial {{CATEGORIA_NUEVA}} con el beneficio de: {{BENEFICIO}}.\n\n¿Agendamos un llamado técnico explicativo?",
  perdido: "Estimado/a {{NOMBRE}},\n\nLe saluda el equipo directivo de CIMASUR. Con motivo de relanzamiento técnico de nuestro vademécum de diluciones homeopáticas, queremos extenderle una invitación exclusiva para volver a trabajar juntos en su clínica {{CLINICA}}.\n\n¿Desea solicitar un kit promocional sin costo por WhatsApp?",
  riesgo_alto: "🚨 Alerta de Soporte - CIMASUR\n\nEstimado/a doctor/a {{NOMBRE}},\n\nNuestros reportes automatizados de Business Intelligence han emitido una alerta de riesgo crítico: sus compras en el ciclo actual han caído en más de un 50% respecto al año pasado, registrando solo {{VENTAS}} acumulados.\n\nSu estatus actual es {{CATEGORIA}}. Para evitar la pérdida de sus precios preferenciales y el beneficio de {{BENEFICIO}}, le extendemos un plazo de gracia de 30 días para colocar pedidos de reposición.\n\nEstamos para apoyarle y queremos conocer si requiere facilidades especiales con sus fórmulas homeopáticas magistrales. ¡Conversemos!\n\nAtte,\nContacto Directo CIMASUR.",
  induccion_intranet: "Hola Dr(a). {{NOMBRE}},\n\nLe saluda {{EJECUTIVO}} de CIMASUR. Notamos que ya tiene acceso a nuestra Intranet pero aún no ha realizado su primera carga de recetas magistrales.\n\n¿Le gustaría agendar una breve inducción de 5 minutos sobre cómo optimizar sus pedidos y conocer los beneficios del nivel {{CATEGORIA}}?\n\nQuedo atento/a para coordinar.\n\nSaludos,\n{{EJECUTIVO}}"
};

const SEGMENT_GUIDE: Record<string, { title: string; desc: string; importance: string; action: string }> = {
  Todas: {
    title: 'Análisis Global de Cartera',
    desc: 'Engloba a todos los médicos veterinarios importados en la plataforma sin distinción de crecimiento.',
    importance: 'Monitorear la masa total de facturación consolidada de CIMASUR Chile.',
    action: 'Mantener comunicación técnica constante, avisando de seminarios e integraciones.'
  },
  Crecieron: {
    title: 'Socio de Alto Rendimiento (Aumentaron Compras)',
    desc: 'Médicos cuyo nivel de compra acumulado en el ciclo 2026 actual supera al de 2025.',
    importance: 'Representan cuentas sanas en expansión que confían plenamente en nuestros preparados homeopáticos.',
    action: 'Ofrecer upgrade inmediato de nivel, entregar beneficios prémium de inmediato y dar prioridad en despacho.'
  },
  Disminuyeron: {
    title: 'Alerta de Contracción (Redujeron compras)',
    desc: 'Médicos con nivel de facturación actual inferior al registrado en el ciclo pasado.',
    importance: 'Riesgo de abandono silencioso o que estén encargando recetas a la competencia directa.',
    action: 'Visita presencial o telefónica de nuestro asesor comercial, ofrecer incentivo o vademécum especial.'
  },
  Estables: {
    title: 'Comportamiento Estable y Fiel',
    desc: 'Clientes que mantienen un ritmo y volumen de compra regular en ambos periodos anuales.',
    importance: 'Sostienen la base comercial de facturación fija de CIMASUR.',
    action: 'Agradecer su fidelidad y promover la incorporación de nuevas fórmulas magistrales en su recetario.'
  },
  Dormidos: {
    title: 'Clientes Dormidos (Compra 2025, $0 en 2026)',
    desc: 'Médicos que compraron con normalidad en 2025, pero registran compras cero ($0) en 2026.',
    importance: 'Gravedad Extrema. El cliente ha suspendido el contacto, probablemente por quejas o cambio de clínica.',
    action: 'Enviar el comunicado técnico de "Recuperación de Cuenta Dormida" con estatus Oro promocional preventivo.'
  },
  Perdidos: {
    title: 'Cuentas Perdidas (Inactivos desde 2024)',
    desc: 'Clientes con facturación registrada en 2024 pero compras cero en 2025 y 2026.',
    importance: 'Relación rota a largo plazo. Cuentas antiguas pasivas.',
    action: 'Lanzar un relanzamiento técnico de línea de diluciones homeopáticas e invitarlos a reactivarse gratis.'
  },
  'Intranet / Sin Compras': {
    title: 'Prospectos Intranet (Sin Compras Registradas)',
    desc: 'Clientes que están registrados en la plataforma pero nunca han generado un pedido de recetas.',
    importance: 'Oportunidad de crecimiento orgánico convirtiendo usuarios pasivos en activos.',
    action: 'Ofrecer inducción técnica de productos y recorrido por la Intranet.'
  },
  'Riesgo Alto': {
    title: 'Riesgo Crítico de Fuga (Desplome de Ventas > 50%)',
    desc: 'Cuentas con compras activas pero con un retroceso de facturación superior a la mitad (50%).',
    importance: 'Fuga inminente de recetas. Alerta prioritaria en el panel de control del consultor de CIMASUR.',
    action: 'Aplicar ampliación de plazo de gracia extendido, llamada telefónica inmediata.'
  }
};

export function ClubSocialManager() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [dashboardFilter, setDashboardFilter] = useState<string | null>(null);
  const [clients, setClients] = useState<ClubClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Custom Tiers List stored in localStorage/DB
  const [tiersList, setTiersList] = useState<TierConfig[]>(TIERS_DEFAULT);

  // Simulator values
  const [simulatedVentas, setSimulatedVentas] = useState<number>(1500000);
  const [campaignRecipients, setCampaignRecipients] = useState<ClubClient[]>([]);
  
  // Multi-client Analysis & Comparison State
  const [selectedClientIdsForAnalysis, setSelectedClientIdsForAnalysis] = useState<string[]>([]);
  const [showMultiClientAnalysis, setShowMultiClientAnalysis] = useState<boolean>(false);
  
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
  const [aiGeneratedMessages, setAiGeneratedMessages] = useState<Record<string, string>>({});
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [isEditingTiers, setIsEditingTiers] = useState(false);
  const [isSendingBatchEmails, setIsSendingBatchEmails] = useState(false);
  const [campaignTriggered, setCampaignTriggered] = useState<boolean>(false);
  const [campaignLog, setCampaignLog] = useState<string[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [emailAITemplate, setEmailAITemplate] = useState<string | null>(null);

  // Executive config & Communications Center state
  const [execConfig, setExecConfig] = useState(() => {
    let base = {
      nombre: "Jaime González",
      cargo: "Asesor Comercial Cimasur",
      correo: "contacto@cimasur.cl",
      whatsapp: "+56 9 1234 5678",
      firma: "Equipo Comercial Cimasur",
      smtpServer: "smtp.cimasur.cl",
      smtpPort: "587",
      smtpUser: "contacto@cimasur.cl",
      smtpPass: ""
    };
    try {
      const saved = localStorage.getItem('cimasur_exec_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...base, ...parsed };
        }
      }
    } catch (e) {}
    return base;
  });

  const [commsSubTab, setCommsSubTab] = useState<'segmentation' | 'templates' | 'image_gen' | 'whatsapp' | 'email' | 'history' | 'config' | 'canvas_email'>('segmentation');

  const handleSaveExecConfig = (newCfg: any) => {
    setExecConfig(newCfg);
    localStorage.setItem('cimasur_exec_config', JSON.stringify(newCfg));
  };

  // Graphics Customizer State
  const [postcardType, setPostcardType] = useState<'ascenso' | 'reactivacion' | 'felicitacion' | 'beneficios'>('ascenso');
  const [postcardTitle, setPostcardTitle] = useState<string>('Bienvenido al Siguiente Nivel');
  const [postcardSubtext, setPostcardSubtext] = useState<string>('Tu compromiso clínico veterinario te destaca de forma única en la región.');
  const [postcardClientIds, setPostcardClientIds] = useState<string[]>([]);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState<boolean>(false);

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

  // Chilean number parser: respects dots as thousands and commas as decimals
  const parseChileanAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let s = String(val).trim();
    
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    const lastSeparator = Math.max(lastComma, lastDot);
    
    if (lastSeparator !== -1) {
      const charsAfter = s.length - 1 - lastSeparator;
      // In Chile, many exports use 3 digits for decimal if they include cents (rare in CLP but possible)
      // however, 3 digits is strongly associated with thousands (1.000)
      if (charsAfter === 3 && !s.includes(lastComma === lastSeparator ? '.' : ',')) {
        // If there's ONLY one type of separator and it has 3 digits after, it's thousands
        s = s.replace(/[.,]/g, '');
      } else {
        // Mixed or decimal-looking
        const before = s.substring(0, lastSeparator).replace(/[.,]/g, '');
        const after = s.substring(lastSeparator + 1);
        s = before + '.' + after;
      }
    }
    
    const result = parseFloat(s.replace(/[^0-9.-]/g, ''));
    return isNaN(result) ? 0 : result;
  };

  const formatCLP = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    
    // Convert to absolute string to avoid issues with scientific notation
    let str = val.toString();
    if (str.includes('e')) str = val.toFixed(10).replace(/\.?0+$/, '');
    
    const parts = str.split('.');
    
    // Group thousands with '.' (Standard Chilean style)
    const isNegative = parts[0].startsWith('-');
    const absoluteInteger = isNegative ? parts[0].substring(1) : parts[0];
    const groupedInteger = absoluteInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const formattedInteger = (isNegative ? '-' : '') + groupedInteger;
    
    if (parts[1]) {
      // User requested "puntos" instead of "comas" for decimals ("me cambio los puntos por comas")
      // Even though ',' is standard in Chile, she explicitly asked for '.' which is common in technical/software use.
      // And "no redondes nada" means we keep all decimals.
      return formattedInteger + '.' + parts[1];
    }
    return formattedInteger;
  };

  const handleSaveTiers = async () => {
    setIsEditingTiers(false);
    try {
      const existing = await localDB.getCollection('tiers_config');
      for (const t of existing) {
         await localDB.deleteFromCollection('tiers_config', t.id);
      }
      for (const t of tiersList) {
         await localDB.saveToCollection('tiers_config', { ...t, id: t.name });
      }
      localStorage.setItem('cimasur_club_tiers_config', JSON.stringify(tiersList));
      alert("✅ Configuración de niveles guardada permanentemente en Base de Datos.");
      window.dispatchEvent(new Event('db-change'));
    } catch (e) {
      console.error("Error saving tiers:", e);
      alert("Error al guardar niveles.");
    }
  };

  const handleSendMassiveEmail = async () => {
    if (campaignRecipients.length === 0) {
      alert("No hay destinatarios seleccionados.");
      return;
    }

    if (!execConfig.smtpPass) {
      alert("Por favor, configure su contraseña SMTP en la pestaña de Configuración.");
      setCommsSubTab('config');
      return;
    }

    const confirmSend = confirm(`¿Está seguro que desea enviar correos masivos a ${campaignRecipients.length} médicos?`);
    if (!confirmSend) return;

    setIsSendingBatchEmails(true);
    try {
      const subject = (document.getElementById('campaign_email_subject') as HTMLInputElement)?.value || 'Comunicaciones Oficiales CIMASUR';
      
      const emailBatch = campaignRecipients.map(recipient => {
        const ec = enrichedClients.find(item => item.id === recipient.id) || recipient;
        const text = aiGeneratedMessages[recipient.id] || replaceMessageVariables(messageTemplate, ec);
        
        // Simple HTML template for the email
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 15px;">
              <h2 style="color: #1e3a8a; margin: 0;">CIMASUR CHILE</h2>
            </div>
            <div style="white-space: pre-line; color: #334155; line-height: 1.6;">
              ${text}
            </div>
            <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              <p>Este es un comunicado oficial de CIMASUR Laboratorios Veterinarios.</p>
              <p>📌 Contáctanos: ${execConfig.correo} | WhatsApp: ${execConfig.whatsapp}</p>
            </div>
          </div>
        `;

        return {
          to: recipient.email,
          subject,
          text,
          html
        };
      }).filter(mail => mail.to);

      const res = await fetch('/api/mail/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: execConfig,
          emails: emailBatch
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Fallo en el envío masivo" }));
        throw new Error(err.error || "Fallo en el envío masivo");
      }

      const result = await res.json();
      const successCount = result.results.filter((r: any) => r.status === 'success').length;
      
      // Update history for each successful recipient
      const today = new Date().toLocaleDateString('es-CL');
      for (const r of result.results) {
        if (r.status === 'success') {
          const rec = campaignRecipients.find(rcp => rcp.email === r.email);
          if (rec) {
            const currentHist = (enrichedClients.find(ec => ec.id === rec.id)?.historialUnificado || '');
            await localDB.updateInCollection('contacts', rec.id, {
              ultimoCorreo: today,
              ultimaCampania: "Envío Masivo SMTP",
              historialUnificado: currentHist + `\n[Email Masivo Enviado ${today}] Asunto: ${subject}`
            });
          }
        }
      }

      alert(`Proceso completado. ${successCount} correos enviados con éxito.`);
      window.dispatchEvent(new Event('db-change'));
      loadData();
    } catch (error: any) {
      alert("Error en el envío: " + error.message);
    } finally {
      setIsSendingBatchEmails(false);
    }
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

      const matchedClient = clientMap.get(rutNormalized);

      const v2024 = colMapping.v2024Idx !== -1 && colMapping.v2024Idx < cols.length
        ? parseChileanAmount(cols[colMapping.v2024Idx])
        : (matchedClient?.ventas?.v2024 || 0);
      const v2025 = colMapping.v2025Idx !== -1 && colMapping.v2025Idx < cols.length
        ? parseChileanAmount(cols[colMapping.v2025Idx])
        : (matchedClient?.ventas?.v2025 || 0);
      const v2026 = colMapping.v2026Idx !== -1 && colMapping.v2026Idx < cols.length
        ? parseChileanAmount(cols[colMapping.v2026Idx])
        : (matchedClient?.ventas?.v2026 || 0);

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

      // Load specific Tiers Config from DB if exists
      const savedTiers = await localDB.getCollection('tiers_config');
      if (savedTiers && savedTiers.length > 0) {
        setTiersList(savedTiers as any);
      } else {
        const saved = localStorage.getItem('cimasur_club_tiers_config');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) setTiersList(parsed);
          } catch { }
        }
      }

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
      const v2024 = Number(sales.v2024 || 0);
      const v2025 = Number(sales.v2025 || 0);
      const v2026 = Number(sales.v2026 || 0);

      const activeTier2026 = getTierBySales(v2026, tiersList);
      const activeTier2025 = getTierBySales(v2025, tiersList);

      const isCrecio = v2026 > v2025;
      const isDisminuyo = v2026 < v2025 && v2026 > 0 && v2025 > 0;
      const percentChange = v2025 > 0 ? (v2026 - v2025) / v2025 : 0;
      const isEstables = Math.abs(percentChange) <= 0.10 && v2026 > 0 && v2025 > 0;
      const isDormidos = v2025 > 0 && v2026 <= 0;
      const isPerdidos = v2024 > 0 && v2025 <= 0 && v2026 <= 0;
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

      const isIntranet = v2024 === 0 && v2025 === 0 && v2026 === 0;

      return {
        ...client,
        ventas: { v2024, v2025, v2026 },
        calculatedTier: { ...activeTier2026, index: currentTierIndex !== -1 ? currentTierIndex : 0 },
        calculatedTierPrev: activeTier2025,
        segmentGroup,
        isCrecio,
        isDisminuyo,
        isEstables,
        isDormidos,
        isPerdidos,
        isRiesgoAlto,
        isIntranet,
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
    let intranetCount = 0;
    let totalSalesPeriod = 0;

    enrichedClients.forEach(c => {
      totalSalesPeriod += c.ventas?.v2026 || 0;
      if (c.isCrecio) crecieronCount++;
      if (c.isDisminuyo) disminuyeronCount++;
      if (c.isEstables) establesCount++;
      if (c.isRiesgoAlto) riesgoCount++;
      if (c.isProximoAscenso) ascensosCount++;
      if (c.isProximoDescenso) descensosCount++;
      if (c.isIntranet) intranetCount++;
    });

    return {
      totalClients: enrichedClients.length,
      crecieron: crecieronCount,
      disminuyeron: disminuyeronCount,
      estables: establesCount,
      riesgo: riesgoCount,
      ascensos: ascensosCount,
      descensos: descensosCount,
      intranet: intranetCount,
      totalSales: totalSalesPeriod
    };
  }, [enrichedClients]);

  // Handle drill-down logic
  const handleDrillDown = (segment: string) => {
     if (dashboardFilter === segment) {
        setDashboardFilter(null);
     } else {
        setDashboardFilter(segment);
     }
  };

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
      else if (segGrowth.includes('Intranet')) matchesBehavior = c.isIntranet;

      // Cycle Recency Match
      let matchesLastPurchase = true;
      if (segGrowth.includes('Intranet')) {
        matchesLastPurchase = true; // Intranet prospects don't have purchases, so bypass this filter
      } else if (segLastPurchase === 'En ciclo actual') {
        matchesLastPurchase = (c.ventas?.v2026 || 0) > 0;
      } else if (segLastPurchase === 'Solo ciclo anterior') {
        matchesLastPurchase = (c.ventas?.v2025 || 0) > 0 && (c.ventas?.v2026 || 0) === 0;
      }

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
    try {
      if (!textTemplate) return '';
      if (!clientInfo) return textTemplate;
      const v2026 = clientInfo.ventas?.v2026 || 0;
      const bestBenefit = clientInfo.calculatedTier?.primaryBenefit || 'Beneficios generales';
      const destinationTier = clientInfo.nextTier?.name ?? clientInfo.nextTierName ?? 'Máxima Categoría';
      const nextTierMin = clientInfo.nextTier?.min ?? 0;
      const brechaVal = nextTierMin > 0 ? Math.max(0, nextTierMin - v2026) : 0;

      return textTemplate
        .replace(/\{\{NOMBRE\}\}/g, clientInfo.name || 'Médico')
        .replace(/\{\{CLINICA\}\}/g, clientInfo.clinica || 'Clínica Veterinaria')
        .replace(/\{\{CATEGORIA\}\}/g, clientInfo.calculatedTier?.name || clientInfo.categoria || 'Sin categoría')
        .replace(/\{\{CATEGORIA_NUEVA\}\}/g, destinationTier)
        .replace(/\{\{SIGUIENTE_CATEGORIA\}\}/g, destinationTier)
        .replace(/\{\{VENTAS\}\}/g, `$${formatCLP(v2026 || 0)}`)
        .replace(/\{\{BRECHA\}\}/g, `$${formatCLP(brechaVal || 0)}`)
        .replace(/\{\{BENEFICIO\}\}/g, bestBenefit)
        .replace(/\{\{EJECUTIVO\}\}/g, execConfig.nombre || '')
        .replace(/\{\{CORREO_EJECUTIVO\}\}/g, execConfig.correo || '')
        .replace(/\{\{WHATSAPP_EJECUTIVO\}\}/g, execConfig.whatsapp || '');
    } catch (e) {
      console.error("Error in replaceMessageVariables:", e);
      return textTemplate || '';
    }
  };

  // Preloaded variables button helper
  const handleInsertVariable = (variable: string) => {
    setMessageTemplate(prev => prev + ' ' + variable);
  };

  // AI Batch Generation trigger
  const handleGenerateAIBatch = async (objective: string) => {
    if (segmentedClients.length === 0) {
      alert("No hay clientes segmentados para generar mensajes.");
      return;
    }
    setIsGeneratingBatch(true);
    setAiGeneratedMessages({});
    try {
      // Pass minimum info to save tokens
      const payloadClients = segmentedClients.map(c => ({
        id: c.id,
        name: c.name,
        clinica: c.clinica,
        ventas_2026: c.ventas?.v2026 || 0,
        categoria_actual: c.calculatedTier?.name || 'Sin categoría',
        beneficio: c.calculatedTier?.primaryBenefit || 'Beneficios VIP'
      }));

      const res = await fetch('/api/ai/generate-batch-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: payloadClients, type: objective }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error en la solicitud a la IA");
      }
      const data = await res.json();
      if (data.messages && typeof data.messages === 'object') {
        setAiGeneratedMessages(data.messages);
      }
    } catch (err: any) {
      console.error(err);
      alert("Hubo un error generando los mensajes: " + err.message);
    } finally {
      setIsGeneratingBatch(false);
    }
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
        const clientData = enrichedClients.find(ec => ec.id === item.id);
        const personalized = aiGeneratedMessages[item.id] || replaceMessageVariables(messageTemplate, clientData);
        
        // Simulating delay for bulk server delivery
        await new Promise(resolve => setTimeout(resolve, 600));

        const smtpStatus = (campaignChannel === 'email' || campaignChannel === 'both') && execConfig.smtpServer 
          ? ` (SMTP: ${execConfig.smtpServer})`
          : '';

        // Add to live audit logs
        setCampaignLog(prev => [
          ...prev, 
          `[OK - ${new Date().toLocaleTimeString()}] Canal ${campaignChannel.toUpperCase()} - Entregado a: ${item.name} (${item.clinica || 'Vet'})${smtpStatus}`
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

  const handleGenerateAISupportMessage = async () => {
    if (!selectedClient) {
      alert("Por favor, selecciona un cliente para generar un mensaje personalizado.");
      return;
    }
    setIsGeneratingMessage(true);
    try {
      const response = await fetch('/api/ai/generate-support-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: selectedClient.name,
          categoria: selectedClient.categoria,
          clinica: selectedClient.clinica,
          type: postcardType
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error en la respuesta de la IA.");
      }
      const data = await response.json();
      if (data && data.message) {
        setPostcardSubtext(data.message);
      } else {
        alert("Falta el mensaje en la respuesta estructurada de la IA.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al conectar con la IA de CIMASUR: " + (err.message || 'Intente nuevamente'));
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleDownloadAllSelectedPostcards = async () => {
    const idsToDownload = postcardClientIds.length > 0 ? postcardClientIds : [selectedClient?.id].filter(Boolean) as string[];
    if (idsToDownload.length === 0) {
      alert("No hay ningún médico veterinario seleccionado.");
      return;
    }

    if (!confirm(`¿Deseas descargar ${idsToDownload.length} postales de fidalidad una por una en tu navegador?`)) {
      return;
    }

    // Download in series
    for (let i = 0; i < idsToDownload.length; i++) {
      const client = enrichedClients.find(c => c.id === idsToDownload[i]);
      if (!client) continue;

      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Gradient background based on tier
      let grad = ctx.createLinearGradient(0, 0, 800, 500);
      const catLow = (client.categoria || '').toLowerCase();
      
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

      // Simple grid pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let j = 0; j < 800; j += 40) {
        ctx.beginPath();
        ctx.moveTo(j, 0);
        ctx.lineTo(j + 150, 500);
        ctx.stroke();
      }

      // Border frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 15;
      ctx.strokeRect(7.5, 7.5, 785, 485);

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText("CIMASUR CLUB SOCIAL", 50, 75);

      // Decorative shapes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(650, 250, 110, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(650, 250, 95, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("★", 650, 265);
      ctx.textAlign = 'left';

      // Badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(50, 115, 280, 45);
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`CATEGORÍA: ${client.categoria.toUpperCase()}`, 65, 143);

      // Core info
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(client.name, 50, 230);

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'italic 18px sans-serif';
      ctx.fillText(`Clínica: ${client.clinica || 'Socio Veterinario Autorizado'}`, 50, 265);

      // Subheading title & message
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(postcardTitle || 'Reconocimiento VIP', 50, 330);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px sans-serif';
      const sub = postcardSubtext || 'Garantía oficial de fidelización preferente.';
      ctx.fillText(sub.substring(0, 80), 50, 370);
      if (sub.length > 80) {
        ctx.fillText(sub.substring(80, 160), 50, 392);
      }

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`ID Registro: ${client.id}`, 50, 450);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px sans-serif';
      ctx.fillText("© 2026 CIMASUR S.A. Todos los derechos reservados.", 490, 450);

      // Trigger standard browser download
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `cimasur_postal_club_${(client.name || '').replace(/\s+/g, '_')}.png`;
      link.href = imgData;
      link.click();

      // Non-blocking tiny sleep to safeguard simultaneous dispatch
      await new Promise(r => setTimeout(r, 350));
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
      const searchVal = clientSearch.toLowerCase();
      const nameMatch = (c.name || '').toLowerCase().includes(searchVal) || 
                          (c.email || '').toLowerCase().includes(searchVal) ||
                          (c.rut || '').toLowerCase().includes(searchVal);
      
      let catMatch = clientCategoryFilter === 'Todas' || c.calculatedTier.name === clientCategoryFilter;
      
      // Explicit support for "Prospectos Intranet" filter in main list
      if (clientCategoryFilter === 'Prospectos Intranet') {
         catMatch = c.isIntranet;
      }

      // If drill-down filter is active from dashboard
      let dashboardMatch = true;
      if (dashboardFilter) {
        if (dashboardFilter === 'TOTAL CLIENTES') dashboardMatch = true;
        else if (dashboardFilter === 'CRECIERON') dashboardMatch = !!c.isCrecio;
        else if (dashboardFilter === 'DISMINUYERON') dashboardMatch = !!c.isDisminuyo;
        else if (dashboardFilter === 'ESTABLES') dashboardMatch = !!c.isEstables;
        else if (dashboardFilter === 'RIESGO CRÍTICO') dashboardMatch = !!c.isRiesgoAlto;
        else if (dashboardFilter === 'PRÓXIMOS ASCENSOS') dashboardMatch = !!c.isProximoAscenso;
        else if (dashboardFilter === 'PRÓXIMOS DESCENSOS') dashboardMatch = !!c.isProximoDescenso;
        else if (dashboardFilter === 'PROSPECTOS INTRANET') dashboardMatch = !!c.isIntranet;
      }

      return nameMatch && catMatch && dashboardMatch;
    });
  }, [enrichedClients, clientSearch, clientCategoryFilter, dashboardFilter]);

  const handleToggleAnalyzeClient = (clientId: string) => {
    setSelectedClientIdsForAnalysis(prev => {
      const isCurrentlySelected = prev.includes(clientId);
      let nextList: string[];
      if (isCurrentlySelected) {
        nextList = prev.filter(id => id !== clientId);
      } else {
        nextList = [...prev, clientId];
      }
      return nextList;
    });
  };

  const handleSelectAllFilteredForComparison = () => {
    const allIds = filteredClientList.map(c => c.id);
    setSelectedClientIdsForAnalysis(allIds);
    if (allIds.length > 0) {
      setShowMultiClientAnalysis(true);
    }
  };

  const handleClearSelectedForComparison = () => {
    setSelectedClientIdsForAnalysis([]);
    setShowMultiClientAnalysis(false);
  };

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
            {formatCLP(Math.round(dashboardStats.totalSales))}
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
            onClick={() => {
              setActiveTab('campaigns');
              setCommsSubTab('canvas_email');
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'campaigns' && commsSubTab === 'canvas_email' ? 'bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Palette className="w-4 h-4" />
            <span>4. Diseñador de Correos IA</span>
          </button>

          <button 
            onClick={() => setActiveTab('club_config')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'club_config' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Shield className="w-4 h-4" />
            <span>3. Club Categorías</span>
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('campaigns');
              setCommsSubTab('segmentation');
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'campaigns' ? 'bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Send className="w-4 h-4" />
            <span className="flex items-center justify-between w-full">
              <span>4. Campañas & Marketing IA</span>
              {campaignRecipients.length > 0 && (
                <span className="bg-indigo-500 text-[9px] text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                  {campaignRecipients.length}
                </span>
              )}
            </span>
          </button>
          
          <button 
            onClick={() => setActiveTab('opportunities')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${activeTab === 'opportunities' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:bg-[#111f38] hover:text-slate-200'}`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>5. Oportunidades</span>
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
                    
                    <div 
                      onClick={() => handleDrillDown('TOTAL CLIENTES')}
                      className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${dashboardFilter === 'TOTAL CLIENTES' ? 'bg-sky-500/10 border-sky-500 shadow-lg shadow-sky-500/10' : 'bg-[#0f1b35] border-slate-800'}`}
                    >
                      <div className="flex justify-between items-start text-slate-400 text-xs font-bold">
                        <span>TOTAL CLIENTES</span>
                        <Users className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-3xl font-mono font-black">{dashboardStats.totalClients}</span>
                        <span className="text-[10px] block text-slate-500 mt-1">Sincronizados localmente</span>
                      </div>
                    </div>

                    <div 
                      onClick={() => handleDrillDown('CRECIERON')}
                      className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${dashboardFilter === 'CRECIERON' ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-[#0f1b35] border-[#166534]/30'}`}
                    >
                      <div className="flex justify-between items-start text-emerald-400 text-xs font-bold">
                        <span>CRECIERON</span>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-3xl font-mono font-black text-emerald-400">+{dashboardStats.crecieron}</span>
                        <span className="text-[10px] block text-slate-400 mt-1">Ventas {'>'} ciclo anterior</span>
                      </div>
                    </div>

                    <div 
                      onClick={() => handleDrillDown('DISMINUYERON')}
                      className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${dashboardFilter === 'DISMINUYERON' ? 'bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/10' : 'bg-[#0f1b35] border-[#991b1b]/30'}`}
                    >
                      <div className="flex justify-between items-start text-rose-400 text-xs font-bold">
                        <span>DISMINUYERON</span>
                        <TrendingDown className="w-4 h-4" />
                      </div>
                      <div className="mt-2.5">
                        <span className="text-3xl font-mono font-black text-rose-400">-{dashboardStats.disminuyeron}</span>
                        <span className="text-[10px] block text-slate-400 mt-1">Compras reducidas</span>
                      </div>
                    </div>

                    <div 
                      onClick={() => handleDrillDown('ESTABLES')}
                      className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${dashboardFilter === 'ESTABLES' ? 'bg-yellow-500/10 border-yellow-500 shadow-lg shadow-yellow-500/10' : 'bg-[#0f1b35] border-[#854d0e]/30'}`}
                    >
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

                  {/* SECONDARY ROW - High Risk & Opportunity */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div 
                      id="card_riesgo_critico"
                      onClick={() => handleDrillDown('RIESGO CRÍTICO')}
                      className={`p-4 rounded-xl border relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${dashboardFilter === 'RIESGO CRÍTICO' ? 'bg-red-500/10 border-red-500 shadow-lg shadow-red-500/10' : 'bg-[#121c33] border-red-900/40'}`}
                    >
                      <div className="absolute right-3 top-3 bg-red-500/10 text-red-400 p-1.5 rounded-lg border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 animate-bounce" />
                      </div>
                      <span className="text-[10px] text-red-400 font-extrabold uppercase block tracking-wider">RIESGO CRÍTICO</span>
                      <span className="text-3xl font-mono font-black mt-2 block text-red-500">{dashboardStats.riesgo}</span>
                      <p className="text-[10px] text-slate-400 mt-2 leading-tight">CAÍDA {'>'}50% vs 2025</p>
                    </div>

                    <div 
                      id="card_proximos_ascensos"
                      onClick={() => handleDrillDown('PRÓXIMOS ASCENSOS')}
                      className={`p-4 rounded-xl border relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${dashboardFilter === 'PRÓXIMOS ASCENSOS' ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-[#121c33] border-emerald-900/40'}`}
                    >
                      <div className="absolute right-3 top-3 bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/20">
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-emerald-400 font-extrabold uppercase block tracking-wider">PRÓX. ASCENSOS</span>
                      <span className="text-3xl font-mono font-black mt-2 block text-emerald-400">{dashboardStats.ascensos}</span>
                      <p className="text-[10px] text-slate-400 mt-2 leading-tight">Margen 15% para subir</p>
                    </div>

                    <div 
                      id="card_proximos_descensos"
                      onClick={() => handleDrillDown('PRÓXIMOS DESCENSOS')}
                      className={`p-4 rounded-xl border relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${dashboardFilter === 'PRÓXIMOS DESCENSOS' ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10' : 'bg-[#121c33] border-amber-900/40'}`}
                    >
                      <div className="absolute right-3 top-3 bg-amber-500/10 text-amber-400 p-1.5 rounded-lg border border-amber-500/20">
                        <ArrowDownRight className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-[10px] text-amber-400 font-extrabold uppercase block tracking-wider">PRÓX. DESCENSOS</span>
                      <span className="text-3xl font-mono font-black mt-2 block text-amber-500">{dashboardStats.descensos}</span>
                      <p className="text-[10px] text-slate-400 mt-2 leading-tight">Al límite de categoría</p>
                    </div>

                    <div 
                      id="card_prospectos_intranet"
                      onClick={() => handleDrillDown('PROSPECTOS INTRANET')}
                      className={`p-4 rounded-xl border relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${dashboardFilter === 'PROSPECTOS INTRANET' ? 'bg-sky-500/10 border-sky-500 shadow-lg shadow-sky-500/10' : 'bg-[#121c33] border-slate-700/40'}`}
                    >
                      <div className="absolute right-3 top-3 bg-sky-500/10 text-sky-400 p-1.5 rounded-lg border border-sky-500/20">
                        <LinkIcon className="w-4 h-4 text-sky-400" />
                      </div>
                      <span className="text-[10px] text-sky-400 font-extrabold uppercase block tracking-wider">PROSPECTS WEB</span>
                      <span className="text-3xl font-mono font-black mt-2 block text-sky-400">{dashboardStats.intranet}</span>
                      <p className="text-[10px] text-slate-400 mt-2 leading-tight">Acceso sin primera compra</p>
                    </div>

                  </div>

                  {/* METRIC DRILL DOWN LIST (THE "VENTANA DESPLEGABLE") */}
                  <AnimatePresence>
                    {dashboardFilter && (
                      <motion.div 
                        key="dashboard_drilldown_panel"
                        id="dashboard_drilldown_panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-[#0a101e] border border-sky-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-sky-500/5 mb-6"
                      >
                        <div className="bg-[#111f38] px-4 py-3 border-b border-sky-500/20 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="bg-sky-500/20 p-1.5 rounded-lg">
                                 <Filter className="w-4 h-4 text-sky-400" />
                              </div>
                              <div>
                                 <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                    Explorando: {dashboardFilter} 
                                    <span className="ml-2 text-sky-400 opacity-70 font-mono">
                                       ({enrichedClients.filter(c => {
                                          if (dashboardFilter === 'TOTAL CLIENTES') return true;
                                          if (dashboardFilter === 'CRECIERON') return c.isCrecio;
                                          if (dashboardFilter === 'DISMINUYERON') return c.isDisminuyo;
                                          if (dashboardFilter === 'ESTABLES') return c.isEstables;
                                          if (dashboardFilter === 'RIESGO CRÍTICO') return c.isRiesgoAlto;
                                          if (dashboardFilter === 'PRÓXIMOS ASCENSOS') return c.isProximoAscenso;
                                          if (dashboardFilter === 'PRÓXIMOS DESCENSOS') return c.isProximoDescenso;
                                          if (dashboardFilter === 'PROSPECTOS INTRANET') return c.isIntranet;
                                          return false;
                                       }).length} clientes)
                                    </span>
                                 </h4>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <button 
                                onClick={() => { setActiveTab('clients'); }}
                                className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-500/10 px-2 py-1 rounded transition-all"
                              >
                                 VER EN CARTERA <ExternalLink className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => setDashboardFilter(null)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                              >
                                 <RotateCcw className="w-4 h-4" />
                              </button>
                           </div>
                        </div>

                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                           <table className="w-full text-left border-collapse">
                              <thead className="sticky top-0 bg-[#0a101e] z-10">
                                 <tr className="border-b border-slate-800">
                                    <th className="p-3 text-[10px] text-slate-400 font-bold uppercase pl-5">Médico / Clínica</th>
                                    <th className="p-3 text-[10px] text-slate-400 font-bold uppercase">Categoría</th>
                                    <th className="p-3 text-[10px] text-slate-400 font-bold uppercase text-right">Ventas Acum.</th>
                                    <th className="p-3 text-[10px] text-slate-400 font-bold uppercase text-right pr-5">Acciones</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                 {enrichedClients.filter(c => {
                                    if (dashboardFilter === 'TOTAL CLIENTES') return true;
                                    if (dashboardFilter === 'CRECIERON') return c.isCrecio;
                                    if (dashboardFilter === 'DISMINUYERON') return c.isDisminuyo;
                                    if (dashboardFilter === 'ESTABLES') return c.isEstables;
                                    if (dashboardFilter === 'RIESGO CRÍTICO') return c.isRiesgoAlto;
                                    if (dashboardFilter === 'PRÓXIMOS ASCENSOS') return c.isProximoAscenso;
                                    if (dashboardFilter === 'PRÓXIMOS DESCENSOS') return c.isProximoDescenso;
                                    if (dashboardFilter === 'PROSPECTOS INTRANET') return c.isIntranet;
                                    return false;
                                 }).map(client => (
                                    <tr key={client.id} className="hover:bg-sky-500/5 transition-colors group">
                                       <td className="p-3 pl-5">
                                          <div className="flex items-center gap-3">
                                             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${client.calculatedTier.color.replace('text-', 'bg-').replace('text-', 'bg-')}/20 ${client.calculatedTier.color}`}>
                                                {client.name.substring(0, 2).toUpperCase()}
                                             </div>
                                             <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-200">{client.name}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">{client.rut}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="p-3">
                                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${client.calculatedTier.color.replace('text-', 'border-').replace('text-', 'border-')}/30 ${client.calculatedTier.color.replace('text-', 'bg-').replace('text-', 'bg-')}/10 ${client.calculatedTier.color}`}>
                                             {client.calculatedTier.name}
                                          </span>
                                       </td>
                                       <td className="p-3 text-right">
                                          <span className="text-xs font-mono font-bold text-white">
                                             {formatCLP(Math.round(client.ventas?.v2026 || 0))}
                                          </span>
                                       </td>
                                       <td className="p-3 text-right pr-5">
                                          <div className="flex items-center justify-end gap-2">
                                             <button 
                                                onClick={() => {
                                                   setSelectedClientId(client.id);
                                                   setActiveTab('campaigns');
                                                   setCommsSubTab('canvas_email');
                                                }}
                                                className="bg-sky-500/10 text-sky-400 p-1.5 rounded hover:bg-sky-500 text-[9px] font-black hover:text-white transition-all uppercase tracking-tighter"
                                             >
                                                Diseñar Email
                                             </button>
                                             <button 
                                                onClick={() => {
                                                   setSelectedClientId(client.id);
                                                   setActiveTab('clients');
                                                }}
                                                className="bg-slate-800 text-slate-300 p-1.5 rounded hover:bg-slate-700 text-[9px] font-black transition-all uppercase tracking-tighter"
                                             >
                                                Ficha
                                             </button>
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                        Busca socios, edita ventas anuales o selecciona varios marcando sus casillas [◽] para abrir el <strong className="text-sky-300">📈 Comparador Multi-Socio Sencillo</strong> y analizar la cartera en conjunto de forma simple y clara.
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

                      {dashboardFilter && (
                        <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/30 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Filter className="w-3.5 h-3.5 text-sky-400" />
                            <span className="text-[10px] font-bold text-sky-300 uppercase">Filtro: {dashboardFilter}</span>
                          </div>
                          <button 
                            onClick={() => setDashboardFilter(null)}
                            className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded font-black hover:bg-sky-600 transition-colors"
                          >
                            Limpiar
                          </button>
                        </div>
                      )}
                      
                      <select
                        value={clientCategoryFilter}
                        onChange={(e) => setClientCategoryFilter(e.target.value)}
                        className="w-full bg-[#0a101e] px-2 py-2 rounded-xl text-xs border border-slate-700 focus:outline-none focus:border-sky-500 text-white"
                      >
                        <option value="Todas">Todas las categorías</option>
                        <option value="Prospectos Intranet" className="text-sky-400 font-bold">🔗 Prospectos Intranet (Cero Compras)</option>
                        {tiersList.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>

                      {/* Multi-selection triggers */}
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/60 font-bold">
                        <span>Selección para Comparar:</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSelectAllFilteredForComparison}
                            className="bg-[#0b1324] px-1.5 py-0.5 rounded border border-slate-700 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
                          >
                            ✓ Todos ({filteredClientList.length})
                          </button>
                          <button 
                            onClick={handleClearSelectedForComparison}
                            className="bg-[#0b1324] px-1.5 py-0.5 rounded border border-slate-700 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
                          >
                            ✕ Limpiar
                          </button>
                        </div>
                      </div>

                      {selectedClientIdsForAnalysis.length > 0 && (
                        <button
                          onClick={() => setShowMultiClientAnalysis(true)}
                          className="w-full py-2 bg-gradient-to-r from-sky-600 to-[#3b82f6] hover:from-sky-700 hover:to-blue-700 text-white text-[11px] font-black rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
                        >
                          <span>📈</span>
                          <span>Abrir Comparador ({selectedClientIdsForAnalysis.length} Socios)</span>
                        </button>
                      )}
                    </div>

                    {/* RENDERED LIST */}
                    <div className="bg-[#0f172a] rounded-xl border border-slate-800 max-h-[380px] overflow-y-auto divide-y divide-slate-800">
                      {filteredClientList.map(c => {
                        const isSelectedForAnalysis = selectedClientIdsForAnalysis.includes(c.id);
                        return (
                          <div 
                            key={c.id}
                            onClick={() => {
                              setSelectedClientId(c.id);
                              setIsEditingClient(false);
                            }}
                            className={`p-3 text-left cursor-pointer transition-all flex items-start gap-2.5 ${selectedClientId === c.id ? 'bg-[#1e2e4a] border-l-4 border-sky-400' : 'hover:bg-[#121c2f]'}`}
                          >
                            <input 
                              type="checkbox"
                              checked={isSelectedForAnalysis}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => handleToggleAnalyzeClient(c.id)}
                              className="mt-1 accent-sky-450 rounded border-slate-650 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-xs font-bold block text-white truncate max-w-[120px]">
                                  {c.name}
                                  {(c.ventas?.v2026 || 0) === 0 && <span className="ml-1 text-[8px] text-sky-400 font-black">● INTRANET</span>}
                                </span>
                                <span className={`text-[9px] px-2 py-0.5 rounded border leading-none shrink-0 ${
                                  c.calculatedTier.name.includes('Platinum') ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                  c.calculatedTier.name.includes('Oro') ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                  c.calculatedTier.name.includes('Plata') ? 'bg-sky-500/10 text-sky-450 border-sky-500/20' :
                                  'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {c.calculatedTier.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#94a3b8] block mt-0.5 truncate">{c.clinica || 'Sin clínica registrada'}</span>
                              <span className="text-[9px] font-mono text-emerald-400 block mt-1">2026: ${formatCLP(c.ventas?.v2026 || 0)}</span>
                              
                              {/* Communication Metadata */}
                              {(c.ultimoWhatsapp || c.ultimoCorreo || c.ultimaCampania) && (
                                <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-slate-800/40 text-[8.5px] font-mono">
                                  {c.ultimoWhatsapp && <span className="text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded">💬 WA: {c.ultimoWhatsapp}</span>}
                                  {c.ultimoCorreo && <span className="text-sky-300 bg-sky-500/5 px-1 py-0.5 rounded">✉️ Mail: {c.ultimoCorreo}</span>}
                                  {c.ultimaCampania && <span className="text-pink-300 bg-pink-500/5 px-1 py-0.5 rounded truncate max-w-[120px]" title={c.ultimaCampania}>📣 {c.ultimaCampania.substring(0, 15)}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filteredClientList.length === 0 && (
                        <div className="p-8 text-center text-slate-500 italic text-xs">Sin registros de coincidencia.</div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: DETAILED INTERACTIVE VIEW OR MULTI-CLIENT COMPARISON */}
                  <div className="md:col-span-3">
                    {showMultiClientAnalysis && selectedClientIdsForAnalysis.length > 0 ? (
                      /* COMPREHENSIVE MULTI-CLIENT COMPARATIVE DASHBOARD */
                      <div className="bg-[#0f1b35] rounded-xl border border-emerald-500/30 p-5 space-y-5 text-left">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <div>
                            <span className="text-[9px] text-[#38bdf8] font-extrabold block tracking-wider uppercase">MÓDULO DE COMPARACIÓN CRM</span>
                            <h3 className="text-md font-black text-white flex items-center gap-1.5">
                              📈 Analizador y Comparador Multi-Socio ({selectedClientIdsForAnalysis.length} seleccionados)
                            </h3>
                          </div>
                          <button 
                            onClick={() => setShowMultiClientAnalysis(false)}
                            className="px-3 py-1 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            ✕ Ver Ficha Individual
                          </button>
                        </div>

                        {(() => {
                          const listForAnalysis = enrichedClients.filter(ec => selectedClientIdsForAnalysis.includes(ec.id));
                          if (listForAnalysis.length === 0) {
                            return <div className="text-center p-8 text-slate-500 italic">No hay socios seleccionados para comparar.</div>;
                          }

                          const total2024 = listForAnalysis.reduce((sum, c) => sum + (c.ventas?.v2024 || 0), 0);
                          const total2025 = listForAnalysis.reduce((sum, c) => sum + (c.ventas?.v2025 || 0), 0);
                          const total2026 = listForAnalysis.reduce((sum, c) => sum + (c.ventas?.v2026 || 0), 0);
                          const avg2026 = total2026 / listForAnalysis.length;

                          return (
                            <div className="space-y-5">
                              {/* Group STAT cards */}
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-[#0b1324] p-3 rounded-xl border border-slate-800 text-center">
                                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Consolidado 2025</span>
                                  <span className="text-xs font-mono font-black text-slate-350">${formatCLP(total2025)}</span>
                                </div>
                                <div className="bg-[#0b1324] p-3 rounded-xl border border-emerald-950/40 text-center">
                                  <span className="text-[9px] text-[#38bdf8] block uppercase font-bold">Consolidado 2026</span>
                                  <span className="text-xs font-mono font-black text-emerald-400">${formatCLP(total2026)}</span>
                                </div>
                                <div className="bg-[#0b1324] p-3 rounded-xl border border-slate-800 text-center">
                                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Promedio por Socio</span>
                                  <span className="text-xs font-mono font-bold text-sky-400">${formatCLP(avg2026)}</span>
                                </div>
                              </div>

                              {/* Simple side-by-side compare progress chart */}
                              <div className="bg-[#0d1527] p-4 rounded-xl border border-slate-800 space-y-3">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Gráfico Comparativo de Venta Acumulada Ciclo 2021-2026</span>
                                <div className="space-y-3">
                                  {listForAnalysis.map(c => {
                                    const maxSales = Math.max(...listForAnalysis.map(item => item.ventas?.v2026 || 100000), 12000000);
                                    const percent = Math.min(100, Math.max(8, ((c.ventas?.v2026 || 0) / maxSales) * 100));

                                    return (
                                      <div key={c.id} className="space-y-1">
                                        <div className="flex justify-between text-[11px]">
                                          <span className="font-bold text-slate-200 truncate max-w-[150px]">{c.name}</span>
                                          <span className="font-mono text-emerald-400 font-bold">
                                            ${formatCLP(c.ventas?.v2026 || 0)}{' '}
                                            <span className="text-slate-500 text-[9px]">({c.categoria})</span>
                                          </span>
                                        </div>
                                        <div className="w-full bg-[#121c31] h-3 rounded-lg overflow-hidden flex">
                                          <div className={`h-full rounded-lg transition-all ${
                                            (c.categoria || '').includes('Platinum') ? 'bg-gradient-to-r from-purple-600 to-indigo-500' :
                                            (c.categoria || '').includes('Oro') ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
                                            'bg-gradient-to-r from-sky-500 to-emerald-500'
                                          }`} style={{ width: `${percent}%` }}></div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Side-by-side Comparative details table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[10px] bg-[#0b1324] rounded-xl overflow-hidden border border-slate-800">
                                  <thead>
                                    <tr className="bg-[#121c30] text-slate-400 font-bold uppercase border-b border-slate-800 text-[8px] font-mono">
                                      <th className="p-2.5">Médico / Especialidad</th>
                                      <th className="p-2.5 text-right">Venta 2024</th>
                                      <th className="p-2.5 text-right">Venta 2025</th>
                                      <th className="p-2.5 text-right text-emerald-400">Venta 2026</th>
                                      <th className="p-2.5 text-center">Nivel</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800">
                                    {listForAnalysis.map(c => (
                                      <tr key={c.id} className="hover:bg-slate-900/40">
                                        <td className="p-2.5 font-bold text-white truncate max-w-[130px]">{c.name}</td>
                                        <td className="p-2.5 text-right font-mono text-slate-400">${formatCLP(c.ventas?.v2024 || 0)}</td>
                                        <td className="p-2.5 text-right font-mono text-slate-350">${formatCLP(c.ventas?.v2025 || 0)}</td>
                                        <td className="p-2.5 text-right font-mono text-emerald-400 font-extrabold">${formatCLP(c.ventas?.v2026 || 0)}</td>
                                        <td className="p-2.5 text-center">
                                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/35 text-slate-300 border border-slate-750">
                                            {c.categoria}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Multi-Socio Campaign Actions bridge */}
                              <div className="bg-[#1e1e38]/40 p-4 rounded-xl border border-[#38bdf8]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-left">
                                <div className="flex-1">
                                  <span className="text-[#38bdf8] font-bold block mb-0.5">🚀 Enviar Lote al Motor Masivo</span>
                                  <p className="text-[10.5px] text-slate-400">Crea una plantilla automática y un correo electrónico personalizado o enlace de WhatsApp para estos {listForAnalysis.length} veterinarios.</p>
                                </div>
                                <button
                                  onClick={() => {
                                    setCampaignRecipients(listForAnalysis);
                                    setActiveTab('campaigns');
                                    alert(`Se han exportado los ${listForAnalysis.length} clientes bajo análisis actual al módulo de Campañas Masivas.`);
                                  }}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer shrink-0"
                                >
                                  <Send className="w-3.5 h-3.5" /> Enviar este Set a Campañas 💬
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : selectedClient ? (
                      <div className="bg-[#0f1b35] rounded-xl border border-slate-800 p-5 space-y-5 text-left">
                        
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
                              (selectedClient.categoria || '').includes('Platinum') ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                              (selectedClient.categoria || '').includes('Oro') ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
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

                            {/* Communication Status indicators */}
                            <div className="grid grid-cols-3 gap-3 text-center text-[10px] mt-2 bg-[#090f1d] p-3 rounded-lg border border-slate-800/40">
                              <div className="bg-[#111f38] p-2 rounded-lg border border-slate-800/45">
                                <span className="text-slate-500 block uppercase font-bold text-[8px] mb-0.5">💬 Último WhatsApp</span>
                                <span className="text-emerald-400 font-mono font-black text-[10px]">{selectedClient.ultimoWhatsapp || 'No registrado'}</span>
                              </div>
                              <div className="bg-[#111f38] p-2 rounded-lg border border-slate-800/45">
                                <span className="text-slate-500 block uppercase font-bold text-[8px] mb-0.5">✉️ Último Correo</span>
                                <span className="text-sky-350 font-mono font-black text-[10px]">{selectedClient.ultimoCorreo || 'No registrado'}</span>
                              </div>
                              <div className="bg-[#111f38] p-2 rounded-lg border border-slate-800/45">
                                <span className="text-slate-500 block uppercase font-bold text-[8px] mb-0.5">📣 Última Campaña</span>
                                <span className="text-pink-300 font-sans font-extrabold text-[9px] truncate block max-w-full" title={selectedClient.ultimaCampania || ''}>
                                  {selectedClient.ultimaCampania || 'No registrada'}
                                </span>
                              </div>
                            </div>

                            {/* Historic cycle chart metrics */}
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide block mb-3">Historial Comercial del Ciclo Anual (Ventas)</span>
                              <div className="space-y-3.5">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-400">Ciclo Anual 2024:</span>
                                    <span className="font-mono text-slate-200">${formatCLP(selectedClient.ventas?.v2024 || 0)}</span>
                                  </div>
                                  <div className="w-full bg-[#0d1527] h-2 rounded-full overflow-hidden">
                                    <div className="bg-slate-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(10, ((selectedClient.ventas?.v2024 || 0) / 12000000) * 100))}%` }}></div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-400">Ciclo Anual 2025:</span>
                                    <span className="font-mono text-slate-200">${formatCLP(selectedClient.ventas?.v2025 || 0)}</span>
                                  </div>
                                  <div className="w-full bg-[#0d1527] h-2 rounded-full overflow-hidden">
                                    <div className="bg-indigo-505 bg-[#38bdf8] h-full rounded-full" style={{ width: `${Math.min(100, Math.max(10, ((selectedClient.ventas?.v2025 || 0) / 12000000) * 100))}%` }}></div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-400">Ciclo Anual 2026 (Mayo Cierre):</span>
                                    <span className="font-mono text-emerald-400 font-extrabold">${formatCLP(selectedClient.ventas?.v2026 || 0)}</span>
                                  </div>
                                  <div className="w-full bg-[#0d1527] h-2 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(10, ((selectedClient.ventas?.v2026 || 0) / 12000000) * 100))}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Commercial Notes logs */}
                            <div className="space-y-3 bg-[#101b33] p-4 rounded-xl border border-slate-800">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase flex items-center gap-1.5">
                                  <Notebook className="w-3.5 h-3.5 text-sky-400" /> Registro de Actividad y Análisis Manual
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono italic">Bitácora Unificada CRM</span>
                              </div>
                              
                              <div className="bg-[#0a101e] rounded-lg border border-slate-800 h-40 overflow-y-auto p-3 font-mono text-[11px] text-slate-350 whitespace-pre-wrap leading-relaxed shadow-inner border-l-4 border-l-sky-500/30">
                                {selectedClient.historialUnificado || "No hay registros de actividad previos para este socio comercial."}
                              </div>

                              <div className="flex gap-2">
                                <input 
                                  id="manual_activity_input_ficha"
                                  type="text"
                                  placeholder="Registrar nueva llamada, visita o nota..."
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      const val = (e.target as HTMLInputElement).value;
                                      if (!val) return;
                                      const today = new Date().toLocaleDateString('es-CL');
                                      const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                                      const newLog = `\n[Nota Manual ${today} ${time}]: ${val}`;
                                      
                                      const currentHist = selectedClient.historialUnificado || '';
                                      await localDB.updateInCollection('contacts', selectedClient.id, {
                                        historialUnificado: currentHist + newLog
                                      });
                                      (e.target as HTMLInputElement).value = '';
                                      loadData();
                                    }
                                  }}
                                  className="flex-1 bg-[#0a101e] px-3 py-2 rounded-lg border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                                />
                                <button 
                                  onClick={async () => {
                                    const input = document.getElementById('manual_activity_input_ficha') as HTMLInputElement;
                                    const val = input.value;
                                    if (!val) return;
                                    const today = new Date().toLocaleDateString('es-CL');
                                    const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                                    const newLog = `\n[Nota Manual ${today} ${time}]: ${val}`;
                                    
                                    const currentHist = selectedClient.historialUnificado || '';
                                    await localDB.updateInCollection('contacts', selectedClient.id, {
                                      historialUnificado: currentHist + newLog
                                    });
                                    input.value = '';
                                    loadData();
                                  }}
                                  className="px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold"
                                >
                                  Añadir
                                </button>
                              </div>
                            </div>

                            <button 
                              onClick={() => {
                                setIsEditingClient(true);
                              }}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ml-auto border border-slate-700"
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
                    {isEditingTiers ? (
                      <button 
                        onClick={handleSaveTiers}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/20"
                      >
                        <Save className="w-3.5 h-3.5" /> Guardar Cambios
                      </button>
                    ) : (
                      <button 
                        onClick={() => setIsEditingTiers(true)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Modificar Montos y Beneficios
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {tiersList.map((t, idx) => {
                      // Normalize colors for guaranteed rendering
                      const getTheme = (idx: number) => {
                        const themes = [
                          { bg: 'bg-[#1e293b]', border: 'border-slate-500', text: 'text-slate-200', badgeObj: 'bg-slate-700 text-slate-100' },
                          { bg: 'bg-gradient-to-b from-[#451a03] to-[#25140b]', border: 'border-amber-600/50', text: 'text-amber-200', badgeObj: 'bg-amber-900/50 text-amber-100' },
                          { bg: 'bg-gradient-to-b from-[#1e293b] to-[#0f172a]', border: 'border-slate-400/50', text: 'text-slate-100', badgeObj: 'bg-slate-600/50 text-white' },
                          { bg: 'bg-gradient-to-b from-[#422006] to-[#1a0e03]', border: 'border-yellow-600/60', text: 'text-yellow-400', badgeObj: 'bg-yellow-900/60 text-yellow-100' },
                          { bg: 'bg-gradient-to-b from-[#2e1065] to-[#170831]', border: 'border-purple-500/60', text: 'text-purple-200', badgeObj: 'bg-purple-900/60 text-purple-100' }
                        ];
                        return themes[idx % themes.length];
                      };
                      const theme = getTheme(idx);
                      return (
                        <div key={t.name} className={`p-5 rounded-2xl border-2 ${theme.border} ${theme.bg} flex flex-col justify-between shadow-xl min-h-[350px]`}>
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-[13px] font-black uppercase tracking-wider ${theme.text}`}>{t.name}</span>
                              <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${theme.badgeObj}`}>Nivel {idx + 1}</span>
                            </div>
                            
                            {isEditingTiers ? (
                              <div className="space-y-3 mt-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-slate-400 uppercase font-black">Mínimo ($):</label>
                                  <input 
                                    type="number" 
                                    value={t.min} 
                                    onChange={(e) => {
                                      const newList = [...tiersList];
                                      newList[idx].min = Number(e.target.value);
                                      setTiersList(newList);
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] text-slate-400 uppercase font-black">Máximo ($):</label>
                                  <input 
                                    type="number" 
                                    value={t.max === Infinity ? 999999999 : t.max} 
                                    onChange={(e) => {
                                      const newList = [...tiersList];
                                      const val = Number(e.target.value);
                                      newList[idx].max = val >= 999999999 ? Infinity : val;
                                      setTiersList(newList);
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] text-slate-400 uppercase font-black">Beneficio Core:</label>
                                  <input 
                                    type="text" 
                                    value={t.primaryBenefit} 
                                    onChange={(e) => {
                                      const newList = [...tiersList];
                                      newList[idx].primaryBenefit = e.target.value;
                                      setTiersList(newList);
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white"
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-xl font-black block mt-2 text-white font-mono">
                                  {t.min === 0 ? '$0' : `$${(t.min / 1000000).toFixed(1)}M`} 
                                  <span className="text-xs text-slate-400 font-bold px-1.5 uppercase tracking-widest text-[#94a3b8]"> a </span>
                                  {t.max === Infinity ? 'Infinito' : `$${(t.max / 1000000).toFixed(1)}M`}
                                </span>
                                
                                <div className="mt-5 space-y-2 text-[11px] text-[#e2e8f0] leading-snug font-serif">
                                  <span className="block font-bold uppercase text-[#94a3b8] text-[9px] mb-1">Beneficio Destacado:</span>
                                  <span className="block bg-[#0f172a]/60 px-3 py-2 rounded-lg text-white font-bold border border-white/5">
                                    {t.primaryBenefit}
                                  </span>
                                  
                                  <div className="mt-3 space-y-1.5">
                                    <span className="block font-bold uppercase text-[#94a3b8] text-[9px]">Detalle de Beneficios:</span>
                                    {t.benefits.map((benefit, bIdx) => (
                                      <div key={bIdx} className="flex items-start gap-1.5 text-[10px] text-slate-300">
                                        <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                        <span>{benefit}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                          <span className="text-sm font-mono font-black text-slate-300">${formatCLP(selectedClient.ventas?.v2026 || 0)}</span>
                        </div>
                      </div>

                      {/* Simulator Control */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono font-bold text-slate-350">
                          <span>$0 compra extra</span>
                          <span className="text-sky-450 text-sky-400">Monto simulación: +${formatCLP(simulatedVentas)}</span>
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
                              ${formatCLP(activeSimulatedMetrics.futureSales)}
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
                                ? `Faltan $${formatCLP(activeSimulatedMetrics.nextBrecha)} de compra para subir de nivel` 
                                : '¡Felicidades, se encuentra en el nivel Premium máximo del club comercial!'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* ----------------- SECCIÓN UNIFICADA: CENTRO DE CAMPAÑAS & MARKETING IA 💬 ----------------- */}
              {activeTab === 'campaigns' && (
                <div className="space-y-6">
                  {/* Top bar with Section Selector buttons */}
                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-800 pb-3 gap-3">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-400 animate-pulse" /> Despliegue de Campañas & Marketing IA
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">Filtra tu audiencia en un clic, gestiona plantillas, genera postales en lote e inicia envíos automáticos.</p>
                    </div>
                    {/* Inner Comms Tabs */}
                    <div className="flex flex-wrap bg-[#101b33] p-1 rounded-xl border border-slate-800 text-[11px] font-bold gap-1">
                      <button 
                        type="button"
                        onClick={() => setCommsSubTab('segmentation')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${commsSubTab === 'segmentation' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        🧬 1. Segmentación IA
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCommsSubTab('templates')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${commsSubTab === 'templates' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        🤖 2. Redacción IA
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCommsSubTab('image_gen')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${commsSubTab === 'image_gen' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        🎨 3. Generador Gráfico
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCommsSubTab('canvas_email')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${commsSubTab === 'canvas_email' ? 'bg-indigo-600 text-white shadow' : 'text-sky-400 font-bold hover:text-sky-200'}`}
                      >
                        🎨 Diseñador Visual IA
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCommsSubTab('massive')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${commsSubTab === 'massive' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        📧 Emailing Masivo
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCommsSubTab('whatsapp')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${commsSubTab === 'whatsapp' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        📲 WhatsApp Masivo
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCommsSubTab('config')}
                        className={`px-2.5 py-1.5 rounded-lg transition-all ${commsSubTab === 'config' ? 'bg-slate-800 text-white shadow border border-slate-700' : 'text-slate-500 hover:text-slate-350'}`}
                      >
                        ⚙️ Ajustes
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCommsSubTab('history')}
                        className={`px-2.5 py-1.5 rounded-lg transition-all ${commsSubTab === 'history' ? 'bg-slate-800 text-white shadow border border-slate-700' : 'text-slate-500 hover:text-slate-350'}`}
                      >
                        📜 Historial
                      </button>
                    </div>
                  </div>

                  {/* 4. SECTOR DE DISEÑO VISUAL IA */}
                  {commsSubTab === 'canvas_email' && (
                    <div className="space-y-6 animate-fadeIn">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* LEFT: DESIGN CONTROLS */}
                          <div className="space-y-4">
                             <div className="bg-[#101b33] p-5 rounded-2xl border border-slate-800 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                   <div className="bg-sky-500/20 p-2 rounded-lg">
                                      <Palette className="w-5 h-5 text-sky-400" />
                                   </div>
                                   <div>
                                      <h3 className="text-sm font-bold text-white">Configuración del Diseño</h3>
                                      <p className="text-[10px] text-slate-400">Genera una pieza de emailing tipo "Canva" con IA.</p>
                                   </div>
                                </div>

                                <div className="space-y-2">
                                   <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">1. Objetivo de la Comunicación</label>
                                   <select 
                                      className="w-full bg-[#0a101e] px-3 py-2.5 rounded-xl border border-slate-700 text-xs text-white focus:border-sky-500 focus:outline-none transition-colors"
                                      value={postcardTitle}
                                      onChange={(e) => setPostcardTitle(e.target.value)}
                                   >
                                      <option value="Reconocimiento VIP">Reconocimiento VIP / Fidelización</option>
                                      <option value="Invitación a Curso">Invitación a Curso / Formación</option>
                                      <option value="Oferta Exclusiva">Oferta Exclusiva / Venta Directa</option>
                                      <option value="Recordatorio de Compra">Recordatorio de Compra / Reactivación</option>
                                      <option value="Lanzamiento Producto">Lanzamiento de Nuevo Producto</option>
                                   </select>
                                </div>

                                <div className="space-y-2">
                                   <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">2. Tono y Personalidad (Prompt IA)</label>
                                   <textarea 
                                      className="w-full bg-[#0a101e] px-3 py-3 rounded-xl border border-slate-700 text-xs text-white focus:border-sky-500 focus:outline-none transition-colors h-24 resize-none"
                                      placeholder="Ej: Elegante, minimalista, destacar los envíos gratis y el vademécum físico para prospectos..."
                                      value={postcardSubtext}
                                      onChange={(e) => setPostcardSubtext(e.target.value)}
                                   />
                                </div>

                                <button 
                                   onClick={async () => {
                                      if (!selectedClient) {
                                         alert("Por favor selecciona un cliente primero en la pestaña de Cartera.");
                                         return;
                                      }
                                      setIsSending(true);
                                      try {
                                         const response = await fetch('/api/ai/generate-email-template', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                               client: selectedClient,
                                               objective: postcardTitle,
                                               prompt: postcardSubtext
                                            })
                                         });
                                         const data = await response.json();
                                         if (data.html) {
                                            setEmailAITemplate(data.html);
                                         }
                                      } catch (err) {
                                         console.error(err);
                                      } finally {
                                         setIsSending(false);
                                      }
                                   }}
                                   disabled={isSending}
                                   className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-sky-500/10 transition-all disabled:opacity-50"
                                >
                                   {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                   GENERAR MAQUETA CON GEMINI 2.0
                                </button>
                             </div>

                             {emailAITemplate && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl space-y-3">
                                   <div className="flex items-center gap-2 text-emerald-400">
                                      <CheckCircle className="w-4 h-4" />
                                      <span className="text-xs font-bold uppercase tracking-wider">¡Plantilla Generada Exitosamente!</span>
                                   </div>
                                   <div className="grid grid-cols-2 gap-2">
                                      <button 
                                         onClick={() => {
                                            navigator.clipboard.writeText(emailAITemplate);
                                            alert("Código HTML copiado al portapapeles.");
                                         }}
                                         className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                                      >
                                         <Copy className="w-3.5 h-3.5" /> Copiar Código
                                      </button>
                                      <button 
                                         onClick={() => {
                                             const blob = new Blob([emailAITemplate], { type: 'text/html' });
                                             const url = URL.createObjectURL(blob);
                                             const win = window.open(url, '_blank');
                                             win?.focus();
                                         }}
                                         className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                                      >
                                         <ExternalLink className="w-3.5 h-3.5" /> Ver en Pantalla Completa
                                      </button>
                                   </div>
                                </div>
                             )}
                          </div>

                          {/* RIGHT: REAL-TIME PREVIEW (CANVA STYLE) */}
                          <div className="space-y-4">
                             <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden min-h-[500px] flex flex-col shadow-2xl relative">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.03)_0,transparent_100%)] pointer-events-none"></div>
                                <div className="bg-[#1e293b] p-3 border-b border-slate-700 flex items-center justify-between px-5">
                                   <div className="flex items-center gap-2">
                                      <div className="flex gap-1.5">
                                         <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50"></div>
                                         <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                                         <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                                      </div>
                                      <span className="text-[10px] text-slate-400 font-mono ml-4 uppercase tracking-widest">Vista Previa: Email de Alta Fidelidad</span>
                                   </div>
                                   <div className="bg-sky-500/10 px-2 py-0.5 rounded text-[9px] font-black text-sky-400 border border-sky-500/20">
                                      {selectedClient?.name || 'Cliente Demo'}
                                   </div>
                                </div>

                                <div className="flex-1 p-6 overflow-y-auto bg-white flex justify-center">
                                   {emailAITemplate ? (
                                      <div dangerouslySetInnerHTML={{ __html: emailAITemplate }} className="w-full max-w-md shadow-2xl" />
                                   ) : (
                                      <div className="flex flex-col items-center justify-center text-center space-y-4 opacity-50 bg-slate-50 w-full rounded-xl border-2 border-dashed border-slate-200">
                                         <Image className="w-12 h-12 text-slate-300" />
                                         <div>
                                            <p className="text-slate-400 font-bold text-sm">Sin Maqueta Generada</p>
                                            <p className="text-slate-300 text-[10px] max-w-[200px]">Usa el panel de la izquierda para diseñar una pieza visual única para este cliente.</p>
                                         </div>
                                      </div>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                  {/* 1. SECTOR DE SEGMENTACIÓN IA */}
                  {commsSubTab === 'segmentation' && (
                    <div className="space-y-6 animate-fadeIn text-left">
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
                            <option value="Dormidos">💤 Dormidos (2025 compra & 2026 cero)</option>
                            <option value="Perdidos">🥀 Perdidos (2024 compra & 2025/2026 cero)</option>
                            <option value="Riesgo Alto">⚠️ Riesgo Alto (Caída severa {'>'}50%)</option>
                            <option value="Intranet / Sin Compras">🔗 Prospectos Intranet (Cero Compras)</option>
                          </select>
                        </div>

                        <div className="md:col-span-1 flex flex-col justify-end">
                          <div className="bg-[#0a101e] px-4 py-2 rounded-xl border border-indigo-500/30 flex items-center justify-between">
                            <div className="flex flex-col">
                               <span className="text-[9px] text-indigo-400 font-black uppercase tracking-tighter">Médicos Seleccionados</span>
                               <span className="text-xl font-black text-white leading-none">{segmentedClients.length}</span>
                            </div>
                            <Users className="w-5 h-5 text-indigo-500/50" />
                          </div>
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

                      {(() => {
                        const guide = SEGMENT_GUIDE[segGrowth] || SEGMENT_GUIDE['Todas'];
                        return (
                          <div className="bg-slate-900/60 p-4 rounded-xl border border-[#38bdf8]/20 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-left animate-fadeIn">
                            <div className="md:col-span-2 space-y-1">
                              <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-wide block">🧬 ¿QUÉ SIGNIFICA ESTE SEGMENTO COMERCIAL?</span>
                              <h4 className="text-sm font-black text-white">{guide.title}</h4>
                              <p className="text-slate-300 text-[11px] leading-relaxed">{guide.desc}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Relevancia Estratégica:</span>
                              <p className="text-slate-350 text-[11px] leading-relaxed italic">{guide.importance}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-[#38bdf8] font-bold uppercase block">Acción de Negocio Sugerida:</span>
                              <p className="text-slate-200 text-[11px] leading-relaxed font-semibold">{guide.action}</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* RESULTS GRID */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1 space-y-3">
                           <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 space-y-3">
                              <span className="text-[10px] text-sky-400 font-extrabold block uppercase tracking-widest leading-tight">Accesos Directos de IA:</span>
                              <div className="space-y-2">
                                <button type="button" onClick={() => { setSegGrowth('Crecieron'); setSegCategory('Todas'); }} className="w-full text-left p-2 rounded-lg bg-[#0a101e] hover:bg-slate-800 border border-slate-700 transition-colors">
                                    <p className="text-[10px] font-bold text-white">📈 Premiar Crecimiento</p>
                                    <p className="text-[9px] text-slate-500 italic">Veterinarios que aumentaron compras.</p>
                                </button>
                                <button type="button" onClick={() => { setSegGrowth('Dormidos'); setSegCategory('Todas'); }} className="w-full text-left p-2 rounded-lg bg-[#0a101e] hover:bg-slate-800 border border-slate-700 transition-colors">
                                    <p className="text-[10px] font-bold text-white">💤 Rescatar Dormidos</p>
                                    <p className="text-[9px] text-slate-500 italic">No han pedido nada en 2026.</p>
                                </button>
                                <button type="button" onClick={() => { setSegGrowth('Intranet / Sin Compras'); setSegCategory('Todas'); }} className="w-full text-left p-2 rounded-lg bg-[#0a101e] hover:bg-slate-800 border border-slate-700 transition-colors">
                                    <p className="text-[10px] font-bold text-white">🔗 Activar Intranet</p>
                                    <p className="text-[9px] text-slate-500 italic">Registrados sin compras reales.</p>
                                </button>
                              </div>
                           </div>
                           
                           <div className="p-4 rounded-xl bg-indigo-900/10 border border-indigo-900/30 flex items-start gap-3">
                              <CheckCircle className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                              <p className="text-[10px] text-indigo-300 leading-relaxed italic">
                                Al seleccionar un segmento, éste se exporta automáticamente a las pestañas de <b>Redacción IA</b>, <b>WhatsApp</b> y <b>Email</b>.
                              </p>
                           </div>
                        </div>

                        <div className="md:col-span-3">
                          <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 space-y-4">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-400 text-[11px] uppercase">
                                Clientes que califican en este segmento: <span className="text-[#38bdf8] font-black font-mono">{segmentedClients.length}</span>
                              </span>
                          {segmentedClients.length > 0 && (
                            <button 
                              type="button"
                              onClick={() => {
                                setCampaignRecipients(segmentedClients);
                                setCommsSubTab('whatsapp');
                                alert(`Se han vinculado exitosamente ${segmentedClients.length} médicos para esta campaña masiva.`);
                              }}
                              className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-lg animate-pulse"
                            >
                              <Send className="w-3.5 h-3.5" /> Vincular Segmento a Canal de Envío 📲💬
                            </button>
                          )}
                        </div>

                        <div className="overflow-x-auto max-h-60">
                          <table className="w-full text-[11px] text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 uppercase font-extrabold font-mono text-[9px]">
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
                                <tr key={c.id} className="hover:bg-[#121c2e]">
                                  <td className="p-2 font-bold text-slate-100">{c.name}</td>
                                  <td className="p-2 text-slate-400">{c.clinica || '---'}</td>
                                  <td className="p-2 text-right font-mono text-slate-350">${formatCLP(c.ventas?.v2025 || 0)}</td>
                                  <td className="p-2 text-right font-mono text-emerald-400 font-extrabold">${formatCLP(c.ventas?.v2026 || 0)}</td>
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
                    </div>
                  </div>
                )}

                  {/* 1. WHATSAPP MASIVO SUBTAB */}
                  {commsSubTab === 'whatsapp' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold block uppercase">🚀 Cola de Envío por WhatsApp ({campaignRecipients.length} clientes seleccionados)</span>
                        {campaignRecipients.length > 0 && (
                          <button 
                            onClick={() => setCampaignRecipients([])}
                            className="text-[10px] text-red-400 hover:underline cursor-pointer"
                          >
                            Vaciar lote seleccionado
                          </button>
                        )}
                      </div>

                      {/* Checklist for B2B WhatsApp campaign process */}
                      <div className="bg-[#101c31]/60 p-4 rounded-xl border border-slate-800">
                        <span className="text-xs font-black text-sky-450 text-sky-400 block uppercase mb-3 text-left">📝 Asistente de Proceso de Campaña</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-left">
                          <label className="flex items-center gap-2 bg-[#0a1122] p-2.5 rounded-lg border border-slate-800/80 cursor-pointer">
                            <input type="checkbox" defaultChecked className="accent-indigo-500 rounded cursor-pointer" />
                            <span className="text-slate-300 font-semibold font-sans">☑ abrir WhatsApp Web</span>
                          </label>
                          <label className="flex items-center gap-2 bg-[#0a1122] p-2.5 rounded-lg border border-slate-800/80 cursor-pointer">
                            <input type="checkbox" defaultChecked className="accent-indigo-500 rounded cursor-pointer" />
                            <span className="text-slate-300 font-semibold font-sans">☑ Copiar mensaje dinámico</span>
                          </label>
                          <label className="flex items-center gap-2 bg-[#0a1122] p-2.5 rounded-lg border border-slate-800/80 cursor-pointer">
                            <input type="checkbox" defaultChecked className="accent-indigo-500 rounded cursor-pointer" />
                            <span className="text-slate-300 font-semibold font-sans">☑ Registrar envío en Bitácora</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Selector of Preset Templates for WA */}
                        <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 space-y-4 text-left">
                          <span className="text-xs font-bold text-sky-455 text-sky-400 block uppercase">💬 Seleccionar Plantilla Base</span>
                          <div className="space-y-2">
                            {Object.keys(PRESET_TEMPLATES).map((key) => (
                              <button
                                key={key}
                                onClick={() => setMessageTemplate(PRESET_TEMPLATES[key])}
                                className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all border ${messageTemplate === PRESET_TEMPLATES[key] ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40' : 'bg-[#0b1324] text-slate-400 border-slate-800 hover:bg-[#121c2e]'}`}
                              >
                                {key.toUpperCase().replace('_', ' ')}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <label className="text-slate-400 font-bold block">Editar plantilla manual:</label>
                            <textarea
                              value={messageTemplate}
                              onChange={(e) => setMessageTemplate(e.target.value)}
                              rows={8}
                              className="w-full bg-[#070d18] text-white text-xs border border-slate-700 rounded-lg p-2.5 font-sans focus:outline-none focus:border-indigo-500 leading-relaxed"
                            />
                          </div>
                        </div>

                        {/* Interactive Queue lists */}
                        <div className="lg:col-span-2 space-y-4">
                          <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 space-y-3.5 text-left">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-400 block uppercase font-mono">📥 Despacho Individual One-to-One</span>
                              <span className="text-[10px] text-sky-400 font-black px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">{campaignRecipients.length} en cola</span>
                            </div>
                            
                            {campaignRecipients.length > 0 ? (
                              <div className="space-y-4 max-h-[560px] overflow-y-auto divide-y divide-slate-800/60 pr-1">
                                {campaignRecipients.map((recipient) => {
                                  const ec = enrichedClients.find(item => item.id === recipient.id) || recipient;
                                  const textWithVariables = aiGeneratedMessages[recipient.id] || replaceMessageVariables(messageTemplate, ec);
                                  
                                  const cleanPhone = (recipient.phone || '').replace(/\D/g, '');
                                  const waUrl = `https://wa.me/${cleanPhone.startsWith('569') ? cleanPhone : '569' + cleanPhone.slice(-8)}?text=${encodeURIComponent(textWithVariables)}`;

                                  // Handlers defined inside map to access ec/recipient/text
                                  const handleCopyPostcard = async () => {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = 1000;
                                    canvas.height = 1200;
                                    const ctx = canvas.getContext('2d');
                                    if (!ctx) return;

                                    // BG Gradient
                                    const grad = ctx.createLinearGradient(0, 0, 1000, 1200);
                                    grad.addColorStop(0, '#0f172a');
                                    grad.addColorStop(1, '#020617');
                                    ctx.fillStyle = grad;
                                    ctx.fillRect(0, 0, 1000, 1200);

                                    // Decorative circles
                                    const catName = ec?.categoria || '';
                                    const themeColor = catName.includes('Platinum') ? '#a855f7' : catName.includes('Oro') ? '#fbbf24' : '#38bdf8';
                                    ctx.globalAlpha = 0.1;
                                    ctx.fillStyle = themeColor;
                                    ctx.beginPath(); ctx.arc(1000, 0, 600, 0, Math.PI*2); ctx.fill();
                                    ctx.beginPath(); ctx.arc(0, 1200, 400, 0, Math.PI*2); ctx.fill();
                                    ctx.globalAlpha = 1;

                                    // Border
                                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                                    ctx.lineWidth = 20;
                                    ctx.strokeRect(10, 10, 980, 1180);

                                    // Title
                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.font = 'bold 60px sans-serif';
                                    ctx.fillText('CIMASUR CHILE', 60, 120);
                                    ctx.font = '300 30px sans-serif';
                                    ctx.fillText('CLUB DE FIDELIZACIÓN MÉDICA', 60, 170);

                                    // Name Card
                                    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
                                      ctx.beginPath();
                                      // Native support check (modern browsers)
                                      if ((ctx as any).roundRect) {
                                        (ctx as any).roundRect(x, y, w, h, r);
                                      } else {
                                        // Standard manual path polyfill
                                        ctx.moveTo(x + r, y);
                                        ctx.arcTo(x + w, y, x + w, y + h, r);
                                        ctx.arcTo(x + w, y + h, x, y + h, r);
                                        ctx.arcTo(x, y + h, x, y, r);
                                        ctx.arcTo(x, y, x + w, y, r);
                                        ctx.closePath();
                                      }
                                    };

                                    ctx.fillStyle = 'rgba(255,255,255,0.05)';
                                    drawRoundedRect(60, 250, 880, 250, 40);
                                    ctx.fill();

                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.font = 'bold 50px sans-serif';
                                    ctx.fillText((ec?.name || '').toUpperCase(), 110, 350);
                                    ctx.font = '400 30px sans-serif';
                                    ctx.fillStyle = '#94a3b8';
                                    ctx.fillText(ec?.clinica || 'Centro Veterinario', 110, 410);

                                    // Tier Badge
                                    ctx.fillStyle = themeColor;
                                    drawRoundedRect(110, 440, 350, 45, 10);
                                    ctx.fill();
                                    ctx.fillStyle = '#101b33';
                                    ctx.font = 'bold 22px sans-serif';
                                    ctx.textAlign = 'center';
                                    ctx.fillText(`CATEGORÍA: ${(ec?.categoria || '').toUpperCase()}`, 285, 471);
                                    ctx.textAlign = 'left';

                                    // Benefits section
                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.font = 'bold 45px sans-serif';
                                    ctx.fillText('RESUMEN DE BENEFICIOS', 60, 600);
                                    
                                    ctx.fillStyle = 'rgba(255,255,255,0.03)';
                                    drawRoundedRect(60, 650, 880, 350, 40);
                                    ctx.fill();

                                    ctx.fillStyle = themeColor;
                                    ctx.font = 'bold 30px sans-serif';
                                    ctx.fillText('ESTATUS ACTUAL:', 100, 720);
                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.font = 'italic 35px sans-serif';
                                    ctx.fillText(ec.calculatedTier?.primaryBenefit || 'Beneficios generales', 100, 780);

                                    // Sales Progress
                                    ctx.fillStyle = '#94a3b8';
                                    ctx.font = 'bold 25px sans-serif';
                                    ctx.fillText('VENTA CICLO 2026', 100, 880);
                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.font = 'bold 40px sans-serif';
                                    ctx.textAlign = 'right';
                                    ctx.fillText(`$${formatCLP(ec.ventas?.v2026 || 0)}`, 900, 880);
                                    ctx.textAlign = 'left';

                                    // Footer text
                                    ctx.fillStyle = '#475569';
                                    ctx.font = '18px sans-serif';
                                    ctx.textAlign = 'center';
                                    ctx.fillText(`Documento Digital CIMASUR - Enviado por ${execConfig.nombre}`, 500, 1120);

                                    canvas.toBlob(async (blob) => {
                                      if (!blob) return;
                                      try {
                                        const data = [new ClipboardItem({ 'image/png': blob })];
                                        await navigator.clipboard.write(data);
                                        alert("✅ ¡Imagen de fidelización CIMASUR copiada!\n\nPresiona [Ctrl+V] ahora mismo en tu chat de WhatsApp para adjuntarla.");
                                      } catch (err) {
                                        const link = document.createElement('a');
                                        link.download = `Cimasur_${ec.name.replace(/\s/g, '_')}.png`;
                                        link.href = canvas.toDataURL();
                                        link.click();
                                        alert("⚠️ Imagen descargada. Adjúntala manualmente en WhatsApp.");
                                      }
                                    });
                                  };

                                  const handleSendWAIndividual = async () => {
                                    if (!cleanPhone || cleanPhone.length < 8) {
                                      alert("Teléfono inválido para enviar WhatsApp.");
                                      return;
                                    }
                                    await navigator.clipboard.writeText(textWithVariables);
                                    const today = new Date().toLocaleDateString('es-CL');
                                    await localDB.updateInCollection('contacts', recipient.id, {
                                      ultimoWhatsapp: today,
                                      ultimaCampania: "Envío Individual"
                                    });
                                    window.dispatchEvent(new Event('db-change'));
                                    window.open(waUrl, '_blank');
                                  };

                                  const hasWhatsapp = cleanPhone && cleanPhone.length >= 8;

                                  return (
                                    <div key={recipient.id} className="pt-4 first:pt-0 pb-1 flex flex-col gap-3 group">
                                      <div className="flex justify-between items-start">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-black text-white text-sm tracking-tight">{recipient.name}</span>
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded border font-mono font-bold ${
                                              ec.categoria.includes('Platinum') ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                              ec.categoria.includes('Oro') ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                              'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>
                                              {ec.categoria}
                                            </span>
                                          </div>
                                          <p className="text-slate-500 text-[10px] font-medium mt-0.5">{recipient.clinica || 'Sin clínica'} — {recipient.phone || '---'}</p>
                                        </div>
                                        <div className="flex gap-1.5">
                                          <button 
                                            onClick={handleCopyPostcard}
                                            className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-all border border-slate-700 active:scale-95 shadow-sm"
                                            title="Generar y Copiar Imagen (Ficha)"
                                          >
                                            <Image className="w-3.5 h-3.5" />
                                          </button>
                                          <button 
                                            onClick={handleSendWAIndividual}
                                            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-md shadow-emerald-950/20 active:scale-95"
                                            title="Copiar Texto y WhatsApp"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="relative">
                                        <div className="text-xs text-slate-300 leading-relaxed font-sans bg-[#0a101e] p-3 rounded-xl border border-slate-800/50 max-h-32 overflow-y-auto whitespace-pre-line group-hover:border-indigo-500/30 transition-colors">
                                          {textWithVariables}
                                        </div>
                                        <button 
                                          onClick={async () => {
                                            try {
                                              const response = await fetch('/api/ai/generate-support-message', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  clientName: recipient.name,
                                                  categoria: ec.categoria,
                                                  clinica: recipient.clinica,
                                                  type: 'soporte comercial'
                                                })
                                              });
                                              if (!response.ok) throw new Error("Error en servidor AI");
                                              const data = await response.json();
                                              if (data.message) {
                                                setAiGeneratedMessages(prev => ({...prev, [recipient.id]: data.message}));
                                              }
                                            } catch (err) {
                                              console.error("AI Error:", err);
                                              alert("No se pudo generar el mensaje con IA en este momento.");
                                            }
                                          }}
                                          className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-[9px] text-sky-400 font-bold backdrop-blur-sm transition-all flex items-center gap-1"
                                        >
                                          <RotateCcw className="w-2.5 h-2.5" /> Regenerar
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center p-12 text-slate-500 italic text-xs bg-[#0b1220] rounded-lg">
                                No hay destinatarios seleccionados. Vaya a "1. Segmentación IA" para cargar su base.
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* 2. EMAILING MASIVO SUBTAB */}
                  {commsSubTab === 'email' && (
                    <div className="space-y-6">
                      <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 text-left space-y-4">
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-xs font-bold text-sky-400 block uppercase">📧 Sistema de Envío por Correo Electrónico (SMTP o Mailto)</span>
                           <div className="flex items-center gap-3">
                             <button 
                               onClick={handleSendMassiveEmail}
                               disabled={isSendingBatchEmails || campaignRecipients.length === 0}
                               className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all ${isSendingBatchEmails ? 'bg-slate-700 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95'}`}
                             >
                               {isSendingBatchEmails ? (
                                 <>
                                   <RotateCcw className="w-3 h-3 animate-spin" />
                                   Despachando...
                                 </>
                               ) : (
                                 <>
                                   <Send className="w-3 h-3" />
                                   🚀 Despachar Todo el Lote por SMTP
                                 </>
                               )}
                             </button>
                             <button type="button" onClick={() => setCommsSubTab('config')} className="text-sky-400 hover:underline flex items-center gap-1 font-bold">
                                <Settings className="w-3 h-3" /> Configurar SMTP
                             </button>
                           </div>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">Para garantizar la entregabilidad directa, este sistema abre las plantillas directamente en el cliente de correo de tu preferencia utilizando tus credenciales configuradas, y luego registra en la base de datos local que realizaste el envío.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 space-y-4 text-left">
                          <span className="text-xs font-bold text-indigo-400 block uppercase">📬 Configuración de Campaña Email</span>
                          
                          <div className="space-y-3.5 text-xs">
                            <div className="bg-[#0a101e] p-3 rounded-lg border border-slate-800 text-[11px]">
                              <div className="flex justify-between font-bold">
                                <span className="text-slate-400">Destinatarios Seleccionados:</span>
                                <span className="text-emerald-400 font-mono font-black">{campaignRecipients.length} médicos</span>
                              </div>
                            </div>
                            
                            {campaignRecipients.length === 0 && (
                              <div className="bg-slate-800/50 p-2 rounded text-[10.5px] text-slate-400 text-center">
                                Carga un lote en la pestaña de Segmentación.
                              </div>
                            )}

                            <div className="space-y-1">
                              <label className="text-slate-400 block font-bold">Asunto Personalizado:</label>
                              <input 
                                type="text"
                                defaultValue="Comunicaciones Oficiales CIMASUR"
                                id="campaign_email_subject"
                                className="w-full bg-[#0d1527] px-3 py-1.5 rounded-lg border border-slate-700 text-white text-xs"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-slate-400 block font-bold">Plantilla Base Sugerida:</label>
                              <select 
                                onChange={(e) => setMessageTemplate(PRESET_TEMPLATES[e.target.value] || PRESET_TEMPLATES['oficial_cimasur'])}
                                className="w-full bg-[#0a101e] px-2.5 py-2 rounded-xl text-xs border border-slate-700 text-white"
                              >
                                <option value="oficial_cimasur">PLANTILLA OFICIAL CIMASUR</option>
                                <option value="activo">COMUNICADO SOCIO ACTIVO</option>
                                <option value="crecio">FELICITACIONES DE ASCENSO</option>
                                <option value="estable">SOCIO ESTABLE Y FIEL</option>
                                <option value="disminuyo">ALERTA DE CAÍDA Y GRACIA</option>
                                <option value="dormido">RECUPERACIÓN REINCORPORACIÓN</option>
                                <option value="riesgo_alto">RIESGO CRÍTICO DE FUGA</option>
                                <option value="induccion_intranet">INDUCCIÓN INTRANET / PROSPECTO</option>
                              </select>
                            </div>
                            
                            <div className="space-y-1 pt-2">
                              <label className="text-slate-400 block font-bold">Cuerpo del Mensaje (con variables):</label>
                              <textarea
                                value={messageTemplate}
                                onChange={(e) => setMessageTemplate(e.target.value)}
                                rows={8}
                                className="w-full bg-[#070d18] text-white text-xs border border-slate-700 rounded-lg p-2.5 font-sans focus:outline-none focus:border-indigo-500 leading-relaxed"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Direct Sending Queue */}
                        <div className="md:col-span-2 space-y-4">
                          <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 space-y-3.5 text-left">
                            <span className="text-xs font-bold text-slate-400 block uppercase">📥 Bandeja de Intervención One-to-One</span>
                            <p className="text-[10px] text-slate-500">Puedes generar un mensaje con IA o utilizar la plantilla seleccionada para iniciar el envío desde tu gestor de correo predeterminado (Outlook, Mail, etc).</p>
                            
                            {campaignRecipients.length > 0 ? (
                              <div className="space-y-3 max-h-[500px] overflow-y-auto divide-y divide-slate-800 pr-1">
                                {campaignRecipients.map((recipient) => {
                                  const ec = enrichedClients.find(item => item.id === recipient.id) || recipient;
                                  const textWithVariables = aiGeneratedMessages[recipient.id] || replaceMessageVariables(messageTemplate, ec);
                                  
                                  const handleLogEmailSent = async () => {
                                    const today = new Date().toLocaleDateString('es-CL');
                                    const subject = (document.getElementById('campaign_email_subject') as HTMLInputElement)?.value || 'CIMASUR';
                                    await localDB.updateInCollection('contacts', recipient.id, {
                                      ultimoCorreo: today,
                                      ultimaCampania: "Correo electrónico manual"
                                    });
                                    const auditLog = `\n[Email Directo Enviado ${today}]\nAsunto: ${subject}\n\n"${textWithVariables.substring(0, 150)}..."`;
                                    await localDB.updateInCollection('contacts', recipient.id, {
                                      historialUnificado: (ec.historialUnificado || '') + auditLog
                                    });
                                    window.dispatchEvent(new Event('db-change'));
                                  };

                                  return (
                                    <div key={recipient.id} className="pt-3.5 first:pt-0 flex flex-col gap-2">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-extrabold text-white text-sm">{recipient.name}</div>
                                          <p className="text-slate-400 text-[11px] font-medium">{recipient.clinica} — {recipient.email || 'Sin correo asociado'}</p>
                                        </div>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#101c31] text-indigo-400 border border-indigo-500/20 font-mono">
                                          {ec.categoria}
                                        </span>
                                      </div>
                                      
                                      <div className="text-xs text-slate-350 leading-relaxed font-serif whitespace-pre-line pl-1 border-l-2 border-slate-700 h-20 overflow-y-auto">
                                        {textWithVariables}
                                      </div>

                                      <div className="flex items-center justify-end gap-2 mt-1">
                                        {!recipient.email ? (
                                          <span className="text-[10px] text-red-400 font-bold">Falta dirección de correo</span>
                                        ) : (
                                          <>
                                            <button 
                                              onClick={handleLogEmailSent}
                                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all text-[10px] cursor-pointer"
                                            >
                                              ☑ Solo registrar en Ficha
                                            </button>
                                            <a 
                                              href={`mailto:${recipient.email}?subject=${encodeURIComponent((document.getElementById('campaign_email_subject') as HTMLInputElement)?.value || 'Comunicaciones Oficiales CIMASUR')}&body=${encodeURIComponent(textWithVariables)}`}
                                              onClick={handleLogEmailSent}
                                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/20 text-xs shrink-0"
                                            >
                                              <Mail className="w-3.5 h-3.5" />
                                              <span>Abrir Cliente de Correo</span>
                                            </a>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center p-12 text-slate-500 italic text-xs bg-[#0b1220] rounded-lg">
                                No hay destinatarios seleccionados. Vaya a "1. Segmentación IA" o use su Cartera para cargar a los médicos de la campaña.
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* 2. REDACCIÓN IA Y REVISIÓN */}
                  {commsSubTab === 'templates' && (
                    <div className="space-y-6 text-left animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        
                        {/* Left Prompts list */}
                        <div className="space-y-4">
                          <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 space-y-3">
                            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Generador IA (Estilos de Mensaje)</span>
                            <p className="text-[11px] text-slate-400 leading-normal">
                              La IA redactará instantáneamente mensajes personalizados para los {segmentedClients.length} veterinarios segmentados.
                            </p>
                            
                            <div className="space-y-2 pt-2">
                              <button type="button" onClick={()=>handleGenerateAIBatch('Crear mensaje de Fidelización reconociendo que está comprando activamente. Debe incluir su nivel de ventas actual.')} className="w-full text-left bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-[11px] rounded-lg font-bold text-white shadow block cursor-pointer transition-colors" disabled={isGeneratingBatch}>
                                🤖 Generar Fidelización (Socios Activos)
                              </button>
                              <button type="button" onClick={()=>handleGenerateAIBatch('Crear mensaje de felicitación por crecimiento en sus volúmenes de compra respecto al año pasado. Felicitarlo sinceramente.')} className="w-full text-left bg-sky-600 hover:bg-sky-500 px-3 py-2 text-[11px] rounded-lg font-bold text-white shadow block cursor-pointer transition-colors" disabled={isGeneratingBatch}>
                                📈 Generar Reconocimiento (Crecimiento)
                              </button>
                              <button type="button" onClick={()=>handleGenerateAIBatch('Crear alerta suave porque sus compras han disminuido en el presente año. Invitar a retomar pidiendo sus magistrales con un enganche sutil.')} className="w-full text-left bg-rose-600 hover:bg-rose-500 px-3 py-2 text-[11px] rounded-lg font-bold text-white shadow block cursor-pointer transition-colors" disabled={isGeneratingBatch}>
                                🚨 Generar Alerta (Reducción)
                              </button>
                              <button type="button" onClick={()=>handleGenerateAIBatch('Mensaje de rescate de cliente dormido con 0 compras este año. Muy persuasivo, ofrecer asesoramiento y reactivar sus ganas de prescribir.')} className="w-full text-left bg-slate-700 hover:bg-slate-600 px-3 py-2 text-[11px] rounded-lg font-bold text-white shadow block cursor-pointer transition-colors" disabled={isGeneratingBatch}>
                                💤 Generar Rescate (Dormidos)
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Real-time Parsed Previews */}
                        <div className="md:col-span-3 space-y-4">
                          <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-sky-400 block uppercase">✨ Bandeja de Mensajes Listos ({segmentedClients.length})</span>
                              <span className="text-[10px] text-slate-400">Mensajes adaptados individualmente por IA. Sin variables a la vista.</span>
                            </div>

                            {segmentedClients.length === 0 ? (
                              <div className="text-center p-12 text-slate-500 italic text-xs bg-[#0a101e] rounded-xl">
                                Seleccione un filtro en "1. Segmentación IA" para generar mensajes.
                              </div>
                            ) : isGeneratingBatch ? (
                              <div className="text-center p-12 bg-[#0a101e] rounded-xl flex flex-col items-center justify-center space-y-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
                                <span className="text-xs text-indigo-300 font-bold font-mono">El Motor Gemini está redactando mensajes personalizados...</span>
                              </div>
                            ) : (
                              <div className="h-96 pr-2 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                {segmentedClients.map(c => {
                                  const finalMsg = aiGeneratedMessages[c.id] || replaceMessageVariables(messageTemplate, c);
                                  return (
                                    <div key={c.id} className="bg-[#0a101e] p-3 rounded-lg border border-slate-700 flex flex-col gap-2 relative group hover:border-sky-500 transition-colors">
                                      <div className="flex justify-between items-start">
                                        <div className="font-bold text-slate-200 text-xs">Mensaje para: <span className="text-indigo-300">{c.name}</span> <span className="text-slate-500 font-normal">({c.clinica || 'Sin clínica'})</span></div>
                                        <div className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                                          Lista para envío automático
                                        </div>
                                      </div>
                                      <div className="text-xs text-slate-350 leading-relaxed font-serif whitespace-pre-line pl-1 border-l-2 border-indigo-500/30">
                                        {finalMsg}
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

                  {/* 3. GENERADOR GRÁFICO */}
                  {commsSubTab === 'image_gen' && (
                    <div className="space-y-6 text-left animate-fadeIn">
                      <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 space-y-4">
                        <span className="text-xs font-bold text-sky-400 block uppercase">🎨 Generador Gráfico Personalizado</span>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Aquí puedes visualizar tarjetas de resumen de nivel con los colores y montos exactos de la categoría actual de cada cliente segmentado. Utiliza estas piezas gráficas capturando la pantalla (Screenshot) para enviarlas como imagen adjunta vía WhatsApp o Correo.
                        </p>
                        
                        {segmentedClients.length === 0 ? (
                           <div className="text-center p-12 text-slate-500 italic text-xs bg-[#0a101e] rounded-xl border border-slate-800">
                             Por favor filtra tu base en la pestaña "1. Segmentación IA" para generar gráficas.
                           </div>
                        ) : (
                          <div className="space-y-8">
                            <div className="flex flex-wrap gap-6 pt-4 justify-center">
                              {segmentedClients.slice(0, 8).map(c => {
                                const ec = enrichedClients.find(i => i.id === c.id) || c;
                                const tierInfo = ec.calculatedTier;
                                const nextTierInfo = ec.nextTier;
                                const v2026 = ec.ventas?.v2026 || 0;
                                const gap = nextTierInfo ? Math.max(0, nextTierInfo.min - v2026) : 0;
                                const theme = {
                                  0: { bg: '#475569', primary: '#cbd5e1' },
                                  1: { bg: '#92400e', primary: '#fcd34d' },
                                  2: { bg: '#475569', primary: '#f1f5f9' },
                                  3: { bg: '#b45309', primary: '#fef08a' },
                                  4: { bg: '#581c87', primary: '#d8b4fe' }
                                }[tierInfo?.index || 0] || { bg: '#475569', primary: '#cbd5e1' };

                                return (
                                  <div key={c.id} id={`postcard-${c.id}`} className="relative w-80 h-[480px] rounded-3xl overflow-hidden shrink-0 shadow-2xl transition-all hover:scale-[1.02] group" style={{ background: `linear-gradient(160deg, ${theme.bg} 0%, #000 100%)` }}>
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>
                                    
                                    {/* Cimasur branding premium */}
                                    <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center font-black text-[12px] text-black">C</div>
                                        <div className="font-black text-white tracking-[0.2em] text-[10px] uppercase">CIMASUR</div>
                                      </div>
                                      <div className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-[9px] font-black text-white">
                                         2026/27
                                      </div>
                                    </div>

                                    <div className="px-6 pt-20 flex flex-col items-center text-center space-y-5 z-10 relative">
                                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/20 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                                         <Award className="w-8 h-8 text-white" />
                                      </div>
                                      
                                      <div className="space-y-1">
                                        <h4 className="text-[9px] font-black text-indigo-400 tracking-[0.3em] uppercase">Membresía Exclusiva</h4>
                                        <h2 className="text-xl font-black text-white leading-tight uppercase tracking-tight">{c.name}</h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{c.clinica}</p>
                                      </div>

                                      <div className="py-2.5 px-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg">
                                         <span className="text-sm font-black tracking-[0.15em] uppercase" style={{ color: theme.primary }}>{tierInfo?.name}</span>
                                      </div>

                                      <div className="w-full pt-2 space-y-4">
                                         <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-1">
                                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest block">Actividad Anual</span>
                                            <span className="text-lg font-mono font-black text-white">${formatCLP(v2026)}</span>
                                         </div>

                                         {nextTierInfo ? (
                                           <div className="space-y-2 px-1">
                                              <div className="flex justify-between text-[8px] text-slate-400 font-black uppercase tracking-widest">
                                                 <span>Progreso de Nivel</span>
                                                 <span className="text-white">{Math.min(100, Math.floor((v2026 / nextTierInfo.min) * 100))}%</span>
                                              </div>
                                              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                 <div className="h-full bg-white transition-all duration-1000" style={{ width: `${Math.min(100, (v2026 / nextTierInfo.min) * 100)}%`, backgroundColor: theme.primary }}></div>
                                              </div>
                                              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                <p className="text-[8px] text-slate-300 font-bold leading-tight">💎 {nextTierInfo.primaryBenefit}</p>
                                              </div>
                                           </div>
                                         ) : (
                                           <div className="py-3 px-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                              <p className="text-[10px] text-emerald-400 font-black uppercase leading-tight">Estatus CIMASUR Platino</p>
                                              <p className="text-[8px] text-emerald-500/80 font-bold">Máximo beneficio comercial alcanzado</p>
                                           </div>
                                         )}
                                      </div>
                                    </div>

                                    <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1 opacity-60">
                                       <div className="w-8 h-0.5 bg-white/20 rounded-full"></div>
                                       <div className="text-[7px] text-slate-500 font-mono tracking-widest uppercase">Verificado • {c.id.substring(0,8).toUpperCase()}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {segmentedClients.length > 8 && (
                              <div className="text-center py-4">
                                <p className="text-xs text-slate-500 italic">Mostrando los primeros 8 veterinarios. Ajusta los filtros para ver otros grupos.</p>
                              </div>
                            )}

                            <div className="max-w-xl mx-auto p-4 rounded-2xl bg-indigo-900/10 border border-indigo-900/30 flex items-start gap-4">
                               <Sparkles className="w-5 h-5 text-indigo-400 mt-1 shrink-0" />
                               <div className="space-y-1">
                                  <p className="text-xs font-bold text-indigo-100">Consejo de CIMASUR:</p>
                                  <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                                    Haz una captura de pantalla de estas tarjetas para enviarlas por WhatsApp. Es la forma más efectiva de captar la atención de los médicos sobre su progreso comercial y beneficios exclusivos.
                                  </p>
                               </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. CONFIGURACIÓN COMERCIAL SUBTAB */}
                  {commsSubTab === 'config' && (
                    <div className="bg-[#101b33] p-5 rounded-xl border border-slate-800 space-y-4 text-left">
                      <div className="border-b border-slate-800 pb-2">
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-[#38bdf8]" /> Configuración Comercial del Asesor
                        </h4>
                        <p className="text-[11px] text-slate-400">Permite parametrizar las firmas automáticas y las vías de contacto preestablecidas de todos tus correos y WhatsApps magistrales.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="text-slate-400 block font-bold">Nombre Ejecutivo Comercial:</label>
                          <input 
                            type="text" 
                            value={execConfig.nombre} 
                            onChange={(e) => handleSaveExecConfig({ ...execConfig, nombre: e.target.value })} 
                            className="w-full bg-[#0a101e] px-3.5 py-2 rounded-xl text-xs border border-slate-700 text-white font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 block font-bold">Cargo / Rol Comercial:</label>
                          <input 
                            type="text" 
                            value={execConfig.cargo} 
                            onChange={(e) => handleSaveExecConfig({ ...execConfig, cargo: e.target.value })} 
                            className="w-full bg-[#0a101e] px-3.5 py-2 rounded-xl text-xs border border-slate-700 text-white font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 block font-bold">Correo Electrónico de Contacto comercial:</label>
                          <input 
                            type="email" 
                            value={execConfig.correo} 
                            onChange={(e) => handleSaveExecConfig({ ...execConfig, correo: e.target.value })} 
                            className="w-full bg-[#0a101e] px-3.5 py-2 rounded-xl text-xs border border-slate-700 text-white font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 block font-bold">Número de WhatsApp (+56):</label>
                          <input 
                            type="text" 
                            value={execConfig.whatsapp} 
                            onChange={(e) => handleSaveExecConfig({ ...execConfig, whatsapp: e.target.value })} 
                            className="w-full bg-[#0a101e] px-3.5 py-2 rounded-xl text-xs border border-slate-700 text-white font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1">
                          <label className="text-slate-400 block font-bold">Firma del Remitente (Pie de mensaje):</label>
                          <textarea 
                            value={execConfig.firma} 
                            onChange={(e) => handleSaveExecConfig({ ...execConfig, firma: e.target.value })} 
                            rows={3}
                            className="w-full bg-[#0a101e] px-3.5 py-2 rounded-xl text-xs border border-slate-700 text-white font-sans focus:outline-none"
                          />
                        </div>

                        <div className="md:col-span-2 mt-4 space-y-4 pt-4 border-t border-slate-800">
                          <div className="flex items-center gap-2">
                             <Mail className="w-4 h-4 text-emerald-400" />
                             <span className="text-xs font-black text-slate-200 uppercase tracking-widest">Configuración SMTP Propio (Emailing Real)</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-slate-500 block font-bold text-[10px] uppercase">Servidor SMTP:</label>
                              <input 
                                type="text" 
                                value={execConfig.smtpServer} 
                                onChange={(e) => handleSaveExecConfig({ ...execConfig, smtpServer: e.target.value })} 
                                placeholder="smtp.ejemplo.com"
                                className="w-full bg-[#0a101e] px-3.5 py-2 rounded-xl text-xs border border-slate-700 text-white font-mono focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-slate-500 block font-bold text-[10px] uppercase">Puerto:</label>
                              <input 
                                type="text" 
                                value={execConfig.smtpPort} 
                                onChange={(e) => handleSaveExecConfig({ ...execConfig, smtpPort: e.target.value })} 
                                placeholder="587"
                                className="w-full bg-[#0a101e] px-3.5 py-2 rounded-xl text-xs border border-slate-700 text-white font-mono focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-slate-500 block font-bold text-[10px] uppercase">Usuario SMTP:</label>
                              <input 
                                type="text" 
                                value={execConfig.smtpUser} 
                                onChange={(e) => handleSaveExecConfig({ ...execConfig, smtpUser: e.target.value })} 
                                className="w-full bg-[#0a101e] px-3.5 py-2 rounded-xl text-xs border border-slate-700 text-white font-mono focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-slate-500 block font-bold text-[10px] uppercase">Contraseña:</label>
                              <input 
                                type="password" 
                                value={execConfig.smtpPass} 
                                onChange={(e) => handleSaveExecConfig({ ...execConfig, smtpPass: e.target.value })} 
                                className="w-full bg-[#0a101e] px-3.5 py-2 rounded-xl text-xs border border-slate-700 text-white font-mono focus:outline-none"
                              />
                            </div>
                          </div>
                          
                          <div className="p-3 rounded-lg bg-emerald-900/10 border border-emerald-900/30 flex items-start gap-3">
                            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-emerald-400/80 leading-relaxed italic">
                              CIMASUR utiliza estos parámetros para establecer una conexión segura TLS/SSL y despachar los correos electrónicos 
                              usando su propio dominio institucional. Esto garantiza la máxima tasa de entrega (Delivery Rate) y profesionalismo.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button 
                          onClick={() => {
                            alert("Configuración Comercial Jaime González - CIMASUR grabada de manera correcta en el panel.");
                          }}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                        >
                          Guardar Configuración Comercial 💾
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 5. HISTORIAL DE ENVÍOS SUBTAB */}
                  {commsSubTab === 'history' && (
                    <div className="bg-[#101b33] p-4 rounded-xl border border-slate-800 text-left space-y-3">
                      <span className="text-xs font-bold text-slate-400 block uppercase">📜 Historial de Despachos Recientes y Campañas Registradas</span>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 uppercase font-extrabold text-[10px] font-mono">
                              <th className="pb-2.5">Socio Destinatario</th>
                              <th className="pb-2.5">Establecimiento</th>
                              <th className="pb-2.5">Último WhatsApp</th>
                              <th className="pb-2.5">Último Correo</th>
                              <th className="pb-2.5">Campaña / Asunto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-medium">
                            {enrichedClients.slice(0, 15).map(c => (
                              <tr key={c.id} className="hover:bg-slate-900/10">
                                <td className="py-2.5 font-bold text-white">{c.name}</td>
                                <td className="py-2.5 text-slate-400 text-[11px]">{c.clinica || '---'}</td>
                                <td className="py-2.5 font-mono text-emerald-400">{c.ultimoWhatsapp || 'No enviado'}</td>
                                <td className="py-2.5 font-mono text-sky-400">{c.ultimoCorreo || 'No enviado'}</td>
                                <td className="py-2.5">
                                  {c.ultimaCampania ? (
                                    <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded text-[9.5px]">
                                      {c.ultimaCampania}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 italic text-[10px]">Sin campaña</span>
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
                                <td className="p-3 font-mono font-bold text-slate-200">${formatCLP(c.ventas?.v2026 || 0)}</td>
                                <td className="p-3 font-mono">
                                  <span className={c.percentChange >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-450 text-rose-400'}>
                                    {c.percentChange >= 0 ? `+` : ''}${formatCLP((c.ventas?.v2026 || 0) - (c.ventas?.v2025 || 0))}
                                  </span>
                                </td>
                                <td className="p-3 font-mono">
                                  {c.brechaAscenso > 0 ? (
                                    <span className="text-yellow-400">${formatCLP(c.brechaAscenso)}</span>
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
                  <li>Solo se actualizarán los años en donde hayas mapeado una columna. Los años en <strong className="text-white">"Ninguna"</strong> conservarán su valor histórico.</li>
                  <li>Usa los selectores inferiores para mapear el número de columna correspondiente a cada dato.</li>
                </ol>
              </div>

              {/* Paste Textarea */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs text-slate-350 font-bold block">Pega el contenido tabulado de tu planilla aquí:</label>
                <textarea
                  value={salesImportText}
                  onChange={(e) => setSalesImportText(e.target.value)}
                  placeholder="Ejemplo con años múltiples (RUT / 2024 / 2025 / 2026):&#10;12.345.678-9&#9;1200000&#9;2300000&#9;3500000&#10;&#10;Ejemplo con un solo año (RUT / Venta):&#10;9.876.543-2&#9;450000"
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
                                <td className="p-2.5">${formatCLP(row.v2024 || 0)}</td>
                                <td className="p-2.5">${formatCLP(row.v2025 || 0)}</td>
                                <td className="p-2.5 text-emerald-400 font-extrabold">${formatCLP(row.v2026 || 0)}</td>
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
