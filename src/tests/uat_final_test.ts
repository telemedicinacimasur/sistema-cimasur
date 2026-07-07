
import { AutomationCore } from '../services/automation/AutomationCore';
import * as Definitions from '../services/automation/definitions';

// Mock DB
let db: any = {
    'automation_workflows': Object.values(Definitions).filter((v: any) => v.id && v.steps),
    'automation_rules': Object.values(Definitions).filter((v: any) => v.id && v.triggerEvent),
    'workflow_executions': [],
    'automation_jobs': [],
    'automation_history': [],
    'automation_idempotency': []
};

const readRecords = async (table: string) => db[table];
const writeRecords = async (table: string, data: any) => { db[table] = data; };

async function runUAT() {
    console.log('--- Starting UAT Integral (Phase 7.3 Final) ---');
    
    const core = new AutomationCore(readRecords, writeRecords, { 
        'email': { name: 'Mock', send: async () => ({ success: true }) } as any 
    });
    
    const scenarios = [
        { event: 'client_inactivity_90d', context: { id: 'c1', journeyState: 'Dormido (90d)' } },
        { event: 'first_purchase', context: { id: 'c2' } },
        { event: 'category_changed', context: { id: 'c3' } },
        { event: 'client_vip_status_changed', context: { id: 'c4', isVIP: true } },
        { event: 'client_birthday', context: { id: 'c5' } },
        { event: 'points_earned', context: { id: 'c6' } },
        { event: 'crm_opportunity_created', context: { id: 'c7' } }
    ];

    console.log(`\nExecuting ${scenarios.length} scenarios...`);
    
    for (const s of scenarios) {
        console.log(`\nScenario: ${s.event}`);
        await core.triggerEvent(s.event, s.context, 'system');
    }
    
    // Process all jobs
    console.log('\nProcessing all jobs...');
    let jobsToProcess = await readRecords('automation_jobs');
    while (jobsToProcess.some((j: any) => j.state === 'pending' || j.state === 'scheduled')) {
        await core.processQueue();
        jobsToProcess = await readRecords('automation_jobs');
    }
    
    // Validations
    const executions = await readRecords('workflow_executions');
    const history = await readRecords('automation_history');
    const jobs = await readRecords('automation_jobs');
    
    console.log('\n--- Final UAT Results ---');
    console.log('Total Workflow Executions:', executions.length);
    console.log('Total Jobs Completed:', jobs.filter((j: any) => j.state === 'completed').length);
    console.log('Total History Records:', history.length);
    console.log('Orphaned/Running Jobs:', jobs.filter((j: any) => j.state === 'running' || j.state === 'pending').length);
    
    const metrics = (core as any).metricsManager.getMetrics();
    const latency = (core as any).metricsManager.getLatencyStats();
    
    console.log('\n--- Metrics ---');
    console.log('Metrics:', metrics);
    console.log('Latency Stats (ms):', latency);
    console.log('Throughput (wf/s):', (core as any).metricsManager.getThroughput().toFixed(4));
    
    if (executions.length === scenarios.length && history.length === scenarios.length) {
        console.log('\nResult: PASSED');
    } else {
        console.log('\nResult: FAILED');
    }
}

runUAT().catch(console.error);
