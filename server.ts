import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check early
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'CIMASUR Backend Active' });
  });

  console.log('Iniciando servidor CIMASUR...');

  // --- PERSISTENCE IN FIRESTORE ---
  let db: admin.firestore.Firestore | null = null;
  const DATA_DIR = path.join(__dirname, 'data');
  import('fs/promises').then(fs => fs.mkdir(DATA_DIR, { recursive: true }));

  async function getDB(): Promise<admin.firestore.Firestore | null> {
    if (!db) {
      try {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (serviceAccountString) {
          if (admin.apps.length === 0) {
            const serviceAccount = JSON.parse(serviceAccountString);
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount)
            });
          }
          db = admin.firestore();
        } else {
          console.warn('FIREBASE_SERVICE_ACCOUNT_JSON no configurada, usando modo local.');
          return null;
        }
      } catch (e) {
        console.error('Firebase no pudo inicializar, usando almacenamiento local:', e);
        return null;
      }
    }
    return db;
  }

  async function readRecords(col: string) {
    const firestore = await getDB();
    if (firestore) {
      try {
        const doc = await firestore.collection('collections').doc(col).get();
        if (doc.exists) return doc.data()?.data || [];
      } catch (error) {
        console.error(`Error leyendo colección ${col} desde Firebase:`, error);
      }
    }
    
    // Fallback local
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(path.join(DATA_DIR, `${col}.json`), 'utf-8');
      return JSON.parse(data);
    } catch { return []; }
  }
  
  async function writeRecords(col: string, data: any[]) {
    const firestore = await getDB();
    if (firestore) {
      try {
        await firestore.collection('collections').doc(col).set({ data }, { merge: true });
      } catch (error) {
        console.error(`Error escribiendo colección ${col} en Firebase:`, error);
      }
    }
    
    // Guardado local (siempre)
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(path.join(DATA_DIR, `${col}.json`), JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Error escribiendo respaldo local:', e);
    }
  }

  // --- SEED ADMIN ---
  (async () => {
    const users = await readRecords('users');
    if (users.length === 0) {
        await writeRecords('users', [{
            uid: 'admin-001',
            email: 'admin@cimasur.cl',
            displayName: 'Administrador Cimasur',
            photoURL: '',
            role: 'admin',
            pass: 'admin123'
        }]);
        console.log('Usuario admin creado por defecto.');
    }
  })();

  // --- API ROUTES ---
  app.use('/api', (req, res, next) => {
    console.log(`API Request: ${req.method} ${req.url}`);
    next();
  });

  // Gestión de Usuarios (Auth)
  app.post('/api/auth/login', async (req, res) => {
    console.log('API call: POST /api/auth/login');
    const { email, pass } = req.body;
    const users = await readRecords('users');
    const user = users.find(u => u.email === email && u.pass === pass);
    if (user) {
      const { pass: _, ...userWithoutPass } = user;
      res.json(userWithoutPass);
    } else {
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
  });

  app.get('/api/users', async (req, res) => {
    console.log('API call: GET /api/users');
    res.json(await readRecords('users'));
  });

  app.post('/api/users', async (req, res) => {
    console.log('API call: POST /api/users');
    const users = await readRecords('users');
    users.push(req.body);
    await writeRecords('users', users);
    res.json({ success: true });
  });

  app.put('/api/users/:id', async (req, res) => {
    console.log('API call: PUT /api/users/:id');
    const { id } = req.params;
    let users = await readRecords('users');
    const idx = users.findIndex(u => u.uid === id || u.email === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...req.body };
      await writeRecords('users', users);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    console.log('API call: DELETE /api/users/:id');
    const { id } = req.params;
    let users = await readRecords('users');
    users = users.filter(u => u.uid !== id && u.email !== id);
    await writeRecords('users', users);
    res.json({ success: true });
  });

  // Gestión de Registros
  app.get('/api/records/:collection', async (req, res) => {
    console.log('API call: GET /api/records/:collection');
    res.json(await readRecords(req.params.collection));
  });

  app.post('/api/records/:collection', async (req, res) => {
    console.log('API call: POST /api/records/:collection');
    const { collection } = req.params;
    const record = req.body;
    const records = await readRecords(collection);
    
    // Check if updating
    const idx = records.findIndex(r => r.id === record.id);
    if (idx !== -1) {
       records[idx] = record;
    } else {
       records.push(record);
    }
    
    await writeRecords(collection, records);
    res.json({ success: true, id: record.id });
  });

  app.put('/api/records/:collection/:id', async (req, res) => {
    console.log('API call: PUT /api/records/:collection/:id');
    const { collection, id } = req.params;
    const records = await readRecords(collection);
    const idx = records.findIndex(r => r.id === id);
    if (idx !== -1) {
      records[idx] = { ...records[idx], ...req.body };
      await writeRecords(collection, records);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Registro no encontrado' });
    }
  });

  app.delete('/api/records/:collection/:id', async (req, res) => {
    console.log('API call: DELETE /api/records/:collection/:id');
    const { collection, id } = req.params;
    let records = await readRecords(collection);
    records = records.filter(r => r.id !== id);
    await writeRecords(collection, records);
    res.json({ success: true });
  });

  // Backup Completo
  app.get('/api/system-backup', async (req, res) => {
    res.json({ message: 'Backup system needs update' });
  });

  // Integración con Vite para Desarrollo
  if (process.env.NODE_ENV !== 'production') {
    console.log('Iniciando middleware de Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor CIMASUR ejecutándose en http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Error fatal al iniciar el servidor:', err);
});

