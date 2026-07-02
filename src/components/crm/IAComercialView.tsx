import React from 'react';
import { Bot } from 'lucide-react';
import { ChatComponent } from './ChatComponent';

export const IAComercialView: React.FC<{ dashboardData: any }> = ({ dashboardData }) => (
  <div className="p-8 space-y-6 h-full flex flex-col">
    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bot className="text-sky-400" /> IA Comercial - Asistente</h2>
    <div className="flex-1">
      <ChatComponent contextData={dashboardData} />
    </div>
  </div>
);
