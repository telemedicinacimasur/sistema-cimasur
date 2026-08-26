import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Sparkles, Filter, Search, Phone, Mail, Award, 
  CheckCircle2, AlertTriangle, ArrowRight, UserCheck, Tag, Copy, Check, Code, Eye, FileText,
  Flame, UserPlus, GraduationCap, DollarSign, Clock, Users
} from 'lucide-react';
import { localDB, localAuth, addAuditLog } from '../../lib/auth';
import { cn } from '../../lib/utils';

export function SchoolCampaignsHub() {
  const [leads, setLeads] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Audience: 'leads' (default for sales closing) | 'students' | 'all'
  const [targetAudience, setTargetAudience] = useState<'leads' | 'students' | 'all'>('leads');
  
  // Filters for Leads
  const [filterLeadStage, setFilterLeadStage] = useState<'all' | 'hot' | 'negotiation' | 'followup' | 'new'>('all');
  
  // Filters for Students
  const [filterProgress, setFilterProgress] = useState<'all' | 'zero' | 'in_progress' | 'advanced' | 'completed'>('all');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Mode: 'whatsapp' | 'email_html'
  const [campaignMode, setCampaignMode] = useState<'whatsapp' | 'email_html'>('whatsapp');

  // WhatsApp templates & custom message
  const [selectedTemplate, setSelectedTemplate] = useState<string>('discount_15');
  const [customMessage, setCustomMessage] = useState('');
  
  // Individual contact custom message override modal
  const [individualModalContact, setIndividualModalContact] = useState<any | null>(null);
  const [individualCustomText, setIndividualCustomText] = useState('');

  // HTML Email Builder State
  const [emailSubject, setEmailSubject] = useState('🌟 Oferta Especial de Matrícula y Beca Escuela CIMASUR (2026)');
  const [emailHtmlContent, setEmailHtmlContent] = useState(`<div style="font-family: Arial, sans-serif; background-color: #0F172A; color: #E2E8F0; padding: 24px; border-radius: 16px;">
  <div style="max-width: 600px; margin: 0 auto; background: #152035; border: 1px solid #1E293B; border-radius: 12px; padding: 24px;">
    <h2 style="color: #38BDF8; text-transform: uppercase; font-size: 18px; margin-top: 0;">Centro Académico CIMASUR</h2>
    <p style="font-size: 14px; color: #CBD5E1;">Estimado(a) Dr(a). <strong style="color: #FFFFFF;">{{nombre}}</strong>,</p>
    <p style="font-size: 13px; color: #94A3B8; line-height: 1.5;">
      Nos ponemos en contacto desde la Escuela CIMASUR respecto a su interés en el programa formativo <strong style="color: #38BDF8;">{{curso}}</strong>.
    </p>
    <div style="background: #111A2E; border: 1px solid #1E293B; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <h4 style="color: #F59E0B; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase;">🔥 Beneficio Exclusivo de Cierre de Matrícula</h4>
      <p style="font-size: 12px; color: #E2E8F0; margin: 0;">Disponemos de una beca especial con un 15% de descuento en su matrícula y facilidades de pago en cuotas para asegurar su cupo hoy mismo.</p>
    </div>
    <a href="https://wa.me/56900000000" style="display: inline-block; background: #059669; color: #FFFFFF; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 12px; text-transform: uppercase;">Confirmar Matrícula con Asesor</a>
    <p style="font-size: 10px; color: #64748B; margin-top: 24px; border-top: 1px solid #1E293B; padding-top: 12px;">Centro Académico de Medicina Veterinaria Integrativa CIMASUR.</p>
  </div>
</div>`);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

  useEffect(() => {
    loadData();
    const handleDbChange = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.collection || detail.collection === 'students' || detail.collection === 'school_leads') {
        loadData();
      }
    };
    window.addEventListener('db-change', handleDbChange);
    return () => window.removeEventListener('db-change', handleDbChange);
  }, []);

  const loadData = async () => {
    const l = await localDB.getCollection('school_leads');
    const s = await localDB.getCollection('students');
    setLeads(l);
    setStudents(s);
  };

  const templates = [
    {
      id: 'discount_15',
      name: '🔥 Beca Cierre de Venta (15% Dto.)',
      category: 'leads',
      desc: 'Descuento especial y beca limitada para cerrar matrícula inmediata con prospectos.',
      text: '¡Hola Dr(a). {{nombre}}! Tenemos una beca de cierre de matrícula por tiempo limitado con un 15% de descuento exclusivo para el {{curso}} en la Escuela CIMASUR. ¿Te gustaría asegurar tu cupo y formalizar tu ingreso hoy?'
    },
    {
      id: 'last_seats',
      name: '⚡ Últimos Cupos Disponibles',
      category: 'leads',
      desc: 'Genera urgencia y exclusividad sobre cupos limitados en el diplomado.',
      text: 'Dr(a). {{nombre}}, te informamos que quedan los últimos 3 cupos disponibles para el {{curso}} en CIMASUR. Incluye certificación académica y acceso a intranet 24/7. ¿Te reservamos una plaza?'
    },
    {
      id: 'payment_facilities',
      name: '💳 Facilidades de Pago & Cuotas',
      category: 'leads',
      desc: 'Propuesta de financiamiento en cuotas o transferencia para eliminar objeción de precio.',
      text: 'Hola Dr(a). {{nombre}}, respecto a tu postulación al {{curso}}, queremos contarte que disponemos de opciones de financiamiento en cuotas mensuales y pago con tarjeta/transferencia. ¿Te gustaría revisar el plan de pago?'
    },
    {
      id: 'syllabus_info',
      name: '📋 Envío de Temario y Admisión',
      category: 'leads',
      desc: 'Entrega de programa formativo, contenidos clínicos y formulario de admisión.',
      text: 'Estimado(a) Dr(a). {{nombre}}, te enviamos el temario completo y los requisitos de admisión para el {{curso}} de Escuela CIMASUR. Quedamos a tu disposición para resolver cualquier consulta clínica o administrativa.'
    },
    {
      id: 'advising_call',
      name: '📞 Agendamiento con Dirección Académica',
      category: 'leads',
      desc: 'Invitación a llamada de 5 min para resolver dudas sobre casos clínicos y enfoque.',
      text: 'Hola Dr(a). {{nombre}}, ¿te gustaría coordinar una breve llamada de 5 minutos con nuestra dirección académica para resolver cualquier duda que tengas sobre el plan de estudios de {{curso}}?'
    },
    {
      id: 'subscription',
      name: '⏰ Suscripción (25 días restantes)',
      category: 'students',
      desc: 'Recordatorio de tiempo restante de suscripción a la intranet de clases para alumnos.',
      text: 'Hola Dr(a). {{nombre}}, te recordamos que te quedan 25 días de acceso activo a tu suscripción en la Escuela CIMASUR. Tu avance actual es del {{avance}}% en {{curso}}. ¡Ingresa a la Intranet y aprovecha de repasar tus módulos!'
    },
    {
      id: 'catalog_discount',
      name: '💎 10% Dto. en Productos Base y Avanzados',
      category: 'students',
      desc: 'Beneficio exclusivo de la comunidad CIMASUR en insumos y tinturas madre.',
      text: '¡Hola Dr(a). {{nombre}}! Como parte de la comunidad Escuela CIMASUR, cuentas con un 10% de descuento preferencial en todos nuestros productos base, avanzados y tinturas madres. Consulta por tu pedido hoy.'
    },
    {
      id: 'zero_progress',
      name: '⚠️ Alerta Académica (Sin Avance)',
      category: 'students',
      desc: 'Mensaje de apoyo y motivación para alumnos con 0% de avance registrado.',
      text: 'Hola Dr(a). {{nombre}}, notamos que aún no registras avance en tu curso {{curso}}. Queremos recordarte que cuentas con apoyo continuo del equipo docente de CIMASUR. ¿Tienes alguna duda con los módulos?'
    }
  ];

  useEffect(() => {
    const t = templates.find(item => item.id === selectedTemplate);
    if (t) {
      setCustomMessage(t.text);
    }
  }, [selectedTemplate]);

  // Determine hot leads
  const isHotLead = (lead: any) => {
    const interest = (lead.interestLevel || '').toLowerCase();
    const estado = (lead.estado || '').toLowerCase();
    const obs = (lead.observaciones || '').toLowerCase();
    return interest === 'alto' || interest === 'caliente' || estado.includes('caliente') || estado.includes('cierre') || obs.includes('cierre') || obs.includes('interesado');
  };

  const isNegotiationLead = (lead: any) => {
    const estado = (lead.estado || '').toLowerCase();
    const obs = (lead.observaciones || '').toLowerCase();
    return estado.includes('negoci') || estado.includes('propuesta') || estado.includes('cotiz') || obs.includes('precio') || obs.includes('cuotas');
  };

  // Compile full list based on Audience
  const combinedList = [
    ...(targetAudience === 'leads' || targetAudience === 'all' 
      ? leads.map(l => ({ ...l, _recordType: 'lead' })) 
      : []),
    ...(targetAudience === 'students' || targetAudience === 'all' 
      ? students.map(s => ({ ...s, _recordType: 'student' })) 
      : [])
  ];

  // Filter combined list
  const filteredContacts = combinedList.filter(item => {
    const name = (item.name || '').toLowerCase();
    const rut = (item.rut || '').toLowerCase();
    const course = (item.interes || item.diplomado || '').toLowerCase();
    const phone = (item.phone || '').toLowerCase();
    const email = (item.email || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchSearch = name.includes(term) || rut.includes(term) || course.includes(term) || phone.includes(term) || email.includes(term);
    if (!matchSearch) return false;

    if (item._recordType === 'lead') {
      if (filterLeadStage === 'hot') return isHotLead(item);
      if (filterLeadStage === 'negotiation') return isNegotiationLead(item);
      if (filterLeadStage === 'followup') return (item.estado || '').toLowerCase().includes('seguimiento') || (item.observaciones || '').toLowerCase().includes('objecion');
      if (filterLeadStage === 'new') return (item.estado || '').toLowerCase() === 'nuevo';
      return true;
    } else {
      const avance = item.avance || 0;
      if (filterProgress === 'zero') return avance === 0;
      if (filterProgress === 'in_progress') return avance > 0 && avance <= 50;
      if (filterProgress === 'advanced') return avance > 50 && avance < 100;
      if (filterProgress === 'completed') return avance >= 100;
      return true;
    }
  });

  const hotLeadsCount = leads.filter(isHotLead).length;
  const negotiationLeadsCount = leads.filter(isNegotiationLead).length;

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const toggleSelectContact = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderProcessedText = (contact: any, templateText: string) => {
    const courseName = contact.interes || contact.diplomado || 'Diplomado Homeopatía Veterinaria';
    return templateText
      .replaceAll('{{nombre}}', contact.name || 'Dr(a). Postulante')
      .replaceAll('{{avance}}', String(contact.avance || 0))
      .replaceAll('{{curso}}', courseName)
      .replaceAll('{{email}}', contact.email || 'contacto@cimasur.cl')
      .replaceAll('{{telefono}}', contact.phone || '')
      .replaceAll('{{rut}}', contact.rut || '---');
  };

  const handleSendWhatsApp = (contact: any, customOverride?: string) => {
    const phone = (contact.phone || '').replace(/\D/g, '');
    const finalMsg = renderProcessedText(contact, customOverride || customMessage);
    const encoded = encodeURIComponent(finalMsg);

    if (phone) {
      window.open(`https://wa.me/${phone.startsWith('56') ? phone : '56' + phone}?text=${encoded}`, '_blank');
    } else {
      navigator.clipboard.writeText(finalMsg);
      alert(`El contacto ${contact.name} no tiene teléfono registrado. El mensaje se ha copiado al portapapeles.`);
    }
  };

  const handleBulkWhatsApp = () => {
    if (selectedIds.length === 0) {
      alert('Selecciona al menos un contacto para enviar el mensaje.');
      return;
    }
    const targets = filteredContacts.filter(c => selectedIds.includes(c.id));
    let opened = 0;
    targets.forEach((c, idx) => {
      const phone = (c.phone || '').replace(/\D/g, '');
      const finalMsg = renderProcessedText(c, customMessage);
      const encoded = encodeURIComponent(finalMsg);
      if (phone) {
        setTimeout(() => {
          window.open(`https://wa.me/${phone.startsWith('56') ? phone : '56' + phone}?text=${encoded}`, '_blank');
        }, idx * 500);
        opened++;
      }
    });
    alert(`Se han abierto ${opened} chats de WhatsApp con mensajes personalizados de cierre.`);
  };

  const handleSendHtmlEmail = () => {
    if (selectedIds.length === 0) {
      alert('Selecciona al menos un contacto para preparar el envío por correo.');
      return;
    }
    const targets = filteredContacts.filter(c => selectedIds.includes(c.id));
    const validEmails = targets.map(c => c.email?.trim()).filter(Boolean);
    
    if (validEmails.length === 0) {
      alert('Los contactos seleccionados no tienen correos electrónicos válidos.');
      return;
    }

    try {
      navigator.clipboard.writeText(emailHtmlContent);
    } catch (e) {
      console.warn("Clipboard access denied", e);
    }

    const bcc = validEmails.join(',');
    const defaultBody = "Estimado(a) Dr(a).,\n\nAdjuntamos la información relevante sobre su programa y admisión en Escuela CIMASUR.\n\nSaludos cordiales,\nEquipo CIMASUR";
    const mailtoLink = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(defaultBody)}`;

    window.location.href = mailtoLink;

    const currentUser = localAuth.getCurrentUser();
    if (currentUser) {
      addAuditLog(currentUser, `Envío por Correo (Thunderbird) a ${validEmails.length} contactos de captación/escuela (Asunto: ${emailSubject})`, 'Escuela');
    }
    alert(`🚀 Abriendo Thunderbird / Gestor de Correo con ${validEmails.length} destinatarios en CCO (copia oculta).\n\nEl código HTML de la plantilla también se ha copiado a tu portapapeles.`);
  };

  const handleConvertLeadToStudent = async (lead: any) => {
    const confirm = window.confirm(`¿Confirmas matricular al prospecto ${lead.name} como Alumno Oficial de Escuela CIMASUR?`);
    if (!confirm) return;

    await localDB.saveToCollection('students', {
      id: 'std_' + Date.now(),
      name: lead.name,
      rut: lead.rut || '',
      email: lead.email || '',
      phone: lead.phone || '',
      diplomado: lead.interes || 'Diplomado Homeopatía Veterinaria',
      avance: 0,
      estado: 'Activo',
      fecha: new Date().toISOString().split('T')[0]
    });

    await localDB.updateInCollection('school_leads', lead.id, {
      estado: 'Matriculado',
      type: 'Alumno'
    });

    const currentUser = localAuth.getCurrentUser();
    if (currentUser) {
      addAuditLog(currentUser, `Matriculó al prospecto ${lead.name} como Alumno Oficial`, 'Escuela');
    }

    window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'students' } }));
    window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'school_leads' } }));
    alert(`🎉 ¡Excelente! ${lead.name} ha sido matriculado con éxito como Alumno.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-[#152035] rounded-3xl border border-[#1E293B] p-6 shadow-2xl space-y-6">
        
        {/* Header with Audience selector and Mode Switcher */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#1E293B] pb-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
              <span>Centro de Campañas &amp; Cierre de Ventas (Motor Escuela)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Captación activa de prospectos (leads veterinarios), ofertas de cierre de matrícula y mensajería directa para alumnos matriculados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* AUDIENCE SELECTOR */}
            <div className="flex items-center gap-1 bg-[#0e1626] p-1.5 rounded-xl border border-[#1E293B]">
              <button
                type="button"
                onClick={() => {
                  setTargetAudience('leads');
                  setSelectedIds([]);
                  setSelectedTemplate('discount_15');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer", 
                  targetAudience === 'leads' 
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-950/40" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>🎯 Leads &amp; Cierre Ventas ({leads.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetAudience('students');
                  setSelectedIds([]);
                  setSelectedTemplate('subscription');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer", 
                  targetAudience === 'students' 
                    ? "bg-sky-600 text-white shadow-lg" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>🎓 Alumnos Matriculados ({students.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetAudience('all');
                  setSelectedIds([]);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer", 
                  targetAudience === 'all' 
                    ? "bg-purple-600 text-white shadow" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Todos ({leads.length + students.length})</span>
              </button>
            </div>

            {/* CHANNEL MODE SWITCHER */}
            <div className="flex items-center gap-1 bg-[#111A2E] p-1.5 rounded-xl border border-[#1E293B]">
              <button
                type="button"
                onClick={() => setCampaignMode('whatsapp')}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer", campaignMode === 'whatsapp' ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white")}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setCampaignMode('email_html')}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer", campaignMode === 'email_html' ? "bg-sky-600 text-white shadow" : "text-slate-400 hover:text-white")}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Thunderbird (Email)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Mode: WhatsApp */}
        {campaignMode === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            <div className="lg:col-span-1 space-y-4 bg-[#111A2E] p-4 rounded-2xl border border-[#1E293B]">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Plantillas {targetAudience === 'leads' ? 'de Cierre y Captación' : 'Académicas'}</span>
                </h4>
              </div>
              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 custom-scrollbar">
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplate(t.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all cursor-pointer text-xs flex flex-col gap-1",
                      selectedTemplate === t.id 
                        ? "bg-emerald-950/50 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400/50" 
                        : "bg-[#152035] border-[#1E293B] text-slate-300 hover:bg-[#1C2C4E] hover:text-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black">{t.name}</span>
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded uppercase",
                        t.category === 'leads' ? "bg-orange-950 text-orange-400 border border-orange-800" : "bg-sky-950 text-sky-400 border border-sky-800"
                      )}>
                        {t.category === 'leads' ? 'Leads' : 'Alumnos'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4 bg-[#111A2E] p-4 rounded-2xl border border-[#1E293B] flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider">
                    Editor de Mensaje WhatsApp (Variables: &#123;&#123;nombre&#125;&#125;, &#123;&#123;curso&#125;&#125;, &#123;&#123;telefono&#125;&#125;)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800">
                    Personalización dinámica
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  className="w-full bg-[#152035] text-white border border-[#1E293B] rounded-xl p-3 text-xs outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Escribe el mensaje personalizado..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-400 border-t border-[#1E293B]">
                <span>💡 Selecciona los prospectos en la tabla para enviar en lote o haz clic en WhatsApp en cada fila para envío 1 a 1.</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(customMessage);
                      alert('Mensaje copiado al portapapeles.');
                    }}
                    className="px-3 py-1.5 bg-[#152035] border border-[#1E293B] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </button>
                  <button
                    type="button"
                    disabled={selectedIds.length === 0}
                    onClick={handleBulkWhatsApp}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg flex items-center gap-1.5 text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Masivo WhatsApp ({selectedIds.length})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Mode: Email HTML Builder */}
        {campaignMode === 'email_html' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
            <div className="space-y-4 bg-[#111A2E] p-4 rounded-2xl border border-[#1E293B] flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                    <Code className="w-3.5 h-3.5" />
                    <span>Editor de Plantilla HTML (Thunderbird / Email)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                    className="px-3 py-1 bg-[#152035] hover:bg-[#1C2C4E] text-[#38BDF8] border border-[#1E293B] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {showHtmlPreview ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showHtmlPreview ? 'Ver Código' : 'Vista Previa'}</span>
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Asunto del Correo</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full bg-[#152035] text-white border border-[#1E293B] rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-sky-500"
                  />
                </div>

                {!showHtmlPreview ? (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Código Fuente HTML (Variables: &#123;&#123;nombre&#125;&#125;, &#123;&#123;curso&#125;&#125;, &#123;&#123;email&#125;&#125;)</label>
                    <textarea
                      rows={12}
                      value={emailHtmlContent}
                      onChange={e => setEmailHtmlContent(e.target.value)}
                      className="w-full bg-[#152035] font-mono text-emerald-400 border border-[#1E293B] rounded-xl p-3 text-xs outline-none focus:border-sky-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vista Previa Renderizada</label>
                    <div 
                      className="w-full bg-[#152035] border border-[#1E293B] rounded-xl p-4 text-xs max-h-72 overflow-y-auto"
                      dangerouslySetInnerHTML={{ 
                        __html: emailHtmlContent
                          .replaceAll('{{nombre}}', 'Dr. Alumno Interesado')
                          .replaceAll('{{avance}}', '0')
                          .replaceAll('{{curso}}', 'Diplomado Homeopatía Veterinaria')
                          .replaceAll('{{email}}', 'doctor@ejemplo.cl') 
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-[#1E293B]">
                <span className="text-[10px] text-slate-400">💡 Se enviará a los {selectedIds.length} contactos seleccionados vía Thunderbird (CCO).</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(emailHtmlContent);
                      alert('Código HTML copiado al portapapeles.');
                    }}
                    className="px-3 py-2 bg-[#152035] hover:bg-[#1C2C4E] text-slate-300 border border-[#1E293B] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Copiar código HTML"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar HTML</span>
                  </button>
                  <button
                    type="button"
                    disabled={selectedIds.length === 0}
                    onClick={handleSendHtmlEmail}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Abrir en Thunderbird ({selectedIds.length})</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-[#111A2E] p-4 rounded-2xl border border-[#1E293B] flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">📋 Guía de Cierre &amp; Envío por Correo</h4>
                <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside">
                  <li>Al pulsar <strong className="text-sky-300">Abrir en Thunderbird</strong>, se abre tu cliente de correo con todos los contactos seleccionados en <strong>CCO (copia oculta)</strong> para respetar la privacidad.</li>
                  <li>El código HTML y contenido del mensaje se copia automáticamente a tu portapapeles para pegarlo en Thunderbird si deseas formato enriquecido.</li>
                  <li>Puedes usar las etiquetas <code className="text-sky-400 font-mono">&#123;&#123;nombre&#125;&#125;</code> y <code className="text-sky-400 font-mono">&#123;&#123;curso&#125;&#125;</code> para personalización automática.</li>
                </ul>
              </div>

              <div className="p-3 bg-[#152035] rounded-xl border border-[#1E293B] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black text-white block">Estado de Selección</span>
                  <span className="text-[10px] text-emerald-400 font-bold">{selectedIds.length} de {filteredContacts.length} contactos listos</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const preset = `<div style="font-family: Arial; padding: 20px; background: #0F172A; color: #FFF; border-radius: 12px;">\n  <h2>¡Hola Dr(a). {{nombre}}!</h2>\n  <p>Tenemos una beca especial con 15% de descuento en el arancel para matricularte en el {{curso}} de CIMASUR.</p>\n  <p>Responde este correo o comunícate vía WhatsApp para asegurar tu cupo.</p>\n</div>`;
                    setEmailHtmlContent(preset);
                  }}
                  className="px-3 py-1.5 bg-[#111A2E] hover:bg-[#1C2C4E] text-slate-300 border border-[#1E293B] rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cargar Plantilla Beca 15%
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Filters according to audience */}
        <div className="space-y-4 pt-4 border-t border-[#1E293B]">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            
            {/* LEADS FILTERS */}
            {targetAudience === 'leads' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Estado de Cierre:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterLeadStage('all')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterLeadStage === 'all' ? "bg-amber-600 text-white border-amber-500 shadow" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  Todos los Leads ({leads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterLeadStage('hot')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterLeadStage === 'hot' ? "bg-red-600 text-white border-red-500 shadow" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  🔥 Cierre Caliente ({hotLeadsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterLeadStage('negotiation')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterLeadStage === 'negotiation' ? "bg-blue-600 text-white border-blue-500 shadow" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  💬 En Negociación ({negotiationLeadsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterLeadStage('followup')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterLeadStage === 'followup' ? "bg-purple-600 text-white border-purple-500 shadow" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  ⏳ En Seguimiento
                </button>
                <button
                  type="button"
                  onClick={() => setFilterLeadStage('new')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterLeadStage === 'new' ? "bg-emerald-600 text-white border-emerald-500 shadow" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  🆕 Nuevos
                </button>
              </div>
            )}

            {/* STUDENTS FILTERS */}
            {targetAudience === 'students' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-sky-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Avance Académico:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterProgress('all')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterProgress === 'all' ? "bg-sky-600 text-white border-sky-500" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  Todos ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProgress('zero')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterProgress === 'zero' ? "bg-amber-600 text-white border-amber-500" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  ⚠️ Sin Avance (0%)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProgress('in_progress')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterProgress === 'in_progress' ? "bg-blue-600 text-white border-blue-500" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  🔵 En Proceso (1-50%)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProgress('advanced')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterProgress === 'advanced' ? "bg-purple-600 text-white border-purple-500" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  🚀 Avanzados (51-99%)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterProgress('completed')}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer", filterProgress === 'completed' ? "bg-emerald-600 text-white border-emerald-500" : "bg-[#111A2E] text-slate-300 border-[#1E293B]")}
                >
                  💚 Terminados (100%)
                </button>
              </div>
            )}

            {targetAudience === 'all' && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Mostrando base unificada: Leads de Captación + Alumnos Matriculados</span>
              </div>
            )}

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nombre, RUT, curso, fono..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Contacts Table (Leads / Students) */}
          <div className="bg-[#111A2E] rounded-2xl border border-[#1E293B] overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#1C2C4E] text-white uppercase text-[10px] font-black tracking-wider border-b border-[#1E293B]">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredContacts.length > 0 && selectedIds.length === filteredContacts.length}
                        onChange={toggleSelectAll}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">
                      {targetAudience === 'leads' ? 'Prospecto / Lead de Venta' : targetAudience === 'students' ? 'Estudiante' : 'Contacto / Prospecto'}
                    </th>
                    <th className="p-3">RUT / Teléfono</th>
                    <th className="p-3">Programa / Diplomado de Interés</th>
                    <th className="p-3 text-center">
                      {targetAudience === 'leads' ? 'Temperatura / Cierre' : 'Avance / Estado'}
                    </th>
                    <th className="p-3 text-right">Acciones de Cierre &amp; Contacto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((c, idx) => {
                      const isSelected = selectedIds.includes(c.id);
                      const isLead = c._recordType === 'lead';
                      const courseName = c.interes || c.diplomado || 'Diplomado Homeopatía';
                      const hot = isLead && isHotLead(c);

                      return (
                        <tr key={c.id || idx} className={cn("hover:bg-[#152035] transition-colors", isSelected && "bg-emerald-950/20")}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectContact(c.id)}
                              className="rounded accent-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white block text-xs">{c.name}</span>
                              {isLead && (
                                <span className="bg-amber-500/20 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-500/30">
                                  LEAD
                                </span>
                              )}
                              {!isLead && (
                                <span className="bg-sky-500/20 text-sky-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-sky-500/30">
                                  ALUMNO
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>{c.email || 'Sin email'}</span>
                              {c.clasificacion && (
                                <span className="text-slate-500">• {c.clasificacion}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-slate-300 block">{c.rut || '---'}</span>
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {c.phone || 'Sin teléfono'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-sky-300">
                            {courseName}
                          </td>
                          <td className="p-3 text-center">
                            {isLead ? (
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider inline-flex items-center gap-1",
                                hot ? "bg-red-950/80 text-red-300 border-red-600 shadow-sm" :
                                isNegotiationLead(c) ? "bg-amber-950/80 text-amber-300 border-amber-600" :
                                "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                              )}>
                                {hot ? <Flame className="w-3 h-3 text-red-400" /> : null}
                                {c.interestLevel ? `Interés: ${c.interestLevel}` : (c.estado || 'Lead Activo')}
                              </span>
                            ) : (
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black border",
                                (c.avance || 0) === 0 ? "bg-amber-950/60 text-amber-400 border-amber-800" :
                                (c.avance || 0) < 50 ? "bg-blue-950/60 text-blue-400 border-blue-800" :
                                (c.avance || 0) < 100 ? "bg-purple-950/60 text-purple-400 border-purple-800" :
                                "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                              )}>
                                {c.avance || 0}% Avance
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Action: Convert Lead to Student (Matricular) */}
                              {isLead && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertLeadToStudent(c)}
                                  className="px-2 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow transition-all cursor-pointer"
                                  title="Matricular y pasar inmediatamente a Alumno Oficial"
                                >
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  <span>Matricular</span>
                                </button>
                              )}

                              {/* Action: Direct Thunderbird Email */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (!c.email) {
                                    alert(`El contacto ${c.name} no tiene correo electrónico registrado.`);
                                    return;
                                  }
                                  const subject = emailSubject || `Información Diplomado - Escuela CIMASUR`;
                                  const body = `Estimado(a) Dr(a). ${c.name},\n\nLe contactamos desde la Escuela de Capacitación CIMASUR respecto a su interés en el programa ${courseName}.\n\nSaludos cordiales,\nEquipo CIMASUR`;
                                  window.location.href = `mailto:${c.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                }}
                                className="px-2.5 py-1.5 bg-[#1E3A5F] hover:bg-[#2B4C7E] text-sky-200 hover:text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="Enviar Correo directo vía Thunderbird"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email (Thunderbird)</span>
                              </button>

                              {/* Action: Customize text */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIndividualModalContact(c);
                                  setIndividualCustomText(renderProcessedText(c, customMessage));
                                }}
                                className="px-2.5 py-1.5 bg-sky-950/40 hover:bg-sky-900/40 text-sky-300 border border-sky-800/50 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="Personalizar mensaje específico para este contacto"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Personalizar</span>
                              </button>

                              {/* Action: WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(c)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                                title="Enviar WhatsApp inmediato"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs italic">
                        No se encontraron {targetAudience === 'leads' ? 'leads de captación' : 'alumnos'} que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#152035] border-t border-[#1E293B] flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-wider">
              <span>Total Contactos Filtrados: {filteredContacts.length}</span>
              <span>Seleccionados para campaña: {selectedIds.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Custom Message Modal */}
      {individualModalContact && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#152035] border border-[#1E293B] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>Mensaje Personalizado para: {individualModalContact.name}</span>
            </h3>
            <p className="text-xs text-slate-300">
              Programa de Interés: <strong className="text-sky-300">{individualModalContact.interes || individualModalContact.diplomado || 'Diplomado'}</strong> {individualModalContact.phone && <>| WhatsApp: <strong className="text-emerald-400">{individualModalContact.phone}</strong></>}
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mensaje de Cierre / Seguimiento (Editable)</label>
              <textarea
                rows={6}
                value={individualCustomText}
                onChange={e => setIndividualCustomText(e.target.value)}
                className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-xl p-3 text-xs outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setIndividualModalContact(null)}
                className="px-4 py-2 bg-[#111A2E] text-slate-300 border border-[#1E293B] rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSendWhatsApp(individualModalContact, individualCustomText);
                  setIndividualModalContact(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar WhatsApp Personalizado</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
