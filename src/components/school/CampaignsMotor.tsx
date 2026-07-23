import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Sparkles, Copy, Save, Filter, User, Calendar, 
  AlertTriangle, TrendingUp, Send, Check, RotateCcw, FileText, 
  Phone, Mail, BookOpen, Heart, ChevronRight, Play, Award, HelpCircle,
  Brain, UploadCloud, X, Plus
} from 'lucide-react';
import { localDB, addAuditLog } from '../../lib/auth';
import { cn } from '../../lib/utils';

// Default realistic WhatsApp chat scenarios for testing
const MOCK_SCENARIOS = [
  {
    id: 'horarios_tiempo',
    title: '⏱️ Objeción: Turnos Rotativos y Horarios',
    description: 'Cliente interesado pero con poco tiempo por turnos veterinarios.',
    chat: `[10:15 AM, 15/7/2026] Dr. Francisco: Hola, buenas. Soy Médico Veterinario y vi su publicidad sobre el Diplomado de Homeopatía Clínica. Me interesa saber los precios e inscripciones.
[10:18 AM, 15/7/2026] CIMASUR Escuela: ¡Hola Dr. Francisco! Qué gusto saludarte. Sí, por supuesto. El Diplomado en Homeopatía Veterinaria está diseñado especialmente para veterinarios. Dura 6 meses con clases online en vivo y talleres prácticos de casos clínicos. El valor regular es de $1,200,000 CLP, pero tenemos matrícula costo cero esta semana.
[10:22 AM, 15/7/2026] Dr. Francisco: Ah, perfecto. ¿Y entregan alguna certificación válida? ¿Tiene algún respaldo institucional? Es que he tomado otros cursos y a veces no tienen validez oficial.
[10:25 AM, 15/7/2026] CIMASUR Escuela: Sí, claro. Está certificado por el Centro Académico CIMASUR, con reconocimiento internacional y código de validación QR. Además, te entregamos un Vademécum Físico de Homeopatía al matricularte.
[10:30 AM, 15/7/2026] Dr. Francisco: Excelente, me llama la atención. Lo único es que ando un poco complicado de tiempo este mes porque tengo turnos rotativos en mi clínica. ¿Las clases quedan grabadas para poder verlas después en la noche?
[10:35 AM, 15/7/2026] CIMASUR Escuela: ¡Hola! Sí, absolutamente todas las clases quedan grabadas en alta definición en nuestra intranet de alumnos. Puedes acceder a ellas 24/7 de forma ilimitada durante todo el año, así que se adapta perfecto a tus turnos rotativos.
[10:42 AM, 15/7/2026] Dr. Francisco: Súper. Déjame conversarlo con mi colega de la clínica para coordinar gastos y te aviso hoy por la tarde para realizar el pago si es que nos acomodan las cuotas. ¿Tienen facilidades de pago con tarjeta o transferencia en cuotas?`
  },
  {
    id: 'precio_costo',
    title: '💰 Objeción: Precio y Descuentos',
    description: 'Cliente muy interesado pero preocupado por el valor monetario del programa.',
    chat: `[09:05 AM, 12/7/2026] Dra. Camila: Estimados, buenos días. Vi la publicación del curso de terapéutica homeopática. Me gustaría saber si hay algún descuento para veterinarios recién egresados. El costo se me hace un poco elevado para pagarlo al contado.
[09:12 AM, 12/7/2026] CIMASUR Escuela: ¡Buenos días Dra. Camila! Felicitaciones por tu egreso. Sí, entendemos perfectamente. Para médicos recién egresados (hasta 2 años de titulación) contamos con una beca especial de 15% de descuento en el arancel completo. El valor regular es de $1,200,000, pero te quedaría en $1,020,000 CLP, pudiendo pactarlo hasta en 6 cuotas sin interés.
[09:20 AM, 12/7/2026] Dra. Camila: Entiendo. ¿Y la beca cubre también los materiales del taller práctico? ¿O eso tiene un cobro aparte?
[09:25 AM, 12/7/2026] CIMASUR Escuela: ¡Excelente pregunta! La beca cubre todo el material digital, clases en vivo, grabaciones y la emisión del diploma. El único cobro adicional opcional es si deseas el envío a domicilio del kit físico de diluciones homeopáticas, que tiene un costo de $35,000 CLP. O si prefieres, te damos las fórmulas exactas para que las consigas en tu farmacia de confianza.
[09:33 AM, 12/7/2026] Dra. Camila: Ya, genial. Me parece bien. ¿Es posible pagar la primera cuota a fin de mes o tiene que ser ahora ya para reservar la beca? Es que me pagan el 28 y ahí tendría la liquidez.`
  },
  {
    id: 'validez_cert',
    title: '📜 Objeción: Aval y Validez Científica',
    description: 'Veterinario escéptico que quiere asegurar el respaldo clínico de la homeopatía.',
    chat: `[11:40 AM, 10/7/2026] Dr. Marcelo: Hola. Me interesa el Diplomado, pero tengo una consulta importante. ¿Este programa cuenta con algún aval de sociedades científicas veterinarias o ministeriales? Lo pregunto porque en el gremio a veces hay recelo sobre la homeopatía, y quiero asegurar que el contenido sea estrictamente científico y basado en evidencia.
[11:50 AM, 10/7/2026] CIMASUR Escuela: Estimado Dr. Marcelo, excelente acotación. En CIMASUR nuestro enfoque es estrictamente clínico-científico. Todo el cuerpo académico está formado por MV con postgrados y amplia trayectoria en clínica homeopática. El programa cuenta con el patrocinio del Centro de Medicina Veterinaria Integrativa y está adaptado bajo las directrices de la Farmacopea Homeopática.
[12:00 PM, 10/7/2026] Dr. Marcelo: Perfecto. ¿Y se estudian casos clínicos reales o es pura teoría histórica? Me interesa sobre todo la aplicación práctica en clínica de pequeños animales (perros y gatos) con patologías crónicas.
[12:10 PM, 10/7/2026] CIMASUR Escuela: Es 80% práctico, Dr. Marcelo. Cada módulo incluye análisis de casos clínicos reales, dosificación de fórmulas, análisis de repertorización y discusión interactiva. De hecho, puedes traer casos de tus propios pacientes para resolverlos en clase con los profesores de manera colaborativa.
[12:22 PM, 10/7/2026] Dr. Marcelo: Eso suena muy interesante y útil. ¿Me podrían enviar el plan de estudios completo y los perfiles de los docentes por correo para revisarlo en detalle antes de confirmar?`
  },
  {
    id: 'listo_matricula',
    title: '🔥 Alta Intención: Listo para Matricular',
    description: 'Lead calificado que tiene la decisión tomada y solo falta el enlace de pago.',
    chat: `[14:15 PM, 18/7/2026] Dra. Andrea: Hola, estuve revisando el plan de estudios del Diplomado de Medicina Homeopática Veterinaria y me parece fantástico. Me decidí a tomarlo. ¿Cuáles son los pasos a seguir para matricularme hoy mismo? Quiero asegurar el vademécum de regalo.
[14:22 PM, 18/7/2026] CIMASUR Escuela: ¡Hola Dra. Andrea! Qué excelente decisión, nos alegra muchísimo tenerte con nosotros en esta generación. Al matricularte hoy, aseguras tu cupo de inmediato y el despacho sin costo de tu Vademécum Físico CIMASUR a tu domicilio. El proceso es muy sencillo: necesitamos tu RUT, Nombre completo, Correo electrónico y Dirección de envío. ¿Te acomoda realizar el pago mediante Webpay (tarjeta de crédito/débito) o transferencia bancaria directa?
[14:30 PM, 18/7/2026] Dra. Andrea: Súper. Prefiero transferencia bancaria directa, me resulta más rápido. Les envío mis datos ahora mismo: Andrea Belén Tapia Ruiz, RUT 17.543.882-K, andrea.tapia.vet@gmail.com, dirección Av. Providencia 1420, dpto 402, Santiago. Por favor mándenme los datos bancarios para hacer la transferencia del arancel completo con el descuento.
[14:35 PM, 18/7/2026] CIMASUR Escuela: ¡Espectacular, Dra. Andrea! Datos registrados con éxito. Aquí tienes los datos de nuestra cuenta corriente: Banco Estado, Cuenta Corriente N° 34910293, Rut 76.290.380-5, a nombre de Centro Académico CIMASUR. Una vez hecha la transferencia, me envías el comprobante por este medio y procederé a activar tu cuenta en la intranet.`
  }
];

