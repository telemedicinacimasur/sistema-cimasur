import React, { useState, useEffect, useRef } from 'react';
import { localDB, addAuditLog } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate, parseExcelDate, safe, formatDateForExcel } from '../lib/utils';
import { exportTableToPDF, exportExpedienteToPDF } from '../lib/pdfUtils';
import * as XLSX from 'xlsx';
import { 
  TrendingUp, 
  UserPlus, 
  History, 
  Search,
  Save,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Filter,
  FileText,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { RecordActions } from '../components/RecordActions';
import { CommentDialog } from '../components/CommentDialog';

import { addNotification } from '../lib/notifications';

import { CimasurCRM } from '../components/crm/CimasurCRM';
import { CRMLayout } from '../components/crm/CRMLayout';
import { DashboardView } from '../components/crm/DashboardView';
import { IAComercialView } from '../components/crm/IAComercialView';
import { AgendaView } from '../components/crm/AgendaView';
import { ConfigView } from '../components/crm/ConfigView';

export function isDuplicateName(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const clean = (s: string) => {
    return s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9 ]/g, " ") // replace punctuation with spaces
      .replace(/\s+/g, " ") // collapse spaces
      .trim();
  };
  const cleanA = clean(nameA);
  const cleanB = clean(nameB);
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  // Filter out common noise words in South American business registers and titles
  const noiseWords = new Set(["ltda", "limitada", "spa", "eirl", "e.i.r.l.", "sociedad", "y", "m.", "de", "del", "la", "las", "los", "dr", "dra", "veterinario", "medico"]);
  const tokensA = cleanA.split(" ").filter(w => w.length > 2 && !noiseWords.has(w));
  const tokensB = cleanB.split(" ").filter(w => w.length > 2 && !noiseWords.has(w));

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const fullA = tokensA.join(" ");
  const fullB = tokensB.join(" ");
  
  if (fullB.includes(fullA) || fullA.includes(fullB)) {
    return true;
  }

  // Also check if they share a threshold of substantial tokens
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter(x => setB.has(x));
  
  // If we match 3 or more substantial words
  if (intersection.length >= 3) {
    return true;
  }

  // Or if the shorter set has >= 2 words and all of them match
  const minLength = Math.min(setA.size, setB.size);
  if (minLength >= 2 && intersection.length === minLength) {
    return true;
  }

  return false;
}

export function areContactsDuplicate(c1: any, c2: any): boolean {
  if (!c1 || !c2) return false;
  
  // Clean email check helper
  const cleanEmail = (e: any) => {
    if (!e) return '';
    return String(e).toLowerCase().replace(/[,;\s]/g, '').trim();
  };

  const email1 = cleanEmail(c1.email || c1.Email);
  const email2 = cleanEmail(c2.email || c2.Email);

  if (email1 && email2 && email1 === email2) return true;

  // Clean RUT helper
  const cleanRut = (r: any) => {
    if (!r) return '';
    const cleanStr = String(r).toUpperCase().replace(/[^0-9K]/g, '').trim();
    if (cleanStr === '' || cleanStr.includes('SINRUT') || cleanStr === 'NO' || cleanStr === 'SIN') return '';
    return cleanStr;
  };

  const rut1 = cleanRut(c1.rut || c1.RUT || c1["RUT / ID"]);
  const rut2 = cleanRut(c2.rut || c2.RUT || c2["RUT / ID"]);

  if (rut1 && rut2 && rut1 === rut2) return true;

  // Smart Name check
  const name1 = c1.name || c1.Nombre || c1["Nombre / Razón Social"] || c1["Nombre Completo"] || c1.name;
  const name2 = c2.name || c2.Nombre || c2["Nombre / Razón Social"] || c2["Nombre Completo"] || c2.name;

  if (isDuplicateName(name1, name2)) return true;

  return false;
}

export async function syncToIntranetClientsIfNeeded(contact: any, user?: any) {
  if (!contact || contact.intranet !== 'Si') return;
  try {
    const intranetClients = await localDB.getCollection('intranet_clients');
    const exists = intranetClients.some((ic: any) => areContactsDuplicate(ic, contact));

    if (!exists) {
      await localDB.saveToCollection('intranet_clients', {
        fechaIngreso: contact.fechaIngreso || new Date().toISOString().split('T')[0],
        name: contact.name,
        email: contact.email || '',
        accesoAprobado: 'Si',
        historialUnificado: `Registrado automáticamente en base Intranet de forma sincrónica el ${new Date().toLocaleDateString('es-CL')}.`,
        responsable: user?.displayName || user?.email || contact.responsable || 'Sistema'
      });
    }
  } catch (err) {
    console.error("Error automatic sync to intranet_clients:", err);
  }
}

export async function syncIntranetClientToCRM(ic: any, user?: any) {
  if (!ic) return;
  // GESTION: ONLY APPROVED INTRANET CLIENTS (Veterinario) can be passed to CRM Comercial contacts
  if (ic.accesoAprobado !== 'Si') return;

  try {
    const contacts = await localDB.getCollection('contacts');
    const existingContact = contacts.find((c: any) => areContactsDuplicate(c, ic));

    if (existingContact) {
      let needsUpdate = false;
      const updates: any = {};

      if (existingContact.intranet !== 'Si') {
        updates.intranet = 'Si';
        needsUpdate = true;
      }

      if (needsUpdate) {
        const currentObs = existingContact.historialUnificado || '';
        updates.historialUnificado = (currentObs ? currentObs + '\n\n' : '') + 
          `[Sincronización Intranet] Estado de Intranet actualizado a 'Si' automáticamente por ser aprobado en plataforma el ${new Date().toLocaleDateString('es-CL')}.`;
        await localDB.updateInCollection('contacts', existingContact.id, updates);
      }
    } else {
      const newContact = {
        fechaIngreso: ic.fechaIngreso || new Date().toISOString().split('T')[0],
        name: ic.name || 'Contacto de Intranet',
        rut: 'Sin RUT',
        phone: '',
        email: ic.email || '',
        region: 'Metropolitana',
        type: 'Veterinario',
        categoria: 'Sin compra',
        intranet: 'Si',
        comoLlego: 'Plataforma Intranet',
        fechaPago: 'Mensual',
        historialUnificado: `Sincronizado automáticamente desde plataforma de ventas online Intranet (Acceso Aprobado: Veterinario/Compra) el ${new Date().toLocaleDateString('es-CL')}.`,
        responsable: user?.displayName || user?.email || 'Sistema',
        isGestionCustomer: false
      };

      await localDB.saveToCollection('contacts', newContact);
    }
  } catch (err) {
    console.error("Error automatic sync to CRM contacts:", err);
  }
}

export default function CRMView() {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];

  const permissions = user?.permissions?.['crm'];
  const isReadonly = permissions?.readonly === true || user?.role === 'viewer' || (user?.roles?.includes('viewer') && !user?.roles?.includes('admin') && !user?.roles?.includes('manager'));
  const canEdit = user?.roles?.includes('admin') || (permissions ? (permissions.edit !== false && !isReadonly) : !isReadonly);
  const canDelete = user?.roles?.includes('admin') || (permissions ? (permissions.delete !== false && !isReadonly) : !isReadonly);

  const [activeTab, setActiveTab] = useState<'register' | 'list' | 'activities' | 'intranet' | 'smart' | 'club'>('register');
  const [records, setRecords] = useState<any[]>([]);
  const [intranetClients, setIntranetClients] = useState<any[]>([]);
  const [imports, setImports] = useState<any[]>([]);
  const [commentTarget, setCommentTarget] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    region: 'Todas',
    type: 'Todos',
    categoria: 'Todas',
    intranet: 'Todos'
  });

  useEffect(() => {
    const loadData = async () => {
      const data = await localDB.getCollection('contacts');
      const intranetData = await localDB.getCollection('intranet_clients');
      const importData = await localDB.getCollection('intranet_imports');

      // Proactive cleanup of existing duplicates in contacts list (e.g. Marco Antonio Vilches)
      let cleanedSomeDuplicates = false;
      const cleanContactsList = [...data];
      for (let i = 0; i < cleanContactsList.length; i++) {
        for (let j = i + 1; j < cleanContactsList.length; j++) {
          const c1 = cleanContactsList[i];
          const c2 = cleanContactsList[j];
          if (c1 && c2 && areContactsDuplicate(c1, c2)) {
            let keepIndex = i;
            let removeIndex = j;
            if ((!c1.rut || c1.rut === 'Sin RUT') && (c2.rut && c2.rut !== 'Sin RUT')) {
              keepIndex = j;
              removeIndex = i;
            } else if (c1.categoria === 'Sin compra' && c2.categoria !== 'Sin compra') {
              keepIndex = j;
              removeIndex = i;
            }
            
            const keepContact = cleanContactsList[keepIndex];
            const removeContact = cleanContactsList[removeIndex];
            
            const updates: any = {};
            let needsUpdate = false;
            if (removeContact.intranet === 'Si' && keepContact.intranet !== 'Si') {
              updates.intranet = 'Si';
              needsUpdate = true;
            }
            if (removeContact.phone && !keepContact.phone) {
              updates.phone = removeContact.phone;
              needsUpdate = true;
            }
            if (removeContact.email && !keepContact.email) {
              updates.email = removeContact.email;
              needsUpdate = true;
            }
            if (needsUpdate) {
              await localDB.updateInCollection('contacts', keepContact.id, updates);
            }
            
            await localDB.deleteFromCollection('contacts', removeContact.id);
            
            cleanContactsList.splice(removeIndex, 1);
            if (removeIndex === i) {
              i--;
            }
            cleanedSomeDuplicates = true;
            break;
          }
        }
      }

      // Automáticamente sincronizar veterinarios aprobados preexistentes al CRM Comercial para corregir discrepancias
      let didSync = false;
      for (const ic of intranetData) {
        if (ic.accesoAprobado === 'Si') {
          const isDuplicate = cleanContactsList.some((c: any) => areContactsDuplicate(c, ic));
          if (!isDuplicate) {
            await syncIntranetClientToCRM(ic, user);
            didSync = true;
          }
        }
      }

      if (didSync || cleanedSomeDuplicates) {
        const uContacts = await localDB.getCollection('contacts');
        setRecords(uContacts);
      } else {
        setRecords(cleanContactsList);
      }
      setIntranetClients(intranetData);
      setImports(importData);
    };
    loadData();
    window.addEventListener('db-change', loadData);
    return () => window.removeEventListener('db-change', loadData);
  }, [user]);

  const handleImportFromIntranet = async () => {
    try {
      const intranetClientsList = await localDB.getCollection('intranet_clients');
      if (!intranetClientsList || intranetClientsList.length === 0) {
        alert("No se encontraron Clientes en la base de datos de Intranet para sincronizar. Por favor, importe un archivo Excel en la pestaña 'Plataforma Intranet'.");
        return;
      }

      const contacts = await localDB.getCollection('contacts');
      
      let importedCount = 0;
      let updatedCount = 0;

      for (const ic of intranetClientsList) {
        const icName = (ic.name || '').trim();
        const icEmail = (ic.email || '').trim();

        if (!icName && !icEmail) continue;

        // Verify duplicates using smart checking
        const existingContact = contacts.find(c => areContactsDuplicate(c, ic));

        if (existingContact) {
          let needsUpdate = false;
          const updates: any = {};

          if (existingContact.intranet !== 'Si') {
            updates.intranet = 'Si';
            needsUpdate = true;
          }

          if (needsUpdate) {
            const currentObs = existingContact.historialUnificado || '';
            updates.historialUnificado = (currentObs ? currentObs + '\n\n' : '') + 
              `[Sincronización Intranet] Estado de Intranet actualizado a 'Si' automáticamente (cliente ya existía en cartera) el ${new Date().toLocaleDateString('es-CL')}.`;
            await localDB.updateInCollection('contacts', existingContact.id, updates);
            updatedCount++;
          }
        } else {
          // If they don't exist in CRM, they only import/transfer automatically if they are APPROVED (veterinarians!)
          if (ic.accesoAprobado === 'Si') {
            const newContact = {
              fechaIngreso: ic.fechaIngreso || new Date().toISOString().split('T')[0],
              name: ic.name || 'Contacto de Intranet',
              rut: 'Sin RUT',
              phone: '',
              email: ic.email || '',
              region: 'Metropolitana',
              type: 'Veterinario',
              categoria: 'Sin compra', // Force "Sin compra" to trigger purchase campaigns!
              intranet: 'Si',
              comoLlego: 'Plataforma Intranet',
              fechaPago: 'Mensual',
              historialUnificado: `Sincronizado automáticamente (Veterinario aprobado en Intranet) el ${new Date().toLocaleDateString('es-CL')}.`,
              responsable: user?.displayName || user?.email || 'Sistema',
              isGestionCustomer: false
            };

            await localDB.saveToCollection('contacts', newContact);
            importedCount++;
          }
        }
      }

      await addAuditLog(user, `Sincronizó base Intranet: ${importedCount} veterinarios registrados, ${updatedCount} actualizados`, 'CRM');
      alert(`Sincronización de Intranet completada:\n\n- ${importedCount} Nuevos veterinarios aprobados agregados al CRM con Categoría "Sin compra" listo para campañas del motor comercial.\n- ${updatedCount} Clientes repetidos actualizados con acceso de Intranet "Sí" automáticamente.`);
      
      window.dispatchEvent(new Event('db-change'));
    } catch (err) {
      console.error(err);
      alert('Error en la sincronización desde la plataforma.');
    }
  };

  const handleImportSingleFromIntranet = async (ic: any) => {
    if (ic.accesoAprobado !== 'Si') {
      alert("No se puede traspasar este cliente porque no está aprobado en la Intranet (debe ser Veterinario).");
      return;
    }
    try {
      const contacts = await localDB.getCollection('contacts');
      const existingContact = contacts.find(c => areContactsDuplicate(c, ic));

      if (existingContact) {
        let needsUpdate = false;
        const updates: any = {};

        if (existingContact.intranet !== 'Si') {
          updates.intranet = 'Si';
          needsUpdate = true;
        }

        if (needsUpdate) {
          const currentObs = existingContact.historialUnificado || '';
          updates.historialUnificado = (currentObs ? currentObs + '\n\n' : '') + 
            `[Sincronización Intranet] Estado de Intranet actualizado a 'Si' individualmente el ${new Date().toLocaleDateString('es-CL')}.`;
          await localDB.updateInCollection('contacts', existingContact.id, updates);
        }
        alert(`El cliente "${ic.name}" ya existe en la Cartera de Clientes (se detectó de forma inteligente). Se actualizó su estado en el sistema de manera segura.`);
      } else {
        const newContact = {
          fechaIngreso: ic.fechaIngreso || new Date().toISOString().split('T')[0],
          name: ic.name || 'Contacto de Intranet',
          rut: 'Sin RUT',
          phone: '',
          email: ic.email || '',
          region: 'Metropolitana',
          type: 'Veterinario',
          categoria: 'Sin compra', // Force "Sin compra" to start purchase campaigns!
          intranet: 'Si',
          comoLlego: 'Plataforma Intranet',
          fechaPago: 'Mensual',
          historialUnificado: `Sincronizado individualmente desde Intranet el ${new Date().toLocaleDateString('es-CL')}.`,
          responsable: user?.displayName || user?.email || 'Sistema',
          isGestionCustomer: false
        };

        await localDB.saveToCollection('contacts', newContact);
        alert(`Cliente "${ic.name}" traspasado con éxito al CRM con Categoría "Sin compra" (Motor Comercial listo).`);
      }

      await addAuditLog(user, `Traspasó cliente de Intranet individual: ${ic.name}`, 'CRM');
      window.dispatchEvent(new Event('db-change'));
    } catch (err) {
      console.error(err);
      alert('Error al realizar la importación individual.');
    }
  };

  const [activeView, setActiveView] = useState('inicio');

  return (
    <CRMLayout activeView={activeView} setActiveView={setActiveView}>
      {activeView === 'inicio' && <DashboardView clients={records} />}
      {activeView === 'crm_register' && <CRMRegister />}
      {activeView === 'crm_list' && <CRMTable records={records} filters={filters} setFilters={setFilters} onComment={(c: any) => setCommentTarget(c)} />}
      {activeView === 'crm_activities' && <CRMActivities />}
      {activeView === 'crm_club' && <CimasurCRM clients={records} />}
      {activeView === 'crm_intranet' && (
        <CRMIntranetTable 
          clients={intranetClients} 
          onImportFromIntranet={handleImportFromIntranet} 
          onImportSingle={handleImportSingleFromIntranet}
        />
      )}
      {activeView === 'ia' && <IAComercialView />}
      {activeView === 'agenda' && <AgendaView />}
      {activeView === 'config' && <ConfigView />}
      {/* Fallback/Legacy if needed */}
      {activeView !== 'inicio' && activeView !== 'crm_register' && activeView !== 'crm_list' && activeView !== 'crm_activities' && activeView !== 'crm_club' && activeView !== 'crm_intranet' && activeView !== 'ia' && activeView !== 'agenda' && activeView !== 'config' && (
        <div className="space-y-6">
           {/* Legacy content goes here */}
        </div>
      )}
    </CRMLayout>
  );

  // ... rest of CRMView code ...
}
const REGIONES = [
  'Todas', 'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
  'Metropolitana', 'O\'Higgins', 'Maule', 'Ñuble', 'Biobío', 'Araucanía', 'Los Ríos',
  'Los Lagos', 'Aysén', 'Magallanes'
];

