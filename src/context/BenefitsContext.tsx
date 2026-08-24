import React, { createContext, useState, useContext, useEffect } from 'react';
import { CATEGORY_BENEFITS } from '../lib/crmLogic';
import { safeLocalStorageGet, safeLocalStorageSet } from '../lib/safeStorage';

type BenefitsContextType = {
  benefits: Record<string, string>;
  updateBenefit: (category: string, description: string) => void;
};

const BenefitsContext = createContext<BenefitsContextType | undefined>(undefined);

export const BenefitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [benefits, setBenefits] = useState<Record<string, string>>(() => {
    const saved = safeLocalStorageGet('category_benefits');
    return saved ? JSON.parse(saved) : CATEGORY_BENEFITS;
  });

  useEffect(() => {
    safeLocalStorageSet('category_benefits', JSON.stringify(benefits));
  }, [benefits]);

  const updateBenefit = (category: string, description: string) => {
    setBenefits(prev => ({ ...prev, [category]: description }));
  };

  return (
    <BenefitsContext.Provider value={{ benefits, updateBenefit }}>
      {children}
    </BenefitsContext.Provider>
  );
};

export const useBenefits = () => {
  const context = useContext(BenefitsContext);
  if (!context) throw new Error('useBenefits must be used within a BenefitsProvider');
  return context;
};