export function CampaignsMotor() {
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<'mv_only' | 'all'>('mv_only');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Workspace chat state
  const [chatLog, setChatLog] = useState('');
  const [isEditingChat, setIsEditingChat] = useState(false);
  
  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    interestLevel: 'Frío' | 'Tibio' | 'Caliente';
    summary: string;
    objections: string[];
    nextAction: string;
    suggestedMessage: string;
  } | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // WhatsApp Bulk Import / Upload State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [isParsingExport, setIsParsingExport] = useState(false);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [selectedExistingLeadId, setSelectedExistingLeadId] = useState<string>('');
  const [saveParsedLoading, setSaveParsedLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleParseWhatsAppExport = async () => {
    if (!importRawText.trim()) return;
    setIsParsingExport(true);
    setParsedResult(null);
    try {
      const response = await fetch('/api/ai/parse-whatsapp-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rawText: importRawText,
          fileName: importFileName || 'Mensaje de texto pegado.txt'
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al procesar el chat.');
      }
      const data = await response.json();
      setParsedResult(data);
    } catch (err: any) {
      alert('Error al parsear el chat con Gemini: ' + err.message);
    } finally {
      setIsParsingExport(false);
    }
  };

  const handleSaveParsedLead = async (asNew: boolean, targetLeadIdOverride?: string) => {
    if (!parsedResult) return;
    setSaveParsedLoading(true);
    try {
      const currentDate = new Date().toLocaleString('es-CL');
      const analysisSummaryText = `\n[${currentDate}] 🤖 ANÁLISIS DE IMPORTACIÓN DE CHAT (Motor IA):\n` +
        `• Nivel de Interés: ${parsedResult.interestLevel}\n` +
        `• Resumen: ${parsedResult.summary}\n` +
        `• Objeciones: ${parsedResult.objections?.join(', ') || 'Ninguna'}\n` +
        `• Acción Recomendada: ${parsedResult.nextAction}`;

      if (asNew) {
        // Create a new lead
        const newLeadId = 'lead_' + Date.now();
        const newLeadObj = {
          id: newLeadId,
          name: parsedResult.leadName || 'Dr. Alumno Interesado',
          rut: '',
          email: parsedResult.leadEmail || '',
          phone: parsedResult.leadPhone || '',
          clasificacion: parsedResult.leadClasificacion || 'Médico Veterinario',
          interes: parsedResult.interes || 'Diplomado Homeopatía Clínica',
          fecha: new Date().toISOString().split('T')[0],
          observaciones: `[SISTEMA - IMPORTACIÓN DE CHAT WHATSAPP]\n` + (parsedResult.summary || '') + `\n${analysisSummaryText}`,
          pago: 'Pendiente',
          avance: 0,
          canalOrigen: '💬 WhatsApp',
          whatsappChatLog: parsedResult.cleanedChatLog,
          interestLevel: parsedResult.interestLevel,
          aiAnalysis: JSON.stringify(parsedResult)
        };

        await localDB.saveToCollection('school_leads', newLeadObj);
        
        // Add audit log
        const user = JSON.parse(localStorage.getItem('cimasur_user') || '{}');
        await addAuditLog(user, `Creó nuevo Lead desde Importador de Chat: ${newLeadObj.name}`, 'SCHOOL');
        
        alert(`¡Excelente! Se ha creado un nuevo Lead: ${newLeadObj.name} y se ha guardado su chat con el análisis de IA.`);
        
        // select newly created lead
        setSelectedLead(newLeadObj);
      } else {
        // Associate with existing lead
        const targetId = targetLeadIdOverride || selectedExistingLeadId;
        if (!targetId) {
          alert('Por favor selecciona un Lead existente de la lista.');
          setSaveParsedLoading(false);
          return;
        }

        const existingLead = leads.find(l => l.id === targetId);
        if (!existingLead) {
          alert('Lead seleccionado no encontrado.');
          setSaveParsedLoading(false);
          return;
        }

        const updatedNotes = (existingLead.observaciones || '') + `\n\n--- NUEVO CHAT WHATSAPP IMPORTADO ---\n` + analysisSummaryText;
        
        const updates: any = {
          observaciones: updatedNotes,
          whatsappChatLog: parsedResult.cleanedChatLog,
          interestLevel: parsedResult.interestLevel,
          aiAnalysis: JSON.stringify(parsedResult)
        };

        // Update name, phone, and email if they are newly extracted or corrected by the user in the modal
        if (parsedResult.leadPhone && (!existingLead.phone || existingLead.phone === '')) {
          updates.phone = parsedResult.leadPhone;
        } else if (parsedResult.leadPhone && existingLead.phone !== parsedResult.leadPhone) {
          // If the user modified or the extracted value is more complete
          updates.phone = parsedResult.leadPhone;
        }

        if (parsedResult.leadEmail && (!existingLead.email || existingLead.email === '')) {
          updates.email = parsedResult.leadEmail;
        } else if (parsedResult.leadEmail && existingLead.email !== parsedResult.leadEmail) {
          updates.email = parsedResult.leadEmail;
        }

        const genericNames = ['dr. mv interesado', 'dr. veterinario interesado', 'dr. alumno interesado', 'alumno interesado', 'veterinario interesado', 'dr. veterinario'];
        const isGenericName = !existingLead.name || genericNames.includes(existingLead.name.toLowerCase().trim());
        if (parsedResult.leadName && (isGenericName || existingLead.name !== parsedResult.leadName)) {
          updates.name = parsedResult.leadName;
        }

        await localDB.updateInCollection('school_leads', existingLead.id, updates);

        // Add audit log
        const user = JSON.parse(localStorage.getItem('cimasur_user') || '{}');
        await addAuditLog(user, `Importó y asoció chat de WhatsApp para Lead existente: ${existingLead.name}`, 'SCHOOL');

        alert(`¡Excelente! Se ha actualizado la ficha de ${updates.name || existingLead.name} con el chat importado, teléfono, correo y el diagnóstico de IA.`);
        
        // Update local state to keep sync
        setSelectedLead({
          ...existingLead,
          ...updates
        });
      }

      // Close modal & reset states
      setIsImportModalOpen(false);
      setImportRawText('');
      setParsedResult(null);
      setSelectedExistingLeadId('');
      
      // Trigger global event so lists re-render
      window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'school_leads' } }));
      loadLeads();
    } catch (e: any) {
      alert('Error al guardar datos: ' + e.message);
    } finally {
      setSaveParsedLoading(false);
    }
  };

  // Helper to find a duplicate lead based on name, email, or phone
  const findMatchingLead = (parsed: any) => {
    if (!parsed) return null;
    const parsedName = (parsed.leadName || '').toLowerCase().trim();
    const parsedPhone = (parsed.leadPhone || '').replace(/\D/g, '').trim();
    const parsedEmail = (parsed.leadEmail || '').toLowerCase().trim();

    return leads.find(l => {
      const lName = (l.name || '').toLowerCase().trim();
      const lPhone = (l.phone || '').replace(/\D/g, '').trim();
      const lEmail = (l.email || '').toLowerCase().trim();

      // Check if emails match exactly
      if (parsedEmail && lEmail && parsedEmail === lEmail) return true;

      // Check if phone matches (comparing last 8 digits)
      if (parsedPhone && lPhone) {
        const cleanP1 = parsedPhone.slice(-8);
        const cleanP2 = lPhone.slice(-8);
        if (cleanP1.length >= 6 && cleanP2.length >= 6 && cleanP1 === cleanP2) return true;
      }

      // Check name similarity
      if (parsedName && lName) {
        if (parsedName === lName) return true;

        // Clean common prefixes to prevent mismatched comparisons
        const cleanPName = parsedName.replace(/^(dr\.?\s+|dra\.?\s+|médico\s+|veterinario\s+|m\.v\.\s+)/i, '');
        const cleanLName = lName.replace(/^(dr\.?\s+|dra\.?\s+|médico\s+|veterinario\s+|m\.v\.\s+)/i, '');

        if (cleanPName === cleanLName) return true;

        const words = cleanPName.split(/\s+/).filter((w: string) => w.length > 2);
        if (words.length > 0) {
          const matchCount = words.filter((w: string) => cleanLName.includes(w)).length;
          // If 2 words match, or 1 unique word of substantial length matches
          if (matchCount >= 2 || (words.length === 1 && cleanLName.includes(words[0]) && words[0].length > 4)) return true;
        }
      }

      return false;
    });
  };

  // Automatically pre-select existing lead if a match is found
  useEffect(() => {
    if (parsedResult) {
      const match = findMatchingLead(parsedResult);
      if (match) {
        setSelectedExistingLeadId(match.id);
      } else {
        setSelectedExistingLeadId('');
      }
    }
  }, [parsedResult, leads]);

  // Load leads from indexedDB
  const loadLeads = async () => {
    try {
      const allLeads = await localDB.getCollection('school_leads');
      setLeads(allLeads);
    } catch (e) {
      console.error("Error loading leads in CampaignsMotor:", e);
    }
  };

  useEffect(() => {
    loadLeads();
    const handleDbChange = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.collection || detail.collection === 'school_leads' || detail.collection === 'students') {
        loadLeads();
      }
    };
    window.addEventListener('db-change', handleDbChange);
    return () => window.removeEventListener('db-change', handleDbChange);
  }, []);

  // Filter leads according to search term and veterinary classification filter
  useEffect(() => {
    let result = [...leads];
    
    if (filterType === 'mv_only') {
      result = result.filter(l => l.clasificacion === 'Médico Veterinario');
    }
    
    if (searchTerm.trim() !== '') {
      const s = searchTerm.toLowerCase();
      result = result.filter(l => 
        (l.name || '').toLowerCase().includes(s) || 
        (l.rut || '').toLowerCase().includes(s) ||
        (l.email || '').toLowerCase().includes(s) ||
        (l.phone || '').toLowerCase().includes(s) ||
        (l.interes || '').toLowerCase().includes(s)
      );
    }
    
    setFilteredLeads(result);
  }, [leads, filterType, searchTerm]);

  // Set default chat log when selecting a lead
  useEffect(() => {
    if (selectedLead) {
      if (selectedLead.whatsappChatLog) {
        setChatLog(selectedLead.whatsappChatLog);
      } else {
        // Find if a scenario suits them or use standard default
        const matchedScenario = MOCK_SCENARIOS.find(s => 
          selectedLead.name.toLowerCase().includes('andrea') && s.id === 'listo_matricula' ||
          selectedLead.name.toLowerCase().includes('francisco') && s.id === 'horarios_tiempo' ||
          selectedLead.name.toLowerCase().includes('camila') && s.id === 'precio_costo' ||
          selectedLead.name.toLowerCase().includes('marcelo') && s.id === 'validez_cert'
        );
        
        if (matchedScenario) {
          setChatLog(matchedScenario.chat);
        } else {
          // Dynamic replace of the first scenario with current lead's name
          const customChat = MOCK_SCENARIOS[0].chat
            .replaceAll('Dr. Francisco', selectedLead.name)
            .replaceAll('Francisco', selectedLead.name.split(' ')[0]);
          setChatLog(customChat);
        }
      }
      // Reset analysis of previous lead
      if (selectedLead.aiAnalysis) {
        try {
          setAnalysisResult(JSON.parse(selectedLead.aiAnalysis));
        } catch(e) {
          setAnalysisResult(null);
        }
      } else {
        setAnalysisResult(null);
      }
      setIsEditingChat(false);
      setErrorMsg('');
    } else {
      setChatLog('');
      setAnalysisResult(null);
    }
  }, [selectedLead]);

  // Call the backend AI analysis route
  const handleAnalyzeChat = async () => {
    if (!selectedLead || !chatLog.trim()) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setErrorMsg('');
    
    try {
      const response = await fetch('/api/ai/analyze-whatsapp-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: selectedLead.name,
          leadClasificacion: selectedLead.clasificacion,
          chatLog: chatLog
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al analizar la conversación.');
      }
      
      const data = await response.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error en el servidor al invocar a Gemini. Por favor asegúrese de tener configurada la API Key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save AI analysis and updated chat log back to lead's record in localDB
  const handleSaveToLeadProfile = async () => {
    if (!selectedLead || !analysisResult) return;
    
    setSaveLoading(true);
    try {
      const currentDate = new Date().toLocaleString('es-CL');
      const analysisSummaryText = `\n[${currentDate}] 🤖 ANÁLISIS DE INTERACCIÓN WHATSAPP (Motor IA):\n` +
        `• Nivel de Interés: ${analysisResult.interestLevel}\n` +
        `• Resumen: ${analysisResult.summary}\n` +
        `• Objeciones: ${analysisResult.objections.join(', ') || 'Ninguna'}\n` +
        `• Acción Comercial Recomendada: ${analysisResult.nextAction}\n` +
        `• Mensaje Persuasivo Propuesto Guardado en Registro.`;
      
      const updatedNotes = (selectedLead.observaciones || '') + analysisSummaryText;
      
      await localDB.updateInCollection('school_leads', selectedLead.id, {
        observaciones: updatedNotes,
        whatsappChatLog: chatLog,
        interestLevel: analysisResult.interestLevel,
        aiAnalysis: JSON.stringify(analysisResult)
      });
      
      // Update local state to keep sync
      setSelectedLead(prev => ({
        ...prev,
        observaciones: updatedNotes,
        whatsappChatLog: chatLog,
        interestLevel: analysisResult.interestLevel,
        aiAnalysis: JSON.stringify(analysisResult)
      }));

      // Trigger global event so lists re-render
      window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'school_leads' } }));
      
      // Add audit log
      const user = JSON.parse(localStorage.getItem('cimasur_user') || '{}');
      await addAuditLog(user, `Analizó y guardó interacción de WhatsApp para Lead: ${selectedLead.name}`, 'SCHOOL');
      
      alert(`¡Análisis guardado con éxito en el expediente de ${selectedLead.name}! Se registró la temperatura "${analysisResult.interestLevel}" y las recomendaciones.`);
    } catch (e: any) {
      alert('Error al guardar en el expediente: ' + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Helper to copy text to clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to create test leads if database is empty
  const handleCreateMockLeads = async () => {
    const mockLeads = [
      {
        id: 'mock_mv_1',
        name: 'Dr. Francisco Altamirano',
        rut: '15.420.392-1',
        email: 'francisco.altamirano.vet@gmail.com',
        phone: '+56 9 8273 1122',
        clasificacion: 'Médico Veterinario',
        interes: 'Diplomado Homeopatía Clínica',
        fecha: new Date().toISOString().split('T')[0],
        observaciones: '[SISTEMA] Lead de prueba importado para demostración del Motor Escuela.',
        pago: 'Pendiente',
        avance: 0,
        canalOrigen: '💬 WhatsApp'
      },
      {
        id: 'mock_mv_2',
        name: 'Dra. Camila Fuentes',
        rut: '18.234.908-4',
        email: 'camila.fuentes@veterinariachile.cl',
        phone: '+56 9 9922 4433',
        clasificacion: 'Médico Veterinario',
        interes: 'Módulo I: Introducción Homeopatía',
        fecha: new Date().toISOString().split('T')[0],
        observaciones: '[SISTEMA] Lead de prueba importado para demostración del Motor Escuela.',
        pago: 'Pendiente',
        avance: 0,
        canalOrigen: '🌐 Redes Sociales'
      },
      {
        id: 'mock_mv_3',
        name: 'Dr. Marcelo Valenzuela',
        rut: '12.903.443-8',
        email: 'marcelo.valenzuela@clinicavet.cl',
        phone: '+56 9 7311 0099',
        clasificacion: 'Médico Veterinario',
        interes: 'Diplomado Homeopatía Clínica',
        fecha: new Date().toISOString().split('T')[0],
        observaciones: '[SISTEMA] Lead de prueba importado para demostración del Motor Escuela.',
        pago: 'Pendiente',
        avance: 0,
        canalOrigen: '📧 Correo Electrónico'
      },
      {
        id: 'mock_mv_4',
        name: 'Dra. Andrea Tapia',
        rut: '17.543.882-K',
        email: 'andrea.tapia.vet@gmail.com',
        phone: '+56 9 8812 3456',
        clasificacion: 'Médico Veterinario',
        interes: 'Diplomado Homeopatía Clínica',
        fecha: new Date().toISOString().split('T')[0],
        observaciones: '[SISTEMA] Lead de prueba importado para demostración del Motor Escuela.',
        pago: 'Pendiente',
        avance: 0,
        canalOrigen: '🌐 Formulario Web'
      }
    ];

    for (const mock of mockLeads) {
      await localDB.saveToCollection('school_leads', mock);
    }
    window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'school_leads' } }));
    alert('Leads de prueba veterinarios (MV) creados con éxito.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="bg-[#152035] p-6 rounded-2xl border border-[#1E293B] shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                🟢 Motor Activo
              </span>
              <span className="text-[#38BDF8] text-xs font-bold tracking-widest font-mono uppercase">IA Campaign Engine</span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">Motor de Inteligencia de Escuela (CIMASUR)</h3>
            <p className="text-slate-400 text-xs mt-0.5 max-w-2xl">
              Analiza interacciones en conversaciones de WhatsApp de médicos veterinarios postulantes. Identifica objeciones de valor, calcula la temperatura del lead y genera tácticas persuasivas automáticas con IA.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" /> 📥 Importador Inteligente WhatsApp
            </button>
            <button
              type="button"
              onClick={loadLeads}
              className="text-xs bg-[#1E3A5F] hover:bg-[#1C2C4E] text-white px-4 py-2.5 rounded-xl border border-[#1E293B] font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Sincronizar
            </button>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#1E293B]">
          <div className="bg-[#111A2E]/60 p-4 rounded-xl border border-[#1E293B]">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads Veterinarios (MV)</span>
            <span className="text-2xl font-black text-[#38BDF8]">{leads.filter(l => l.clasificacion === 'Médico Veterinario').length}</span>
          </div>
          <div className="bg-[#111A2E]/60 p-4 rounded-xl border border-[#1E293B]">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads Analizados con IA</span>
            <span className="text-2xl font-black text-emerald-400">{leads.filter(l => l.aiAnalysis).length}</span>
          </div>
          <div className="bg-[#111A2E]/60 p-4 rounded-xl border border-[#1E293B]">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Interés "Caliente"</span>
            <span className="text-2xl font-black text-red-400">{leads.filter(l => l.interestLevel === 'Caliente').length}</span>
          </div>
          <div className="bg-[#111A2E]/60 p-4 rounded-xl border border-[#1E293B]">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa de Engagement Est.</span>
            <span className="text-2xl font-black text-yellow-400">
              {leads.filter(l => l.clasificacion === 'Médico Veterinario').length > 0 
                ? Math.round((leads.filter(l => l.interestLevel === 'Caliente' || l.interestLevel === 'Tibio').length / leads.filter(l => l.clasificacion === 'Médico Veterinario').length) * 100) 
                : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Leads List (1/3 of space) */}
        <div className="lg:col-span-4 bg-[#152035] rounded-2xl border border-[#1E293B] flex flex-col h-[650px] overflow-hidden shadow-md">
          {/* List Header / Filters */}
          <div className="p-4 border-b border-[#1E293B] space-y-3 bg-[#111A2E]/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#38BDF8]" /> Alumnos Potenciales
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-[#1E293B] px-2 py-0.5 rounded-full font-bold">
                {filteredLeads.length} Registros
              </span>
            </div>

            {/* Classification Tab Buttons */}
            <div className="grid grid-cols-2 gap-1 bg-[#152035] p-1 rounded-xl border border-[#1E293B]">
              <button
                type="button"
                onClick={() => setFilterType('mv_only')}
                className={cn(
                  "py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  filterType === 'mv_only' ? "bg-[#1E3A5F] text-white shadow-sm" : "text-slate-400 hover:text-slate-300"
                )}
              >
                Solo MV (Vet)
              </button>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={cn(
                  "py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  filterType === 'all' ? "bg-[#1E3A5F] text-white shadow-sm" : "text-slate-400 hover:text-slate-300"
                )}
              >
                Todos los Leads
              </button>
            </div>

            {/* Quick search input */}
            <input
              type="text"
              placeholder="Buscar por nombre, RUT, mail..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
            {filteredLeads.map(lead => {
              const isSelected = selectedLead?.id === lead.id;
              
              // Determine interest badge style
              let interestBadge = null;
              if (lead.interestLevel === 'Caliente') {
                interestBadge = <span className="bg-red-950/40 text-red-400 border border-red-900 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">🔥 Caliente</span>;
              } else if (lead.interestLevel === 'Tibio') {
                interestBadge = <span className="bg-amber-950/40 text-amber-400 border border-amber-900 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">⚡ Tibio</span>;
              } else if (lead.interestLevel === 'Frío') {
                interestBadge = <span className="bg-blue-950/40 text-blue-400 border border-blue-900 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">❄️ Frío</span>;
              } else {
                interestBadge = <span className="bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded text-[8px] font-bold">Sin Análisis</span>;
              }

              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-[#1E293B]/20 transition-all flex items-start gap-3 border-l-2",
                    isSelected ? "bg-[#1E3A5F]/20 border-[#38BDF8]" : "border-transparent"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-inner">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-white text-xs truncate block">{lead.name}</span>
                      {interestBadge}
                    </div>
                    <span className="text-[10px] text-[#38BDF8] block truncate font-medium mt-0.5">{lead.interes || 'Diplomado Homeopatía'}</span>
                    <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-400 font-mono">
                      <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" /> {lead.phone || '---'}</span>
                      <span className="truncate flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {lead.fecha}</span>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredLeads.length === 0 && (
              <div className="p-8 text-center space-y-4">
                <p className="text-xs text-slate-400 italic">No se encontraron prospectos que coincidan con la búsqueda.</p>
                {leads.length === 0 && (
                  <button
                    onClick={handleCreateMockLeads}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold inline-flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Cargar Alumnos MV de Prueba
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Workspace (2/3 of space) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedLead ? (
            // Empty State
            <div className="bg-[#152035] rounded-2xl border border-[#1E293B] h-[650px] flex flex-col items-center justify-center p-8 text-center shadow-md">
              <div className="w-16 h-16 rounded-full bg-[#1E3A5F]/40 flex items-center justify-center text-[#38BDF8] mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">Espacio de Trabajo del Motor de Campañas</h4>
              <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
                Selecciona a un postulante Médico Veterinario (MV) en la lista de la izquierda para comenzar el análisis comercial de su conversación de WhatsApp y calibrar las respuestas de la IA.
              </p>
            </div>
          ) : (
            // Selected Lead Workspace
            <div className="space-y-6">
              {/* Lead Info Bar */}
              <div className="bg-[#152035] p-5 rounded-2xl border border-[#1E293B] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ficha Potencial Alumno</span>
                    <span className="bg-[#1E3A5F]/80 text-[#38BDF8] px-2 py-0.5 rounded-md text-[9px] font-bold font-mono">
                      ID: {selectedLead.id}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-white mt-1">{selectedLead.name}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-300">
                    <span className="font-semibold text-slate-400">{selectedLead.clasificacion}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-[#38BDF8] font-bold">{selectedLead.interes || 'Diplomado Homeopatía'}</span>
                    <span className="text-slate-500">•</span>
                    <span>RUT: {selectedLead.rut || 'No registra'}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <a 
                    href={`tel:${selectedLead.phone}`}
                    className="p-2.5 bg-[#111A2E] hover:bg-[#1C2C4E] text-[#38BDF8] rounded-xl border border-[#1E293B] transition-all"
                    title="Llamar"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a 
                    href={`mailto:${selectedLead.email}`}
                    className="p-2.5 bg-[#111A2E] hover:bg-[#1C2C4E] text-[#38BDF8] rounded-xl border border-[#1E293B] transition-all"
                    title="Enviar Email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Chat Inspector Box */}
              <div className="bg-[#152035] rounded-2xl border border-[#1E293B] overflow-hidden shadow-md flex flex-col">
                <div className="p-4 bg-[#111A2E]/60 border-b border-[#1E293B] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black text-slate-200 tracking-wider uppercase">Historial de Conversación de WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingChat(!isEditingChat)}
                      className="text-[10px] bg-[#1E3A5F] hover:bg-[#1D3557] text-[#38BDF8] border border-[#1E293B] px-2.5 py-1 rounded-lg font-bold"
                    >
                      {isEditingChat ? 'Ver como Chat' : '📝 Editar / Pegar Transcripción'}
                    </button>
                  </div>
                </div>

                {/* Scenarios Preset selector - only when not editing or when chat is clean */}
                {!isEditingChat && (
                  <div className="p-3 bg-[#111A2E]/30 border-b border-[#1E293B] overflow-x-auto flex gap-2 scrollbar-none">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest self-center mr-1">Cargar Escenarios de Prueba:</span>
                    {MOCK_SCENARIOS.map(scen => (
                      <button
                        key={scen.id}
                        type="button"
                        onClick={() => {
                          if (window.confirm('¿Desea cargar la conversación de este escenario para analizarla? Reemplazará la transcripción actual en pantalla.')) {
                            setChatLog(scen.chat);
                          }
                        }}
                        className="text-[10px] bg-[#111A2E] hover:bg-[#1C2C4E] text-slate-300 border border-[#1E293B] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
                        title={scen.description}
                      >
                        {scen.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Conversation area */}
                <div className="p-4 h-[250px] overflow-y-auto bg-[#111A2E]/20 flex flex-col">
                  {isEditingChat ? (
                    <textarea
                      value={chatLog}
                      onChange={e => setChatLog(e.target.value)}
                      placeholder="Pegue aquí el registro de chat de WhatsApp, ej:\n\n[10:00] Cliente: Hola, vi el diplomado...\n[10:05] CIMASUR: Hola, claro..."
                      className="w-full h-full p-3 bg-[#111A2E] text-slate-200 rounded-xl border border-[#1E293B] text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
                    />
                  ) : (
                    <div className="space-y-3 font-sans text-xs">
                      {chatLog.trim().split('\n').map((line, idx) => {
                        if (!line.trim()) return null;
                        
                        const isCimasur = line.includes('CIMASUR Escuela') || line.includes('CIMASUR:') || line.includes('Cimasur');
                        
                        return (
                          <div 
                            key={idx} 
                            className={cn(
                              "flex flex-col max-w-[80%] rounded-2xl p-3 shadow-sm",
                              isCimasur 
                                ? "bg-[#1E3A5F]/60 text-white self-end rounded-tr-none border border-[#1E3A5F]" 
                                : "bg-[#111A2E] text-slate-300 self-start rounded-tl-none border border-[#1E293B]"
                            )}
                          >
                            <span className="text-[9px] opacity-60 font-mono self-end mb-1">
                              {line.match(/\[(.*?)\]/)?.[1] || 'WhatsApp'}
                            </span>
                            <span className="leading-relaxed">
                              {line.replace(/\[.*?\]\s*/g, '').trim()}
                            </span>
                          </div>
                        );
                      })}
                      
                      {chatLog.trim() === '' && (
                        <div className="text-center p-8 text-slate-500 italic">
                          No hay registros de conversación de WhatsApp en pantalla. Escriba o cargue un escenario para analizar.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Analyze Trigger Footer */}
                <div className="p-4 bg-[#111A2E]/50 border-t border-[#1E293B] flex flex-col sm:flex-row justify-between items-center gap-3">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                    Utiliza la inteligencia de Gemini para analizar la temperatura de conversión.
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleAnalyzeChat}
                    disabled={isAnalyzing || chatLog.trim() === ''}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all",
                      isAnalyzing || chatLog.trim() === ''
                        ? "bg-slate-700 text-slate-400 border border-slate-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-sky-500 text-white hover:from-blue-700 hover:to-sky-600 cursor-pointer animate-pulse"
                    )}
                  >
                    <Sparkles className="w-4 h-4" />
                    {isAnalyzing ? 'Analizando Conversación...' : 'Analizar Interacción de WhatsApp'}
                  </button>
                </div>
              </div>

              {/* Error Box */}
              {errorMsg && (
                <div className="bg-red-950/40 border border-red-900/50 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-red-200 block">Error del Motor de Campañas</span>
                    <span className="text-red-300 mt-0.5 block">{errorMsg}</span>
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {isAnalyzing && (
                <div className="bg-[#152035] p-10 rounded-2xl border border-[#1E293B] text-center space-y-4 animate-pulse">
                  <div className="w-12 h-12 rounded-full border-4 border-sky-400 border-t-transparent animate-spin mx-auto"></div>
                  <h5 className="font-bold text-white text-sm">Procesando conversación de WhatsApp...</h5>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Gemini está auditando el historial de chat para medir el interés, desglosar dudas del veterinario y diseñar una estrategia de cierre.
                  </p>
                </div>
              )}

              {analysisResult && !isAnalyzing && (
                <div className="bg-[#152035] rounded-2xl border border-[#1E293B] overflow-hidden shadow-lg animate-in zoom-in-95 duration-200">
                  {/* Results Header */}
                  <div className="p-5 border-b border-[#1E293B] bg-gradient-to-r from-[#1A365D] to-[#152035] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/10 flex items-center justify-center text-[#38BDF8]">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">Resultado del Análisis de IA</h4>
                        <span className="text-[10px] text-slate-400">Auditoría estratégica en tiempo real</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 font-medium">Temperatura:</span>
                      {analysisResult.interestLevel === 'Caliente' ? (
                        <span className="bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-black uppercase animate-bounce">
                          🔥 CALIENTE (Cerrar ya)
                        </span>
                      ) : analysisResult.interestLevel === 'Tibio' ? (
                        <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase">
                          ⚡ TIBIO (Madurar)
                        </span>
                      ) : (
                        <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-black uppercase">
                          ❄️ FRÍO (Despertar)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body columns */}
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Summary and Objections */}
                      <div className="space-y-4">
                        <div className="bg-[#111A2E]/50 p-4 rounded-xl border border-[#1E293B]">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            Diagnóstico de Interacción
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed italic">
                            "{analysisResult.summary}"
                          </p>
                        </div>

                        <div className="bg-[#111A2E]/50 p-4 rounded-xl border border-[#1E293B]">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Objeciones Detectadas (Barreras)
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.objections && analysisResult.objections.length > 0 ? (
                              analysisResult.objections.map((obj, i) => (
                                <span 
                                  key={i} 
                                  className="bg-red-950/30 text-red-300 border border-red-900/60 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
                                >
                                  <AlertTriangle className="w-3 h-3 text-red-400" /> {obj}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">No se identificaron objeciones activas.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Next Action recommendation */}
                      <div className="space-y-4">
                        <div className="bg-blue-950/20 border border-blue-900/50 p-4 rounded-xl h-full flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-black text-[#38BDF8] uppercase tracking-widest block mb-1">
                              Siguiente Acción Comercial Sugerida
                            </span>
                            <p className="text-xs text-slate-200 leading-relaxed font-medium mt-1">
                              {analysisResult.nextAction}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-blue-900/40 flex items-center gap-2 text-[10px] text-[#38BDF8] font-bold">
                            <TrendingUp className="w-4 h-4" /> Estrategia de Nutrición de Lead Escuela CIMASUR
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Copywriting / Suggested WhatsApp Message */}
                    <div className="bg-[#111A2E]/80 rounded-xl border border-[#1E293B] overflow-hidden">
                      <div className="p-3 bg-[#111A2E] border-b border-[#1E293B] flex justify-between items-center">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-emerald-500" /> Propuesta de Respuesta WhatsApp Diseñada por IA
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleCopyToClipboard(analysisResult.suggestedMessage)}
                          className={cn(
                            "text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-wider transition-all flex items-center gap-1 border",
                            copied 
                              ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/50" 
                              : "bg-[#1E3A5F] hover:bg-[#1D3557] text-[#38BDF8] border-[#1E293B] cursor-pointer"
                          )}
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? '¡Copiado!' : 'Copiar Mensaje'}
                        </button>
                      </div>
                      
                      <div className="p-4 bg-[#111A2E]/30 text-xs font-sans whitespace-pre-wrap leading-relaxed text-slate-200 border-b border-[#1E293B]">
                        {analysisResult.suggestedMessage}
                      </div>

                      <div className="p-3 bg-[#111A2E]/60 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveToLeadProfile}
                          disabled={saveLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-2 transition-all shadow-md cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          {saveLoading ? 'Guardando en Ficha...' : '💾 Registrar Análisis en Ficha Médica del Lead'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Chat Import Modal Overlay */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1E293B] bg-[#111A2E]/80 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Importador Inteligente de Chats de WhatsApp (IA)</h3>
                  <p className="text-[10px] text-slate-400">Sube un archivo .txt de exportación o pega los mensajes para crear/actualizar leads</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedResult(null);
                  setImportRawText('');
                  setImportFileName('');
                }}
                className="p-1.5 bg-[#1E293B] hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!parsedResult ? (
                // Step 1: Input text or file
                <div className="space-y-4">
                  <div className="bg-blue-950/20 border border-blue-900/40 p-4 rounded-xl">
                    <h4 className="text-xs font-black text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-sky-400" /> ¿Cómo funciona la importación?
                    </h4>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Copia el historial completo de tu chat desde WhatsApp y pégalo abajo, o sube el archivo de texto exportado. La inteligencia artificial de <strong>Gemini 2.5 Flash</strong> analizará el flujo, identificará el nombre del Dr., su correo, teléfono, curso de interés, calculará la temperatura del lead, limpiará el chat y redactará la mejor estrategia de cierre comercial.
                    </p>
                  </div>

                  {/* Textarea Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest block">
                      Pegar Historial de Conversación de WhatsApp:
                    </label>
                    <textarea
                      value={importRawText}
                      onChange={e => setImportRawText(e.target.value)}
                      placeholder="Ejemplo:&#10;31/1/2025, 3:37 p.m. - Los mensajes y las llamadas están cifrados...&#10;31/1/2025, 3:54 p.m. - formacion cimasur: Hola, Dr(a). ¿Recibió la información del Diplomado?&#10;..."
                      className="w-full h-64 p-4 bg-[#111A2E] text-slate-200 border border-[#1E293B] rounded-2xl text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                    />
                  </div>

                  {/* Or File Upload Action with Drag and Drop Support */}
                  <div 
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => {
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.name.endsWith('.txt')) {
                        setImportFileName(file.name);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setImportRawText(event.target?.result as string || '');
                        };
                        reader.readAsText(file);
                      } else {
                        alert('Por favor sube solo archivos de texto (.txt) exportados de WhatsApp.');
                      }
                    }}
                    className={cn(
                      "flex flex-col sm:flex-row justify-between items-center gap-4 p-5 rounded-2xl border transition-all duration-200",
                      isDragging 
                        ? "bg-emerald-950/20 border-emerald-500 border-dashed scale-[1.01]" 
                        : "bg-[#111A2E]/50 border-[#1E293B] hover:bg-[#111A2E]/80"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#152035] rounded-xl border border-[#1E293B] text-slate-400">
                        <FileText className="w-5 h-5 text-[#38BDF8]" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">
                          {importFileName ? `Archivo seleccionado: ${importFileName}` : 'Subir archivo .txt de WhatsApp'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Exportación de chat (puedes arrastrar y soltar el archivo aquí)
                        </span>
                      </div>
                    </div>
                    <label className="bg-[#1E3A5F] hover:bg-[#1D3557] text-[#38BDF8] border border-[#1E293B] text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all">
                      <span>Seleccionar Archivo</span>
                      <input
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImportFileName(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setImportRawText(event.target?.result as string || '');
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleParseWhatsAppExport}
                      disabled={isParsingExport || !importRawText.trim()}
                      className={cn(
                        "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all",
                        isParsingExport || !importRawText.trim()
                          ? "bg-slate-700 text-slate-400 border border-slate-600 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-700 hover:to-teal-600 cursor-pointer animate-pulse"
                      )}
                    >
                      {isParsingExport ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                          Procesando y Estructurando con IA...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Procesar e Identificar Lead con IA
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                // Step 2: Display Extracted Fields & Save Mode
                <div className="space-y-6">
                  <div className="bg-emerald-950/30 border border-emerald-900/40 p-4 rounded-xl flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-300">
                      <span className="font-bold text-white block">¡Análisis Completo! Gemini identificó con éxito los datos:</span>
                      Confirma la información extraída a continuación. Puedes corregir cualquier campo antes de guardarlo en tu base de datos de CIMASUR.
                    </div>
                  </div>

                  {/* Estadísticas de Extracción y Alertas de Datos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stats Panel */}
                    <div className="bg-[#111A2E]/60 p-4 rounded-xl border border-[#1E293B] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-[#38BDF8] shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="text-xs">
                        <span className="font-extrabold text-slate-400 block uppercase tracking-wider text-[9px]">Estadísticas del Chat</span>
                        <p className="text-slate-200 mt-0.5">
                          Se detectaron <strong className="text-emerald-400 font-black">{parsedResult.emailsCount || 0}</strong> correo(s) y <strong className="text-[#38BDF8] font-black">{parsedResult.phonesCount || 0}</strong> fono(s) en la conversación.
                        </p>
                      </div>
                    </div>

                    {/* Warning message if missing data */}
                    {parsedResult.warningMessage && parsedResult.warningMessage !== 'Ninguna' ? (
                      <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-extrabold text-red-400 block uppercase tracking-wider text-[9px]">¡Alerta de Datos Faltantes!</span>
                          <p className="text-red-200/90 mt-0.5 font-medium">
                            {parsedResult.warningMessage}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="text-xs">
                          <span className="font-extrabold text-emerald-400 block uppercase tracking-wider text-[9px]">Integridad de Datos</span>
                          <p className="text-emerald-200 mt-0.5">
                            La información esencial del lead parece estar completa.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coincidencia de Duplicado / Match Detector */}
                  {(() => {
                    const matched = findMatchingLead(parsedResult);
                    if (!matched) return null;
                    return (
                      <div className="bg-amber-950/45 border border-amber-500/40 p-4.5 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-amber-300 text-xs block uppercase tracking-wider">⚠️ ¡CONEXIÓN DE ALUMNO DETECTADA! (Ya existe)</span>
                            <p className="text-[11px] text-amber-100/90 mt-1 leading-relaxed">
                              El sistema detectó que este chat pertenece a un alumno que ya está registrado en la base de datos de CIMASUR como <strong className="text-white font-black">{matched.name}</strong> 
                              {matched.email ? ` (Email: ${matched.email})` : ''} 
                              {matched.phone ? ` (Tel: ${matched.phone})` : ''}.
                            </p>
                          </div>
                        </div>
                        <div className="bg-[#111A2E]/80 p-3 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="text-[10px] text-slate-300">
                            <span className="text-white font-bold block">Acción Recomendada:</span>
                            Guardar este análisis e historial directamente en su ficha existente para evitar duplicidad y mantener el historial unificado.
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveParsedLead(false, matched.id)}
                            disabled={saveParsedLoading}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-4.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md border-none"
                          >
                            {saveParsedLoading ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent animate-spin rounded-full"></div>
                                Guardando...
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                Actualizar Ficha de {matched.name.split(' ')[0]}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nombre del Alumno (Extraído):</label>
                      <input
                        type="text"
                        value={parsedResult.leadName || ''}
                        onChange={e => setParsedResult({ ...parsedResult, leadName: e.target.value })}
                        className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Clasificación:</label>
                      <input
                        type="text"
                        value={parsedResult.leadClasificacion || ''}
                        onChange={e => setParsedResult({ ...parsedResult, leadClasificacion: e.target.value })}
                        className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Teléfono:</label>
                      <input
                        type="text"
                        value={parsedResult.leadPhone || ''}
                        onChange={e => setParsedResult({ ...parsedResult, leadPhone: e.target.value })}
                        className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email:</label>
                      <input
                        type="text"
                        value={parsedResult.leadEmail || ''}
                        onChange={e => setParsedResult({ ...parsedResult, leadEmail: e.target.value })}
                        className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Curso / Diplomado de Interés:</label>
                      <input
                        type="text"
                        value={parsedResult.interes || ''}
                        onChange={e => setParsedResult({ ...parsedResult, interes: e.target.value })}
                        className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* AI diagnostic summary */}
                  <div className="bg-[#111A2E]/60 p-4 rounded-xl border border-[#1E293B] space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DIAGNÓSTICO COMERCIAL CALCULADO POR IA</span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase",
                        parsedResult.interestLevel === 'Caliente' ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                        parsedResult.interestLevel === 'Tibio' ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                        "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      )}>
                        🌡️ Temperatura: {parsedResult.interestLevel || 'Tibio'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-200">
                      <span className="font-bold text-slate-400 block mb-0.5">Resumen de Interacción:</span>
                      <p className="italic text-slate-300">"{parsedResult.summary}"</p>
                    </div>

                    <div className="text-xs text-slate-200">
                      <span className="font-bold text-slate-400 block mb-1">Objeciones Identificadas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {parsedResult.objections && parsedResult.objections.length > 0 ? (
                          parsedResult.objections.map((obj: string, i: number) => (
                            <span key={i} className="bg-red-950/30 text-red-300 border border-red-900/50 px-2 py-0.5 rounded text-[10px] font-medium">
                              {obj}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Ninguna identificada</span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-200">
                      <span className="font-bold text-slate-400 block mb-0.5">Próxima Acción Sugerida:</span>
                      <p className="font-medium text-sky-400">{parsedResult.nextAction}</p>
                    </div>
                  </div>

                  {/* Selection Mode: Save as NEW or UPDATE EXISTING */}
                  <div className="p-5 bg-[#111A2E]/30 rounded-2xl border border-[#1E293B] space-y-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">
                      Selecciona Destino de los Datos:
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Option A: Save as NEW */}
                      <button
                        type="button"
                        onClick={() => handleSaveParsedLead(true)}
                        disabled={saveParsedLoading}
                        className="p-4 bg-gradient-to-br from-[#1E3A5F]/40 to-[#111A2E]/30 hover:from-[#1E3A5F]/60 hover:to-[#111A2E]/50 border border-emerald-500/30 text-left rounded-xl transition-all cursor-pointer flex flex-col justify-between h-32"
                      >
                        <div>
                          <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                            Recomendado
                          </span>
                          <span className="block font-black text-white text-xs mt-1.5">Crear como NUEVO Lead</span>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                            Crea un nuevo registro en el "Registro de Potenciales Alumnos" con todos estos datos y el chat asociado.
                          </p>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 self-end">
                          Crear Registro <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>

                      {/* Option B: Update Existing */}
                      <div className="p-4 bg-[#111A2E]/20 border border-[#1E293B] text-left rounded-xl flex flex-col justify-between h-32 animate-none">
                        <div>
                          <span className="block font-black text-white text-xs">Asociar a un Lead EXISTENTE</span>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                            Adjunta esta conversación y análisis de IA a un registro existente de tu lista.
                          </p>
                          
                          <select
                            value={selectedExistingLeadId}
                            onChange={e => setSelectedExistingLeadId(e.target.value)}
                            className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-lg px-2 py-1 text-[11px] mt-2 outline-none"
                          >
                            <option value="">-- Selecciona un Lead existente --</option>
                            {leads.map(l => (
                              <option key={l.id} value={l.id}>
                                {l.name} ({l.interes || 'Diplomado'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedExistingLeadId && (
                          <button
                            type="button"
                            onClick={() => handleSaveParsedLead(false)}
                            disabled={saveParsedLoading}
                            className="text-[10px] text-sky-400 font-bold flex items-center gap-1 self-end hover:underline bg-transparent border-none cursor-pointer mt-2"
                          >
                            {saveParsedLoading ? 'Asociando...' : 'Asociar y Actualizar'} <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Back to copy/paste link */}
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setParsedResult(null)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-all bg-transparent border-none cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Volver a pegar conversación
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
