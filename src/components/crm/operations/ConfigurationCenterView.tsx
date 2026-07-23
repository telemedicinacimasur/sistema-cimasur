import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Mail, 
  MessageSquare, 
  Clock, 
  Shield, 
  Key, 
  CheckCircle, 
  Sliders, 
  Edit2, 
  Plus, 
  Trash2, 
  Save,
  Loader2,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { UATConsole } from './UATConsole';

interface ConfigurationCenterViewProps {
  onViewClient?: (id: string) => void;
}

interface Tier {
  id: string;
  name: string;
  minAnnualSales: number;
  maxAnnualSales: number;
  benefits: string[];
  discountPercent: number;
  condition: string;
  validityMonths: number;
  nextLevel: string;
}

interface ClubConfig {
  evaluationCycle: {
    type: string;
    startMonth: number;
    startDay: number;
    firstCycleBaseYear: number;
    description: string;
  };
  tiers: Tier[];
}

export const ConfigurationCenterView: React.FC<ConfigurationCenterViewProps> = ({ onViewClient }) => {
  const [activeSubTab, setActiveSubTab] = useState<'uat' | 'config'>('uat');
  const [config, setConfig] = useState<ClubConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cargar configuración desde la API al activar la pestaña
  useEffect(() => {
    if (activeSubTab === 'config') {
      loadClubConfig();
    }
  }, [activeSubTab]);

  const loadClubConfig = async () => {
    setLoadingConfig(true);
    try {
      const response = await fetch('/api/loyalty/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        if (data.tiers && data.tiers.length > 0) {
          setSelectedTierId(data.tiers[0].id);
        }
      }
    } catch (e) {
      console.error('Error cargando configuración del club:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    setSaveSuccess(false);
    try {
      const response = await fetch('/api/loyalty/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        setSaveSuccess(true);
        // Despachar evento global para que todos los componentes actualicen sus cálculos en tiempo real
        window.dispatchEvent(new CustomEvent('db-change', { detail: { collection: 'loyalty_config' } }));
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert('Error al guardar la configuración comercial.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red al guardar la configuración.');
    } finally {
      setSavingConfig(false);
    }
  };

  const updateTierField = (tierId: string, field: keyof Tier, value: any) => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tiers: prev.tiers.map(t => t.id === tierId ? { ...t, [field]: value } : t)
      };
    });
  };

  const addBenefit = (tierId: string) => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tiers: prev.tiers.map(t => t.id === tierId ? { ...t, benefits: [...t.benefits, 'Nuevo beneficio de marketing'] } : t)
      };
    });
  };

  const updateBenefitText = (tierId: string, index: number, text: string) => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tiers: prev.tiers.map(t => {
          if (t.id === tierId) {
            const updatedBenefits = [...t.benefits];
            updatedBenefits[index] = text;
            return { ...t, benefits: updatedBenefits };
          }
          return t;
        })
      };
    });
  };

  const removeBenefit = (tierId: string, index: number) => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tiers: prev.tiers.map(t => {
          if (t.id === tierId) {
            return { ...t, benefits: t.benefits.filter((_, i) => i !== index) };
          }
          return t;
        })
      };
    });
  };

  const activeTier = config?.tiers.find(t => t.id === selectedTierId) || null;

  return (
    <div id="configuration-center-view" className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Top section with navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Settings className="text-slate-400" size={32} />
            Centro de Configuración y Calidad
          </h1>
          <p className="text-slate-400 mt-1">Gestión de conectores, reglas operativas y validaciones de sistema</p>
        </div>

        {/* Sub-tabs selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveSubTab('uat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs tracking-wider transition-all ${
              activeSubTab === 'uat'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle size={14} />
            Suite de Validación UAT
          </button>
          <button
            onClick={() => setActiveSubTab('config')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs tracking-wider transition-all ${
              activeSubTab === 'config'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders size={14} />
            Conectores y Parámetros
          </button>
        </div>
      </div>

      {activeSubTab === 'uat' ? (
        <UATConsole onViewClient={onViewClient} />
      ) : (
        <div className="space-y-8">
          {/* Conectores Rápidos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ConfigCard 
              title="Conector Email" 
              description="Configuración SMTP, SendGrid, remitentes autorizados y límites de envío." 
              icon={<Mail className="text-sky-400" size={24} />} 
              status="Pendiente de Integración" 
              statusColor="text-amber-400 bg-amber-400/10 border-amber-400/20"
            />
            <ConfigCard 
              title="Importación Manual Masiva" 
              description="Carga masiva de rangos de categorías y beneficios desde archivo externo." 
              icon={<FileSpreadsheet className="text-emerald-400" size={24} />} 
              status="Disponible" 
              statusColor="text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
            />
            <ConfigCard 
              title="Políticas de Automatización" 
              description="Horarios permitidos para envío (ej. 09:00 - 18:00), días hábiles y throttling." 
              icon={<Clock className="text-indigo-400" size={24} />} 
              status="Configurado" 
              statusColor="text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
            />
          </div>

          {/* Calibración del Motor Comercial */}
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Sliders size={20} className="text-indigo-400" />
                  Calibración de Parámetros del Club Comercial
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Defina las reglas de negocio, umbrales de promedio mensual, descuentos y beneficios. Sin recompilar.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-emerald-400 text-xs font-bold animate-pulse">
                    ¡Configuración guardada y recalculada con éxito!
                  </span>
                )}
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig || loadingConfig || !config}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all uppercase tracking-wider"
                >
                  {savingConfig ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Guardar Parámetros
                    </>
                  )}
                </button>
              </div>
            </div>

            {loadingConfig ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <span className="text-sm">Cargando parámetros de la base de datos...</span>
              </div>
            ) : !config ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No se pudo cargar la configuración comercial. Verifique la conexión con el servidor.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Selector de Categorías (Tiers) */}
                <div className="lg:col-span-4 space-y-3">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider block mb-2">
                    Categorías de Socios
                  </span>
                  {config.tiers.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTierId(t.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                        selectedTierId === t.id
                          ? 'bg-indigo-600/10 border-indigo-500 text-white'
                          : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-sm">{t.name}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {t.condition}
                        </div>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 bg-slate-900 border border-slate-800 text-indigo-400 rounded-lg">
                        {t.discountPercent}% Dcto
                      </span>
                    </button>
                  ))}

                  {/* Ciclo de Evaluación Info */}
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl mt-6">
                    <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5 mb-2">
                      <HelpCircle size={14} />
                      Reglamento Oficial y Ciclo Activo
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                      {config.evaluationCycle.description}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-850/50 text-[10px] font-mono text-slate-400">
                      <div>Año Base: {config.evaluationCycle.firstCycleBaseYear}</div>
                      <div>Mes Inicio: {config.evaluationCycle.startMonth}</div>
                    </div>
                  </div>
                </div>

                {/* Editor de Parámetros de la Categoría Seleccionada */}
                <div className="lg:col-span-8 bg-slate-950/40 border border-slate-850 rounded-2xl p-6 space-y-6">
                  {activeTier ? (
                    <>
                      <div className="border-b border-slate-800 pb-4">
                        <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                          <Edit2 size={18} className="text-indigo-400" />
                          Configuración de {activeTier.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Modifique las condiciones y el catálogo de beneficios del segmento
                        </p>
                      </div>

                      {/* Parámetros Básicos */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                            Porcentaje Descuento (%)
                          </label>
                          <input
                            type="number"
                            value={activeTier.discountPercent}
                            onChange={(e) => updateTierField(activeTier.id, 'discountPercent', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                            VENTAS ANUALES MÍNIMAS (CLP/AÑO)
                          </label>
                          <input
                            type="number"
                            value={activeTier.minAnnualSales}
                            onChange={(e) => updateTierField(activeTier.id, 'minAnnualSales', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                            VENTAS ANUALES MÁXIMAS (CLP/AÑO)
                          </label>
                          <input
                            type="number"
                            value={activeTier.maxAnnualSales}
                            onChange={(e) => updateTierField(activeTier.id, 'maxAnnualSales', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                            CONDICIÓN COMERCIAL DE ACCESO (MANUAL)
                          </label>
                          <input
                            type="text"
                            value={activeTier.condition}
                            onChange={(e) => updateTierField(activeTier.id, 'condition', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                            Siguiente Nivel / Upgrade
                          </label>
                          <input
                            type="text"
                            value={activeTier.nextLevel}
                            onChange={(e) => updateTierField(activeTier.id, 'nextLevel', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                            Vigencia del Estatus (Meses)
                          </label>
                          <input
                            type="number"
                            value={activeTier.validityMonths}
                            onChange={(e) => updateTierField(activeTier.id, 'validityMonths', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                          Condición Narrativa de Calificación
                        </label>
                        <input
                          type="text"
                          value={activeTier.condition}
                          onChange={(e) => updateTierField(activeTier.id, 'condition', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs"
                        />
                      </div>

                      {/* Beneficios Dinámicos */}
                      <div className="space-y-3 pt-4 border-t border-slate-800">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Beneficios y Derechos del Socio (Marketing)
                          </span>
                          <button
                            type="button"
                            onClick={() => addBenefit(activeTier.id)}
                            className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            <Plus size={12} />
                            Añadir Beneficio
                          </button>
                        </div>

                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2">
                          {activeTier.benefits.map((benefit, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={benefit}
                                onChange={(e) => updateBenefitText(activeTier.id, index, e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-750 focus:border-slate-600 rounded-lg p-2 text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={() => removeBenefit(activeTier.id, index)}
                                className="text-slate-500 hover:text-red-400 p-2 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                          {activeTier.benefits.length === 0 && (
                            <div className="text-slate-500 text-xs py-3 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                              No hay beneficios configurados para esta categoría.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500 text-sm text-center py-20">
                      Seleccione una categoría a la izquierda para ver y editar sus beneficios.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0D1527] border border-slate-800 rounded-2xl p-8 text-center">
            <Settings size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Preparado para Fase de Integración</h3>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm">
              La arquitectura de adaptadores está lista. Los conectores reales (SendGrid, Meta, Twilio) se implementarán en la siguiente etapa, manteniendo aislada la inteligencia del Growth Engine.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfigCard: React.FC<{ title: string, description: string, icon: React.ReactNode, status: string, statusColor: string }> = ({ title, description, icon, status, statusColor }) => (
  <div className="bg-[#0D1527] border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all cursor-pointer group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${statusColor}`}>
        {status}
      </span>
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
  </div>
);
