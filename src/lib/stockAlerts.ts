import { localDB } from './auth';
import { addNotification } from './notifications';

const sentThisSession = new Set<string>();

const hasRecentNotification = async (title: string, message: string): Promise<boolean> => {
    const cacheKey = `${title}:${message}`;
    if (sentThisSession.has(cacheKey)) {
        return true;
    }

    const notifications = await localDB.getCollection('notifications');
    if (!Array.isArray(notifications)) return false;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const matched = notifications.some((n: any) => {
        if (!n) return false;
        if (n.title !== title || n.message !== message) return false;
        if (!n.createdAt) return false;
        
        let dateVal: Date;
        if (typeof n.createdAt.toDate === 'function') {
            dateVal = n.createdAt.toDate();
        } else {
            dateVal = new Date(n.createdAt);
        }
        return dateVal.getTime() > 0 && dateVal >= todayStart;
    });

    if (matched) {
        sentThisSession.add(cacheKey);
    }
    return matched;
};

let isCheckingStock = false;
export const checkStockAlerts = async (inventory: any[], force?: boolean) => {
  if (isCheckingStock) return;
  if (!inventory || inventory.length === 0) return;
  
  if (typeof window !== 'undefined' && !force) {
    if (window.localStorage.getItem('all_stock_alerts_muted') === 'true') {
      return;
    }
    const now = Date.now();
    const lastCheck = Number(window.localStorage.getItem('cimasur_last_stock_check_time') || 0);
    // Limit to at most once every 4 hours (14400000 ms) in background
    if (now - lastCheck < 14400000) {
      return;
    }
    window.localStorage.setItem('cimasur_last_stock_check_time', String(now));
  }

  isCheckingStock = true;
  try {
    for (const item of inventory) {
      if (!item || !item.item) continue;
      if (item.alertaDesactivada === true) continue;

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
          sentThisSession.add(`${title}:${message}`);
          await addNotification({
            title,
            message,
            recipientRoles: ['admin', 'lab', 'manager'],
            sender: 'Sistema de Inventario'
          });
        }
      }
    }
  } catch (err) {
    console.error("Error checking stock alerts:", err);
  } finally {
    isCheckingStock = false;
  }
};

let isCheckingOrders = false;
export const checkPendingOrderAlerts = async (force?: boolean) => {
    if (isCheckingOrders) return;
    
    if (typeof window !== 'undefined' && !force) {
        const now = Date.now();
        const lastCheck = Number(window.localStorage.getItem('cimasur_last_pending_orders_check_time') || 0);
        // Limit to at most once every 12 hours (43200000 ms) in background
        if (now - lastCheck < 43200000) {
            return;
        }
        window.localStorage.setItem('cimasur_last_pending_orders_check_time', String(now));
    }

    isCheckingOrders = true;

    try {
        let orders = await localDB.getCollection('order_tracking');
        if (!Array.isArray(orders)) orders = [];

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const activeOrders = [];

        // Automatic trimestral cleanup (delete records older than 3 months)
        for (const order of orders) {
            if (!order) continue;
            const dateStr = order.fechaEnvio || order.fechaCotiz || order.fecha;
            if (dateStr) {
                const orderDate = new Date(dateStr);
                if (orderDate.getTime() > 0 && orderDate < threeMonthsAgo) {
                    // Deleted automatically!
                    try {
                        await localDB.deleteFromCollection('order_tracking', order.id);
                        
                        const title = 'Eliminado Automático (Historial de Pedidos)';
                        const message = `El seguimiento del pedido N° ${order.nroCotiz || 'S/N'} de ${order.cliente || 'Sin Cliente'} fue eliminado automáticamente del sistema al superar el plazo de conservación de 3 meses.`;
                        
                        if (!(await hasRecentNotification(title, message))) {
                            sentThisSession.add(`${title}:${message}`);
                            await addNotification({
                                title,
                                message,
                                recipientRoles: ['admin', 'lab', 'manager'],
                                sender: 'Sistema de Limpieza Trimestral'
                            });
                        }
                    } catch (e) {
                        console.error("Error performing auto-cleanup delete for tracking order:", e);
                    }
                    continue; // Skip appending as active
                }
            }
            activeOrders.push(order);
        }

        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        
        for (const order of activeOrders) {
            const orderStatus = (order.situacion || '').toUpperCase();
            if (orderStatus === 'PENDIENTE' || orderStatus === 'EN TRÁNSITO') {
                const dateStr = order.fechaEnvio || order.fechaCotiz || order.fecha;
                if (dateStr) {
                    const orderDate = new Date(dateStr);
                    if (orderDate.getTime() > 0 && orderDate < tenDaysAgo) {
                        const title = 'Alerta de Revisión seguimiento de pedidos';
                        const message = `El pedido N° ${order.nroCotiz || 'S/N'} de ${order.cliente || 'Sin Cliente'} lleva más de 10 días en estado ${order.situacion}.`;

                        if (!(await hasRecentNotification(title, message))) {
                            sentThisSession.add(`${title}:${message}`);
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
    } catch (err) {
        console.error("Error in checkPendingOrderAlerts:", err);
    } finally {
        isCheckingOrders = false;
    }
};
