import React, { createContext, useContext, useState, ReactNode } from 'react';

type ModalContextType = {
  alert: (message: string) => Promise<void>;
  confirm: (message: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string) => Promise<string | null>;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<{
    type: 'alert' | 'confirm' | 'prompt' | null;
    message: string;
    defaultValue?: string;
    resolve: (value: any) => void;
  }>({
    type: null,
    message: '',
    resolve: () => {},
  });
  const [promptValue, setPromptValue] = useState('');

  const showAlert = (message: string) => {
    return new Promise<void>((resolve) => {
      setModalState({ type: 'alert', message, resolve: () => resolve() });
    });
  };

  const showConfirm = (message: string) => {
    return new Promise<boolean>((resolve) => {
      setModalState({ type: 'confirm', message, resolve });
    });
  };

  const showPrompt = (message: string, defaultValue = '') => {
    setPromptValue(defaultValue);
    return new Promise<string | null>((resolve) => {
      setModalState({ type: 'prompt', message, defaultValue, resolve });
    });
  };

  const handleClose = (value: any) => {
    modalState.resolve(value);
    setModalState({ type: null, message: '', resolve: () => {} });
  };

  return (
    <ModalContext.Provider value={{ alert: showAlert, confirm: showConfirm, prompt: showPrompt }}>
      {children}
      {modalState.type && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-[#001736] mb-4">{modalState.message}</h3>
            
            {modalState.type === 'prompt' && (
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded p-2 mb-4 outline-none focus:border-[#002b5b]"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClose(promptValue);
                  if (e.key === 'Escape') handleClose(null);
                }}
              />
            )}

            <div className="flex justify-end gap-3 mt-6">
              {(modalState.type === 'confirm' || modalState.type === 'prompt') && (
                <button 
                  onClick={() => handleClose(modalState.type === 'prompt' ? null : false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={() => handleClose(modalState.type === 'prompt' ? promptValue : true)}
                className="px-4 py-2 bg-[#001736] text-white rounded shadow hover:bg-[#0E8CB8] font-bold text-sm transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export const useModals = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModals must be used within ModalProvider');
  return context;
};
