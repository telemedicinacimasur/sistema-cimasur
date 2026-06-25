import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Activity, BrainCircuit, Target, Lightbulb, PlaySquare, 
  ChevronRight, RefreshCw, BarChart, Send, AlertCircle, Bot,
  MessageSquare, Mail, Share2, CheckCircle, FileText, Check, Copy
} from 'lucide-react';
import { localDB } from '../../lib/auth';

const normalizeCat = (val: any) => {
  const str = typeof val === 'string' ? val : '';
  if (!str) return 'sin categoria';
  const clean = str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  if (clean === '' || clean === '---' || clean === 'ninguna' || clean === 'ninguno' || clean === 'sin categoria') {
    return 'sin categoria';
  }
  return clean;
};

const CATEGORIAS_CRM = ['Sin compra', 'Sin categoría', 'Bronce', 'Plata', 'Oro', 'Platinum'];
const CATEGORIAS_SCHOOL = ['Médico Veterinario', 'Técnico', 'No califica', 'Sin información', 'Otro'];

// Preloaded template defaults to give immediate utility
const PRELOADED_TEMPLATES_CRM: Record<string, string> = {
  'Sin compra': "Estimado/a doctor/a {{NOMBRE}}, le saludamos de CIMASUR. Vemos que su acceso como médico veterinario ha sido aprobado de manera exitosa en nuestra plataforma Intranet. Ponemos a su disposición nuestro laboratorio homeopático para la elaboración de sus recetas magistrales, y para asegurar una excelente bienvenida, le ofrecemos un 15% de descuento exclusivo en su primer pedido de gotas puras, materias primas o tinturas. ¿Le gustaría cotizar sus fórmulas con nosotros hoy?",
  'Sin categoría': "Estimado/a {{NOMBRE}}, te saludamos de parte del equipo CIMASUR. Tenemos nuevos catálogos de diluciones y materias primas listos para entrega inmediata esta semana. ¿Podemos asistirte hoy?",
  'Bronce': "Hola {{NOMBRE}}, agradecemos tu preferencia técnica con CIMASUR. Como cliente BRONCE, tienes acceso a webinars clínicos mensuales gratuitos. Te invitamos a conocer el cronograma de este mes. ¡Hablemos!",
  'Plata': "Estimado/a {{NOMBRE}}, excelente día. Valoramos mucho tu recurrencia en CIMASUR. Queremos contarte que tu cuenta califica para el programa de envíos優先 priorizados. Contáctanos para coordinar tus despachos de esta semana.",
  'Oro': "¡Hola {{NOMBRE}}! Como miembro distinguido ORO en CIMASUR, cuentas con un canal de atención clínico prioritario y un 5% de descuento permanente en todas tus preparaciones y nosodes. ¿En qué podemos asesorarte hoy?",
  'Platinum': "Estimado/a doctor/a {{NOMBRE}}, un orgullo saludarle. Su cuenta PLATINUM en CIMASUR tiene habilitado despacho gratuito inmediato sin monto mínimo y asesoría técnica directa con el laboratorio jefe. Consúltenos el estatus de sus pedidos aquí."
};

const PRELOADED_TEMPLATES_SCHOOL: Record<string, string> = {
  'Médico Veterinario': "Estimado/a Dr./Dra. {{NOMBRE}}, le saludamos de la Escuela de Especialización CIMASUR. Iniciamos matrículas para el nuevo Postítulo en Homeopatía y Formulaciones Magistrales Veterinarias. Cupos limitados. ¿Le gustaría recibir el temario académico?",
  'Técnico': "Hola {{NOMBRE}}, paso por aquí desde Escuela CIMASUR. Te invitamos al nuevo Seminario Práctico sobre Diluciones Homotoxicológicas y manejo de stock de insumos. Conviértete en especialista homologado. ¿Te inscribimos?",
  'No califica': "Hola {{NOMBRE}}, te escribimos de Escuela CIMASUR. Tenemos cursos de capacitación abierta y charlas generales de introducción a la veterinaria integrativa que podrían interesarte. ¡Te esperamos!",
  'Sin información': "Hola {{NOMBRE}}, te saludamos de Escuela CIMASUR. Quisiéramos actualizar sus credenciales para enviarle invitaciones a congresos científicos afines a su perfil profesional. ¿Podría respondernos indicando si es Veterinario, Técnico o Estudiante?",
  'Otro': "Hola {{NOMBRE}}, gusto en saludarle de Escuela CIMASUR. Contamos con programas multidisciplinarios en terapias complementarias listos para comenzar. Solicite asesoría académica personalizada respondiendo este mensaje."
};

