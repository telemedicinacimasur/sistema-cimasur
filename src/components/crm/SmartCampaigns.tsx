import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Activity, BrainCircuit, Target, Lightbulb, PlaySquare, 
  ChevronRight, RefreshCw, BarChart, Send, AlertCircle, Bot
} from 'lucide-react';
import { localDB } from '../../lib/auth';
import { GoogleGenAI, Type } from "@google/genai";

const CATEGORIAS_CRM = ['Sin compra', 'Sin categoría', 'Bronce', 'Plata', 'Oro', 'Platinum'];
const CATEGORIAS_SCHOOL = ['Médico Veterinario', 'Técnico', 'No califica', 'Sin información', 'Otro'];

export function SmartCampaigns({ isSchool = false }: { isSchool?: boolean }) {
  const [clients, setClients] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  
  const categories = isSchool ? CATEGORIAS_SCHOOL : CATEGORIAS_CRM;
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    auditoria: string;
    ficha: { target: string; accion: string; kpi: string }[];
    pasos: string[];
    tipo_envio: "whatsapp" | "email";
    contenido: string;
  } | null>(null);

  useEffect(() => {
    setSelectedCategory(isSchool ? CATEGORIAS_SCHOOL[0] : CATEGORIAS_CRM[1]);
    setAiResult(null);
    setPrompt("");
  }, [isSchool]);

  useEffect(() => {
    const load = async () => {
      if (isSchool) {
        const students = await localDB.getCollection('students');
        const leads = await localDB.getCollection('school_leads');
        setClients([...students, ...leads]);
        const acts = await localDB.getCollection('school_activities');
        setActivities(acts);
      } else {
        const contacts = await localDB.getCollection('contacts');
        setClients(contacts);
        const acts = await localDB.getCollection('crm_activities');
        setActivities(acts);
      }
    };
    load();
  }, [isSchool]);

  const catClients = useMemo(() => {
    return clients.filter(c => {
      const cat = isSchool ? (c.clasificacion || 'Sin información') : (c.categoria || 'Sin categoría');
      return cat.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [clients, selectedCategory, isSchool]);

  const lastActivity = useMemo(() => {
    // Buscar la última actividad que incluya esta categoría
    const relevant = activities.filter(a => {
      if (isSchool) {
        return a.categoriaObjetivo === 'Todos' || a.categoriaObjetivo === selectedCategory;
      } else {
        return a.targetCategories && a.targetCategories.includes(selectedCategory);
      }
    }).sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return relevant[0] || null;
  }, [activities, selectedCategory, isSchool]);

  const handleChip = (text: string) => {
    setPrompt(text);
  };

  const generateAIPlan = async () => {
    if (!prompt) {
       alert("Por favor, ingresa instrucciones para el Motor de IA.");
       return;
    }
    setIsGenerating(true);
    try {
      if (!process.env.GEMINI_API_KEY) {
        alert("Falta configurar la GEMINI_API_KEY.");
        setIsGenerating(false);
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const actTitle = isSchool ? (lastActivity?.actividad || 'Ninguna actividad') : (lastActivity?.campania || 'Ninguna actividad registrada');
      const context = `
      Segmento analizado: ${selectedCategory}
      Volumen actual de ${isSchool ? 'alumnos/leads' : 'clientes'} en esta categoría: ${catClients.length}
      Última actividad enviada: ${lastActivity ? actTitle + ' ('+lastActivity.tipo+')' : 'Ninguna actividad registrada'}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Eres un Motor de IA de Estrategia Analítica para ${isSchool ? 'Escuela CIMASUR (Educación Médica)' : 'CIMASUR Comercial'}. Contexto actual:\n${context}\n\nInstrucciones del usuario: "${prompt}".\n\nGenera un plan estratégico que devuelva un objeto JSON con los siguientes campos obligatorios:\n- "auditoria": Un diagnóstico profundo del impacto promocional previo o situación actual (1 párrafo).\n- "ficha": Un array de 3 objetos, cada uno con "target" (a quién va dirigido específicamente), "accion" (qué hacer), y "kpi" (qué indicador mejorar).\n- "pasos": Un array de strings con 3-5 pasos operativos inmediatos para el gestor del sistema.\n- "tipo_envio": Debe ser estrictamente "whatsapp" o "email" dependiendo del canal estratégico óptimo.\n- "contenido": Si "tipo_envio" es "whatsapp", proporciona un texto de mensaje altamente persuasivo junto con sugerencias de emojis/imagen. Si es "email", proporciona CÓDIGO HTML COMPLETO de una plantilla lista para enviar por correo, con diseño limpio y atractivo usando colores corporativos, tablas y listados si aplica.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              auditoria: { type: Type.STRING },
              ficha: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    target: { type: Type.STRING },
                    accion: { type: Type.STRING },
                    kpi: { type: Type.STRING }
                  },
                  required: ["target", "accion", "kpi"]
                }
              },
              pasos: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              tipo_envio: { type: Type.STRING, enum: ["whatsapp", "email"] },
              contenido: { type: Type.STRING }
            },
            required: ["auditoria", "ficha", "pasos", "tipo_envio", "contenido"]
          }
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      setAiResult(parsed);
    } catch (err) {
      console.error(err);
      alert("Error al comunicarse con la IA. Revisa consola.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 bg-[#0D1527] min-h-screen text-slate-200">
      
      {/* 1. Estructura de Control e Input (Nivel Superior) */}
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-xl shadow-lg border ${isSchool ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400' : 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400'}`}>
                <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                 {isSchool ? 'Motor IA Escuela CIMASUR' : 'Motor IA Comercial'}
               </h2>
               <p className="text-slate-400 text-sm font-medium">Dashboard Estratégico & Filtros Corporativos</p>
            </div>
        </div>

        <div className="bg-[#152035] rounded-3xl p-6 lg:p-8 border border-slate-800 shadow-2xl space-y-6">
           <div className="space-y-2">
             <label className={`text-xs font-black uppercase tracking-widest ${isSchool ? 'text-green-400' : 'text-indigo-400'}`}>
               {isSchool ? 'Filtrar Clasificación Profesional' : 'Filtrar Categoría Comercial'}
             </label>
             <select 
               className={`w-full lg:w-1/3 bg-[#0D1527] border border-slate-700 text-white rounded-xl px-4 py-3 font-bold focus:ring-2 outline-none ${isSchool ? 'focus:ring-green-500' : 'focus:ring-indigo-500'}`}
               value={selectedCategory}
               onChange={(e) => setSelectedCategory(e.target.value)}
             >
               {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>

           <div className="space-y-4 pt-4 border-t border-slate-800/50">
             <div className="flex flex-wrap gap-2">
                {isSchool ? (
                  <>
                    <button onClick={() => handleChip("Analiza la categoría 'Médico Veterinario' y propón una estrategia de reclutamiento basada en contenido de especialidad clínica.")} className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold uppercase hover:bg-blue-500/20 transition-all flex items-center gap-1.5">
                       🎓 Captar Veterinarios
                    </button>
                    <button onClick={() => handleChip("Diseña un plan de capacitación básica e incentivos exclusivos para la categoría 'Técnico' buscando que se inscriban en próximos seminarios.")} className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold uppercase hover:bg-emerald-500/20 transition-all flex items-center gap-1.5">
                       🚀 Activar Técnicos
                    </button>
                    <button onClick={() => handleChip("Genera una campaña de perfilamiento para los contactos 'Sin información' ofreciendo material gratuito a cambio de actualizar sus datos profesionales.")} className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold uppercase hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
                       💡 Recuperar 'Sin información'
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleChip("Analiza la categoría 'Sin Compra' y propón una estrategia agresiva de primer descuento (20%) para activarlos esta semana.")} className="px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold uppercase hover:bg-rose-500/20 transition-all flex items-center gap-1.5">
                       🚨 Activar Sin Compra
                    </button>
                    <button onClick={() => handleChip("Diseña un plan de upgrade para clientes Bronce y Plata. Ofrece envíos gratis mensuales para forzarlos al tramo Oro.")} className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold uppercase hover:bg-emerald-500/20 transition-all flex items-center gap-1.5">
                       📈 Plan Upgrade (Bronce/Plata)
                    </button>
                    <button onClick={() => handleChip("Estructura un modelo de retención VIP para Oro y Platinum. Foco en atención prioritaria y asesoría clínica gratuita.")} className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold uppercase hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
                       💎 Retención Oro/Platinum
                    </button>
                  </>
                )}
             </div>
             
             <textarea 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="Escribe tus instrucciones para la IA aquí, o selecciona un atajo rápido arriba..."
               className={`w-full bg-[#0D1527] border border-slate-700 rounded-2xl p-5 text-sm font-medium text-slate-200 focus:ring-1 outline-none h-32 resize-none ${isSchool ? 'focus:border-green-500 focus:ring-green-500' : 'focus:border-indigo-500 focus:ring-indigo-500'}`}
             />

             <div className="flex justify-end">
                <button 
                  onClick={generateAIPlan}
                  disabled={isGenerating}
                  className={`text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 ${isSchool ? 'bg-green-600 hover:bg-green-500 shadow-green-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}
                >
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  {isGenerating ? "Procesando..." : "Ejecutar Motor IA"}
                </button>
             </div>
           </div>
        </div>

        {/* 2. Espejo de Métricas Pasivas de Captación (Bloque Central) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className={`bg-[#152035] p-6 rounded-3xl border flex items-start gap-4 ${isSchool ? 'border-green-900/30' : 'border-blue-900/30'}`}>
              <div className={`p-3 rounded-xl ${isSchool ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                 <Users className={`w-6 h-6 ${isSchool ? 'text-green-400' : 'text-blue-400'}`} />
              </div>
              <div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tarjeta de Captación</h4>
                 <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{catClients.length}</span>
                    <span className="text-xs text-slate-400">{isSchool ? 'Perfiles Captados' : 'Clientes Atrapados'}</span>
                 </div>
                 <p className="text-xs mt-1 text-slate-500">En la categoría: <strong className={isSchool ? "text-green-400" : "text-blue-400"}>{selectedCategory}</strong></p>
              </div>
           </div>

           <div className="bg-[#152035] p-6 rounded-3xl border border-emerald-900/30 flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                 <Activity className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tarjeta de Actividad</h4>
                 {lastActivity ? (
                   <div className="mt-2">
                     <p className="text-sm font-bold text-emerald-400 leading-tight">{isSchool ? lastActivity.actividad : lastActivity.campania}</p>
                     <p className="text-[10px] text-slate-400 uppercase mt-1">Tipo: {lastActivity.tipo}</p>
                   </div>
                 ) : (
                   <div className="mt-2">
                     <p className="text-sm font-bold text-slate-500 leading-tight">Sin impactos recientes</p>
                     <p className="text-[10px] text-slate-600 uppercase mt-1">No hay historial en Firebase</p>
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* 3. Consola de Outputs Estructurados de IA (Bloque Inferior) */}
        {aiResult && (
          <div className={`bg-[#152035] rounded-3xl border-2 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500 ${isSchool ? 'border-green-500/40 shadow-green-500/10' : 'border-indigo-500/40 shadow-indigo-500/10'}`}>
             
             {/* Auditoría */}
             <div className={`p-8 border-b ${isSchool ? 'border-green-500/10 bg-green-900/10' : 'border-indigo-500/10 bg-indigo-900/10'}`}>
                <div className="flex items-center gap-2 mb-4">
                   <Target className={`w-5 h-5 ${isSchool ? 'text-green-400' : 'text-indigo-400'}`} />
                   <h3 className={`font-black uppercase tracking-widest text-sm ${isSchool ? 'text-green-400' : 'text-indigo-400'}`}>Auditoría y Análisis Crítico</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{aiResult.auditoria}</p>
             </div>

             {/* Ficha */}
             <div className={`p-8 border-b ${isSchool ? 'border-green-500/10' : 'border-indigo-500/10'} bg-[#111A2E]/50`}>
                <div className="flex items-center gap-2 mb-6">
                   <BarChart className="w-5 h-5 text-emerald-400" />
                   <h3 className="font-black uppercase tracking-widest text-emerald-400 text-sm">Ficha de Campaña Estratégica</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {aiResult.ficha.map((f, i) => (
                     <div key={i} className="bg-[#152035] border border-slate-700/50 p-5 rounded-2xl flex flex-col gap-3">
                        <div>
                           <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Target</p>
                           <p className="text-xs font-bold text-slate-200">{f.target}</p>
                        </div>
                        <div className="h-px bg-slate-800" />
                        <div>
                           <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Acción</p>
                           <p className="text-sm font-bold text-blue-400">{f.accion}</p>
                        </div>
                        <div className="h-px bg-slate-800" />
                        <div>
                           <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">KPI Proyectado</p>
                           <p className="text-xs font-bold text-emerald-400">{f.kpi}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             {/* Pasos */}
             <div className="p-8 bg-[#152035]">
                <div className="flex items-center gap-2 mb-6">
                   <PlaySquare className="w-5 h-5 text-amber-400" />
                   <h3 className="font-black uppercase tracking-widest text-amber-400 text-sm">Pasos Operativos</h3>
                </div>
                <ul className="space-y-4">
                   {aiResult.pasos.map((paso, i) => (
                     <li key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black shrink-0">
                           {i + 1}
                        </div>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed pt-0.5">{paso}</p>
                     </li>
                   ))}
                </ul>
             </div>

             {/* Contenido Generado */}
             <div className="p-8 border-t border-slate-700/50 bg-[#111A2E]/50">
                <div className="flex items-center gap-2 mb-6">
                   <Send className={`w-5 h-5 ${isSchool ? 'text-green-400' : 'text-indigo-400'}`} />
                   <h3 className={`font-black uppercase tracking-widest text-sm ${isSchool ? 'text-green-400' : 'text-indigo-400'}`}>
                      Contenido Sugerido ({aiResult.tipo_envio?.toUpperCase()})
                   </h3>
                </div>
                {aiResult.tipo_envio === 'whatsapp' ? (
                   <div className="bg-[#0D1527] p-6 rounded-2xl border border-green-500/30 whitespace-pre-wrap text-sm text-slate-300 font-medium">
                      {aiResult.contenido}
                   </div>
                ) : (
                   <div className="bg-white text-black p-6 rounded-2xl border border-slate-700 max-h-[600px] overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: aiResult.contenido }} />
                   </div>
                )}
             </div>

             {/* Destinatarios */}
             <div className="p-8 border-t border-slate-700/50 bg-[#152035]">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-2">
                       <Users className="w-5 h-5 text-blue-400" />
                       <h3 className="font-black uppercase tracking-widest text-blue-400 text-sm">Destinatarios Seleccionados</h3>
                   </div>
                   <span className="text-xs font-black bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                       {catClients.length} prospectos
                   </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                   {catClients.map((client, i) => (
                      <div key={i} className="flex flex-col p-3 rounded-xl bg-[#0D1527] border border-slate-800 hover:border-slate-600 transition-colors">
                         <span className="text-xs font-bold text-white truncate">{client.name}</span>
                         <span className="text-[10px] text-slate-400 truncate">{client.email || client.phone || 'Sin datos de contacto'}</span>
                      </div>
                   ))}
                </div>
             </div>

          </div>
        )}

      </div>
    </div>
  );
}
