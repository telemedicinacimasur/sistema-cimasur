import React, { useState, useEffect } from 'react';
import { RefreshCw, Lightbulb, Target, TrendingUp, AlertCircle, ArrowUpRight, Mail, Phone, Clock, FileText, CheckCircle2, ChevronRight, MessageSquare, ExternalLink, UserPlus, BadgeCheck, Activity, Loader2 } from 'lucide-react';
import { localDB } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";

interface CampaignTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'email' | 'whatsapp';
}

export function SmartCampaigns({ isSchool = false }: { isSchool?: boolean }) {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<CampaignTemplate | null>(null);
  const [variationIndex, setVariationIndex] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPlans, setAiPlans] = useState<{title: string, description: string, segment: string, channel: string, messageTemplate: string}[]>([]);

  useEffect(() => {
    const load = async () => {
      if (isSchool) {
        const students = await localDB.getCollection('students');
        const leads = await localDB.getCollection('school_leads');
        // Mark them to distinguish in filters
        const combined = [
          ...students.map(s => ({ ...s, _isStudent: true })),
          ...leads.map(l => ({ ...l, _isLead: true }))
        ];
        setClients(combined);
      } else {
        const data = await localDB.getCollection('contacts');
        setClients(data);
      }
    };
    load();
  }, [isSchool]);

  const templates: CampaignTemplate[] = isSchool ? [
    {
      id: 'school-leads-to-students',
      name: 'Conversión de Leads a Alumnos',
      subject: '🎓 ¡Inicia tu camino en CIMASUR! Beneficio Preferencial Exclusivo',
      body: '¡Hola! 👋 Te contactamos de la Escuela CIMASUR. 📚\n\nNotamos tu interés en nuestra formación académica. Queremos contarte que por esta semana tienes una *Beca Directa del 20%* para matricularte en el Diplomado de Homeopatía. ✨\n\n¿Te gustaría que te enviemos el programa completo para revisar los módulos?\n\nDirección Académica Escuela CIMASUR 🐾',
      type: 'whatsapp'
    },
    {
      id: 'school-announcement',
      name: 'Anuncio Nuevo Diplomado',
      subject: '📚 Escuela CIMASUR: Nueva Formación para Alumnos y Ex-alumnos',
      body: 'Estimado alumno/a,\n\nNuestra oferta académica sigue creciendo para brindarte las mejores herramientas en medicina veterinaria integrativa. 🎓✨\n\nTe invitamos a conocer el nuevo *Postítulo en Farmacología Homeopática Avanzada*. Como ya eres parte de nuestra comunidad, tienes acceso a un cupo limitado con arancel preferencial.\n\nSigue potenciando tu carrera con nosotros.\n\nAtentamente,\nEquipo Escuela CIMASUR 📚🐾',
      type: 'email'
    }
  ] : [
    {
      id: 'lab-lanzamiento',
      name: 'Lanzamiento Laboratorio',
      subject: '🔬 Novedades de Laboratorio: Nuevas Soluciones Homeopáticas',
      body: 'Estimado profesional,\n\nEn nuestro Laboratorio CIMASUR seguimos innovando para brindarle soluciones terapéuticas de vanguardia. 🩺✨\n\nQueremos presentarle nuestras nuevas fórmulas magistrales diseñadas para patologías crónicas refractarias. Contamos con rigurosos estándares de calidad para asegurar la máxima eficacia en su clínica diaria.\n\nConsulte por nuestro nuevo catálogo y beneficios por compras de lanzamiento.\n\nSaludos cordiales,\nLaboratorio CIMASUR 🧪🐾',
      type: 'email'
    },
    {
      id: 'oferta-homeopatia',
      name: 'Oferta Stock Homeopatía',
      subject: '📦 Stock Disponible - Homeopatía Veterinaria Especializada',
      body: '¡Hola! 👋 Le saluda el equipo de Laboratorio CIMASUR.\n\nQueremos informarle que tenemos stock renovado de nuestras fórmulas de alta demanda. 📦✨\n\nEsta semana contamos con un *Beneficio Especial* de despacho gratuito en pedidos sobre 10 unidades. \n\n¿Le interesa renovar su stock hoy mismo? 📝🔬',
      type: 'whatsapp'
    }
  ];

  if (selectedCampaign?.type === 'ai_suggested' && selectedCampaign.messageTemplate) {
    const aiTemplateExists = templates.some(t => t.id === 'ai-generated-template');
    if (!aiTemplateExists) {
      templates.unshift({
        id: 'ai-generated-template',
        name: `Sugerencia IA: ${selectedCampaign.title}`,
        subject: `Notificación de CIMASUR - ${selectedCampaign.title}`,
        body: selectedCampaign.messageTemplate,
        type: selectedCampaign.channel?.toLowerCase().includes('mail') ? 'email' : 'whatsapp'
      });
    }
  }

  const getVariations = (templateId: string) => {
    const base = templates.find(t => t.id === templateId);
    if (!base) return [];
    
    if (templateId === 'lab-lanzamiento') {
      return [
        base.body,
        '¡Lo último en medicina integrativa ya está aquí! 🏥 Laboratorio CIMASUR presenta su nueva línea de soluciones homeopáticas. Excelencia farmacéutica aplicada al bienestar animal. ¡Descubra más!',
        'Estimado colega, ¿busca resultados consistentes en sus tratamientos? Presentamos nuestras nuevas fórmulas de laboratorio probadas clínicamente. Calidad CIMASUR en cada preparación. 🧪✨'
      ];
    }
    if (templateId === 'school-leads-to-students') {
       return [
          base.body,
          '¡Hola! 🎓 ¿Sabías que los alumnos de CIMASUR acceden a una red de beneficios exclusivos en nuestro laboratorio? Matricúlate hoy y potencia tu práctica profesional con nosotros.',
          'Escuela CIMASUR te invita a formar parte de la nueva generación de especialistas. 🐾 Consulta por tu beca de ingreso y descubre el futuro de la medicina veterinaria.'
       ];
    }
    return [
      base.body,
      base.body.replace('¡Hola!', 'Hola Dr/Dra,'),
      base.body.replace('Saludos cordiales,', 'Atentamente,')
    ];
  };

  const currentBody = activeTemplate ? (getVariations(activeTemplate.id)[variationIndex % getVariations(activeTemplate.id).length] || activeTemplate.body) : '';

  const campaigns = isSchool ? [
    {
      title: 'Conversión de Leads',
      icon: <UserPlus className="w-5 h-5 text-emerald-500" />,
      color: 'emerald',
      reasoning: 'Prospectos interesados en diplomados. El análisis sugiere contactar para ofrecer beca de pronto pago y cierre de matrícula.',
      audience: clients.filter(c => c._isLead && c.estado !== 'Cerrado'),
      actionLabel: 'Convertir a Alumno',
      type: 'closing'
    },
    {
      title: 'Fidelización Alumnos',
      icon: <BadgeCheck className="w-5 h-5 text-blue-500" />,
      color: 'blue',
      reasoning: 'Alumnos con alta recurrencia. Sugerimos invitar a especializaciones avanzadas o membresía de ex-alumnos.',
      audience: clients.filter(c => c._isStudent && c.pago === 'Al Día'),
      actionLabel: 'Difusión Académica',
      type: 'upselling'
    },
    {
      title: 'Rescate de Morosidad',
      icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
      color: 'rose',
      reasoning: 'Alumnos con mensualidades pendientes. Se recomienda envío de recordatorio con beneficios por regularización.',
      audience: clients.filter(c => c._isStudent && (c.pago === 'Pendiente' || c.pago === 'Moroso')),
      actionLabel: 'Recordatorio Pago',
      type: 'reactivation'
    }
  ] : [
    {
      title: 'Subir de Categoría',
      icon: <Target className="w-5 h-5 text-blue-500" />,
      color: 'blue',
      reasoning: 'Basado en el historial de compras y recurrencia, estos clientes tienen alto potencial de convertirse en Partners.',
      audience: clients.filter(c => c.categoria === 'Bronce'),
      actionLabel: 'Generar Campaña VIP',
      type: 'upselling'
    },
    {
      title: 'Despertar Inactivos',
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      color: 'emerald',
      reasoning: 'Clientes con más de 3 meses sin interacción. El costo de reactivación es 5 veces menor que captar uno nuevo.',
      audience: clients.filter(c => (c.historialUnificado?.toString().includes('En proceso') || !c.historialUnificado) && c.categoria !== 'Sin categoría').slice(0, 8),
      actionLabel: 'Masivo Email/WS',
      type: 'reactivation'
    },
    {
      title: 'Cierre Estratégico',
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      color: 'amber',
      reasoning: 'Prospectos en etapa final de embudo. Requieren un "empujón" final con beneficios directos o asesoría.',
      audience: clients.filter(c => c.categoria === 'Sin categoría').slice(0, 5),
      actionLabel: 'Acción de Cierre',
      type: 'closing'
    }
  ];

  const executeCampaign = (template: CampaignTemplate, emails: string[], phones: string[]) => {
    if (emails.length === 0 && template.type === 'email') {
      alert("No hay destinatarios con email.");
      return;
    }
    if (phones.length === 0 && template.type === 'whatsapp') {
      alert("No hay destinatarios con teléfono.");
      return;
    }

    if (template.type === 'email') {
      const bcc = emails.join(',');
      window.location.href = `mailto:?bcc=${bcc}&subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`;
    } else {
      const firstPhone = phones[0]?.replace(/\D/g, '');
      if (firstPhone) {
        window.open(`https://wa.me/${firstPhone}?text=${encodeURIComponent(template.body)}`, '_blank');
      }
      alert(`Se ha preparado un mensaje para ${phones.length} contactos. Se abrirá la ventana de WhatsApp para el primer contacto.`);
    }
  };

  const generateAIPlan = async () => {
    if (!aiPrompt) {
      alert("Por favor, ingresa instrucciones para el Motor Estratégico.");
      return;
    }
    setAiGenerating(true);
    try {
      if (!process.env.GEMINI_API_KEY) {
        alert("Falta configurar la GEMINI_API_KEY en las variables de entorno.");
        setAiGenerating(false);
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // summarize clients to lower token usage
      const clientSummary = clients.map(c => ({
        name: c.name || c.nombre || c.nombreAlumno,
        type: c._isStudent ? 'Student' : c._isLead ? 'Lead' : 'Client',
        status: isSchool ? c.pago : c.categoria
      }));
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Eres el motor de inteligencia de CIMASUR. Aquí tienes los datos resumidos de la base: ${JSON.stringify(clientSummary)}.
        El usuario requiere este plan estratégico: "${aiPrompt}".
        Genera 3 acciones sugeridas.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Título breve de la acción sugerida." },
                description: { type: Type.STRING, description: "Descripción detallada de la acción, mencionando la cantidad de personas afectadas." },
                segment: { type: Type.STRING, description: "El segmento o filtro que se va a aplicar." },
                channel: { type: Type.STRING, description: "Canal sugerido: WhatsApp o Email." },
                messageTemplate: { type: Type.STRING, description: "La plantilla del mensaje sugerida para enviar." }
              },
              required: ["title", "description", "segment", "channel", "messageTemplate"]
            }
          }
        }
      });
      const parsed = JSON.parse(response.text || "[]");
      setAiPlans(parsed);
    } catch (err) {
      console.error(err);
      alert("Error al comunicarse con la Inteligencia Artificial. Intenta nuevamente.");
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="p-4 lg:p-10 space-y-10 bg-slate-50/50 min-h-screen animate-fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
            <Lightbulb className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{isSchool ? 'Motor de Inteligencia ESCUELA' : 'Motor de Inteligencia Comercial'}</h2>
            <p className="text-slate-500 text-sm font-medium">{isSchool ? 'Analíticas predictivas para potenciar tu Escuela CIMASUR' : 'Gestión inteligente de la cartera comercial'}</p>
          </div>
        </div>
        <div className="flex gap-2">
            <div className="px-5 py-2 bg-indigo-50 rounded-full flex items-center gap-2 border border-indigo-200">
               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Algoritmo Escuela Activo</span>
            </div>
        </div>
      </div>

      {/* AI Strategy Configurator */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
           <Activity className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
           <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse" />
                 <h3 className="text-lg font-black text-white uppercase tracking-widest">Entrenar Motor Estratégico (IA)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-bold">
                 Escribe las instrucciones directas para la Inteligencia Artificial. Por ejemplo: qué clientes tienen qué beneficios, promociones especiales, y reglas de filtrado de categoría.
              </p>
              <textarea 
                className="w-full h-40 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none resize-none font-medium placeholder-slate-500"
                placeholder="Ej: Analiza los clientes Bronce y ofréceles un 10% de descuento si compran esta semana. Para los VIP, ofréceles un taller gratuito."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <button 
                onClick={generateAIPlan}
                disabled={aiGenerating}
                className="w-full disabled:opacity-50 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                 {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {aiGenerating ? 'Generando...' : 'Generar Plan Estratégico Global'}
              </button>
           </div>
           
           <div className="bg-slate-950 rounded-3xl p-8 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                 <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Plan Estratégico Generado</h4>
                 <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase rounded">V.4 IA Outputs</div>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar-white pr-2">
                 {aiPlans.length > 0 ? aiPlans.map((plan, i) => (
                   <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-indigo-500/50 transition-colors">
                     <p className="text-[10px] text-indigo-400 uppercase font-black mb-1">{plan.title} ({plan.channel})</p>
                     <p className="text-sm text-slate-200 font-medium leading-relaxed mb-3">{plan.description}</p>
                     
                     <div className="bg-black/30 p-3 rounded-lg mt-2 font-mono text-xs text-slate-400">
                        <span className="text-indigo-400 font-bold block mb-1">Segmento Objetivo:</span>
                        {plan.segment}
                     </div>

                     <div className="mt-4 flex justify-end">
                       <button
                         onClick={() => {
                           setSelectedCampaign({
                             title: plan.title,
                             reasoning: plan.description,
                             color: 'indigo',
                             icon: <Target className="w-5 h-5 text-indigo-500" />,
                             audience: clients.filter(c => plan.segment.toLowerCase().includes(isSchool ? c.pago?.toLowerCase() || '' : c.categoria?.toLowerCase() || '')).slice(0, 50),
                             type: 'ai_suggested',
                             messageTemplate: plan.messageTemplate,
                             channel: plan.channel
                           });
                           setTimeout(() => {
                              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                           }, 100);
                         }}
                         className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-indigo-400 hover:text-indigo-300"
                       >
                         Ver y Ejecutar <ArrowUpRight className="w-3 h-3" />
                       </button>
                     </div>
                   </div>
                 )) : (
                   <div className="flex flex-col items-center justify-center text-center h-full text-slate-500 space-y-3">
                     <Lightbulb className="w-10 h-10 opacity-20" />
                     <p className="text-sm font-medium">Escribe tus instrucciones y presiona Generar para visualizar el plan de la IA.</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {!isSchool && (
        <div className="bg-amber-100/50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-inner">
              <TrendingUp className="w-8 h-8 text-amber-600" />
           </div>
           <div className="flex-1">
              <h4 className="text-sm font-black text-amber-900 uppercase">Contexto de Análisis Inteligente</h4>
              <p className="text-xs text-amber-800/70 leading-relaxed mt-1">Este motor analiza el <b>Expediente de cada Cliente</b>, su <b>Categoría Anual</b> (actualizada según volumen de ventas/pagos) y sus <b>Beneficios Específicos</b>. Detecta automáticamente quién sube o baja de nivel para sugerir acciones de retención o fidelización exclusiva.</p>
           </div>
           <div className="text-right">
              <span className="text-[10px] font-black text-amber-600 uppercase bg-white px-3 py-1 rounded-full border border-amber-200">Actualización: Junio 2026</span>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {campaigns.map((camp, i) => (
          <div key={i} className={cn("group relative bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1 overflow-hidden")}>
            <div className={cn("absolute top-0 right-0 p-12 opacity-[0.03] translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform", 
              camp.color === 'blue' ? "text-blue-600" : camp.color === 'emerald' ? "text-emerald-600" : "text-amber-600")}>
              {camp.icon}
            </div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className={cn("p-2 rounded-lg", 
                  camp.color === 'blue' ? "bg-blue-50 text-blue-600" : camp.color === 'emerald' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                  {camp.icon}
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">{camp.title}</h3>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl mb-6 relative">
                 <div className="absolute left-0 top-4 w-1 h-8 bg-indigo-500 rounded-r" />
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Razonamiento IA:</p>
                 <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{camp.reasoning}"</p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase">Audiencia Sugerida:</span>
                  <span className="bg-slate-900 text-white px-3 py-1 rounded-full font-black">{camp.audience.length} Clientes</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase">Impacto Estimado:</p>
                   <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(star => <div key={star} className={cn("h-1.5 flex-1 rounded-full", star <= (i === 0 ? 4 : 3) ? "bg-amber-400" : "bg-slate-200")} />)}
                   </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedCampaign(camp);
                  setActiveTemplate(null);
                }} 
                className={cn("mt-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95",
                  camp.color === 'blue' ? "bg-blue-600 text-white hover:bg-blue-700" : camp.color === 'emerald' ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-amber-500 text-white hover:bg-amber-600")}
              >
                {camp.actionLabel} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedCampaign && (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-100 space-y-8">
                 <div>
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Configurador de Campaña</h4>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Personalizar Mensaje Masivo</h3>
                 </div>

                 <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Paso 1: Seleccionar Plantilla Maestra</p>
                    <div className="grid grid-cols-1 gap-3">
                       {templates.map(temp => (
                          <div 
                            key={temp.id}
                            onClick={() => setActiveTemplate(temp)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setActiveTemplate(temp)}
                            className={cn("flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left cursor-pointer",
                              activeTemplate?.id === temp.id ? "bg-indigo-50 border-indigo-500 shadow-md" : "bg-white border-slate-100 hover:border-slate-200")}
                          >
                             <div className="flex items-center gap-4 flex-1">
                                <div className={cn("p-3 rounded-xl", temp.type === 'email' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600")}>
                                   {temp.type === 'email' ? <Mail className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                   <p className="text-sm font-black text-slate-800">{temp.name}</p>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase">{temp.type === 'email' ? 'Canal: Correo Electrónico' : 'Canal: WhatsApp Masivo'}</p>
                                </div>
                                {activeTemplate?.id === temp.id && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); setVariationIndex(v => v + 1); }}
                                     className="p-2 hover:bg-white rounded-full text-indigo-400 hover:text-indigo-600 transition-colors mr-1 group/refresh"
                                     title="Sugerir otra variación"
                                   >
                                     <RefreshCw className="w-4 h-4 group-hover/refresh:rotate-180 transition-transform duration-500" />
                                   </button>
                                )}
                             </div>
                             {activeTemplate?.id === temp.id && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                          </div>
                       ))}
                    </div>
                 </div>

                 <button 
                   onClick={() => {
                     if (!activeTemplate) return;
                     executeCampaign(
                       activeTemplate, 
                       selectedCampaign.audience.map((c: any) => c.email).filter(Boolean),
                       selectedCampaign.audience.map((c: any) => c.phone).filter(Boolean)
                     );
                   }}
                   disabled={!activeTemplate}
                   className={cn("w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
                     activeTemplate ? "bg-[#001736] text-white hover:bg-slate-800 shadow-xl" : "bg-slate-100 text-slate-400 cursor-not-allowed")}
                 >
                    {activeTemplate?.type === 'whatsapp' ? <MessageSquare className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                    Ejecutar Campaña Masiva
                 </button>
              </div>

                  <div className="p-8 lg:p-12 bg-slate-50/50 flex flex-col">
                     <div className="flex items-center justify-between mb-8">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <FileText className="w-4 h-4" /> Vista Previa del Mensaje
                        </h5>
                        {activeTemplate && (
                           <button 
                             onClick={() => setVariationIndex(v => v + 1)}
                             className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-indigo-500 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-slate-100 shadow-sm"
                           >
                             <RefreshCw className="w-3 h-3" /> Otra Opción AI
                           </button>
                        )}
                     </div>

                 {activeTemplate ? (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 flex-grow flex flex-col max-w-md mx-auto w-full">
                       <div className="bg-slate-900 p-4 flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-red-400" />
                          <div className="w-3 h-3 rounded-full bg-amber-400" />
                          <div className="w-3 h-3 rounded-full bg-emerald-400" />
                       </div>
                       <div className="p-6 lg:p-8 space-y-6">
                          {activeTemplate.type === 'email' && (
                             <div className="space-y-1 border-b border-slate-100 pb-4">
                                <p className="text-[10px] text-slate-400 font-black uppercase">Asunto:</p>
                                <p className="text-sm font-bold text-slate-800">{activeTemplate.subject}</p>
                             </div>
                          )}
                          <div className="space-y-1">
                             <p className="text-[10px] text-slate-400 font-black uppercase mb-4">Contenido del Mensaje:</p>
                             <div className={cn("p-6 rounded-2xl text-sm leading-relaxed relative", activeTemplate.type === 'email' ? "bg-blue-50 text-slate-700 shadow-inner" : "bg-emerald-50 text-slate-700 font-medium shadow-md border-l-4 border-emerald-400")}>
                                {currentBody}
                                {activeTemplate.type === 'whatsapp' && (
                                   <div className="mt-4 flex justify-between items-center bg-white/40 p-2 rounded-lg">
                                      <div className="flex gap-1">
                                         <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                         <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                         <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                      </div>
                                      <div className="px-3 py-1 bg-white/50 rounded-lg text-[10px] text-slate-400">12:45 PM ✓✓</div>
                                   </div>
                                )}
                             </div>
                          </div>
                          <div className="pt-6 border-t border-slate-100 flex items-center gap-4">
                             <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                <FileText className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-slate-900 uppercase">Firma Institucional</p>
                                <p className="text-[10px] text-slate-400 font-bold">Dpto. Comercial CIMASUR</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center opacity-30 select-none">
                       <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                          <Clock className="w-10 h-10 text-slate-400" />
                       </div>
                       <p className="text-sm font-black text-slate-500 uppercase tracking-widest max-w-[200px]">Selecciona una plantilla para ver la magia</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
         <div className="absolute top-0 right-0 p-8">
            <TrendingUp className="w-32 h-32 text-indigo-50 opacity-[0.05]" />
         </div>
         <div className="p-8 lg:p-10 border-b flex items-center justify-between relative z-10">
           <div>
              <h3 className="text-xl font-black text-[#001736] uppercase tracking-tighter italic">Oportunidades Sugeridas (Insights)</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Actualizado cada 5 minutos por el motor comercial</p>
           </div>
           <button className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
              <ExternalLink className="w-5 h-5 text-slate-400" />
           </button>
         </div>
         <div className="p-0 overflow-x-auto relative z-10">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-400">
               <tr>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] w-[25%] opacity-70">Cliente / Entidad</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] w-[15%] opacity-70 border-l border-slate-100">{isSchool ? 'Estado Pago' : 'Categoría'}</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] w-[30%] border-l border-slate-100">{isSchool ? 'Análisis Académico' : 'Motivo de Acción AI'}</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] w-[30%] border-l border-slate-100">Acción Recomendada</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {clients.slice(0, 10).map((client, i) => (
                 <tr className="group hover:bg-slate-50 transition-all" key={client.id || i}>
                    <td className="p-6">
                       <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{client.name || 'Sin nombre'}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{client.rut || 'RUT Pendiente'}</span>
                       </div>
                    </td>
                    <td className="p-6 border-l border-slate-100">
                       <span className={cn("px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest",
                         client.categoria === 'Gold' ? "bg-amber-100 text-amber-600 shadow-sm shadow-amber-50" : 
                         client.categoria === 'Bronce' ? "bg-orange-100 text-orange-600 shadow-sm shadow-orange-50" : 
                         "bg-slate-100 text-slate-500")}>
                         {client.categoria || 'Prospecto'}
                       </span>
                    </td>
                    <td className="p-6 border-l border-slate-100">
                       <div className="flex items-start gap-2">
                          <div className="w-1.5 h-6 bg-slate-200 rounded-full group-hover:bg-amber-400 transition-colors" />
                          <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-tighter opacity-80 group-hover:opacity-100 italic">
                             {client.categoria === 'Bronce' ? 'Potencial incremento Ticket Promedio' : 
                              !client.historialUnificado ? 'Sin actividad en últimos 60 días' : 
                              'Patrón de compra interrumpido'}
                          </p>
                       </div>
                    </td>
                    <td className="p-6 border-l border-slate-100 relative">
                        <button 
                            onClick={() => executeCampaign(templates[0], [client.email], [client.phone])}
                            className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group/btn hover:border-indigo-500 hover:shadow-lg transition-all"
                        >
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover/btn:text-indigo-600">Lanzar Reactivación</span>
                            <div className="p-2 bg-slate-50 rounded-xl group-hover/btn:bg-indigo-50 group-hover/btn:text-indigo-600 transition-colors text-slate-400">
                               <ArrowUpRight className="w-4 h-4" />
                            </div>
                        </button>
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
