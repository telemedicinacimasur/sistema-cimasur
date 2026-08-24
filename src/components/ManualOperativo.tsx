import React, { useState } from 'react';
import { 
  BookOpen, 
  Printer, 
  Search, 
  CheckCircle2, 
  Layers, 
  FlaskConical, 
  Users, 
  DollarSign, 
  GraduationCap, 
  Calendar, 
  Package, 
  ClipboardCheck, 
  AlertTriangle,
  Beaker,
  Microscope,
  Droplets,
  Table,
  Settings,
  Stethoscope,
  Info,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  HelpCircle,
  ShieldAlert,
  Server,
  Activity,
  Code,
  Check,
  Maximize2
} from 'lucide-react';
import { cn } from '../lib/utils';

// Componente para renderizar un diagrama de interfaz simulado (Mockup estático en JSX/Tailwind)
const InterfaceDiagramCard = ({ title, type }: { title: string; type: string }) => {
  return (
    <div className="my-6 border-2 border-sky-500/30 bg-[#152035]/90 rounded-2xl p-5 shadow-lg relative print:border-slate-300">
      <div className="flex items-center justify-between gap-3 mb-3 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-sky-500/20 text-[#38BDF8] rounded-xl shadow-inner">
            <Code className="w-4 h-4" />
          </span>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Simulación de Interfaz: {title}</h4>
        </div>
        <span className="px-2.5 py-1 bg-sky-600/20 text-[#38BDF8] border border-sky-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider">
          Visualizador Automático
        </span>
      </div>

      <div className="bg-[#0B132B] rounded-xl border border-[#1E293B] p-4 overflow-x-auto shadow-inner text-xs font-mono">
        {type === 'menu' && (
          <div className="space-y-2 text-slate-300">
            <div className="flex items-center justify-between bg-[#152035] p-2 rounded border border-slate-700 font-bold text-sky-400">
              <span>🖥️ Barra Lateral CIMASUR (Navigation)</span>
              <span className="text-[10px] bg-sky-950 px-2 py-0.5 rounded text-sky-300">8 Módulos Activos</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-[#111A2E] p-2 rounded border border-slate-800 text-center"><span className="text-sky-300 font-bold">/</span> <br/>Inicio</div>
              <div className="bg-[#111A2E] p-2 rounded border border-slate-800 text-center"><span className="text-sky-300 font-bold">/pizarra</span> <br/>Pizarra</div>
              <div className="bg-[#111A2E] p-2 rounded border border-slate-800 text-center"><span className="text-sky-300 font-bold">/laboratorio</span> <br/>Laboratorio</div>
              <div className="bg-[#111A2E] p-2 rounded border border-slate-800 text-center"><span className="text-sky-300 font-bold">/administración</span> <br/>Administración</div>
              <div className="bg-[#111A2E] p-2 rounded border border-slate-800 text-center"><span className="text-sky-300 font-bold">/crm</span> <br/>CRM Comercial</div>
              <div className="bg-[#111A2E] p-2 rounded border border-slate-800 text-center"><span className="text-sky-300 font-bold">/sugestión</span> <br/>Gestión 360°</div>
              <div className="bg-[#111A2E] p-2 rounded border border-slate-800 text-center"><span className="text-sky-300 font-bold">/escuela</span> <br/>Escuela</div>
              <div className="bg-[#111A2E] p-2 rounded border border-slate-800 text-center"><span className="text-sky-300 font-bold">/cpanel</span> <br/>CPANEL / Manual</div>
            </div>
          </div>
        )}

        {type === 'tabla_pedidos' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
              <span>Folio / Cotiz</span>
              <span>Cliente (CIE)</span>
              <span>Mensajería</span>
              <span>Situación</span>
            </div>
            <div className="flex items-center justify-between bg-[#152035] p-2 rounded border border-slate-800 text-[11px]">
              <span className="text-sky-400 font-bold">#COT-2026-901</span>
              <span>Dr. Roberto Soto</span>
              <span>Starken (Express)</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold">EN PREPARACIÓN</span>
            </div>
            <div className="flex items-center justify-between bg-[#111A2E] p-2 rounded border border-slate-800 text-[11px]">
              <span className="text-sky-400 font-bold">#COT-2026-902</span>
              <span>Clínica Veterinaria Sur</span>
              <span>Chilexpress</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">DESPACHO OK</span>
            </div>
          </div>
        )}

        {type === 'stock' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
              <span>Insumo / Materia Prima</span>
              <span>Área</span>
              <span>Stock Actual</span>
              <span>Estado Alerta</span>
            </div>
            <div className="flex items-center justify-between bg-[#152035] p-2 rounded border border-slate-800 text-[11px]">
              <span>Alcohol Cobre 30%</span>
              <span>Tinturas Madres</span>
              <span className="text-white font-bold">450 ml</span>
              <span className="text-emerald-400 font-bold">✓ Óptimo</span>
            </div>
            <div className="flex items-center justify-between bg-[#111A2E] p-2 rounded border border-slate-800 text-[11px]">
              <span>Vehículo Hidro-Glicerinado</span>
              <span>Laboratorio Gotas</span>
              <span className="text-amber-400 font-bold">85 ml</span>
              <span className="text-amber-400 font-bold">⚠️ Stock Mínimo</span>
            </div>
          </div>
        )}

        {type === 'crm' && (
          <div className="space-y-2">
            <div className="bg-[#152035] p-3 rounded border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-sky-400 border-b border-slate-700 pb-1">
                <span>📝 Ficha de Ingreso Cartera CIE</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded">Validador RUT Activo</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>RUT: <span className="text-white font-mono">14.567.890-K</span></div>
                <div>Nombre: <span className="text-white">María Elena Valenzuela</span></div>
                <div>Teléfono: <span className="text-white">+56 9 8765 4321</span></div>
                <div>Categoría Club: <span className="text-amber-400 font-bold">⭐ ORO (15% Desc)</span></div>
              </div>
            </div>
          </div>
        )}

        {type === 'admin' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
              <span>N° Cotización</span>
              <span>Vendedor / Responsable</span>
              <span>Total Neto ($)</span>
              <span>Enlace Lab</span>
            </div>
            <div className="flex items-center justify-between bg-[#152035] p-2 rounded border border-slate-800 text-[11px]">
              <span className="text-amber-400 font-bold">COT-8842</span>
              <span>Constanza Molina</span>
              <span className="text-white font-bold">$148.500</span>
              <span className="text-emerald-400 font-bold">🔗 Sincronizado</span>
            </div>
          </div>
        )}

        {type === 'gestion' && (
          <div className="space-y-2">
            <div className="bg-[#152035] p-3 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-purple-400">Expediente 360° - Paciente / Cliente</div>
                <div className="text-[11px] text-slate-300 mt-0.5">Historial unificado de recetas, compras y notas clínicas.</div>
              </div>
              <span className="px-2.5 py-1 bg-purple-950 text-purple-300 border border-purple-800 rounded text-[10px] font-bold">Activo</span>
            </div>
          </div>
        )}

        {type === 'escuela' && (
          <div className="space-y-2">
            <div className="bg-[#152035] p-3 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-rose-400">Escuela CIMASUR - Gestión Académica</div>
                <div className="text-[11px] text-slate-300 mt-0.5">Control de matrículas, alumnos y asistencia a diplomados.</div>
              </div>
              <span className="px-2.5 py-1 bg-rose-950 text-rose-300 border border-rose-800 rounded text-[10px] font-bold">Matrículas Abiertas</span>
            </div>
          </div>
        )}

        {type === 'pizarra' && (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-2.5 rounded text-yellow-200">
              <strong className="block text-yellow-400 mb-1">📌 Nota de Equipo #1</strong>
              Revisar stock de tinturas madres antes de las 14:00 hrs.
            </div>
            <div className="bg-sky-500/10 border border-sky-500/30 p-2.5 rounded text-sky-200">
              <strong className="block text-sky-400 mb-1">📌 Nota de Equipo #2</strong>
              Despacho Starken programado para ruta sur.
            </div>
          </div>
        )}

        {type === 'default' && (
          <div className="text-center py-3 text-slate-400 text-xs">
            📊 Visualizador interactivo de componentes y submódulos operando en tiempo real.
          </div>
        )}
      </div>
    </div>
  );
};