export function SmartCampaigns({ isSchool = false }: { isSchool?: boolean }) {
  const [clients, setClients] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  
  const categories = isSchool ? CATEGORIAS_SCHOOL : CATEGORIAS_CRM;
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);
  const [aiResult, setAiResult] = useState<{
    auditoria: string;
    ficha: { target: string; accion: string; kpi: string }[];
    pasos: string[];
    tipo_envio: "whatsapp" | "email";
    contenido: string;
  } | null>(null);

  // Broadcast campaign states
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [sentStatuses, setSentStatuses] = useState<Record<string, boolean>>({});
  const [isSavingLog, setIsSavingLog] = useState(false);

  useEffect(() => {
    setSelectedCategory(isSchool ? CATEGORIAS_SCHOOL[0] : CATEGORIAS_CRM[0]);
    setAiResult(null);
    setPrompt("");
    setSentStatuses({});
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

  // Load a beautiful preloaded template when changing category or channel
  useEffect(() => {
    const templates = isSchool ? PRELOADED_TEMPLATES_SCHOOL : PRELOADED_TEMPLATES_CRM;
    const defaultText = templates[selectedCategory] || "Hola {{NOMBRE}}, te saludamos de CIMASUR cobijas de salud técnica. ¿Cómo podemos colaborar con tus objetivos hoy?";
    setBroadcastMessage(defaultText);
    setBroadcastSubject(isSchool ? `Invitación Educativa CIMASUR - ${selectedCategory}` : `Innovación CIMASUR - Beneficios ${selectedCategory}`);
  }, [selectedCategory, isSchool]);

  const catClients = useMemo(() => {
    const targetCat = normalizeCat(selectedCategory);
    return clients.filter(c => {
      const cat = isSchool ? (c.clasificacion || 'Sin información') : (c.categoria || 'Sin categoría');
      return normalizeCat(cat) === targetCat;
    });
  }, [clients, selectedCategory, isSchool]);

  const lastActivity = useMemo(() => {
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
    setUsingLocalFallback(false);
    try {
      const actTitle = isSchool ? (lastActivity?.actividad || 'Ninguna actividad') : (lastActivity?.campania || 'Ninguna actividad registrada');
      const context = `
      Segmento analizado: ${selectedCategory}
      Volumen actual de ${isSchool ? 'alumnos/leads' : 'clientes'} en esta categoría: ${catClients.length}
      Última actividad enviada: ${lastActivity ? actTitle + ' ('+lastActivity.tipo+')' : 'Ninguna actividad registrada'}
      `;

      const reqRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, context, isSchool })
      });
      
      if (!reqRes.ok) {
        throw new Error('Error en Motor IA o falta de credenciales');
      }
      
      const parsed = await reqRes.json();
      
      setAiResult(parsed);
      
      // Auto-populate the broadcast templates with the AI outcome to optimize direct flow!
      if (parsed.contenido) {
        setBroadcastMessage(parsed.contenido);
        setChannel(parsed.tipo_envio || "whatsapp");
      }
    } catch (err) {
      console.warn("Utilizando generador local de CIMASUR debido a la falta de GEMINI_API_KEY en el servidor:", err);
      setUsingLocalFallback(true);

      const templates = isSchool ? PRELOADED_TEMPLATES_SCHOOL : PRELOADED_TEMPLATES_CRM;
      const defaultContent = templates[selectedCategory] || `Hola {{NOMBRE}}, le saluda Fernanda de CIMASUR. Esperamos colaborar con sus objetivos en ${selectedCategory}.`;

      const localResult = {
        auditoria: `[Generador Local CIMASUR] Análisis del segmento "${selectedCategory}": Se propone una campaña de fidelización y acercamiento personalizado. Al no estar configurada la GEMINI_API_KEY en el servidor, se han cargado las directrices y plantillas oficiales optimizadas de CIMASUR para este grupo de contactos.`,
        ficha: [
          {
            target: `Grupo de Contactos: ${selectedCategory}`,
            accion: isSchool 
              ? "Promover cursos magistrales, vademécum educativo y postítulos de la Escuela" 
              : "Ofrecer descuentos por volumen, envíos gratis y plazos excepcionales",
            kpi: isSchool ? "Inscritos e interesados (+20%)" : "Reposiciones y ventas en el mes (+25%)"
          },
          {
            target: `Canal Seleccionado`,
            accion: "Redactar y enviar mensaje con variables de personalización {{NOMBRE}}",
            kpi: "Tasa de lectura y clicks directos (+40%)"
          }
        ],
        pasos: [
          `1. Filtrar los destinatarios del segmento "${selectedCategory}" en la lista de abajo.`,
          "2. Revisar la plantilla sugerida de WhatsApp o Correo en la sección de envío.",
          "3. Personalizar con un clic y despachar a los socios seleccionados."
        ],
        tipo_envio: "whatsapp" as const,
        contenido: defaultContent
      };

      setAiResult(localResult);
      setBroadcastMessage(defaultContent);
      setChannel("whatsapp");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to replace markers per contact
  const personalizeMessage = (templateText: string, client: any) => {
    let text = templateText;
    text = text.replace(/{{NOMBRE}}/g, client.name || 'Cliente');
    text = text.replace(/{{CATEGORIA}}/g, client.categoria || selectedCategory);
    text = text.replace(/{{PROGRAMA}}/g, client.programa || 'Programa de Interés');
    return text;
  };

  const handleLaunchWhatsApp = (client: any, text: string) => {
    const rawNumber = client.phone || '';
    // Clean characters from phone line
    const cleanNum = rawNumber.replace(/[^\d+]/g, '');
    const personalizedText = personalizeMessage(text, client);
    const apiTarget = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanNum)}&text=${encodeURIComponent(personalizedText)}`;
    
    // Mark as messaged locally
    setSentStatuses(prev => ({ ...prev, [client.id || client.name]: true }));
    window.open(apiTarget, '_blank');
  };

  const handleLaunchEmail = (client: any, text: string) => {
    const mailTo = client.email || '';
    const personalizedText = personalizeMessage(text, client);
    const subject = personalizeMessage(broadcastSubject, client);
    
    // Copy the designed HTML or text directly to the clipboard for ease of pasting
    try {
      const el = document.createElement('textarea');
      el.value = personalizedText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch (e) {
      console.warn("Clipboard copy failed on iframe environment:", e);
    }

    const isHtml = personalizedText.includes('<html') || personalizedText.includes('<div') || personalizedText.includes('<!DOCTYPE');
    const mailtoBody = isHtml 
      ? `Estimado/a ${client.name || 'Doctor/a'},\n\nHe copiado al portapapeles el diseño elegante completo listo para aplicar en su correo (Gmail, Outlook, etc.). Por favor pulse Ctrl+V o pegar en el cuerpo del correo de envío.\n\nAtte,\nCIMASUR`
      : personalizedText;

    const mailtoUrl = `mailto:${encodeURIComponent(mailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`;
    
    setSentStatuses(prev => ({ ...prev, [client.id || client.name]: true }));
    
    // Safely attempt window.open with a try-catch to avoid crashing on blocked popups/iframes
    try {
      window.open(mailtoUrl, '_blank');
    } catch (err) {
      console.warn("Failed to open mailto url:", err);
    }

    alert(`📧 ¡Se copió el diseño completo para ${client.name} al portapapeles y se abrió el gestor de correo!\n\nSimplemente haz clic en "Pegar" (Ctrl+V o Click Derecho > Pegar) en tu correo para colocar la plantilla estilizada con todos sus colores y enlaces.`);
  };

  const handleApplyAICardContent = () => {
    if (aiResult?.contenido) {
      setBroadcastMessage(aiResult.contenido);
      setChannel(aiResult.tipo_envio);
      alert("¡Plantilla del Motor de IA aplicada con éxito!");
    }
  };

  const handleSaveBroadcastCampaign = async () => {
    if (catClients.length === 0) {
      alert("No hay destinatarios en el segmento actual para registrar.");
      return;
    }
    
    setIsSavingLog(true);
    try {
      const now = new Date();
      if (isSchool) {
        const payload = {
          createdAt: now.toISOString(),
          fecha: now.toISOString().split('T')[0],
          actividad: `Difusión Masiva: ${selectedCategory}`,
          tipo: channel === 'whatsapp' ? 'WhatsApp Directo' : 'Correo Directo',
          categoriaObjetivo: selectedCategory,
          responsable: 'Motor Comercial',
          detalles: `Mensaje enviado a segmento ${selectedCategory}: "${broadcastMessage.substring(0, 150)}..."`
        };
        await localDB.saveToCollection('school_activities', payload);
        setActivities(prev => [payload, ...prev]);
      } else {
        const payload = {
          createdAt: now.toISOString(),
          fecha: now.toISOString().split('T')[0],
          campania: `Difusión Masiva: ${selectedCategory}`,
          tipo: channel === 'whatsapp' ? 'WhatsApp Directo' : 'Correo Directo',
          targetCategories: [selectedCategory],
          estado: 'Completado',
          creador: 'Motor Comercial',
          detalles: `Mensaje enviado a segmento ${selectedCategory}: "${broadcastMessage.substring(0, 150)}..."`
        };
        await localDB.saveToCollection('crm_activities', payload);
        setActivities(prev => [payload, ...prev]);
      }
      alert("¡La campaña de difusión ha sido guardada con éxito en el Registro de Actividades!");
    } catch (e) {
      console.error(e);
      alert("Error al registrar actividad.");
    } finally {
      setIsSavingLog(false);
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
                    <button type="button" onClick={() => handleChip("Analiza la categoría 'Sin Compra' y propón una estrategia de primer descuento para activarlos esta semana.")} className="px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold uppercase hover:bg-rose-500/20 transition-all flex items-center gap-1.5">
                       🚨 Activar Sin Compra
                    </button>
                    <button type="button" onClick={() => handleChip("Analiza la categoría 'Sin categoría' y propón un plan integral para fidelizarlos, de modo de invitarlos a agendar una videollamada para definir su perfil comercial y motivar su recurrencia.")} className="px-4 py-1.5 rounded-full bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 text-[11px] font-bold uppercase hover:bg-[#38BDF8]/20 transition-all flex items-center gap-1.5">
                       🔍 Activar Sin Categoría
                    </button>
                    <button type="button" onClick={() => handleChip("Diseña un plan de upgrade para clientes Bronce y Plata. Ofrece envíos gratis mensuales para moverlos al tramo Oro.")} className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold uppercase hover:bg-emerald-500/20 transition-all flex items-center gap-1.5">
                       📈 Plan Upgrade (Bronce/Plata)
                    </button>
                    <button type="button" onClick={() => handleChip("Estructura un modelo de retención VIP para Oro y Platinum coubicando atención prioritaria y asesoría clínica.")} className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold uppercase hover:bg-amber-500/20 transition-all flex items-center gap-1.5">
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

        {/* 📢 2.5 NUEVO PANEL DE DIFUSIÓN COMERCIAL DIRECTA E INTERACTIVA */}
        <div className="bg-[#152035] rounded-3xl p-6 lg:p-8 border border-slate-700/60 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#38BDF8]" />
                <h3 className="text-lg font-black uppercase tracking-tighter text-white">📢 Panel de Difusión Directa</h3>
              </div>
              <p className="text-slate-400 text-xs mt-1">Personaliza y distribuye mensajes directos a tu segmento con WhatsApp y correo.</p>
            </div>
            
            <div className="flex gap-2 bg-[#0D1527] p-1 rounded-xl">
              <button
                onClick={() => setChannel('whatsapp')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${channel === 'whatsapp' ? 'bg-[#38BDF8] text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                onClick={() => setChannel('email')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${channel === 'email' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <Mail className="w-3.5 h-3.5" /> Email Directo
              </button>
            </div>
          </div>

          {/* Quick template customizer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-4">
              {channel === 'email' && (
                <div className="space-y-2">
                  <label className="text-[10.5px] uppercase font-black tracking-widest text-[#38BDF8]">Asunto del Correo</label>
                  <input
                    type="text"
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    className="w-full bg-[#0D1527] border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white focus:ring-1 outline-none"
                    placeholder="Asunto para la campaña..."
                  />
                  <p className="text-[9px] text-slate-500 font-medium">Puedes usar etiquetas como: <strong className="text-[#38BDF8]">&#123;&#123;NOMBRE&#125;&#125;</strong></p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10.5px] uppercase font-black tracking-widest text-[#38BDF8]">Escribe o Ajusta tu Plantilla Masiva</label>
                  {aiResult?.contenido && (
                    <button
                      onClick={handleApplyAICardContent}
                      className="text-[9px] bg-indigo-500/20 text-indigo-300 font-black px-2.5 py-1 rounded-md border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-1"
                    >
                      <Bot className="w-3 h-3" /> Usar contenido de la IA
                    </button>
                  )}
                </div>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full bg-[#0D1527] border border-slate-700 rounded-xl p-4 text-xs font-medium text-slate-200 h-32 focus:ring-1 outline-none resize-none"
                  placeholder="Redacta la plantilla..."
                />
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 items-center">
                  <span>Variables dinámicas disponibles:</span>
                  <span className="px-1.5 py-0.5 bg-slate-800 text-white font-mono rounded select-all">&#123;&#123;NOMBRE&#125;&#125;</span>
                  {!isSchool && <span className="px-1.5 py-0.5 bg-slate-800 text-white font-mono rounded select-all">&#123;&#123;CATEGORIA&#125;&#125;</span>}
                  {isSchool && <span className="px-1.5 py-0.5 bg-slate-800 text-white font-mono rounded select-all">&#123;&#123;PROGRAMA&#125;&#125;</span>}
                </div>
              </div>
            </div>

            {/* Live interactive previews panel */}
            <div className="lg:col-span-4 bg-[#0D1527] border border-slate-800 rounded-2xl p-4 space-y-4">
              <h4 className="text-[10.5px] uppercase font-black tracking-widest text-[#38BDF8] border-b border-slate-800 pb-2">Vista Previa Dinámica</h4>
              {catClients.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 bg-[#152035] px-3 py-1.5 rounded-lg border border-slate-800">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-300">Generando borrador para: {catClients[0].name}</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] leading-relaxed select-all max-h-40 overflow-y-auto font-medium">
                    {personalizeMessage(broadcastMessage, catClients[0])}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-[10px]">Sin destinatarios en la categoría seleccionada para previsualizar.</p>
              )}
              
              <div className="pt-2">
                <button
                  onClick={handleSaveBroadcastCampaign}
                  disabled={isSavingLog || catClients.length === 0}
                  className="w-full bg-[#1e293b] hover:bg-[#344155] border border-slate-700/60 text-white text-[10px] font-black uppercase tracking-widest py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" /> Registrar Difusión en Historial
                </button>
              </div>
            </div>
          </div>

          {/* List of prospects with active fast launch buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <h4 className="text-[11px] uppercase font-black tracking-widest text-white flex items-center gap-1.5">
                ⚡ Despacho Directo por Destinatario: <span className="text-[#38BDF8]">{catClients.length} Prospectos listos</span>
              </h4>
            </div>
            
            {catClients.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto border border-slate-800/80 rounded-xl custom-scrollbar bg-slate-900/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#111A2E]/50 border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider">Prospecto (Contacto)</th>
                      <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider">Contacto (Celular / Email)</th>
                      <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right">Lanzamiento Directo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catClients.map((client, idx) => {
                      const isSent = sentStatuses[client.id || client.name];
                      const contactInfo = channel === 'whatsapp' ? (client.phone || 'Sin número') : (client.email || 'Sin email');
                      
                      return (
                        <tr key={idx} className="border-b border-slate-800 hover:bg-[#152035]/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              {isSent ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              )}
                              <span className="font-bold text-white text-[11px] block truncate max-w-[200px]">{client.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-mono text-slate-400">{contactInfo}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {channel === 'whatsapp' ? (
                              <button
                                onClick={() => handleLaunchWhatsApp(client, broadcastMessage)}
                                className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-md tracking-wider transition-all inline-flex items-center gap-1.5 border ${isSent ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-green-600 hover:bg-green-500 text-white shadow-sm border-green-700'}`}
                              >
                                {isSent ? <Check className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                                {isSent ? 'Enviado' : 'WhatsApp'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLaunchEmail(client, broadcastMessage)}
                                className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-md tracking-wider transition-all inline-flex items-center gap-1.5 border ${isSent ? 'bg-[#38BDF8]/10 border-[#38BDF8]/20 text-[#38BDF8]' : 'bg-indigo-600 hover:bg-indigo-505 text-white shadow-sm border-indigo-700'}`}
                              >
                                {isSent ? <Check className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                                {isSent ? 'Enviado' : 'Enviar Email'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-900/10 border border-slate-800 rounded-xl">
                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-slate-400 text-[11px] font-bold">No hay prospectos o clientes registrados en la categoría "{selectedCategory}".</p>
                <p className="text-slate-600 text-[10px] mt-0.5">Asigne clientes a este segmento en el panel de registro comercial.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Consola de Outputs Estructurados de IA (Bloque Inferior) */}
        {aiResult && (
          <div className={`bg-[#152035] rounded-3xl border-2 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500 ${isSchool ? 'border-green-500/40 shadow-green-500/10' : 'border-indigo-500/40 shadow-indigo-500/10'}`}>
             
             {usingLocalFallback && (
               <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3.5 flex items-center gap-3 text-amber-400">
                 <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 animate-pulse" />
                 <span className="text-xs font-bold leading-relaxed">
                   <strong>Modo de Contingencia Activo:</strong> No se ha detectado la clave <code>GEMINI_API_KEY</code> en el servidor. El sistema ha activado de manera automática el generador inteligente local de CIMASUR para garantizar la continuidad operativa de sus campañas.
                 </span>
               </div>
             )}

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
                           <p className="text-sm font-bold text-[#38BDF8]">{f.accion}</p>
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
                   <div className="space-y-4 bg-white text-black p-6 rounded-2xl border border-slate-700 max-h-[600px] overflow-y-auto">
                      <div className="flex justify-end mb-2">
                         <button
                           type="button"
                           onClick={() => {
                             try {
                               const el = document.createElement('textarea');
                               el.value = aiResult.contenido;
                               document.body.appendChild(el);
                               el.select();
                               document.execCommand('copy');
                               document.body.removeChild(el);
                               alert("📋 ¡Código HTML de la plantilla copiado al portapapeles con éxito!");
                             } catch (err) {
                               alert("No se pudo copiar.");
                             }
                           }}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg uppercase tracking-widest text-[9px] transition-all cursor-pointer shadow-md"
                         >
                            <Copy className="w-3.5 h-3.5" /> Copiar HTML de la Plantilla
                         </button>
                      </div>
                      <iframe title="Previsualización de Email Seguro" srcDoc={aiResult.contenido} className="w-full h-[450px] border-0 rounded-xl bg-white" sandbox="allow-same-origin" />
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
