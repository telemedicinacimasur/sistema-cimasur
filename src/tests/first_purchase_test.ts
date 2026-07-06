
import { AutomationCore } from '../services/automation/AutomationCore';
import { FirstPurchaseWorkflow, FirstPurchaseRule } from '../services/automation/definitions';

// Mock DB
let db: any = {
    'automation_workflows': [FirstPurchaseWorkflow],
    'automation_rules': [FirstPurchaseRule],
    'workflow_executions': [],
    'automation_jobs': [],
    'automation_history': [],
    'automation_idempotency': []
};

const readRecords = async (table: string) => db[table];
const writeRecords = async (table: string, data: any) => { db[table] = data; };

async function runTest() {
    console.log('--- Starting First Purchase Test ---');
    const mockEmailAdapter = {
        name: 'MockEmailAdapter',
        send: async () => ({ success: true })
    };
    const core = new AutomationCore(readRecords, writeRecords, { 'email': mockEmailAdapter as any });
    const clientId = 'client_999';
    
    // 1. Trigger Event
    console.log('Step 1: Triggering first_purchase');
    await core.triggerEvent('first_purchase', { id: clientId }, 'system');
    
    // 2. Validate Persistence
    const executions = await readRecords('workflow_executions');
    console.log('Execution created:', executions.length === 1);
    
    const jobs = await readRecords('automation_jobs');
    console.log('Job created:', jobs.length === 1);
    
    // 3. Process to register history
    console.log('Step 2: Processing Job to generate history');
    await core.processQueue();
    
    const history = await readRecords('automation_history');
    console.log('History logged:', history.length === 1);
    
    // 4. Test Idempotency
    console.log('Step 3: Testing Idempotency (triggering again)');
    await core.triggerEvent('first_purchase', { id: clientId }, 'system');
    
    const executionsAfterSecond = await readRecords('workflow_executions');
    console.log('Idempotency check (executions count):', executionsAfterSecond.length === 1);
    
    console.log('--- Test completed successfully ---');
}

runTest().catch(console.error);
