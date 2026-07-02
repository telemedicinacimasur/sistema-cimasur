import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import dns from 'dns';

// CRM Backend Imports
import { IntegrationService } from './src/services/crm/IntegrationService';
import { GrowthEngine } from './src/services/crm/GrowthEngine';
import { LoyaltyEngineService } from './src/services/crm/LoyaltyEngineService';
import { CatalogService } from './src/services/crm/CatalogService';
import { RedemptionService } from './src/services/crm/RedemptionService';

import { ServerAutomation } from './src/services/automation/ServerAutomation';
// Force IPv4 resolution for environments without proper IPv6 routing
dns.setDefaultResultOrder('ipv4first');

let computedFilename = '';
try {
  computedFilename = fileURLToPath(import.meta.url);
} catch (e) {
  // CommonJS fallback
}

let computedDirname = '';
try {
  computedDirname = computedFilename ? path.dirname(computedFilename) : process.cwd();
} catch (e) {
  // CommonJS fallback
}

// Global fallback if not defined by the imports
const __filename = computedFilename || (typeof (globalThis as any).__filename !== 'undefined' ? (globalThis as any).__filename : '');
const __dirname = computedDirname || (typeof (globalThis as any).__dirname !== 'undefined' ? (globalThis as any).__dirname : process.cwd());

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check early
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'CIMASUR Backend Active' });
  });

  // API route for batch email sending via SMTP
  app.post("/api/mail/send-batch", async (req, res) => {
    const { config, emails } = req.body;
    
    if (!config || !emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: "Configuración o destinatarios inválidos." });
    }

    try {
      const isResend = config.smtpServer && (config.smtpServer.toLowerCase().includes('resend') || config.smtpPass.startsWith('re_'));
      const isSendGrid = config.smtpServer && (config.smtpServer.toLowerCase().includes('sendgrid') || config.smtpPass.startsWith('SG.'));

      // Resend API Bypass (Port 443 HTTPS - Never blocked by Render)
      if (isResend) {
        console.log(`[SMTP Bypass] Sending via Resend API (Host: ${config.smtpServer})`);
        const apiKey = config.smtpPass;
        const results = [];
        
        for (const item of emails) {
          try {
            const response = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: `"${config.nombre}" <${config.smtpUser}>`,
                to: [item.to],
                subject: item.subject,
                text: item.text,
                html: item.html || undefined,
              })
            });

            const data = await response.json() as any;
            if (response.ok && data.id) {
              results.push({ email: item.to, status: 'success' });
            } else {
              throw new Error(data?.message || JSON.stringify(data));
            }
          } catch (err: any) {
            console.error(`Error sending via Resend API to ${item.to}:`, err);
            results.push({ email: item.to, status: 'error', error: err.message });
          }
        }
        return res.json({ results });
      }

      // SendGrid API Bypass (Port 443 HTTPS - Never blocked by Render)
      if (isSendGrid) {
        console.log(`[SMTP Bypass] Sending via SendGrid API (Host: ${config.smtpServer})`);
        const apiKey = config.smtpPass;
        const results = [];
        
        for (const item of emails) {
          try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                personalizations: [{ to: [{ email: item.to }] }],
                from: { email: config.smtpUser, name: config.nombre },
                subject: item.subject,
                content: [
                  { type: 'text/plain', value: item.text },
                  { type: 'text/html', value: item.html || item.text }
                ]
              })
            });

            if (response.ok) {
              results.push({ email: item.to, status: 'success' });
            } else {
              const errData = await response.json() as any;
              throw new Error(errData?.errors?.[0]?.message || JSON.stringify(errData));
            }
          } catch (err: any) {
            console.error(`Error sending via SendGrid API to ${item.to}:`, err);
            results.push({ email: item.to, status: 'error', error: err.message });
          }
        }
        return res.json({ results });
      }

      const portInt = parseInt(config.smtpPort, 10);
      
      // Resolve IPv4 manually to bypass IPv6 ENETUNREACH errors in sandboxes/Render
      let ipv4Address = config.smtpServer;
      try {
        const { address } = await dns.promises.lookup(config.smtpServer, { family: 4 });
        ipv4Address = address;
        console.log(`[SMTP] Resolved ${config.smtpServer} to IPv4: ${ipv4Address}`);
      } catch (dnsErr: any) {
        console.warn(`[SMTP] DNS lookup failed for ${config.smtpServer}:`, dnsErr);
      }

      const transporter = nodemailer.createTransport({
        host: ipv4Address,
        port: portInt,
        secure: portInt === 465,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
        tls: { 
          rejectUnauthorized: false,
          servername: config.smtpServer, // Important for SNI verification when using IP address as host
        },
      } as any);

      // Verify connection configuration
      await transporter.verify();

      const results = [];
      for (const item of emails) {
        try {
          await transporter.sendMail({
            from: `"${config.nombre}" <${config.smtpUser}>`,
            to: item.to,
            subject: item.subject,
            text: item.text,
            html: item.html || undefined,
          });
          results.push({ email: item.to, status: 'success' });
        } catch (err: any) {
          console.error(`Error sending to ${item.to}:`, err);
          results.push({ email: item.to, status: 'error', error: err.message });
        }
      }

      res.json({ results });
    } catch (error: any) {
      console.error("SMTP Configuration Error:", error);
      res.status(500).json({ error: `Fallo en la conexión SMTP: ${error.message}` });
    }
  });

  console.log('Iniciando servidor CIMASUR...');