const CATEGORIAS = ['Sin compra', 'Sin categoría', 'Bronce', 'Plata', 'Oro', 'Platinum'];

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

const getTiersList = () => {
  const saved = localStorage.getItem('cimasur_club_tiers_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 5) {
        return parsed.map((item: any, idx: number) => ({
          ...item,
          min: Number(item.min) || 0,
          max: (item.max === null || item.max === "Infinity" || idx === 4) ? Infinity : Number(item.max),
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }
  return [
    { name: 'Sin categoría', min: 0, max: 499999, benefits: ['Acceso general a catálogos online Cimasur', 'Boletín técnico mensual por email'] },
    { name: 'Bronce', min: 500000, max: 1999999, benefits: ['Descuento por volumen en Productos Base (**)', 'Invitación a eventos gratuitos en línea', 'Soporte técnico básico vía WhatsApp'] },
    { name: 'Plata', min: 2000000, max: 4999999, benefits: ['Descuentos por volumen avanzados', '3 despachos gratuitos anuales', '5 muestras gratis anuales'] },
    { name: 'Oro', min: 5000000, max: 11999999, benefits: ['Soporte prioritario online WhatsApp', 'Descuento en todas las especialidades', 'Devoluciones y reposiciones permitidas'] },
    { name: 'Platinum', min: 12000000, max: Infinity, benefits: ['Descuento de distribuidor premium', 'Envío SIN COSTO ilimitado', '20 muestras de productos gratis anuales'] }
  ];
};

const getTierForSales = (sales: number) => {
  const list = getTiersList();
  for (const t of list) {
    if (sales >= t.min && sales <= t.max) {
      return t;
    }
  }
  return list[0];
};

const getClientAnnualSales2026 = (client: any): number => {
  if (!client) return 0;
  if (client.compraAnual !== undefined && client.compraAnual !== null && client.compraAnual !== '') {
    return Number(client.compraAnual) || 0;
  }
  if (client.clubVentasDetail) {
    try {
      const parsed = typeof client.clubVentasDetail === 'string' ? JSON.parse(client.clubVentasDetail) : client.clubVentasDetail;
      if (parsed && typeof parsed.v2026 === 'number') {
        return parsed.v2026;
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (client.ventas && typeof client.ventas.v2026 === 'number') {
    return client.ventas.v2026;
  }
  // Fallback based on category
  const cat = normalizeCat(client.categoria || 'Sin categoría');
  if (cat.includes('platinum')) return 12000000;
  if (cat.includes('oro')) return 5000000;
  if (cat.includes('plata')) return 2000000;
  if (cat.includes('bronce')) return 500000;
  return 0;
};

function CRMRegister() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fechaIngreso: new Date().toISOString().split('T')[0],
    name: '',
    rut: '',
    phone: '',
    email: '',
    region: 'Metropolitana',
    type: 'Farmacia',
    categoria: 'Sin categoría',
    historialUnificado: '',
    responsable: '',
    intranet: 'No',
    isGestionCustomer: false,
    comoLlego: 'Campañas / Ads',
    compraAnual: 0
  });

  useEffect(() => {
    if (user) {
      setForm(prev => ({ ...prev, responsable: user.displayName }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check that we have at least one identifying or contact field
    if (!form.name && !form.phone && !form.rut) {
      alert("Por favor, ingrese al menos el Nombre, el Teléfono o el RUT para guardar el cliente.");
      return;
    }

    let resolvedName = form.name;
    let resolvedRut = form.rut;

    if (!resolvedName && form.phone) {
      resolvedName = `Contacto Fono ${form.phone}`;
    } else if (!resolvedName) {
      resolvedName = "Contacto Sin Nombre";
    }

    if (!resolvedRut) {
      resolvedRut = "Sin RUT";
    }

    const calculatedTier = getTierForSales(Number(form.compraAnual || 0));
    
    const finalForm = {
      ...form,
      categoria: calculatedTier.name, // Auto-derive matching category!
      name: resolvedName,
      rut: resolvedRut,
      clubVentasDetail: JSON.stringify({ v2024: 0, v2025: 0, v2026: Number(form.compraAnual || 0) }),
      historialUnificado: form.historialUnificado || `Cliente creado manualmente el ${new Date().toLocaleDateString('es-CL')}`
    };

    await localDB.saveToCollection('contacts', finalForm);
    await syncToIntranetClientsIfNeeded(finalForm, user);
    
    if (finalForm.isGestionCustomer) {
      const gestionRecord = {
        fechaIngreso: finalForm.fechaIngreso,
        nombre: finalForm.name,
        rut: finalForm.rut,
        tipoEmpresa: finalForm.type,
        comuna: finalForm.region,
        celular: finalForm.phone,
        email: finalForm.email,
        categoria: finalForm.categoria,
        estado: 'En proceso',
        consultora: finalForm.responsable,
        observaciones: `Registro inicial CRM\nOrigen: ${finalForm.comoLlego}\nCompra Anual: $${(form.compraAnual || 0).toLocaleString('es-CL')}\nCategoría Club Social: ${finalForm.categoria}\n\n${finalForm.historialUnificado}`
      };
      await localDB.saveToCollection('gestion_records', gestionRecord);
    }
    
    await addNotification({
      title: 'Nuevo Cliente CRM',
      message: `${user.displayName || user.email} registró a ${finalForm.name}`,
      recipientRoles: ['admin', 'crm', 'gestion'],
      sender: user.displayName || user.email || 'Sistema'
    });
    await addAuditLog(user, `Registró Cliente ${finalForm.name}`, 'CRM');
    alert(`Cliente Guardado en CRM${finalForm.isGestionCustomer ? ' y en Gestión' : ''}`);
    setForm({ 
      fechaIngreso: new Date().toISOString().split('T')[0],
      name: '',
      rut: '',
      phone: '',
      email: '',
      region: 'Metropolitana',
      type: 'Farmacia',
      categoria: 'Sin categoría',
      historialUnificado: '',
      responsable: user?.displayName || '',
      intranet: 'No',
      isGestionCustomer: false,
      comoLlego: 'Campañas / Ads',
      compraAnual: 0
    });
    window.dispatchEvent(new Event('db-change'));
  };

  const downloadExcelTemplate = () => {
    const headers = [
      ["Fecha Ingreso", "Nombre / Razón Social", "RUT / ID", "Teléfono", "Email", "Comuna", "Tipo de Cliente", "Categoría de Cliente", "Inscrito en Intranet", "Como Llego", "Compra Anual"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
    XLSX.writeFile(wb, "plantilla_importacion_clientes.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let importedCount = 0;
        for (const row of data) {
          const fechaIngreso = parseExcelDate(row["Fecha Ingreso"]);
          const phone = safe(row["Teléfono"]);
          let name = safe(row["Nombre / Razón Social"]);
          const rut = safe(row["RUT / ID"]);

          if (!name && phone) {
            name = `Contacto Fono ${phone}`;
          } else if (!name) {
            name = "Contacto Sin Nombre";
          }

          const resolvedRut = rut || "Sin RUT";
          const parsedCompra = Number(safe(row["Compra Anual"]) || safe(row["Compra Anual 2026"]) || safe(row["Ventas Anuales"]) || safe(row["Monto de Compra"])) || 0;
          const calculatedCategory = getTierForSales(parsedCompra).name;
          const categoryFromFile = safe(row["Categoría de Cliente"]);
          const finalCategory = categoryFromFile && CATEGORIAS.includes(categoryFromFile) ? categoryFromFile : calculatedCategory;

          const newContact = {
            fechaIngreso: fechaIngreso,
            name: name,
            rut: resolvedRut,
            phone: phone,
            email: safe(row["Email"]),
            region: safe(row["Comuna"]) || 'Metropolitana',
            type: safe(row["Tipo de Cliente"]) || 'Farmacia',
            categoria: finalCategory,
            intranet: safe(row["Inscrito en Intranet"]) || 'No',
            comoLlego: safe(row["Como Llego"]) || safe(row["Canal de Entrada"]) || safe(row["Origen"]) || 'Campañas / Ads',
            compraAnual: parsedCompra,
            clubVentasDetail: JSON.stringify({ v2024: 0, v2025: 0, v2026: parsedCompra }),
            historialUnificado: `Importado mediante Excel el ${new Date().toLocaleDateString('es-CL')}` + 
              (row["Como Llego"] || row["Canal de Entrada"] || row["Origen"] ? ` (Origen: ${row["Como Llego"] || row["Canal de Entrada"] || row["Origen"]})` : '') +
              ` (Compra Anual: $${parsedCompra.toLocaleString('es-CL')}, Categoría: ${finalCategory})`,
            responsable: user.displayName || user.email || 'Sistema'
          };

          // Allow saving as long as there is any identifier (phone, name or rut)
          if (phone || newContact.name !== "Contacto Sin Nombre" || rut) {
            await localDB.saveToCollection('contacts', newContact);
            await syncToIntranetClientsIfNeeded(newContact, user);
            importedCount++;
          }
        }

        await addAuditLog(user, `Importó ${importedCount} clientes desde Excel`, 'CRM');
        alert(`Éxito: Se importaron ${importedCount} clientes correctamente.`);
        window.dispatchEvent(new Event('db-change'));
      } catch (error) {
        console.error("Import Error:", error);
        alert(`Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}. Asegúrese de usar la plantilla correcta y que el archivo no esté abierto.`);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden animate-in fade-in duration-500">
      <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4  font-bold flex items-center justify-between">
         <span className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Ficha de Registro de Cliente</span>
         <div className="flex gap-2">
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept=".xlsx, .xls"
             onChange={handleFileUpload}
           />
           <button 
             onClick={downloadExcelTemplate}
             className="text-[10px] bg-emerald-600 hover:bg-emerald-700 border-2 border-[#1C2541] px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black cursor-pointer"
             title="Descargar Plantilla Excel"
           >
             <FileSpreadsheet className="w-3.5 h-3.5" /> Plantilla Excel
           </button>
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="text-[10px] bg-[#38BDF8]/20 text-[#38BDF8] border-2 border-[#1C2541] hover:bg-[#38BDF8]/30 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black cursor-pointer"
           >
             <Upload className="w-3.5 h-3.5" /> Importar Datos
           </button>
         </div>
      </div>
      <form className="p-8 space-y-8" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <CRMField label="Fecha Ingreso"><input type="date" className="w-full border-b p-2 text-sm" value={form.fechaIngreso || ''} onChange={e => setForm({...form, fechaIngreso: e.target.value})} /></CRMField>
           <CRMField label="Nombre / Razón Social"><input className="w-full border-b p-2 text-sm font-bold" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="Opcional si tiene Teléfono" /></CRMField>
           <CRMField label="RUT / ID"><input className="w-full border-b p-2 text-sm" value={form.rut || ''} onChange={e => setForm({...form, rut: e.target.value})} placeholder="Opcional" /></CRMField>
           <CRMField label="Teléfono / Celular"><input className="w-full border-b p-2 text-sm font-bold text-emerald-400" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Ej: +56912345678" /></CRMField>
           
           <CRMField label="Email"><input type="email" className="w-full border-b p-2 text-sm" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></CRMField>
           <CRMField label="Comuna / Ciudad"><input className="w-full border-b p-2 text-sm" value={form.region || ''} onChange={e => setForm({...form, region: e.target.value})} /></CRMField>
           <CRMField label="Tipo de Cliente">
              <select className="w-full border-b p-2 text-sm" value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})}>
                <option>Farmacia</option><option>Centro Médico</option><option>Empresa</option><option>Independiente</option><option>Otros</option>
              </select>
           </CRMField>
           <CRMField label="Categoría de Cliente">
              <select className="w-full border-b p-2 text-sm font-black text-[#38BDF8]" value={form.categoria || ''} onChange={e => setForm({...form, categoria: e.target.value})}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
           </CRMField>
           <CRMField label="Inscrito en Intranet">
              <select className="w-full border-b p-2 text-sm font-bold text-slate-200" value={form.intranet || ''} onChange={e => setForm({...form, intranet: e.target.value})}>
                <option value="No">No</option>
                <option value="Si">Si</option>
              </select>
           </CRMField>

           <CRMField label="Cómo Llegó (Canal de Origen)">
              <select className="w-full border-b p-2 text-sm font-bold text-pink-400" value={form.comoLlego || 'Campañas / Ads'} onChange={e => setForm({...form, comoLlego: e.target.value})}>
                <option value="Campañas / Ads">📢 Campañas / Ads</option>
                <option value="Instagram">📸 Instagram</option>
                <option value="Facebook">👥 Facebook</option>
                <option value="WhatsApp">💬 WhatsApp</option>
                <option value="Llamada Directa">📞 Llamada Directa</option>
                <option value="Recomendación">🤝 Recomendación</option>
                <option value="Página Web">🌐 Página Web</option>
                <option value="Otro">✏️ Otro</option>
              </select>
           </CRMField>

           <CRMField label="Compra Anual Acumulada ($)">
              <input 
                type="number"
                className="w-full border-b p-2 text-sm font-black bg-[#152035] text-amber-300 outline-none" 
                placeholder="Ej: 700000" 
                value={form.compraAnual || ''} 
                onChange={e => {
                  const val = Number(e.target.value) || 0;
                  const calculatedTier = getTierForSales(val);
                  setForm({ ...form, compraAnual: val, categoria: calculatedTier.name });
                }}
              />
           </CRMField>

           <CRMField label="Opciones de Gestión">
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer pt-4">
                <input 
                  type="checkbox" 
                  className="rounded"
                  checked={form.isGestionCustomer || false}
                  onChange={e => setForm({...form, isGestionCustomer: e.target.checked})}
                />
                Es Cliente de Gestión
              </label>
           </CRMField>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-black uppercase text-blue-900 tracking-widest flex items-center gap-2">
              <History className="w-4 h-4" /> Historial Escrito Unificado (Core)
           </label>
           <p className="text-[10px] text-slate-400 mb-2 italic">Registre aquí beneficios usados, gestiones, avances y observaciones vitales del ciclo de vida.</p>
           <textarea 
             className="w-full h-48 p-4 border rounded-2xl bg-[#152035] focus:bg-[#152035] focus:ring-2 focus:ring-blue-100 outline-none text-sm leading-relaxed"
             placeholder="Narrequí todo el proceso con el cliente..."
             value={form.historialUnificado || ''}
             onChange={e => setForm({...form, historialUnificado: e.target.value})}
           ></textarea>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#1E293B]">
           <button type="submit" className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-2 border-[#1C2541] px-12 py-4 rounded-2xl font-bold shadow-xl hover:translate-y-[-2px] transition-all flex items-center gap-2 cursor-pointer">
              <Save className="w-5 h-5" /> GUARDAR FICHA CRM
           </button>
        </div>
      </form>
    </div>
  );
}

function CRMTable({ records, filters, setFilters, onComment }: { records: any[], filters: any, setFilters: any, onComment: (r: any) => void }) {
  const { user } = useAuth();
  const permissions = user?.permissions?.['crm'];
  const isReadonly = permissions?.readonly === true || user?.role === 'viewer' || (user?.roles?.includes('viewer') && !user?.roles?.includes('admin') && !user?.roles?.includes('manager'));
  const canEdit = user?.roles?.includes('admin') || (permissions ? (permissions.edit !== false && !isReadonly) : !isReadonly);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [newHistory, setNewHistory] = useState('');
  const [newName, setNewName] = useState('');
  const [newRut, setNewRut] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newIntranet, setNewIntranet] = useState('');
  const [newIsGestionCustomer, setNewIsGestionCustomer] = useState<boolean | null>(null);
  const [newComoLlego, setNewComoLlego] = useState('Campañas / Ads');
  const [newCompraAnual, setNewCompraAnual] = useState<number>(0);
  const [activityType, setActivityType] = useState('Nota de Seguimiento');
  const [currentStatus, setCurrentStatus] = useState('En proceso');
  
  const [crmCampaignTargetTier, setCrmCampaignTargetTier] = useState<string | null>(null);
  const [crmCopiedMessageId, setCrmCopiedMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedClient) {
      setNewName(selectedClient.name || '');
      setNewRut(selectedClient.rut || '');
      setNewCategory(selectedClient.categoria || 'Sin categoría');
      setNewIntranet(selectedClient.intranet || 'No');
      setNewComoLlego(selectedClient.comoLlego || 'Campañas / Ads');
      setNewCompraAnual(getClientAnnualSales2026(selectedClient));
      setCrmCopiedMessageId(null);
      
      const activeTiers = getTiersList();
      const currentTierIndex = activeTiers.findIndex(t => t.name.toLowerCase() === (selectedClient.categoria || 'Sin categoría').toLowerCase());
      if (currentTierIndex !== -1 && currentTierIndex < activeTiers.length - 1) {
        setCrmCampaignTargetTier(activeTiers[currentTierIndex + 1].name);
      } else {
        setCrmCampaignTargetTier('Oro'); // default fallback
      }
    }
  }, [selectedClient]);

  const filtered = records
    .filter(r => {
      const name = safe(r.name).toLowerCase();
      const rut = safe(r.rut).toLowerCase();
      const search = filters.search.toLowerCase();
      const matchesSearch = name.includes(search) || rut.includes(search);
      const matchesRegion = filters.region === 'Todas' || safe(r.region) === filters.region;
      const matchesType = filters.type === 'Todos' || safe(r.type) === filters.type;
      const matchesCategoria = filters.categoria === 'Todas' || normalizeCat(r.categoria) === normalizeCat(filters.categoria);
      const matchesIntranet = filters.intranet === 'Todos' || safe(r.intranet) === filters.intranet;
      return matchesSearch && matchesRegion && matchesType && matchesCategoria && matchesIntranet;
    })
    .sort((a, b) => (b.fechaIngreso || '').localeCompare(a.fechaIngreso || ''));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`¿Está seguro que desea eliminar masivamente ${selectedIds.length} registros? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      for (const id of selectedIds) {
        console.log(`Debug: Deleting record ${id}`);
        await localDB.deleteFromCollection('contacts', id);
      }
      setSelectedIds([]);
      window.dispatchEvent(new Event('db-change'));
      alert(`Se han eliminado ${selectedIds.length} registros correctamente.`);
    } catch (err) {
      console.error('Error during bulk delete:', err);
      alert('Hubo un problema al eliminar algunos registros.');
    }
  };

  const handleUpdate = async () => {
    if (!selectedClient) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const logHeader = `\n\n--- ${activityType} (${dateStr}) ---`;
    
    const updatedHistory = (selectedClient.historialUnificado || '') + logHeader + (newHistory ? `\n[Estado: ${currentStatus}] - ${newHistory}` : `\n[Actualización de datos: ${currentStatus}]`);
    
    const isGestion = newIsGestionCustomer !== null ? newIsGestionCustomer : !!selectedClient.isGestionCustomer;
    const becameGestion = isGestion && !selectedClient.isGestionCustomer;

    const updatedIntranet = newIntranet || selectedClient.intranet || 'No';

    let salesObj = { v2024: 0, v2025: 0, v2026: 0 };
    const savedVentasStr = selectedClient.clubVentasDetail;
    if (savedVentasStr) {
      try {
        salesObj = typeof savedVentasStr === 'string' ? JSON.parse(savedVentasStr) : savedVentasStr;
      } catch (e) {
        console.error('Error parsing sales history:', e);
      }
    } else if (selectedClient.ventas) {
      salesObj = { ...selectedClient.ventas };
    }
    salesObj.v2026 = Number(newCompraAnual);

    // Auto-calculate the category based on purchases
    const calculatedTier = getTierForSales(Number(newCompraAnual));
    // If the category was manually modified to a different value in the UI dropdown, respect it; otherwise fallback to auto-calculated tier
    const finalCategory = (newCategory && newCategory !== selectedClient.categoria) ? newCategory : calculatedTier.name;

    const updatedContact = {
      name: newName || selectedClient.name,
      rut: newRut || selectedClient.rut,
      phone: selectedClient.phone,
      email: selectedClient.email,
      categoria: finalCategory,
      intranet: updatedIntranet,
      comoLlego: newComoLlego || selectedClient.comoLlego || 'Campañas / Ads',
      compraAnual: Number(newCompraAnual),
      clubVentasDetail: JSON.stringify(salesObj),
      isGestionCustomer: isGestion,
      historialUnificado: updatedHistory
    };

    await localDB.updateInCollection('contacts', selectedClient.id, updatedContact);

    if (updatedIntranet === 'Si') {
      await syncToIntranetClientsIfNeeded({
        ...selectedClient,
        ...updatedContact
      }, user);
    }

    if (becameGestion) {
      const gestionRecord = {
        fechaIngreso: selectedClient.fechaIngreso,
        nombre: newName || selectedClient.name,
        rut: newRut || selectedClient.rut,
        tipoEmpresa: selectedClient.type,
        comuna: selectedClient.region,
        celular: selectedClient.phone,
        email: selectedClient.email,
        categoria: newCategory || selectedClient.categoria,
        estado: 'En proceso',
        consultora: user?.displayName || user?.email || 'CRM',
        observaciones: `Sincronizado desde Expediente CRM por ${user?.displayName || user?.email}\n\n${updatedHistory}`
      };
      await localDB.saveToCollection('gestion_records', gestionRecord);
      await addAuditLog(user, `Sincronizó cliente ${selectedClient.name} a Gestión`, 'CRM');
      alert('Cliente sincronizado exitosamente al módulo de Gestión.');
    }

    alert('Expediente actualizado correctamente');
    setSelectedClient(null);
    setNewHistory('');
    setNewName('');
    setNewRut('');
    setNewCategory('');
    setNewIntranet('');
    setNewComoLlego('Campañas / Ads');
    setNewCompraAnual(0);
    setNewIsGestionCustomer(null);
    window.dispatchEvent(new Event('db-change'));
  };

  const exportRecordToExcel = (record: any) => {
    const data = [
      ["Nombre / Razón Social", record.name || "---"],
      ["RUT / ID", record.rut || "---"],
      ["Email", record.email || "---"],
      ["Teléfono", record.phone || "---"],
      ["Comuna", record.region || "---"],
      ["Tipo", record.type || "---"],
      ["Categoría", record.categoria || "---"],
      ["Origen / Cómo Llegó", record.comoLlego || "Campañas / Ads"],
      ["Compra Anual Acumulada ($)", getClientAnnualSales2026(record)],
      ["Intranet", record.intranet || "No"],
      ["Fecha Ingreso", formatDateForExcel(record.fechaIngreso)],
      ["Historial", record.historialUnificado || "---"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 25 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expediente");
    XLSX.writeFile(wb, `expediente_${record.rut || record.id}.xlsx`);
  };

  if (selectedClient) {
    return (
      <div className="bg-[#152035] min-h-[600px] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-500 border border-[#1E293B]">
        <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-6  flex justify-between items-center">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-[#1E293B]/80 rounded-2xl">
                <FileText className="w-6 h-6 text-blue-400" />
             </div>
             <div>
               <h3 className="text-xl font-bold leading-tight">Expediente de Cliente</h3>
               <p className="text-xs uppercase tracking-widest font-black text-blue-300 opacity-80">{selectedClient.name}</p>
             </div>
           </div>
           <button onClick={() => setSelectedClient(null)} className="bg-red-900/40 border border-red-500/30 text-red-200 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-red-800 transition-all active:scale-95">Cerrar Expediente</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
           <div className="lg:col-span-8 p-6 lg:p-8 space-y-8">
              {/* Top Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                 <div className="bg-[#152035] p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-[#1E293B]">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">RUT</span>
                    <span className="text-sm font-bold text-white">{selectedClient.rut}</span>
                 </div>
                 <div className="bg-[#152035] p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-[#1E293B]">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Comuna</span>
                    <span className="text-sm font-bold text-white">{selectedClient.region}</span>
                 </div>
                 <div className="bg-[#152035] p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-[#1E293B]">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Tipo Empresa</span>
                    <span className="text-sm font-bold text-white">{selectedClient.type}</span>
                 </div>
                 <div className="bg-[#152035] p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-[#1E293B]">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha Ingreso</span>
                    <span className="text-sm font-bold text-white">{formatDate(selectedClient.fechaIngreso)}</span>
                 </div>
                 <div className="bg-[#152035] p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-blue-100 flex items-center justify-between">
                    <div>
                       <span className="block text-[9px] font-black uppercase text-blue-400 tracking-widest mb-1">Inscrito Intranet</span>
                       <span className={cn(
                         "text-sm font-black italic",
                         (newIntranet || selectedClient.intranet) === 'Si' ? "text-emerald-600" : "text-red-500"
                       )}>{newIntranet || selectedClient.intranet || 'No'}</span>
                    </div>
                    <button 
                      onClick={handleUpdate}
                      className="bg-[#FF7F50] hover:bg-[#FF6347] text-white p-2 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                      title="Registrar Cambios en Expediente"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Registrar</span>
                    </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-blue-900 tracking-tighter flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/50 rounded-full animate-pulse" />
                       Historial detallado de actividades
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {(selectedClient.historialUnificado || '').split('---').length - 1} registros encontrados
                    </span>
                 </div>
                 <div className="bg-[#152035] border rounded-2xl p-8 shadow-inner min-h-[300px] flex flex-col items-center justify-center relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                    {selectedClient.historialUnificado ? (
                      <div className="w-full text-sm leading-relaxed text-slate-300 italic whitespace-pre-wrap font-medium">
                         {selectedClient.historialUnificado}
                      </div>
                    ) : (
                      <div className="text-center opacity-40">
                         <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                         <p className="text-sm font-medium">No se han registrado actividades para este expediente aún.</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Sidebar: Management */}
           <div className="lg:col-span-4 bg-[#152035] border-l border-[#1E293B] p-8 space-y-8">
              <div className="space-y-6">
                <div>
                   <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Save className="w-4 h-4" /> Nueva Gestión / Seguimiento
                   </h4>
                   <div className="h-px bg-[#1E293B] mb-8" />
                </div>

                <CRMField label="Nombre / Razón Social">
                  <input 
                    className="w-full border-b bg-[#152035] border-[#1E293B] p-3 text-sm font-bold outline-none" 
                    value={newName || selectedClient.name}
                    onChange={e => setNewName(e.target.value)}
                  />
                </CRMField>
                <CRMField label="RUT / ID">
                  <input 
                    className="w-full border-b bg-[#152035] border-[#1E293B] p-3 text-sm outline-none" 
                    value={newRut || selectedClient.rut}
                    onChange={e => setNewRut(e.target.value)}
                  />
                </CRMField>

                <CRMField label="Tipo de Actividad">
                  <select 
                    className="w-full border-b bg-[#152035] border-[#1E293B] p-3 text-sm focus:bg-[#152035] transition-all outline-none" 
                    value={activityType}
                    onChange={e => setActivityType(e.target.value)}
                  >
                    <option>Nota de Seguimiento</option>
                    <option>Llamada Telefónica</option>
                    <option>Reunión Presencial</option>
                    <option>Campaña Email</option>
                    <option>Beneficios de Club</option>
                    <option>Otro</option>
                  </select>
                </CRMField>

                <CRMField label="Detalle de la Actividad">
                  <textarea 
                    className="w-full h-40 p-4 border rounded-2xl bg-[#152035] focus:bg-[#152035] text-sm transition-all outline-none resize-none" 
                    value={newHistory}
                    onChange={e => setNewHistory(e.target.value)}
                    placeholder="Escriba los pormenores de la gestión realizada..."
                  />
                </CRMField>

                <div className="grid grid-cols-2 gap-4">
                  <CRMField label="Categoría">
                    <select 
                      className="w-full border-b bg-[#152035] border-[#1E293B] p-3 text-sm font-bold text-[#38BDF8] outline-none" 
                      value={newCategory || selectedClient.categoria}
                      onChange={e => setNewCategory(e.target.value)}
                    >
                      {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </CRMField>
                  <CRMField label="Estado Actual">
                     <select 
                       className="w-full border-b bg-[#152035] border-[#1E293B] p-3 text-sm font-bold text-slate-200 outline-none"
                       value={currentStatus}
                       onChange={e => setCurrentStatus(e.target.value)}
                     >
                       <option>En proceso</option>
                       <option>Completado</option>
                       <option>Pendiente</option>
                       <option>Cancelado</option>
                     </select>
                  </CRMField>
                </div>

                <CRMField label="Inscrito en Intranet">
                    <select 
                      className="w-full border-b bg-[#152035] border-[#1E293B] p-3 text-sm font-black text-white outline-none" 
                      value={newIntranet || selectedClient.intranet || 'No'}
                      onChange={e => setNewIntranet(e.target.value)}
                    >
                      <option value="No">No</option>
                      <option value="Si">Si</option>
                    </select>
                </CRMField>

                <div className="grid grid-cols-2 gap-4">
                  <CRMField label="Cómo Llegó (Canal de Origen)">
                     <select 
                       className="w-full border-b bg-[#152035] border-[#1E293B] p-3 text-sm font-bold text-pink-400 outline-none" 
                       value={newComoLlego || selectedClient.comoLlego || 'Campañas / Ads'} 
                       onChange={e => setNewComoLlego(e.target.value)}
                     >
                       <option value="Campañas / Ads">📢 Campañas / Ads</option>
                       <option value="Instagram">📸 Instagram</option>
                       <option value="Facebook">👥 Facebook</option>
                       <option value="WhatsApp">💬 WhatsApp</option>
                       <option value="Llamada Directa">📞 Llamada Directa</option>
                       <option value="Recomendación">🤝 Recomendación</option>
                       <option value="Página Web">🌐 Página Web</option>
                       <option value="Otro">✏️ Otro</option>
                     </select>
                  </CRMField>

                  <CRMField label="Compra Anual Acumulada ($)">
                     <input 
                       type="number"
                       className="w-full border-b bg-[#152035] border-[#1E293B] p-3 text-sm font-black text-amber-300 outline-none" 
                       placeholder="Ej: 700000" 
                       value={newCompraAnual || ''} 
                       onChange={e => {
                         const val = Number(e.target.value) || 0;
                         setNewCompraAnual(val);
                         const recommendedTier = getTierForSales(val);
                         setNewCategory(recommendedTier.name);
                       }} 
                     />
                  </CRMField>
                </div>

                <CRMField label="Opciones">
                  <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer pt-2 group">
                    <input 
                      type="checkbox" 
                      className="rounded border-[#1E293B] text-[#38BDF8] focus:ring-blue-500 w-4 h-4"
                      checked={newIsGestionCustomer !== null ? newIsGestionCustomer : !!selectedClient.isGestionCustomer}
                      onChange={e => setNewIsGestionCustomer(e.target.checked)}
                    />
                    <span className="font-bold group-hover:text-[#38BDF8] transition-colors">Es Cliente de Gestión</span>
                  </label>
                </CRMField>

                {/* Simulador de Categorías Club Social Cimasur 👑 */}
                <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-500/10 pb-2">
                    <span className="text-xs font-black text-amber-400 tracking-wider flex items-center gap-1.5 uppercase">
                      👑 Simulador Club Cimasur
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/35 px-2 py-0.5 rounded-full font-black uppercase">
                      Categoría: {newCategory || 'Sin categoría'}
                    </span>
                  </div>
                  
                  {(() => {
                    const activeTiers = getTiersList();
                    const currentSales = Number(newCompraAnual || 0);
                    
                    // Normalizar y obtener la categoría actualmente seleccionada en el formulario
                    const selectedCategoryName = newCategory || selectedClient.categoria || 'Sin categoría';
                    const targetTier = activeTiers.find(t => t.name.toLowerCase() === selectedCategoryName.toLowerCase()) || activeTiers[0];
                    
                    if (targetTier.name.toLowerCase() === 'sin categoría' || targetTier.name.toLowerCase() === 'sin compra') {
                      return (
                        <div className="text-xs text-slate-300 font-bold bg-[#091124] p-3 rounded-lg border border-[#1E293B] text-center">
                          Esta cuenta no requiere un mínimo de compras para permanecer en "{selectedCategoryName}".
                        </div>
                      );
                    }
                    
                    const neededSales = targetTier.min;
                    const remaining = Math.max(0, neededSales - currentSales);
                    const percentage = Math.min(100, Math.max(0, (currentSales / neededSales) * 100));
                    
                    return (
                      <div className="space-y-3">
                        <div className="space-y-1 bg-[#091124] p-3 rounded-lg border border-[#1E293B]">
                          <div className="flex justify-between text-[11px] text-slate-300 font-bold">
                            <span>Progreso para categoría {targetTier.name}</span>
                            <span>{percentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-[#0D1527] h-2 rounded-full overflow-hidden border border-[#1E293B] mt-1">
                            <div className="bg-amber-400 h-full rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-1.5 font-semibold">
                            Meta para {targetTier.name}: ${neededSales.toLocaleString('es-CL')} | Actual: ${currentSales.toLocaleString('es-CL')}
                          </span>
                        </div>
                        
                        <div className="bg-[#091124] p-3 rounded-lg border border-[#1E293B] space-y-2 text-xs">
                          {remaining > 0 ? (
                            <p className="text-slate-200 leading-relaxed font-medium">
                              Si compra <span className="text-amber-300 font-black">${remaining.toLocaleString('es-CL')}</span> adicionales durante el año, puede alcanzar la categoría <span className="text-amber-400 font-black uppercase">{targetTier.name}</span>.
                            </p>
                          ) : (
                            <p className="text-emerald-400 font-bold flex items-center gap-1">
                              <span>✓ ¡Excelente! Ya cumplió con el mínimo de ${neededSales.toLocaleString('es-CL')} para la categoría {targetTier.name} durante este año.</span>
                            </p>
                          )}
                          
                          <div className="border-t border-[#1E293B] pt-2 space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Beneficios del nivel {targetTier.name}:</p>
                            <ul className="text-[11px] text-slate-300 space-y-1 pl-1">
                              {(targetTier.benefits || []).map((b, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-amber-400 font-black">✓</span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* PLAN DE ACELERACIÓN Y CAMPAÑA DE MARKETING (SIDEBAR) */}
                        <div className="p-3 bg-[#091124] rounded-lg border border-[#1E293B] space-y-3">
                          <div className="flex items-center gap-1.5 border-b border-[#1E293B] pb-1.5">
                            <span className="text-[10px] font-black text-amber-400 tracking-wider uppercase">
                              🎯 Campaña & Plan de Aceleración
                            </span>
                          </div>

                          {/* Target Category selector */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">Categoría Objetivo:</span>
                            <div className="grid grid-cols-4 gap-1">
                              {activeTiers.filter(t => t.name !== 'Sin categoría').map(t => {
                                const isSel = crmCampaignTargetTier === t.name;
                                return (
                                  <button
                                    key={t.name}
                                    type="button"
                                    onClick={() => setCrmCampaignTargetTier(t.name)}
                                    className={`py-1 rounded text-[9px] font-bold border text-center transition-all cursor-pointer ${
                                      isSel 
                                        ? "bg-amber-400/20 text-amber-300 border-amber-500/30" 
                                        : "bg-[#0D1527] text-slate-400 border-slate-800 hover:text-slate-300"
                                    }`}
                                  >
                                    {t.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {(() => {
                            const campaignTier = activeTiers.find(t => t.name === crmCampaignTargetTier) || targetTier;
                            const neededVal = campaignTier.min;
                            const remVal = Math.max(0, neededVal - currentSales);
                            const alreadyGot = currentSales >= neededVal;
                            
                            const curMonth = new Date().getMonth();
                            const remMonths = Math.max(1, 12 - curMonth);
                            const quota = remVal / remMonths;

                            // Limit Date for fast track
                            const limitDate = new Date();
                            limitDate.setDate(limitDate.getDate() + 3);
                            const limitDateStr = limitDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

                            const waMsgText = `¡Hola *${selectedClient.name}*! Le saluda Fernanda Contreras de Cimasur. 🌟\n\n` +
                              `Queremos felicitarlo por sus compras este año y contarle que se encuentra súper cerca de subir a nuestra destacada categoría *${campaignTier.name}* en el Club Social Cimasur.\n\n` +
                              `Para que comience a disfrutar de todos los beneficios exclusivos como: ${campaignTier.benefits.slice(0, 2).join(', ')} de manera INMEDIATA, hemos preparado una campaña de *Subida Express "Fast-Track 3 Días"*: \n\n` +
                              `⚡ *La Promoción:* Si realiza compras especiales por un total de *\n` +
                              `$${remVal.toLocaleString('es-CL')}* en las próximas 72 horas (plazo hasta el ${limitDateStr}), ¡le activaremos de inmediato y para todo el resto del año el nivel *${campaignTier.name}* con todos sus privilegios directos!\n\n` +
                              `¿Le gustaría coordinar hoy un pedido especial con nosotros para aprovechar esta oportunidad única? ¡Quedamos muy atentos!`;

                            return (
                              <div className="space-y-2">
                                <div className="p-2 bg-[#0D1527] rounded border border-slate-800 space-y-1">
                                  <div className="text-[10px] text-slate-300 leading-snug">
                                    {alreadyGot ? (
                                      <span className="text-emerald-400 font-bold">✓ ¡Categoría ya superada hoy!</span>
                                    ) : (
                                      <>
                                        Plan de Compras: <strong className="text-indigo-300">${quota.toLocaleString('es-CL', { maximumFractionDigits: 0 })} / mes</strong> durante {remMonths} meses.
                                      </>
                                    )}
                                  </div>
                                </div>

                                {!alreadyGot && (
                                  <div className="p-2 bg-[#0D1527] border border-pink-500/10 rounded space-y-2 text-[11px]">
                                    <div className="flex justify-between items-center text-[9px] text-pink-400 font-bold">
                                      <span>⚡ FAST-TRACK 3 DÍAS</span>
                                      <span>Falta: ${remVal.toLocaleString('es-CL')}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                      Ofrece activar temporalmente la categoría ya mismo si compra el faltante en 3 días.
                                    </p>

                                    <div className="relative mt-1">
                                      <textarea
                                        readOnly
                                        value={waMsgText}
                                        className="w-full h-24 text-[9px] text-slate-400 bg-[#152035] p-2 rounded outline-none font-sans leading-normal resize-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(waMsgText);
                                          setCrmCopiedMessageId(selectedClient.id + '-' + campaignTier.name);
                                          setTimeout(() => setCrmCopiedMessageId(null), 3000);
                                        }}
                                        className="absolute right-1 bottom-1 text-[8px] bg-pink-600 hover:bg-pink-700 text-white font-black uppercase p-1 px-2 rounded tracking-wider cursor-pointer"
                                      >
                                        {crmCopiedMessageId === (selectedClient.id + '-' + campaignTier.name) ? "¡Copiado! ✓" : "Copiar 💬"}
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewCompraAnual(prev => prev + remVal);
                                        alert(`Campaña Simulación: Se añadieron $${remVal.toLocaleString('es-CL')} a las compras de ${selectedClient.name} para completar su meta de ${campaignTier.name}. Guarde los cambios pulsando "Registrar" abajo para consolidar la categoría.`);
                                      }}
                                      className="w-full mt-1.5 p-1 bg-slate-900 hover:bg-pink-950/20 text-slate-300 hover:text-pink-400 font-bold text-[9px] uppercase tracking-wider rounded border border-slate-800 transition-all cursor-pointer text-center"
                                    >
                                      + Auto-completar Meta en Simulación
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-4 border-t border-[#1E293B]">
                  <p className="text-[10px] text-slate-400 text-center italic">Utilice el botón "Registrar" junto a los datos para guardar los cambios.</p>
                </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-[#152035] p-6 rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar por Nombre o RUT..." 
              className="pl-10 pr-4 py-2 border rounded-full text-xs w-full outline-none focus:ring-2 focus:ring-blue-100"
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
            />
         </div>
         <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="text-xs border rounded-full px-4 py-2 w-full outline-none"
              value={filters.region}
              onChange={e => setFilters({...filters, region: e.target.value})}
            >
               {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
         </div>
         <select 
           className="text-xs border rounded-full px-4 py-2 w-full outline-none"
           value={filters.type}
           onChange={e => setFilters({...filters, type: e.target.value})}
         >
            <option value="Todos">Todos los tipos</option>
            <option>Farmacia</option><option>Centro Médico</option><option>Empresa</option><option>Independiente</option><option>Otros</option>
         </select>
         <select 
           className="text-xs border rounded-full px-4 py-2 w-full outline-none"
           value={filters.categoria}
           onChange={e => setFilters({...filters, categoria: e.target.value})}
         >
            <option value="Todas">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
         </select>
         <select 
           className="text-xs border rounded-full px-4 py-2 w-full outline-none"
           value={filters.intranet}
           onChange={e => setFilters({...filters, intranet: e.target.value})}
         >
            <option value="Todos">Intranet (Todos)</option>
            <option value="Si">Si</option>
            <option value="No">No</option>
         </select>
         <div className="flex flex-col gap-2">
            <button 
              onClick={() => {
                const data = filtered.map(r => [
                  r.name,
                  r.rut,
                  r.region,
                  r.categoria,
                  r.type,
                  r.phone || '---',
                  r.email || '---',
                  r.comoLlego || 'Campañas / Ads',
                  `$${getClientAnnualSales2026(r).toLocaleString('es-CL')}`
                ]);
                exportTableToPDF(
                  'Reporte: Cartera de Clientes (CRM Comercial)',
                  ['Nombre/Razón Social', 'RUT', 'Región', 'Categoría', 'Tipo', 'Teléfono', 'Email', 'Cómo Llegó', 'Compra Anual'],
                  data,
                  'cartera_clientes_crm'
                );
              }}
              className="w-full bg-[#152035] border border-blue-200 text-[#38BDF8] py-2 rounded-full font-bold text-xs hover:bg-[#111A2E] flex items-center justify-center gap-2"
              title="Exportar a PDF"
            >
              <Download className="w-4 h-4" /> Exportar Filtrados
            </button>
            {selectedIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="w-full bg-red-50 border border-red-200 text-red-700 py-2 rounded-full font-bold text-xs hover:bg-red-100 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.length})
              </button>
            )}
          </div>
       </div>

      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-990 to-slate-900 border border-blue-500/30 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/20 text-[#38BDF8]">
              <TrendingUp className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Acciones Masivas para Selección</span>
                <span className="px-2.5 py-0.5 bg-blue-500/30 border border-blue-400 text-[#38BDF8] font-black text-xs rounded-full">{selectedIds.length} seleccionados</span>
              </h4>
              <p className="text-xs text-slate-400">Modifica la categoría o traspasa de inmediato a gestión los registros marcados.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Cambiar categoría masiva */}
            <div className="flex items-center gap-2 bg-[#0F172A] border border-[#1E293B] px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Nueva Categoría:</span>
              <select
                disabled={!canEdit}
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (window.confirm(`¿Está seguro que desea cambiar a "${val}" la categoría de los ${selectedIds.length} clientes seleccionados?`)) {
                    try {
                      for (const id of selectedIds) {
                        await localDB.updateInCollection('contacts', id, { categoria: val });
                      }
                      setSelectedIds([]);
                      window.dispatchEvent(new Event('db-change'));
                      alert(`Se actualizó la categoría a "${val}" para los clientes seleccionados.`);
                    } catch (err) {
                      console.error(err);
                      alert('Hubo un error al actualizar las categorías.');
                    }
                  }
                  e.target.value = '';
                }}
                className="bg-transparent text-white text-xs border-none outline-none cursor-pointer font-bold focus:ring-0 focus:outline-none"
              >
                <option value="" className="bg-[#152035] text-slate-400">Seleccionar...</option>
                {CATEGORIAS.map(c => (
                  <option key={c} value={c} className="bg-[#152035] text-white font-bold">{c}</option>
                ))}
              </select>
            </div>

            {/* Traspasar masivo a Gestión */}
            <button
              disabled={!canEdit}
              onClick={async () => {
                if (window.confirm(`¿Está seguro que desea traspasar de inmediato a Gestión los ${selectedIds.length} clientes seleccionados?`)) {
                  try {
                    let count = 0;
                    for (const id of selectedIds) {
                      const client = records.find(r => r.id === id);
                      if (!client) continue;
                      
                      if (!client.isGestionCustomer) {
                        const now = new Date();
                        const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const logHeader = `\n\n--- Sincronización Masiva (${dateStr}) ---`;
                        const updatedHistory = (client.historialUnificado || '') + logHeader + '\n[Traspaso Masivo] - Sincronizado masivamente a módulo de Gestión.';
                        
                        await localDB.updateInCollection('contacts', client.id, {
                          isGestionCustomer: true,
                          historialUnificado: updatedHistory
                        });

                        const gestionRecord = {
                          fechaIngreso: client.fechaIngreso || new Date().toISOString().split('T')[0],
                          nombre: client.name,
                          rut: client.rut,
                          tipoEmpresa: client.type,
                          comuna: client.region,
                          celular: client.phone || '',
                          email: client.email || '',
                          categoria: client.categoria,
                          estado: 'En proceso',
                          consultora: user?.displayName || user?.email || 'CRM',
                          observaciones: `Sincronizado masivamente desde CRM Comercial por ${user?.displayName || user?.email}\n\n${updatedHistory}`
                        };
                        await localDB.saveToCollection('gestion_records', gestionRecord);
                        await addAuditLog(user, `Sincronizó cliente ${client.name} a Gestión (Masivo)`, 'CRM');
                        count++;
                      }
                    }
                    setSelectedIds([]);
                    window.dispatchEvent(new Event('db-change'));
                    alert(`Traspaso masivo finalizado. ${count} clientes nuevos fueron agregados a Gestión.`);
                  } catch (err) {
                    console.error(err);
                    alert('Hubo un problema al realizar el traspaso masivo.');
                  }
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <UserCheck className="w-4 h-4" />
              <span>Traspasar a Gestión</span>
            </button>

            {/* Cancelar Selección */}
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-xl transition-all font-bold text-xs border border-slate-700 active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-xs">
              <thead>
                 <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  border-b text-left text-[10px] font-black uppercase tracking-widest">
                    <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">
                       <input 
                         type="checkbox" 
                         className="rounded"
                         checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                         onChange={toggleSelectAll}
                       />
                     </th>
                    <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Razón Social / Cliente</th>
                    <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Comuna</th>
                    <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Email</th>
                    <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Fecha Ingreso</th>
                    <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Categoría</th>
                    <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Tipo</th>
                    <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Intranet</th>
                    <th className="p-5 text-right px-8 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Acciones</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                 {filtered.map(r => (
                   <tr key={r.id} className="hover:bg-[#1E293B]/50 transition-colors">
                      <td className="p-5">
                        <input 
                          type="checkbox" 
                          className="rounded"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td className="p-5">
                         <div className="flex items-center gap-2">
                             <div className="font-bold text-white">{r.name}</div>
                             <span className="text-[10px] bg-[#111A2E] text-slate-300 font-black px-1.5 rounded" title="Cantidad de registros de actividad">{ (r.historialUnificado || '').split('---').length - 1 }</span>
                          </div>
                         <div className="text-[10px] text-slate-400 font-mono flex flex-wrap items-center gap-1.5 mt-1">
                           <span>{r.rut}</span>
                           {r.comoLlego && (
                             <span className="text-[9px] bg-pink-500/20 text-pink-300 font-black px-1.5 py-0.5 rounded border border-pink-500/20" title="Canal de Origen (Cómo Llegó)">
                               📢 {r.comoLlego}
                             </span>
                           )}
                           {r.fechaPago && (
                             <span className="text-[9px] bg-[#0284C7]/20 text-[#38BDF8] font-black px-1.5 py-0.5 rounded border border-[#0284C7]/20" title="Frecuencia / Ciclo de Compra">
                               💰 Compra Anual: ${getClientAnnualSales2026(r).toLocaleString('es-CL')}
                             </span>
                           )}
                         </div>
                      </td>
                      <td className="p-5 text-slate-400 italic">{r.region}</td>
                      <td className="p-5 text-slate-300">{r.email || '---'}</td>
                      <td className="p-5 text-slate-300">{formatDate(r.fechaIngreso) || '---'}</td>
                      <td className="p-5">
                         <select
                           value={CATEGORIAS.includes(r.categoria) ? r.categoria : 'Sin categoría'}
                           disabled={!canEdit}
                           onChange={async (e) => {
                             const newVal = e.target.value;
                             try {
                               await localDB.updateInCollection('contacts', r.id, { categoria: newVal });
                               window.dispatchEvent(new Event('db-change'));
                             } catch (err) {
                               console.error(err);
                               alert('Error al actualizar la categoría.');
                             }
                           }}
                           className={cn(
                             "px-2.5 py-1 rounded-full font-black text-[9px] uppercase border cursor-pointer bg-[#0F172A] outline-none text-center focus:ring-1 focus:ring-blue-400 font-bold max-w-[125px] disabled:pointer-events-none disabled:opacity-80",
                             r.categoria === 'Platinum' ? "bg-purple-950 text-purple-300 border-purple-800/80" :
                             r.categoria === 'Oro' ? "bg-amber-950 text-amber-300 border-amber-800/80" :
                             r.categoria === 'Plata' ? "bg-slate-800 text-slate-300 border-slate-600/80" :
                             r.categoria === 'Bronce' ? "bg-orange-950 text-orange-300 border-orange-850/80" :
                             "bg-[#111A2E] text-slate-200 border-slate-700/50"
                           )}
                         >
                           {CATEGORIAS.map(cat => (
                             <option key={cat} value={cat} className="bg-[#152035] text-white">
                               {cat}
                             </option>
                           ))}
                         </select>
                      </td>
                      <td className="p-5 font-medium text-slate-350">{r.type}</td>
                      <td className="p-5">
                         <select
                           value={r.intranet || 'No'}
                           disabled={!canEdit}
                           onChange={async (e) => {
                             const newVal = e.target.value;
                             try {
                               await localDB.updateInCollection('contacts', r.id, { intranet: newVal });
                               if (newVal === 'Si') {
                                 await syncToIntranetClientsIfNeeded({ ...r, intranet: 'Si' }, user);
                               }
                               window.dispatchEvent(new Event('db-change'));
                             } catch (err) {
                               console.error(err);
                               alert('Error al actualizar el estado de Intranet.');
                             }
                           }}
                           className={cn(
                             "px-2.5 py-1 rounded-full font-black text-[9px] uppercase border cursor-pointer bg-[#0F172A] outline-none text-center focus:ring-1 focus:ring-blue-400 font-bold max-w-[80px] disabled:pointer-events-none disabled:opacity-80 transition-all duration-200",
                             (r.intranet === 'Si') 
                               ? "bg-emerald-950 text-emerald-300 border-emerald-800/80" 
                               : "bg-rose-950 text-rose-300 border-rose-800/80"
                           )}
                         >
                           <option value="Si" className="bg-[#152035] text-white">🟢 Sí</option>
                           <option value="No" className="bg-[#152035] text-white">🔴 No</option>
                         </select>
                      </td>
                      <td className="p-5 text-right flex items-center justify-end gap-2">
                         {r.isGestionCustomer ? (
                           <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg font-bold animate-fade-in" title="Cliente registrado en Gestión">
                             ✓ En Gestión
                           </span>
                         ) : (
                           canEdit && (
                             <button
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 try {
                                   const now = new Date();
                                   const dateStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                   const logHeader = `\n\n--- Sincronización Rápida (${dateStr}) ---`;
                                   const updatedHistory = (r.historialUnificado || '') + logHeader + '\n[Traspaso Rápido] - Sincronizado directamente a Gestión desde la lista CRM.';
                                   
                                   await localDB.updateInCollection('contacts', r.id, {
                                     isGestionCustomer: true,
                                     historialUnificado: updatedHistory
                                   });

                                   const gestionRecord = {
                                     fechaIngreso: r.fechaIngreso || new Date().toISOString().split('T')[0],
                                     nombre: r.name,
                                     rut: r.rut,
                                     tipoEmpresa: r.type,
                                     comuna: r.region,
                                     celular: r.phone || '',
                                     email: r.email || '',
                                     categoria: r.categoria,
                                     estado: 'En proceso',
                                     consultora: user?.displayName || user?.email || 'CRM',
                                     observaciones: `Sincronizado directamente desde CRM Comercial por ${user?.displayName || user?.email}\n\n${updatedHistory}`
                                   };
                                   await localDB.saveToCollection('gestion_records', gestionRecord);
                                   await addAuditLog(user, `Sincronizó cliente ${r.name} a Gestión (Rápido)`, 'CRM');
                                   window.dispatchEvent(new Event('db-change'));
                                   alert(`Cliente "${r.name}" traspasado exitosamente a Gestión.`);
                                 } catch (err) {
                                   console.error(err);
                                   alert('Hubo un error al realizar el traspaso directo.');
                                 }
                               }}
                               className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-sky-950 hover:bg-sky-900 text-sky-400 border border-sky-800 hover:border-sky-700 rounded-lg font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                               title="Traspasar de inmediato a Gestión sin abrir expediente"
                             >
                               <span>⚡ Traspasar</span>
                             </button>
                           )
                         )}
                         <RecordActions 
                           module="crm"
                           onView={() => setSelectedClient(r)}
                           onDownload={() => {
                             const expediteData = [
                               { label: 'Razón Social / Nombre', value: r.name },
                               { label: 'RUT / ID', value: r.rut },
                               { label: 'Email', value: r.email },
                               { label: 'Teléfono', value: r.phone },
                               { label: 'Región / Comuna', value: r.region },
                               { label: 'Tipo', value: r.type },
                               { label: 'Categoría CRM', value: r.categoria },
                               { label: 'Inscrito en Intranet', value: r.intranet || 'No' },
                               { label: 'Cómo Llegó (Origen)', value: r.comoLlego || 'Campañas / Ads' },
                               { label: 'Compra Anual Acumulada ($)', value: `$${getClientAnnualSales2026(r).toLocaleString('es-CL')}` },
                               { label: 'Fecha de Ingreso', value: formatDate(r.fechaIngreso) || 'N/A' },
                               { label: 'Historial Unificado', value: r.historialUnificado || 'Sin registros preexistentes.' }
                             ];
                             exportExpedienteToPDF(
                               `Expediente de Cliente: ${r.name}`,
                               expediteData,
                               `cliente_${r.rut || r.id}`
                             );
                           }}
                           onExcel={() => exportRecordToExcel(r)}
                           onEdit={() => setSelectedClient(r)}
                           onDelete={async () => {
                             try {
                               await localDB.deleteFromCollection('contacts', r.id);
                               window.dispatchEvent(new Event('db-change'));
                             } catch (err) {
                               console.error(err);
                               alert('Error al eliminar');
                              }
                            }}
                          />
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

function CRMIntranetTable({ 
  clients, 
  onImportFromIntranet,
  onImportSingle
}: { 
  clients: any[], 
  onImportFromIntranet?: () => void,
  onImportSingle?: (client: any) => void
}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [existingCRMEmails, setExistingCRMEmails] = useState<Set<string>>(new Set());
  const [existingCRMNames, setExistingCRMNames] = useState<Set<string>>(new Set());
  const [crmContacts, setCrmContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = React.useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase().trim();
    return clients.filter((client: any) => {
      const name = (client.name || '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [clients, searchTerm]);

  const permissions = user?.permissions?.['crm'];
  const isReadonly = permissions?.readonly === true || user?.role === 'viewer' || (user?.roles?.includes('viewer') && !user?.roles?.includes('admin') && !user?.roles?.includes('manager'));
  const canEdit = user?.roles?.includes('admin') || (permissions ? (permissions.edit !== false && !isReadonly) : !isReadonly);

  useEffect(() => {
    const checkCRM = async () => {
      try {
        const contacts = await localDB.getCollection('contacts');
        setCrmContacts(contacts);
        const emails = new Set(contacts.map((c: any) => (c.email || '').toLowerCase().trim()).filter(Boolean));
        const names = new Set(contacts.map((c: any) => (c.name || '').toLowerCase().trim()).filter(Boolean));
        setExistingCRMEmails(emails);
        setExistingCRMNames(names);
      } catch (err) {
        console.error(err);
      }
    };
    checkCRM();
    window.addEventListener('db-change', checkCRM);
    return () => window.removeEventListener('db-change', checkCRM);
  }, []);

  const downloadIntranetTemplate = () => {
    const headers = [
      ["Nombre", "Email", "Fecha Registro", "Acceso Aprobado"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Intranet");
    XLSX.writeFile(wb, "plantilla_importacion_intranet.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const contacts = await localDB.getCollection('contacts');
        const existingIntranet = await localDB.getCollection('intranet_clients');
        let newLeadsCount = 0;
        let crmUpdatedCount = 0;

        for (const row of data) {
          const icName = safe(row["Nombre"] || row["Nombre / Razón Social"] || row["Nombre Completo"] || row["name"]);
          const icEmail = safe(row["Email"] || row["Mail"] || row["Correo"] || row["email"]);
          const fechaVal = row["Fecha Registro"] || row["Fecha de Registro"] || row["Fecha Ingreso"] || row["Fecha"];
          const fechaIngreso = parseExcelDate(fechaVal) || new Date().toISOString().split('T')[0];
          const rawAcceso = safe(row["Acceso Aprobado"] || row["Aprobado"] || row["Acceso"]);
          const accesoAprobado = (rawAcceso.toLowerCase().trim() === 'si' || rawAcceso.toLowerCase().trim() === 'sí' || rawAcceso.toLowerCase().trim() === 'yes' || rawAcceso.toLowerCase().trim() === 'true') ? 'Si' : 'No';

          if (!icName && !icEmail) continue;

          // Check if it already exists in the MAIN CRM table (contacts)
          const existingContact = contacts.find((c: any) => areContactsDuplicate(c, { name: icName, email: icEmail }));

          // Check if it already exists in the intranet_clients database
          const existingIntranetClient = existingIntranet.find((ic: any) => areContactsDuplicate(ic, { name: icName, email: icEmail }));

          if (existingContact) {
            // Already in CRM! Check if we need to update their intranet tag to 'Si'
            let needsUpdate = false;
            const updates: any = {};

            if (existingContact.intranet !== 'Si') {
              updates.intranet = 'Si';
              needsUpdate = true;
            }

            if (needsUpdate) {
              const currentObs = existingContact.historialUnificado || '';
              updates.historialUnificado = (currentObs ? currentObs + '\n\n' : '') + 
                `[Sincronización Intranet] Estado de Intranet actualizado a 'Si' automáticamente vía importación de plantilla el ${new Date().toLocaleDateString('es-CL')}.`;
              await localDB.updateInCollection('contacts', existingContact.id, updates);
              crmUpdatedCount++;
            }

            // Save to intranet_clients to keep records parallel if not present
            if (!existingIntranetClient) {
              const newIntranetClient = {
                fechaIngreso: fechaIngreso,
                name: icName || 'Cliente Intranet',
                email: icEmail,
                accesoAprobado: accesoAprobado,
                historialUnificado: `Registrado automáticamente en base Intranet el ${new Date().toLocaleDateString('es-CL')}.`,
                responsable: user.displayName || user.email || 'Sistema'
              };
              await localDB.saveToCollection('intranet_clients', newIntranetClient);
              newLeadsCount++;
            } else if (existingIntranetClient.accesoAprobado !== accesoAprobado) {
              await localDB.updateInCollection('intranet_clients', existingIntranetClient.id, { accesoAprobado });
            }
          } else {
            // Does not exist in CRM yet
            if (!existingIntranetClient) {
              const newIntranetClient = {
                fechaIngreso: fechaIngreso,
                name: icName || 'Cliente Intranet',
                email: icEmail,
                accesoAprobado: accesoAprobado,
                historialUnificado: `Registrado en base Intranet el ${new Date().toLocaleDateString('es-CL')}.`,
                responsable: user.displayName || user.email || 'Sistema'
              };
              await localDB.saveToCollection('intranet_clients', newIntranetClient);
              newLeadsCount++;

              // If approved "Si", they are a veterinarian and must buy -> auto pass to CRM contacts!
              if (accesoAprobado === 'Si') {
                await syncIntranetClientToCRM(newIntranetClient, user);
                crmUpdatedCount++;
              }
            } else {
              // Exists in intranet clients, update fields if Excel differs
              const updates: any = {};
              let hasChanges = false;
              if (existingIntranetClient.accesoAprobado !== accesoAprobado) {
                updates.accesoAprobado = accesoAprobado;
                hasChanges = true;
              }
              if (hasChanges) {
                await localDB.updateInCollection('intranet_clients', existingIntranetClient.id, updates);
                if (accesoAprobado === 'Si') {
                  await syncIntranetClientToCRM({ ...existingIntranetClient, accesoAprobado: 'Si' }, user);
                  crmUpdatedCount++;
                }
              }
            }
          }
        }

        if (newLeadsCount > 0) {
          await localDB.saveToCollection('intranet_imports', {
            fechaImportacion: new Date().toISOString(),
            responsable: user.displayName || user.email || 'Sistema',
            cantidadImportada: newLeadsCount,
            archivoNombre: file.name
          });
        }

        await addAuditLog(user, `Importó Excel Intranet: ${newLeadsCount} nuevos, ${crmUpdatedCount} actualizados en CRM`, 'CRM');
        alert(`Éxito al procesar Excel de Intranet:\n\n- ${newLeadsCount} clientes registrados.\n- ${crmUpdatedCount} veterinarios aprobados ("Sí") sincronizados automáticamente con el CRM Comercial.`);
        window.dispatchEvent(new Event('db-change'));
      } catch (error) {
        console.error("Error importing intranet excel file:", error);
        alert("Error al procesar el archivo Excel. Asegúrese de que tenga las columnas correctas.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportIntranetToExcel = () => {
    const headers = [
      ["Nombre", "Email", "Fecha Registro", "Acceso Aprobado"]
    ];
    const data = filteredClients.map(client => [
      client.name || '',
      client.email || '',
      client.fechaIngreso || '',
      client.accesoAprobado || 'No'
    ]);
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    ws['!cols'] = headers[0].map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Base_Intranet");
    XLSX.writeFile(wb, "base_clientes_intranet_comercial.xlsx");
  };

  return (
    <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden animate-in fade-in duration-500">
      <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4 font-bold flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
         <span className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sky-400" /> Base de Clientes en Plataforma Intranet (Venta)
         </span>
         
         <div className="flex flex-wrap items-center gap-2">
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept=".xlsx, .xls"
             onChange={handleImportExcel}
           />
           
           <button
             type="button"
             onClick={downloadIntranetTemplate}
             className="text-[10px] bg-[#111A2E] hover:bg-[#1C2541] border border-slate-600 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black cursor-pointer text-slate-200"
             title="Descargar plantilla Excel optimizada para carga de clientes de Intranet"
           >
             <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Plantilla Importación
           </button>

           <button
             type="button"
             onClick={() => fileInputRef.current?.click()}
             className="text-[10px] bg-sky-900/40 hover:bg-sky-900/60 border border-sky-600/80 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black cursor-pointer text-sky-250 animate-pulse"
             title="Cargar archivo Excel de clientes obtenidos por la plataforma para agregarlos a la base local"
           >
             <Upload className="w-3.5 h-3.5" /> Importar Intranet Excel
           </button>

           <button
             type="button"
             onClick={exportIntranetToExcel}
             className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors uppercase font-black cursor-pointer text-slate-100"
             title="Exportar base de datos actual de clientes Intranet a archivo Excel"
           >
             <Download className="w-3.5 h-3.5 text-amber-400" /> Exportar Base a Excel
           </button>

           {onImportFromIntranet && (
             <button
               type="button"
               onClick={onImportFromIntranet}
               className="text-[10px] bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 border-2 border-[#1C2541] px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all font-bold uppercase cursor-pointer"
               title="Mover todos los clientes de Intranet que están aprobados al CRM Comercial"
             >
               <UserCheck className="w-4 h-4 text-emerald-300 animate-bounce" /> Sincronizar Aprobados al CRM
             </button>
           )}
         </div>
      </div>

      {/* Live Search Engine / Buscador */}
      <div className="bg-[#0f192b] p-4 border-b border-[#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Buscar clientes por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#152035] pl-10 pr-4 py-2.5 text-xs text-white rounded-xl border border-[#1E293B] focus:outline-none focus:border-sky-500 transition-colors placeholder-slate-400"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        </div>
        <div className="text-[11px] text-slate-400 font-bold font-mono">
          {searchTerm ? (
            <span>Coincidencias: <span className="text-sky-400">{filteredClients.length}</span> de <span className="text-slate-300">{clients.length}</span> total</span>
          ) : (
            <span>Total registros: <span className="text-slate-350">{clients.length}</span></span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] border-b text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
              <th className="p-5">Nombre / Razón Social</th>
              <th className="p-5">Email</th>
              <th className="p-5">Fecha Registro</th>
              <th className="p-5 text-center">Acceso Aprobado (Veterinario)</th>
              <th className="p-5 text-center">Estado del Motor Comercial</th>
              <th className="p-5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/10">
            {filteredClients.sort((a, b) => (b.fechaIngreso || '').localeCompare(a.fechaIngreso || '')).map(client => {
              const isTransferred = crmContacts.some(c => areContactsDuplicate(c, client));
              return (
                <tr key={client.id} className="hover:bg-[#1E293B]/50 transition-colors">
                  <td className="p-5 font-bold text-white">{ client.name }</td>
                  <td className="p-5 text-slate-300">{ client.email || '---' }</td>
                  <td className="p-5 text-slate-400">{ formatDate(client.fechaIngreso) }</td>
                  <td className="p-5 text-center">
                    {canEdit ? (
                      <select
                        value={client.accesoAprobado || 'No'}
                        onChange={async (e) => {
                          const newVal = e.target.value;
                          try {
                            await localDB.updateInCollection('intranet_clients', client.id, { accesoAprobado: newVal });
                            if (newVal === 'Si') {
                              await syncIntranetClientToCRM(client, user);
                              alert(`Cliente "${client.name}" aprobado como Veterinario. Se traspasó automáticamente al CRM Comercial.`);
                            }
                            window.dispatchEvent(new Event('db-change'));
                          } catch (err) {
                            console.error("Error updating acceso aprobado:", err);
                          }
                        }}
                        className="bg-[#111A2E] text-xs text-emerald-400 border border-[#1E293B] rounded-xl px-2 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        <option value="No" className="text-rose-400">No (Inactivo)</option>
                        <option value="Si" className="text-emerald-450 font-black">Sí (Veterinario)</option>
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${client.accesoAprobado === 'Si' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                        {client.accesoAprobado === 'Si' ? 'Sí' : 'No'}
                      </span>
                    )}
                  </td>
                  <td className="p-5 text-center">
                    {isTransferred ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/35 px-2.5 py-1 rounded-full text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> Activo en CRM (Campañas)
                      </span>
                    ) : (
                      <div className="flex justify-center items-center gap-2">
                        <span className="bg-slate-800 text-slate-400 border border-slate-700/60 px-2.5 py-1 rounded-full text-[10px] font-bold">
                          Inactivo
                        </span>
                        {client.accesoAprobado === 'Si' && onImportSingle && (
                          <button
                            onClick={() => onImportSingle(client)}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold px-2.5 py-1 rounded text-[10px] uppercase transition-all duration-300 transform active:scale-95 cursor-pointer"
                            title="Sincronizar este veterinario aprobado individualmente al CRM Comercial"
                          >
                            Activar CRM
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-5 text-right">
                     <RecordActions 
                       module="crm"
                       onDelete={async () => {
                         if (confirm("¿Está seguro de eliminar este registro de la base Intranet?")) {
                           await localDB.deleteFromCollection('intranet_clients', client.id);
                           window.dispatchEvent(new Event('db-change'));
                         }
                       }}
                     />
                  </td>
                </tr>
              );
            })}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                  {searchTerm ? `No se encontraron clientes para la búsqueda "${searchTerm}"` : 'No hay clientes importados desde Intranet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CRMImportsTable({ imports }: { imports: any[] }) {
  return (
    <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden animate-in fade-in duration-500">
      <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4  font-bold">
         <span className="flex items-center gap-2">
           <FileSpreadsheet className="w-5 h-5" /> Historial de Importaciones de Intranet
         </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  border-b text-left text-[10px] font-black uppercase tracking-widest">
              <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Fecha Importación</th>
              <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Archivo</th>
              <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Cantidad</th>
              <th className="p-5 bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Responsable</th>
              <th className="p-5 text-right bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {imports.sort((a, b) => b.fechaImportacion.localeCompare(a.fechaImportacion)).map(imp => (
              <tr key={imp.fechaImportacion + imp.archivoNombre} className="hover:bg-[#1E293B]/50 transition-colors">
                <td className="p-5">{ formatDate(imp.fechaImportacion) }</td>
                <td className="p-5 font-medium">{ imp.archivoNombre }</td>
                <td className="p-5 font-bold text-emerald-600">{ imp.cantidadImportada }</td>
                <td className="p-5">{ imp.responsable }</td>
                <td className="p-5 text-right">
                  <RecordActions 
                    module="crm"
                    onDelete={async () => {
                      await localDB.deleteFromCollection('import_logs', imp.id);
                      window.dispatchEvent(new Event('db-change'));
                    }}
                  />
                </td>
              </tr>
            ))}
            {imports.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay importaciones registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CRMActivities() {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role || ''];

  const [activities, setActivities] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<any | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    campania: '',
    tipo: 'Campaña Comercial',
    observaciones: '',
    responsable: '',
    targetCategories: [] as string[],
    incluirAGestion: false
  });

  const loadActivities = async () => {
    const data = await localDB.getCollection('crm_activities');
    setActivities(data);
  };

  useEffect(() => {
    loadActivities();
    if (user && !editingId) setForm(prev => ({ 
      ...prev, 
      responsable: user.displayName || user.email || '',
      targetCategories: []
    }));
  }, [user, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (editingId) {
      await localDB.updateInCollection('crm_activities', editingId, form);
      await addAuditLog(user, `Actualizó Actividad: ${form.campania}`, 'CRM');
      alert('Actividad Actualizada');
      setEditingId(null);
    } else {
      await localDB.saveToCollection('crm_activities', form);
      
      await addNotification({
        title: 'Nueva Actividad Comercial',
        message: `${user.displayName || user.email} registró: ${form.campania} (${form.tipo})`,
        recipientRoles: ['admin', 'crm'],
        sender: user.displayName || user.email || 'Sistema'
      });
      await addAuditLog(user, `Registró Actividad: ${form.campania}`, 'CRM');
      
      // Automatic update in customer records
      if (form.targetCategories.length > 0) {
        const contacts = await localDB.getCollection('contacts');
        const targetedContacts = contacts.filter(c => form.targetCategories.includes(c.categoria));
        
        for (const contact of targetedContacts) {
          const logHeader = `\n\n--- Automatización: ${form.campania} ---`;
          const updatedHistory = (contact.historialUnificado || '') + logHeader + `\n[${form.tipo}] - ${form.observaciones}`;
          await localDB.updateInCollection('contacts', contact.id, {
            historialUnificado: updatedHistory
          });
        }

        let gestionUpdatedCount = 0;
        if (form.incluirAGestion) {
          try {
            const gestionRecords = await localDB.getCollection('gestion_records');
            for (const contact of targetedContacts) {
              const cName = (contact.name || '').toLowerCase().trim();
              const cEmail = (contact.email || '').toLowerCase().trim();
              const cRut = (contact.rut || '').toLowerCase().trim();

              const existingGestion = gestionRecords.find((gr: any) => {
                const grName = (gr.nombre || gr.name || '').toLowerCase().trim();
                const grEmail = (gr.email || '').toLowerCase().trim();
                const grRut = (gr.rut || gr.rutID || '').toLowerCase().trim();

                const nameMatch = cName && grName && grName === cName;
                const emailMatch = cEmail && grEmail && grEmail === cEmail;
                const rutMatch = cRut && cRut !== 'sin rut' && grRut && grRut === cRut;

                return nameMatch || emailMatch || rutMatch;
              });

              if (existingGestion) {
                const logHeader = `\n\n--- Automatización CRM: ${form.campania} ---`;
                const updatedGestionObs = (existingGestion.observaciones || '') + logHeader + `\n[${form.tipo}] - ${form.observaciones}`;
                await localDB.updateInCollection('gestion_records', existingGestion.id, {
                  observaciones: updatedGestionObs
                });
                gestionUpdatedCount++;
              }
            }
          } catch (gErr) {
            console.error("Error updating gestion records:", gErr);
          }
        }

        if (form.incluirAGestion) {
          alert(`Actividad registrada y aplicada automáticamente a ${targetedContacts.length} clientes del CRM.\nAdemás, se incluyó el registro en ${gestionUpdatedCount} fichas de "Gestión" de clientes traspasados.`);
        } else {
          alert(`Actividad registrada y aplicada automáticamente a ${targetedContacts.length} clientes del CRM.`);
        }
      } else {
        alert('Actividad Registrada');
      }
    }
    
    setForm({ 
      fecha: new Date().toISOString().split('T')[0],
      campania: '', 
      tipo: 'Campaña Comercial',
      observaciones: '',
      responsable: user?.displayName || user?.email || '',
      targetCategories: [] as string[],
      incluirAGestion: false
    });
    loadActivities();
    window.dispatchEvent(new Event('db-change'));
  };

  const filteredActivities = activities.filter(a => a.campania.toLowerCase().includes(filterSearch.toLowerCase()));

  const handleEdit = (act: any) => {
    setEditingId(act.id);
    setForm({
      fecha: act.fecha,
      campania: act.campania,
      tipo: act.tipo,
      observaciones: act.observaciones,
      responsable: act.responsable
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {detailView && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#152035] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-6  flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" /> Detalle de Actividad
              </h3>
              <button onClick={() => setDetailView(null)} className="text-white/70 hover:text-white transition-colors">
                <Trash2 className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-8 border-b pb-6">
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Campaña / Actividad</span>
                  <span className="text-lg font-bold text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">{detailView.campania}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha</span>
                  <span className="text-lg font-bold text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">{formatDate(detailView.fecha)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Tipo</span>
                  <span className="bg-[#152035] text-[#38BDF8] px-3 py-1 rounded-full font-bold text-xs">{detailView.tipo}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Responsable</span>
                  <span className="text-[#38BDF8] group-hover:text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.3)] font-medium">{detailView.responsable}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Observaciones y Resultados</span>
                <div className="bg-[#152035] p-6 rounded-2xl text-slate-200 italic leading-relaxed border border-[#1E293B] whitespace-pre-wrap">
                  {detailView.observaciones || "Sin observaciones registradas."}
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => setDetailView(null)}
                  className="bg-[#111A2E] text-slate-300 px-8 py-3 rounded-2xl font-bold hover:bg-[#1E293B] transition-colors"
                >
                  CERRAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B] p-4  font-bold flex items-center justify-between">
           <span className="flex items-center gap-2">
             <TrendingUp className="w-5 h-5" /> 
             {editingId ? 'Editando Actividad / Campaña' : 'Registro de Actividades / Campañas'}
           </span>
           {editingId && (
             <button 
               onClick={() => {
                 setEditingId(null);
                 setForm({
                   fecha: new Date().toISOString().split('T')[0],
                   campania: '',
                   tipo: 'Campaña Comercial',
                   observaciones: '',
                   responsable: user?.displayName || user?.email || ''
                 });
               }}
               className="text-[10px] bg-[#152035]/20 hover:bg-[#1E293B]/50 px-3 py-1.5 rounded uppercase font-black transition-colors"
             >
               Cancelar Edición
             </button>
           )}
        </div>
        <form className="p-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CRMField label="Fecha">
              <input type="date" className="w-full border-b p-2" value={form.fecha || ''} onChange={e => setForm({...form, fecha: e.target.value})} required />
            </CRMField>
            <CRMField label="Nombre de Campaña / Actividad">
              <input 
                className="w-full border-b p-2 font-bold" 
                placeholder="Ej: AGENDA DE INDUCCIÓN" 
                value={form.campania || ''} 
                onChange={e => setForm({...form, campania: e.target.value})} 
                required 
              />
            </CRMField>
            <CRMField label="Tipo de Actividad">
              <select className="w-full border-b p-2" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option>Campaña comercial/wsp</option>
                <option>Inducción</option>
                <option>Email Marketing</option>
                <option>Instagram y whatsapp</option>
                <option>Beneficios de Club</option>
                <option>otros (detallar cuál)</option>
              </select>
            </CRMField>
          </div>
          <CRMField label="Categorías Objetivo (Opcional)">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-[#152035] p-3 rounded">
               {CATEGORIAS.map(cat => (
                 <label key={cat} className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                   <input 
                     type="checkbox"
                     checked={form.targetCategories.includes(cat)}
                     onChange={(e) => {
                       if (e.target.checked) setForm({...form, targetCategories: [...form.targetCategories, cat]});
                       else setForm({...form, targetCategories: form.targetCategories.filter(c => c !== cat)});
                     }}
                   />
                   {cat}
                 </label>
               ))}
            </div>
          </CRMField>
          <CRMField label="Propagación a Gestión (Opcional)">
            <div className="bg-[#111A2E] p-4 rounded-xl border border-[#1E293B] flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-slate-200">INCLUIR REGISTRO EN MÓDULO DE GESTIÓN</span>
                <span className="block text-[11px] text-slate-400">Si se activa, el registro se copiará automáticamente al historial de observaciones de cada cliente en "Gestión" (para aquellos clientes con categoría de esta campaña y que ya tengan ficha creada en Gestión).</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={form.incluirAGestion} 
                  onChange={e => setForm({...form, incluirAGestion: e.target.checked})} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700/80 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </CRMField>
          <CRMField label="Observaciones y Resultados">
            <textarea 
              className="w-full h-24 p-4 border rounded-2xl bg-[#152035] focus:bg-[#152035] outline-none"
              placeholder="Detalle los objetivos y resultados de esta actividad..."
              value={form.observaciones || ''}
              onChange={e => setForm({...form, observaciones: e.target.value})}
            />
          </CRMField>
          <div className="flex justify-end">
            <button type="submit" className="bg-[#1E3A5F] text-white hover:bg-[#1D3557] border-[#1E293B]  px-8 py-3 rounded-2xl font-bold shadow-lg hover:translate-y-[-2px] transition-all flex items-center gap-2">
              <Save className="w-4 h-4" /> {editingId ? 'ACTUALIZAR CAMBIOS' : 'REGISTRAR ACTIVIDAD'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#152035] rounded-2xl border border-[#1E293B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="p-4 bg-[#152035] border-b flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Historial de Actividades Recientes</h3>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                const data = filteredActivities.map(act => [
                  formatDate(act.fecha),
                  act.campania || '---',
                  act.tipo || '---',
                  act.responsable || '---'
                ]);
                exportTableToPDF('Reporte: Historial de Actividades Recientes (CRM)', ['Fecha', 'Campaña / Actividad', 'Tipo', 'Responsable'], data, 'actividades_recientes_crm', 'l');
              }}
              className="px-3 py-1 text-[10px] font-bold uppercase tracking-tight bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/35 rounded-xl hover:bg-[#38BDF8]/20 flex items-center gap-1 shadow-[0_0_10px_rgba(56,189,248,0.15)]"
              title="Descargar PDF"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <div className="relative">
              <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
              <input 
                placeholder="Buscar..." 
                className="pl-8 pr-2 py-1 border border-slate-700 bg-slate-800 rounded text-xs text-white outline-none"
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#152035]/50 text-left border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-4">Fecha</th>
                <th className="p-4">Campaña / Actividad</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Responsable</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredActivities.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(act => (
                <tr key={act.id} className="hover:bg-[#1E293B]/50 transition-colors">
                  <td className="p-4">{formatDate(act.fecha)}</td>
                  <td className="p-4 font-bold text-white">{act.campania}</td>
                  <td className="p-4"><span className="bg-[#152035] text-[#38BDF8] px-2 py-0.5 rounded text-[10px] font-bold">{act.tipo}</span></td>
                  <td className="p-4 text-slate-400">{act.responsable}</td>
                  <td className="p-4 text-right">
                    <RecordActions 
                      module="crm"
                      onView={() => setDetailView(act)}
                      onEdit={() => handleEdit(act)}
                      onDelete={async () => {
                         try {
                           await localDB.deleteFromCollection('crm_activities', act.id);
                           loadActivities();
                         } catch (err) {
                           console.error(err);
                           alert('Error al eliminar');
                         }
                      }}
                    />
                  </td>
                </tr>
              ))}
              {filteredActivities.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">No hay actividades registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CRMField({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
