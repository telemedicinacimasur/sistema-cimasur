import React, { useState, useEffect, useMemo } from 'react';
import MarketingBuilder from './MarketingBuilder';
import { SuggestedCampaign } from '../../services/crm/CampaignStrategyService';
import { ClientService } from '../../services/crm/ClientService';
import { localDB } from '../../lib/auth';
import { Client } from '../../services/crm/types';
import { Users, Mail, Send, CheckSquare, Square, Trash2, MessageSquare, Laptop } from 'lucide-react';

export default function CampaignsBuilder({ 
  dashboardData, 
  onViewClient,
  preloadedTemplate,
  clearPreloadedTemplate
}: { 
  dashboardData: any; 
  onViewClient: (id: string) => void;
  preloadedTemplate?: string | null;
  clearPreloadedTemplate?: () => void;
}) {
  const [selectedCampaign, setSelectedCampaign] = useState<SuggestedCampaign | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  const suggestedCampaigns = dashboardData?.suggestedCampaigns || [];
  const clientService = useMemo(() => new ClientService(
    (col) => localDB.getCollection(col),
    (col, item) => localDB.saveToCollection(col, item),
    (col, id, updates) => localDB.updateInCollection(col, id, updates)
  ), []);

  const categories = useMemo(() => {
    const cats = new Set(allClients.map(c => {
      const cat = c.categoria || c.clubCategory || c.clubComercial?.categoria || 'Sin Categoria';
      return typeof cat === 'string' ? cat : 'Sin Categoria';
    }));
    return ['Todos', ...Array.from(cats)];
  }, [allClients]);

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
        
        setAllClients(Array.from(uniqueClients.values()));
      } catch (e) {
        console.error("Error loading unified clients", e);
      }
    };
    loadClients();
  }, [clientService]);

  const filteredClients = useMemo(() => {
    if (!selectedCampaign) return [];
    
    // GrowthEngine attaches specific opportunities to each campaign.
    // Use those to accurately find the clients instead of guessing by category strings.
    const targetIds = new Set(selectedCampaign.opportunities?.map((o: any) => o.customerId) || []);
    
    let clients = allClients.filter(c => {
      // Opportunites are linked by client rut or id
      return targetIds.has(c.rut) || targetIds.has(c.id);
    });

    // Fallback logic if the campaign doesn't have specific opportunities (e.g. general campaigns)
    if (clients.length === 0 && selectedCampaign.targetCategory) {
      clients = allClients.filter(c => {
        const rawCat = c.categoria || c.clubCategory || c.clubComercial?.categoria || 'Sin Categoría';
        const cat = typeof rawCat === 'string' ? rawCat.toUpperCase() : '';
        const target = typeof selectedCampaign.targetCategory === 'string' ? selectedCampaign.targetCategory.toUpperCase() : '';
        const name = typeof selectedCampaign.name === 'string' ? selectedCampaign.name.toUpperCase() : '';
        
        // Special Logic for "Primera Compra" or "SIN COMPRA"
        if (target === 'SIN COMPRA' || name.includes('PRIMERA COMPRA') || target === 'SIN CATEGORÍA' || target === 'SIN CATEGORIA') {
          const isSinCompra = cat === 'SIN COMPRA' || cat === 'SIN CATEGORIA' || cat === 'SIN CATEGORÍA';
          const isInactiveIntranet = (c.intranet === true || c.intranet === 'true') && 
            (c.estado === 'Inactivo' || c.estadoCrm === 'Inactivo' || !c.compras || c.compras === 0);
          return isSinCompra || isInactiveIntranet;
        }
        
        return cat.includes(target) || target.includes(cat);
      });
    }

    if (selectedCategory !== 'Todos') {
        clients = clients.filter(c => {
          const rawCat = c.categoria || c.clubCategory || c.clubComercial?.categoria || 'Sin Categoría';
          return rawCat === selectedCategory;
        });
    }

    return clients;
  }, [allClients, selectedCampaign, selectedCategory]);

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

  const handleSendEmail = () => {
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
  };

  const handleSendWhatsApp = (client: any) => {
    // 1. Capturar el texto REAL que el usuario escribió en el editor (textarea)
    const whatsappMessage = (document.getElementById('wa-body-text') as HTMLTextAreaElement)?.value || '';
    let textToSend = whatsappMessage || "";

    // 2. Reemplazar las variables dinámicas con los datos reales del cliente seleccionado
    textToSend = textToSend
      .replace(/{{nombre}}/g, client.name || client.contacto || "Doctor/a")
      .replace(/{{frascos_comprados}}/g, String(client.compras || client.frascos || 0))
      .replace(/{{promedio_mensual}}/g, String(client.promedio || 0))
      .replace(/{{categoria_club}}/g, client.categoria || "Sin Categoría");

    // 3. Codificar correctamente manteniendo los asteriscos (*) limpios para las negritas de WhatsApp
    const encodedText = encodeURIComponent(textToSend)
      .replace(/%2A/g, '*'); // Asegura que las negritas funcionen en WhatsApp

    // 4. Limpiar el teléfono (eliminar espacios o caracteres raros) y generar la URL limpia
    const cleanPhoneVal = client.phone || client.telefono || "";
    const cleanPhone = cleanPhoneVal ? String(cleanPhoneVal).replace(/\s+/g, '') : "";
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    // 5. Abrir WhatsApp Business de inmediato
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="w-full min-h-screen grid grid-cols-12 gap-4 bg-slate-950 text-slate-100 p-4">
      
      <div className="col-span-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-white">1. Seleccionar Segmento</h2>
        
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-800 text-sm p-2 rounded-lg border border-slate-700"
        >
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <div className="grid grid-cols-1 gap-2">
          {suggestedCampaigns.map((camp: SuggestedCampaign) => (
            <button 
              key={camp.id}
              onClick={() => {
                setSelectedCampaign(camp);
                setSelectedClientIds(new Set());
              }}
              className={`p-3 rounded-lg text-left border transition-all text-sm ${
                selectedCampaign?.id === camp.id 
                  ? 'bg-sky-900/40 border-sky-500' 
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="font-bold">{camp.name}</div>
              <div className="text-[10px] text-slate-400">{camp.targetCategory} • {camp.clientCount} clientes</div>
            </button>
          ))}
        </div>

        {selectedCampaign && (
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
        )}
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
    </div>
  );
}
