import { Download } from 'lucide-react';

export const DataBackup = () => {
  const downloadBackup = async () => {
    try {
      const res = await fetch('/api/system-backup');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_cimasur_${new Date().toISOString()}.json`;
      a.click();
    } catch (e) {
      console.error('Error al descargar backup:', e);
      alert('Error al descargar el respaldo');
    }
  };
  
  return (
    <button 
      onClick={downloadBackup} 
      className="fixed bottom-4 right-4 opacity-10 hover:opacity-100 transition-opacity p-2 bg-slate-800 text-white rounded-full shadow-lg"
      title="Respaldar Base de Datos"
    >
      <Download className="w-4 h-4" />
    </button>
  );
};
