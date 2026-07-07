
import { AutomationCore } from '../services/automation/AutomationCore';

// Mock DB
let db: any = {
    'automation_workflows': [{
        id: 'wf_concurrency',
        isActive: true,
        startStepId: 'step_1',
        steps: {
            'step_1': { id: 'step_1', type: 'action', actionType: 'email', templateId: 'tpl_1' }
        }
    }],
    'automation_rules': [{
        id: 'rule_concurrency',
        isActive: true,
        triggerEvent: 'event_concurrency',
        conditions: [],
        workflowId: 'wf_concurrency'
    }],
    'workflow_executions': [],
    'automation_jobs': [],
    'automation_history': [],
    'automation_idempotency': []
};

const readRecords = async (table: string) => db[table];
const writeRecords = async (table: string, data: any) => { db[table] = data; };

async function runTest() {
    console.log('--- Starting Concurrency Test ---');
    const mockEmailAdapter = {
        name: 'MockEmailAdapter',
        send: async () => ({ success: true })
    };
    const core = new AutomationCore(readRecords, writeRecords, { 'email': mockEmailAdapter as any });
    const clientId = 'client_concurrency_1';
    
    // 1. Trigger Event concurrently
    console.log('Step 1: Triggering event_concurrency 5 times');
    const triggers = Array(5).fill(null).map(() => core.triggerEvent('event_concurrency', { id: clientId }, 'system'));
    await Promise.all(triggers);
    
    // 2. Validate Persistence (only 1 execution should exist)
    const executions = await readRecords('workflow_executions');
    console.log('Execution created (should be 1):', executions.length === 1);
    
    // 3. Process jobs concurrently
    console.log('Step 2: Processing Jobs concurrently');
    // In this simple setup, processQueue is not truly concurrent because it reads/writes the mock DB
    // but we can call it multiple times
    const processors = Array(5).fill(null).map(() => core.processQueue());
    await Promise.all(processors);
    
    const history = await readRecords('automation_history');
    console.log('History logged (should be 1):', history.length === 1);
    
    console.log('Metrics:', (core as any).metricsManager.getMetrics());
    console.log('Throughput (workflows/s):', (core as any).metricsManager.getThroughput());
    
    console.log('--- Test completed successfully ---');
}

runTest().catch(console.error);
