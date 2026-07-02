import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  TrendingUp, 
  PhoneCall, 
  Megaphone, 
  ShoppingBag, 
  Gift, 
  UserCheck, 
  Check, 
  Copy, 
  ChevronRight, 
  AlertCircle, 
  RotateCw, 
  Search,
  Award,
  ChevronLeft,
  DollarSign,
  Clock
} from 'lucide-react';

interface Opportunity {
  id: string;
  contactId: string;
  customerName: string;
  clinic: string;
  email: string;
  rut: string;
  score: number;
  reason: string;
  confidence: number;
  recommendedAction: string;
  opportunityType: 'upgrade' | 'reactivation' | 'cross_sell' | 'retention' | 'vip';
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

interface TimelineEvent {
  id: string;
  date: string;
  type: 'sale' | 'contact' | 'campaign' | 'points' | 'redemption' | 'opportunity' | 'recommendation';
  title: string;
  description: string;
  icon: string;
  meta?: any;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'product' | 'promotion' | 'reward' | 'engagement';
  recommendedAction: 'WhatsApp' | 'Email' | 'Llamada' | 'Campaña';
  priority: 'Alta' | 'Media' | 'Baja';
  metadata?: any;
}

interface AISummary {
  executiveSummary: string;
  opportunityExplanation: string;
  suggestedActions: {
    actionName: string;
    description: string;
    channel: 'WhatsApp' | 'Email' | 'Llamada';
    draftText: string;
  }[];
}

interface ClientIntelligence {
  contactId: string;
  opportunity: any;
  recommendations: Recommendation[];
  timeline: TimelineEvent[];
  aiSummary: AISummary | null;
}

export const OpportunityEngineView: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [intelligence, setIntelligence] = useState<ClientIntelligence | null>(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);

