import React, { useMemo } from 'react';
import { AlertTriangle, UserPlus, Zap, Eye, Users, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CommercialDashboardProps {
  dashboardData: any;
  onViewClient?: (id: string) => void;
  onDesignInEditor?: (clientData: any, reason: string) => void;
}

export const CommercialDashboard: React.FC<CommercialDashboardProps> = ({ 
  dashboardData, 
  onViewClient,
  onDesignInEditor
}) => {
  const opportunities: any[] = useMemo(() => dashboardData?.opportunities || [], [dashboardData]);
  const metrics = dashboardData?.metrics;

  // Derived Alerts
  const alerts = {
    leadsIntranet: metrics?.journeyCounts?.['Sin Compra'] || 0,
    upgradeCandidates: (metrics?.nearUpgradeCounts?.bronce || 0) + 
                      (metrics?.nearUpgradeCounts?.plata || 0) + 
                      (metrics?.nearUpgradeCounts?.oro || 0),
    inactiveAlerts: metrics?.dormantCounts?.total || 0,
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
    </div>
  );
};
