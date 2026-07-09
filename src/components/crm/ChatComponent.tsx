import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';

export const ChatComponent: React.FC<{ 
  contextData?: any; 
  onNavigateToEditor?: (text: string) => void;
}> = ({ contextData, onNavigateToEditor }) => {
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string; actions?: { label: string; type: string; payload: any }[] }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages, context: contextData })
      });
      const data = await response.json();
      try {
        const parsedReply = JSON.parse(data.reply);
        setMessages(prev => [...prev, { sender: 'ai', text: parsedReply.text, actions: parsedReply.actions }]);
      } catch (e) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Error al conectar con IA.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVeterinarios = () => {
    setMessages(prev => [...prev, { sender: 'user', text: '🩺 Seleccionar Veterinarios' }]);
    setLoading(true);
    
    setTimeout(() => {
      const text = `¡Excelente! He analizado los veterinarios registrados en la plataforma Intranet que cumplen con los requisitos comerciales para el Club de Socios CIMASUR (2026).

He seleccionado a los veterinarios aprobados para ofrecerles un cupón de inducción y acceso a capacitaciones del nivel **Bronce**.

Aquí tienes el modelo de plantilla sugerida:

*Asunto: Invitación Especial al Club de Socios CIMASUR - Veterinario Premium*

Estimado/a Doctor/a,

Le contactamos del Club de Socios CIMASUR. Queremos felicitarle por su labor veterinaria y, con base en su registro de Intranet, habilitarle un **5% de descuento fijo** en su primera compra de fórmulas homeopáticas magistrales, además de soporte prioritario vía WhatsApp.

Puede presionar el botón de abajo para cargar esta propuesta directamente en nuestro Editor Visual y personalizarla a su gusto.`;
      
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text, 
        actions: [
          {
            label: '🎨 Diseñar en Editor de Campañas',
            type: 'navigate',
            payload: { text }
          }
        ]
      }]);
      setLoading(false);
    }, 700);
  };

  return (
    <div className="flex flex-col h-full bg-[#0D1527] rounded-2xl border border-[#1E293B] overflow-hidden">
      <div className="p-4 border-b border-[#1E293B] font-bold text-white flex items-center gap-2">
        <Bot className="text-sky-400" /> Asistente IA CIMASUR
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg text-sm ${m.sender === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
              <div className="whitespace-pre-line">{m.text}</div>
              {m.actions && m.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {m.actions.map((action, ai) => (
                    <button 
                      key={ai} 
                      onClick={() => {
                        if (action.type === 'navigate' && onNavigateToEditor) {
                          onNavigateToEditor(action.payload?.text || '');
                        }
                      }}
                      className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-black px-3 py-1.5 rounded-lg border border-sky-400/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-slate-500 text-sm">IA escribiendo...</div>}
      </div>
      <div className="px-4 py-2 bg-slate-900/40 border-t border-[#1E293B] flex flex-wrap gap-2">
        <button 
          onClick={handleSelectVeterinarios}
          className="bg-[#1E3A5F] hover:bg-[#254C7C] text-sky-400 border border-sky-500/20 text-xs font-black px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          🩺 Seleccionar Veterinarios
        </button>
      </div>
      <div className="p-4 border-t border-[#1E293B] flex gap-2">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
          placeholder="Pregunta a la IA..."
        />
        <button onClick={sendMessage} className="bg-sky-500 p-2 rounded-lg text-white">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