// Tool Definitions
const crmTools: FunctionDeclaration[] = [
  {
    name: "get_inactive_clients",
    description: "Gets a list of clients who have not purchased in the last 90 days.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "create_campaign",
    description: "Creates a new marketing campaign for a category of clients.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: "The category of clients (e.g., 'Oro', 'Plata')." },
        name: { type: Type.STRING, description: "Name of the campaign." }
      },
      required: ["category", "name"]
    }
  }
];

  app.post('/api/ai/chat', async (req, res) => {
    console.log('API call: POST /api/ai/chat');
    try {
      const { message, history, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Falta configurar la GEMINI_API_KEY en el servidor de CIMASUR." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const contents = history.map((h: any) => ({
        role: h.sender === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }));
      contents.push({
        role: 'user',
        parts: [{ text: `Datos de contexto estructurado del CRM (Growth Engine):\n${JSON.stringify(context)}\n\nMensaje del usuario: ${message}\n\nIMPORTANT: Respond with JSON format: { text: "your conversational response", actions: [{ label: "Button Label", type: "whatsapp" | "email" | "campaign" | "view_client", payload: "some_data" }] }.` }]
      });

      // Helper to execute tools
      const executeTool = async (name: string, args: any) => {
        console.log(`Executing tool: ${name} with`, args);
        try {
          if (name === 'get_inactive_clients') {
            const clients = await readRecords('clients');
            const now = new Date();
            const inactive = clients.filter((c: any) => {
              if (!c.lastPurchaseDate) return true; // Assume new or never purchased
              const lastDate = new Date(c.lastPurchaseDate);
              const diffTime = Math.abs(now.getTime() - lastDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays > 90;
            });
            return { result: JSON.stringify(inactive.map((c: any) => ({id: c.id, name: c.name, clinica: c.clinica}))) };
          }
          if (name === 'create_campaign') {
            const campaigns = await readRecords('campaigns');
            const newCampaign = {
              id: Date.now().toString(),
              name: args.name,
              category: args.category,
              status: 'pending',
              createdAt: new Date().toISOString()
            };
            campaigns.push(newCampaign);
            await writeRecords('campaigns', campaigns);
            return { result: `Campaign '${args.name}' created successfully for category ${args.category}.` };
          }
          return { error: `Tool ${name} not implemented.` };
        } catch (e: any) {
          return { error: e.message };
        }
      };

      let response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          tools: [{ functionDeclarations: crmTools }]
        }
      });

      // Handle tool calls
      if (response.functionCalls) {
        const toolCalls = response.functionCalls;
        const toolResults = [];
        
        for (const call of toolCalls) {
          const result = await executeTool(call.name, call.args);
          toolResults.push({
            role: 'tool',
            parts: [{ functionResponse: { name: call.name, response: result } }]
          });
        }
        
        // Send tool results back to model
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [...contents, response.candidates![0].content, ...toolResults]
        });
      }

      res.json({ reply: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error en chat IA' });
    }
  });

  // --- PERSISTENCE IN FIRESTORE ---
  let db: admin.firestore.Firestore | null = null;
  const DATA_DIR = path.join(__dirname, 'data');
  import('fs/promises').then(fs => fs.mkdir(DATA_DIR, { recursive: true }));

  async function getDB(): Promise<admin.firestore.Firestore | null> {
    if (!db) {
      try {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (serviceAccountString && serviceAccountString.trim()) {
          const trimmed = serviceAccountString.trim();
          if (!trimmed.startsWith('{')) {
            console.warn(`[CIMASUR Warning] FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido (valor actual: "${trimmed}"). Verifique sus variables de entorno. Usando almacenamiento local como respaldo.`);
            return null;
          }
          if (admin.apps.length === 0) {
            const serviceAccount = JSON.parse(trimmed);
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

  app.get('/api/automation/metrics', async (req, res) => {
    console.log(`API call: GET /api/automation/metrics`);
    try {
      const campaigns = await readRecords('campaigns');
      const totalSent = campaigns.reduce((sum: number, c: any) => sum + (c.metrics?.sent || 0), 0);
      const totalOpened = campaigns.reduce((sum: number, c: any) => sum + (c.metrics?.opened || 0), 0);
      const totalConverted = campaigns.reduce((sum: number, c: any) => sum + (c.metrics?.converted || 0), 0);
      res.json({
        totalCampaigns: campaigns.length,
        totalSent,
        openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        conversionRate: totalSent > 0 ? (totalConverted / totalSent) * 100 : 0,
      });
    } catch (e: any) {
      console.error('Error fetching campaign metrics:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/automation/campaigns/:id/execute', async (req, res) => {
    console.log(`API call: POST /api/automation/campaigns/${req.params.id}/execute`);
    try {
      const serverAutomation = new ServerAutomation(readRecords, writeRecords);
      await serverAutomation.executeCampaign(req.params.id, req.body.user || 'Sistema');
      res.json({ success: true });
    } catch (e: any) {
      console.error('Error executing campaign:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/crm/intelligence', async (req, res) => {
    console.log('API call: GET /api/crm/intelligence (Server-Side Growth Engine)');
    try {
      const salesData = await readRecords('sales');
      const intranetData = await readRecords('intranet_clients');
      
      const integration = new IntegrationService();
      const engine = new GrowthEngine();
      
      const integratedData = integration.integrate(intranetData, salesData);
      const result = engine.process(integratedData);
      
      res.json(result);
    } catch (e: any) {
      console.error('Error running Growth Engine on server:', e);
      res.status(500).json({
        status: "NO_DATA",
        reason: "Datos insuficientes o error de conexión.",
        next_step: "Verificar conexión con la Base de Datos",
        safe_render: true,
        error: e.message
      });
    }
  });

  // =========================================================================
  // INTELIGENCIA COMERCIAL / FASE 6 CORE ENDPOINTS
  // =========================================================================

  app.get('/api/opportunities/:contactId', async (req, res) => {
    console.log(`API call: GET /api/opportunities/${req.params.contactId}`);
    try {
      const { OpportunityService } = await import('./src/services/crm/OpportunityService');
      const opportunityService = new OpportunityService(readRecords, writeRecords);
      const evaluation = await opportunityService.evaluateClient(req.params.contactId);
      res.json(evaluation);
    } catch (e: any) {
      console.error(`Error calculating opportunities for ${req.params.contactId}:`, e);
      res.status(500).json({ error: e.message || 'Error calculando oportunidades' });
    }
  });

  app.post('/api/opportunities/evaluate', async (req, res) => {
    console.log('API call: POST /api/opportunities/evaluate (Mass Evaluation)');
    try {
      const { OpportunityService } = await import('./src/services/crm/OpportunityService');
      const opportunityService = new OpportunityService(readRecords, writeRecords);
      const results = await opportunityService.evaluateAll();
      res.json({ success: true, count: results.length, opportunities: results });
    } catch (e: any) {
      console.error('Error in bulk opportunities evaluation:', e);
      res.status(500).json({ error: e.message || 'Error en evaluación masiva' });
    }
  });

  app.get('/api/crm/client-intelligence/:contactId', async (req, res) => {
    console.log(`API call: GET /api/crm/client-intelligence/${req.params.contactId}`);
    try {
      const { CustomerJourneyService } = await import('./src/services/crm/CustomerJourneyService');
      const { RecommendationEngineService } = await import('./src/services/crm/RecommendationEngineService');
      const { CommercialIntelligenceService } = await import('./src/services/crm/CommercialIntelligenceService');
      const { OpportunityService } = await import('./src/services/crm/OpportunityService');
      const { IntegrationService } = await import('./src/services/crm/IntegrationService');
      const { SegmentationService } = await import('./src/services/crm/SegmentationService');
      const { CycleManagerService } = await import('./src/services/crm/CycleManagerService');

      const journeyService = new CustomerJourneyService(readRecords, writeRecords);
      const recommendationService = new RecommendationEngineService(readRecords, writeRecords);
      const intelligenceService = new CommercialIntelligenceService();
      const opportunityService = new OpportunityService(readRecords, writeRecords);

      // 1. Obtener oportunidades detectadas por el motor
      let opportunity = null;
      try {
        opportunity = await opportunityService.evaluateClient(req.params.contactId);
      } catch (err) {
        console.warn(`No se pudo evaluar oportunidad para ${req.params.contactId}:`, err);
      }

      // 2. Obtener recomendaciones
      const recommendations = await recommendationService.getRecommendationsForClient(req.params.contactId);

      // 3. Obtener línea de tiempo del cliente (Customer Journey)
      const timeline = await journeyService.getCustomerTimeline(req.params.contactId);

      // 4. Obtener datos procesados del cliente
      const salesData = await readRecords('sales');
      const intranetData = await readRecords('intranet_clients');
      
      const integration = new IntegrationService();
      const segmentation = new SegmentationService();
      const integratedData = integration.integrate(intranetData, salesData);
      
      const customer = integratedData.find((c: any) => c.id === req.params.contactId || c.rut === req.params.contactId);
      
      let aiSummary = null;
      if (customer) {
        // Enriquecer cliente
        const cycle = new CycleManagerService();
        const cycleSales = (customer.sales || []).filter((s: any) => 
          cycle.isInCurrentCycle(s.fecha || s.date || s.createdAt)
        );
        const totalSales = cycleSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
        customer.totalSales = totalSales;
        customer.category = segmentation.categorize(totalSales);
        
        const loyaltyAccounts = await readRecords('loyalty_accounts') || [];
        customer.loyaltyAccount = loyaltyAccounts.find((a: any) => a.contactId === customer.id || a.contactId === customer.rut);

        // Generar resumen con Gemini
        aiSummary = await intelligenceService.generateClientAISummary(
          customer,
          timeline,
          opportunity ? [opportunity] : [],
          recommendations
        );
      }

      res.json({
        contactId: req.params.contactId,
        opportunity,
        recommendations,
        timeline,
        aiSummary
      });
    } catch (e: any) {
      console.error(`Error compiling CRM intelligence for ${req.params.contactId}:`, e);
      res.status(500).json({ error: e.message || 'Error compilando inteligencia de cliente' });
    }
  });

  // =========================================================================
  // CLUB COMERCIAL / FIDELIZACIÓN (FASE 5 CORE ENDPOINTS)
  // =========================================================================

  app.get('/api/loyalty/dashboard', async (req, res) => {
    console.log('API call: GET /api/loyalty/dashboard');
    try {
      const loyaltyService = new LoyaltyEngineService(readRecords, writeRecords);
      const metrics = await loyaltyService.getDashboardMetrics();
      res.json(metrics);
    } catch (e: any) {
      console.error('Error fetching loyalty dashboard metrics:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/loyalty/member/:contactId', async (req, res) => {
    console.log(`API call: GET /api/loyalty/member/${req.params.contactId}`);
    try {
      const loyaltyService = new LoyaltyEngineService(readRecords, writeRecords);
      const details = await loyaltyService.getMemberDetails(req.params.contactId);
      res.json(details);
    } catch (e: any) {
      console.error(`Error fetching loyalty details for contact ${req.params.contactId}:`, e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/loyalty/rewards', async (req, res) => {
    console.log('API call: GET /api/loyalty/rewards');
    try {
      const catalogService = new CatalogService(readRecords, writeRecords);
      const rewards = await catalogService.getCatalog(true);
      res.json(rewards);
    } catch (e: any) {
      console.error('Error fetching loyalty rewards catalog:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/loyalty/enroll', async (req, res) => {
    console.log('API call: POST /api/loyalty/enroll', req.body);
    try {
      const { contactId, email } = req.body;
      if (!contactId) {
        return res.status(400).json({ error: 'El contactId es requerido para inscribirse en el Club.' });
      }
      
      const loyaltyService = new LoyaltyEngineService(readRecords, writeRecords);
      const account = await loyaltyService.enroll(contactId, email);
      res.json(account);
    } catch (e: any) {
      console.error('Error enrolling contact in loyalty club:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/loyalty/redeem', async (req, res) => {
    console.log('API call: POST /api/loyalty/redeem', req.body);
    try {
      const { contactId, rewardId, idempotencyKey } = req.body;
      if (!contactId || !rewardId || !idempotencyKey) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos para el canje: contactId, rewardId e idempotencyKey.' });
      }

      const redemptionService = new RedemptionService(readRecords, writeRecords);
      const result = await redemptionService.redeem(contactId, rewardId, idempotencyKey);
      res.json(result);
    } catch (e: any) {
      console.error('Error redeeming loyalty reward:', e);
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/records/:collection', async (req, res) => {
    console.log('API call: GET /api/records/:collection', req.query);
    const records = await readRecords(req.params.collection);
    
    // Support pagination
    const page = parseInt(req.query.page as string);
    const limit = parseInt(req.query.limit as string);
    
    if (!isNaN(page) && !isNaN(limit)) {
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      res.json({
        data: records.slice(startIndex, endIndex),
        total: records.length,
        page,
        limit
      });
      return;
    }
    
    res.json(records);
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
      records[idx] = { ...records[idx], ...req.body, id }; // Ensure ID is preserved
    } else {
      records.push({ ...req.body, id });
    }
    await writeRecords(collection, records);
    res.json({ success: true });
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

  app.post('/api/ai/generate', async (req, res) => {
    console.log('API call: POST /api/ai/generate');
    try {
      const { prompt, context, isSchool } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Falta configurar la GEMINI_API_KEY en el servidor." });
      }
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Eres un Motor de IA de Estrategia Analítica para ${isSchool ? 'Escuela CIMASUR (Educación Médica)' : 'CIMASUR Comercial'}. Contexto actual:\n${context}\n\nInstrucciones del usuario: "${prompt}".\n\nInformación estratégica clave para CIMASUR Comercial:\n- Los productos oficiales que vendemos en nuestra tienda y en los que DEBES basar todas las ideas de difusión, sugerencias, ofertas y contenidos son únicamente:\n  * Acqua Maris CS Salina\n  * allium s cs Salina\n  * Arnica CS Salina\n  * Beilschmiedia CS Salina\n  * Calostrum CS Salina\n  * Cina CS Salina\n  * Daucus CS Salina\n  * Escencias Florales (E.F. Aprende CS, E.F. Cambios Cs, E.F. Energia CS, E.F. Libre CS, E.F. Lider CS, E.F. Miedos CS, E.F. Rescue Remedy CS, E.F. Senior CS, E.F. Serenidad CS)\n  * Fórmulas Diluidas y Etanol (E.F.D. A – Arnica CS – Etanol, E.F.D. D – Fuchsia CS – Etanol, E.F.D. E – Dandelion CS – Etanol)\n  * Echinac A CS\n  * Kalium Tic CS\n  * Kit Fin de Año\n  * Kit Modulador Digestivo\n  * Kit Osteoarticular\n  * Kit Viaje\n  * Maqui CS\n  * Melissa P CS\n  * Muces CS\n  * Neem CS\n  * Sarsaparrilla CS\n\n- Reglas de promoción altamente prioritarias para los contenidos y campañas directas:\n  1. Ofrecemos "Envíos Gratis" por compras sobre 30 unidades en la primera compra.\n  2. Los clientes clasificados en la categoría de "Sin compra" (médicos veterinarios con acceso recién aprobado a la Intranet de Ventas) tienen un beneficio insuperable: por compras sobre 30 unidades en su primer pedido se llevan de regalo un "Vademécum Físico Gratuito" (guía clínica con todas nuestras fórmulas magistrales homeopáticas). El objetivo estrella ante ellos es persuadirlos para realizar esta primera compra destacando esta oferta del Vademécum Físico y Envío Gratis.\n  3. También contamos con atractivos descuentos por compras por volumen, ofreciendo conditions especiales y reducciones en compras a mayor escala para incentivar pedidos grandes.\n\nGenera un plan estratégico que devuelva un objeto JSON con los siguientes campos obligatorios:\n- "auditoria": Un diagnóstico profundo del impacto promocional previo o situación actual (1 párrafo, motivador, con redacción corporativa impecable, sin etiquetas CSS ni HTML).\n- "ficha": Un array of 3 objetos, cada uno con "target" (a quién va dirigido específicamente), "accion" (qué hacer), y "kpi" (qué indicador mejorar).\n- "pasos": Un array de strings con 3-5 pasos operativos inmediatos para el gestor del sistema.\n- "tipo_envio": Debe ser estrictamente "whatsapp" o "email" dependiendo del canal estratégico óptimo.\n- "contenido": Si "tipo_envio" is "whatsapp", proporciona un texto de mensaje altamente persuasivo, sumamente ATRACTIVO, ordenado, profesional e interesante, preparado con marcadores dinámicos corporativos {{NOMBRE}} y {{CATEGORIA}} o {{PROGRAMA}} junto con sugerencias de emojis vistosos. Si es "email", proporciona CÓDIGO HTML COMPLETO de una plantilla lista para enviar por correo de alta fidelidad, con marcadores {{NOMBRE}}, con un diseño visual ultra elegante (colores modernos tono azul/pizarra de CIMASUR), fuentes bellamente estilizadas, llamadas a la acción claras (botones de contacto diseñados con estilos inline estéticos, tablas o tarjetas) y firmas profesionales. Evita cualquier código incompleto. No salgas con markdown adicional fuera del JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
             type: Type.OBJECT,
             properties: {
               auditoria: { type: Type.STRING },
               ficha: {
                 type: Type.ARRAY,
                 items: {
                   type: Type.OBJECT,
                   properties: {
                     target: { type: Type.STRING },
                     accion: { type: Type.STRING },
                     kpi: { type: Type.STRING }
                   }
                 }
               },
               pasos: { type: Type.ARRAY, items: { type: Type.STRING } },
               tipo_envio: { type: Type.STRING },
               contenido: { type: Type.STRING }
             }
          }
        }
      });
      
      const text = response.text;
      const resolved = typeof text === 'string' ? text : await text;
      const data = JSON.parse(resolved);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error AI' });
    }
  });

  app.post('/api/ai/generate-support-message', async (req, res) => {
    console.log('API call: POST /api/ai/generate-support-message');
    try {
      const { clientName, categoria, clinica, type } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Falta configurar la GEMINI_API_KEY en el servidor de CIMASUR." });
      }
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Eres un redactor creativo de marketing y fidelización clínica para la prestigiosa farmacia homeopática veterinaria CIMASUR de Chile.
Genera un único mensaje muy corto, inspirador, motivacional y de apoyo ("Mensaje de Apoyo") para colocarlo de fondo en una postal de reconocimiento que se descargará y enviará al veterinario.

Información sobre el destinatario:
- Médico Veterinario: ${clientName}
- Categoría dentro del Club: ${categoria}
- Clínica: ${clinica || 'Socio Veterinario Autorizado'}
- Motivo del saludo: ${type} (ej. ascenso de categoría de compras, reactivación de cuenta inactiva comercial, felicitación o constancia por su excelente trayectoria o beneficios magistrales exclusivos).

Reglas obligatorias:
1. El mensaje debe ser breve, cálido, inspirador y sumamente profesional.
2. Debe estar en español neutro o chileno formal.
3. El límite estricto de extensión es de 130 caracteres reales, para que quepa de principio a fin en una sola línea o dos líneas cortas de diseño gráfico.
4. Devuelve UNICAMENTE el formato JSON solicitado sin etiquetas adicionales de markdown.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING }
            },
            required: ["message"]
          }
        }
      });

      const text = response.text;
      const resolved = typeof text === 'string' ? text : await text;
      const data = JSON.parse(resolved);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error al generar el mensaje con IA' });
    }
  });

  app.post('/api/ai/generate-batch-messages', async (req, res) => {
    console.log('API call: POST /api/ai/generate-batch-messages');
    try {
      const { clients, type } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Falta configurar la GEMINI_API_KEY en el servidor." });
      }
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `Actúa como Ejecutivo Senior de CRM de Laboratorios Homeopáticos CIMASUR. Redacta mensajes de WhatsApp individuales, sumamente profesionales y persuasivos para cada uno de los clientes en la lista provista. 
Objetivo estratégico de contacto: ${type}.
No utilices plantillas genéricas. Cada mensaje DEBE contener el nombre y parámetros reales de cada cliente de forma natural, sin placeholders ni llaves. Retorna un objeto JSON con mapeo clave-valor exacto, donde las keys sean el ID de los clientes proporcionados y values los textos finales personalizados.

La lista de clientes en formato JSON:
${JSON.stringify(clients, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              messages: {
                type: Type.OBJECT,
                additionalProperties: { type: Type.STRING },
                description: "Map of client ID to their respective personalized message"
              }
            },
            required: ["messages"]
          }
        }
      });

      const text = response.text;
      const resolved = typeof text === 'string' ? text : await text;
      const data = JSON.parse(resolved);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error AI Batch Generation' });
    }
  });

  app.post('/api/ai/generate-email-template', async (req, res) => {
    try {
      const { client, objective, prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Falta configurar la GEMINI_API_KEY en el servidor." });
      }
      
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const clientName = client?.name || 'Estimado Cliente / Veterinario';
      const clientCategory = client?.calculatedTier?.name || client?.categoria || 'Sin Categoría';
      const clientClinica = client?.clinica || 'Centro Veterinario';

      const aiPrompt = `Eres un diseñador experto de HTML Emails de alta fidelidad para la farmacia homeopática veterinaria CIMASUR.
Genera un correo electrónico en formato HTML completo, visualmente impresionante y moderno que parezca diseñado en Canva.

ESPECIFICACIONES TÉCNICAS:
- Usa estilos inline (CSS inline) compatibles con Outlook y Gmail.
- Diseño "Responsive" con una tabla central de 600px de ancho.
- Paleta de colores CIMASUR: Azules pizarra (#0e192f), Sky Blue (#38bdf8), Slate (#94a3b8), Blanco Puro.
- Tipografía: Sans-serif limpia.

ESTRUCTURA DEL CONTENIDO:
1. Header elegante con fondo oscuro y logo textual "CIMASUR | Club Social".
2. Gran titular de impacto (Headline) relacionado con el objetivo: "${objective || 'Beneficio Exclusivo'}".
3. Imagen hero simulada (usa un placeholder de alta calidad de unsplash si puedes, o un bloque de color estético con un icono grande).
4. Texto principal altamente persuasivo y personalizado para "${clientName}" de la clínica "${clientClinica}" (Nivel: ${clientCategory}).
5. Los productos oficiales de CIMASUR que puedes mencionar si encaja: Acqua Maris, Arnica CS, Escencias Florales, Kit Fin de Año.
6. CTA (Botón de Acción) grande y redondeado con efecto de elevación visual.
7. Footer corporativo con información de contacto y redes sociales.

CONTEXTO ADICIONAL DEL USUARIO: "${prompt || 'Garantía oficial de fidelización preferente.'}"

Retorna un objeto JSON con el campo "html". Solo el HTML, sin markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: aiPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              html: { type: Type.STRING }
            },
            required: ["html"]
          }
        }
      });

      const text = response.text;
      const resolved = typeof text === 'string' ? text : await text;
      if (!resolved) throw new Error("No se pudo generar el HTML");
      const data = JSON.parse(resolved);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error AI Email Generation' });
    }
  });

  app.post('/api/ai/evaluate-improve-message', async (req, res) => {
    console.log('API call: POST /api/ai/evaluate-improve-message');
    try {
      const { client, status, currentMessage, improvePrompt, channel } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Falta configurar la GEMINI_API_KEY en el servidor de CIMASUR." });
      }

      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const clientName = client?.name || 'Estimado/a Doctor/a';
      const clientCategory = client?.calculatedTier?.name || client?.categoria || 'Sin Categoría';
      const clientClinica = client?.clinica || 'Socio Clínico Autorizado';
      const v2025 = client?.ventas?.v2025 || 0;
      const v2026 = client?.ventas?.v2026 || 0;
      const percentChange = client?.percentChange || 0;
      const percentChangeFormatted = percentChange !== 0 ? `${(percentChange * 100).toFixed(1)}%` : 'Sin ventas registradas';

      const aiPrompt = `Eres el Asesor Senior de Inteligencia de Clientes y Fidelización Comercial para CIMASUR, la prestigiosa farmacia homeopática veterinaria de Chile.
Tu misión es diseñar, evaluar y optimizar un mensaje de reactivación y fidelización para un socio veterinario que se encuentra en un estado comercial crítico de alerta.

Información del Socio Clínico:
- Nombre del Médico Veterinario: ${clientName}
- Clínica/Empresa: ${clientClinica}
- Categoría en el Club: ${clientCategory}
- Compras Año Anterior (2025): $${v2025.toLocaleString('es-CL')} CLP
- Compras Año Actual (2026): $${v2026.toLocaleString('es-CL')} CLP
- Variación de Compras: ${percentChangeFormatted}
- Estado / Tipo de Alerta: ${status}
- Canal Seleccionado: ${channel || 'whatsapp'} (ej. whatsapp, email)

Mensaje Base Actual (si el usuario ingresó o generó uno previamente, si está vacío ignora este campo):
"${currentMessage || ''}"

Instrucción de mejora del usuario (ej: "hazlo más cercano", "menciona envíos gratis", "destaca que tiene 30 días de gracia", "ofrece asesoría directa con Jaime González"):
"${improvePrompt || 'Generar propuesta inicial altamente persuasiva y empática'}"

REGLAS DE REDACCIÓN DEL MENSAJE:
1. Si el canal es 'whatsapp':
   - Debe ser empático, sumamente cercano, ordenado con saltos de línea estratégicos.
   - Usa emojis de manera profesional y atractiva.
   - Debe ser directo y no demasiado largo (máximo 1200 caracteres).
   - Ofrece un plazo de gracia (30 días), asistencia personalizada, o consulta con empatía si requiere alguna de nuestras fórmulas homeopáticas más vendidas como Arnica CS, Acqua Maris o el Kit Modulador Digestivo.
2. Si el canal es 'email':
   - Debe ser un correo electrónico completo con Asunto, Saludo, Cuerpo persuasivo, Oferta o Propuesta de valor, Llamado a la acción (CTA) claro, y Firma formal del equipo CIMASUR.
   - Utiliza un tono corporativo, cálido y elegante.
3. El tono general debe ser de alianza, colaboración, respeto y absoluto apoyo. En CIMASUR nunca reclamamos ni regañamos al cliente por comprar menos; buscamos ser sus aliados clínicos y facilitarle las cosas.

Retorna un objeto JSON con el nuevo mensaje mejorado/diseñado y un análisis de evaluación en español.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: aiPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              improvedMessage: { 
                type: Type.STRING,
                description: "El mensaje final diseñado u optimizado para el canal seleccionado, con marcadores como {{NOMBRE}} o con los datos del cliente ya integrados."
              },
              evaluation: {
                type: Type.OBJECT,
                properties: {
                  scorePersonalizacion: { type: Type.INTEGER, description: "Puntaje de personalización de 0 a 100" },
                  scoreTonoApoyo: { type: Type.INTEGER, description: "Puntaje de empatía y tono de apoyo de 0 a 100" },
                  scoreLlamadoAccion: { type: Type.INTEGER, description: "Puntaje del llamado a la acción de 0 a 100" },
                  scoreEfectividad: { type: Type.INTEGER, description: "Puntaje general de efectividad de 0 a 100" },
                  positives: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Puntos fuertes de esta versión del mensaje (máximo 3)"
                  },
                  improvements: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Aspectos mejorados o recomendaciones clave incorporadas (máximo 3)"
                  }
                },
                required: ["scorePersonalizacion", "scoreTonoApoyo", "scoreLlamadoAccion", "scoreEfectividad", "positives", "improvements"]
              }
            },
            required: ["improvedMessage", "evaluation"]
          }
        }
      });

      const text = response.text;
      const resolved = typeof text === 'string' ? text : await text;
      if (!resolved) throw new Error("No se pudo obtener la respuesta de evaluación de la IA.");
      const data = JSON.parse(resolved);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error AI Evaluation & Improvement' });
    }
  });

  app.post('/api/ai/converse-bulk-campaign', async (req, res) => {
    console.log('API call: POST /api/ai/converse-bulk-campaign');
    try {
      const { 
        chatHistory, 
        currentEmailSubject, 
        currentEmailText, 
        currentWhatsAppText, 
        userMessage,
        image, // base64 string
        imageMimeType,
        currentDesignerTitle,
        currentDesignerSubtitle,
        currentDesignerAccentColor
      } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Falta configurar la GEMINI_API_KEY en el servidor de CIMASUR." });
      }

      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Format previous history
      const formattedHistory = (chatHistory || [])
        .map((h: any) => `${h.sender === 'user' ? 'Usuario' : 'Copiloto IA'}: ${h.text}`)
        .join('\n');

      const bulkAiPrompt = `Eres el Copiloto Experto en Copywriting y Estratégia de Marketing Médico para CIMASUR.
Te encuentras asesorando al Administrador de Clientes Corporativos en el diseño de su campaña masiva de reactivación y fidelización para médicos veterinarios de Chile.

Estado actual de las plantillas de campaña:
- Asunto de Correo Actual: "${currentEmailSubject || 'Sin asunto'}"
- Cuerpo de Correo Actual: "${currentEmailText || 'Sin cuerpo de correo'}"
- Mensaje de WhatsApp Actual: "${currentWhatsAppText || 'Sin mensaje de WhatsApp'}"

Estado actual del diseño gráfico institucional del correo:
- Título Cabecera Actual: "${currentDesignerTitle || 'CIMASUR®'}"
- Subtítulo Actual: "${currentDesignerSubtitle || 'Farmacia Homeopática Veterinaria de Chile'}"
- Color de Acento Actual: "${currentDesignerAccentColor || '#38bdf8'}"

Historial de la conversación previa:
${formattedHistory}

Nuevo requerimiento del usuario:
"${userMessage}"

Si el usuario adjuntó una imagen, se te ha suministrado como parte de la entrada. Analiza la imagen minuciosamente (puede ser un banner promocional, un folleto, un diseño previo, etc.). Si el usuario pide algo como "cambiar la fecha", "adaptar este diseño para envío gratis" o usar el diseño, extrae todo el contenido, el tono comercial, las ofertas y los colores. Adapta el diseño y los textos masivos de acuerdo a la imagen suministrada.

REGLAS CRÍTICAS DE REDACCIÓN Y TONO PROFESIONAL (ALTA PRIORIDAD):
1. TONO SERIO, RESPETUOSO Y CLÍNICO: Queda ESTRICTAMENTE PROHIBIDO el uso de saludos informales, emojis excesivos, cohetes, fuegos o estrellas de fantasía. Evita expresiones infantiles, confianzudas o informales como "🚀 ¿Cómo está?", "súper cerca", "excelentes noticias", "un gran abrazo", "un fuerte abrazo", "cariño de siempre", o "maravillosas noticias". Los médicos veterinarios en Chile aprecian un lenguaje sumamente respetuoso, sobrio, formal-cercano y basado en evidencia y apoyo técnico. Usa "Estimado/a Doctor/a {{NOMBRE}}" o "Estimado/a Colega" de forma profesional y trata siempre al receptor de "usted".
2. COHERENCIA SEGÚN EL SEGMENTO Y COMPRAS (CRÍTICO):
   - Si el objetivo de la campaña es "Activos en Intranet Sin Compra (Asesoría)" (intranet_sin_compra_orientacion), el destinatario es un PROSPECTO. Esto significa que NO tiene compras previas y NO posee una categoría asignada (es Sin Categoría).
   - Para estos prospectos, es un ERROR LÓGICO GRAVE hablar de "subir de categoría", "upgrade", "mantener sus beneficios preferenciales de categoría", "recalificación", "caída de compras", o "plazo de gracia". NO menciones nada de eso.
   - En su lugar, enfócate 100% en: darle la bienvenida a la Intranet de CIMASUR, ofrecerle orientación/asesoría técnica y clínica sin costo para el uso de nuestras fórmulas magistrales veterinarias, e invitarle a realizar su primera compra con los beneficios de bienvenida correspondientes (15% de descuento especial de bienvenida, despacho prioritario sin costo a su clínica {{CLINICA}}, y el envío de un Kit de Vademécum Físico de regalo para su consulta).
3. VARIABLES DINÁMICAS OBLIGATORIAS:
   - {{NOMBRE}} (para el nombre del profesional)
   - {{CLINICA}} (para el centro veterinario)
   - {{CATEGORIA_2026}} (solo si es cliente recurrente con categoría real; si es prospecto sin categoría, usa un término genérico como "Profesional de la Intranet")
   - {{BENEFICIO_PRINCIPAL}} (solo si aplica)
4. MENSAJE DE WHATSAPP PROFESIONAL: Debe ser conciso, estructurado con saltos de línea claros para que sea muy fácil de leer en un celular. No uses más de 2 o 3 emojis clínicos muy discretos (como 🩺, 🌿 o 🏥). Quedan prohibidos cohetes y caritas animadas.
5. REFERENCIAS DE FÓRMULAS: Puedes mencionar de forma seria nuestras reconocidas líneas de fórmulas homeopáticas veterinarias chilenas, como Arnica CS (modulador inflamatorio), Acqua Maris (soporte respiratorio natural) o el Kit Modulador Digestivo.
6. DISEÑO VISUAL: Ajusta el Título cabecera, Subtítulo y Color de acento HEX en el JSON para alinearlo con el mood institucional y los colores oficiales de CIMASUR (azul corporativo #0c4a6e, verde herbolario #15803d, etc.).

Debes analizar las observaciones del usuario (y la imagen si está presente), aplicar mejoras estratégicas a todos los elementos (asunto, cuerpo del correo, mensaje de WhatsApp, diseño visual) y redactar una respuesta de chat explicativa detallada, respetuosa, formal y estratégica en español.

Retorna UNICAMENTE un objeto JSON con el siguiente formato estricto:`;

      // Construct content parts
      const contentsParts: any[] = [];
      
      if (image) {
        let base64Data = image;
        let mime = imageMimeType || "image/png";
        if (image.includes(';base64,')) {
          const parts = image.split(';base64,');
          mime = parts[0].replace('data:', '');
          base64Data = parts[1];
        }
        contentsParts.push({
          inlineData: {
            mimeType: mime,
            data: base64Data
          }
        });
      }
      
      contentsParts.push({
        text: bulkAiPrompt
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsParts,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: "Respuesta conversacional explicativa dirigida al usuario en español, con un tono amable, profesional y estratégico, detallando qué mejoras se aplicaron."
              },
              updatedEmailSubject: {
                type: Type.STRING,
                description: "La plantilla del asunto del correo optimizada de acuerdo a las instrucciones del usuario o la imagen."
              },
              updatedEmailText: {
                type: Type.STRING,
                description: "La plantilla del cuerpo del correo electrónico optimizada, que debe mantener o incluir adecuadamente las variables {{NOMBRE}}, {{CLINICA}}, {{CATEGORIA_2026}} y {{BENEFICIO_PRINCIPAL}}."
              },
              updatedWhatsAppText: {
                type: Type.STRING,
                description: "La plantilla de WhatsApp optimizada, estructurada amigablemente con saltos de línea y emojis profesionales."
              },
              updatedDesignerTitle: {
                type: Type.STRING,
                description: "Título del header institucional del correo gráfico que mejor se adapte al diseño o campaña."
              },
              updatedDesignerSubtitle: {
                type: Type.STRING,
                description: "Subtítulo de soporte del header institucional para la campaña."
              },
              updatedDesignerAccentColor: {
                type: Type.STRING,
                description: "Color hexadecimal de acento sugerido para el diseño gráfico (ej: '#eab308' para dorado, '#10b981' para verde, '#38bdf8' para celeste, '#a855f7' para platino morado)."
              }
            },
            required: [
              "reply", 
              "updatedEmailSubject", 
              "updatedEmailText", 
              "updatedWhatsAppText",
              "updatedDesignerTitle",
              "updatedDesignerSubtitle",
              "updatedDesignerAccentColor"
            ]
          }
        }
      });

      const text = response.text;
      const resolved = typeof text === 'string' ? text : await text;
      if (!resolved) throw new Error("No se pudo obtener la respuesta conversacional de la IA.");
      const data = JSON.parse(resolved);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error en la conversación de campaña masiva con IA' });
    }
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
    const distPath = path.join(process.cwd(), 'dist');
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

