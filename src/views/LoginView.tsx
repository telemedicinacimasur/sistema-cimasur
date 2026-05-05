import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginView() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen bg-[#001736] flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md w-full flex flex-col items-center text-center">
        <div className="flex flex-col items-center justify-center mb-6 w-full relative">
          <div className="w-20 h-20 bg-gradient-to-br from-[#1FA2D6] to-[#002b5b] rounded-full flex items-center justify-center mb-3 shadow-lg border-4 border-slate-100">
            <span className="text-white font-serif text-4xl font-black italic">C</span>
          </div>
          <div className="text-[#002b5b] font-serif text-4xl tracking-widest z-10 font-black uppercase">
            Cimasur
          </div>
        </div>
        <p className="text-slate-500 text-sm mb-8 leading-tight">Acceso Privado - Gestión Homeopática</p>
        
        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="text-left">
            <label className="text-[10px] font-bold uppercase text-slate-400">Usuario / Email</label>
            <input 
              type="text" 
              className="w-full border-b border-slate-200 p-2 text-sm outline-none focus:border-blue-500"
              placeholder="admin@cimasur.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="text-left">
            <label className="text-[10px] font-bold uppercase text-slate-400">Contraseña</label>
            <input 
              type="password" 
              className="w-full border-b border-slate-200 p-2 text-sm outline-none focus:border-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded">{error}</p>}

          <button 
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-[#001736] text-white py-3 px-6 rounded-lg font-bold hover:bg-[#1e40af] transition-all shadow-lg active:scale-95"
          >
            <span>INGRESAR AL SISTEMA</span>
          </button>
        </form>

        
        <div className="mt-8 pt-6 border-t border-slate-100 w-full italic text-[10px] text-slate-400 uppercase tracking-widest">
           SISTEMA CIMASUR v4.5.1
        </div>
      </div>
    </div>
  );
}
