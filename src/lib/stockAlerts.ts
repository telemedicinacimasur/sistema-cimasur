import { localDB } from './auth';
import { addNotification } from './notifications';

const hasRecentNotification = async (title: string, message: string): Promise<boolean> => {
    const notifications = await localDB.getCollection('notifications');
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return notifications.some((n: any) => 
        n.title === title && 
        n.message === message && 
        new Date(n.createdAt) > oneDayAgo
    );
};

export const checkStockAlerts = async (inventory: any[]) => {
  const alerts = [
    { name: 'Salina', min: 9 },
    { name: 'Etanol', min: 9 },
    { name: 'Estuches', min: 250 },
    { name: 'Plantillas', min: 20 },
    { name: 'Insumo Varios', min: 2 },
  ];

  for (const alert of alerts) {
    const item = inventory.find(i => i.item?.toLowerCase().includes(alert.name.toLowerCase()));
    if (item && item.stock < alert.min) {
        const title = 'Alerta de Stock Bajo';
        const message = `El insumo ${item.item} tiene un stock crítico de ${item.stock}. Mínimo requerido: ${alert.min}.`;
        
        if (!(await hasRecentNotification(title, message))) {
            await addNotification({
                title,
                message,
                recipientRoles: ['admin', 'lab'],
                sender: 'Sistema de Inventario'
            });
        }
    }
  }

  // Handle Frascos 30ml specifically
  const frascos = inventory.find(i => i.item?.toLowerCase().includes('frascos') && i.item?.toLowerCase().includes('30ml'));
  if (frascos && frascos.stock < 2500) {
      const title = 'Alerta de Stock Bajo';
      const message = `Los frascos de 30ml tienen un stock crítico de ${frascos.stock}. Mínimo requerido: 2500.`;
      
      if (!(await hasRecentNotification(title, message))) {
        await addNotification({
            title,
            message,
            recipientRoles: ['admin', 'lab'],
            sender: 'Sistema de Inventario'
        });
      }
  }
};

export const checkPendingOrderAlerts = async () => {
    const orders = await localDB.getCollection('order_tracking');
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    
    for (const order of orders) {
        if ((order.estado === 'Pendiente' || order.estado === 'En Tránsito') && new Date(order.fecha) < sixDaysAgo) {
            const title = 'Alerta de Revisión Logística';
            const message = `El pedido de ${order.cliente} lleva más de 6 días en estado ${order.estado}.`;

            if (!(await hasRecentNotification(title, message))) {
                await addNotification({
                    title,
                    message,
                    recipientRoles: ['admin', 'lab'],
                    sender: 'Sistema de Logística'
                });
            }
        }
    }
};
