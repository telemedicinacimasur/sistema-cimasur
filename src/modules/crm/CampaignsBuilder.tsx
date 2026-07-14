import React, { useState, useEffect, useMemo } from 'react';
import MarketingBuilder from './MarketingBuilder';
import { SuggestedCampaign } from '../../services/crm/CampaignStrategyService';
import { ClientService } from '../../services/crm/ClientService';
import { localDB } from '../../lib/auth';
import { Client } from '../../services/crm/types';
import { Users, Mail, Send, CheckSquare, Square, Trash2, MessageSquare, Laptop, Copy, Image as ImageIcon, ExternalLink, X, Check, Download, AlertCircle, Sparkles } from 'lucide-react';

export default function CampaignsBuilder({ 
  dashboardData, 
  onViewClient,
  preloadedTemplate,
  preloadedClientIds,
  clearPreloadedTemplate
}: { 
  dashboardData: any; 
  onViewClient: (id: string) => void;
  preloadedTemplate?: string | null;
  preloadedClientIds?: string[];
  clearPreloadedTemplate?: () => void;
}) {
  const [selectedCampaign, setSelectedCampaign] = useState<SuggestedCampaign | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Todos']);
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // Effect to preload client ids if provided
  useEffect(() => {
    if (preloadedClientIds && preloadedClientIds.length > 0) {
      setSelectedClientIds(new Set(preloadedClientIds));
    }
  }, [preloadedClientIds]);
  const [redemptions, setRedemptions] = useState<any[]>([]);

  const [activeHelperClient, setActiveHelperClient] = useState<any | null>(null);
  const [copyImageSuccess, setCopyImageSuccess] = useState<boolean>(false);
  const [copyTextSuccess, setCopyTextSuccess] = useState<boolean>(false);

  const suggestedCampaigns = dashboardData?.suggestedCampaigns || [];
  const clientService = useMemo(() => new ClientService(
    (col) => localDB.getCollection(col),
    (col, item) => localDB.saveToCollection(col, item),
    (col, id, updates) => localDB.updateInCollection(col, id, updates)
  ), []);

  const categories = ['Todos', 'Sin Compra', 'Sin Categoría', 'Bronce', 'Plata', 'Oro', 'Platinum'];

  const BENEFITS_BY_CATEGORY: Record<string, string[]> = {
    'Sin Compra': [
      'Cupón de inducción: 5% de descuento fijo en su primera compra de fórmulas magistrales homeopáticas.',
      'Asesoramiento inicial sin costo en la prescripción de fórmulas medicinales.',
      'Soporte comercial prioritario vía WhatsApp.'
    ],
    'Sin Categoría': [
      'Soporte estándar por correo electrónico.',
      'Acceso al catálogo digital de productos homeopáticos y fitoterapéuticos.',
      'Invitación a boletines mensuales informativos.'
    ],
    'Bronce': [
      '5% de descuento en el total de compras del ciclo activo.',
      'Acceso gratuito a 1 capacitación del catálogo educativo anual de CIMASUR.',
      'Puntos acumulativos para canje: 1 punto por cada $1,000 CLP de compra.'
    ],
    'Plata': [
      '10% de descuento fijo en todas las fórmulas homeopáticas magistrales.',
      'Acceso libre a 3 charlas de capacitación técnica veterinaria en vivo.',
      'Prioridad media en soporte técnico veterinario y clínico.',
      'Puntos acumulativos para canje: 1.2 puntos por cada $1,000 CLP de compra.'
    ],
    'Oro': [
      '15% de descuento en fórmulas y catálogo premium de fitoterapia.',
      'Invitación preferencial a seminarios científicos anuales y eventos exclusivos.',
      'Acceso ilimitado a todas las capacitaciones y certificaciones de CIMASUR.',
      'Soporte clínico inmediato (médico veterinario dedicado).',
      'Puntos acumulativos para canje: 1.5 puntos por cada $1,000 CLP de compra.'
    ],
    'Platinum': [
      '20% de descuento total y permanente en el catálogo de CIMASUR.',
      'Material de marketing personalizado gratuito para su clínica o consultorio.',
      'Envíos gratuitos garantizados a todo Chile en un plazo máximo de 48 horas sin costo adicional.',
      'Soporte prioritario VIP de nivel corporativo 24/7.',
      'Puntos acumulativos para canje: 2 puntos por cada $1,000 CLP de compra.'
    ]
  };

  const getBenefitsTextForSelected = (selectedCats: string[]) => {
    let text = `📱 *Club de Socios CIMASUR (2026)* 📱\n\nEstimado/a Doctor/a,\n\nQueremos presentarle de forma detallada los beneficios que tiene asignados según su nivel comercial de membresía:\n\n`;
    selectedCats.forEach(cat => {
      if (cat === 'Todos') return;
      const list = BENEFITS_BY_CATEGORY[cat] || [];
      if (list.length > 0) {
        text += `👑 *Nivel: Club ${cat.toUpperCase()}*\n`;
        list.forEach(benefit => {
          text += `• ${benefit}\n`;
        });
        text += `\n`;
      }
    });
    text += `¡No deje pasar sus privilegios comerciales! Escriba *CLUB2026* o póngase en contacto con su ejecutivo asignado hoy mismo para empezar a canjear sus premios premium.`;
    return text;
  };

  useEffect(() => {
    const loadRedemptions = async () => {
      try {
        const data = await localDB.getCollection('redemptions');
        setRedemptions(data || []);
      } catch (e) {
        console.error("Error loading redemptions", e);
      }
    };
    loadRedemptions();
  }, []);

  const getFilteredClients = (camp: SuggestedCampaign | null, catFilterOrList: string | string[], clientsList: Client[] = allClients) => {
    let clients = clientsList;
    
    // If a campaign is specifically selected (though now optional), we use its targets.
    // Otherwise, we start with all clients to ensure category filters work across the whole DB.
    if (camp) {
      const targetIds = new Set(camp.opportunities?.map((o: any) => o.customerId) || []);
      const targeted = clientsList.filter(c => {
        return targetIds.has(c.rut) || targetIds.has(c.id);
      });

      // Fallback logic if the campaign doesn't have specific opportunities (e.g. general campaigns)
      if (targeted.length === 0 && camp.targetCategory) {
        clients = clientsList.filter(c => {
          const rawCat = c.categoria || c.clubCategory || c.clubComercial?.categoria || 'Sin Categoría';
          const cat = typeof rawCat === 'string' ? rawCat.toUpperCase() : '';
          const target = typeof camp.targetCategory === 'string' ? camp.targetCategory.toUpperCase() : '';
          const name = typeof camp.name === 'string' ? camp.name.toUpperCase() : '';
          
          if (target === 'SIN COMPRA' || name.includes('PRIMERA COMPRA') || target === 'SIN CATEGORÍA' || target === 'SIN CATEGORIA') {
            const isSinCompra = cat === 'SIN COMPRA' || cat === 'SIN CATEGORIA' || cat === 'SIN CATEGORÍA';
            const isInactiveIntranet = (c.intranet === true || c.intranet === 'true') && 
              (c.estado === 'Inactivo' || c.estadoCrm === 'Inactivo' || !c.compras || c.compras === 0);
            return isSinCompra || isInactiveIntranet;
          }
          
          return cat.includes(target) || target.includes(cat);
        });
      } else if (targeted.length > 0) {
        clients = targeted;
      }
    }

    const filtersArray = Array.isArray(catFilterOrList) ? catFilterOrList : [catFilterOrList];

    if (!filtersArray.includes('Todos') && filtersArray.length > 0) {
        clients = clients.filter(c => {
          const rawCat = c.categoria || c.clubCategory || c.clubComercial?.categoria || 'Sin Categoría';
          const normA = typeof rawCat === 'string' ? rawCat.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
          
          return filtersArray.some(filter => {
            const normB = typeof filter === 'string' ? filter.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
            return normA === normB || normA.includes(normB) || normB.includes(normA);
          });
        });
    }

    return clients;
  };

  const applyFiltersAndSelectAll = (camp: SuggestedCampaign | null, catFilterOrList: string | string[], clientsList: Client[] = allClients) => {
    const clients = getFilteredClients(camp, catFilterOrList, clientsList);
    setSelectedClientIds(new Set(clients.map(c => c.id)));
  };

  useEffect(() => {
    const loadClients = async () => {
      try {
        const crmContacts = await localDB.getCollection('contacts');
        const intranetClients = await localDB.getCollection('intranet_clients');
        
        const unified = [
          ...crmContacts.map((c: any) => ({ ...c, isCRM: true, intranet: c.intranet === 'Si' })),
          ...intranetClients.map((c: any) => ({ ...c, isCRM: false, intranet: true, categoria: c.categoria || 'Sin Categoría' }))
        ];

        // Deduplicate
        const uniqueClients = new Map();
        unified.forEach((c: any) => {
          const key = c.rut || c.id || c.email;
          if (key) {
            if (!uniqueClients.has(key)) {
              uniqueClients.set(key, c);
            } else if (c.isCRM) {
              uniqueClients.set(key, { ...uniqueClients.get(key), isCRM: true, ...c });
            }
          }
        });
        
        const clientsList = Array.from(uniqueClients.values());
        setAllClients(clientsList);

        // Preload template check or default suggested campaign selection
        if (preloadedTemplate && preloadedTemplate.toLowerCase().includes('veterinario')) {
          const vets = clientsList.filter(c => c.intranet === true || c.categoria?.toLowerCase().includes('veterinario') || c.name?.toLowerCase().includes('veterinari'));
          setSelectedClientIds(new Set(vets.map(c => c.id)));
        } else if (preloadedTemplate && preloadedTemplate.toLowerCase() === 'primera compra') {
          setSelectedCategory('Sin Compra');
          const pcCamp = suggestedCampaigns.find((c: any) => 
            c.name?.toLowerCase().includes('primera') || 
            c.targetCategory?.toLowerCase().includes('compra') || 
            c.name?.toLowerCase().includes('prospect')
          ) || suggestedCampaigns[0];
          if (pcCamp) {
            setSelectedCampaign(pcCamp);
            const clients = getFilteredClients(pcCamp, 'Sin Compra', clientsList);
            setSelectedClientIds(new Set(clients.map(c => c.id)));
          }
        } else {
          // Default: load all clients and filter by category (usually "Todos")
          const clients = getFilteredClients(null, selectedCategory, clientsList);
          setSelectedClientIds(new Set(clients.map(c => c.id)));
        }
      } catch (e) {
        console.error("Error loading unified clients", e);
      }
    };
    loadClients();
  }, [clientService]);

  // Handle template preloading trigger for veterinarians & Primera Compra
  useEffect(() => {
    if (preloadedTemplate && preloadedTemplate.toLowerCase().includes('veterinario') && allClients.length > 0) {
      const vets = allClients.filter(c => c.intranet === true || c.categoria?.toLowerCase().includes('veterinario') || c.name?.toLowerCase().includes('veterinari'));
      setSelectedClientIds(new Set(vets.map(c => c.id)));
    } else if (preloadedTemplate && preloadedTemplate.toLowerCase() === 'primera compra' && allClients.length > 0) {
      setSelectedCategory('Sin Compra');
      setSelectedCategories(['Sin Compra']);
      const pcCamp = suggestedCampaigns.find((c: any) => 
        c.name?.toLowerCase().includes('primera') || 
        c.targetCategory?.toLowerCase().includes('compra') || 
        c.name?.toLowerCase().includes('prospect')
      ) || suggestedCampaigns[0];
      if (pcCamp) {
        setSelectedCampaign(pcCamp);
        const clients = getFilteredClients(pcCamp, 'Sin Compra', allClients);
        setSelectedClientIds(new Set(clients.map(c => c.id)));
      }
      if (clearPreloadedTemplate) {
        clearPreloadedTemplate();
      }
    }
  }, [preloadedTemplate, allClients, suggestedCampaigns]);

  const filteredClients = useMemo(() => {
    return getFilteredClients(selectedCampaign, selectedCategories);
  }, [allClients, selectedCampaign, selectedCategories]);

  const selectedClients = useMemo(() => allClients.filter(c => selectedClientIds.has(c.id)), [allClients, selectedClientIds]);

  const handleSelectAll = () => {
    if (selectedClientIds.size === filteredClients.length) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleToggleClient = (id: string) => {
    const next = new Set(selectedClientIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedClientIds(next);
  };

  const registerCampaignLog = async (client: any, tipoCampana: string) => {
    try {
      const currentBitacora = client.bitacora ? (typeof client.bitacora === 'string' ? JSON.parse(client.bitacora) : client.bitacora) : [];
      const newEntry = {
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        comentario: `Envío de campaña ${tipoCampana}: ${selectedCampaign?.name || 'Manual'}`,
        creador: 'Usuario CRM'
      };
      const updated = [newEntry, ...currentBitacora];
      await localDB.updateInCollection('contacts', client.id, { bitacora: JSON.stringify(updated) });
    } catch (e) {
      console.error("Error logging campaign", e);
    }
  };

  const handleSendEmail = async () => {
    const bcc = selectedClients.map(c => c.email).filter(e => !!e).join(',');
    const subject = (document.getElementById('email-subject-input') as HTMLInputElement)?.value || `Campaña: ${selectedCampaign?.name || 'Información Importante'}`;
    const htmlContent = document.getElementById('email-preview-content')?.innerHTML || 'No content generated.';

    const emlContent = `To: Recipients <undisclosed-recipients@example.com>\r
Bcc: ${bcc}\r
Subject: ${subject}\r
X-Unsent: 1\r
Content-Type: text/html; charset=utf-8\r
\r
${htmlContent}`;

    const blob = new Blob([emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `campana_${Date.now()}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Register log for each selected client
    for (const c of selectedClients) {
      await registerCampaignLog(c, 'Email');
    }
    alert('Campaña por Email generada y registrada en bitácoras.');
  };

  const getClientVariableValue = (client: any, tag: string): string => {
    if (!client) return '';
    switch (tag) {
      case '{{nombre}}':
        return client.name || client.nombre || client.contacto || 'Socio Veterinario';
      case '{{categoria_club}}':
        return client.categoria || client.clubCategory || client.clubComercial?.categoria || 'Sin Categoría';
      case '{{frascos_comprados}}':
        const compras = client.compras !== undefined ? client.compras : (client.frascos !== undefined ? client.frascos : 0);
        return `${compras} frascos`;
      case '{{promedio_mensual}}':
        const val = client.promedio || client.promedioMensual || 0;
        return `$${Math.round(val).toLocaleString('es-CL')} CLP`;
      case '{{estado_origen}}':
        return client.region || client.region_origen || client.ciudad || 'Región Metropolitana';
      default:
        return '';
    }
  };

  const getProcessedTextForClient = (client: any) => {
    const whatsappMessage = (document.getElementById('wa-body-text') as HTMLTextAreaElement)?.value || '';

    let textToSend = whatsappMessage || "";

    textToSend = textToSend
      .replace(/{{nombre}}/g, getClientVariableValue(client, '{{nombre}}'))
      .replace(/{{categoria_club}}/g, getClientVariableValue(client, '{{categoria_club}}'))
      .replace(/{{frascos_comprados}}/g, getClientVariableValue(client, '{{frascos_comprados}}'))
      .replace(/{{promedio_mensual}}/g, getClientVariableValue(client, '{{promedio_mensual}}'))
      .replace(/{{estado_origen}}/g, getClientVariableValue(client, '{{estado_origen}}'));

    // Limpieza de caracteres corruptos de reemplazo (U+FFFD)
    textToSend = textToSend.replace(/\uFFFD/g, '');

    return textToSend;
  };

  const handleQuickSendWhatsApp = async (client: any) => {
    const textToSend = getProcessedTextForClient(client);
    const encodedText = encodeURIComponent(textToSend).replace(/%2A/g, '*');
    const cleanPhoneVal = client.phone || client.telefono || "";
    const cleanPhone = cleanPhoneVal ? String(cleanPhoneVal).replace(/\s+/g, '') : "";
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    
    await registerCampaignLog(client, 'WhatsApp');
  };

  const handleCopyImageToClipboard = async (imageUrl: string) => {
    try {
      setCopyImageSuccess(false);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      let copyBlob = blob;
      // Convertir a PNG para garantizar soporte nativo de la API de Portapapeles (ClipboardItem)
      if (blob.type !== 'image/png') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (pngBlob) {
            copyBlob = pngBlob;
          }
        }
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [copyBlob.type]: copyBlob
        })
      ]);
      setCopyImageSuccess(true);
      setTimeout(() => setCopyImageSuccess(false), 3000);
    } catch (err) {
      console.error('Error al copiar imagen:', err);
      // Fallback: descargar imagen para que la arrastren
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'cabecera_promocional.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setCopyImageSuccess(true);
      setTimeout(() => setCopyImageSuccess(false), 3000);
    }
  };

  const handleCopyTextToClipboard = (text: string) => {
    setCopyTextSuccess(false);
    navigator.clipboard.writeText(text);
    setCopyTextSuccess(true);
    setTimeout(() => setCopyTextSuccess(false), 3000);
  };

  const handleSendWhatsApp = (client: any) => {
    setActiveHelperClient(client);
  };

  return (
    <div className="w-full min-h-screen grid grid-cols-12 gap-4 bg-slate-950 text-slate-100 p-4">
      
      <div className="col-span-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-2rem)]">
        <h2 className="text-lg font-bold text-white">1. Seleccionar Segmento</h2>
        
        <div className="space-y-1 bg-[#050914] p-3 rounded-xl border border-slate-850">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Filtrar Categorías (Multi-selección)</label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => {
              const isChecked = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    let nextCats: string[];
                    if (cat === 'Todos') {
                      nextCats = ['Todos'];
                      setSelectedCategory('Todos');
                    } else {
                      // Remove Todos
                      const base = selectedCategories.filter(c => c !== 'Todos');
                      if (isChecked) {
                        nextCats = base.filter(c => c !== cat);
                        if (nextCats.length === 0) {
                          nextCats = ['Todos'];
                          setSelectedCategory('Todos');
                        }
                      } else {
                        nextCats = [...base, cat];
                        setSelectedCategory(cat); // maintain single compatible state
                      }
                    }
                    setSelectedCategories(nextCats);
                    applyFiltersAndSelectAll(selectedCampaign, nextCats);
                  }}
                  className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-sky-950/40 border-sky-500 text-sky-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {isChecked ? <CheckSquare size={13} className="text-sky-400" /> : <Square size={13} className="text-slate-500" />}
                  <span className="truncate">{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel de Beneficios y Premios del Segmento */}
        <div className="bg-[#050914] border border-slate-850 rounded-xl p-3 space-y-2.5">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles size={12} className="text-yellow-400 animate-pulse" />
            Beneficios del Segmento
          </h3>
          
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {selectedCategories.includes('Todos') ? (
              <p className="text-[10px] text-slate-500 italic">Seleccione categorías específicas para visualizar los beneficios del catálogo asignados.</p>
            ) : (
              selectedCategories.map(cat => {
                const list = BENEFITS_BY_CATEGORY[cat] || [];
                if (list.length === 0) return null;
                return (
                  <div key={cat} className="space-y-1">
                    <span className="text-[10px] font-extrabold text-sky-400 uppercase">{cat}</span>
                    <ul className="list-disc pl-3 text-[10px] text-slate-300 space-y-0.5">
                      {list.map((b, idx) => <li key={idx}>{b}</li>)}
                    </ul>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-800 pt-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block mb-1">Registro de Canjes Realizados</span>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {(() => {
                const clientRutsOrIds = new Set(filteredClients.map(c => c.rut || c.id));
                const activeRedemptions = redemptions.filter(r => clientRutsOrIds.has(r.contactId));
                if (activeRedemptions.length === 0) {
                  return <p className="text-[9px] text-slate-500 italic">Ningún cliente del segmento seleccionado ha canjeado premios aún.</p>;
                }
                return activeRedemptions.map(r => {
                  const client = allClients.find(c => c.rut === r.contactId || c.id === r.contactId);
                  const rewardName = r.rewardId === 'r_desc_10' ? 'Cupón 10% Descuento' : r.rewardId === 'r_desc_20' ? 'Cupón 20% Descuento' : r.rewardId === 'r_prod_base' ? 'Set 3 Frascos Gratuitos' : r.rewardId === 'r_envio_gratis' ? 'Despacho Gratis (6 Meses)' : 'Vademécum Impreso Premium';
                  return (
                    <div key={r.id} className="text-[9px] bg-slate-950/40 p-1.5 rounded border border-slate-900 flex justify-between items-center">
                      <span className="text-slate-300 font-bold max-w-[120px] truncate">{client?.name || 'Cliente'}</span>
                      <span className="text-yellow-400 truncate">{rewardName}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Botón interactivo para cargar beneficios */}
          {!selectedCategories.includes('Todos') && selectedCategories.length > 0 && (
            <button
              onClick={() => {
                const text = getBenefitsTextForSelected(selectedCategories);
                window.dispatchEvent(new CustomEvent('assistant-update-editor', {
                  detail: { whatsappMessage: text, emailBody: text }
                }));
              }}
              className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer mt-1"
            >
              <Copy size={12} /> Cargar Beneficios en Editor
            </button>
          )}
        </div>

          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Clientes ({filteredClients.length})</h3>
              <button onClick={handleSelectAll} className="text-[10px] text-sky-400 font-bold flex items-center gap-1">
                {selectedClientIds.size === filteredClients.length ? <CheckSquare size={12}/> : <Square size={12}/>} Seleccionar Todos
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredClients.map(client => (
                <div key={client.id} className="flex items-center gap-2 p-1.5 bg-slate-800/50 rounded-md">
                  <button onClick={() => handleToggleClient(client.id)} className="text-sky-500">
                    {selectedClientIds.has(client.id) ? <CheckSquare size={14}/> : <Square size={14}/>}
                  </button>
                  <span className="text-xs">{client.name}</span>
                </div>
              ))}
            </div>
          </div>
      </div>

      <div className="col-span-8 bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 h-[calc(100vh-2rem)]">
        <div className="flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-white">2. Diseñar y Enviar</h2>
          <div className="flex gap-2">
             <button onClick={() => setChannel('email')} className={`p-2 rounded-lg ${channel === 'email' ? 'bg-sky-600' : 'bg-slate-800'}`}><Mail size={16}/></button>
             <button onClick={() => setChannel('whatsapp')} className={`p-2 rounded-lg ${channel === 'whatsapp' ? 'bg-emerald-600' : 'bg-slate-800'}`}><MessageSquare size={16}/></button>
             <button className="p-2 rounded-lg bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50">
               <Trash2 size={16} />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-800 rounded-lg">
            <MarketingBuilder 
              isEmbedded={true} 
              activeChannel={channel} 
              preloadedTemplate={preloadedTemplate}
              clearPreloadedTemplate={clearPreloadedTemplate}
              selectedClients={selectedClients}
            />
        </div>

        <div className="border-t border-slate-800 pt-4 shrink-0 max-h-48 overflow-y-auto">
            {channel === 'email' ? (
                <button 
                    disabled={selectedClientIds.size === 0}
                    onClick={handleSendEmail}
                    className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all text-sm"
                >
                    <Send size={16}/> Enviar por Email (Thunderbird) a {selectedClientIds.size} seleccionados
                </button>
            ) : (
                <div className="space-y-2">
                    {selectedClients.length === 0 ? (
                        <div className="text-slate-500 text-center py-4 text-sm">Seleccione clientes en el panel izquierdo para ver opciones de envío.</div>
                    ) : (
                        selectedClients.map(client => (
                            <div key={client.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                <span className="text-sm font-medium">{client.name}</span>
                                <button onClick={() => handleSendWhatsApp(client)} className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-all">
                                    <MessageSquare size={14}/> Enviar a {client.name}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
      </div>

      {/* WhatsApp Send Pro Helper Modal */}
      {activeHelperClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white font-sans">Asistente de Envío de Alta Fidelidad</h3>
                  <p className="text-[10px] text-slate-400 font-sans">Canal exclusivo WhatsApp • {activeHelperClient.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveHelperClient(null);
                  setCopyImageSuccess(false);
                  setCopyTextSuccess(false);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 font-sans">
              
              {/* Context / Explicación */}
              <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <span className="font-bold text-teal-400 flex items-center gap-1">
                  <Sparkles size={13} /> ¿Por qué usar este asistente?
                </span>
                <p className="leading-relaxed">
                  Las URLs comunes de imágenes en WhatsApp se envían como enlaces de texto que se ven feos. 
                  Con este método rápido, puedes enviar la <strong>imagen promocional real incrustada</strong> (como un archivo nativo adjunto) con tu mensaje personalizado como leyenda, tal como en la vista previa y sin ningún enlace largo de por medio.
                </p>
              </div>

              {/* 3 Step Guide */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Guía de 3 Pasos Rápidos</h4>

                {/* Paso 1 */}
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                    1
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-200">Copiar la Imagen de Cabecera</p>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Copia el diseño gráfico. Si tu navegador bloquea el copiado directo por seguridad, se descargará automáticamente para que la arrastres a WhatsApp.
                    </p>
                    <button
                      onClick={() => handleCopyImageToClipboard(
                        (document.getElementById('wa-header-image') as HTMLInputElement)?.value || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800'
                      )}
                      className={`py-2 px-3.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                        copyImageSuccess 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {copyImageSuccess ? <Check size={14} /> : <ImageIcon size={14} />}
                      {copyImageSuccess ? '¡Imagen copiada! (o descargada)' : 'Copiar Imagen promocional'}
                    </button>
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                    2
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-200">Copiar el Mensaje de Texto Personalizado</p>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Copia el mensaje de texto comercial con los datos del socio <strong>{activeHelperClient.name}</strong> listos y procesados de manera automática.
                    </p>
                    <button
                      onClick={() => handleCopyTextToClipboard(getProcessedTextForClient(activeHelperClient))}
                      className={`py-2 px-3.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                        copyTextSuccess 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {copyTextSuccess ? <Check size={14} /> : <Copy size={14} />}
                      {copyTextSuccess ? '¡Mensaje Copiado!' : 'Copiar Texto para WhatsApp'}
                    </button>

                    {/* Collapsible preview of text */}
                    <div className="p-2.5 bg-slate-950 rounded-lg text-[10px] font-mono text-slate-400 whitespace-pre-wrap max-h-24 overflow-y-auto border border-slate-800/80">
                      {getProcessedTextForClient(activeHelperClient)}
                    </div>
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-xs font-bold text-slate-300 flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                    3
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-200">Abrir WhatsApp y Pegar</p>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Abre el chat de WhatsApp. Presiona <strong>Ctrl + V</strong> (o Pegar). Verás que la imagen se adjunta como un archivo de verdad; luego, pega el texto copiado en el comentario de la imagen. ¡Eso es todo!
                    </p>
                    <button
                      onClick={() => {
                        const cleanPhoneVal = activeHelperClient.phone || activeHelperClient.telefono || "";
                        const cleanPhone = cleanPhoneVal ? String(cleanPhoneVal).replace(/\s+/g, '') : "";
                        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}`, '_blank');
                      }}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-950/20"
                    >
                      <ExternalLink size={14} /> Abrir Chat de WhatsApp
                    </button>
                  </div>
                </div>

              </div>

              {/* Opción B/Alternativa */}
              <div className="border-t border-slate-800 pt-4 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">¿Tienes Prisa?</span>
                <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-400">
                    Puedes realizar el envío rápido directo (se envía como un enlace largo de texto con la URL de la imagen).
                  </p>
                  <button
                    onClick={() => handleQuickSendWhatsApp(activeHelperClient)}
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 underline shrink-0 flex items-center gap-0.5"
                  >
                    Envío Rápido Directo <ExternalLink size={10} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
