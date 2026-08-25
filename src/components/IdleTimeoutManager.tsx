import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { clearAllListeners } from '../lib/listenerRegistry';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const IdleTimeoutManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (!user || isTimedOut) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      handleTimeout();
    }, IDLE_TIMEOUT_MS);
  };

  const handleTimeout = async () => {
    setIsTimedOut(true);
    // 1. Desconexión de listeners en tiempo real de Firestore (unsubscribe)
    clearAllListeners();
    // 2. Cerrar sesión automáticamente
    try {
      await logout();
    } catch (e) {
      console.warn("Error al cerrar sesión por inactividad:", e);
    }
  };

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, isTimedOut]);

  if (isTimedOut) {
    return (
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-300">
        <div className="bg-[#152035] border border-[#1E293B] p-8 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-6 text-white">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
            🔒
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-black tracking-tight uppercase">Sesión Expirada por Inactividad</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tu sesión ha expirado por inactividad para proteger los recursos del sistema y optimizar el consumo de lecturas en Firebase Firestore.
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = '/login';
            }}
            className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            Iniciar Sesión Nuevamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