  // Cargar lista de oportunidades al montar
  const loadOpportunities = async () => {
    setLoadingList(true);
    try {
      // Intentamos correr una evaluación rápida o leer las activas
      const response = await fetch('/api/records/active_opportunities');
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data || []);
      }
    } catch (e) {
      console.error('Error cargando oportunidades:', e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  // Re-evaluación masiva de la cartera
  const handleMassEvaluation = async () => {
    setEvaluating(true);
    try {
      const response = await fetch('/api/opportunities/evaluate', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        setOpportunities(result.opportunities || []);
        alert(`Recalibración masiva finalizada con éxito. Se detectaron ${result.count} oportunidades de negocio activas.`);
      } else {
        alert('Error al ejecutar la evaluación masiva.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setEvaluating(false);
    }
  };

  // Cargar detalles de inteligencia para el cliente seleccionado
  useEffect(() => {
    if (!selectedContactId) {
      setIntelligence(null);
      return;
    }

    const loadClientIntelligence = async () => {
      setLoadingIntelligence(true);
      try {
        const response = await fetch(`/api/crm/client-intelligence/${selectedContactId}`);
        if (response.ok) {
          const data = await response.json();
          setIntelligence(data);
        } else {
          console.error('Error cargando inteligencia de cliente');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingIntelligence(false);
      }
    };

    loadClientIntelligence();
  }, [selectedContactId]);

  // Copiar borrador de mensaje al portapapeles
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTextId(id);
      setTimeout(() => setCopiedTextId(null), 2000);
    });
  };

  // Filtrar oportunidades
  const filteredOpps = opportunities.filter(opp => {
    const name = opp.customerName?.toLowerCase() || '';
    const clinic = opp.clinic?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || clinic.includes(query);
  });

  // Helper para renderizar iconos de la línea de tiempo
  const renderTimelineIcon = (type: string) => {
    const baseClass = "p-2 rounded-full text-white";
    switch (type) {
      case 'sale':
        return <div className={`${baseClass} bg-emerald-500`}><ShoppingBag size={14} /></div>;
      case 'contact':
        return <div className={`${baseClass} bg-sky-500`}><PhoneCall size={14} /></div>;
      case 'campaign':
        return <div className={`${baseClass} bg-indigo-500`}><Megaphone size={14} /></div>;
      case 'points':
        return <div className={`${baseClass} bg-amber-500`}><Award size={14} /></div>;
      case 'redemption':
        return <div className={`${baseClass} bg-rose-500`}><Gift size={14} /></div>;
      default:
        return <div className={`${baseClass} bg-slate-500`}><UserCheck size={14} /></div>;
    }
  };

  // Badge para tipos de oportunidades
  const renderTypeBadge = (type: string) => {
    const base = "px-2 py-0.5 text-[10px] font-bold rounded-full";
    switch (type) {
      case 'upgrade':
        return <span className={`${base} bg-sky-500/10 text-sky-400 border border-sky-500/20`}>SUBIDA NIVEL</span>;
      case 'reactivation':
        return <span className={`${base} bg-rose-500/10 text-rose-400 border border-rose-500/20`}>REACTIVACIÓN</span>;
      case 'retention':
        return <span className={`${base} bg-amber-500/10 text-amber-400 border border-amber-500/20`}>ALERTA CAÍDA</span>;
      case 'vip':
        return <span className={`${base} bg-purple-500/10 text-purple-400 border border-purple-500/20`}>CUENTA VIP</span>;
      case 'cross_sell':
        return <span className={`${base} bg-teal-500/10 text-teal-400 border border-teal-500/20`}>VENTA CRUZADA</span>;
      default:
        return <span className={`${base} bg-slate-500/10 text-slate-400`}>OPORTUNIDAD</span>;
    }
  };

  // Badge para prioridad
  const renderPriorityBadge = (priority: string) => {
    const base = "px-2 py-0.5 text-[10px] font-bold rounded-full";
    switch (priority) {
      case 'critical':
        return <span className={`${base} bg-rose-500 text-white`}>CRÍTICA</span>;
      case 'high':
        return <span className={`${base} bg-orange-500 text-white`}>ALTA</span>;
      case 'medium':
        return <span className={`${base} bg-amber-500 text-slate-900`}>MEDIA</span>;
      default:
        return <span className={`${base} bg-slate-700 text-slate-200`}>BAJA</span>;
    }
  };

  // Calcular métricas
  const totalPotential = opportunities.reduce((sum, o) => {
    const details = o.metadata?.ruleDetails;
    const missing = details?.TierUpgradeRule?.missingAmount || 0;
    const dropVal = details?.PurchaseDropRule?.compras2025 - details?.PurchaseDropRule?.compras2026 || 0;
    return sum + (missing || dropVal || 150000);
  }, 0);

  const criticalCount = opportunities.filter(o => o.priority === 'critical' || o.priority === 'high').length;

  return (
    <div className="p-6 space-y-6 text-slate-200 h-full flex flex-col bg-[#0b0f19]">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="text-sky-400" />
            Centro de Oportunidades & Inteligencia Comercial
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fase 6: Evaluaciones en tiempo real y resúmenes ejecutivos avanzados impulsados por Inteligencia Artificial de CIMASUR.
          </p>
        </div>

        <button
          onClick={handleMassEvaluation}
          disabled={evaluating}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-bold text-slate-950 rounded flex items-center justify-center gap-2 transition-all self-start md:self-auto shadow-lg shadow-sky-500/10"
        >
          <RotateCw size={14} className={evaluating ? 'animate-spin' : ''} />
          {evaluating ? 'Evaluando Cartera...' : 'Re-evaluar Cartera Comercial'}
        </button>
      </div>

      {/* CARDS DE RESUMEN METRICO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-slate-800 p-4 rounded flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Oportunidades Activas</p>
            <h3 className="text-2xl font-black text-white mt-1">{opportunities.length}</h3>
          </div>
          <div className="p-3 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Bot size={20} />
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-4 rounded flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alertas Prioritarias</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1">{criticalCount}</h3>
          </div>
          <div className="p-3 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle size={20} />
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-4 rounded flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingreso Potencial Estimado</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">${Math.round(totalPotential).toLocaleString('es-CL')} CLP</h3>
          </div>
          <div className="p-3 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* SPLIT SCREEN LAYOUT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0 overflow-hidden">
        {/* PANEL IZQUIERDO: LISTADO DE CLIENTES CON OPORTUNIDADES */}
        <div className="lg:col-span-2 flex flex-col bg-[#111827] border border-slate-800 rounded overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-[#161f30] space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <span>🎯 Alertas y Desvíos Detectados</span>
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Buscar veterinario o clínica..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1524] border border-slate-800 rounded py-1.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RotateCw className="animate-spin text-sky-400" size={18} />
                <span>Analizando cartera comercial...</span>
              </div>
            ) : filteredOpps.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No se encontraron oportunidades que coincidan con la búsqueda.
              </div>
            ) : (
              filteredOpps.map(opp => (
                <button
                  key={opp.id}
                  onClick={() => setSelectedContactId(opp.contactId)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-all hover:bg-slate-800/40 ${selectedContactId === opp.contactId ? 'bg-sky-500/10 border-l-4 border-sky-500' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-white truncate">{opp.customerName}</h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {renderPriorityBadge(opp.priority)}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mb-2">{opp.clinic || 'Socio Clínico Autorizado'}</p>
                    
                    <div className="flex items-center gap-2">
                      {renderTypeBadge(opp.opportunityType)}
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>Puntaje:</span>
                        <span className={`font-black ${opp.score >= 70 ? 'text-rose-400' : opp.score >= 40 ? 'text-amber-400' : 'text-sky-400'}`}>{opp.score}%</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-500 shrink-0 self-center" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* PANEL DERECHO: DETALLES DE INTELIGENCIA DE CLIENTE */}
        <div className="lg:col-span-3 flex flex-col bg-[#111827] border border-slate-800 rounded overflow-hidden">
          {!selectedContactId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Bot className="text-slate-600 animate-pulse mb-3" size={40} />
              <h3 className="text-sm font-bold text-white">Explorador de Inteligencia de Clientes</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Seleccione un médico veterinario de la lista lateral para cargar su Customer Journey consolidado, recomendaciones automáticas y redactar mensajes por IA.
              </p>
            </div>
          ) : loadingIntelligence ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2">
              <RotateCw className="animate-spin text-sky-400" size={24} />
              <h3 className="text-xs font-bold text-white">Invocando motores de IA y CRM...</h3>
              <p className="text-[10px] text-slate-400">Consolidando transacciones, visitas, puntos y consultando Gemini 3.5...</p>
            </div>
          ) : !intelligence ? (
            <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
              Error al compilar la información de este cliente. Intente nuevamente.
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5 space-y-6">
              {/* FICHA INICIAL CLIENTE */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[9px] font-black tracking-widest text-sky-400 uppercase">Ficha Inteligente del Socio</span>
                  <h3 className="text-lg font-black text-white mt-0.5">{opportunities.find(o => o.contactId === selectedContactId)?.customerName}</h3>
                  <p className="text-xs text-slate-400">{opportunities.find(o => o.contactId === selectedContactId)?.clinic || 'Socio Clínico Autorizado'}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-[#0f172a] px-3 py-1.5 border border-slate-800 rounded text-center">
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Puntos Club</p>
                    <p className="text-xs font-black text-amber-400">{intelligence.timeline.length > 0 ? (intelligence.opportunity?.metadata?.ruleDetails?.LoyaltyEngagementRule?.pointsBalance || 0) : 0} pts</p>
                  </div>
                  <div className="bg-[#0f172a] px-3 py-1.5 border border-slate-800 rounded text-center">
                    <p className="text-[8px] text-slate-400 font-bold uppercase">Compras Ciclo</p>
                    <p className="text-xs font-black text-emerald-400">${intelligence.opportunity?.metadata?.ruleDetails?.TierUpgradeRule?.totalSales?.toLocaleString('es-CL') || (intelligence.opportunity?.metadata?.ruleDetails?.HighValueCustomerRule?.totalSales || 0).toLocaleString('es-CL') || '0'} CLP</p>
                  </div>
                </div>
              </div>

              {/* RESUMEN DE COGNICIÓN DE IA COMERCIAL (GEMINI) */}
              {intelligence.aiSummary && (
                <div className="bg-sky-950/20 border border-sky-500/20 rounded p-4 space-y-4 shadow-lg shadow-sky-500/5">
                  <div className="flex items-center gap-2 text-sky-400 border-b border-sky-500/10 pb-2">
                    <Bot size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      Resumen Ejecutivo de IA
                      <span className="px-1.5 py-0.5 bg-sky-500 text-slate-950 text-[8px] rounded-full font-black">GEMINI 3.5</span>
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] text-sky-400 uppercase font-extrabold tracking-wider mb-1">Diagnóstico de Salud Comercial</p>
                      <p className="text-xs text-slate-300 leading-relaxed italic bg-sky-500/5 p-3 rounded border border-sky-500/5">
                        "{intelligence.aiSummary.executiveSummary}"
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] text-sky-400 uppercase font-extrabold tracking-wider mb-1">Justificación del Motor de Oportunidades</p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {intelligence.aiSummary.opportunityExplanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* RECOMENDACIONES DE NEGOCIO */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  Recomendaciones de Acción Sugeridas
                </h4>

                {intelligence.recommendations.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-3 bg-[#0d1524] rounded border border-slate-800">
                    No se generaron recomendaciones para este perfil de cliente.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {intelligence.recommendations.map((rec, idx) => (
                      <div key={rec.id || idx} className="bg-[#0f172a] border border-slate-800 rounded p-3 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="px-1.5 py-0.5 bg-slate-800 text-[8px] font-black text-slate-300 rounded uppercase tracking-wider">
                              {rec.type === 'product' ? 'Fórmula/Producto' : rec.type === 'promotion' ? 'Promoción' : rec.type === 'reward' ? 'Canje Recompensa' : 'Fidelización'}
                            </span>
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-full ${rec.priority === 'Alta' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                              {rec.priority}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-white">{rec.title}</h5>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-1">{rec.description}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between">
                          <span className="text-[9px] text-slate-500 font-semibold">Canal: <strong className="text-sky-400">{rec.recommendedAction}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* COPIA DEDICADA DE MENSAJES (COPYWRITING DE COGNICIÓN) */}
              {intelligence.aiSummary && intelligence.aiSummary.suggestedActions && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    📋 Plantillas y Borradores de Copywriting
                  </h4>

                  <div className="space-y-4">
                    {intelligence.aiSummary.suggestedActions.map((action, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
                        <div className="bg-slate-800/50 p-3 flex items-center justify-between border-b border-slate-800">
                          <div>
                            <h5 className="text-xs font-bold text-white">{action.actionName}</h5>
                            <p className="text-[9px] text-slate-400 mt-0.5">{action.description}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded border border-emerald-500/20">
                            {action.channel}
                          </span>
                        </div>

                        <div className="p-3 relative">
                          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-[#0c101b] p-3 rounded border border-slate-800 max-h-48 overflow-y-auto">
                            {action.draftText}
                          </pre>
                          
                          <button
                            onClick={() => handleCopyText(action.draftText, `draft_${idx}`)}
                            className="absolute right-6 bottom-6 p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded border border-slate-700 flex items-center gap-1.5 text-[10px] font-bold transition-all"
                          >
                            {copiedTextId === `draft_${idx}` ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span className="text-emerald-400">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LÍNEA DE TIEMPO DEL CUSTOMER JOURNEY */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Clock size={14} className="text-sky-400" />
                  Customer Journey - Historial Cronológico
                </h4>

                <div className="relative border-l border-slate-800 pl-4 ml-3 py-2 space-y-5">
                  {intelligence.timeline.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No hay interacciones cargadas en la línea de tiempo.</p>
                  ) : (
                    intelligence.timeline.map((event, idx) => (
                      <div key={event.id || idx} className="relative">
                        {/* Icono Absoluto en la línea */}
                        <div className="absolute -left-[27px] top-0.5">
                          {renderTimelineIcon(event.type)}
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">{event.date}</span>
                          <h5 className="text-xs font-bold text-white mt-0.5">{event.title}</h5>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{event.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
