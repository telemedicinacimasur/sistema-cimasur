import React, { useState } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { addNotification } from '../lib/notifications';
import { useAuth } from '../contexts/AuthContext';

interface CommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  recordTitle: string;
  module: string;
  recipientRoles: string[];
  onSubmit: (comment: string) => Promise<void>;
}

export const CommentDialog: React.FC<CommentDialogProps> = ({ 
  isOpen, onClose, recordId, recordTitle, module, recipientRoles, onSubmit 
}) => {
  const [comment, setComment] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    await addNotification({
      title: `Nuevo Comentario: ${recordTitle}`,
      message: `${user?.displayName || 'Usuario'} comentó en ${module}: ${comment}`,
      recipientRoles: recipientRoles,
      sender: user?.displayName || 'Usuario'
    });
    
    await onSubmit(comment);
    setComment('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-[#152035] rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" /> Nuevo Comentario
          </h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        
        <textarea 
          className="w-full border rounded-lg p-3 text-sm h-32 mb-4"
          placeholder="Escribe tu comentario aquí..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
        />
        
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-black uppercase text-xs tracking-widest hover:bg-blue-700">
           Enviar Comentario
        </button>
      </form>
    </div>
  );
};
