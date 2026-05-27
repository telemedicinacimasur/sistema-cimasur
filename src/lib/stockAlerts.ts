import { localDB } from './auth';
import { addNotification } from './notifications';

const hasRecentNotification = async (title: string, message: string): Promise<boolean> => {
    const notifications = await localDB.getCollection('notifications');
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return notifications.some((n: any) => {
        if (n.title !== title || n.message !== message) return false;
        if (!n.createdAt) return false;
        
        let dateVal: Date;
        if (typeof n.createdAt.toDate === 'function') {
            dateVal = n.createdAt.toDate();
        } else {
            dateVal = new Date(n.createdAt);
        }
        return dateVal.getTime() > 0 && dateVal > oneDayAgo;
    });
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
    if (item) {
        const itemQty = typeof item.qty !== 'undefined' ? item.qty : item.stock;
        if (typeof itemQty !== 'undefined' && itemQty < alert.min) {
            const title = 'Alerta de Stock Bajo';
            const message = `El insumo ${item.item} tiene un stock crítico de ${itemQty}. Mínimo requerido: ${alert.min}.`;
            
            if (!(await hasRecentNotification(title, message))) {
                await addNotification({
                    title,
                    message,
                    recipientRoles: ['admin', 'lab', 'manager'],
                    sender: 'Sistema de Inventario'
                });
            }
        }
    }
  }

  // Handle Frascos 30ml specifically
  const frascos = inventory.find(i => i.item?.toLowerCase().includes('frascos') && i.item?.toLowerCase().includes('30ml'));
  if (frascos) {
      const frascosQty = typeof frascos.qty !== 'undefined' ? frascos.qty : frascos.stock;
      if (typeof frascosQty !== 'undefined' && frascosQty < 2500) {
          const title = 'Alerta de Stock Bajo';
          const message = `Los frascos de 30ml tienen un stock crítico de ${frascosQty}. Mínimo requerido: 2500.`;
          
          if (!(await hasRecentNotification(title, message))) {
            await addNotification({
                title,
                message,
                recipientRoles: ['admin', 'lab', 'manager'],
                sender: 'Sistema de Inventario'
            });
          }
      }
  }
};

export const checkPendingOrderAlerts = async () => {
    const orders = await localDB.getCollection('order_tracking');
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    for (const order of orders) {
        const orderStatus = (order.situacion || '').toUpperCase();
        if (orderStatus === 'PENDIENTE' || orderStatus === 'EN TRÁNSITO') {
            const dateStr = order.fechaEnvio || order.fechaCotiz || order.fecha;
            if (dateStr) {
                const orderDate = new Date(dateStr);
                if (orderDate.getTime() > 0 && orderDate < tenDaysAgo) {
                    const title = 'Alerta de Revisión seguimiento de pedidos';
                    const message = `El pedido N° ${order.nroCotiz || 'S/N'} de ${order.cliente || 'Sin Cliente'} lleva más de 10 días en estado ${order.situacion}.`;

                    if (!(await hasRecentNotification(title, message))) {
                        await addNotification({
                            title,
                            message,
                            recipientRoles: ['admin', 'lab', 'manager'],
                            sender: 'Sistema de Logística'
                        });
                    }
                }
            }
        }
    }
};
