import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '../lib/utils';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Actually our scroll might be in the main tag in MainLayout. 
    // Usually we listen on window, but let's just listen on the scrolling div if we can, 
    // or add it to MainLayout to make it universal.
    
    // For now we'll listen on window, and assume body scrolls or MainLayout scrolls.
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollTop = target.scrollTop || window.scrollY;
      setIsVisible(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const scrollToTop = () => {
    // Scroll window and any main scroll container
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainArea = document.querySelector('main > div.overflow-auto');
    if (mainArea) {
      mainArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button 
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-6 right-6 p-4 bg-[#38BDF8] text-black rounded-full shadow-2xl hover:scale-110 transition-all z-50 flex items-center justify-center",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
      title="Volver Arriba"
    >
       <ArrowUp className="w-6 h-6 font-bold" />
    </button>
  );
}
