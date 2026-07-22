import React, { useState } from 'react';
import { Client } from '../../services/crm/types';
import { ClientService } from '../../services/crm/ClientService';
import { localDB } from '../../lib/auth';
import { Save, X, Plus } from 'lucide-react';

interface ClientFormProps {
  client?: Client;
  onSave: () => void;
  onCancel?: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ client, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Client>>(client || {
    name: '',
    nombreFantasia: '',
    rut: '',
    giro: '',
    email: '',
    telefono: '',
    direccion: '',
    comuna: '',
    ciudad: '',
    region: 'Metropolitana',
    sitioWeb: '',
    ejecutivoComercial: '',
    estado: 'Solo CRM Comercial',
    registroPosteriorCompra: false,
    observaciones: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
    accesoAprobado: 'No',
    historialUnificado: 'Creado manualmente',
    responsable: 'Sistema'
  });

  const clientService = new ClientService(
    (col) => localDB.getCollection(col),
    (col, item) => localDB.saveToCollection(col, item),
    (col, id, updates) => localDB.updateInCollection(col, id, updates)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formData.email?.trim() || '';

    if (!formData.name || !formData.rut || !email) {
      alert("Por favor complete los campos obligatorios (*)");
      return;
    }
    
    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Email inválido");
      return;
    }

