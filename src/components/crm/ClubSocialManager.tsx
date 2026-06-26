import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, Users, Shield, Sliders, Send, FileText, Sparkles, Lightbulb, 
  Search, Trash2, Edit3, Plus, ArrowUpRight, ArrowDownRight, Award, Check, 
  RotateCcw, Copy, CheckCircle, Save, Download, Mail, Phone, ExternalLink, 
  Calendar, MapPin, Notebook, MessageSquare, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Settings, Image,
  Palette, Link as LinkIcon, Filter, Loader2, Paperclip, Maximize2, X, Laptop, Smartphone, Tablet as TabletIcon, Code
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
  clinica?: string;
  ultimoWhatsapp?: string;
  ultimoCorreo?: string;
  ultimaCampania?: string;
  intranet?: string;
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
  } else {
    return { v2024: 0, v2025: 0, v2026: 0 };
  }
}

function getTierBySales(sales: number, tiers: TierConfig[]) {
  const list = tiers.length > 0 ? tiers : TIERS_DEFAULT;
  for (const t of list) {
    if (sales >= t.min && sales <= t.max) {
      return t;
    }
  }
  return list[0];
}

function getTierBadgeClass(name: string): string {
  const norm = (name || '').toLowerCase();
  if (norm.includes('platinum')) {
    return 'bg-purple-950/80 text-purple-300 border-purple-500/40 whitespace-nowrap shadow-sm';
  }
  if (norm.includes('oro')) {
    return 'bg-amber-950/80 text-yellow-300 border-yellow-600/40 whitespace-nowrap shadow-sm';
  }
  if (norm.includes('plata')) {
    return 'bg-slate-800 text-slate-100 border-slate-500/40 whitespace-nowrap shadow-sm';
  }
  if (norm.includes('bronce')) {
    return 'bg-amber-950/40 text-amber-300 border-amber-800/40 whitespace-nowrap shadow-sm';
  }
  return 'bg-slate-900/90 text-slate-400 border-slate-800 whitespace-nowrap';
}

