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
  for (const item of inventory) {
    if (!item || !item.item) continue;

    // Determine the threshold for this item:
    let minThreshold = 5; // general fallback

    // Check if the item has a custom alert threshold
    if (item.alertaStock !== undefined && item.alertaStock !== null && item.alertaStock !== '') {
      minThreshold = Number(item.alertaStock);
    } else {
      // Use fallback defaults based on name matching
      const nameLower = item.item.toLowerCase();
      if (nameLower.includes('salina')) {
        minThreshold = 9;
      } else if (nameLower.includes('etanol')) {
        minThreshold = 9;
      } else if (nameLower.includes('estuches')) {
        minThreshold = 250;
      } else if (nameLower.includes('plantillas')) {
        minThreshold = 20;
      } else if (nameLower.includes('insumo varios') || nameLower.includes('insumos varios')) {
        minThreshold = 2;
      } else if (nameLower.includes('frascos') && nameLower.includes('30ml')) {
        minThreshold = 2500;
      }
    }

    const itemQty = typeof item.qty !== 'undefined' ? item.qty : item.stock;
    if (typeof itemQty !== 'undefined' && itemQty <= minThreshold) {
      const title = 'Alerta de Stock Bajo';
      const message = `El insumo ${item.item} tiene un stock crítico de ${itemQty}. Mínimo requerido: ${minThreshold}.`;

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
