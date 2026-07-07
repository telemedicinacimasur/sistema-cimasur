
import { AutomationCore } from '../services/automation/AutomationCore';
import { JobManager, Scheduler } from '../services/automation/JobEngine';

// Mock DB
let db: any = {
    'automation_workflows': [{
        id: 'wf_test',
        isActive: true,
        startStepId: 'step_1',
        steps: {
            'step_1': { id: 'step_1', type: 'action', actionType: 'email', templateId: 'tpl_1' }
        }
    }],
    'automation_rules': [{
        id: 'rule_test',
        isActive: true,
        triggerEvent: 'event_test',
        conditions: [],
        workflowId: 'wf_test'
    }],
    'workflow_executions': [],
    'automation_jobs': [],
    'automation_history': [],
    'automation_idempotency': []
};

const readRecords = async (table: string) => db[table];
const writeRecords = async (table: string, data: any) => { db[table] = data; };

async function runTest() {
    console.log('--- Starting Robustness Test (Phase 7.3, Block 1) ---');
    
    // Helper to simulate system reboot
    let core = new AutomationCore(readRecords, writeRecords, { 'email': { name: 'Mock', send: async () => ({ success: true }) } as any });
    
    // 1. Test Transient Failure -> Retry -> Success
    console.log('\n--- Test 1: Transient Failure ---');
    let failCount = 0;
    const failingAdapter = {
        name: 'FailingAdapter',
        send: async () => {
            failCount++;
            if (failCount < 2) throw new Error('Transient failure');
            return { success: true };
        }
    };
    
    core = new AutomationCore(readRecords, writeRecords, { 'email': failingAdapter as any });
    await core.triggerEvent('event_test', { id: 'client_1' }, 'system');
    
    // Process 1 (Fail)
    await core.processQueue();
    let jobs = await readRecords('automation_jobs');
    console.log('Job 1 state after fail:', jobs[0].state);
    
    // Process 2 (Retry -> Success)
    await core.processQueue(); // This will trigger the retry logic internally in failJobWithRetry which sets to 'scheduled'
    // Actually, JobManager failJobWithRetry sets to 'scheduled'. Need to process scheduled.
    // Need to use Scheduler to move scheduled to pending
    const scheduler = new Scheduler(readRecords, writeRecords);
    await scheduler.processScheduledJobs();
    await core.processQueue();
    
    jobs = await readRecords('automation_jobs');
    console.log('Job 1 state after success:', jobs[0].state);
    
    // 2. Test Permanent Failure
    console.log('\n--- Test 2: Permanent Failure ---');
    const permanentFailingAdapter = {
        name: 'PermanentFailingAdapter',
        send: async () => { throw new Error('Permanent failure'); }
    };
    core = new AutomationCore(readRecords, writeRecords, { 'email': permanentFailingAdapter as any });
    await core.triggerEvent('event_test', { id: 'client_2' }, 'system');
    
    for(let i=0; i<4; i++) { // maxRetries is 3
        await core.processQueue();
        await scheduler.processScheduledJobs();
    }
    
    jobs = await readRecords('automation_jobs');
    const job2 = jobs.find((j: any) => j.createdBy === 'system' && JSON.stringify(j.payload).includes('client_2'));
    if (!job2) {
        console.log('Available jobs:', JSON.stringify(jobs));
        throw new Error('Job 2 not found');
    }
    console.log('Job 2 state after permanent fail:', job2.state);
    
    // 3. Test Idempotency after reboot
    console.log('\n--- Test 3: Idempotency after reboot ---');
    const clientId = 'client_3';
    await core.triggerEvent('event_test', { id: clientId }, 'system');
    
    // Reboot
    core = new AutomationCore(readRecords, writeRecords, { 'email': { name: 'Mock', send: async () => ({ success: true }) } as any });
    
    // Try again
    await core.triggerEvent('event_test', { id: clientId }, 'system');
    
    const executions = await readRecords('workflow_executions');
    const client3Execs = executions.filter((e: any) => e.context.id === clientId);
    console.log('Executions for client_3 after reboot:', client3Execs.length);

    console.log('\n--- Test completed successfully ---');
}

runTest().catch(console.error);
