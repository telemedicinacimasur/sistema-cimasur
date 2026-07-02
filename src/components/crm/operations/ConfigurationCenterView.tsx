import React from 'react';
import { Settings, Mail, MessageSquare, Clock, Shield, Key } from 'lucide-react';

export const ConfigurationCenterView: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Settings className="text-slate-400" size={32} />
            Centro de Configuración
          </h1>
          <p className="text-slate-400 mt-1">Gestión de conectores, credenciales y reglas operativas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ConfigCard 
          title="Conector Email" 
          description="Configuración SMTP, SendGrid, remitentes autorizados y límites de envío." 
          icon={<Mail className="text-sky-400" size={24} />} 
          status="Pendiente de Integración" 
          statusColor="text-amber-400 bg-amber-400/10 border-amber-400/20"
        />
        <ConfigCard 
          title="Conector WhatsApp" 
          description="Credenciales Meta Cloud API, Twilio, plantillas pre-aprobadas y webhooks." 
          icon={<MessageSquare className="text-emerald-400" size={24} />} 
          status="Pendiente de Integración" 
          statusColor="text-amber-400 bg-amber-400/10 border-amber-400/20"
        />
        <ConfigCard 
          title="Reglas de Automatización" 
          description="Horarios permitidos para envío (ej. 09:00 - 18:00), días hábiles y throttling." 
          icon={<Clock className="text-indigo-400" size={24} />} 
          status="Configurado" 
          statusColor="text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
        />
        <ConfigCard 
          title="Credenciales y Seguridad" 
          description="Gestión de API Keys, tokens de acceso y rotación de secretos comerciales." 
          icon={<Key className="text-red-400" size={24} />} 
          status="Activo" 
          statusColor="text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
        />
        <ConfigCard 
          title="Políticas de Contacto" 
          description="Reglas anti-spam, listas negras, y frecuencias máximas por segmento." 
          icon={<Shield className="text-slate-400" size={24} />} 
          status="Activo" 
          statusColor="text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
        />
      </div>
      
      <div className="bg-[#0D1527] border border-slate-800 rounded-2xl p-8 text-center mt-8">
        <Settings size={48} className="text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Preparado para Fase de Integración</h3>
        <p className="text-slate-400 max-w-2xl mx-auto">
          La arquitectura de adaptadores está lista. Los conectores reales (SendGrid, Meta, Twilio) se implementarán en la siguiente etapa, manteniendo aislada la inteligencia del Growth Engine.
        </p>
      </div>
    </div>
  );
};

const ConfigCard: React.FC<{ title: string, description: string, icon: React.ReactNode, status: string, statusColor: string }> = ({ title, description, icon, status, statusColor }) => (
  <div className="bg-[#0D1527] border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-all cursor-pointer group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${statusColor}`}>
        {status}
      </span>
    </div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
  </div>
);
