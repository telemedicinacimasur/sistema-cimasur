import { localDB } from './auth';
import { addNotification } from './notifications';

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
        await addNotification({
            title: 'Alerta de Stock Bajo',
            message: `El insumo ${item.item} tiene un stock crítico de ${item.stock}. Mínimo requerido: ${alert.min}.`,
            recipientRoles: ['admin', 'lab'],
            sender: 'Sistema de Inventario'
        });
    }
  }

  // Handle Frascos 30ml specifically
  const frascos = inventory.find(i => i.item?.toLowerCase().includes('frascos') && i.item?.toLowerCase().includes('30ml'));
  if (frascos && frascos.stock < 2500) {
      await addNotification({
          title: 'Alerta de Stock Bajo',
          message: `Los frascos de 30ml tienen un stock crítico de ${frascos.stock}. Mínimo requerido: 2500.`,
          recipientRoles: ['admin', 'lab'],
          sender: 'Sistema de Inventario'
      });
  }
};

export const checkPendingOrderAlerts = async () => {
    const orders = await localDB.getCollection('order_tracking');
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    
    for (const order of orders) {
        if ((order.estado === 'Pendiente' || order.estado === 'En Tránsito') && new Date(order.fecha) < sixDaysAgo) {
            await addNotification({
                title: 'Alerta de Revisión Logística',
                message: `El pedido de ${order.cliente} lleva más de 6 días en estado ${order.estado}.`,
                recipientRoles: ['admin', 'lab'],
                sender: 'Sistema de Logística'
            });
        }
    }
};
