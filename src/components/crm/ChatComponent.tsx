import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';

export const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
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
        body: JSON.stringify({ message: userMsg, history: messages })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Error al conectar con IA.' }]);
    } finally {
      setLoading(false);
    }
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
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-slate-500 text-sm">IA escribiendo...</div>}
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