export function ClubSocialManager() {
  const [clients, setClients] = useState<ClubClient[]>([]);
  const [tiersList, setTiersList] = useState<TierConfig[]>(TIERS_DEFAULT);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICO' | 'DORMIDO' | 'EN_CAIDA' | 'PERDIDO'>('ALL');
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  
  // Segment and upgrade states for Opportunities & Campaigns
  const [opportunityViewType, setOpportunityViewType] = useState<'alertas' | 'upgrades'>('alertas');
  const [upgradeSegmentFilter, setUpgradeSegmentFilter] = useState<'bronce_oro' | 'plata_platinum'>('bronce_oro');
  const [recipientFilterSegment, setRecipientFilterSegment] = useState<'critical' | 'bronce_to_gold' | 'silver_to_platinum' | 'intranet_sin_compras' | 'sin_categorias' | 'bronce' | 'plata' | 'oro' | 'platinum' | 'all'>('critical');
  
  // Navigation Tabs matching user sidebar mockup
  const [activeTab, setActiveTab] = useState<'dashboard' | 'individual' | 'tiers' | 'designer' | 'masivo' | 'oportunidades'>('oportunidades');
  
  // Custom Campaign state
  const [messageText, setMessageText] = useState<string>('');
  const [improvePrompt, setImprovePrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [usingLocalFallback, setUsingLocalFallback] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<string>('');
  
  // AI Bulk Conversational states
  const [previewTab, setPreviewTab] = useState<'email' | 'whatsapp' | 'config'>('email');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ia'; text: string }[]>([
    {
      sender: 'ia',
      text: '¡Hola! Bienvenido al Copiloto de Campañas Masivas CIMASUR. Aquí puedes conversar conmigo sobre cómo mejorar tus campañas de email marketing o de WhatsApp. Cuéntame qué quieres ajustar (ej: "menciona que daremos prórroga de recalificación hasta el 30 de junio de 2026", "haz el mensaje de whatsapp más persuasivo", o "ofrece un plazo de gracia especial en la próxima reposición") y yo actualizaré tus plantillas masivas automáticamente.'
    }
  ]);
  const [userChatMessage, setUserChatMessage] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);

  // Custom Email Designer options
  const [designerAccentColor, setDesignerAccentColor] = useState('#38bdf8');
  const [designerTitle, setDesignerTitle] = useState('CIMASUR®');
  const [designerSubtitle, setDesignerSubtitle] = useState('Farmacia Homeopática Veterinaria de Chile');
  const [designerBodyBgColor, setDesignerBodyBgColor] = useState('#050914');
  const [designerCardBgColor, setDesignerCardBgColor] = useState('#0d162d');
  const [designerTextColor, setDesignerTextColor] = useState('#cbd5e1');
  const [designerButtonText, setDesignerButtonText] = useState('Reclamar mi Beneficio Ahora ➔');
  const [designerButtonUrl, setDesignerButtonUrl] = useState('https://cimasur.cl');
  const [emailTemplateStyle, setEmailTemplateStyle] = useState<'modern' | 'letter' | 'promotional' | 'custom'>('modern');
  const [customHtmlWrapper, setCustomHtmlWrapper] = useState(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CIMASUR Club Social</title>
</head>
<body style="margin:0; padding:20px; background-color:#050914; color:#cbd5e1; font-family:sans-serif;">
  <div style="max-width:580px; margin:0 auto; background:#0d162d; border: 2px solid {{ACCENT_COLOR}}; padding:30px; border-radius:12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
    <h2 style="color:{{ACCENT_COLOR}}; font-size:24px; margin-top:0;">{{TITLE}}</h2>
    <p style="font-size:12px; color:#94a3b8; font-style:italic; margin-bottom:20px;">{{SUBTITLE}}</p>
    
    <div style="background-color:#050914; padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid #1e293b; font-size:12px; color:#94a3b8;">
      • <strong>Socio:</strong> {{CLIENT_NAME}}<br>
      • <strong>Clínica:</strong> {{CLIENT_CLINICA}}<br>
      • <strong>Estatus:</strong> {{CLIENT_TIER}}
    </div>

    <div style="line-height:1.6; color:#cbd5e1; font-size:14px;">
      {{CONTENT}}
    </div>
    
    <hr style="border:0; border-top:1px solid #1e293b; margin:30px 0;">
    <div style="text-align:center; font-size:11px; color:#64748b;">
      Enviado con aprecio por el Equipo de Fidelización de CIMASUR.
    </div>
  </div>
</body>
</html>`);

  // Image Upload states for campaign designer
  const [isLargePreviewOpen, setIsLargePreviewOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copiedHtmlTimer, setCopiedHtmlTimer] = useState(false);
  const [uploadedImageB64, setUploadedImageB64] = useState<string | null>(null);
  const [uploadedImageMime, setUploadedImageMime] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor, suba únicamente archivos de imagen.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImageB64(event.target?.result as string);
      setUploadedImageMime(file.type);
      setUploadedFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleClearUploadedImage = () => {
    setUploadedImageB64(null);
    setUploadedImageMime(null);
    setUploadedFileName(null);
  };

  const handleSendChatMessage = async () => {
    if ((!userChatMessage.trim() && !uploadedImageB64) || isSendingChatMessage) return;
    const userMsg = userChatMessage.trim();
    setUserChatMessage('');
    setIsSendingChatMessage(true);
    
    // Add to chat history immediately
    const labelText = userMsg + (uploadedFileName ? `\n[Diseño adjunto: ${uploadedFileName}]` : '');
    const updatedHistory = [...chatHistory, { sender: 'user' as const, text: labelText }];
    setChatHistory(updatedHistory);
    
    try {
      const response = await fetch('/api/ai/converse-bulk-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory: updatedHistory,
          currentEmailSubject: bulkEmailSubject,
          currentEmailText: bulkEmailText,
          currentWhatsAppText: bulkWhatsAppText,
          userMessage: userMsg || 'Analiza mi diseño adjunto y adapta la campaña en base a la imagen.',
          image: uploadedImageB64,
          imageMimeType: uploadedImageMime,
          currentDesignerTitle: designerTitle,
          currentDesignerSubtitle: designerSubtitle,
          currentDesignerAccentColor: designerAccentColor
        })
      });
      
      if (!response.ok) {
        throw new Error('Fallo al conectar con el servidor del Copiloto IA (Falta configurar GEMINI_API_KEY).');
      }
      
      const data = await response.json();
      if (data) {
        setChatHistory(prev => [...prev, { sender: 'ia' as const, text: data.reply || 'He procesado tus instrucciones con éxito.' }]);
        if (data.updatedEmailSubject) setBulkEmailSubject(data.updatedEmailSubject);
        if (data.updatedEmailText) setBulkEmailText(data.updatedEmailText);
        if (data.updatedWhatsAppText) setBulkWhatsAppText(data.updatedWhatsAppText);
        if (data.updatedDesignerTitle) setDesignerTitle(data.updatedDesignerTitle);
        if (data.updatedDesignerSubtitle) setDesignerSubtitle(data.updatedDesignerSubtitle);
        if (data.updatedDesignerAccentColor) setDesignerAccentColor(data.updatedDesignerAccentColor);
        
        // Reset uploaded image upon successful processing
        handleClearUploadedImage();
      }
    } catch (e: any) {
      console.warn("Error de chat o credenciales de Copiloto:", e);
      setUsingLocalFallback(true);
      setChatHistory(prev => [
        ...prev,
        { 
          sender: 'ia' as const, 
          text: `⚠️ El servidor de CIMASUR no tiene configurada la credencial GEMINI_API_KEY.\n\nMientras se configura la clave en el servidor, puede redactar sus mensajes directamente en los paneles de edición de arriba o seleccionar un objetivo de campaña (ej: Plazo de Gracia, Descuento Especial) y presionar "Generar Plantillas de Campaña" para cargar de forma local las mejores plantillas prediseñadas oficiales de CIMASUR.`
        }
      ]);
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  // SMTP Config state (Pre-filled with CIMASUR defaults)
  const [smtpHost, setSmtpHost] = useState<string>('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState<string>('465');
  const [smtpUser, setSmtpUser] = useState<string>('contacto@cimasur.cl');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [smtpSenderName, setSmtpSenderName] = useState<string>('Club CIMASUR 👑');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // SMTP Test state
  const [isTestingSmtp, setIsTestingSmtp] = useState<boolean>(false);
  const [testEmailTarget, setTestEmailTarget] = useState<string>('contacto@cimasur.cl');
  const [testSmtpResult, setTestSmtpResult] = useState<{ success: boolean; message: string } | null>(null);

  // Bulk Campaign parameters
  const [campaignObjective, setCampaignObjective] = useState<string>('reactivacion_gracia');
  const [campaignPrompt, setCampaignPrompt] = useState<string>('');
  const [isGeneratingBulk, setIsGeneratingBulk] = useState<boolean>(false);
  
  // Bulk copy templates (prefilled with beautiful default copy templates supporting variables)
  const [bulkEmailSubject, setBulkEmailSubject] = useState<string>('⚡ Alianza Comercial CIMASUR: {{CLINICA}} - Beneficios de Categoría {{CATEGORIA_2026}}');
  const [bulkEmailText, setBulkEmailText] = useState<string>('Estimado/a {{NOMBRE}},\n\nLe saludamos afectuosamente desde CIMASUR Chile, su farmacia homeopática veterinaria de referencia.\n\nRevisando nuestro sistema de fidelización del Club Comercial, observamos que su centro clínico {{CLINICA}} mantiene el acceso preferente a la categoría {{CATEGORIA_2026}} (con su beneficio estrella: {{BENEFICIO_PRINCIPAL}}).\n\nNo obstante, notamos que no registra órdenes recientes de reposición en este ciclo. Como queremos seguir apoyándolo en sus casos clínicos veterinarios, le hemos activado de forma excepcional un PLAZO DE GRACIA ESPECIAL de 30 días y despacho completamente gratuito (vía Blue Express) en su próximo pedido de fórmulas magistrales.\n\n¿Le gustaría coordinar una cotización preferencial o recibir una llamada de asesoramiento?\n\nQuedamos a su entera disposición.');
  const [bulkWhatsAppText, setBulkWhatsAppText] = useState<string>('Hola Dr/a. {{NOMBRE}} de {{CLINICA}} 🐾 Le saluda el equipo del Club CIMASUR. Queremos recordarle que mantiene sus beneficios preferentes de categoría {{CATEGORIA_2026}}. Para apoyarle, le otorgamos un plazo de gracia especial de 30 días y despacho gratis. ¿Le gustaría cotizar algún Kit de fórmulas? ¡Saludos!');
  const [selectedCampaignClientIds, setSelectedCampaignClientIds] = useState<string[]>([]);
  const [dispatchedWhatsAppIds, setDispatchedWhatsAppIds] = useState<string[]>([]);
  
  // Bulk sending execution states
  const [isBulkSending, setIsBulkSending] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<number>(0);
  const [bulkResults, setBulkResults] = useState<{ name: string; email: string; status: 'success' | 'error'; error?: string }[]>([]);

  // AI Evaluation parameters
  const [evaluation, setEvaluation] = useState<{
    scorePersonalizacion: number;
    scoreTonoApoyo: number;
    scoreLlamadoAccion: number;
    scoreEfectividad: number;
    positives: string[];
    improvements: string[];
  } | null>(null);

  const formatCLP = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

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
          clinica: c.razonSocial || c.clinica || (c.name ? `${c.name} Vet` : 'Clínica Veterinaria'),
          ultimoWhatsapp: c.ultimoWhatsapp || '',
          ultimoCorreo: c.ultimoCorreo || '',
          intranet: c.intranet || 'No'
        };
      });

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
    } catch (e) {
      console.error("Error loading contacts for ClubCRM", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-change', loadData);
    return () => window.removeEventListener('db-change', loadData);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLargePreviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Process all contacts into formatted club clients (including those in normal standing)
  const allClubClients = useMemo(() => {
    return clients.map(client => {
      const sales = client.ventas || { v2024: 0, v2025: 0, v2026: 0 };
      const v2024 = Number(sales.v2024 || 0);
      const v2025 = Number(sales.v2025 || 0);
      const v2026 = Number(sales.v2026 || 0);

      const activeTier2026 = getTierBySales(v2025, tiersList);
      const activeTier2025 = getTierBySales(v2024, tiersList);

      const percentChange = v2025 > 0 ? (v2026 - v2025) / v2025 : 0;
      const isRiesgoAlto = percentChange <= -0.50 && v2025 > 0;
      const isDormidos = v2025 > 0 && v2026 <= 0;
      const isPerdidos = v2024 > 0 && v2025 <= 0 && v2026 <= 0;
      const isDisminuyo = v2026 < v2025 && v2026 > 0 && v2025 > 0;

      let statusKey: 'ALL' | 'CRITICO' | 'DORMIDO' | 'EN_CAIDA' | 'PERDIDO' | 'NORMAL' = 'NORMAL';
      let statusLabel = 'Normal';
      let statusColor = 'text-slate-400 bg-slate-900/50 border-slate-800';

      if (isRiesgoAlto) {
        statusKey = 'CRITICO';
        statusLabel = 'Riesgo Crítico';
        statusColor = 'text-red-400 bg-red-950/40 border-red-900/30';
      } else if (isDormidos) {
        statusKey = 'DORMIDO';
        statusLabel = 'Dormido (Sin compras)';
        statusColor = 'text-yellow-400 bg-yellow-950/40 border-yellow-900/30';
      } else if (isPerdidos) {
        statusKey = 'PERDIDO';
        statusLabel = 'Socio Perdido';
        statusColor = 'text-gray-400 bg-gray-900/60 border-gray-850';
      } else if (isDisminuyo) {
        statusKey = 'EN_CAIDA';
        statusLabel = 'Compras en Caída';
        statusColor = 'text-rose-400 bg-rose-950/30 border-rose-900/30';
      }

      return {
        ...client,
        ventas: { v2024, v2025, v2026 },
        calculatedTier: activeTier2026,
        percentChange,
        statusKey,
        statusLabel,
        statusColor,
        isCritical: statusKey !== 'NORMAL'
      };
    });
  }, [clients, tiersList]);

  // Filter clients to include ONLY critical ones
  const criticalClients = useMemo(() => {
    return allClubClients.filter(c => c.isCritical);
  }, [allClubClients]);

  // Candidates for category upgrade (Bronze -> Gold, Silver -> Platinum)
  const upgradeCandidates = useMemo(() => {
    const rawList = allClubClients.filter(c => {
      const tierName = (c.calculatedTier?.name || '').toLowerCase();
      if (upgradeSegmentFilter === 'bronce_oro') {
        return tierName === 'bronce';
      } else {
        return tierName === 'plata';
      }
    });
    return rawList.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.clinica.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.rut.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [allClubClients, upgradeSegmentFilter, searchQuery]);

  // Dynamic list of recipients for the bulk campaign view
  const bulkCampaignRecipients = useMemo(() => {
    let rawList: ClubClient[] = [];
    if (recipientFilterSegment === 'critical') {
      rawList = criticalClients;
    } else if (recipientFilterSegment === 'bronce_to_gold') {
      rawList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'bronce');
    } else if (recipientFilterSegment === 'silver_to_platinum') {
      rawList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'plata');
    } else if (recipientFilterSegment === 'intranet_sin_compras') {
      rawList = allClubClients.filter(c => {
        const isIntranet = (c.intranet || '').toLowerCase().startsWith('si') || (c.intranet || '').toLowerCase().startsWith('sí');
        const tierName = (c.calculatedTier?.name || '').toLowerCase();
        const dbCat = (c.categoria || '').toLowerCase();
        const hasNoCategory = 
          tierName.includes('sin') || 
          tierName === '' ||
          dbCat.includes('sin') || 
          dbCat === '';
        const noPurchases = (c.ventas?.v2026 || 0) === 0;
        return isIntranet && (hasNoCategory || noPurchases);
      });
    } else if (recipientFilterSegment === 'sin_categorias') {
      rawList = allClubClients.filter(c => {
        const tier = (c.calculatedTier?.name || '').toLowerCase();
        return tier === 'sin categoría' || tier === 'sin categoria' || tier === '';
      });
    } else if (recipientFilterSegment === 'bronce') {
      rawList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'bronce');
    } else if (recipientFilterSegment === 'plata') {
      rawList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'plata');
    } else if (recipientFilterSegment === 'oro') {
      rawList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'oro');
    } else if (recipientFilterSegment === 'platinum') {
      rawList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'platinum');
    } else {
      rawList = allClubClients;
    }

    return rawList.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.clinica.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.rut.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [allClubClients, criticalClients, recipientFilterSegment, searchQuery]);

  // Handle auto-selection of first client if none selected
  useEffect(() => {
    if (criticalClients.length > 0 && !selectedClientId) {
      setSelectedClientId(criticalClients[0].id);
    }
  }, [criticalClients, selectedClientId]);

  // Load saved SMTP config and auto-select bulk recipients on mount
  useEffect(() => {
    const savedHost = localStorage.getItem('smtp_host');
    const savedPort = localStorage.getItem('smtp_port');
    const savedUser = localStorage.getItem('smtp_user');
    const savedPass = localStorage.getItem('smtp_pass');
    const savedName = localStorage.getItem('smtp_sender_name');
    if (savedHost) {
      if (savedHost === 'smtp.cimasur.cl') {
        setSmtpHost('smtp.gmail.com');
        setSmtpPort('465');
      } else {
        setSmtpHost(savedHost);
        if (savedPort) setSmtpPort(savedPort);
      }
    }
    if (savedUser) setSmtpUser(savedUser);
    if (savedPass) setSmtpPass(savedPass);
    if (savedName) setSmtpSenderName(savedName);
  }, []);

  // Pre-select recipients matching the active segment filter by default
  useEffect(() => {
    let targetList: ClubClient[] = [];
    if (recipientFilterSegment === 'critical') {
      targetList = criticalClients;
    } else if (recipientFilterSegment === 'bronce_to_gold') {
      targetList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'bronce');
    } else if (recipientFilterSegment === 'silver_to_platinum') {
      targetList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'plata');
    } else if (recipientFilterSegment === 'intranet_sin_compras') {
      targetList = allClubClients.filter(c => {
        const isIntranet = (c.intranet || '').toLowerCase().startsWith('si') || (c.intranet || '').toLowerCase().startsWith('sí');
        const tierName = (c.calculatedTier?.name || '').toLowerCase();
        const dbCat = (c.categoria || '').toLowerCase();
        const hasNoCategory = 
          tierName.includes('sin') || 
          tierName === '' ||
          dbCat.includes('sin') || 
          dbCat === '';
        const noPurchases = (c.ventas?.v2026 || 0) === 0;
        return isIntranet && (hasNoCategory || noPurchases);
      });
    } else if (recipientFilterSegment === 'sin_categorias') {
      targetList = allClubClients.filter(c => {
        const tier = (c.calculatedTier?.name || '').toLowerCase();
        return tier === 'sin categoría' || tier === 'sin categoria' || tier === '';
      });
    } else if (recipientFilterSegment === 'bronce') {
      targetList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'bronce');
    } else if (recipientFilterSegment === 'plata') {
      targetList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'plata');
    } else if (recipientFilterSegment === 'oro') {
      targetList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'oro');
    } else if (recipientFilterSegment === 'platinum') {
      targetList = allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'platinum');
    } else {
      targetList = allClubClients;
    }
    setSelectedCampaignClientIds(targetList.map(c => c.id));
  }, [recipientFilterSegment, criticalClients, allClubClients]);

  const saveSmtpSettings = (host: string, port: string, user: string, pass: string, name: string) => {
    localStorage.setItem('smtp_host', host);
    localStorage.setItem('smtp_port', port);
    localStorage.setItem('smtp_user', user);
    localStorage.setItem('smtp_pass', pass);
    localStorage.setItem('smtp_sender_name', name);
  };

  // Filter list by search query and quick status filter (used for general/critical lists)
  const filteredClients = useMemo(() => {
    return criticalClients.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.clinica.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.rut.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || c.statusKey === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [criticalClients, searchQuery, statusFilter]);

  const selectedClient = useMemo(() => {
    return allClubClients.find(c => c.id === selectedClientId) || null;
  }, [allClubClients, selectedClientId]);

  // Clean message and evaluation when selected client or channel changes
  useEffect(() => {
    setMessageText('');
    setImprovePrompt('');
    setEvaluation(null);
  }, [selectedClientId, channel]);

  // Call Gemini to generate, evaluate and improve the recovery message
  const handleGenerateOrImproveMessage = async (isImprovement: boolean) => {
    if (!selectedClient) return;
    setIsGenerating(true);
    setUsingLocalFallback(false);
    try {
      const response = await fetch('/api/ai/evaluate-improve-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: selectedClient,
          status: selectedClient.statusLabel,
          currentMessage: isImprovement ? messageText : '',
          improvePrompt: isImprovement ? improvePrompt : 'Generar propuesta inicial altamente persuasiva, amigable y empática enfocada en recuperar al socio comercial.',
          channel: channel
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Fallo al procesar con IA.');
      }

      const data = await response.json();
      if (data && data.improvedMessage) {
        setMessageText(data.improvedMessage);
        if (data.evaluation) {
          setEvaluation(data.evaluation);
        }
        if (isImprovement) {
          setImprovePrompt('');
        }
      }
    } catch (e: any) {
      console.warn("Utilizando generador local de mensajes de CIMASUR debido a la falta de credenciales de Gemini:", e);
      setUsingLocalFallback(true);
      
      // Local fallback generation
      const clientName = selectedClient.name || 'Estimado/a Doctor/a';
      const clinica = selectedClient.clinica || 'Socio Clínico';
      const category = selectedClient.calculatedTier?.name || selectedClient.categoria || 'Bronce';
      const v2026 = selectedClient.ventas?.v2026 || 0;
      const formattedV2026 = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v2026);
      const percentChange = selectedClient.percentChange || 0;
      const changePct = Math.round(percentChange * 100);

      if (channel === 'whatsapp') {
        let text = '';
        if (selectedClient.statusKey === 'CRITICO') {
          text = `¡Estimado/a Dr/a. ${clientName}! 🏥 Le saluda Fernanda de Fidelización de CIMASUR. Esperamos de corazón que todo marche excelente en ${clinica}.\n\nRevisando nuestro registro, notamos que sus reposiciones clínicas han disminuido este ciclo (${changePct}%). Para nosotros su alianza es invaluable, por lo que le hemos asignado una *Prórroga Excepcional de Recalificación automática hasta el 30 de Junio* para mantener sus beneficios activos.\n\nAdemás, queremos apoyarle con un descuento o condiciones especiales en su próximo pedido de fórmulas magistrales. ¿Podemos coordinar una llamada para asistirle? Quedamos a su total servicio. 🌸`;
        } else if (selectedClient.statusKey === 'DORMIDO') {
          text = `¡Hola, Dr/a. ${clientName}! 🌿 Le escribimos con mucho cariño de CIMASUR. Hace un tiempo que no sabemos de usted en ${clinica} y le extrañamos mucho en nuestro Club de Socios.\n\nQueremos reactivar su cuenta ofreciéndole un beneficio exclusivo de bienvenida: *Despacho gratuito sin mínimo de compra* en su próximo pedido. Además, contamos con stock renovado de todas nuestras reconocidas fórmulas homeopáticas.\n\n¿Le gustaría que le enviemos nuestro Vademécum digital actualizado para revisar dosificaciones de nuestras fórmulas? ¡Estaremos felices de conversar! 🥰`;
        } else if (selectedClient.statusKey === 'EN_CAIDA') {
          text = `¡Estimado/a Dr/a. ${clientName}! ✨ Un afectuoso saludo del equipo CIMASUR. Esperamos que esté teniendo una excelente semana en ${clinica}.\n\nHemos detectado que su volumen de reposición ha bajado comparado con el año anterior. Para facilitarle las cosas, le ofrecemos un *Descuento Excepcional del 15%* en su próximo pedido de reposición, ideal para reabastecer sus fórmulas de alta rotación.\n\n¿Le ayudamos a preparar un pedido sugerido hoy? ¡Un gran abrazo! 🩺`;
        } else {
          text = `¡Estimado/a Dr/a. ${clientName}! 🌸 Le saluda Fernanda de CIMASUR. Esperamos que tenga una provechosa jornada en ${clinica}.\n\nQueremos agradecer su confianza continua en nuestras soluciones homeopáticas. Actualmente cuenta con estatus activo en la categoría *${category}* de nuestro Club de Socios, lo que le garantiza soporte prioritario y condiciones de compra preferenciales.\n\n¿Desea realizar alguna reposición de fórmulas magistrales para esta semana? ¡Que tenga un excelente día! 🩺`;
        }

        if (isImprovement && messageText) {
          text = `¡Hola, Dr/a. ${clientName}! ✨ (Mensaje mejorado localmente según su instrucción: "${improvePrompt}")\n\n` + text;
        }

        setMessageText(text);
        setEvaluation({
          scorePersonalizacion: 96,
          scoreTonoApoyo: 98,
          scoreLlamadoAccion: 88,
          scoreEfectividad: 94,
          positives: [
            "Mensaje diseñado a medida con el nombre del veterinario y su clínica.",
            "Tono de apoyo clínico sumamente empático y profesional.",
            "Llamado a la acción claro que fomenta la conversación directa."
          ],
          improvements: [
            "Generado localmente por contingencia operativa (Falta GEMINI_API_KEY).",
            "Mención de fórmulas emblemáticas de CIMASUR.",
            "Cumple estrictamente con las reglas de extensión de WhatsApp."
          ]
        });
      } else {
        // Email layout
        let subject = '';
        let body = '';

        if (selectedClient.statusKey === 'CRITICO') {
          subject = `CIMASUR Apoyo Clínico: Prórroga de Recalificación y beneficios exclusivos para Dr/a. ${clientName}`;
          body = `Estimado/a Doctor/a ${clientName},\n\nEsperamos de todo corazón que se encuentre muy bien en su clínica ${clinica}.\n\nNos ponemos en contacto con usted porque para CIMASUR su alianza profesional y la salud de sus pacientes son de máxima prioridad. Revisando nuestro sistema comercial, notamos una disminución inusual en el volumen de sus reposiciones de medicamentos homeopáticos este ciclo (${changePct}%).\n\nEntendemos plenamente que el sector veterinario enfrenta desafíos constantes. Por ello, queremos brindarle nuestro respaldo completo. Le informamos que de manera automática le hemos asignado una Prórroga Excepcional de Recalificación hasta el 30 de Junio de 2026 para que conserve intactos todos sus beneficios de la categoría ${category}.\n\nAdicionalmente, le ofrecemos un descuento especial del 15% en su próximo pedido de fórmulas de alta rotación, junto con despacho prioritario gratuito.\n\n¿Le gustaría que coordinemos una breve llamada o asesoría sin costo hoy?\n\nAtentamente,\nFernanda Contreras\nDepartamento de Relaciones Clínicas y Fidelización\nCIMASUR - Chile`;
        } else if (selectedClient.statusKey === 'DORMIDO') {
          subject = `¡Le extrañamos en el Club CIMASUR! Beneficios de reactivación exclusivos para ${clinica} 🌸`;
          body = `Estimado/a Doctor/a ${clientName},\n\nEsperamos que se encuentre excelente. Le saludamos con mucho cariño de parte de todo el equipo de Farmacias Homeopáticas CIMASUR.\n\nHace un tiempo que no registramos sus pedidos habituales de reabastecimiento en ${clinica}, y queremos expresarle que su presencia en nuestra comunidad de veterinarios es muy importante para nosotros.\n\nPara celebrar su retorno y facilitarle el cuidado homeopático de sus pacientes, este mes hemos activado despacho 100% gratuito sin mínimo de compra en su próximo pedido, y el envío de regalo de nuestro nuevo Vademécum Físico si programa compras sobre 30 unidades.\n\nContamos con stock completo de nuestras fórmulas magistrales líderes.\n\n¿Le gustaría que le enviemos la lista de precios vigente y nuestro vademécum digital de apoyo terapéutico?\n\nCordialmente,\nFernanda Contreras\nÁrea de Fidelización de Socios\nCIMASUR - Chile`;
        } else {
          subject = `Estatus de Beneficios Club CIMASUR para Dr/a. ${clientName} - Clínica ${clinica}`;
          body = `Estimado/a Doctor/a ${clientName},\n\nJunto con saludarle afectuosamente en nombre de todo el equipo de Farmacia Homeopática CIMASUR de Chile, le escribimos para agradecer su constante confianza en nuestras fórmulas magistrales homeopáticas.\n\nQueremos recordarle que actualmente se encuentra activo en la categoría ${category} del Club de Socios, lo que le garantiza soporte prioritario, stock reservado y excelentes condiciones de compra.\n\nSi necesita asesoría técnica en la dosificación de fórmulas de alta rotación para alguno de sus pacientes, recuerde que nuestro equipo clínico está siempre disponible para asistirle sin costo.\n\n¿Le ayudamos a coordinar su pedido de reposición semanal para mantener su farmacia al día?\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
        }

        if (isImprovement && messageText) {
          body = `[Mensaje mejorado localmente según su sugerencia: "${improvePrompt}"]\n\n` + body;
        }

        setMessageText(`ASUNTO: ${subject}\n\n${body}`);
        setEvaluation({
          scorePersonalizacion: 94,
          scoreTonoApoyo: 96,
          scoreLlamadoAccion: 85,
          scoreEfectividad: 92,
          positives: [
            "Estructura formal elegante con asunto de correo sumamente persuasivo.",
            "Cuerpo de correo perfectamente redactado con justificación de alianza.",
            "Llamado a la acción claro y profesional que promueve el diálogo."
          ],
          improvements: [
            "Generado localmente por contingencia operativa (Falta GEMINI_API_KEY).",
            "Mención de fórmulas y plazos institucionales actualizados.",
            "Incluye variables de personalización integradas de manera impecable."
          ]
        });
      }
      
      if (isImprovement) {
        setImprovePrompt('');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Add a manual unificada log note
  const handleAddManualNote = async () => {
    if (!selectedClient || !newNote.trim()) return;
    try {
      const stamp = `[${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}]: ${newNote.trim()}`;
      const currentHist = selectedClient.historialUnificado || '';
      const updatedHist = currentHist ? `${stamp}\n${currentHist}` : stamp;

      await localDB.updateInCollection('contacts', selectedClient.id, {
        historialUnificado: updatedHist
      });

      setNewNote('');
      window.dispatchEvent(new Event('db-change'));
    } catch (err) {
      console.error(err);
      alert('Error al guardar nota de actividad.');
    }
  };

  // Execute actual messaging dispatch via WhatsApp
  const handleDispatchWhatsApp = async () => {
    if (!selectedClient || !messageText.trim()) return;
    
    // Clean phone number
    let cleanPhone = selectedClient.phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+56${cleanPhone}`; // Default to Chile
    }
    
    try {
      // Update last active time and save history unificado
      const nowStr = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
      const stamp = `[${nowStr} - WhatsApp Recup.]: Mensaje enviado para recuperación.`;
      const currentHist = selectedClient.historialUnificado || '';
      const updatedHist = currentHist ? `${stamp}\n${currentHist}` : stamp;

      await localDB.updateInCollection('contacts', selectedClient.id, {
        ultimoWhatsapp: nowStr,
        historialUnificado: updatedHist
      });

      window.dispatchEvent(new Event('db-change'));

      // Open WhatsApp Web
      const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(messageText)}`;
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  // Execute actual email copy & prefill mailto
  const handleDispatchEmail = async () => {
    if (!selectedClient || !messageText.trim()) return;

    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(messageText);

      // Update last active time and save history
      const nowStr = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
      const stamp = `[${nowStr} - Correo Recup.]: Mensaje copiado y redactado para envío de correo.`;
      const currentHist = selectedClient.historialUnificado || '';
      const updatedHist = currentHist ? `${stamp}\n${currentHist}` : stamp;

      await localDB.updateInCollection('contacts', selectedClient.id, {
        ultimoCorreo: nowStr,
        historialUnificado: updatedHist
      });

      window.dispatchEvent(new Event('db-change'));

      // Open prefilled mailto
      const subject = `Alianza Preferencial y Beneficios CIMASUR - ${selectedClient.clinica}`;
      const url = `mailto:${encodeURIComponent(selectedClient.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent("Estimado/a doctor/a,\n\n(El contenido del mensaje recomendado ha sido copiado a su portapapeles. Por favor, péguelo aquí)\n\nAtentamente,\nEquipo CIMASUR")}`;
      window.open(url, '_blank');
      
      alert('¡El texto completo del correo se ha copiado al portapapeles para facilitar su redacción! Se ha abierto su gestor de correo predeterminado.');
    } catch (e) {
      console.error(e);
      alert('No se pudo copiar el texto automáticamente, pero puede copiarlo manualmente de la pantalla.');
    }
  };

  // Helper to compile elegant graphic email with resolved placeholders
  const compileHtmlTemplate = (client: any, bodyText: string, accentColor: string = designerAccentColor) => {
    const changePct = (client.percentChange || 0) * 100;
    const changeStr = changePct < 0 ? `${changePct.toFixed(0)}%` : `+${changePct.toFixed(0)}%`;
    
    const resolvedText = bodyText
      .replace(/\{\{NOMBRE\}\}/g, client.name || 'Doctor/a')
      .replace(/\{\{CLINICA\}\}/g, client.clinica || 'Centro Clínico')
      .replace(/\{\{CATEGORIA_2026\}\}/g, client.calculatedTier?.name || 'Socio Especial')
      .replace(/\{\{VARIACION_VENTAS\}\}/g, changeStr)
      .replace(/\{\{BENEFICIO_PRINCIPAL\}\}/g, client.calculatedTier?.primaryBenefit || 'Beneficios preferentes de vademécum');

    const textHtml = resolvedText.replace(/\n/g, '<br />');

    if (emailTemplateStyle === 'custom') {
      return customHtmlWrapper
        .replace(/\{\{ACCENT_COLOR\}\}/g, accentColor)
        .replace(/\{\{BODY_BG\}\}/g, designerBodyBgColor)
        .replace(/\{\{CARD_BG\}\}/g, designerCardBgColor)
        .replace(/\{\{TEXT_COLOR\}\}/g, designerTextColor)
        .replace(/\{\{TITLE\}\}/g, designerTitle)
        .replace(/\{\{SUBTITLE\}\}/g, designerSubtitle)
        .replace(/\{\{CLIENT_NAME\}\}/g, client.name || 'Socio')
        .replace(/\{\{CLIENT_CLINICA\}\}/g, client.clinica || 'Veterinaria')
        .replace(/\{\{CLIENT_TIER\}\}/g, client.calculatedTier?.name || 'Preferencial')
        .replace(/\{\{CONTENT\}\}/g, textHtml);
    }

    if (emailTemplateStyle === 'letter') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CIMASUR Alianza Profesional</title>
</head>
<body style="margin:0; padding:0; background-color:${designerBodyBgColor === '#050914' ? '#f8fafc' : designerBodyBgColor}; font-family:Georgia, serif; color:${designerTextColor === '#cbd5e1' ? '#1e293b' : designerTextColor}; line-height:1.8;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:${designerBodyBgColor === '#050914' ? '#f8fafc' : designerBodyBgColor}; padding:40px 12px;">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color:${designerCardBgColor === '#0d162d' ? '#ffffff' : designerCardBgColor}; padding:40px; border-radius:4px; border-top:4px solid ${accentColor}; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding-bottom:20px; border-bottom:1px solid #e2e8f0;">
              <span style="color:${accentColor}; font-family:'Segoe UI', sans-serif; font-size:11px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">${designerTitle}</span>
              <p style="color:#64748b; font-family:'Segoe UI', sans-serif; font-size:11px; margin:4px 0 0 0;">${designerSubtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:25px 0 15px 0;">
              <p style="font-size:13px; margin:0 0 20px 0; color:#64748b; font-family:'Segoe UI', sans-serif;">Santiago, ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <h2 style="font-size:18px; font-weight:normal; margin:0 0 4px 0; color:#0f172a; font-family:Georgia, serif;">Estimado/a ${client.name},</h2>
              <p style="font-size:12px; color:#64748b; margin:0 0 20px 0; font-family:'Segoe UI', sans-serif;">${client.clinica} • Categoría ${client.calculatedTier?.name || 'Socio'}</p>
            </td>
          </tr>
          <tr>
            <td style="font-size:14px; font-family:Georgia, serif; color:${designerTextColor === '#cbd5e1' ? '#334155' : designerTextColor};">
              ${textHtml}
            </td>
          </tr>
          <tr>
            <td style="padding-top:40px; border-top:1px solid #e2e8f0; font-family:'Segoe UI', sans-serif; font-size:11px; color:#64748b;">
              <p style="margin:0 0 4px 0; font-weight:bold; color:#0f172a;">Atentamente,</p>
              <p style="margin:0 0 15px 0; font-weight:bold; color:${accentColor};">${designerTitle}</p>
              <p style="margin:0; font-size:10px;">Este mensaje institucional es confidencial y de uso exclusivo para profesionales veterinarios colegiados de Chile.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    if (emailTemplateStyle === 'promotional') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CIMASUR Alianza Especial</title>
</head>
<body style="margin:0; padding:0; background-color:${designerBodyBgColor}; font-family:'Segoe UI', sans-serif; color:${designerTextColor};">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:${designerBodyBgColor}; padding:30px 12px;">
    <tr>
      <td align="center">
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color:${designerCardBgColor}; border-radius:24px; overflow:hidden; border:2px solid ${accentColor};">
          <tr>
            <td style="background-color:${accentColor}; padding:35px 30px; text-align:center;">
              <span style="color:#ffffff; background-color:rgba(0,0,0,0.25); font-size:9px; font-weight:900; letter-spacing:2px; padding:4px 12px; border-radius:20px; text-transform:uppercase;">BENEFICIO SOCIO COMERCIAL</span>
              <h1 style="color:#0d162d; font-size:28px; font-weight:900; margin:15px 0 5px 0; tracking:-1px;">${designerTitle}</h1>
              <p style="color:#0d162d; font-size:12px; margin:0; opacity:0.8;">${designerSubtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 30px 15px 30px; text-align:center;">
              <h2 style="color:#ffffff; font-size:20px; font-weight:800; margin:0 0 8px 0;">¡Hola ${client.name}!</h2>
              <p style="color:#94a3b8; font-size:12px; margin:0;">Exclusivo para la clínica: <strong>${client.clinica}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 25px 30px; font-size:13.5px; line-height:1.7;">
              <div style="background-color:rgba(255,255,255,0.03); border:1px dashed ${accentColor}50; border-radius:12px; padding:18px; text-align:center; margin-bottom:20px;">
                <span style="color:#94a3b8; font-size:10px; text-transform:uppercase; font-weight:bold; letter-spacing:1px; display:block; margin-bottom:6px;">Estatus Actualizado Club 2026</span>
                <span style="color:#ffffff; font-size:18px; font-weight:900; display:block;">Categoría ${client.calculatedTier?.name || 'Socio'}</span>
                <span style="color:${accentColor}; font-size:13px; font-weight:bold; display:block; margin-top:4px;">★ ${client.calculatedTier?.primaryBenefit || 'Condiciones Preferentes'} ★</span>
              </div>
              <div style="color:${designerTextColor};">
                ${textHtml}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 30px 35px 30px; text-align:center;">
              <table align="center" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color:${accentColor}; border-radius:50px; padding:11px 30px;">
                    <a href="${designerButtonUrl}" target="_blank" style="color:#0d162d; font-size:12px; font-weight:900; text-decoration:none; text-transform:uppercase; letter-spacing:1px; display:block;">${designerButtonText}</a>
                  </td>
                </tr>
              </table>
              <p style="color:#64748b; font-size:10px; margin:15px 0 0 0;">¿Dudas o requerimientos especiales? Contáctenos hoy mismo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    // Default to 'modern' style
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Alianza Preferente CIMASUR</title>
</head>
<body style="margin:0; padding:0; background-color:${designerBodyBgColor}; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:${designerTextColor};">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:${designerBodyBgColor}; padding:24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Panel Container -->
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="background-color:${designerCardBgColor}; border-radius:16px; overflow:hidden; border:1px solid #1e293b; box-shadow:0 10px 25px rgba(0,0,0,0.4);">
          
          <!-- Header Hero with CIMASUR logo and banner -->
          <tr>
            <td style="background: linear-gradient(135deg, ${designerCardBgColor} 0%, ${designerBodyBgColor} 100%); padding:40px 30px; text-align:center; border-bottom:3px solid ${accentColor};">
              <span style="color:${accentColor}; font-size:10px; font-weight:900; letter-spacing:3px; text-transform:uppercase; display:block; margin-bottom:8px;">CLUB SOCIAL & MOTOR COMERCIAL</span>
              <h1 style="color:#ffffff; font-size:26px; font-weight:900; margin:0; tracking: -0.5px;">${designerTitle}</h1>
              <p style="color:#94a3b8; font-size:12px; margin:6px 0 0 0; font-style:italic;">${designerSubtitle}</p>
            </td>
          </tr>

          <!-- Profile Header Card -->
          <tr>
            <td style="padding:30px 35px 15px 35px;">
              <span style="background-color:${accentColor}15; color:${accentColor}; border:1px solid ${accentColor}30; font-size:9px; font-weight:bold; padding:4px 10px; border-radius:12px; text-transform:uppercase; display:inline-block;">
                Socio Categoría ${client.calculatedTier?.name || 'Preferencial'}
              </span>
              <h2 style="color:#ffffff; font-size:20px; font-weight:800; margin:14px 0 3px 0;">Estimado/a ${client.name},</h2>
              <p style="color:#94a3b8; font-size:13px; font-weight:500; margin:0;">${client.clinica}</p>
            </td>
          </tr>

          <!-- Dynamic Email Content Block -->
          <tr>
            <td style="padding:15px 35px 25px 35px; font-size:13.5px; line-height:1.65; color:${designerTextColor};">
              <!-- Highlights box -->
              <div style="background-color:${designerBodyBgColor}; border-left:3px solid ${accentColor}; padding:14px; margin-bottom:20px; font-size:12.5px; color:#94a3b8; border-radius:6px; border-top:1px solid #1e293b; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b;">
                <strong>Resumen Técnico de Alianza 2026:</strong><br>
                • Nivel de Socio Comercial: <strong style="color:#ffffff;">${client.calculatedTier?.name || 'Preferencial'}</strong><br>
                • Soporte Activo: <strong style="color:${accentColor};">${client.calculatedTier?.primaryBenefit || 'Muestras clínicas y vademécum'}</strong>
              </div>
              
              <div style="color:${designerTextColor}; font-family:inherit;">
                ${textHtml}
              </div>
            </td>
          </tr>

          <!-- Products Showcase Grid -->
          <tr>
            <td style="padding:10px 35px 30px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:${designerBodyBgColor}; border-radius:10px; border:1px solid #1e293b; padding:18px;">
                <tr>
                  <td colspan="3" style="padding-bottom:12px; border-bottom:1px solid #1e293b;">
                    <span style="color:#ffffff; font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">Fórmulas Clínicas Recomendadas para este Período:</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:15px; vertical-align:top;" width="33%">
                    <strong style="font-size:12px; color:#ffffff; display:block;">Fórmula Magistral</strong>
                    <span style="font-size:10px; color:#64748b; display:block; margin-top:4px;">Incomparable modulador inflamatorio de uso clínico.</span>
                  </td>
                  <td style="padding-top:15px; vertical-align:top; border-left:1px solid #1e293b; padding-left:15px;" width="33%">
                    <strong style="font-size:12px; color:#ffffff; display:block;">Acqua Maris®</strong>
                    <span style="font-size:10px; color:#64748b; display:block; margin-top:4px;">Purificación y soporte respiratorio natural avanzado.</span>
                  </td>
                  <td style="padding-top:15px; vertical-align:top; border-left:1px solid #1e293b; padding-left:15px;" width="33%">
                    <strong style="font-size:12px; color:#ffffff; display:block;">Kit Digestivo CS®</strong>
                    <span style="font-size:10px; color:#64748b; display:block; margin-top:4px;">Regulación integral de mucosa digestiva animal.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Interactive Footer Card -->
          <tr>
            <td style="background-color:${designerBodyBgColor}; border-top:1px solid #1e293b; padding:25px 35px; text-align:center;">
              <p style="color:#ffffff; font-size:12.5px; margin:0 0 8px 0; font-weight:bold;">Alianza de Soporte Médico Veterinario CIMASUR</p>
              <p style="color:#64748b; font-size:10.5px; margin:0 0 15px 0; line-height:1.5;">
                Fono: +56 9 1234 5678 | Correo: contacto@cimasur.cl<br>
                CIMASUR Homeopatía Veterinaria, Providencia, Santiago, Chile
              </p>
              <table align="center" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color:${accentColor}; border-radius:8px; padding:9px 20px;">
                    <a href="${designerButtonUrl}" target="_blank" style="color:#0d162d; font-size:11px; font-weight:bold; text-decoration:none; text-transform:uppercase; letter-spacing:0.5px;">${designerButtonText}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        
        <!-- Standard Disclamer -->
        <table width="560" border="0" cellspacing="0" cellpadding="0" style="margin-top:15px;">
          <tr>
            <td align="center" style="color:#475569; font-size:9.5px; line-height:1.4; padding:0 10px;">
              Este es un correo electrónico enviado automáticamente por autorización del Club Comercial CIMASUR. Si desea suspender estas comunicaciones o actualizar sus datos, contacte a soporte@cimasur.cl.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  // Test custom SMTP credentials
  const handleTestSmtp = async () => {
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      setTestSmtpResult({ success: false, message: 'Por favor complete todos los parámetros SMTP (Servidor, Puerto, Usuario y Contraseña).' });
      return;
    }
    setIsTestingSmtp(true);
    setTestSmtpResult(null);
    try {
      const res = await fetch('/api/mail/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            smtpServer: smtpHost,
            smtpPort: smtpPort,
            smtpUser: smtpUser,
            smtpPass: smtpPass,
            nombre: smtpSenderName || 'Prueba CIMASUR'
          },
          emails: [{
            to: testEmailTarget,
            subject: '🧪 Conexión SMTP Propia Exitosa - CRM CIMASUR',
            text: `¡Felicidades! Su conexión SMTP (${smtpHost}:${smtpPort}) con la cuenta institucional ${smtpUser} está correctamente configurada y segura.`,
            html: `
              <div style="background-color:#0d162d; padding:35px; border-radius:12px; border:1px solid #38bdf8; font-family:sans-serif; color:#ffffff; max-width:500px;">
                <h2 style="color:#38bdf8; margin-top:0;">🧪 Conexión SMTP Verificada</h2>
                <p style="font-size:14px; line-height:1.5;">Este correo confirma que el CRM de CIMASUR ha conectado de forma exitosa y segura con su servidor institucional para el despacho masivo de campañas de fidelización.</p>
                <hr style="border:0; border-top:1px solid #1e293b; margin:20px 0;">
                <p style="font-size:12px; color:#94a3b8; margin-bottom:0;">Enviado el ${new Date().toLocaleString('es-CL')}</p>
              </div>
            `
          }]
        })
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        throw new Error(`El servidor devolvió un error inesperado (posible timeout de red). ${res.status} ${res.statusText}`);
      }

      if (res.ok && data.results && data.results[0]?.status === 'success') {
        setTestSmtpResult({ success: true, message: `¡Verificación Exitosa! Correo de prueba despachado con éxito a ${testEmailTarget}.` });
        saveSmtpSettings(smtpHost, smtpPort, smtpUser, smtpPass, smtpSenderName);
      } else {
        const detail = data.results?.[0]?.error || data.error || 'Fallo de autenticación o puertos.';
        setTestSmtpResult({ success: false, message: `Fallo de Conexión: ${detail}` });
      }
    } catch (e: any) {
      setTestSmtpResult({ success: false, message: `Fallo de Red: ${e.message}` });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSegmentChange = (segment: 'critical' | 'bronce_to_gold' | 'silver_to_platinum' | 'intranet_sin_compras' | 'sin_categorias' | 'bronce' | 'plata' | 'oro' | 'platinum' | 'all') => {
    setRecipientFilterSegment(segment);
    // Automatically match the campaign objective and load the appropriate template
    let targetObjective = 'pertenencia_categoria_intranet';
    if (segment === 'intranet_sin_compras') {
      targetObjective = 'intranet_sin_compra_orientacion';
    } else if (segment === 'critical') {
      targetObjective = 'reactivacion_gracia';
    } else if (segment === 'bronce_to_gold' || segment === 'silver_to_platinum') {
      targetObjective = 'subir_categoria_incentivo';
    } else {
      targetObjective = 'pertenencia_categoria_intranet';
    }
    setCampaignObjective(targetObjective);
    
    // Proactively pre-fill the templates with our highly professional local templates for the new objective
    let localEmailSubject = '';
    let localEmailText = '';
    let localWhatsAppText = '';
    
    if (targetObjective === 'pertenencia_categoria_intranet') {
      localEmailSubject = 'Estatus Oficial Club CIMASUR: Su Categoría {{CATEGORIA_2026}} y Acceso a Intranet';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, nos dirigimos a usted en representación de CIMASUR Chile.\n\nQueremos informarle oficialmente que su cuenta mantiene activa la categoría {{CATEGORIA_2026}} en nuestro Club de Socios, lo que le otorga condiciones comerciales y de soporte preferentes para sus recetas magistrales.\n\nAsimismo, le recordamos que dispone de acceso a nuestra Intranet de Socios, donde podrá consultar:\n- Fichas técnicas de nuestras formulaciones magistrales.\n- Vademécum completo de productos oficiales de CIMASUR.\n- Monografías científicas y protocolos de dosificación.\n\nQuedamos a su entera disposición ante cualquier consulta técnica o requerimiento.\n\nAtentamente,\nFernanda Contreras\nDepartamento de Relaciones Clínicas y Fidelización\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Le recordamos que mantiene activa la categoría {{CATEGORIA_2026}} de nuestro Club de Socios. Asimismo, cuenta con acceso completo a nuestra Intranet Exclusiva para la consulta de Vademécum, dosificaciones y material científico.\n\nQuedamos a su disposición si requiere apoyo o una breve inducción. Atentamente, CIMASUR.`;
    } else if (targetObjective === 'subir_categoria_incentivo') {
      localEmailSubject = 'Actualización de Cuenta: Análisis de Crecimiento en Club CIMASUR';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, le escribimos desde el departamento de fidelización de CIMASUR.\n\nRevisando el estatus de su cuenta, observamos que se encuentra en una posición muy favorable para ascender de categoría en nuestro Club de Socios. Este ascenso le permitirá acceder de forma inmediata a beneficios mejorados, tales como:\n- Mayor porcentaje de descuento en todas sus reposiciones.\n- Prioridad de despacho a su clínica {{CLINICA}}.\n- Soporte preferente con nuestro laboratorio farmacéutico.\n\nSi le interesa conocer la diferencia exacta de compras requerida y evaluar facilidades para este ascenso en su próxima reposición, quedamos atentos para asistirle de manera personalizada.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe escribimos de CIMASUR. Evaluando su cuenta en {{CLINICA}}, observamos que se encuentra muy próximo a calificar para un ascenso de categoría en nuestro Club de Socios, lo que incrementará sus beneficios de descuento y prioridad de despacho. ¿Le gustaría conocer la diferencia exacta para alcanzar este estatus? Atentamente, CIMASUR.`;
    } else if (targetObjective === 'envio_gratis_promocion') {
      localEmailSubject = 'Beneficio Exclusivo Club CIMASUR: Despacho sin Mínimo de Compra para {{CLINICA}}';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle de parte de Farmacias CIMASUR, nos ponemos en contacto para informarle un beneficio exclusivo para su centro clínico.\n\nCon el propósito de asegurar que sus pacientes cuenten siempre con sus tratamientos a tiempo, hemos activado en su cuenta un beneficio temporal de envío sin costo y sin mínimo de compra para su próxima orden de reposición.\n\nEsto le permitirá abastecerse de aquellas fórmulas prioritarias de manera ágil.\n\nQuedamos a su disposición para coordinar el despacho inmediato.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Le informamos que se encuentra activo en su cuenta un beneficio de Despacho sin Costo y sin mínimo de compra para su clínica {{CLINICA}}. Ideal para reponer de forma ágil las fórmulas prioritarias de sus pacientes. ¿Le ayudamos a preparar un despacho sugerido? Saludos, CIMASUR.`;
    } else if (targetObjective === 'intranet_sin_compra_orientacion') {
      localEmailSubject = 'Bienvenida a la Intranet CIMASUR: Soporte Técnico y Orientación para el Profesional Veterinario';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, le damos la bienvenida a la plataforma digital de CIMASUR.\n\nObservamos con agrado que se encuentra activo en nuestra Intranet de Socios, donde se aloja el Vademécum científico de nuestras fórmulas magistrales homeopáticas. Nuestro principal objetivo es ser un apoyo en su práctica diaria.\n\nPara facilitar su experiencia, nos gustaría ofrecerle una breve orientación técnica sin costo respecto a las líneas terapéuticas de mayor uso (como Arnica CS para el control inflamatorio, Acqua Maris, o el Kit Modulador Digestivo).\n\nAsimismo, le informamos que para su primera reposición de fórmulas profesionales dispone de:\n- Un 15% de descuento especial de bienvenida.\n- Despacho preferente sin costo a su clínica {{CLINICA}}.\n- Envío de un Kit de Vademécum Físico de regalo para su consulta.\n\nQuedamos a su entera disposición para resolver cualquier inquietud clínica.\n\nAtentamente,\nFernanda Contreras\nRelaciones Clínicas y Fidelización\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Le damos la bienvenida a nuestra Intranet de Socios. Para acompañarle en sus primeros pasos con la terapia homeopática, quedamos a su entera disposición para brindarle orientación técnica sobre dosificaciones y fórmulas. Recuerde que en su primera compra cuenta con un 15% de descuento de bienvenida, despacho gratis y el Vademécum Físico de regalo para su clínica {{CLINICA}}. Atentamente, CIMASUR.`;
    } else if (targetObjective === 'reactivacion_gracia') {
      localEmailSubject = 'Estatus de Cuenta: Prórroga de Recalificación en Club CIMASUR';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, nos dirigimos a usted en relación a los beneficios de su cuenta en CIMASUR.\n\nComprendiendo la dinámica laboral y las necesidades de abastecimiento de su clínica {{CLINICA}}, queremos informarle que le hemos otorgado una Prórroga Excepcional de Recalificación de 30 días.\n\nGracias a esta medida, mantendrá todos los beneficios y condiciones comerciales preferenciales de la categoría {{CATEGORIA_2026}} de manera ininterrumpida. Estaremos encantados de colaborar con usted para coordinar su próxima orden con despacho gratuito garantizado.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Para resguardar su labor y mantener vigentes sus beneficios de la categoría {{CATEGORIA_2026}} en nuestro Club, le informamos que le hemos otorgado una prórroga extraordinaria de 30 días para su recalificación. ¿Le gustaría que le ayudemos a coordinar un despacho sugerido para esta semana con flete bonificado? Saludos, CIMASUR.`;
    } else if (targetObjective === 'descuento_excepcional') {
      localEmailSubject = 'Beneficio Especial de Reposición: Descuento Excepcional del 15% en CIMASUR';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nEsperamos que tenga una provechosa jornada en su clínica {{CLINICA}}.\n\nComo beneficio extraordinario para los miembros del Club, le informamos que se encuentra habilitada en su cuenta una bonificación especial del 15% de descuento aplicable a su próxima reposición de fórmulas magistrales.\n\nQuedamos atentos si desea que preparemos un pedido sugerido con despacho prioritario.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Le informamos que se encuentra activo en su cuenta un descuento excepcional del 15% para su próximo pedido de reposición en {{CLINICA}}. ¿Le asistimos para ingresar una orden sugerida con despacho preferente? Atentamente, CIMASUR.`;
    } else {
      localEmailSubject = 'Estatus de Beneficios Club CIMASUR - Dr/a. {{NOMBRE}}';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, nos dirigimos a usted para agradecer su constante confianza en las fórmulas magistrales homeopáticas de CIMASUR en {{CLINICA}}.\n\nLe recordamos que actualmente se encuentra activo en la categoría {{CATEGORIA_2026}} de nuestro Club de Socios, lo que le garantiza soporte prioritario, stock reservado y condiciones de compra preferentes.\n\nAnte cualquier duda de dosificación o de protocolos clínicos, nuestro equipo farmacéutico está plenamente disponible para asistirle.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR para agradecer su confianza profesional. Le recordamos que mantiene su estatus activo en la categoría {{CATEGORIA_2026}} en nuestro Club. Quedamos a su entera disposición ante cualquier duda o reposición que requiera. Atentamente, CIMASUR.`;
    }
    
    setBulkEmailSubject(localEmailSubject);
    setBulkEmailText(localEmailText);
    setBulkWhatsAppText(localWhatsAppText);
    setUsingLocalFallback(true);
  };

  // Load expert pre-written CIMASUR template directly and instantly (No AI / No API key required)
  const handleLoadLocalTemplateDirectly = () => {
    if (selectedCampaignClientIds.length === 0) {
      alert('Por favor seleccione al menos un socio de CIMASUR para cargar la plantilla.');
      return;
    }
    
    const objectiveText = campaignObjective === 'pertenencia_categoria_intranet' ? 'Pertenencia a Categoría e Intranet (Vademécum y Fichas)' :
                          campaignObjective === 'subir_categoria_incentivo' ? 'Estímulo para Subir de Categoría (Upgrade)' :
                          campaignObjective === 'envio_gratis_promocion' ? 'Promoción Envío Gratis Sin Mínimo' :
                          campaignObjective === 'intranet_sin_compra_orientacion' ? 'Activos en Intranet Sin Compra (Asesoría)' :
                          campaignObjective === 'reactivacion_gracia' ? 'Plazo de Gracia Especial (30 Días de Beneficios con Var. Caída)' :
                          campaignObjective === 'alianza_comercial' ? 'Alianza Preferencial CIMASUR (Análisis de Categoría 2026)' :
                          campaignObjective === 'descuento_excepcional' ? 'Descuento del 15% Excepcional en la Próxima Reposición' :
                          'Invitación a Testeo Sin Costo de la Nueva Línea de Alérgenos';

    let localEmailSubject = '';
    let localEmailText = '';
    let localWhatsAppText = '';
    
    if (campaignObjective === 'pertenencia_categoria_intranet') {
      localEmailSubject = 'Estatus Oficial Club CIMASUR: Su Categoría {{CATEGORIA_2026}} y Acceso a Intranet';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, nos dirigimos a usted en representación de CIMASUR Chile.\n\nQueremos informarle oficialmente que su cuenta mantiene activa la categoría {{CATEGORIA_2026}} en nuestro Club de Socios, lo que le otorga condiciones comerciales y de soporte preferentes para sus recetas magistrales.\n\nAsimismo, le recordamos que dispone de acceso a nuestra Intranet de Socios, donde podrá consultar:\n- Fichas técnicas de nuestras formulaciones magistrales.\n- Vademécum completo de productos oficiales de CIMASUR.\n- Monografías científicas y protocolos de dosificación.\n\nQuedamos a su entera disposición ante cualquier consulta técnica o requerimiento.\n\nAtentamente,\nFernanda Contreras\nDepartamento de Relaciones Clínicas y Fidelización\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Le recordamos que mantiene activa la categoría {{CATEGORIA_2026}} de nuestro Club de Socios. Asimismo, cuenta con acceso completo a nuestra Intranet Exclusiva para la consulta de Vademécum, dosificaciones y material científico.\n\nQuedamos a su disposición si requiere apoyo o una breve inducción. Atentamente, CIMASUR.`;
    } else if (campaignObjective === 'subir_categoria_incentivo') {
      localEmailSubject = 'Actualización de Cuenta: Análisis de Crecimiento en Club CIMASUR';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, le escribimos desde el departamento de fidelización de CIMASUR.\n\nRevisando el estatus de su cuenta, observamos que se encuentra en una posición muy favorable para ascender de categoría en nuestro Club de Socios. Este ascenso le permitirá acceder de forma inmediata a beneficios mejorados, tales como:\n- Mayor porcentaje de descuento en todas sus reposiciones.\n- Prioridad de despacho a su clínica {{CLINICA}}.\n- Soporte preferente con nuestro laboratorio farmacéutico.\n\nSi le interesa conocer la diferencia exacta de compras requerida y evaluar facilidades para este ascenso en su próxima reposición, quedamos atentos para asistirle de manera personalizada.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe escribimos de CIMASUR. Evaluando su cuenta en {{CLINICA}}, observamos que se encuentra muy próximo a calificar para un ascenso de categoría en nuestro Club de Socios, lo que incrementará sus beneficios de descuento y prioridad de despacho. ¿Le gustaría conocer la diferencia exacta para alcanzar este estatus? Atentamente, CIMASUR.`;
    } else if (campaignObjective === 'envio_gratis_promocion') {
      localEmailSubject = 'Beneficio Exclusivo Club CIMASUR: Despacho sin Mínimo de Compra para {{CLINICA}}';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle de parte de Farmacias CIMASUR, nos ponemos en contacto para informarle un beneficio exclusivo para su centro clínico.\n\nCon el propósito de asegurar que sus pacientes cuenten siempre con sus tratamientos a tiempo, hemos activado en su cuenta un beneficio temporal de envío sin costo y sin mínimo de compra para su próxima orden de reposición.\n\nEsto le permitirá abastecerse de aquellas fórmulas prioritarias de manera ágil.\n\nQuedamos a su disposición para coordinar el despacho inmediato.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Le informamos que se encuentra activo en su cuenta un beneficio de Despacho sin Costo y sin mínimo de compra para su clínica {{CLINICA}}. Ideal para reponer de forma ágil las fórmulas prioritarias de sus pacientes. ¿Le ayudamos a preparar un despacho sugerido? Saludos, CIMASUR.`;
    } else if (campaignObjective === 'intranet_sin_compra_orientacion') {
      localEmailSubject = 'Bienvenida a la Intranet CIMASUR: Soporte Técnico y Orientación para el Profesional Veterinario';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, le damos la bienvenida a la plataforma digital de CIMASUR.\n\nObservamos con agrado que se encuentra activo en nuestra Intranet de Socios, donde se aloja el Vademécum científico de nuestras fórmulas magistrales homeopáticas. Nuestro principal objetivo es ser un apoyo en su práctica diaria.\n\nPara facilitar su experiencia, nos gustaría ofrecerle una breve orientación técnica sin costo respecto a las líneas terapéuticas de mayor uso (como Arnica CS para el control inflamatorio, Acqua Maris, o el Kit Modulador Digestivo).\n\nAsimismo, le informamos que para su primera reposición de fórmulas profesionales dispone de:\n- Un 15% de descuento especial de bienvenida.\n- Despacho preferente sin costo a su clínica {{CLINICA}}.\n- Envío de un Kit de Vademécum Físico de regalo para su consulta.\n\nQuedamos a su entera disposición para resolver cualquier inquietud clínica.\n\nAtentamente,\nFernanda Contreras\nRelaciones Clínicas y Fidelización\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Le damos la bienvenida a nuestra Intranet de Socios. Para acompañarle en sus primeros pasos con la terapia homeopática, quedamos a su entera disposición para brindarle orientación técnica sobre dosificaciones y fórmulas. Recuerde que en su primera compra cuenta con un 15% de descuento de bienvenida, despacho gratis y el Vademécum Físico de regalo para su clínica {{CLINICA}}. Atentamente, CIMASUR.`;
    } else if (campaignObjective === 'reactivacion_gracia') {
      localEmailSubject = 'Estatus de Cuenta: Prórroga de Recalificación en Club CIMASUR';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, nos dirigimos a usted en relación a los beneficios de su cuenta en CIMASUR.\n\nComprendiendo la dinámica laboral y las necesidades de abastecimiento de su clínica {{CLINICA}}, queremos informarle que le hemos otorgado una Prórroga Excepcional de Recalificación de 30 días.\n\nGracias a esta medida, mantendrá todos los beneficios y condiciones comerciales preferenciales de la categoría {{CATEGORIA_2026}} de manera ininterrumpida. Estaremos encantados de colaborar con usted para coordinar su próxima orden con despacho gratuito garantizado.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Para resguardar su labor y mantener vigentes sus beneficios de la categoría {{CATEGORIA_2026}} en nuestro Club, le informamos que le hemos otorgado una prórroga extraordinaria de 30 días para su recalificación. ¿Le gustaría que le ayudemos a coordinar un despacho sugerido para esta semana con flete bonificado? Saludos, CIMASUR.`;
    } else if (campaignObjective === 'descuento_excepcional') {
      localEmailSubject = 'Beneficio Especial de Reposición: Descuento Excepcional del 15% en CIMASUR';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nEsperamos que tenga una provechosa jornada en su clínica {{CLINICA}}.\n\nComo beneficio extraordinario para los miembros del Club, le informamos que se encuentra habilitada en su cuenta una bonificación especial del 15% de descuento aplicable a su próxima reposición de fórmulas magistrales.\n\nQuedamos atentos si desea que preparemos un pedido sugerido con despacho prioritario.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR. Le informamos que se encuentra activo en su cuenta un descuento excepcional del 15% para su próximo pedido de reposición en {{CLINICA}}. ¿Le asistimos para ingresar una orden sugerida con despacho preferente? Atentamente, CIMASUR.`;
    } else {
      localEmailSubject = 'Estatus de Beneficios Club CIMASUR - Dr/a. {{NOMBRE}}';
      localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle, nos dirigimos a usted para agradecer su constante confianza en las fórmulas magistrales homeopáticas de CIMASUR en {{CLINICA}}.\n\nLe recordamos que actualmente se encuentra activo en la categoría {{CATEGORIA_2026}} de nuestro Club de Socios, lo que le garantiza soporte prioritario, stock reservado y condiciones de compra preferentes.\n\nAnte cualquier duda de dosificación o de protocolos clínicos, nuestro equipo farmacéutico está plenamente disponible para asistirle.\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
      localWhatsAppText = `Estimado/a Doctor/a {{NOMBRE}},\n\nLe saludamos de CIMASUR para agradecer su confianza profesional. Le recordamos que mantiene su estatus activo en la categoría {{CATEGORIA_2026}} en nuestro Club. Quedamos a su entera disposición ante cualquier duda o reposición que requiera. Atentamente, CIMASUR.`;
    }
    
    setBulkEmailSubject(localEmailSubject);
    setBulkEmailText(localEmailText);
    setBulkWhatsAppText(localWhatsAppText);
    setUsingLocalFallback(true);

    setChatHistory(prev => [
      ...prev,
      {
        sender: 'ia',
        text: `⚡ Plantilla oficial cargada de manera local e instantánea (sin IA) para el objetivo: "${objectiveText}". Puedes revisarla y editarla libremente en los paneles de arriba.`
      }
    ]);
    setPreviewTab('email');
  };

  // Open individual WhatsApp message with variable substitution for "one by one" dispatch
  const handleOpenIndividualWhatsApp = async (clientId: string) => {
    const client = allClubClients.find(c => c.id === clientId);
    if (!client) return;

    let cleanPhone = (client.phone || '').replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
      alert(`El socio ${client.name} no tiene número de teléfono registrado.`);
      return;
    }
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+56${cleanPhone}`; // Default to Chile
    }

    const changePct = (client.percentChange || 0) * 100;
    const changeStr = changePct < 0 ? `${changePct.toFixed(0)}%` : `+${changePct.toFixed(0)}%`;

    // Compile message individually with actual partner variables
    const resolvedWhatsApp = bulkWhatsAppText
      .replace(/\{\{NOMBRE\}\}/g, client.name || 'Doctor/a')
      .replace(/\{\{CLINICA\}\}/g, client.clinica || client.clinic || 'su Centro Clínico')
      .replace(/\{\{VARIACION_VENTAS\}\}/g, changeStr)
      .replace(/\{\{CATEGORIA_2026\}\}/g, client.calculatedTier?.name || client.category2026 || 'Socio Especial')
      .replace(/\{\{BENEFICIO_PRINCIPAL\}\}/g, client.calculatedTier?.primaryBenefit || 'beneficios preferenciales');

    try {
      const nowStr = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
      const stamp = `[${nowStr} - WhatsApp Campaña Directa]: Abrir chat directo uno por uno para envío de campaña.`;
      const currentHist = client.historialUnificado || '';
      const updatedHist = currentHist ? `${stamp}\n${currentHist}` : stamp;

      await localDB.updateInCollection('contacts', client.id, {
        ultimoWhatsapp: nowStr,
        historialUnificado: updatedHist
      });

      // Mark as dispatched locally in state
      if (!dispatchedWhatsAppIds.includes(clientId)) {
        setDispatchedWhatsAppIds(prev => [...prev, clientId]);
      }

      window.dispatchEvent(new Event('db-change'));

      // Open WhatsApp Web/API URL
      const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(resolvedWhatsApp)}`;
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
      alert('Error al registrar la actividad en el historial local.');
    }
  };

  // Open email bulk compose in local email client (Thunderbird, Outlook, etc) via mailto with BCC
  const handleOpenThunderbirdMailto = () => {
    const targets = allClubClients.filter(c => selectedCampaignClientIds.includes(c.id));
    if (targets.length === 0) {
      alert('Por favor seleccione al menos un socio comercial.');
      return;
    }

    const emailsList = targets.map(c => c.email).filter(Boolean);
    if (emailsList.length === 0) {
      alert('Los socios seleccionados no tienen correos electrónicos válidos registrados.');
      return;
    }

    // Join emails with commas for BCC to guarantee recipient privacy
    const bccPart = emailsList.join(',');

    // Resolve general text since a single BCC mail is sent to multiple people
    const resolvedBody = bulkEmailText
      .replace(/\{\{NOMBRE\}\}/g, 'Doctor/a')
      .replace(/\{\{CLINICA\}\}/g, 'su Centro Clínico')
      .replace(/\{\{CATEGORIA_2026\}\}/g, 'Socio Comercial')
      .replace(/\{\{BENEFICIO_PRINCIPAL\}\}/g, 'los beneficios preferentes del Club');

    // Create mailto url with standard parameters
    const mailtoUrl = `mailto:comercial@cimasur.cl?bcc=${encodeURIComponent(bccPart)}&subject=${encodeURIComponent(bulkEmailSubject)}&body=${encodeURIComponent(resolvedBody)}`;
    
    // Log activity in each individual client history
    targets.forEach(async (client) => {
      try {
        const nowStr = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});
        const stamp = `[${nowStr} - Campaña Correo Local]: Redireccionado a cliente de correo local (Thunderbird/Outlook) para envío masivo de campaña.`;
        const currentHist = client.historialUnificado || '';
        const updatedHist = currentHist ? `${stamp}\n${currentHist}` : stamp;

        await localDB.updateInCollection('contacts', client.id, {
          ultimoCorreo: nowStr,
          historialUnificado: updatedHist
        });
      } catch (err) {
        console.error('Error logging local email activity:', err);
      }
    });

    window.dispatchEvent(new Event('db-change'));
    
    // Open the local client
    window.location.href = mailtoUrl;

    alert(`¡Redirección exitosa! Se ha abierto su cliente de correo predeterminado (como Thunderbird) con ${emailsList.length} destinatarios cargados en copia oculta (BCC) para resguardar la privacidad. Las bitácoras individuales de los socios han sido actualizadas.`);
  };

  // Copy full rich text (HTML) of active campaign to clipboard for direct Thunderbird paste
  const handleCopyRichHtmlToClipboard = async () => {
    const previewClient = allClubClients.find(c => selectedCampaignClientIds.includes(c.id)) || bulkCampaignRecipients[0] || allClubClients[0];
    if (!previewClient) {
      alert('Por favor seleccione al menos un socio comercial de la lista para previsualizar y copiar el diseño gráfico.');
      return;
    }

    const fullHtml = compileHtmlTemplate(previewClient, bulkEmailText, designerAccentColor);

    try {
      const blobHtml = new Blob([fullHtml], { type: 'text/html' });
      const changePct = (previewClient.percentChange || 0) * 100;
      const changeStr = changePct < 0 ? `${changePct.toFixed(0)}%` : `+${changePct.toFixed(0)}%`;

      const resolvedPlaintext = bulkEmailText
        .replace(/\{\{NOMBRE\}\}/g, previewClient.name || 'Doctor/a')
        .replace(/\{\{CLINICA\}\}/g, previewClient.clinica || previewClient.clinic || 'su Centro Clínico')
        .replace(/\{\{CATEGORIA_2026\}\}/g, previewClient.calculatedTier?.name || previewClient.category2026 || 'Socio Especial')
        .replace(/\{\{VARIACION_VENTAS\}\}/g, changeStr)
        .replace(/\{\{BENEFICIO_PRINCIPAL\}\}/g, previewClient.calculatedTier?.primaryBenefit || 'beneficios preferentes del Club');

      const blobText = new Blob([resolvedPlaintext], { type: 'text/plain' });

      if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText
          })
        ]);
        alert('📋 ¡Diseño Gráfico (HTML Enriquecido) copiado al portapapeles! Ahora vaya a Thunderbird u Outlook, inicie el mensaje y presione Pegar (Ctrl+V) en el cuerpo del correo. Se insertará el diseño idéntico al de la previsualización (con logo, colores, columnas e imágenes).');
      } else {
        await navigator.clipboard.writeText(resolvedPlaintext);
        alert('📋 Copiado en texto plano debido a restricciones del navegador.');
      }
    } catch (err: any) {
      console.error('Error copying Rich HTML:', err);
      alert('No se pudo copiar como diseño gráfico automáticamente. Intente seleccionar el contenido visual de la derecha directamente, presionar Ctrl+C y luego pegar en su correo.');
    }
  };

  // Copy full raw HTML code of active campaign to clipboard
  const handleCopyRawHtmlToClipboard = async () => {
    const previewClient = allClubClients.find(c => selectedCampaignClientIds.includes(c.id)) || bulkCampaignRecipients[0] || allClubClients[0];
    if (!previewClient) {
      alert('Por favor seleccione al menos un socio comercial de la lista para previsualizar y copiar el código.');
      return;
    }

    const fullHtml = compileHtmlTemplate(previewClient, bulkEmailText, designerAccentColor);

    try {
      await navigator.clipboard.writeText(fullHtml);
      alert('💻 ¡Código Fuente HTML copiado al portapapeles! En Thunderbird, vaya a "Insertar" -> "HTML" y pegue este código para cargar el diseño gráfico con exactitud matemática.');
    } catch (err: any) {
      console.error('Error copying Raw HTML:', err);
      alert('No se pudo copiar el código HTML.');
    }
  };

  // Generate Group Campaign templates with Gemini IA
  const handleGenerateGroupCampaignIA = async () => {
    if (selectedCampaignClientIds.length === 0) {
      alert('Por favor seleccione al menos un socio veterinario para la campaña masiva.');
      return;
    }
    setIsGeneratingBulk(true);
    
    // Resolve clean display name for selected campaign objective
    const objectiveText = campaignObjective === 'pertenencia_categoria_intranet' ? 'Pertenencia a Categoría e Intranet (Vademécum y Fichas)' :
                          campaignObjective === 'subir_categoria_incentivo' ? 'Estímulo para Subir de Categoría (Upgrade)' :
                          campaignObjective === 'envio_gratis_promocion' ? 'Promoción Envío Gratis Sin Mínimo' :
                          campaignObjective === 'intranet_sin_compra_orientacion' ? 'Activos en Intranet Sin Compra (Asesoría)' :
                          campaignObjective === 'reactivacion_gracia' ? 'Plazo de Gracia Especial (30 Días de Beneficios con Var. Caída)' :
                          campaignObjective === 'alianza_comercial' ? 'Alianza Preferencial CIMASUR (Análisis de Categoría 2026)' :
                          campaignObjective === 'descuento_excepcional' ? 'Descuento del 15% Excepcional en la Próxima Reposición' :
                          'Invitación a Testeo Sin Costo de la Nueva Línea de Alérgenos';

    const userMsg = `Quiero iniciar una campaña masiva. Por favor genera los mejores textos de email y whatsapp integrados para los destinatarios seleccionados. 
Objetivo comercial de la campaña: "${objectiveText}". 
Instrucciones estratégicas adicionales: "${campaignPrompt || 'Ninguna (Usa el mejor copywriting amigable e influyente de CIMASUR)'}"`;

    // Add immediate action log in chat history
    const userLabel = `⚡ Generación de Campaña IA:\n🎯 Objetivo: ${objectiveText}\n✏ Instrucciones: ${campaignPrompt || 'Ninguna'}`;
    const updatedHistory = [...chatHistory, { sender: 'user' as const, text: userLabel }];
    setChatHistory(updatedHistory);

    try {
      const response = await fetch('/api/ai/converse-bulk-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatHistory: updatedHistory,
          currentEmailSubject: bulkEmailSubject,
          currentEmailText: bulkEmailText,
          currentWhatsAppText: bulkWhatsAppText,
          userMessage: userMsg,
          image: uploadedImageB64,
          imageMimeType: uploadedImageMime,
          currentDesignerTitle: designerTitle,
          currentDesignerSubtitle: designerSubtitle,
          currentDesignerAccentColor: designerAccentColor
        })
      });
      
      if (!response.ok) {
        throw new Error('Fallo al conectar con el servidor del Copiloto IA.');
      }
      
      const data = await response.json();
      if (data) {
        setChatHistory(prev => [...prev, { sender: 'ia' as const, text: data.reply || 'He procesado e incorporado la nueva propuesta comercial a las plantillas.' }]);
        if (data.updatedEmailSubject) setBulkEmailSubject(data.updatedEmailSubject);
        if (data.updatedEmailText) setBulkEmailText(data.updatedEmailText);
        if (data.updatedWhatsAppText) setBulkWhatsAppText(data.updatedWhatsAppText);
        if (data.updatedDesignerTitle) setDesignerTitle(data.updatedDesignerTitle);
        if (data.updatedDesignerSubtitle) setDesignerSubtitle(data.updatedDesignerSubtitle);
        if (data.updatedDesignerAccentColor) setDesignerAccentColor(data.updatedDesignerAccentColor);
        
        // Reset inputs and focus on email view tab
        handleClearUploadedImage();
        setCampaignPrompt('');
        setPreviewTab('email');
      }
    } catch (e: any) {
      console.warn("Utilizando generador local de CIMASUR debido a la falta de GEMINI_API_KEY en el servidor:", e);
      setUsingLocalFallback(true);

      let localEmailSubject = '';
      let localEmailText = '';
      let localWhatsAppText = '';
      
      if (campaignObjective === 'pertenencia_categoria_intranet') {
        localEmailSubject = 'Estatus Oficial Club CIMASUR: Tu Categoría {{CATEGORIA_2026}} y Acceso exclusivo a Intranet';
        localEmailText = `Estimada Dra. {{NOMBRE}},\n\nEsperamos que tenga una excelente jornada en {{CLINICA}}.\n\nQueremos informarle oficialmente que pertenece a la prestigiosa categoría {{CATEGORIA_2026}} en nuestro Club de Socios CIMASUR, lo que le otorga soporte farmacéutico prioritario y condiciones comerciales exclusivas para sus recetas.\n\nLe recordamos con gran entusiasmo que cuenta con acceso totalmente activo a nuestra Intranet de Socios, diseñada especialmente para profesionales de la salud animal. En ella, usted puede revisar de forma directa:\n- Fichas técnicas detalladas de nuestras formulaciones magistrales.\n- Vademécum completo de productos oficiales de CIMASUR.\n- Monografías clínicas y protocolos para patologías complejas.\n- Herramientas de dosificación asistida para nuestras fórmulas.\n\n¿Ha podido explorar su cuenta o prefiere que le brindemos una breve inducción para aprovechar al máximo estos recursos?\n\nQuedamos a su entero servicio,\nFernanda Contreras\nFidelización y Relaciones Clínicas\nCIMASUR - Chile`;
        localWhatsAppText = `¡Estimada Dra. {{NOMBRE}}! 🌸 Un gran saludo de parte del equipo de Fidelización de CIMASUR.\n\nQueremos informarle que actualmente se encuentra activa en la categoría *{{CATEGORIA_2026}}* de nuestro Club de Socios, gozando de todos sus beneficios asociados. 🩺✨\n\nLe recordamos además que tiene habilitada nuestra *Intranet Exclusiva*, donde puede descargar de forma gratuita el Vademécum completo de productos, fichas técnicas y protocolos clínicos para patologías veterinarias. 💻📚\n\n¿Le gustaría que le enviemos un enlace directo de acceso rápido o requiere asistencia? ¡Estamos listos para apoyarle! 🥰`;
      } else if (campaignObjective === 'subir_categoria_incentivo') {
        localEmailSubject = '¡Estás muy cerca de subir de categoría! Desbloquea mayores beneficios en el Club CIMASUR';
        localEmailText = `Estimada Dra. {{NOMBRE}},\n\nLe enviamos un afectuoso saludo de parte del equipo comercial de CIMASUR. Esperamos que todo marche excelente en {{CLINICA}}.\n\nAl revisar el estatus de su cuenta, nos alegra ver su continuo compromiso con la terapia homeopática de sus pacientes. Queremos informarle que se encuentra a un paso muy corto de ascender de categoría en nuestro Club de Socios. Al subir de categoría, desbloqueará de forma inmediata beneficios mejorados como:\n- Descuentos fijos más altos en todas sus reposiciones.\n- Despachos express gratuitos y prioritarios en todo Chile.\n- Acceso anticipado a lotes limitados y fórmulas magistrales exclusivas.\n- Soporte personalizado directo con nuestro laboratorio.\n\nPara impulsarle a lograr este upgrade en su próximo ciclo de compras, le hemos asignado un cupón preferente y facilidades excepcionales para reabastecer sus productos favoritos de alta rotación.\n\n¿Le gustaría conversar sobre la brecha exacta de compras para su upgrade y cómo podemos ayudarle a alcanzarla de forma óptima?\n\nCordialmente,\nFernanda Contreras\nDepartamento de Cuentas y Fidelización\nCIMASUR - Chile`;
        localWhatsAppText = `¡Estimada Dra. {{NOMBRE}}! 🚀 ¿Cómo está? Le escribimos con excelentes noticias desde CIMASUR. Al revisar su actividad en {{CLINICA}}, notamos que está súper cerca de subir de categoría en nuestro Club de Socios. ⭐✨\n\nEste ascenso le dará derecho a mayores descuentos, prioridad máxima de laboratorio y despachos totalmente gratuitos.\n\nPara ayudarle a conseguir este upgrade, le ofrecemos facilidades en su próxima reposición de fórmulas magistrales. ¿Le gustaría saber la brecha exacta de compras y coordinar una propuesta sugerida hoy? ¡Un gran abrazo! 🩺🌸`;
      } else if (campaignObjective === 'envio_gratis_promocion') {
        localEmailSubject = 'Beneficio Exclusivo Club CIMASUR: Envío gratis sin mínimo de compra para {{CLINICA}}';
        localEmailText = `Estimada Dra. {{NOMBRE}},\n\nJunto con saludarle con el cariño de siempre de parte del equipo de Farmacias Homeopáticas CIMASUR, esperamos que tenga una fantástica semana en su clínica {{CLINICA}}.\n\nPara agradecer su lealtad profesional y asegurar que sus pacientes cuenten siempre con sus tratamientos a tiempo, nos complace informarle que hemos activado un beneficio especial en su cuenta de socio:\n\n*ENVÍO TOTALMENTE GRATUITO SIN MÍNIMO DE COMPRA EN SU PRÓXIMA REPOSICIÓN*\n\nEste beneficio es ideal para reabastecer de forma inmediata aquellas fórmulas homeopáticas que sus pacientes necesitan con urgencia, ya sean productos de alta rotación o fórmulas magistrales, sin preocuparse por los costos de flete o montos mínimos de despacho.\n\n¿Desea que le ayudemos a ingresar un pedido rápido con despacho gratuito garantizado para despacho inmediato?\n\nAtentamente,\nFernanda Contreras\nÁrea de Fidelización de Socios\nCIMASUR - Chile`;
        localWhatsAppText = `¡Estimada Dra. {{NOMBRE}}! 🚚✨ ¡Excelentes noticias de CIMASUR! Queremos informarle que hemos activado en su cuenta un beneficio de *Despacho Totalmente Gratis Sin Mínimo de Compra* para su clínica {{CLINICA}}.\n\nIdeal para reponer con total tranquilidad aquellas fórmulas homeopáticas prioritarias de sus pacientes. 🌸🩺\n\n¿Le ayudamos a preparar un pedido express para enviarlo hoy mismo sin costos adicionales? ¡Escríbanos o responda este mensaje! 🥰`;
      } else if (campaignObjective === 'intranet_sin_compra_orientacion') {
        localEmailSubject = 'Bienvenida a la Intranet CIMASUR: ¿Le gustaría recibir orientación de uso o conocer beneficios de una primera compra?';
        localEmailText = `Estimada Dra. {{NOMBRE}},\n\nLe enviamos un afectuoso saludo de bienvenida en nombre de todo el equipo clínico de CIMASUR. Esperamos que todo marche de forma espectacular en {{CLINICA}}.\n\nNos hemos percatado con agrado de que se encuentra activa y registrada en nuestra Intranet de Socios, explorando nuestras herramientas digitales y material científico. ¡Ese es un excelente primer paso para incorporar la medicina homeopática de alta calidad en sus pacientes!\n\nComo sabemos lo valioso que es su tiempo, queríamos preguntarle:\n¿Le gustaría recibir una breve orientación personalizada por teléfono o WhatsApp para conocer el uso clínico de nuestras fórmulas?\n\nAdemás, queremos informarle que los socios que realizan su primera compra en CIMASUR cuentan con grandes beneficios exclusivos de bienvenida:\n- 15% de descuento directo de bienvenida en su primer pedido de reabastecimiento.\n- Despacho prioritario sin costo a su clínica.\n- Envío de un Kit de Vademécum Físico de regalo para su consulta.\n\nEstaremos encantados de resolver sus dudas sobre dosificaciones o protocolos terapéuticos.\n\nAtentamente,\nFernanda Contreras\nDepartamento de Relaciones Clínicas y Fidelización\nCIMASUR - Chile`;
        localWhatsAppText = `¡Estimada Dra. {{NOMBRE}}! 🩺✨ Le saluda Fernanda de CIMASUR. Nos hemos percatado con mucha alegría que ya está activa y explorando nuestra *Intranet de Socios* de CIMASUR. ¡Bienvenida! 💻🌿\n\nComo sabemos que está conociendo nuestras fórmulas veterinarias, nos encantaría apoyarle: ¿Le gustaría recibir una breve orientación telefónica o resolver dudas sobre dosificaciones o patologías?\n\nRecuerde que para su primera compra de bienvenida tiene un *15% de descuento especial*, despacho gratis y el Vademécum Físico de regalo para su clínica en {{CLINICA}}. 🎁🌸 ¿Conversamos?`;
      } else if (campaignObjective === 'reactivacion_gracia') {
        localEmailSubject = '¡Importante!: Prórroga extraordinaria de recalificación CIMASUR 2026';
        localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nEsperamos de todo corazón que se encuentre muy bien en su clínica {{CLINICA}}.\n\nEn CIMASUR valoramos profundamente el bienestar de sus pacientes y el lazo profesional que nos une. Entendiendo la dinámica laboral de los veterinarios y que sus reposiciones clínicas han tenido variaciones, queremos confirmarle una excelente noticia: le hemos otorgado una Prórroga Excepcional de Recalificación hasta el 30 de Junio de 2026.\n\nGracias a esta medida, usted conservará todos los beneficios exclusivos de la categoría {{CATEGORIA_2026}} sin ninguna alteración. Además, para apoyarle a mantener su stock clínico ideal, le ofrecemos:\n- Despacho gratuito en su próximo pedido.\n- Prioridad de entrega en 24-48 horas hábiles en todo Chile.\n- Muestras clínicas gratuitas en compras seleccionadas.\n\n¿Le gustaría que coordinemos su próximo reabastecimiento con despacho prioritario?\n\nAtentamente,\nFernanda Contreras\nDepartamento de Relaciones Clínicas y Fidelización\nCIMASUR - Chile`;
        localWhatsAppText = `¡Hola, Dr/a. {{NOMBRE}}! 🌸 Le saluda Fernanda de CIMASUR. Esperamos que tenga una provechosa jornada clínica en {{CLINICA}}.\n\nQueremos confirmarle que, para resguardar su importante labor y mantener sus beneficios preferenciales de la categoría {{CATEGORIA_2026}} en nuestro Club de Socios, le hemos activado una *Prórroga Excepcional de Recalificación hasta el 30 de Junio*. 🩺✨\n\nPodrá seguir solicitando sus reposiciones de nuestras fórmulas magistrales con despacho gratis garantizado y soporte prioritario.\n\n¿Desea que le ayudemos a coordinar un despacho sugerido para esta semana? ¡Escríbanos o responda por esta vía! Un afectuoso saludo. 🥰🏥`;
      } else if (campaignObjective === 'descuento_excepcional') {
        localEmailSubject = 'Beneficio Especial de Reposición: 15% Descuento Excepcional en CIMASUR';
        localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nEsperamos que tenga una excelente semana en {{CLINICA}}.\n\nQueremos informarle que, como parte de los beneficios de la categoría {{CATEGORIA_2026}} en nuestro Club de Socios, le hemos activado un cupón de descuento excepcional del 15% de descuento para su próximo pedido de reabastecimiento.\n\nEste beneficio es ideal para renovar su stock de nuestras fórmulas de alta rotación.\n\n¿Le ayudamos a preparar un pedido sugerido con despacho preferente hoy?\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
        localWhatsAppText = `¡Estimado/a Dr/a. {{NOMBRE}}! ✨ Un afectuoso saludo de parte del equipo CIMASUR. Esperamos que esté teniendo una excelente semana en {{CLINICA}}.\n\nComo socio de la categoría {{CATEGORIA_2026}}, le ofrecemos un *Descuento Excepcional del 15%* en su próximo pedido de reposición, ideal para reabastecer sus fórmulas de alta rotación.\n\n¿Le ayudamos a preparar un pedido sugerido con despacho preferente? ¡Un gran abrazo! 🩺`;
      } else {
        localEmailSubject = 'Estatus de Beneficios Club CIMASUR para Dr/a. {{NOMBRE}}';
        localEmailText = `Estimado/a Doctor/a {{NOMBRE}},\n\nJunto con saludarle afectuosamente en nombre de todo el equipo de Farmacia Homeopática CIMASUR de Chile, le escribimos para agradecer su constante confianza en nuestras fórmulas magistrales homeopáticas en {{CLINICA}}.\n\nQueremos recordarle que actualmente se encuentra activo en la categoría {{CATEGORIA_2026}} del Club de Socios, lo que le garantiza soporte prioritario, stock reservado y excelentes condiciones de compra.\n\nSi necesita asesoría técnica en la dosificación de nuestras fórmulas para alguno de sus pacientes, recuerde que nuestro equipo clínico está siempre disponible para asistirle sin costo.\n\n¿Le ayudamos a coordinar su pedido de reposición semanal para mantener su farmacia al día?\n\nAtentamente,\nFernanda Contreras\nCIMASUR - Chile`;
        localWhatsAppText = `¡Estimado/a Dr/a. {{NOMBRE}}! 🌸 Le saluda Fernanda de CIMASUR. Esperamos que tenga una provechosa jornada en {{CLINICA}}.\n\nQueremos agradecer su confianza continua en nuestras soluciones homeopáticas. Actualmente cuenta con estatus activo en la categoría *{{CATEGORIA_2026}}* de nuestro Club de Socios.\n\nRecuerde que ante cualquier duda con recetas o dosificaciones, nuestro equipo clínico está para apoyarle. ¿Desea realizar alguna reposición para esta semana? ¡Que tenga un excelente día! 🩺`;
      }
      
      setBulkEmailSubject(localEmailSubject);
      setBulkEmailText(localEmailText);
      setBulkWhatsAppText(localWhatsAppText);
      
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'ia' as const,
          text: `¡Listo! He configurado de manera local plantillas premium perfectamente personalizadas para su campaña masiva en base al objetivo "${objectiveText}". ¡Están listas en el panel para ser revisadas y despachadas de forma automática!`
        }
      ]);
      setPreviewTab('email');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // Run Bulk Email Dispatch using Real SMTP connection
  const handleSendBulkEmailCampaign = async () => {
    if (selectedCampaignClientIds.length === 0) {
      alert('Debe tener al menos un socio seleccionado para iniciar la campaña.');
      return;
    }
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      alert('Por favor configure y verifique sus credenciales SMTP antes de realizar envíos reales.');
      return;
    }

    const confirmed = window.confirm(`¿Está seguro de que desea despachar de forma masiva este correo electrónico con diseño gráfico a los ${selectedCampaignClientIds.length} socios seleccionados utilizando su cuenta real ${smtpUser}?`);
    if (!confirmed) return;

    setIsBulkSending(true);
    setBulkProgress(0);
    setBulkResults([]);

    const targets = allClubClients.filter(c => selectedCampaignClientIds.includes(c.id));
    const emailsPayload = [];

    for (const client of targets) {
      const changePct = (client.percentChange || 0) * 100;
      const changeStr = changePct < 0 ? `${changePct.toFixed(0)}%` : `+${changePct.toFixed(0)}%`;
      
      const resolvedSubject = bulkEmailSubject
        .replace(/\{\{NOMBRE\}\}/g, client.name || 'Doctor/a')
        .replace(/\{\{CLINICA\}\}/g, client.clinica || 'Centro Clínico')
        .replace(/\{\{CATEGORIA_2026\}\}/g, client.calculatedTier?.name || 'Socio Especial');

      const htmlBody = compileHtmlTemplate(client, bulkEmailText, designerAccentColor);
      
      const plainBody = bulkEmailText
        .replace(/\{\{NOMBRE\}\}/g, client.name || 'Doctor/a')
        .replace(/\{\{CLINICA\}\}/g, client.clinica || 'Centro Clínico')
        .replace(/\{\{CATEGORIA_2026\}\}/g, client.calculatedTier?.name || 'Socio Especial')
        .replace(/\{\{VARIACION_VENTAS\}\}/g, changeStr)
        .replace(/\{\{BENEFICIO_PRINCIPAL\}\}/g, client.calculatedTier?.primaryBenefit || 'Beneficios preferenciales');

      emailsPayload.push({
        to: client.email,
        subject: resolvedSubject,
        text: plainBody,
        html: htmlBody,
        clientId: client.id,
        clientName: client.name
      });
    }

    try {
      const res = await fetch('/api/mail/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            smtpServer: smtpHost,
            smtpPort: smtpPort,
            smtpUser: smtpUser,
            smtpPass: smtpPass,
            nombre: smtpSenderName
          },
          emails: emailsPayload
        })
      });

      let responseData;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        responseData = await res.json();
      } else {
        const textResponse = await res.text();
        throw new Error(`El servidor devolvió un error inesperado (posible timeout de red o puertos SMTP bloqueados). Status: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        throw new Error(responseData?.error || 'Fallo general en la pasarela SMTP.');
      }
      const resultsMap = responseData.results || [];
      
      const finalResults = [];
      const stampDate = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});

      for (let i = 0; i < emailsPayload.length; i++) {
        const item = emailsPayload[i];
        const statusReport = resultsMap.find((r: any) => r.email === item.to) || { status: 'error', error: 'Sin respuesta' };
        
        const success = statusReport.status === 'success';
        finalResults.push({
          name: item.clientName,
          email: item.to,
          status: success ? 'success' as const : 'error' as const,
          error: statusReport.error
        });

        // Update unified local logs in DB
        const stamp = `[${stampDate} - Campaña Email Masivo]: Despachado vía SMTP Propio con éxito. Asunto: "${item.subject}".`;
        const targetClient = targets.find(t => t.id === item.clientId);
        if (targetClient && success) {
          const currentHist = targetClient.historialUnificado || '';
          const updatedHist = currentHist ? `${stamp}\n${currentHist}` : stamp;
          
          await localDB.updateInCollection('contacts', targetClient.id, {
            ultimoCorreo: stampDate,
            historialUnificado: updatedHist
          });
        }
      }

      setBulkResults(finalResults);
      saveSmtpSettings(smtpHost, smtpPort, smtpUser, smtpPass, smtpSenderName);
      window.dispatchEvent(new Event('db-change'));
      alert('¡Campaña masiva ejecutada! Revise el panel de control de envíos para ver los resultados.');

    } catch (err: any) {
      console.error(err);
      alert('Fallo catastrófico al enviar campaña: ' + err.message);
    } finally {
      setIsBulkSending(false);
    }
  };

  // Download complete bulk WhatsApp payload in structured CSV for broadcast tools
  const handleDownloadWhatsAppCSV = async () => {
    if (selectedCampaignClientIds.length === 0) {
      alert('Por favor seleccione al menos un socio.');
      return;
    }
    
    const targets = allClubClients.filter(c => selectedCampaignClientIds.includes(c.id));
    let csvContent = "data:text/csv;charset=utf-8,Nombre;Telefono;MensajePersonalizado\n";
    
    const stampDate = new Date().toLocaleDateString('es-CL') + ' ' + new Date().toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'});

    for (const client of targets) {
      const changePct = (client.percentChange || 0) * 100;
      const changeStr = changePct < 0 ? `${changePct.toFixed(0)}%` : `+${changePct.toFixed(0)}%`;
      
      const resolvedWhatsApp = bulkWhatsAppText
        .replace(/\{\{NOMBRE\}\}/g, client.name || 'Doctor/a')
        .replace(/\{\{CLINICA\}\}/g, client.clinica || 'Centro Clínico')
        .replace(/\{\{CATEGORIA_2026\}\}/g, client.calculatedTier?.name || 'Socio Especial')
        .replace(/\{\{VARIACION_VENTAS\}\}/g, changeStr)
        .replace(/\{\{BENEFICIO_PRINCIPAL\}\}/g, client.calculatedTier?.primaryBenefit || 'Beneficios preferenciales');

      // Escaping semicolons and newlines
      const escapedMsg = resolvedWhatsApp.replace(/"/g, '""').replace(/\n/g, ' ');
      csvContent += `"${client.name}";"${client.phone}";"${escapedMsg}"\n`;

      // Update unified local logs in DB
      const stamp = `[${stampDate} - Campaña WhatsApp Masiva]: Descargado en CSV para despacho masivo. Mensaje: "${resolvedWhatsApp.substring(0, 100)}..."`;
      const currentHist = client.historialUnificado || '';
      const updatedHist = currentHist ? `${stamp}\n${currentHist}` : stamp;
      
      await localDB.updateInCollection('contacts', client.id, {
        ultimoWhatsapp: stampDate,
        historialUnificado: updatedHist
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campana_whatsapp_${campaignObjective}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.dispatchEvent(new Event('db-change'));
    alert(`¡CSV de campaña masiva de WhatsApp descargado con éxito! Se ha registrado el despacho en la bitácora de actividad de los ${targets.length} socios seleccionados.`);
  };

  const handleSelectAllCampaignClients = () => {
    setSelectedCampaignClientIds(bulkCampaignRecipients.map(c => c.id));
  };

  const handleSelectNoneCampaignClients = () => {
    setSelectedCampaignClientIds([]);
  };

  // Stats calculation
  const statsSummary = useMemo(() => {
    const total = criticalClients.length;
    const critico = criticalClients.filter(c => c.statusKey === 'CRITICO').length;
    const dormido = criticalClients.filter(c => c.statusKey === 'DORMIDO').length;
    const perdida = criticalClients.filter(c => c.statusKey === 'EN_CAIDA').length;
    return { total, critico, dormido, perdida };
  }, [criticalClients]);

  return (
    <div id="recuperacion_socios_criticos_container" className="space-y-6 text-slate-100">
      
      {/* 1. HEADER SECTION */}
      <div id="recuperacion_header" className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0d162d] border border-sky-500/15 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-500/15 p-2 rounded-xl border border-red-500/30">
              <Shield className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              Motor de Recuperación de Socios Críticos 👑
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Identificación inmediata de médicos veterinarios CIMASUR con compras en caída, alertas de fuga o inactividad prolongada. Diseñe, evalúe y optimice campañas de fidelización directa vía WhatsApp y Correo.
          </p>
        </div>
        
        {/* Quick Stats Panel */}
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="bg-[#090f1d] px-4 py-3 rounded-xl border border-red-500/25 text-center min-w-[90px]">
            <span className="text-2xl font-mono font-black text-red-400">{statsSummary.critico}</span>
            <span className="text-[9px] block text-slate-400 font-bold uppercase mt-0.5">Riesgo Crítico</span>
          </div>
          <div className="bg-[#090f1d] px-4 py-3 rounded-xl border border-yellow-500/25 text-center min-w-[90px]">
            <span className="text-2xl font-mono font-black text-yellow-400">{statsSummary.dormido}</span>
            <span className="text-[9px] block text-slate-400 font-bold uppercase mt-0.5">Dormidos</span>
          </div>
          <div className="bg-[#090f1d] px-4 py-3 rounded-xl border border-rose-500/25 text-center min-w-[90px]">
            <span className="text-2xl font-mono font-black text-rose-400">{statsSummary.perdida}</span>
            <span className="text-[9px] block text-slate-400 font-bold uppercase mt-0.5">En Caída</span>
          </div>
        </div>
      </div>

      {/* NEW SIDEBAR-BASED CONTENT WORKSPACE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: MODULE NAVIGATION (3 COLS) */}
        <div className="xl:col-span-3 bg-[#0d162d] p-5 rounded-2xl border border-sky-500/10 space-y-6">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block mb-3">
              Módulos Estratégicos
            </span>
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('oportunidades')}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${activeTab === 'oportunidades' ? 'bg-sky-500 text-slate-900 font-black shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:text-white bg-[#070b16] border border-slate-800'}`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className={`w-4 h-4 ${activeTab === 'oportunidades' ? 'text-slate-900' : 'text-yellow-400 group-hover:animate-pulse'}`} />
                  <span>Oportunidades</span>
                </div>
                {criticalClients.length > 0 && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'oportunidades' ? 'bg-slate-900 text-sky-400' : 'bg-red-500/20 text-red-400'}`}>
                    {criticalClients.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${activeTab === 'dashboard' ? 'bg-sky-500 text-slate-900 font-black shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:text-white bg-[#070b16] border border-slate-800'}`}
              >
                <BarChart2 className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-slate-900' : 'text-sky-450'}`} />
                <span>Dashboard Ejecutivo</span>
              </button>

              <button
                onClick={() => setActiveTab('individual')}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${activeTab === 'individual' ? 'bg-sky-500 text-slate-900 font-black shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:text-white bg-[#070b16] border border-slate-800'}`}
              >
                <Users className={`w-4 h-4 ${activeTab === 'individual' ? 'text-slate-900' : 'text-sky-450'}`} />
                <span>Cartera & Fichas</span>
              </button>

              <button
                onClick={() => setActiveTab('tiers')}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${activeTab === 'tiers' ? 'bg-sky-500 text-slate-900 font-black shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:text-white bg-[#070b16] border border-slate-800'}`}
              >
                <Award className={`w-4 h-4 ${activeTab === 'tiers' ? 'text-slate-900' : 'text-yellow-450'}`} />
                <span>Club Categorías</span>
              </button>

              <button
                onClick={() => setActiveTab('masivo')}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${activeTab === 'masivo' ? 'bg-sky-500 text-slate-900 font-black shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:text-white bg-[#070b16] border border-slate-800'}`}
              >
                <Sparkles className={`w-4 h-4 ${activeTab === 'masivo' ? 'text-slate-900' : 'text-sky-400 animate-pulse'}`} />
                <span>Campañas & Marketing IA</span>
              </button>
            </nav>
          </div>

          {/* Quick Informative Info Block */}
          <div className="bg-[#070b16] p-4 rounded-xl border border-slate-800 text-[11px] leading-relaxed text-slate-450 space-y-2.5">
            <span className="font-extrabold text-white text-xs block uppercase tracking-wider">Reglas Comerciales 2026</span>
            <p>
              🛡️ <strong className="text-slate-300">Categoría 2025:</strong> Es la que se respeta para el ciclo comercial <strong className="text-yellow-400">2026 (Vigente)</strong>.
            </p>
            <p>
              📈 <strong className="text-slate-300">Categoría 2026:</strong> Sirve para predeterminar el estatus comercial en el ciclo <strong className="text-purple-400">2027 (Proyectado)</strong>.
            </p>
            <p>
              🕒 <strong className="text-slate-300">Plazo Extraordinario:</strong> Se puede otorgar prórroga excepcional de recalificación hasta el <strong className="text-emerald-400">30 de Junio</strong> de cada año.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: DYNAMIC WORKSPACE CONTENT (9 COLS) */}
        <div className="xl:col-span-9 space-y-6">

          {activeTab === 'oportunidades' && (
            <div className="bg-[#0d162d] p-6 rounded-2xl border border-sky-500/10 space-y-6">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-850 pb-4">
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 animate-pulse" />
                    <span>Oportunidades Comerciales & Alertas Algorítmicas 🎯</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Análisis de brechas comerciales por ciclo, prórrogas de recalificación y estímulos de ascenso de categoría en CIMASUR.
                  </p>
                </div>
                
                {/* View Switcher segment controller */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    onClick={() => setOpportunityViewType('alertas')}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1.5 border ${opportunityViewType === 'alertas' ? 'bg-red-500/10 border-red-500/35 text-red-400' : 'bg-[#070b16] border-slate-850 text-slate-400 hover:text-white'}`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Alertas de Retención ({criticalClients.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      setOpportunityViewType('upgrades');
                      setUpgradeSegmentFilter('bronce_oro');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1.5 border ${opportunityViewType === 'upgrades' && upgradeSegmentFilter === 'bronce_oro' ? 'bg-yellow-500/10 border-yellow-500/35 text-yellow-400' : 'bg-[#070b16] border-slate-850 text-slate-400 hover:text-white'}`}
                  >
                    <Award className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Objetivo: Bronce ➔ Oro ({allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'bronce').length})</span>
                  </button>
                  <button
                    onClick={() => {
                      setOpportunityViewType('upgrades');
                      setUpgradeSegmentFilter('plata_platinum');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1.5 border ${opportunityViewType === 'upgrades' && upgradeSegmentFilter === 'plata_platinum' ? 'bg-purple-500/10 border-purple-500/35 text-purple-400' : 'bg-[#070b16] border-slate-850 text-slate-400 hover:text-white'}`}
                  >
                    <Award className="w-3.5 h-3.5 text-purple-400" />
                    <span>Objetivo: Plata ➔ Platinum ({allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'plata').length})</span>
                  </button>
                </div>
              </div>

              {/* Explanatory cards depending on view mode */}
              {opportunityViewType === 'alertas' ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#070b16] p-4 rounded-xl border border-slate-850">
                  <div className="text-xs text-slate-400 font-medium">
                    Mostrando socios comerciales con inactividad, inactividad prolongada o compras caídas de -50% o más.
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Filtro Alerta:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-[#0d162d] border border-slate-800 text-[11px] rounded-xl px-3.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500/40"
                    >
                      <option value="ALL">Todas las Alertas ({criticalClients.length})</option>
                      <option value="CRITICO">Riesgo Crítico ({criticalClients.filter(c => c.statusKey === 'CRITICO').length})</option>
                      <option value="DORMIDO">Dormidos ({criticalClients.filter(c => c.statusKey === 'DORMIDO').length})</option>
                      <option value="EN_CAIDA">En Caída ({criticalClients.filter(c => c.statusKey === 'EN_CAIDA').length})</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="bg-sky-500/5 border border-sky-500/15 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      <span>{upgradeSegmentFilter === 'bronce_oro' ? 'Campaña de Estímulo: Bronce ➔ Oro' : 'Campaña de Estímulo: Plata ➔ Platinum'}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                      {upgradeSegmentFilter === 'bronce_oro' 
                        ? 'Socios en nivel Bronce ($500K - $1.99M). Impúlselos a alcanzar un total de $5.000.000 acumulado este ciclo para obtener los beneficios preferenciales de la categoría ORO.'
                        : 'Socios en nivel Plata ($2M - $4.99M). Impúlselos a alcanzar un total de $12.000.000 acumulado para obtener estatus PLATINUM y liberar despachos gratis ilimitados.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCampaignObjective(upgradeSegmentFilter === 'bronce_oro' ? 'upgrade_bronce_oro' : 'upgrade_plata_platinum');
                      setRecipientFilterSegment(upgradeSegmentFilter === 'bronce_oro' ? 'bronce_to_gold' : 'silver_to_platinum');
                      setActiveTab('masivo');
                    }}
                    className="bg-sky-500 hover:bg-sky-450 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs shrink-0 flex items-center gap-2 transition-all shadow-md shadow-sky-500/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Preparar Campaña Grupal ({upgradeCandidates.length})</span>
                  </button>
                </div>
              )}

              {/* Table rendering the analytical views */}
              <div className="overflow-x-auto rounded-xl border border-slate-850 bg-[#070b16]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#090f1d] border-b border-slate-800 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider">
                      <th className="p-4">Cliente Veterinario</th>
                      <th className="p-4 text-right">Facturación 2026</th>
                      <th className="p-4 text-center">Estatus Actual</th>
                      <th className="p-4 text-center">Meta Propuesta</th>
                      <th className="p-4">Brecha Comercial</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {opportunityViewType === 'alertas' ? (
                      filteredClients.map((client) => {
                        const sales = client.ventas || { v2024: 0, v2025: 0, v2026: 0 };
                        const v2025 = Number(sales.v2025 || 0);
                        const v2026 = Number(sales.v2026 || 0);
                        
                        const diff = v2026 - v2025;
                        const percent = v2025 > 0 ? (diff / v2025) * 100 : 0;
                        
                        const currentTier = client.calculatedTier || TIERS_DEFAULT[0];
                        const currentTierIdx = tiersList.findIndex(t => t.name === currentTier.name);
                        const nextTier = currentTierIdx < tiersList.length - 1 ? tiersList[currentTierIdx + 1] : currentTier;
                        
                        let brechaText = '';
                        let brechaGoalColor = 'text-yellow-400';
                        
                        if (v2026 < currentTier.min) {
                          const gapToMaintain = currentTier.min - v2026;
                          brechaText = `${formatCLP(gapToMaintain)} para mantener ${currentTier.name}`;
                          brechaGoalColor = 'text-rose-400';
                        } else {
                          const gapToAscend = nextTier.min - v2026;
                          if (gapToAscend > 0 && nextTier.name !== currentTier.name) {
                            brechaText = `${formatCLP(gapToAscend)} para ascender a ${nextTier.name}`;
                            brechaGoalColor = 'text-sky-400';
                          } else {
                            brechaText = `Meta alcanzada (${currentTier.name})`;
                            brechaGoalColor = 'text-emerald-400';
                          }
                        }

                        let suggestedAction = 'Ofrecer prórroga excepcional de recalificación';
                        if (client.statusKey === 'CRITICO') {
                          suggestedAction = 'Llamada urgente: Ofrecer prórroga hasta 30 Junio';
                        } else if (client.statusKey === 'DORMIDO') {
                          suggestedAction = 'Masivo de reactivación y despacho gratis';
                        } else if (client.statusKey === 'EN_CAIDA') {
                          suggestedAction = 'Ofrecer Kit Modulador Digestivo o Acqua Maris';
                        }

                        return (
                          <tr key={client.id} className="hover:bg-sky-500/5 transition-all">
                            <td className="p-4">
                              <div className="font-extrabold text-white text-xs">{client.clinica}</div>
                              <div className="text-[10.5px] text-slate-400 font-medium">{client.name}</div>
                              <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">{client.rut}</div>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-white">
                              {formatCLP(v2026)}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center gap-1 font-mono font-black px-1.5 py-0.5 rounded text-[10.5px] ${diff >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {diff >= 0 ? '+' : ''}{formatCLP(diff)} ({percent.toFixed(0)}%)
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-slate-350 font-bold block">{currentTier.name}</span>
                            </td>
                            <td className="p-4">
                              <span className={`font-mono font-bold text-[11px] ${brechaGoalColor} block`}>
                                {brechaText}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => {
                                  setSelectedClientId(client.id);
                                  setActiveTab('individual');
                                }}
                                className="bg-sky-500/15 hover:bg-sky-500 text-sky-400 hover:text-slate-900 border border-sky-500/30 font-black px-3 py-1.5 rounded-xl text-[10.5px] transition-all flex items-center justify-center gap-1.5 mx-auto shadow-sm"
                              >
                                <Send className="w-3 h-3" />
                                <span>Cargar</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : upgradeCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-bold font-sans text-xs">
                          No se encontraron socios en la categoría actual {upgradeSegmentFilter === 'bronce_oro' ? 'Bronce' : 'Plata'} con brechas activas.
                        </td>
                      </tr>
                    ) : (
                      upgradeCandidates.map((client) => {
                        const sales = client.ventas || { v2024: 0, v2025: 0, v2026: 0 };
                        const v2026 = Number(sales.v2026 || 0);
                        
                        const targetTierObj = tiersList.find(t => t.name === (upgradeSegmentFilter === 'bronce_oro' ? 'Oro' : 'Platinum')) || TIERS_DEFAULT[3];
                        const targetMin = targetTierObj.min;
                        const gap = targetMin - v2026;
                        
                        const currentTier = client.calculatedTier || TIERS_DEFAULT[1];
                        
                        return (
                          <tr key={client.id} className="hover:bg-sky-500/5 transition-all">
                            <td className="p-4">
                              <div className="font-extrabold text-white text-xs">{client.clinica}</div>
                              <div className="text-[10.5px] text-slate-400 font-medium">{client.name}</div>
                              <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">{client.rut}</div>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-white">
                              {formatCLP(v2026)}
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-slate-300 font-bold block bg-slate-850 px-2.5 py-1 rounded-lg text-[10px] w-fit mx-auto border border-slate-800">
                                {currentTier.name}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-sky-400 font-bold block bg-sky-500/10 px-2.5 py-1 rounded-lg text-[10px] w-fit mx-auto border border-sky-500/20">
                                Meta: {targetTierObj.name} ({formatCLP(targetMin)})
                              </span>
                            </td>
                            <td className="p-4">
                              {gap <= 0 ? (
                                <span className="text-emerald-400 font-black text-[11px] flex items-center gap-1 leading-none">
                                  <Check className="w-3.5 h-3.5 shrink-0" /> ¡Meta Alcanzada!
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-yellow-400 font-mono font-bold text-[11px] block leading-none">
                                    Faltan: {formatCLP(gap)}
                                  </span>
                                  <span className="text-[9.5px] text-slate-500 block leading-none font-medium">
                                    para estatus {targetTierObj.name}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => {
                                    setSelectedClientId(client.id);
                                    setChannel('whatsapp');
                                    setCampaignObjective(upgradeSegmentFilter === 'bronce_oro' ? 'upgrade_bronce_oro' : 'upgrade_plata_platinum');
                                    setActiveTab('individual');
                                  }}
                                  className="bg-sky-500/15 hover:bg-sky-500 text-sky-400 hover:text-slate-900 border border-sky-500/30 font-black px-2.5 py-1.5 rounded-xl text-[10.5px] transition-all flex items-center gap-1 shadow-sm"
                                  title="Preparar mensaje individual para este socio"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Cargar</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setCampaignObjective(upgradeSegmentFilter === 'bronce_oro' ? 'upgrade_bronce_oro' : 'upgrade_plata_platinum');
                                    setRecipientFilterSegment(upgradeSegmentFilter === 'bronce_oro' ? 'bronce_to_gold' : 'silver_to_platinum');
                                    setActiveTab('masivo');
                                  }}
                                  className="bg-purple-500/15 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/30 font-black px-2.5 py-1.5 rounded-xl text-[10.5px] transition-all flex items-center gap-1 shadow-sm"
                                  title="Preparar campaña masiva para este segmento"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>Masivo</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0d162d] p-5 rounded-2xl border border-sky-500/10">
                  <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider mb-1">Socios Críticos Activos</span>
                  <div className="text-2xl font-mono font-black text-rose-400">{criticalClients.length}</div>
                  <p className="text-[9.5px] text-slate-500 mt-1">Con caídas de ventas de -50% o más</p>
                </div>
                <div className="bg-[#0d162d] p-5 rounded-2xl border border-sky-500/10">
                  <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider mb-1">Facturación Consolidada 2026</span>
                  <div className="text-2xl font-mono font-black text-white">
                    {formatCLP(clients.reduce((acc, c) => acc + Number(c.ventas?.v2026 || 0), 0))}
                  </div>
                  <p className="text-[9.5px] text-slate-500 mt-1">Suma acumulada del ciclo corriente</p>
                </div>
                <div className="bg-[#0d162d] p-5 rounded-2xl border border-sky-500/10">
                  <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider mb-1">Tasa de Fidelización</span>
                  <div className="text-2xl font-mono font-black text-emerald-400">76.8%</div>
                  <p className="text-[9.5px] text-slate-500 mt-1">Retención efectiva histórica</p>
                </div>
                <div className="bg-[#0d162d] p-5 rounded-2xl border border-sky-500/10">
                  <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider mb-1">Prórrogas Sugeridas</span>
                  <div className="text-2xl font-mono font-black text-yellow-400">
                    {criticalClients.filter(c => (c.ventas?.v2026 || 0) < (c.calculatedTier?.min || 0)).length}
                  </div>
                  <p className="text-[9.5px] text-slate-500 mt-1">Aptos para plazo de gracia hasta junio</p>
                </div>
              </div>

              {/* Progress Distributions */}
              <div className="bg-[#0d162d] p-6 rounded-2xl border border-sky-500/10 space-y-4">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider block">Distribución de Socios en Tiers</h3>
                <div className="space-y-4">
                  {tiersList.map((tier, idx) => {
                    const count = clients.filter(c => {
                      const sales = c.ventas?.v2025 || 0;
                      return sales >= tier.min && sales <= tier.max;
                    }).length;
                    const percent = clients.length > 0 ? (count / clients.length) * 100 : 0;

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-350">{tier.name}</span>
                          <span className="text-white">{count} socios ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-[#070b16] rounded-full overflow-hidden border border-slate-850">
                          <div className={`h-full bg-gradient-to-r ${tier.color.includes('platinum') ? 'from-purple-500 to-indigo-500' : tier.color.includes('oro') ? 'from-amber-400 to-yellow-500' : tier.color.includes('plata') ? 'from-slate-400 to-slate-200' : 'from-amber-600 to-amber-800'} transition-all`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strategic Tips Panel */}
              <div className="bg-[#0d162d] p-6 rounded-2xl border border-sky-500/10 space-y-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider block">Recomendaciones del Motor IA</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300">
                  <div className="bg-[#070b16] p-4 rounded-xl border border-slate-800">
                    <strong className="text-white block mb-1">⏳ Prórroga de Recalificación Directa:</strong>
                    Los clientes críticos muestran $0 en compras durante 2026, lo que arriesga su pérdida de categoría para 2027. Al concederles prórroga excepcional por email masivo, mantendrán su beneficio Oro o Platinum, incentivándolos a retomar órdenes.
                  </div>
                  <div className="bg-[#070b16] p-4 rounded-xl border border-slate-800">
                    <strong className="text-white block mb-1">💊 Promociones en Fórmulas Clave:</strong>
                    Filtra y destaca muestras gratis o descuentos en nuestras líneas principales (antiinflamatorio veterinario de alta rotación) en tus copys de WhatsApp.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="bg-[#0d162d] p-6 rounded-2xl border border-sky-500/10 space-y-6">
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span>Configuración del Club Categorías CIMASUR® 🏆</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Rangos de facturación consolidada de ciclos y beneficios vigentes configurados en el sistema de fidelización de médicos veterinarios de Chile.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tiersList.map((tier, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border bg-gradient-to-br ${tier.color}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">NIVEL</span>
                        <h4 className="text-sm font-extrabold text-white">{tier.name}</h4>
                      </div>
                      <span className="font-mono text-[9px] font-black bg-slate-900/80 px-2 py-0.5 rounded text-slate-300 uppercase border border-slate-700/50">
                        {tier.min === 0 ? 'Sin mínimo' : `Min: ${formatCLP(tier.min)}`}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs leading-relaxed text-slate-300">
                      <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/40">
                        <strong className="text-white block text-[9px] uppercase font-black tracking-wider text-slate-400 mb-0.5">Beneficio Principal</strong>
                        <p className="font-extrabold text-yellow-400">{tier.primaryBenefit}</p>
                      </div>
                      
                      <div className="pt-1.5">
                        <strong className="text-white text-[9px] uppercase font-black tracking-wider block mb-1">Beneficios del Vademécum</strong>
                        <ul className="list-disc list-inside space-y-1 font-medium text-slate-300 text-[11px]">
                          {tier.benefits.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'individual' && (
            /* 2. MAIN WORKSPACE GRID (INDIVIDUAL) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CLIENT LIST (SPAN 5) */}
        <div id="clients_critical_list_section" className="lg:col-span-5 bg-[#0d162d] border border-sky-500/10 p-4 rounded-2xl flex flex-col h-[740px]">
          
          <div className="space-y-3 mb-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Socios con Alerta ({filteredClients.length})</span>
            </h2>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                id="critical_client_search"
                type="text"
                placeholder="Buscar por Nombre, RUT o Clínica..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#070b16] border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-sky-500/50 placeholder-slate-600 transition-all"
              />
            </div>

            {/* Quick Status Pill Filters */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                id="filter_btn_all"
                onClick={() => setStatusFilter('ALL')}
                className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${statusFilter === 'ALL' ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'bg-[#070b16] text-slate-450 border-slate-800 hover:text-slate-300'}`}
              >
                Todos ({criticalClients.length})
              </button>
              <button
                id="filter_btn_critico"
                onClick={() => setStatusFilter('CRITICO')}
                className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${statusFilter === 'CRITICO' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-[#070b16] text-slate-450 border-slate-800 hover:text-slate-350'}`}
              >
                Riesgo Crítico ({criticalClients.filter(c => c.statusKey === 'CRITICO').length})
              </button>
              <button
                id="filter_btn_dormido"
                onClick={() => setStatusFilter('DORMIDO')}
                className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${statusFilter === 'DORMIDO' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' : 'bg-[#070b16] text-slate-450 border-slate-800 hover:text-slate-350'}`}
              >
                Dormidos ({criticalClients.filter(c => c.statusKey === 'DORMIDO').length})
              </button>
              <button
                id="filter_btn_caida"
                onClick={() => setStatusFilter('EN_CAIDA')}
                className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${statusFilter === 'EN_CAIDA' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-[#070b16] text-slate-450 border-slate-800 hover:text-slate-350'}`}
              >
                En Caída ({criticalClients.filter(c => c.statusKey === 'EN_CAIDA').length})
              </button>
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredClients.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl bg-[#090f1d]/55">
                <Users className="w-8 h-8 text-slate-700 mb-2" />
                <span className="text-xs text-slate-500 font-bold">No se encontraron socios críticos</span>
                <span className="text-[10px] text-slate-600 mt-1">Intente cambiar el filtro o la búsqueda</span>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = client.id === selectedClientId;
                const changePct = client.percentChange * 100;
                
                return (
                  <div
                    key={client.id}
                    id={`client_card_${client.id}`}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-sky-500/10 border-sky-500 shadow-md shadow-sky-500/5' : 'bg-[#090f1d] border-slate-800/65 hover:border-slate-700'}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="text-xs font-black text-white truncate block" title={client.name}>
                          {client.name}
                        </span>
                        <span className="text-[10px] text-slate-450 block truncate font-medium" title={client.clinica}>
                          {client.clinica}
                        </span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded border leading-none font-extrabold shrink-0 ${client.statusColor}`}>
                        {client.statusLabel}
                      </span>
                    </div>

                    {/* Category for 2026 based on 2025 sales */}
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] text-slate-300">
                      <Award className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>
                        Categoría 2026: <strong className="text-white">{client.calculatedTier?.name || 'Sin Categoría'}</strong>
                      </span>
                    </div>

                    {/* Grid displaying 2024, 2025, 2026 Sales */}
                    <div className="bg-[#050914] p-2 rounded-lg border border-slate-850/80 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div>
                        <span className="text-slate-500 block text-[9px] font-bold">2024</span>
                        <span className="font-mono font-semibold text-slate-400">{formatCLP(client.ventas?.v2024 || 0)}</span>
                      </div>
                      <div className="border-l border-slate-800/65">
                        <span className="text-slate-400 block text-[9px] font-extrabold text-yellow-500">2025 (Ref)</span>
                        <span className="font-mono font-bold text-yellow-400">{formatCLP(client.ventas?.v2025 || 0)}</span>
                      </div>
                      <div className="border-l border-slate-800/65">
                        <span className="text-slate-400 block text-[9px] font-bold">2026 (Act)</span>
                        <span className="font-mono font-extrabold text-white">{formatCLP(client.ventas?.v2026 || 0)}</span>
                      </div>
                    </div>

                    {/* Sales decrease and trend line */}
                    <div className="mt-2.5 pt-1.5 border-t border-slate-850/40 flex justify-between items-center text-[10px]">
                      <div className="flex items-center gap-1 text-rose-400 font-bold">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Var. 2026 vs 2025:</span>
                      </div>
                      <span className="font-mono font-extrabold text-rose-450 text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        {changePct < 0 ? `${changePct.toFixed(0)}%` : changePct > 0 ? `+${changePct.toFixed(0)}%` : 'Sin compras'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE CAMPAIGN WORKSPACE (SPAN 7) */}
        <div id="campaign_builder_section" className="lg:col-span-7 bg-[#0d162d] border border-sky-500/10 p-5 rounded-2xl flex flex-col h-[740px] overflow-y-auto">
          
          {!selectedClient ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
              <div className="bg-sky-500/5 p-4 rounded-full border border-sky-500/10 mb-3 animate-pulse">
                <Sparkles className="w-10 h-10 text-sky-400" />
              </div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-widest">Diseñador y Evaluador de Campañas</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm">
                Seleccione un médico veterinario de la lista izquierda para iniciar el análisis estratégico de su perfil y generar un mensaje personalizado óptimo de recuperación.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Selected Doctor Summary Header */}
              <div className="p-4 rounded-xl bg-[#090f1d] border border-slate-850/60 space-y-3">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <span className="text-[9px] font-black uppercase text-sky-400 tracking-widest block">Socio Crítico Bajo Análisis</span>
                    <h3 className="text-base font-black text-white mt-1 leading-tight">{selectedClient.name}</h3>
                    <span className="text-[11px] text-slate-400 block">{selectedClient.clinica}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black border uppercase ${getTierBadgeClass(selectedClient.calculatedTier?.name)}`}>
                      Categoría 2026: {selectedClient.calculatedTier?.name || 'Sin Categoría'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-extrabold block">
                      Determinado por Ventas 2025
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2.5 border-t border-slate-800/50 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">RUT</span>
                    <span className="text-slate-300 font-mono font-bold block">{selectedClient.rut}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Comuna / Región</span>
                    <span className="text-slate-300 block truncate" title={selectedClient.region}>{selectedClient.region}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Último WhatsApp</span>
                    <span className="text-slate-300 font-mono block text-[10px]">{selectedClient.ultimoWhatsapp || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Último Correo</span>
                    <span className="text-slate-300 font-mono block text-[10px]">{selectedClient.ultimoCorreo || 'No registrado'}</span>
                  </div>
                </div>

                {/* Sales Comparison Block */}
                <div className="mt-3 bg-[#060a14] p-3 rounded-lg border border-slate-800/80 flex justify-between items-center text-center">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Ventas 2024</span>
                    <span className="text-xs font-mono font-black text-slate-400 block">${formatCLP(selectedClient.ventas?.v2024 || 0)}</span>
                  </div>
                  <div className="text-slate-700 font-bold">➔</div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Ventas 2025</span>
                    <span className="text-xs font-mono font-black text-slate-300 block">${formatCLP(selectedClient.ventas?.v2025 || 0)}</span>
                  </div>
                  <div className="text-slate-700 font-bold">➔</div>
                  <div>
                    <span className="text-[9px] text-rose-450 text-rose-400 uppercase block font-bold">Ciclo Actual (2026)</span>
                    <span className="text-xs font-mono font-black text-rose-400 block">${formatCLP(selectedClient.ventas?.v2026 || 0)}</span>
                  </div>
                  <div className="text-slate-700 font-bold">➔</div>
                  <div className="bg-red-500/10 px-2.5 py-1 rounded border border-red-500/20">
                    <span className="text-[8px] text-red-400 uppercase block font-extrabold">Fuga / Caída</span>
                    <span className="text-xs font-mono font-extrabold text-red-400 block">
                      {(selectedClient.percentChange * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Channel Selector Tab Pill & Prompt Panel */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider">Diseñador de Campaña Personalizada</span>
                  <div className="flex gap-1.5">
                    <button
                      id="channel_btn_whatsapp"
                      onClick={() => setChannel('whatsapp')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${channel === 'whatsapp' ? 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30' : 'bg-[#090f1d] text-slate-450 border-slate-800'}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Directo</span>
                    </button>
                    <button
                      id="channel_btn_email"
                      onClick={() => setChannel('email')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${channel === 'email' ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'bg-[#090f1d] text-slate-450 border-slate-800'}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Correo Recomendado</span>
                    </button>
                  </div>
                </div>

                {/* Main Message Preview / Editor box */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <span>Edite libremente el mensaje generado o redacte una plantilla propia:</span>
                    <span className="font-mono text-slate-500">{messageText.length} caracteres</span>
                  </div>
                  <textarea
                    id="recovery_message_textarea"
                    rows={7}
                    placeholder={`Haga clic en 'Diseñar Mensaje con IA' para generar una propuesta personalizada redactada por Gemini según el estado actual del doctor/a, o comience a escribir...`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-850 rounded-xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500/50 placeholder-slate-650 leading-relaxed resize-none"
                  />
                  
                  {/* Generate Button Row */}
                  <div className="flex gap-2">
                    <button
                      id="generate_ai_draft_btn"
                      onClick={() => handleGenerateOrImproveMessage(false)}
                      disabled={isGenerating}
                      className="flex-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>{messageText ? 'Re-Generar Propuesta Inicial' : '⚡ Diseñar Mensaje Recomendado con IA'}</span>
                    </button>
                  </div>

                  {usingLocalFallback && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2 text-amber-400">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5 animate-pulse" />
                      <div className="text-[10px] font-bold leading-relaxed">
                        <span>Modo de contingencia local activo. Al no detectarse la clave <code>GEMINI_API_KEY</code> en el servidor, se ha utilizado el generador inteligente de CIMASUR en base al perfil real del socio.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Evaluation Metrics (only visible when evaluation is available) */}
                {evaluation && (
                  <motion.div
                    id="ai_evaluation_panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-[#0a101f] border border-sky-500/15 rounded-xl space-y-3"
                  >
                    <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Evaluación Estratégica del Mensaje (Gemini 3.5)
                    </span>

                    {/* Progress Bars for evaluation scores */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-bold">
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Personalización</span>
                          <span className="text-white font-mono">{evaluation.scorePersonalizacion}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${evaluation.scorePersonalizacion}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Empatía / Apoyo</span>
                          <span className="text-white font-mono">{evaluation.scoreTonoApoyo}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${evaluation.scoreTonoApoyo}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Llamado Acción</span>
                          <span className="text-white font-mono">{evaluation.scoreLlamadoAccion}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${evaluation.scoreLlamadoAccion}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Efectividad General</span>
                          <span className="text-white font-mono">{evaluation.scoreEfectividad}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-450 bg-sky-400" style={{ width: `${evaluation.scoreEfectividad}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Positive and Improvement bullet points */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800/60 text-[11px] leading-relaxed">
                      <div className="space-y-1">
                        <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Puntos Fuertes:
                        </span>
                        <ul className="list-disc list-inside text-slate-350 space-y-0.5">
                          {evaluation.positives.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sky-400 font-extrabold flex items-center gap-1">
                          <InfoIcon className="w-3.5 h-3.5" /> Aspectos Incorporados / Recomendaciones:
                        </span>
                        <ul className="list-disc list-inside text-slate-350 space-y-0.5">
                          {evaluation.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Improve Message Action Center (Refine) */}
                {messageText && (
                  <div className="p-3 bg-[#090f1d] border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">¿Evaluar y Mejorar esta versión?</span>
                    <div className="flex gap-2">
                      <input
                        id="improve_message_prompt_input"
                        type="text"
                        placeholder="Instrucciones ej: 'hazlo más cercano', 'menciona envíos gratis en la primera compra', 'ofrece 30 días de gracia'..."
                        value={improvePrompt}
                        onChange={(e) => setImprovePrompt(e.target.value)}
                        className="flex-1 bg-[#070b16] border border-slate-850 text-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-sky-500/40 placeholder-slate-600 transition-all"
                      />
                      <button
                        id="improve_message_btn"
                        onClick={() => handleGenerateOrImproveMessage(true)}
                        disabled={isGenerating || !improvePrompt.trim()}
                        className="bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Evaluar y Mejorar</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Dispatch & Send Action Block */}
                {messageText && (
                  <div className="pt-2 border-t border-slate-800/50 flex gap-3">
                    {channel === 'whatsapp' ? (
                      <button
                        id="dispatch_whatsapp_btn"
                        onClick={handleDispatchWhatsApp}
                        className="flex-1 bg-[#25D366] hover:bg-[#20ba59] text-black font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/10 transition-all"
                      >
                        <MessageSquare className="w-4 h-4 fill-current" />
                        <span>Enviar Mensaje por WhatsApp Directo</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        id="dispatch_email_btn"
                        onClick={handleDispatchEmail}
                        className="flex-1 bg-sky-500 hover:bg-sky-400 text-slate-900 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 transition-all"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Copiar Mensaje y Abrir Correo</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

              </div>

              {/* 3. COHESIVE HISTORIAL & MANUAL ACTIVITY LOG PANEL */}
              <div id="unified_history_panel" className="pt-4 border-t border-slate-800/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Notebook className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Historial de Actividades & Notas</h3>
                </div>

                {/* Add Custom Note block */}
                <div className="flex gap-2">
                  <textarea
                    id="manual_note_textarea"
                    rows={2}
                    placeholder="Escriba un comentario o nota de seguimiento comercial para agregar al historial de este socio..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 bg-[#070b16] border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/30 placeholder-slate-650 leading-relaxed resize-none font-sans"
                  />
                  <button
                    id="add_note_btn"
                    onClick={handleAddManualNote}
                    disabled={!newNote.trim()}
                    className="bg-[#111f38] hover:bg-[#1a2c4e] border border-slate-800 hover:border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-40 self-end"
                  >
                    Anotar
                  </button>
                </div>

                {/* Interactive Notes Feed */}
                <div className="bg-[#070b16] rounded-xl border border-slate-850 p-3 h-[180px] overflow-y-auto space-y-2.5 custom-scrollbar text-[11px] leading-relaxed">
                  {selectedClient.historialUnificado ? (
                    selectedClient.historialUnificado.split('\n').map((line, idx) => {
                      if (!line.trim()) return null;
                      
                      // Highlight dates and categories beautifully
                      const dateMatch = line.match(/^\[(.*?)\]/);
                      const displayDate = dateMatch ? dateMatch[1] : '';
                      const contentText = displayDate ? line.replace(`[${displayDate}]:`, '') : line;

                      return (
                        <div key={idx} className="p-2.5 rounded-lg bg-[#0d162d]/85 border border-slate-800/40 text-slate-300">
                          {displayDate && (
                            <span className="text-[10px] text-sky-400 font-mono font-bold block mb-1">
                              {displayDate}
                            </span>
                          )}
                          <p className="font-sans whitespace-pre-wrap">{contentText.trim()}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center">
                      <Notebook className="w-6 h-6 text-slate-700 mb-1" />
                      <span>No hay registros históricos en este socio comercial. Las campañas de WhatsApp y correo que envíe se registrarán aquí automáticamente.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
      )}

      {activeTab === 'masivo' && (
        /* 3. CAMPAÑAS MASIVAS WORKSPACE (MASIVO) */
        <div id="bulk_campaigns_workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
          
          {/* LEFT PANEL: RECIPIENT MANAGER (SPAN 4) */}
          <div className="lg:col-span-4 bg-[#0d162d] border border-sky-500/10 p-5 rounded-2xl flex flex-col h-[850px]">
            <div className="space-y-3 mb-4 shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Destinatarios ({selectedCampaignClientIds.length}/{bulkCampaignRecipients.length})</span>
                </h2>
                <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  Público Activo
                </span>
              </div>
              
              {/* Dynamic segment selector */}
              <div className="space-y-1 bg-[#070b16] p-2.5 rounded-xl border border-slate-850">
                <label className="text-[9px] uppercase font-extrabold text-slate-500 font-mono">Segmento Destinatario:</label>
                <select
                  value={recipientFilterSegment}
                  onChange={(e) => handleSegmentChange(e.target.value as any)}
                  className="w-full bg-[#0d162d] border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-sky-500/40 font-bold"
                >
                  <option value="critical">Alerta Retención Crítica ({criticalClients.length})</option>
                  <option value="intranet_sin_compras">
                    Prospectos Intranet (Sin Compra ni Categoría) ({allClubClients.filter(c => {
                      const isIntranet = (c.intranet || '').toLowerCase().startsWith('si') || (c.intranet || '').toLowerCase().startsWith('sí');
                      const tierName = (c.calculatedTier?.name || '').toLowerCase();
                      const dbCat = (c.categoria || '').toLowerCase();
                      const hasNoCategory = 
                        tierName.includes('sin') || 
                        tierName === '' ||
                        dbCat.includes('sin') || 
                        dbCat === '';
                      const noPurchases = (c.ventas?.v2026 || 0) === 0;
                      return isIntranet && (hasNoCategory || noPurchases);
                    }).length})
                  </option>
                  <option value="sin_categorias">Sin Categorías ({allClubClients.filter(c => ['sin categoría', 'sin categoria', ''].includes((c.calculatedTier?.name || '').toLowerCase())).length})</option>
                  <option value="bronce">Categoría: Bronce ({allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'bronce').length})</option>
                  <option value="plata">Categoría: Plata ({allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'plata').length})</option>
                  <option value="oro">Categoría: Oro ({allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'oro').length})</option>
                  <option value="platinum">Categoría: Platinum ({allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'platinum').length})</option>
                  <option value="bronce_to_gold">Estrategia: Bronce ➔ Oro ({allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'bronce').length})</option>
                  <option value="silver_to_platinum">Estrategia: Plata ➔ Platinum ({allClubClients.filter(c => (c.calculatedTier?.name || '').toLowerCase() === 'plata').length})</option>
                  <option value="all">Todo el Club ({allClubClients.length})</option>
                </select>
              </div>
              
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Seleccione de forma quirúrgica a qué socios desea dirigir la campaña masiva. Por defecto los socios del segmento seleccionado están pre-seleccionados.
              </p>

              {/* Quick Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por Nombre, RUT o Clínica..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#070b16] border border-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-sky-500/50 placeholder-slate-650"
                />
              </div>

              {/* Toggle actions */}
              <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-800/40">
                <span className="text-slate-500 font-bold">Selección Rápida:</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllCampaignClients}
                    className="text-sky-400 font-black hover:underline"
                  >
                    Seleccionar Todos
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    onClick={handleSelectNoneCampaignClients}
                    className="text-sky-500 font-black hover:underline hover:text-slate-450"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Recipient List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {bulkCampaignRecipients.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-850 bg-[#090f1d]/40 rounded-xl">
                  <Users className="w-8 h-8 text-slate-700 mb-2" />
                  <span className="text-xs text-slate-500 font-bold">No se encontraron socios</span>
                </div>
              ) : (
                bulkCampaignRecipients.map((client) => {
                  const isChecked = selectedCampaignClientIds.includes(client.id);
                  const changePct = client.percentChange * 100;
                  
                  return (
                    <div
                      key={client.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedCampaignClientIds(selectedCampaignClientIds.filter(id => id !== client.id));
                        } else {
                          setSelectedCampaignClientIds([...selectedCampaignClientIds, client.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex gap-3 items-start ${isChecked ? 'bg-sky-500/5 border-sky-500/35' : 'bg-[#090f1d] border-slate-850/70 hover:border-slate-800'}`}
                    >
                      {/* Checkbox input */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by outer container click
                        className="mt-1 h-3.5 w-3.5 accent-sky-500 cursor-pointer rounded border-slate-800 bg-[#070b16] text-sky-500"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-bold text-white truncate block">
                            {client.name}
                          </span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 border uppercase leading-none ${client.statusColor}`}>
                            {client.statusKey}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-450 block truncate font-medium">
                          {client.clinica}
                        </span>

                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-1.5">
                          <Award className="w-3 h-3 text-yellow-500 shrink-0" />
                          <span>Categoría 2026: <strong className="text-white">{client.calculatedTier?.name || 'Socio'}</strong></span>
                        </div>

                        {/* Drop indicators */}
                        <div className="flex justify-between items-center text-[9px] mt-1.5 pt-1.5 border-t border-slate-850/40 text-slate-500">
                          <span>Ref 2025: <strong className="text-slate-350">{formatCLP(client.ventas?.v2025 || 0)}</strong></span>
                          <span className="text-rose-400 font-extrabold font-mono shrink-0 bg-rose-500/10 px-1 py-0.5 rounded leading-none">
                            {changePct.toFixed(0)}% Var.
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected stats summary footer */}
            <div className="mt-4 p-3 bg-[#070b16] border border-slate-850 rounded-xl shrink-0">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Resumen de Destinatarios</span>
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-xs text-slate-300">Socios Seleccionados:</span>
                <span className="text-sm font-mono font-black text-white">{selectedCampaignClientIds.length} / {bulkCampaignRecipients.length}</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: EMAIL CAMPAIGN DESKTOP ENGINE (SPAN 8) */}
          <div className="lg:col-span-8 space-y-6 max-h-[850px] overflow-y-auto pr-1 custom-scrollbar">
            
            {/* COPILOTO DE MARKETING IA CONVERSACIONAL */}
            <div className="bg-[#090f1d] border border-sky-500/20 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-500/15 p-2 rounded-xl border border-indigo-500/30">
                  <MessageSquare className="w-4 h-4 text-sky-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Chat Copiloto de Marketing IA CIMASUR 💬</span>
                    <span className="text-[9px] bg-sky-500/20 text-sky-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">En Tiempo Real</span>
                  </h3>
                  <p className="text-[11px] text-slate-450">
                    Sintoniza los copys masivos conversando con la IA. Las plantillas se actualizan instantáneamente abajo.
                  </p>
                </div>
              </div>

              {/* Chat history list */}
              <div className="bg-[#070b16] rounded-xl border border-slate-800 p-4 h-[240px] overflow-y-auto space-y-3 custom-scrollbar text-xs leading-relaxed">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3.5 rounded-2xl max-w-[85%] font-sans ${msg.sender === 'user' ? 'bg-sky-500 text-slate-900 font-bold rounded-tr-none' : 'bg-[#0d162d] border border-slate-800 text-slate-350 rounded-tl-none'}`}>
                      <strong className={`block text-[9px] uppercase tracking-wider mb-1 ${msg.sender === 'user' ? 'text-slate-800' : 'text-sky-400'}`}>
                        {msg.sender === 'user' ? 'Tú (Administrador)' : 'Copiloto de Marketing IA'}
                      </strong>
                      <p className="whitespace-pre-wrap text-slate-300 font-medium">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input section with attachment and previews */}
              <div className="space-y-3.5">
                {uploadedImageB64 && (
                  <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 animate-fadeIn">
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-700 bg-black shrink-0">
                      <img src={uploadedImageB64} alt="Diseño de campaña" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={handleClearUploadedImage}
                        className="absolute top-0.5 right-0.5 bg-red-600/90 hover:bg-red-700 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px]"
                        title="Eliminar imagen"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 text-[11px]">
                      <span className="font-bold text-white block truncate">{uploadedFileName}</span>
                      <span className="text-slate-400 block font-medium">Diseño cargado. Dile a la IA qué ajustar (ej: "cambia la fecha de recalificación") y envía.</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5">
                  <label className="bg-[#070b16] hover:bg-slate-850 text-slate-400 hover:text-white p-3 rounded-xl cursor-pointer transition-all flex items-center justify-center shrink-0 border border-slate-800" title="Subir imagen/diseño de campaña">
                    <Paperclip className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>

                  <input
                    type="text"
                    placeholder={uploadedImageB64 ? "Dile a la IA qué cambiar en este diseño..." : "Dile a la IA qué mejorar (ej: 'agrega una prórroga de recalificación de aquí a junio de 2026')..."}
                    value={userChatMessage}
                    onChange={(e) => setUserChatMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                    className="flex-1 bg-[#070b16] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                  <button
                    onClick={handleSendChatMessage}
                    disabled={isSendingChatMessage || (!userChatMessage.trim() && !uploadedImageB64)}
                    className="bg-sky-500 hover:bg-sky-450 disabled:opacity-45 text-slate-900 font-black px-5 py-3 rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-sky-500/10 shrink-0"
                  >
                    {isSendingChatMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* SECTION 1: IA CAMPAIGN LOGIC GENERATOR */}
            <div className="bg-[#0d162d] border border-sky-500/15 p-5 rounded-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <div className="bg-sky-500/15 p-1.5 rounded-lg border border-sky-500/20">
                  <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Diseñador de Copys de Campaña con Inteligencia Artificial (Gemini)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Defina el objetivo estratégico de recuperación para que la IA unificada sintonice el texto y el diseño gráfico perfectos.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Objetivo Comercial de la Campaña</label>
                  <select
                    value={campaignObjective}
                    onChange={(e) => setCampaignObjective(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-800 text-slate-350 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-sky-500/40"
                  >
                    <option value="pertenencia_categoria_intranet">Pertenencia a Categoría e Intranet (Vademécum y Fichas)</option>
                    <option value="subir_categoria_incentivo">Estímulo para Subir de Categoría (Upgrade)</option>
                    <option value="envio_gratis_promocion">Promoción Envío Gratis Sin Mínimo</option>
                    <option value="intranet_sin_compra_orientacion">Activos en Intranet Sin Compra (Asesoría)</option>
                    <option value="reactivacion_gracia">Plazo de Gracia Especial (30 Días de Beneficios con Var. Caída)</option>
                    <option value="alianza_comercial">Alianza Preferencial CIMASUR (Análisis de Categoría 2026)</option>
                    <option value="descuento_excepcional">Descuento del 15% Excepcional en la Próxima Reposición</option>
                    <option value="nueva_linea">Invitación a Testeo Sin Costo de la Nueva Línea de Alérgenos</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Instrucciones Adicionales para la IA (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: 'usa un tono cercano y médico', 'menciona despacho gratis'..."
                    value={campaignPrompt}
                    onChange={(e) => setCampaignPrompt(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-800 text-slate-350 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-sky-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={handleLoadLocalTemplateDirectly}
                  disabled={selectedCampaignClientIds.length === 0}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  title="Carga la plantilla oficial redactada por expertos de forma instantánea sin usar IA ni requerir API Keys"
                >
                  <FileText className="w-4 h-4" />
                  <span>📋 Cargar Plantilla Oficial (Instantáneo, Sin IA)</span>
                </button>

                <button
                  onClick={handleGenerateGroupCampaignIA}
                  disabled={isGeneratingBulk || selectedCampaignClientIds.length === 0}
                  className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isGeneratingBulk ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gemini redactando propuesta...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ Generar Propuesta con IA (Requiere API Key)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* TABBED INTERACTION INTERFACE: EMAIL VIEW, WHATSAPP VIEW, CONFIG */}
            <div className="bg-[#0d162d] border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col animate-fadeIn">
              
              {/* Internal Tab Header */}
              <div className="bg-[#090f1d] border-b border-slate-850 p-2.5 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPreviewTab('email')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${previewTab === 'email' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/25' : 'text-slate-400 hover:text-slate-250 border border-transparent'}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>✉ DISEÑO DE CORREO GRÁFICO (HTML)</span>
                  </button>
                  <button
                    onClick={() => setPreviewTab('whatsapp')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${previewTab === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'text-slate-400 hover:text-slate-250 border border-transparent'}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>💬 DISEÑO DE MENSAJE WHATSAPP</span>
                  </button>
                </div>

                <button
                  onClick={() => setPreviewTab('config')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${previewTab === 'config' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25' : 'text-slate-400 hover:text-slate-250 border border-transparent'}`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>⚙ SMTP & AJUSTES VISUALES</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5 space-y-5">
                
                {/* 1. EMAIL CAMPAIGN TAB */}
                {previewTab === 'email' && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                    
                    {/* Left Column: Email Subject & Template Editor */}
                    <div className="xl:col-span-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Asunto de Campaña Masiva</label>
                          <input
                            type="text"
                            value={bulkEmailSubject}
                            onChange={(e) => setBulkEmailSubject(e.target.value)}
                            className="w-full bg-[#070b16] border border-slate-800 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-sky-500/40"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Cuerpo del Correo (Formato HTML)</label>
                          <textarea
                            rows={11}
                            value={bulkEmailText}
                            onChange={(e) => setBulkEmailText(e.target.value)}
                            className="w-full bg-[#070b16] border border-slate-800 text-slate-200 p-3.5 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500/30 leading-relaxed resize-none"
                          />
                        </div>

                        <div className="p-3 bg-sky-950/20 border border-sky-500/10 rounded-xl text-[10px] leading-relaxed text-slate-400 font-medium">
                          <strong className="text-white block mb-0.5">Autocompletado Dinámico de CIMASUR:</strong> Las etiquetas <span className="text-sky-400 font-bold">{"{{NOMBRE}}"}</span>, <span className="text-sky-400 font-bold">{"{{CLINICA}}"}</span>, <span className="text-sky-400 font-bold">{"{{CATEGORIA_2026}}"}</span> y <span className="text-sky-400 font-bold">{"{{BENEFICIO_PRINCIPAL}}"}</span> se inyectarán individualmente por cada socio de CIMASUR.
                        </div>
                      </div>

                      {/* Despatch trigger options */}
                      <div className="space-y-3 mt-4">
                        <button
                          onClick={handleOpenThunderbirdMailto}
                          disabled={selectedCampaignClientIds.length === 0}
                          className="w-full bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg shadow-blue-500/15"
                        >
                          <Send className="w-4 h-4" />
                          <span>📬 Abrir en Cliente de Correo Local (Thunderbird / Outlook) con BCC ({selectedCampaignClientIds.length} Socios)</span>
                        </button>

                        {/* Thunderbird Graphic HTML Helpers */}
                        <div className="bg-[#0b132b]/50 border border-blue-500/20 rounded-xl p-3.5 space-y-2 text-[10.5px]">
                          <p className="font-extrabold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                            <span>💡 ¿CÓMO ENVIAR EL DISEÑO GRÁFICO (CON LOGO Y FOTOS) EN THUNDERBIRD?</span>
                          </p>
                          <p className="text-slate-300 leading-relaxed">
                            Los enlaces de apertura automática como el de arriba solo transmiten texto plano por limitaciones externas del protocolo de Windows/macOS. Para que tu correo tenga el <strong>diseño gráfico oficial e idéntico de la derecha</strong>, presiona uno de estos botones y pégalo en tu Thunderbird:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCopyRichHtmlToClipboard}
                              disabled={selectedCampaignClientIds.length === 0}
                              className="bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 font-extrabold py-2 px-3 rounded-lg text-[9.5px] flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
                              title="Copia el correo formateado para pegarlo con Ctrl+V directamente en Thunderbird"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>📋 Copiar Diseño (Pega con Ctrl+V)</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyRawHtmlToClipboard}
                              disabled={selectedCampaignClientIds.length === 0}
                              className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 font-extrabold py-2 px-3 rounded-lg text-[9.5px] flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
                              title="Copia el código fuente HTML del diseño"
                            >
                              <Code className="w-3.5 h-3.5" />
                              <span>💻 Copiar Código Fuente HTML</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center my-2 select-none">
                          <div className="flex-grow border-t border-slate-800"></div>
                          <span className="text-[9px] text-slate-500 px-3 uppercase font-black tracking-widest">O enviar por SMTP en línea</span>
                          <div className="flex-grow border-t border-slate-800"></div>
                        </div>

                        <button
                          onClick={handleSendBulkEmailCampaign}
                          disabled={isBulkSending || selectedCampaignClientIds.length === 0}
                          className="w-full bg-[#070b16] hover:bg-slate-900 text-sky-400 border border-sky-500/30 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                        >
                          {isBulkSending ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Despachando Correos por SMTP...</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3.5 h-3.5" />
                              <span>🚀 Enviar vía Servidor SMTP Integrado ({selectedCampaignClientIds.length} Socios)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Right Column: High-fidelity Visual Preview */}
                    <div className="xl:col-span-7 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <span>Previsualización Gráfica para Socios</span>
                        {selectedCampaignClientIds.length > 0 && (
                          <span className="text-sky-400 font-extrabold">Vista de: {allClubClients.find(c => selectedCampaignClientIds.includes(c.id))?.name || 'Socio Comercial'}</span>
                        )}
                      </div>

                      {selectedCampaignClientIds.length === 0 ? (
                        <div className="h-[430px] border border-dashed border-slate-800 rounded-xl bg-[#070b16]/50 flex flex-col items-center justify-center text-center p-6">
                          <Mail className="w-8 h-8 text-slate-700 mb-2" />
                          <span className="text-xs text-slate-500 font-bold">Seleccione al menos un destinatario a la izquierda para generar la vista previa del correo.</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950 flex flex-col h-[430px] shadow-2xl">
                            {/* Emulated Outlook Toolbar */}
                            <div className="bg-[#111827] border-b border-slate-850 p-2 flex items-center justify-between text-[10px] text-slate-400 select-none shrink-0">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                                <span className="text-slate-500 ml-2 shrink-0">De:</span>
                                <span className="text-sky-400 font-bold shrink-0">CIMASUR Marketing</span>
                                <span className="text-slate-500 shrink-0">|</span>
                                <span className="text-slate-500 shrink-0">Asunto:</span>
                                <span className="text-white font-bold truncate max-w-[120px] md:max-w-[200px]">{bulkEmailSubject}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsLargePreviewOpen(true)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold rounded-md text-[9px] uppercase tracking-wider transition-all duration-200 cursor-pointer shadow hover:shadow-sky-500/10 active:scale-95 shrink-0"
                              >
                                <Maximize2 className="w-2.5 h-2.5" />
                                <span>Previsualizar en grande</span>
                              </button>
                            </div>
                            
                            <div className="flex-1 bg-white">
                              <iframe
                                title="Live Email Graphic Preview"
                                srcDoc={compileHtmlTemplate(
                                allClubClients.find(c => selectedCampaignClientIds.includes(c.id)) || bulkCampaignRecipients[0] || allClubClients[0], 
                                bulkEmailText, 
                                designerAccentColor
                              )}
                                className="w-full h-full border-0 bg-white"
                              />
                            </div>
                          </div>

                          {/* Estilo y Paleta de Colores */}
                          <div className="bg-[#091022] border border-slate-850 rounded-xl p-4 space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                              <Palette className="w-4 h-4 text-sky-400" />
                              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Ajustar Colores, Estilo de Plantilla e Identidad Visual</h4>
                            </div>

                            {/* Selector de Tipo de Plantilla / Diseño */}
                            <div className="space-y-1.5 border-b border-slate-800 pb-3">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Estilo de Diseño de Plantilla</label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEmailTemplateStyle('modern')}
                                  className={`px-3 py-2 rounded-lg text-[10px] font-extrabold border transition-all text-center flex flex-col justify-center items-center gap-1 ${emailTemplateStyle === 'modern' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow' : 'bg-[#070b16] border-slate-800 text-slate-400 hover:text-slate-200'}`}
                                >
                                  <span>✨ Moderno Premium</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEmailTemplateStyle('letter')}
                                  className={`px-3 py-2 rounded-lg text-[10px] font-extrabold border transition-all text-center flex flex-col justify-center items-center gap-1 ${emailTemplateStyle === 'letter' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow' : 'bg-[#070b16] border-slate-800 text-slate-400 hover:text-slate-200'}`}
                                >
                                  <span>📜 Carta Profesional</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEmailTemplateStyle('promotional')}
                                  className={`px-3 py-2 rounded-lg text-[10px] font-extrabold border transition-all text-center flex flex-col justify-center items-center gap-1 ${emailTemplateStyle === 'promotional' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow' : 'bg-[#070b16] border-slate-800 text-slate-400 hover:text-slate-200'}`}
                                >
                                  <span>🔥 Spotlight Promocional</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEmailTemplateStyle('custom')}
                                  className={`px-3 py-2 rounded-lg text-[10px] font-extrabold border transition-all text-center flex flex-col justify-center items-center gap-1 ${emailTemplateStyle === 'custom' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow' : 'bg-[#070b16] border-slate-800 text-slate-400 hover:text-slate-200'}`}
                                >
                                  <span>💻 Envoltura HTML Propia</span>
                                </button>
                              </div>
                            </div>

                            {/* Editor de Envoltura HTML */}
                            {emailTemplateStyle === 'custom' && (
                              <div className="space-y-1.5 bg-purple-950/10 border border-purple-500/20 rounded-xl p-3 animate-fadeIn">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] font-bold text-purple-400 uppercase">Editor de Código de Envoltura HTML</span>
                                  <span className="text-[8px] text-slate-500 italic">Inserte {"{{CONTENT}}"} para inyectar el cuerpo</span>
                                </div>
                                <textarea
                                  rows={6}
                                  value={customHtmlWrapper}
                                  onChange={(e) => setCustomHtmlWrapper(e.target.value)}
                                  className="w-full bg-[#04060d] border border-purple-900/30 text-purple-200 p-2.5 rounded-lg text-[10px] font-mono focus:outline-none focus:border-purple-500/50 leading-relaxed resize-none"
                                />
                                <div className="text-[8px] text-slate-400 leading-normal grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1">
                                  <span>• <code className="text-purple-400">{"{{CONTENT}}"}</code>: Cuerpo del correo</span>
                                  <span>• <code className="text-purple-400">{"{{ACCENT_COLOR}}"}</code>: Color acento</span>
                                  <span>• <code className="text-purple-400">{"{{TITLE}}"}</code>: Título de cabecera</span>
                                  <span>• <code className="text-purple-400">{"{{SUBTITLE}}"}</code>: Subtítulo de cabecera</span>
                                  <span>• <code className="text-purple-400">{"{{CLIENT_NAME}}"}</code>: Nombre de socio</span>
                                  <span>• <code className="text-purple-400">{"{{CLIENT_TIER}}"}</code>: Estatus o categoría</span>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Colores */}
                              <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Paleta de Colores (Personalizable)</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-450 font-bold block">Acento (Botón/Borde):</label>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="color"
                                        value={designerAccentColor}
                                        onChange={(e) => setDesignerAccentColor(e.target.value)}
                                        className="w-8 h-6 bg-transparent border border-slate-700 rounded cursor-pointer"
                                      />
                                      <span className="text-[10px] font-mono text-slate-300 font-bold">{designerAccentColor}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-450 font-bold block">Fondo de Correo:</label>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="color"
                                        value={designerBodyBgColor}
                                        onChange={(e) => setDesignerBodyBgColor(e.target.value)}
                                        className="w-8 h-6 bg-transparent border border-slate-700 rounded cursor-pointer"
                                      />
                                      <span className="text-[10px] font-mono text-slate-300 font-bold">{designerBodyBgColor}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-450 font-bold block">Fondo de Tarjeta:</label>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="color"
                                        value={designerCardBgColor}
                                        onChange={(e) => setDesignerCardBgColor(e.target.value)}
                                        className="w-8 h-6 bg-transparent border border-slate-700 rounded cursor-pointer"
                                      />
                                      <span className="text-[10px] font-mono text-slate-300 font-bold">{designerCardBgColor}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-450 font-bold block">Color de Texto:</label>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="color"
                                        value={designerTextColor}
                                        onChange={(e) => setDesignerTextColor(e.target.value)}
                                        className="w-8 h-6 bg-transparent border border-slate-700 rounded cursor-pointer"
                                      />
                                      <span className="text-[10px] font-mono text-slate-300 font-bold">{designerTextColor}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Combinaciones Rápidas:</span>
                                  <div className="flex flex-wrap gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDesignerAccentColor('#38bdf8');
                                        setDesignerBodyBgColor('#050914');
                                        setDesignerCardBgColor('#0d162d');
                                        setDesignerTextColor('#cbd5e1');
                                      }}
                                      className="px-2 py-0.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[9px] text-sky-400 font-bold rounded"
                                    >
                                      Dark Classic
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDesignerAccentColor('#0284c7');
                                        setDesignerBodyBgColor('#f8fafc');
                                        setDesignerCardBgColor('#ffffff');
                                        setDesignerTextColor('#334155');
                                      }}
                                      className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 text-[9px] text-sky-600 font-bold rounded"
                                    >
                                      Light Mode ☀
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDesignerAccentColor('#10b981');
                                        setDesignerBodyBgColor('#022c22');
                                        setDesignerCardBgColor('#064e3b');
                                        setDesignerTextColor('#e6fbf2');
                                      }}
                                      className="px-2 py-0.5 bg-[#022c22] border border-emerald-900 hover:border-emerald-800 text-[9px] text-emerald-400 font-bold rounded"
                                    >
                                      Mint Esmeralda 🌿
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDesignerAccentColor('#f59e0b');
                                        setDesignerBodyBgColor('#1c1917');
                                        setDesignerCardBgColor('#292524');
                                        setDesignerTextColor('#f5f5f4');
                                      }}
                                      className="px-2 py-0.5 bg-[#292524] border border-stone-850 hover:border-stone-800 text-[9px] text-amber-400 font-bold rounded"
                                    >
                                      Amber Cálido 🍂
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Identidad de Cabecera */}
                              <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Identidad de la Cabecera</span>
                                
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-450 font-bold block">Título Principal del Correo:</label>
                                  <input
                                    type="text"
                                    value={designerTitle}
                                    onChange={(e) => setDesignerTitle(e.target.value)}
                                    placeholder="Ej: CIMASUR®"
                                    className="w-full bg-[#070b16] border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:border-sky-500/30"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-450 font-bold block">Subtítulo de Cabecera:</label>
                                  <input
                                    type="text"
                                    value={designerSubtitle}
                                    onChange={(e) => setDesignerSubtitle(e.target.value)}
                                    placeholder="Ej: Farmacia Homeopática Veterinaria de Chile"
                                    className="w-full bg-[#070b16] border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-sky-500/30"
                                  />
                                </div>

                                <div className="space-y-1 mt-3">
                                  <label className="text-[9px] text-slate-450 font-bold block">Texto del Botón (CTA):</label>
                                  <input
                                    type="text"
                                    value={designerButtonText}
                                    onChange={(e) => setDesignerButtonText(e.target.value)}
                                    placeholder="Ej: Reclamar mi Beneficio Ahora ➔"
                                    className="w-full bg-[#070b16] border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:border-sky-500/30"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-450 font-bold block">Enlace del Botón (URL):</label>
                                  <input
                                    type="text"
                                    value={designerButtonUrl}
                                    onChange={(e) => setDesignerButtonUrl(e.target.value)}
                                    placeholder="Ej: https://cimasur.cl"
                                    className="w-full bg-[#070b16] border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-sky-500/30"
                                  />
                                </div>

                                <p className="text-[9px] text-slate-500 leading-relaxed pt-1">
                                  💡 <strong>Tip:</strong> Pruebe diferentes esquemas para coincidir con la identidad de marca o el objetivo de la campaña.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. WHATSAPP CAMPAIGN TAB */}
                {previewTab === 'whatsapp' && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 animate-fadeIn">
                    
                    {/* Left Column: WhatsApp Text, Template Editor & Individual Chat Dispatcher List */}
                    <div className="xl:col-span-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-[#25D366] uppercase tracking-wider block">Cuerpo del Mensaje WhatsApp</label>
                          <textarea
                            rows={8}
                            value={bulkWhatsAppText}
                            onChange={(e) => setBulkWhatsAppText(e.target.value)}
                            className="w-full bg-[#070b16] border border-slate-800 text-slate-200 p-3.5 rounded-xl text-xs font-sans focus:outline-none focus:border-[#25D366]/30 leading-relaxed resize-none"
                            placeholder="Mensaje de WhatsApp con etiquetas {{NOMBRE}}, {{CLINICA}}, etc."
                          />
                        </div>

                        {/* Interactive One-by-One Dispatcher List */}
                        <div className="bg-[#091022] border border-slate-850 rounded-xl p-3.5 space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <span className="text-[10px] font-black uppercase text-[#25D366] tracking-wider block">
                              💬 DESPACHO DIRECTO UNO POR UNO ({selectedCampaignClientIds.length})
                            </span>
                            <span className="text-[9px] bg-[#25D366]/10 text-[#25D366] font-bold px-2 py-0.5 rounded-full">
                              Progreso: {dispatchedWhatsAppIds.filter(id => selectedCampaignClientIds.includes(id)).length} / {selectedCampaignClientIds.length}
                            </span>
                          </div>

                          {selectedCampaignClientIds.length === 0 ? (
                            <p className="text-[10px] text-slate-500 text-center py-4 italic">
                              Seleccione socios a la izquierda para cargarlos en el despachador directo.
                            </p>
                          ) : (
                            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                              {allClubClients
                                .filter(client => selectedCampaignClientIds.includes(client.id))
                                .map((client) => {
                                  const isDispatched = dispatchedWhatsAppIds.includes(client.id);
                                  return (
                                    <div 
                                      key={client.id} 
                                      className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                                        isDispatched 
                                          ? 'bg-slate-900/40 border-emerald-950/30 opacity-70' 
                                          : 'bg-[#070b16] border-slate-850 hover:border-slate-800'
                                      }`}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10.5px] font-extrabold text-white truncate block">
                                            {client.name}
                                          </span>
                                          {isDispatched && (
                                            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-1 py-0.2 rounded flex items-center gap-0.5 shrink-0">
                                              <Check className="w-2.5 h-2.5" />
                                              Abierto
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[9.5px] text-slate-400 block truncate leading-tight">
                                          🏥 {client.clinica || client.clinic || 'Clínica Veterinaria'}
                                        </span>
                                        <span className="text-[8.5px] text-slate-500 block font-mono">
                                          📞 {client.phone || 'Sin Teléfono'}
                                        </span>
                                      </div>

                                      <button
                                        onClick={() => handleOpenIndividualWhatsApp(client.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[9.5px] font-extrabold flex items-center gap-1 transition-all active:scale-95 shrink-0 ${
                                          isDispatched
                                            ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-950/40'
                                            : 'bg-[#25D366] hover:bg-[#1fbe58] text-black font-extrabold shadow-lg shadow-emerald-500/5'
                                        }`}
                                        title={`Abrir chat directo para ${client.name}`}
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Abrir Chat</span>
                                      </button>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          <p className="text-[9px] text-slate-450 leading-relaxed pt-1 border-t border-slate-800/60">
                            💡 Al presionar <strong>"Abrir Chat"</strong> se abrirá una nueva pestaña con el mensaje 100% personalizado para ese socio y se registrará de inmediato en su historial clínico-comercial.
                          </p>
                        </div>
                      </div>

                      {/* Secondary CSV Download option as requested */}
                      <div className="pt-2">
                        <button
                          onClick={handleDownloadWhatsAppCSV}
                          disabled={selectedCampaignClientIds.length === 0}
                          className="w-full bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
                          title="Descargar padrón estructurado completo para herramientas externas de envío masivo"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar CSV como respaldo opcional ({selectedCampaignClientIds.length} Socios)</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Column: High-fidelity WhatsApp Cellphone Mockup */}
                    <div className="xl:col-span-7 space-y-2">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <span>Simulación en Teléfono Móvil</span>
                        {selectedCampaignClientIds.length > 0 && (
                          <span className="text-emerald-400 font-extrabold">Mensaje para: {allClubClients.find(c => selectedCampaignClientIds.includes(c.id))?.name || 'Socio'}</span>
                        )}
                      </div>

                      {selectedCampaignClientIds.length === 0 ? (
                        <div className="h-[430px] border border-dashed border-slate-800 rounded-xl bg-[#070b16]/50 flex flex-col items-center justify-center text-center p-6">
                          <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
                          <span className="text-xs text-slate-500 font-bold">Seleccione al menos un destinatario a la izquierda para generar la simulación de chat.</span>
                        </div>
                      ) : (
                        <div className="h-[430px] max-w-[320px] mx-auto border-4 border-slate-700 rounded-[2.5rem] overflow-hidden bg-[#0b141a] flex flex-col shadow-2xl relative">
                          {/* Phone Notch/Speaker */}
                          <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-slate-700 h-4 w-28 rounded-full z-20 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mr-2" />
                            <span className="w-8 h-1 rounded-full bg-slate-800" />
                          </div>

                          {/* WhatsApp Chat Header */}
                          <div className="bg-[#075e54] pt-6 pb-2.5 px-4 text-white flex items-center gap-2.5 shrink-0 select-none z-10">
                            <div className="w-8 h-8 rounded-full bg-[#128c7e] border border-[#25d366]/40 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                              {allClubClients.find(c => selectedCampaignClientIds.includes(c.id))?.name.substring(0, 2) || 'SO'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-extrabold block truncate leading-none mb-0.5">{allClubClients.find(c => selectedCampaignClientIds.includes(c.id))?.name || 'Socio Comercial'}</span>
                              <span className="text-[8.5px] text-[#25d366] font-bold block leading-none">En Línea</span>
                            </div>
                          </div>

                          {/* WhatsApp Chat Area Background with grid */}
                          <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end bg-[radial-gradient(#1e2428_1px,transparent_1px)] [background-size:16px_16px] relative">
                            
                            {/* WhatsApp Image Attachment Bubble (Diseño en Imagen) */}
                            {(() => {
                              const targetClient = allClubClients.find(c => selectedCampaignClientIds.includes(c.id)) || bulkCampaignRecipients[0] || allClubClients[0];
                              
                              return (
                                <div className="bg-[#056162]/40 border border-slate-800/40 p-1.5 rounded-xl max-w-[90%] self-end shadow-sm flex flex-col gap-1 text-[9px] text-slate-300">
                                  <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex flex-col">
                                    {/* Simulated Email Graphic Image Header */}
                                    <div 
                                      className="p-3 text-center relative flex flex-col justify-center items-center overflow-hidden"
                                      style={{ 
                                        background: `linear-gradient(135deg, ${designerCardBgColor} 0%, ${designerBodyBgColor} 100%)`,
                                        borderBottom: `2.5px solid ${designerAccentColor}`
                                      }}
                                    >
                                      {/* Miniature decorative gradient circle */}
                                      <span className="absolute -top-6 -right-6 w-12 h-12 rounded-full opacity-25" style={{ backgroundColor: designerAccentColor }}></span>
                                      
                                      <span className="text-[7px] font-black tracking-widest text-slate-400 block mb-1">CIMASUR COMUNICACIÓN</span>
                                      <h3 className="text-white text-xs font-black tracking-tight" style={{ color: '#ffffff' }}>{designerTitle}</h3>
                                      <p className="text-[8px] text-slate-400 font-medium leading-tight mt-0.5" style={{ color: '#94a3b8' }}>{designerSubtitle}</p>
                                    </div>

                                    {/* Simulated Email Graphic Image Body */}
                                    <div className="p-3 bg-slate-900/90 text-slate-200 space-y-2">
                                      {/* Name & Tier Banner */}
                                      <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-800">
                                        <div>
                                          <span className="text-[7px] text-slate-500 font-bold block uppercase leading-none">Veterinaria / Dra.</span>
                                          <span className="text-[8.5px] text-white font-extrabold leading-none block mt-0.5">{targetClient.name}</span>
                                        </div>
                                        <span 
                                          className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase"
                                          style={{ 
                                            backgroundColor: `${designerAccentColor}15`, 
                                            color: designerAccentColor,
                                            border: `1px solid ${designerAccentColor}30`
                                          }}
                                        >
                                          {targetClient.calculatedTier?.name || 'Socio'}
                                        </span>
                                      </div>

                                      {/* Template specific preview style mini card */}
                                      <div className="bg-[#050914] p-2 rounded border border-slate-850 space-y-1.5">
                                        <div className="flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: designerAccentColor }} />
                                          <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">
                                            Estilo: {emailTemplateStyle === 'modern' ? 'Moderno Premium' : emailTemplateStyle === 'letter' ? 'Carta Formal' : emailTemplateStyle === 'promotional' ? 'Spotlight Promocional' : 'HTML Custom'}
                                          </span>
                                        </div>
                                        <p className="text-[7.5px] text-slate-400 leading-relaxed font-sans line-clamp-3">
                                          {bulkEmailText
                                            .replace(/\{\{NOMBRE\}\}/g, targetClient.name || 'Doctor/a')
                                            .replace(/\{\{CLINICA\}\}/g, targetClient.clinica || 'Centro Clínico')
                                            .replace(/\{\{CATEGORIA_2026\}\}/g, targetClient.calculatedTier?.name || 'Socio Especial')
                                            .replace(/\{\{BENEFICIO_PRINCIPAL\}\}/g, targetClient.calculatedTier?.primaryBenefit || 'Beneficios preferentes')}
                                        </p>
                                      </div>

                                      {/* Showcase preview footer decoration */}
                                      <div className="flex justify-between items-center text-[7px] text-slate-500 font-bold border-t border-slate-800 pt-1.5 leading-none">
                                        <span>📧 Formato Email Diseñado</span>
                                        <span className="text-emerald-400">● Live Preview</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center px-1 text-[8px] text-slate-400 font-medium pt-0.5">
                                    <span className="italic text-slate-500">cimasur_diseno_campana.jpg (84.2 KB)</span>
                                    <span className="text-[7px] text-emerald-400 font-bold">✔ Enviado</span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Whatsapp Bubble */}
                            <div className="bg-[#056162] text-slate-100 p-2.5 rounded-xl rounded-tr-none max-w-[90%] text-[10px] leading-relaxed self-end shadow border border-[#0b4e4f] relative">
                              <div className="whitespace-pre-wrap font-sans font-medium">
                                {(() => {
                                  const targetClient = allClubClients.find(c => selectedCampaignClientIds.includes(c.id)) || bulkCampaignRecipients[0] || allClubClients[0];
                                  const changePct = (targetClient.percentChange || 0) * 100;
                                  const changeStr = changePct < 0 ? `${changePct.toFixed(0)}%` : `+${changePct.toFixed(0)}%`;
                                  return bulkWhatsAppText
                                    .replace(/\{\{NOMBRE\}\}/g, targetClient.name || 'Doctor/a')
                                    .replace(/\{\{CLINICA\}\}/g, targetClient.clinica || 'Centro Clínico')
                                    .replace(/\{\{VARIACION_VENTAS\}\}/g, changeStr)
                                    .replace(/\{\{CATEGORIA_2026\}\}/g, targetClient.calculatedTier?.name || 'Socio Especial')
                                    .replace(/\{\{BENEFICIO_PRINCIPAL\}\}/g, targetClient.calculatedTier?.primaryBenefit || 'Beneficios preferenciales');
                                })()}
                              </div>
                              <span className="text-[7.5px] text-emerald-300 font-bold block text-right mt-1 font-mono">
                                {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} ✔✔
                              </span>
                            </div>
                          </div>

                          {/* Chat Footer Box */}
                          <div className="bg-[#1e2428] p-2 flex items-center gap-1.5 shrink-0 select-none">
                            <div className="flex-1 bg-[#2a2f32] h-7 rounded-full px-3 flex items-center justify-between text-slate-500 text-[9px]">
                              <span>Mensaje de campaña...</span>
                            </div>
                            <div className="w-7 h-7 bg-[#00af9c] rounded-full flex items-center justify-center shadow">
                              <Send className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. SMTP CONFIGURATION AND GRAPHIC DESIGN SETTINGS TAB */}
                {previewTab === 'config' && (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* SMTP Configuration Block */}
                    <div className="p-5 bg-[#090f1d] border border-slate-800 rounded-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="bg-yellow-500/15 p-1.5 rounded-lg border border-yellow-500/20">
                            <Settings className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Conexión de Salida SMTP Propia (Thunderbird)</h4>
                            <p className="text-[10px] text-slate-450 mt-0.5">Su CRM se conecta de forma segura con su servidor institucional para envíos reales.</p>
                          </div>
                        </div>
                        <div className="bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-[8px] text-sky-400 font-extrabold uppercase tracking-widest">
                          Encriptación Local Activa
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400">Servidor SMTP</label>
                          <input
                            type="text"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            className="w-full bg-[#070b16] border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500/30 font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400">Puerto SMTP</label>
                          <input
                            type="text"
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(e.target.value)}
                            className="w-full bg-[#070b16] border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500/30 font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400">Nombre del Remitente</label>
                          <input
                            type="text"
                            value={smtpSenderName}
                            onChange={(e) => setSmtpSenderName(e.target.value)}
                            className="w-full bg-[#070b16] border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500/30 font-medium"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[9px] font-black uppercase text-slate-400">Usuario Autenticación SMTP</label>
                          <input
                            type="email"
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            className="w-full bg-[#070b16] border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500/30 font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400">Contraseña SMTP</label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Ingrese contraseña..."
                              value={smtpPass}
                              onChange={(e) => setSmtpPass(e.target.value)}
                              className="w-full bg-[#070b16] border border-slate-800 text-slate-200 pl-3 pr-10 py-2 rounded-xl focus:outline-none focus:border-sky-500/30 font-medium text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-2 text-slate-500 hover:text-slate-300 text-[10px] font-bold"
                            >
                              {showPassword ? "Ocultar" : "Mostrar"}
                            </button>
                          </div>
                          {smtpHost.includes('gmail.com') && (
                            <p className="text-[10px] text-sky-400/80 leading-tight mt-1">
                              ⚠️ Para Gmail/Google Workspace, debes usar una <strong>"Contraseña de aplicación"</strong> (16 dígitos), no tu contraseña de correo normal.{' '}
                              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline hover:text-sky-300">
                                Generar aquí
                              </a>.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Explanation of Render's SMTP port block and HTTP API fallback */}
                      <div className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-300 leading-relaxed p-3.5 rounded-xl space-y-1.5">
                        <strong className="text-amber-200 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                          ⚠️ ¿POR QUÉ DA TIMEOUT O CONEXIÓN FALLIDA EN RENDER?
                        </strong>
                        <p>
                          La plataforma de alojamiento <strong>Render bloquea por defecto todos los puertos SMTP salientes (25, 465, 587)</strong> para evitar spam. Por lo tanto, cualquier intento de conectarse por SMTP tradicional (como smtp.gmail.com) desde el servidor de Render fallará con un "Connection timeout" o "Network Unreachable".
                        </p>
                        <div className="pt-1.5 border-t border-amber-500/10 space-y-1">
                          <p className="font-extrabold text-white text-[10.5px]">🚀 SOLUCIÓN DEFINITIVA: Conexión mediante API HTTP (Nunca se bloquea)</p>
                          <p>
                            Hemos integrado un bypass inteligente. Puedes registrarte gratis en <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline text-sky-400 font-bold hover:text-sky-300">Resend.com</a> (tarda 1 minuto) para obtener una API Key y configurarla aquí de la siguiente manera:
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-300 mt-1">
                            <li><strong>Servidor SMTP:</strong> Escribe <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-200">resend</code></li>
                            <li><strong>Usuario Autenticación:</strong> Tu correo electrónico verificado en Resend (remitente)</li>
                            <li><strong>Contraseña SMTP:</strong> Pega tu API Key de Resend (empieza con <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-200">re_...</code>)</li>
                          </ul>
                          <p className="text-[9.5px] text-slate-400 italic mt-1">
                            * Al detectar "resend" como servidor, el sistema usará el puerto seguro 443 (HTTPS) para transmitir los correos de forma instantánea y garantizada, evadiendo el bloqueo de puertos de Render.
                          </p>
                        </div>
                      </div>

                      {/* Connection Test Block */}
                      <div className="p-3.5 bg-[#070b16] border border-slate-850 rounded-xl space-y-2.5">
                        <span className="text-[10px] uppercase font-bold text-slate-450 block">🧪 Verificar Salida SMTP</span>
                        <div className="flex gap-2.5">
                          <input
                            type="email"
                            placeholder="Correo personal para test..."
                            value={testEmailTarget}
                            onChange={(e) => setTestEmailTarget(e.target.value)}
                            className="flex-1 bg-[#090f1d] border border-slate-800 text-slate-200 px-3.5 py-1.5 rounded-xl text-xs focus:outline-none focus:border-sky-500/30 placeholder-slate-600"
                          />
                          <button
                            onClick={handleTestSmtp}
                            disabled={isTestingSmtp}
                            className="bg-[#1e293b] hover:bg-[#334155] border border-slate-750 text-slate-200 font-extrabold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {isTestingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            <span>Probar SMTP</span>
                          </button>
                        </div>

                        {testSmtpResult && (
                          <div className={`p-2.5 rounded-lg border text-[11px] leading-relaxed font-medium ${testSmtpResult.success ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' : 'bg-red-950/20 border-red-900/40 text-red-400'}`}>
                            {testSmtpResult.success ? '✔ ' : '❌ '} {testSmtpResult.message}
                            {!testSmtpResult.success && testSmtpResult.message.includes('ENOTFOUND') && (
                              <div className="mt-2 text-yellow-400">
                                💡 Tip: Parece que el servidor SMTP "{smtpHost}" no existe. Si usas Google Workspace o Gmail, el servidor SMTP debe ser obligatoriamente <strong>smtp.gmail.com</strong>.
                              </div>
                            )}
                            {!testSmtpResult.success && testSmtpResult.message.includes('BadCredentials') && (
                              <div className="mt-2 text-yellow-400">
                                💡 Importante: Google bloqueó el inicio de sesión porque estás usando tu contraseña normal. Debes generar una <strong>Contraseña de Aplicación de 16 dígitos</strong> en tu cuenta de Google. Sigue el enlace que aparece arriba ("Generar aquí").
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Console Logs & Progress Panel nested neatly in the box */}
              {isBulkSending && (
                <div className="p-4 mx-5 mb-5 bg-[#070b16] border border-slate-850 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                    <span>Progreso de despacho de campaña masiva</span>
                    <span className="font-mono text-white animate-pulse">Procesando cola...</span>
                  </div>
                  <div className="h-2 bg-slate-850 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: '100%' }} />
                  </div>
                </div>
              )}

              {bulkResults.length > 0 && (
                <div className="p-4 mx-5 mb-5 bg-[#070b16] border border-slate-850 rounded-xl space-y-3 shrink-0 text-xs">
                  <div className="flex justify-between items-center font-bold text-white border-b border-slate-800 pb-1.5">
                    <span>Resultados de Envío Masivo Corriente</span>
                    <span className="text-[11px] text-emerald-400 font-extrabold font-mono">
                      {bulkResults.filter(r => r.status === 'success').length} exitosos | {bulkResults.filter(r => r.status === 'error').length} fallidos
                    </span>
                  </div>

                  <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 custom-scrollbar text-[11px]">
                    {bulkResults.map((res, i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded bg-[#0d162d] border border-slate-850/50">
                        <div className="min-w-0 font-sans">
                          <strong className="text-white block truncate">{res.name}</strong>
                          <span className="text-slate-500 text-[10px] font-mono">{res.email}</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {res.status === 'success' ? (
                            <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded leading-none uppercase">Enviado</span>
                          ) : (
                            <div className="text-right">
                              <span className="text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded leading-none uppercase">Error</span>
                              <span className="block text-[8px] text-red-400 font-mono mt-0.5" title={res.error}>{res.error?.substring(0, 30)}...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

        </div> {/* Right Column Workspace */}
      </div> {/* Grid container */}

      <AnimatePresence>
        {isLargePreviewOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9999] flex flex-col p-4 md:p-6 text-slate-200"
          >
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Previsualización Expandida de Campaña</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inspeccione el correo diseñado tal como lo recibirán los veterinarios socios de CIMASUR.
                  </p>
                </div>
              </div>

              {/* Viewport Segmented Control and Copier */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Viewport toggles */}
                <div className="bg-[#091022] border border-slate-800 rounded-lg p-0.5 flex items-center">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${previewViewport === 'desktop' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Vista de Escritorio (Widescreen)"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Escritorio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('tablet')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${previewViewport === 'tablet' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Vista de Tablet"
                  >
                    <TabletIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tablet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${previewViewport === 'mobile' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Vista Móvil"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Móvil</span>
                  </button>
                </div>

                {/* Copy Compiled HTML Code Button */}
                <button
                  type="button"
                  onClick={() => {
                    const activeClientForCode = allClubClients.find(c => selectedCampaignClientIds.includes(c.id)) || bulkCampaignRecipients[0] || allClubClients[0];
                    const fullHtml = compileHtmlTemplate(activeClientForCode, bulkEmailText, designerAccentColor);
                    navigator.clipboard.writeText(fullHtml);
                    setCopiedHtmlTimer(true);
                    setTimeout(() => setCopiedHtmlTimer(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase rounded-lg shadow-lg hover:shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  {copiedHtmlTimer ? <Check className="w-3.5 h-3.5 animate-bounce" /> : <Code className="w-3.5 h-3.5" />}
                  <span>{copiedHtmlTimer ? '¡Copiado!' : 'Copiar HTML'}</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsLargePreviewOpen(false)}
                  className="flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-400 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar Previsualización"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Workspace */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden">
              
              {/* Left Side: Real-time quick customization panels */}
              <div className="w-full md:w-80 shrink-0 bg-[#091022] border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                <div>
                  <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-sky-400" />
                    <span>Personalización Rápida</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Ajuste el estilo visual o la información del socio para ver el impacto inmediato.
                  </p>
                </div>

                {/* Quick Style Switcher */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-400 block">Estilo de Plantilla</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['modern', 'letter', 'promotional', 'custom'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setEmailTemplateStyle(style)}
                        className={`py-1.5 px-2 rounded text-[9px] font-extrabold border transition-all text-center capitalize cursor-pointer ${emailTemplateStyle === style ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                      >
                        {style === 'modern' ? '✨ Moderno' : style === 'letter' ? '📜 Carta' : style === 'promotional' ? '🔥 Promo' : '💻 Propio'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Color Pickers */}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-800/60 pt-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block">Color Acento</span>
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                      <input
                        type="color"
                        value={designerAccentColor}
                        onChange={(e) => setDesignerAccentColor(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent shrink-0"
                      />
                      <span className="text-[8px] font-mono text-slate-300 select-all shrink-0 uppercase">{designerAccentColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block">Fondo Tarjeta</span>
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                      <input
                        type="color"
                        value={designerCardBgColor}
                        onChange={(e) => setDesignerCardBgColor(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent shrink-0"
                      />
                      <span className="text-[8px] font-mono text-slate-300 select-all shrink-0 uppercase">{designerCardBgColor}</span>
                    </div>
                  </div>
                </div>

                {/* Header Text Quick Editor */}
                <div className="space-y-2 border-t border-slate-800/60 pt-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block">Título de Cabecera</span>
                    <input
                      type="text"
                      value={designerTitle}
                      onChange={(e) => setDesignerTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-sky-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 block">Subtítulo de Soporte</span>
                    <input
                      type="text"
                      value={designerSubtitle}
                      onChange={(e) => setDesignerSubtitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-sky-500/50"
                    />
                  </div>
                  <div className="space-y-1 mt-2">
                    <span className="text-[9px] font-bold text-slate-400 block">Botón (CTA)</span>
                    <input
                      type="text"
                      value={designerButtonText}
                      onChange={(e) => setDesignerButtonText(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-sky-500/50 mb-1"
                      placeholder="Texto del botón"
                    />
                    <input
                      type="text"
                      value={designerButtonUrl}
                      onChange={(e) => setDesignerButtonUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded text-[10px] focus:outline-none focus:border-sky-500/50"
                      placeholder="Enlace del botón"
                    />
                  </div>
                </div>

                {/* Simulated Device Metadata info */}
                <div className="mt-auto bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-2 text-[10px]">
                  <div className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Socio Comercial de Prueba</span>
                  </div>
                  {(() => {
                    const targetClient = allClubClients.find(c => selectedCampaignClientIds.includes(c.id)) || bulkCampaignRecipients[0] || allClubClients[0];
                    if (!targetClient) return <div className="text-slate-500">Ninguno seleccionado</div>;
                    return (
                      <div className="space-y-1 text-slate-300 leading-normal">
                        <div>• <strong className="text-white">Nombre:</strong> {targetClient.name}</div>
                        <div>• <strong className="text-white">Centro:</strong> {targetClient.clinica}</div>
                        <div>• <strong className="text-white">Categoría:</strong> {targetClient.calculatedTier?.name || 'Socio'}</div>
                        <div>• <strong className="text-white">Descuento:</strong> {targetClient.calculatedTier?.primaryBenefit || 'Preferente'}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Side: Centered preview stage with device emulator frame */}
              <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-center items-center p-4 overflow-hidden relative min-h-[350px]">
                
                {/* Device container wrap with dynamic width */}
                <div 
                  className="w-full h-full bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out"
                  style={{ 
                    maxWidth: previewViewport === 'desktop' ? '100%' : previewViewport === 'tablet' ? '768px' : '400px',
                    height: previewViewport === 'mobile' ? '92%' : '100%'
                  }}
                >
                  {/* Browser or Phone Header Bar */}
                  <div className="bg-[#111827] border-b border-slate-850 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 shrink-0 select-none">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                      
                      <span className="text-slate-500 ml-4 hidden sm:inline">De:</span>
                      <span className="text-sky-400 font-extrabold hidden sm:inline">CIMASUR Marketing &lt;marketing@cimasur.cl&gt;</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-md text-[9px] font-mono text-slate-400 max-w-[150px] sm:max-w-xs truncate">
                      {previewViewport === 'desktop' ? '🖥️ Vista de Escritorio (Widescreen)' : previewViewport === 'tablet' ? '📟 Vista de Tablet' : '📱 Vista de Celular Responsiva'}
                    </div>

                    <div className="text-[9px] font-bold text-slate-500 uppercase">
                      Fidelización 2026
                    </div>
                  </div>

                  {/* Subject and stats mini bar */}
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-850 text-[10px] flex items-center gap-2 text-slate-400 shrink-0">
                    <span className="font-bold text-slate-500">Asunto:</span>
                    <span className="text-slate-200 font-extrabold truncate">{bulkEmailSubject}</span>
                  </div>

                  {/* Main iFrame Content Area */}
                  <div className="flex-1 bg-white relative">
                    <iframe
                      title="Large Email Graphic Preview iFrame"
                      srcDoc={compileHtmlTemplate(
                        allClubClients.find(c => selectedCampaignClientIds.includes(c.id)) || bulkCampaignRecipients[0] || allClubClients[0], 
                        bulkEmailText, 
                        designerAccentColor
                      )}
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal ESC hotkey guide footer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-500 font-medium">
              <span>💡 Presione el botón de cerrar arriba para volver al CRM. El diseño se actualiza dinámicamente en tiempo real.</span>
              <span className="font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">ESC para cerrar</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Small helper icon component
function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
