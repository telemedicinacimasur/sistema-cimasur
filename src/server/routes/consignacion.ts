import { Router } from 'express';
import { getDbPool } from '../db';

const router = Router();

// Initialization / Migration endpoint (Can be called on startup)
router.post('/init', async (req, res) => {
  const pool = getDbPool();
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Creating a table for prices/discounts
      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_consignacion_precios (
            id SERIAL PRIMARY KEY,
            cliente_id VARCHAR(255) NOT NULL,
            producto_id VARCHAR(255) NOT NULL,
            precio_neto INT NOT NULL,
            UNIQUE(cliente_id, producto_id)
        );
      `);

      // We use VARCHAR for cliente_id and producto_id to integrate with the localDB UUIDs.
      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_consignacion_lotes (
            id SERIAL PRIMARY KEY,
            cliente_id VARCHAR(255) NOT NULL,
            producto_id VARCHAR(255) NOT NULL,
            fecha_entrega DATE NOT NULL,
            fecha_vencimiento DATE NOT NULL,
            unidades_iniciales INT NOT NULL CHECK (unidades_iniciales > 0),
            precio_unit_neto INT NOT NULL,
            total_venta_original INT NOT NULL,
            activo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS crm_consignacion_movimientos (
            id SERIAL PRIMARY KEY,
            lote_id INT NOT NULL REFERENCES crm_consignacion_lotes(id) ON DELETE CASCADE,
            periodo_id VARCHAR(7) NOT NULL,
            unidades_vendidas INT NOT NULL CHECK (unidades_vendidas >= 0),
            saldo_anterior INT NOT NULL,
            saldo_resultante INT NOT NULL,
            monto_venta_neto INT NOT NULL,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(lote_id, periodo_id)
        );
      `);
      
      await client.query('COMMIT');
      res.json({ success: true, message: 'Tablas de consignación inicializadas correctamente.' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error init consignacion db:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener plantilla de precios de un cliente
router.get('/precios/:cliente_id', async (req, res) => {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      'SELECT producto_id, precio_neto FROM crm_consignacion_precios WHERE cliente_id = $1',
      [req.params.cliente_id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Guardar precio en plantilla
router.post('/precios', async (req, res) => {
  const { cliente_id, producto_id, precio_neto } = req.body;
  try {
    const pool = getDbPool();
    await pool.query(
      `INSERT INTO crm_consignacion_precios (cliente_id, producto_id, precio_neto) 
       VALUES ($1, $2, $3)
       ON CONFLICT (cliente_id, producto_id) 
       DO UPDATE SET precio_neto = EXCLUDED.precio_neto`,
      [cliente_id, producto_id, precio_neto]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 1. Nueva Entrega (Creación de Lote)
router.post('/lotes', async (req, res) => {
  const { cliente_id, producto_id, fecha_entrega, fecha_vencimiento, unidades_iniciales } = req.body;
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Buscar precio neto
      const priceRes = await client.query(
        'SELECT precio_neto FROM crm_consignacion_precios WHERE cliente_id = $1 AND producto_id = $2',
        [cliente_id, producto_id]
      );
      
      if (priceRes.rows.length === 0) {
        throw new Error('Precio neto no configurado para este cliente y producto.');
      }
      
      const precio_unit_neto = priceRes.rows[0].precio_neto;
      const total_venta_original = unidades_iniciales * precio_unit_neto;
      
      const insertRes = await client.query(
        `INSERT INTO crm_consignacion_lotes 
         (cliente_id, producto_id, fecha_entrega, fecha_vencimiento, unidades_iniciales, precio_unit_neto, total_venta_original)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [cliente_id, producto_id, fecha_entrega, fecha_vencimiento, unidades_iniciales, precio_unit_neto, total_venta_original]
      );
      
      await client.query('COMMIT');
      res.json({ success: true, lote_id: insertRes.rows[0].id });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener lotes activos de un cliente
router.get('/lotes/activos/:cliente_id', async (req, res) => {
  try {
    const pool = getDbPool();
    const result = await pool.query(
      `SELECT * FROM crm_consignacion_lotes 
       WHERE cliente_id = $1 AND activo = TRUE
       ORDER BY fecha_vencimiento ASC`,
      [req.params.cliente_id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Declaración de Ventas Mensuales (Registro de Movimiento en Batch)
router.post('/movimientos/batch', async (req, res) => {
  const { movimientos, periodo_id } = req.body;
  // movimientos is array of { lote_id, unidades_vendidas }
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const mov of movimientos) {
        const { lote_id, unidades_vendidas } = mov;
        
        if (unidades_vendidas === 0) continue;
        
        // Lock row
        const loteRes = await client.query(
          'SELECT unidades_iniciales, precio_unit_neto, activo FROM crm_consignacion_lotes WHERE id = $1 FOR UPDATE',
          [lote_id]
        );
        
        if (loteRes.rows.length === 0) throw new Error(`Lote ${lote_id} no existe`);
        const lote = loteRes.rows[0];
        
        if (!lote.activo) throw new Error(`Lote ${lote_id} ya no está activo`);
        
        // Buscar último movimiento para saldo_anterior
        const lastMovRes = await client.query(
          'SELECT saldo_resultante FROM crm_consignacion_movimientos WHERE lote_id = $1 ORDER BY id DESC LIMIT 1',
          [lote_id]
        );
        
        const saldo_anterior = lastMovRes.rows.length > 0 ? lastMovRes.rows[0].saldo_resultante : lote.unidades_iniciales;
        const saldo_resultante = saldo_anterior - unidades_vendidas;
        
        if (saldo_resultante < 0) {
          throw new Error(`Venta supera el saldo disponible para el lote ${lote_id}`);
        }
        
        const monto_venta_neto = unidades_vendidas * lote.precio_unit_neto;
        
        await client.query(
          `INSERT INTO crm_consignacion_movimientos 
           (lote_id, periodo_id, unidades_vendidas, saldo_anterior, saldo_resultante, monto_venta_neto)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [lote_id, periodo_id, unidades_vendidas, saldo_anterior, saldo_resultante, monto_venta_neto]
        );
        
        // Desactivar si saldo = 0
        if (saldo_resultante === 0) {
          await client.query('UPDATE crm_consignacion_lotes SET activo = FALSE WHERE id = $1', [lote_id]);
        }
      }
      
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Alertas Predictivas de Quiebre
router.get('/alertas/:cliente_id/:producto_id', async (req, res) => {
  try {
    const pool = getDbPool();
    const { cliente_id, producto_id } = req.params;
    
    // 1. Obtener saldo remanente total de lotes activos
    const saldoRes = await pool.query(
      `SELECT SUM(l.unidades_iniciales - COALESCE(
          (SELECT SUM(unidades_vendidas) FROM crm_consignacion_movimientos m WHERE m.lote_id = l.id), 0
       )) as saldo_total
       FROM crm_consignacion_lotes l
       WHERE l.cliente_id = $1 AND l.producto_id = $2 AND l.activo = TRUE`,
      [cliente_id, producto_id]
    );
    
    const saldoTotal = parseInt(saldoRes.rows[0].saldo_total || '0');
    
    // 2. Obtener ventas mensuales últimos 3 meses
    const ventasRes = await pool.query(
      `SELECT SUM(m.unidades_vendidas) as total_vendido
       FROM crm_consignacion_movimientos m
       JOIN crm_consignacion_lotes l ON m.lote_id = l.id
       WHERE l.cliente_id = $1 AND l.producto_id = $2
       AND m.fecha_registro >= NOW() - INTERVAL '3 months'`,
      [cliente_id, producto_id]
    );
    
    const ventas3Meses = parseInt(ventasRes.rows[0].total_vendido || '0');
    const promedioMensual = ventas3Meses / 3;
    const umbral = promedioMensual * 1.5;
    
    res.json({
      saldoTotal,
      promedioMensual,
      alertaQuiebre: saldoTotal < umbral
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