    try {
      if (formData.id) {
        await clientService.updateClient(formData.id, { ...formData, email });

        // Ensure both collections stay synchronized in real-time
        const contacts = await localDB.getCollection('contacts');
        const intranetClients = await localDB.getCollection('intranet_clients');

        const phoneVal = formData.telefono || formData.phone || '';
        const rutClean = formData.rut || 'Sin RUT';

        const existingContact = contacts.find((c: any) => 
          c.id === formData.id || 
          (c.email && c.email.toLowerCase().trim() === email.toLowerCase().trim()) || 
          (c.rut && c.rut !== 'Sin RUT' && c.rut === rutClean)
        );

        const existingIntranet = intranetClients.find((c: any) => 
          c.id === formData.id || 
          (c.email && c.email.toLowerCase().trim() === email.toLowerCase().trim()) || 
          (c.rut && c.rut !== 'Sin RUT' && c.rut === rutClean)
        );

        if (existingContact) {
          await localDB.updateInCollection('contacts', existingContact.id, {
            ...formData,
            email,
            phone: phoneVal,
            rut: rutClean,
            categoria: (!existingContact.categoria || existingContact.categoria === 'Sin compra' || existingContact.categoria === 'Sin categoría') ? 'Bronce' : existingContact.categoria,
            intranet: (formData.accesoAprobado === 'Si' || existingContact.intranet === 'Si') ? 'Si' : existingContact.intranet
          });
        } else if (formData.accesoAprobado === 'Si') {
          // Pass automatically to Cartera Única CIE
          await localDB.saveToCollection('contacts', {
            ...formData,
            email,
            phone: phoneVal,
            rut: rutClean,
            type: 'Veterinario',
            categoria: 'Bronce',
            intranet: 'Si',
            comoLlego: 'Plataforma Intranet',
            fechaIngreso: formData.fechaIngreso || new Date().toISOString().split('T')[0]
          });
        }

        if (existingIntranet) {
          await localDB.updateInCollection('intranet_clients', existingIntranet.id, {
            name: formData.name,
            email,
            rut: rutClean,
            telefono: phoneVal,
            region: formData.region,
            comuna: formData.comuna,
            accesoAprobado: formData.accesoAprobado || existingIntranet.accesoAprobado || 'No'
          });
        }
      } else {
        if (formData.estado === 'Solo Intranet') {
          await localDB.saveToCollection('intranet_clients', {
            fechaIngreso: formData.fechaIngreso || new Date().toISOString().split('T')[0],
            name: formData.name,
            email,
            rut: formData.rut || 'Sin RUT',
            telefono: formData.telefono || '',
            comuna: formData.comuna || '',
            region: formData.region || 'Metropolitana',
            accesoAprobado: 'No',
            estado: 'Solo Intranet',
            historialUnificado: formData.observaciones || 'Registrado en Intranet manualmente desde Inscribir Socio',
            responsable: formData.responsable || 'Sistema'
          });
        } else {
          const newClient: Client = {
            ...formData,
            email,
            id: Date.now().toString(),
            contactos: [],
            veterinarios: [],
            ventas: [],
            clubComercial: {
              categoria: 'Sin categoría',
              beneficios: [],
              puntos: 0,
              estado: 'Sin categoría'
            },
            oportunidades: [],
            campanas: [],
            iaComercial: {
              insights: 'Nueva cuenta creada. Se calculará el perfil comercial automáticamente.',
              propensionAbandono: 'Baja',
              proximaCompra: 'Sin recomendación'
            },
            bitacora: [{
              id: Date.now().toString(),
              fecha: new Date().toISOString().split('T')[0],
              comentario: 'Cliente ingresado al CRM.',
              creador: 'Sistema'
            }],
            documentos: []
          } as unknown as Client;

          // Register global activity
          try {
            await localDB.saveToCollection('crm_activities', {
              fecha: new Date().toISOString(),
              campania: 'CRM Core',
              tipo: 'Alta de Socio',
              observaciones: 'Cliente ingresado manualmente al CRM.',
              responsable: 'Sistema',
              clientId: newClient.id
            });
          } catch (err) {
            console.error("Error logging global activity", err);
          }

          await clientService.saveClient(newClient);
        }
      }
      onSave();
      window.dispatchEvent(new Event('db-change'));
      alert('Socio comercial guardado exitosamente.');
    } catch (err) {
      console.error(err);
      alert('Hubo un problema al guardar el cliente.');
    }
  };

  const REGIONES = [
    'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
    'Metropolitana', 'O\'Higgins', 'Maule', 'Ñuble', 'Biobío', 'Araucanía', 'Los Ríos',
    'Los Lagos', 'Aysén', 'Magallanes'
  ];

  return (
    <div className="bg-[#0D1527] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white">{formData.id ? 'Editar Socio Comercial' : 'Inscribir Nuevo Socio Comercial'}</h2>
          <p className="text-xs text-slate-400 mt-1">Ingrese los datos corporativos, tributarios y de contacto de la clínica o profesional veterinario.</p>
        </div>
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Razón Social / Nombre *</label>
            <input 
              type="text" 
              required 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ej: Clínica Vet Antofagasta Ltda"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Nombre de Fantasía</label>
            <input 
              type="text" 
              value={formData.nombreFantasia || ''} 
              onChange={e => setFormData({...formData, nombreFantasia: e.target.value})}
              placeholder="Ej: VetAntofagasta"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">RUT *</label>
            <input 
              type="text" 
              required 
              value={formData.rut || ''} 
              onChange={e => setFormData({...formData, rut: e.target.value})}
              placeholder="Ej: 76.123.456-K"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Giro</label>
            <input 
              type="text" 
              value={formData.giro || ''} 
              onChange={e => setFormData({...formData, giro: e.target.value})}
              placeholder="Ej: Servicios Veterinarios"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Email *</label>
            <input 
              type="email" 
              required 
              value={formData.email || ''} 
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="Ej: contacto@clinicavet.cl"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Teléfono</label>
            <input 
              type="text" 
              value={formData.telefono || ''} 
              onChange={e => setFormData({...formData, telefono: e.target.value})}
              placeholder="Ej: +56 9 1234 5678"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Dirección</label>
            <input 
              type="text" 
              value={formData.direccion || ''} 
              onChange={e => setFormData({...formData, direccion: e.target.value})}
              placeholder="Ej: Av. Brasil 450"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Comuna</label>
            <input 
              type="text" 
              value={formData.comuna || ''} 
              onChange={e => setFormData({...formData, comuna: e.target.value})}
              placeholder="Ej: Providencia"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Ciudad</label>
            <input 
              type="text" 
              value={formData.ciudad || ''} 
              onChange={e => setFormData({...formData, ciudad: e.target.value})}
              placeholder="Ej: Santiago"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Región</label>
            <select 
              value={formData.region} 
              onChange={e => setFormData({...formData, region: e.target.value})}
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white outline-none focus:border-sky-500 transition-all"
            >
              {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Sitio Web</label>
            <input 
              type="text" 
              value={formData.sitioWeb || ''} 
              onChange={e => setFormData({...formData, sitioWeb: e.target.value})}
              placeholder="Ej: www.clinicavet.cl"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Ejecutivo Comercial</label>
            <input 
              type="text" 
              value={formData.ejecutivoComercial || ''} 
              onChange={e => setFormData({...formData, ejecutivoComercial: e.target.value})}
              placeholder="Nombre del ejecutivo"
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Estado</label>
            <select 
              value={formData.estado} 
              onChange={e => setFormData({...formData, estado: e.target.value})}
              className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white outline-none focus:border-sky-500 transition-all"
            >
              <option value="Solo CRM Comercial">Solo CRM Comercial</option>
              <option value="Solo Intranet">Solo Intranet</option>
              <option value="Ambos (Sincronizado)">Ambos (Sincronizado)</option>
            </select>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input 
              type="checkbox"
              id="registroPosteriorCompra"
              checked={formData.registroPosteriorCompra || false}
              onChange={e => setFormData({...formData, registroPosteriorCompra: e.target.checked})}
              className="w-4 h-4 rounded border-slate-700 bg-[#050914] text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="registroPosteriorCompra" className="text-xs text-slate-300">Registro en Intranet posterior a la compra (Cliente con Compra Previa)</label>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Observaciones Iniciales</label>
          <textarea 
            value={formData.observaciones || ''} 
            onChange={e => setFormData({...formData, observaciones: e.target.value})}
            placeholder="Ingrese cualquier comentario de importancia comercial o clínica..."
            className="w-full bg-[#050914] border border-slate-850 p-3 rounded-xl text-xs text-white h-24 placeholder-slate-600 focus:border-sky-500 outline-none transition-all" 
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-3 rounded-xl border border-slate-750 transition-all active:scale-95"
            >
              Cancelar
            </button>
          )}
          <button 
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-lg"
          >
            <Save size={14} />
            Inscribir Socio
          </button>
        </div>
      </form>
    </div>
  );
};
