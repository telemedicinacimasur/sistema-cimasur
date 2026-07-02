import { PointsEngine } from '../src/services/crm/PointsEngine';
import { CatalogService } from '../src/services/crm/CatalogService';
import { RedemptionService } from '../src/services/crm/RedemptionService';
import { LoyaltyEngineService } from '../src/services/crm/LoyaltyEngineService';

// Setup in-memory mock storage
const mockDB: Record<string, any[]> = {
  sales: [],
  intranet_clients: [],
  loyalty_accounts: [],
  points_transactions: [],
  rewards_catalog: [],
  redemptions: []
};

// Mock readRecords / writeRecords
const readRecords = async (col: string) => {
  return [...(mockDB[col] || [])];
};

const writeRecords = async (col: string, data: any[]) => {
  mockDB[col] = [...data];
};

// ANSI color helpers for beautiful logging
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function logSection(title: string) {
  console.log(`\n${BOLD}${BLUE}========================================================================${RESET}`);
  console.log(`${BOLD}${BLUE}  ${title.toUpperCase()}${RESET}`);
  console.log(`${BOLD}${BLUE}========================================================================${RESET}`);
}

let passes = 0;
let fails = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passes++;
    console.log(`  ${GREEN}✓ [PASS]${RESET} ${message}`);
  } else {
    fails++;
    console.log(`  ${RED}✗ [FAIL]${RESET} ${message}`);
  }
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}🚀 INICIANDO AUDITORÍA TÉCNICA Y PRUEBAS DE ENDURECIMIENTO (SPRINT 5.5) 🚀${RESET}`);

  // =========================================================================
  // 1. UNIT TESTS: POINTS ENGINE & MULTIPLIERS
  // =========================================================================
  logSection('1. Pruebas Unitarias de PointsEngine (Multiplicadores y Balance)');
  const pointsEngine = new PointsEngine(readRecords, writeRecords);

  // Test multiplier thresholds
  assert(pointsEngine.getMultiplier('Platinum') === 1.8, 'Multiplicador Platinum debe ser 1.8x');
  assert(pointsEngine.getMultiplier('Oro') === 1.5, 'Multiplicador Oro debe ser 1.5x');
  assert(pointsEngine.getMultiplier('Plata') === 1.2, 'Multiplicador Plata debe ser 1.2x');
  assert(pointsEngine.getMultiplier('Bronce') === 1.0, 'Multiplicador Bronce debe ser 1.0x');
  assert(pointsEngine.getMultiplier('Sin categoría') === 0.5, 'Multiplicador Sin categoría debe ser 0.5x');

  // Test dynamic points calculations
  const contactId = 'c_001';
  mockDB.points_transactions = [
    {
      id: 'tx_1',
      contactId,
      type: 'accumulation',
      amount: 1000,
      reason: 'Compra inicial',
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // expires in 10 days
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx_2',
      contactId,
      type: 'accumulation',
      amount: 500,
      reason: 'Compra secundaria',
      expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // expired 5 days ago
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  let balanceResult = await pointsEngine.getContactBalance(contactId);
  assert(balanceResult.lifetime === 1500, 'Los puntos históricos totales deben reflejar la suma (1500 pts)');
  assert(balanceResult.expired === 500, 'Debe detectar correctamente los puntos expirados de tx_2 (500 pts)');
  assert(balanceResult.balance === 1000, 'El saldo activo neto y disponible debe ser de 1000 pts (tx_1 activa)');

  // FIFO Deductions Test
  mockDB.points_transactions.push({
    id: 'tx_3',
    contactId,
    type: 'redemption',
    amount: -300,
    reason: 'Canje parcial de puntos',
    createdAt: new Date().toISOString()
  });

  balanceResult = await pointsEngine.getContactBalance(contactId);
  assert(
    balanceResult.balance === 1000 && balanceResult.expired === 200,
    `FIFO estricto: la deducción de 300 pts se restó del registro más antiguo (tx_2 de 500 pts expirados), dejando balance activo = ${balanceResult.balance} pts (esperado: 1000) y expirados = ${balanceResult.expired} pts (esperado: 200)`
  );

  // FIFO Deductions Test 2: Deducting more than what's left in the oldest tx
  mockDB.points_transactions.push({
    id: 'tx_4',
    contactId,
    type: 'redemption',
    amount: -800,
    reason: 'Canje secundario mayor',
    createdAt: new Date().toISOString()
  });

  balanceResult = await pointsEngine.getContactBalance(contactId);
  assert(
    balanceResult.balance === 400 && balanceResult.expired === 0,
    `FIFO estricto 2: deducción de 800 pts consumió los 200 expirados restantes de tx_2 y 600 activos de tx_1, resultando en balance activo = ${balanceResult.balance} pts (esperado: 400) y expirados = ${balanceResult.expired} pts (esperado: 0)`
  );

  // =========================================================================
  // 2. INTEGRATION TESTS: ACCUMULATION, ENROLLMENT & RECIPIENTS
  // =========================================================================
  logSection('2. Pruebas de Integración y Enlace con el Growth Engine');

  // Seed sample database clients for the Enrollment engine
  mockDB.intranet_clients = [
    {
      rut: '12.345.678-9',
      name: 'Clínica Veterinaria San Francisco',
      email: 'sanfrancisco@vet.cl',
      comuna: 'Santiago'
    }
  ];
  mockDB.sales = [
    {
      rut: '12.345.678-9',
      total: 1000000, // 1,000,000 CLP
      fecha: new Date().toISOString()
    }
  ];
  mockDB.loyalty_accounts = [];

  const loyaltyService = new LoyaltyEngineService(readRecords, writeRecords);
  
  // Enroll a contact and verify welcome bonus points + retroactives
  const enrolledAccount = await loyaltyService.enroll('12.345.678-9', 'sanfrancisco@vet.cl');
  assert(enrolledAccount.contactId === '12.345.678-9', 'La cuenta debe inscribir el ID del socio');
  
  // Checking points balance in loyalty accounts collection
  const updatedAccount = mockDB.loyalty_accounts.find(a => a.contactId === '12.345.678-9');
  assert(updatedAccount !== undefined, 'La cuenta del socio fue persistida exitosamente');
  assert(updatedAccount?.pointsBalance > 0, `El socio recibió puntos tras enrolarse (puntos acumulados: ${updatedAccount?.pointsBalance} pts)`);

  // =========================================================================
  // 3. IDEMPOTENCY VERIFICATION
  // =========================================================================
  logSection('3. Verificación de Idempotencia en Operaciones de Escritura');

  const key1 = 'idemp_key_12345';
  mockDB.points_transactions = []; // clear transactions

  // Trigger accumulation #1
  const txFirst = await pointsEngine.accumulate('12.345.678-9', 200000, 'Platinum', 'v_999', key1);
  const initialTxCount = mockDB.points_transactions.length;

  // Trigger accumulation #2 with identical key
  const txSecond = await pointsEngine.accumulate('12.345.678-9', 200000, 'Platinum', 'v_999', key1);
  const secondTxCount = mockDB.points_transactions.length;

  assert(initialTxCount === 1, 'Debe procesarse y registrarse la primera transacción de acumulación');
  assert(secondTxCount === 1, 'La segunda transacción con idéntica idempotencyKey debe ignorarse, evitando duplicaciones');
  assert(txFirst?.id === txSecond?.id, 'Ambos llamados deben retornar exactamente la misma transacción original');

  // =========================================================================
  // 4. CONCURRENCY CONTROL: MUTEX LOCKS
  // =========================================================================
  logSection('4. Verificación de Mutex y Bloqueo de Concurrencia');

  // Setup client with sufficient points and seed catalog
  const targetClient = 'client_concurrent_test';
  mockDB.loyalty_accounts = [
    {
      id: targetClient,
      contactId: targetClient,
      rut: '98.765.432-1',
      name: 'Clínica Concurrente',
      email: 'concurrent@vet.cl',
      pointsBalance: 5000,
      lifetimePoints: 5000,
      joinedAt: new Date().toISOString()
    }
  ];
  mockDB.points_transactions = [
    {
      id: 'tx_init_concurrent',
      contactId: targetClient,
      type: 'accumulation',
      amount: 5000,
      reason: 'Fondo de prueba',
      createdAt: new Date().toISOString()
    }
  ];

  const catalogService = new CatalogService(readRecords, writeRecords);
  const rewards = await catalogService.getCatalog(false); // seed catalog defaults
  const testReward = rewards[0]; // Cupón 10% Descuento, cost = 500 pts, stock = 100

  const redemptionService = new RedemptionService(readRecords, writeRecords);

  // Execute concurrent redemptions simulating rapid double-clicks
  console.log(`  ${YELLOW}➔ Despachando 2 solicitudes de canje concurrentes para el cliente: ${targetClient}...${RESET}`);
  
  let p1Success: boolean = false;
  let p2Success: boolean = false;
  let p2ErrorMessage = '';

  const promise1 = redemptionService.redeem(targetClient, testReward.id, 'concur_key_first')
    .then(() => { p1Success = true; })
    .catch((e) => console.log(`    Redención 1 falló: ${e.message}`));

  const promise2 = redemptionService.redeem(targetClient, testReward.id, 'concur_key_second')
    .then(() => { p2Success = true; })
    .catch((e) => { 
      p2Success = false; 
      p2ErrorMessage = e.message; 
    });

  await Promise.all([promise1, promise2]);

  assert(p1Success, 'La primera solicitud de canje concurrente debe ser aceptada exitosamente');
  assert(!p2Success, 'La segunda solicitud de canje concurrente debe bloquearse para evitar dobles canjes');
  assert(p2ErrorMessage.includes('Operación en progreso'), `Mensaje devuelto por el Mutex bloqueante: "${p2ErrorMessage}"`);

  // =========================================================================
  // 5. TRANSACTIONAL INTEGRITY & AUTOMATIC ROLLBACKS
  // =========================================================================
  logSection('5. Integridad de Transacciones y Rollbacks Automáticos');

  // Let's create an error-inducing scenario: stock exists, but during the points deduction,
  // pointsEngine balance is manipulated or fails due to a custom error check.
  // We can induce a failed deduction by setting points balance to 0 in loyalty_accounts,
  // while trying to redeem a reward that costs 500.
  const rollbackClient = 'client_rollback_test';
  mockDB.loyalty_accounts = [
    {
      id: rollbackClient,
      contactId: rollbackClient,
      rut: '11.111.111-1',
      name: 'Cliente Rollback',
      email: 'rollback@vet.cl',
      pointsBalance: 0, // No points in the cache!
      lifetimePoints: 0,
      joinedAt: new Date().toISOString()
    }
  ];
  mockDB.points_transactions = []; // No points in transactions ledger

  const catalogBefore = await catalogService.getRewardById(testReward.id);
  const initialStock = catalogBefore?.stock || 0;

  console.log(`  ${YELLOW}➔ Ejecutando transacción errónea inducida (saldo de puntos = 0)...${RESET}`);
  let redemptionErrorCaught = false;
  try {
    await redemptionService.redeem(rollbackClient, testReward.id, 'rollback_test_key_11');
  } catch (err: any) {
    redemptionErrorCaught = true;
    console.log(`    Excepción capturada esperada: "${err.message}"`);
  }

  assert(redemptionErrorCaught === true, 'El motor de canje debe rechazar la transacción por falta de puntos');
  
  const catalogAfter = await catalogService.getRewardById(testReward.id);
  assert(catalogAfter?.stock === initialStock, `El stock de la recompensa fue revertido (rollback) correctamente. Inicial: ${initialStock}, Actual: ${catalogAfter?.stock}`);

  // =========================================================================
  // 6. DETAILED STATS & SUMMARY
  // =========================================================================
  console.log(`\n${BOLD}${BLUE}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}📊 RESULTADOS FINALES DE LA AUDITORÍA DE PRUEBAS DEL SPRINT 5.5${RESET}`);
  console.log(`${BOLD}${BLUE}========================================================================${RESET}`);
  console.log(`  Pruebas Ejecutadas: ${passes + fails}`);
  console.log(`  ${GREEN}Pruebas Aprobadas: ${passes}${RESET}`);
  console.log(`  ${fails > 0 ? RED : GREEN}Pruebas Fallidas: ${fails}${RESET}`);
  console.log(`${BOLD}${BLUE}========================================================================${RESET}\n`);

  if (fails > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('Error fatal durante la auditoría:', e);
  process.exit(1);
});