export default function ManualOperativo() {
  const [activeMainTab, setActiveMainTab] = useState<'manual' | 'soporte'>('manual');
  const [activeSection, setActiveSection] = useState<string>('todos');
  const [searchManual, setSearchManual] = useState<string>('');
  const [showFullModal, setShowFullModal] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden, nav, header, aside, .sidebar, button, input { display: none !important; }
          .bg-\\[\\#111A2E\\], .bg-\\[\\#152035\\] { background: white !important; color: black !important; border: none !important; box-shadow: none !important; }
          text-white, text-slate-200, text-slate-300, text-slate-400 { color: #1e293b !important; }
          .border, .border-\\[\\#1E293B\\] { border-color: #cbd5e1 !important; }
        }
      `}} />

      {/* Encabezado y Pestañas Principales */}
      <div className="bg-[#111A2E] p-6 rounded-2xl border border-[#1E293B] shadow-lg flex flex-col gap-6 print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-sky-500/20 text-[#38BDF8] rounded-xl shadow">
                <BookOpen className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">CPANEL SISTEMA - Manual de Usuario y Soporte</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Centro oficial de documentación operativa, guías de módulos y protocolos de mantenimiento técnico.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFullModal(true)}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
              title="Abrir Visor Pantalla Completa"
            >
              <Maximize2 className="w-4 h-4" />
              <span>👁️ Ver Manual PDF (Pantalla Completa)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-[#152035] hover:bg-[#1E293B] text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Imprimir documento actual"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* 2 Pestañas Principales Solicitadas */}
        <div className="flex items-center gap-3 border-t border-[#1E293B] pt-4">
          <button
            onClick={() => setActiveMainTab('manual')}
            className={cn(
              "px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow",
              activeMainTab === 'manual'
                ? "bg-[#38BDF8] text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.4)]"
                : "bg-[#152035] text-slate-300 hover:text-white border border-[#1E293B]"
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>📖 Manual Operativo de Usuario</span>
          </button>
          <button
            onClick={() => setActiveMainTab('soporte')}
            className={cn(
              "px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow",
              activeMainTab === 'soporte'
                ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                : "bg-[#152035] text-slate-300 hover:text-white border border-[#1E293B]"
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>🚨 Primeros Auxilios y Soporte Técnico</span>
          </button>
        </div>
      </div>

      {/* MODAL PANTALLA COMPLETA - SINCRONIZADO CON LA PESTAÑA ACTIVA */}
      {showFullModal && (
        <div className="fixed inset-0 bg-[#070D1D]/95 backdrop-blur-xl z-[400] flex flex-col print:hidden overflow-hidden">
          {/* Barra de Herramientas Superior del Modal */}
          <div className="bg-[#111A2E] border-b border-[#1E293B] px-6 py-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-sky-500/20 text-[#38BDF8] rounded-xl">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Visor A4 Pantalla Completa - 
                  <span className={activeMainTab === 'manual' ? 'text-sky-400' : 'text-red-400'}>
                    {activeMainTab === 'manual' ? '📖 Manual Operativo de Usuario' : '🚨 Primeros Auxilios y Soporte Técnico'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Documento formateado para lectura limpia y exportación directa a PDF.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint} 
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow"
              >
                <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
              </button>
              <button 
                onClick={() => setShowFullModal(false)} 
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700"
              >
                Cerrar Visor [X]
              </button>
            </div>
          </div>

          {/* Contenido en Hoja A4 Estilizada */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-12 bg-[#040812] flex justify-center">
            <div className="bg-white text-slate-900 w-full max-w-4xl p-8 sm:p-16 rounded-2xl shadow-2xl space-y-8 my-auto min-h-[90vh]">
              
              {/* Encabezado del Documento */}
              <div className="border-b-2 border-slate-200 pb-6 text-center space-y-2">
                <div className="inline-block bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  DOCUMENTO OFICIAL DEL SISTEMA CIMASUR
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                  {activeMainTab === 'manual' ? 'Manual Operativo de Usuario y Procedimientos' : 'Protocolo de Primeros Auxilios y Soporte Técnico'}
                </h1>
                <p className="text-xs text-slate-500">Versión 2026 • Generado desde CPANEL • Uso Estrictamente Interno</p>
              </div>

              {/* Contenido Dinámico según Pestaña */}
              {activeMainTab === 'manual' ? (
                <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-slate-800">
                  <div className="space-y-2">
                    <h2 className="text-sm font-black text-sky-900 border-b border-sky-200 pb-1 uppercase">1. Arquitectura de Módulos y Rutas</h2>
                    <p>El sistema CIMASUR distribuye sus funciones clave en las rutas principales integradas:</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li><strong>CPANEL (/cpanel)</strong>: Panel técnico, gestión de accesos, auditoría, papelera y este manual.</li>
                      <li><strong>Inicio (/)</strong>: Dashboard y accesos rápidos operativos.</li>
                      <li><strong>Pizarra (/pizarra)</strong>: Tablón adhesivo compartido de equipo.</li>
                      <li><strong>Laboratorio (/laboratorio)</strong>: 11 submódulos especializados para producción magistral y trazabilidad.</li>
                      <li><strong>Administración (/administración)</strong>: Control financiero gerencial, flujo de caja y ventas (13 submódulos).</li>
                      <li><strong>CRM Comercial (/crm)</strong>: Cartera CIE de clientes, campañas y Club Comercial.</li>
                      <li><strong>Gestión (/sugestión)</strong>: Expediente 360°, ficha unificada de clientes e interacciones.</li>
                      <li><strong>Escuela CIMASUR (/escuela)</strong>: Programas formativos, matrículas y motor académico.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-sm font-black text-sky-900 border-b border-sky-200 pb-1 uppercase">2. Módulo de Laboratorio (11 Submódulos)</h2>
                    <p>Centro neurálgico de preparación homeopática y control de calidad:</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li><strong>2.1 Seguimiento de Pedidos:</strong> Sincronizado automáticamente con el N° de Cotización del módulo de Administración.</li>
                      <li><strong>2.2 Stock de Insumo Diario:</strong> Control de materias primas con detector de duplicados y alertas de stock mínimo.</li>
                      <li><strong>2.3 Elaboración Gotas y Diluciones:</strong> Registro y trazabilidad de lotes de gotas y diluciones homeopáticas.</li>
                      <li><strong>2.4 Formulación Magistral:</strong> Registro detallado de fórmulas magistrales personalizadas por paciente y veterinario.</li>
                      <li><strong>2.5 Evaluación Gotas Puras:</strong> Control de calidad y evaluación del estado de gotas puras.</li>
                      <li><strong>2.6 Ingreso Nosodes:</strong> Recepción y registro de muestras biológicas para la elaboración de nosodes.</li>
                      <li><strong>2.7 Ficha Tinturas Madres:</strong> Control de maceración y disponibilidad de tinturas madres botánicas.</li>
                      <li><strong>2.8 Preparación Gotas Puras:</strong> Registro operativo de la dosificación de gotas puras y cálculo de lambdas.</li>
                      <li><strong>2.9 Registro de Insumos TM:</strong> Lote, proveedor, fecha de ingreso y código CIMASUR.</li>
                      <li><strong>2.10 Vademécum Técnico:</strong> Catálogo de cotizaciones, precios y prioridades técnicas.</li>
                      <li><strong>2.11 Bitácora de Mantención de Equipos:</strong> Control de balanzas y equipos por área con fechas de calibración.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-sm font-black text-sky-900 border-b border-sky-200 pb-1 uppercase">3. CRM Comercial y Club Comercial (/crm)</h2>
                    <p>Administración de relaciones con clientes, médicos veterinarios e instituciones aliadas, Cartera Única CIE con validador de RUT y beneficios del Club.</p>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-sm font-black text-sky-900 border-b border-sky-200 pb-1 uppercase">4. Módulo de Gestión (/sugestión)</h2>
                    <p>Expediente 360°, ficha unificada con historial completo de interacciones, compras y notas de clientes.</p>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-sm font-black text-sky-900 border-b border-sky-200 pb-1 uppercase">5. Administración y Finanzas (/administración)</h2>
                    <p>Sincronización directa con cotizaciones aprobadas, control de DTE, ventas online (MercadoLibre), consignaciones y flujos de caja. Incluye 13 submódulos de gestión:</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">
                      <li><strong>5.1 Dashboard Principal:</strong> Vista general de indicadores financieros y accesos ejecutivos.</li>
                      <li><strong>5.2 Cotizaciones Generales:</strong> Emisión, seguimiento y aprobación de cotizaciones.</li>
                      <li><strong>5.3 Centro de Ventas CRM:</strong> Gestión comercial de transacciones del CRM.</li>
                      <li><strong>5.4 Centro Ventas Gestión:</strong> Control de ventas y registros del módulo de gestión.</li>
                      <li><strong>5.5 Ventas Tienda y Mercado Libre:</strong> Sincronización de transacciones de e-commerce y canales externos.</li>
                      <li><strong>5.6 DTE y Documentos:</strong> Control y emisión de Documentos Tributarios Electrónicos.</li>
                      <li><strong>5.7 Pagos Veterinarios:</strong> Registro y conciliación de pagos de servicios veterinarios.</li>
                      <li><strong>5.8 Pagos Escuela:</strong> Control de matrículas, cuotas y abonos de programas académicos.</li>
                      <li><strong>5.9 Códigos y Diluciones:</strong> Parametrización de códigos y tablas de referencia de diluciones.</li>
                      <li><strong>5.10 Resumen de Ventas:</strong> Reportes consolidados por período, vendedor y canal.</li>
                      <li><strong>5.11 Presupuesto y Flujo:</strong> Control presupuestario y proyección de flujo de caja.</li>
                      <li><strong>5.12 Inventario Master:</strong> Control centralizado de stock y materias primas.</li>
                      <li><strong>5.13 Ventas en Consignación:</strong> Seguimiento y liquidación de productos entregados en consignación.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-sm font-black text-sky-900 border-b border-sky-200 pb-1 uppercase">6. Escuela CIMASUR (/escuela)</h2>
                    <p>Programas formativos, gestión de leads, matrículas de alumnos y motor académico.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 text-xs sm:text-sm leading-relaxed text-slate-800">
                  <div className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl space-y-3">
                    <h2 className="text-base font-black text-red-900 uppercase flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" /> 🚨 Protocolo Crítico de Emergencia y Soporte
                    </h2>
                    <p className="text-red-800 font-medium">
                      En caso de fallas imprevistas, errores de script o pantallas rojas, aplique de inmediato los siguientes pasos:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-red-900 font-semibold">
                      <li>Cerrar la aplicación o pestaña de inmediato para detener consultas recurrentes.</li>
                      <li>Tomar una captura de pantalla completa del error o pantalla en blanco.</li>
                      <li>Enviar la captura directamente a Gemini o AI Studio para su diagnóstico antes de cualquier intervención de código.</li>
                    </ol>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-base font-black text-slate-900 border-b pb-1 uppercase">🏗️ Arquitectura y Despliegue de Código</h2>
                    <p>El código fuente se desarrolla en AI Studio. Al realizar commit y push a GitHub, la plataforma <strong>Render</strong> ejecuta automáticamente el despliegue a producción. La persistencia se administra mediante Google Firebase Firestore.</p>
                  </div>

                  <div className="space-y-3 bg-amber-50 border border-amber-200 p-6 rounded-2xl">
                    <h2 className="text-base font-black text-amber-900 uppercase">⚠️ Control Estricto de Lecturas Firestore</h2>
                    <p className="text-amber-900">
                      Para no superar el límite gratuito de <strong>50.000 lecturas diarias</strong> en Firebase Firestore:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-amber-900 font-medium">
                      <li>Mantenga la aplicación <strong>CERRADA</strong> cuando no se esté utilizando en operaciones reales.</li>
                      <li>Verifique periódicamente el consumo en: <code className="bg-amber-100 px-2 py-0.5 rounded text-amber-950 font-mono">Firebase Console &gt; Uso y Facturación</code>.</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
                <span>CIMASUR - Sistema Integral de Gestión</span>
                <span>Página 1 de 1</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      {activeMainTab === 'manual' ? (
        <div className="space-y-6">
          {/* Barra de Búsqueda y Filtros de Navegación del Manual */}
          <div className="bg-[#152035] p-4 rounded-2xl border border-[#1E293B] flex flex-wrap gap-4 items-center justify-between print:hidden">
            <div className="flex items-center gap-2 bg-[#111A2E] px-3.5 py-2 rounded-xl border border-[#1E293B] grow max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por módulo, campo, sub-módulo o procedimiento..."
                className="bg-transparent outline-none text-xs text-white placeholder-slate-400 w-full"
                value={searchManual}
                onChange={e => setSearchManual(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'todos', label: 'Todo el Sistema' },
                { id: 'arq', label: '1. Menú & Rutas' },
                { id: 'lab', label: '2. Laboratorio (11 Submódulos)' },
                { id: 'crm', label: '3. CRM Comercial' },
                { id: 'gestion', label: '4. Gestión' },
                { id: 'admin', label: '5. Administración' },
                { id: 'escuela', label: '6. Escuela CIMASUR' },
                { id: 'pizarra', label: '7. Pizarra de Notas' }
              ].map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeSection === sec.id
                      ? "bg-[#38BDF8] text-slate-950 font-black shadow"
                      : "bg-[#111A2E] text-slate-400 hover:text-white border border-[#1E293B]"
                  )}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cuerpo del Manual con Diagramas Automáticos */}
          <div className="bg-[#111A2E] p-6 sm:p-8 rounded-2xl border border-[#1E293B] space-y-10 text-slate-200 text-sm leading-relaxed">
            
            {/* MENÚ LATERAL Y RUTAS */}
            {(activeSection === 'todos' || activeSection === 'arq') && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1E293B] pb-3">
                  <span className="p-2 bg-sky-500/20 text-[#38BDF8] rounded-lg">
                    <Layers className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">1. Estructura de Menú Lateral y Rutas del Sistema</h2>
                </div>
                <p className="text-slate-300">
                  El sistema CIMASUR cuenta con una barra de navegación lateral centralizada que distribuye las operaciones en los siguientes módulos y rutas oficiales:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#152035] text-slate-400">
                      <tr>
                        <th className="p-3 border-b border-[#1E293B]">Módulo (Ruta)</th>
                        <th className="p-3 border-b border-[#1E293B]">Propósito y Descripción</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300 divide-y divide-[#1E293B]">
                      <tr>
                        <td className="p-3 font-bold text-[#38BDF8]">Menú Principal (/)</td>
                        <td className="p-3">Portal de inicio y acceso rápido a los módulos principales de la plataforma.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#38BDF8]">Pizarra de Notas (/pizarra)</td>
                        <td className="p-3">Tablón adhesivo compartido y recordatorios de equipo en tiempo real.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#38BDF8]">Laboratorio (/laboratorio)</td>
                        <td className="p-3">Centro de operaciones con 11 submódulos especializados para producción, control y trazabilidad.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#38BDF8]">Administración (/administración)</td>
                        <td className="p-3">Gestión financiera, flujo de caja, control de ventas y tiendas online (MercadoLibre / Consignación).</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#38BDF8]">CRM Comercial (/crm)</td>
                        <td className="p-3">Cartera de clientes CIE, campañas de marketing, club comercial e importador masivo.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#38BDF8]">Gestión (/sugestión)</td>
                        <td className="p-3">Expediente 360°, ficha unificada de clientes con métricas y registro de actividades.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#38BDF8]">Escuela CIMASUR (/escuela)</td>
                        <td className="p-3">Gestión educativa, programas formativos, matrículas de alumnos y motor de actividades.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#38BDF8]">CPANEL (/cpanel)</td>
                        <td className="p-3">Panel de control técnico, gestión de accesos, auditoría, papelera y este manual operativo.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <InterfaceDiagramCard title="Estructura de Menú y Rutas" type="menu" />
              </section>
            )}

            {/* MÓDULO 1: LABORATORIO */}
            {(activeSection === 'todos' || activeSection === 'lab') && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-[#1E293B] pb-3">
                  <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                    <FlaskConical className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">2. Módulo de Laboratorio (/laboratorio - 11 Submódulos)</h2>
                </div>
                <p className="text-slate-300">
                  El módulo de Laboratorio centraliza los procesos de preparación magistral, trazabilidad de envíos y control de insumos en 11 submódulos clave:
                </p>

                <div className="space-y-6 pl-2 sm:pl-4 border-l-2 border-blue-500/30">
                  
                  {/* 1.1 */}
                  <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B]">
                    <h3 className="text-sm font-black text-white text-[#38BDF8] uppercase flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4" /> 2.1. Seguimiento de Pedidos (Sincronizado con Administración)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Propósito:</strong> Control de despachos, mensajería y trazabilidad logística de envíos.
                    </p>
                    <div className="mt-3 space-y-2 text-slate-300 text-xs">
                      <p><strong>Sincronización Automática:</strong> Los números de Folio y Cotización provienen directamente de la aprobación de cotizaciones en el Módulo de Administración. Al actualizar la situación en este submódulo, se refleja en los reportes gerenciales.</p>
                      <p><strong>Campos requeridos:</strong> N° Cotiz/Folio, Cliente, Fechas (Cotización, Envío, Recepción), Mensajería (Starken, Chilexpress, etc.), N° Seguimiento/OT, Situación (PENDIENTE, EN PREPARACIÓN, DESPACHO, ENTREGADO, ANULADO) y Observaciones.</p>
                    </div>
                    <InterfaceDiagramCard title="Seguimiento de Pedidos" type="tabla_pedidos" />
                  </div>

                  {/* 1.2 */}
                  <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B]">
                    <h3 className="text-sm font-black text-white text-emerald-400 uppercase flex items-center gap-2">
                      <Package className="w-4 h-4" /> 2.2. Stock de Insumo Diario
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Propósito:</strong> Control diario de inventarios y existencias de materias primas.
                    </p>
                    <div className="mt-3 space-y-2 text-slate-300 text-xs">
                      <p><strong>Campos requeridos:</strong> Ítem/Insumo, Área, Cantidad (Stock real actual), Stock Mínimo (Alerta de reposición).</p>
                      <p><strong>Herramientas integradas:</strong> Botón de "Detectar Duplicados" para limpieza de registros y alertas visuales automáticas cuando el stock desciende del límite.</p>
                    </div>
                    <InterfaceDiagramCard title="Stock de Insumo Diario" type="stock" />
                  </div>

                  {/* 1.3 */}
                  <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B]">
                    <h3 className="text-sm font-black text-white text-violet-400 uppercase flex items-center gap-2">
                      <FlaskConical className="w-4 h-4" /> 2.3. Elaboración Gotas y Diluciones
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Propósito:</strong> Registro y trazabilidad de lotes de gotas y diluciones homeopáticas.
                    </p>
                    <div className="mt-3 space-y-2 text-slate-300 text-xs">
                      <p><strong>Campos requeridos:</strong> Fecha, N° CIMASUR, Producto, Tipo, Responsable y Estado (En Proceso, Aprobado, En Control).</p>
                    </div>
                    <InterfaceDiagramCard title="Elaboración Gotas y Diluciones" type="default" />
                  </div>

                  {/* 1.4 */}
                  <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B]">
                    <h3 className="text-sm font-black text-white text-orange-400 uppercase flex items-center gap-2">
                      <Beaker className="w-4 h-4" /> 2.4. Formulación Magistral
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Propósito:</strong> Registro detallado de fórmulas magistrales personalizadas por paciente.
                    </p>
                    <div className="mt-3 space-y-2 text-slate-300 text-xs">
                      <p><strong>Campos requeridos:</strong> Médico Veterinario tratante, Cotización (vinculada a Administración), Componentes/Ingredientes (diluciones CH), N° asignado para recetas recurrentes, Vehículo/Base y Volumen total.</p>
                    </div>
                    <InterfaceDiagramCard title="Formulación Magistral" type="default" />
                  </div>

                  {/* 1.5 */}
                  <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B]">
                    <h3 className="text-sm font-black text-white text-pink-400 uppercase flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> 2.5. Evaluación Gotas Puras
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Propósito:</strong> Control de calidad y evaluación del estado de gotas puras.
                    </p>
                    <div className="mt-3 space-y-2 text-slate-300 text-xs">
                      <p><strong>Campos requeridos:</strong> Fecha, Producto, Estado (Pendiente, OK, Mínimo, Bajo, Medio, Óptimo, Elaborado), Estado Final (PENDIENTE, OK) y Observaciones (se marca OK con fecha de elaboración).</p>
                    </div>
                    <InterfaceDiagramCard title="Evaluación Gotas Puras" type="default" />
                  </div>

                  {/* 1.6 */}
                  <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B]">
                    <h3 className="text-sm font-black text-white text-teal-400 uppercase flex items-center gap-2">
                      <Microscope className="w-4 h-4" /> 2.6. Ingreso Nosodes
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Propósito:</strong> Recepción y registro de muestras biológicas para la elaboración de nosodes.
                    </p>
                    <div className="mt-3 space-y-2 text-slate-300 text-xs">
                      <p><strong>Campos requeridos:</strong> Fecha Ficha, N° Ficha/Muestra, N° Clasificación/Potencia, Paciente, Médico y Ubicación en Refrigerador.</p>
                    </div>
                    <InterfaceDiagramCard title="Ingreso Nosodes" type="default" />
                  </div>

                  {/* 1.7 */}
                  <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B]">
                    <h3 className="text-sm font-black text-white text-cyan-400 uppercase flex items-center gap-2">
                      <Droplets className="w-4 h-4" /> 2.7. Ficha Tinturas Madres
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Propósito:</strong> Control de maceración y disponibilidad de tinturas madres botánicas.
                    </p>
                    <div className="mt-3 space-y-2 text-slate-300 text-xs">
                      <p><strong>Campos requeridos:</strong> Fecha, Insumo/Planta, N° Asignado (Lote), Proporción, Elaborador/Responsable y Estado (En Maceración, Filtrado, Disponible).</p>
                    </div>
                    <InterfaceDiagramCard title="Ficha Tinturas Madres" type="default" />
                  </div>

                  {/* 1.8 */}
                  <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B]">
                    <h3 className="text-sm font-black text-white text-indigo-400 uppercase flex items-center gap-2">
                      <Layers className="w-4 h-4" /> 2.8. Preparación Gotas Puras
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Propósito:</strong> Registro operativo de la dosificación de gotas puras.
                    </p>
                    <div className="mt-3 space-y-2 text-slate-300 text-xs">
                      <p><strong>Campos requeridos:</strong> Fecha, Producto, Preparador, Composición/Terapia, Lambdas totales y Observaciones.</p>
                    </div>
                    <InterfaceDiagramCard title="Preparación Gotas Puras" type="default" />
                  </div>

                  {/* 1.9 */}
                  <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B]">
                    <h3 className="text-sm font-black text-white text-rose-400 uppercase flex items-center gap-2">
                      <Table className="w-4 h-4" /> 2.9. Registro de Insumos TM, Vademécum y Mantención
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      <strong>Propósito:</strong> Gestión integrada de insumos de tinturas madres, vademécum técnico y mantenimiento de equipos.
                    </p>
                    <div className="mt-3 space-y-3 text-slate-300 text-xs">
                      <div>
                        <strong className="text-white">Insumos TM:</strong> Lote, Proveedor, Fecha Ingreso y Código Cimasur.
                      </div>
                      <div>
                        <strong className="text-white">Vademécum Técnico:</strong> Cotizaciones asociadas, Proveedor, Valor ($), Prioridad y Estado.
                      </div>
                      <div>
                        <strong className="text-white">Mantención de Equipos:</strong> Código por área (ej. BAL-001), Equipo, Marca, Modelo, Área, Responsable y Fechas de control.
                      </div>
                    </div>
                    <InterfaceDiagramCard title="Insumos TM, Vademécum y Mantención" type="default" />
                  </div>

                </div>
              </section>
            )}

            {/* MÓDULO 2: CRM COMERCIAL */}
            {(activeSection === 'todos' || activeSection === 'crm') && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1E293B] pb-3">
                  <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <Users className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">3. Módulo CRM Comercial (/crm)</h2>
                </div>
                <p className="text-slate-300">
                  Administración de relaciones con clientes, médicos veterinarios e instituciones aliadas.
                </p>
                <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B] space-y-3 text-xs text-slate-300">
                  <p><strong>Cartera Única CIE:</strong> Formulario de inscripción completo con validación anti-duplicados por RUT, Nombre, Teléfono, Email, Región/Comuna, Dirección, Tipo de Cliente y Categoría Club (Bronce, Plata, Oro, Platino).</p>
                  <p><strong>Campañas & Club Comercial:</strong> Gestión de programas de fidelización, descuentos por categoría y registro de campañas internas de difusión.</p>
                </div>
                <InterfaceDiagramCard title="CRM Comercial (Cartera CIE)" type="crm" />
              </section>
            )}

            {/* MÓDULO 3: GESTIÓN */}
            {(activeSection === 'todos' || activeSection === 'gestion') && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1E293B] pb-3">
                  <span className="p-2 bg-purple-500/25 text-purple-400 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">4. Módulo de Gestión (/sugestión)</h2>
                </div>
                <p className="text-slate-300">
                  Centro analítico y expediente integral para la trazabilidad de clientes y pacientes.
                </p>
                <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B] space-y-3 text-xs text-slate-300">
                  <p><strong>Expediente 360°:</strong> Ficha unificada que consolida el historial completo de interacciones, compras, notas y estado de cuenta del cliente.</p>
                  <p><strong>Herramientas Operativas:</strong> Ingreso rápido de clientes, listado general de gestión, registro de nuevas actividades, simulador de beneficios del Club CIMASUR y exportación en PDF del expediente clínico/comercial.</p>
                </div>
                <InterfaceDiagramCard title="Módulo de Gestión (Expediente 360°)" type="gestion" />
              </section>
            )}

            {/* MÓDULO 4: ADMINISTRACIÓN */}
            {(activeSection === 'todos' || activeSection === 'admin') && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1E293B] pb-3">
                  <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">5. Módulo de Administración (/administración)</h2>
                </div>
                <p className="text-slate-300">
                  Control financiero gerencial y sincronización directa con el área de Laboratorio.
                </p>
                <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B] space-y-3 text-xs text-slate-300">
                  <p className="text-[#38BDF8] font-bold">🔗 Sincronización con Laboratorio: El número de Cotización/Folio generado en Administración se vincula automáticamente al submódulo 2.1 de Seguimiento de Pedidos en Laboratorio.</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li><strong>Seguimiento de Cotizaciones:</strong> N° de Cotización, Cliente, Monto, Vendedor y Estado de aprobación.</li>
                    <li><strong>Detalle de Ventas:</strong> Control de Facturas/Boletas, Neto, IVA y Total facturado.</li>
                    <li><strong>Resumen Frascos y Pesos:</strong> Métricas de producción y volúmenes comercializados.</li>
                    <li><strong>Detalle DTE & Ventas Gestión:</strong> Reportes tributarios y transacciones consolidadas.</li>
                    <li><strong>Ventas Tienda y MercadoLibre:</strong> Control de canales de comercio electrónico.</li>
                    <li><strong>Control de Pagos Veterinarios:</strong> Gestión de pagos por tutores y mascotas.</li>
                    <li><strong>Saldos Escuela CIMASUR:</strong> Control de pagos y matrículas educativas.</li>
                    <li><strong>Matriz de Presupuesto y Flujo:</strong> Proyecciones financieras y caja.</li>
                    <li><strong>Ventas en Consignación:</strong> Auditoría de stock entregado a terceros.</li>
                  </ul>
                </div>
                <InterfaceDiagramCard title="Módulo de Administración" type="admin" />
              </section>
            )}

            {/* MÓDULO 5: ESCUELA CIMASUR */}
            {(activeSection === 'todos' || activeSection === 'escuela') && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1E293B] pb-3">
                  <span className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                    <GraduationCap className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">6. Módulo Escuela CIMASUR (/escuela)</h2>
                </div>
                <p className="text-slate-300">
                  Gestión académica, programas formativos y seguimiento de estudiantes.
                </p>
                <div className="bg-[#152035] p-5 rounded-xl border border-[#1E293B] space-y-3 text-xs text-slate-300">
                  <p><strong>Captación (Leads):</strong> Registro y seguimiento de interesados en cursos y diplomados.</p>
                  <p><strong>Alumnos & Matrículas:</strong> Gestión de inscripciones y estados académicos.</p>
                  <p><strong>Vista 360° del Estudiante:</strong> Historial de cursos cursados, notas y asistencias.</p>
                  <p><strong>Motor Escuela & Actividades:</strong> Programación de clases, docentes asignados y material didáctico.</p>
                </div>
                <InterfaceDiagramCard title="Escuela CIMASUR" type="escuela" />
              </section>
            )}

            {/* MÓDULO 6: PIZARRA DE NOTAS */}
            {(activeSection === 'todos' || activeSection === 'pizarra') && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1E293B] pb-3">
                  <span className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">7. Pizarra de Notas (/pizarra)</h2>
                </div>
                <p className="text-slate-300">
                  Tablón adhesivo digital compartido para notas rápidas, avisos y recordatorios operativos entre los miembros del equipo.
                </p>
                <InterfaceDiagramCard title="Pizarra de Notas" type="pizarra" />
              </section>
            )}

          </div>
        </div>
      ) : (
        /* PESTAÑA 2: PRIMEROS AUXILIOS Y SOPORTE TÉCNICO */
        <div className="space-y-6">
          <div className="bg-[#111A2E] p-6 sm:p-8 rounded-2xl border border-red-500/40 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
            
            <div className="flex items-center gap-3 border-b border-[#1E293B] pb-4">
              <span className="p-2.5 bg-red-500/20 text-red-400 rounded-xl shadow">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </span>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Protocolo de Primeros Auxilios y Soporte Técnico Interno</h2>
                <p className="text-xs text-slate-400 mt-0.5">Instrucciones críticas de arquitectura, control de costos en Firebase y resolución de incidentes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              
              {/* Tarjeta 1: Arquitectura y Despliegue */}
              <div className="bg-[#152035] p-6 rounded-2xl border border-[#1E293B] shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-3 mb-3">
                  <span className="p-2 bg-sky-500/20 text-[#38BDF8] rounded-xl">
                    <Server className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-bold text-white uppercase tracking-wide">🏗️ 1. Arquitectura y Despliegue</h3>
                </div>
                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs sm:text-sm">
                  <li>La estructura y código fuente proviene directamente del entorno de desarrollo <strong>AI Studio</strong>.</li>
                  <li>El flujo oficial de actualización consiste en hacer commit y <strong>Push a GitHub</strong>, tras lo cual <strong>Render</strong> ejecuta de manera automática el Deploy para reflejar los cambios en producción.</li>
                  <li>La base de datos persistente y motor de autenticación utilizado es <strong>Google Firebase Firestore</strong>.</li>
                </ul>
              </div>

              {/* Tarjeta 2: Control Estricto de Lecturas Firestore */}
              <div className="bg-[#152035] p-6 rounded-2xl border border-amber-500/40 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[10px] px-3 py-1 uppercase tracking-widest rounded-bl-xl">USO GRATUITO</div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Activity className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-bold text-white uppercase tracking-wide">⚠️ 2. Control Estricto de Lecturas Firestore</h3>
                </div>
                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs sm:text-sm">
                  <li>Es obligatorio mantener la aplicación <strong>CERRADA</strong> y abrirla <strong>ÚNICAMENTE</strong> durante su uso operativo real para evitar consumo innecesario de cuota.</li>
                  <li>Monitorear de forma continua el límite de lecturas gratuitas (máximo <strong>50.000 lecturas diarias</strong>) en la ruta de la plataforma oficial: <br/>
                    <code className="bg-[#111A2E] text-amber-300 px-2 py-1 rounded font-mono text-xs mt-1 inline-block border border-amber-500/30">
                      Firebase Console &gt; Configuración &gt; Uso y Facturación &gt; Lecturas
                    </code>
                  </li>
                </ul>
              </div>

              {/* Tarjeta 3: Protocolo ante Errores */}
              <div className="bg-[#152035] p-6 rounded-2xl border border-red-500/40 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-red-500 text-white font-black text-[10px] px-3 py-1 uppercase tracking-widest rounded-bl-xl">URGENTE</div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="p-2 bg-red-500/20 text-red-400 rounded-xl">
                    <HelpCircle className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-bold text-white uppercase tracking-wide">🆘 3. Soporte y Resolución de Errores (Primeros Auxilios)</h3>
                </div>
                <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs sm:text-sm">
                  <li>Ante cualquier error inesperado de sistema o pantalla roja, <strong>CERRAR INMEDIATAMENTE LA APLICACIÓN</strong> para prevenir bucles de consulta a la base de datos.</li>
                  <li>Consultar directamente en el Chat de AI Studio o a Gemini adjuntando <strong>SIEMPRE</strong> capturas de pantalla completas del error exacto.</li>
                  <li><strong>No solicitar modificaciones adicionales de código</strong> sin antes consultar la causa raíz con la IA para evitar alteraciones en la estabilidad del sistema.</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
