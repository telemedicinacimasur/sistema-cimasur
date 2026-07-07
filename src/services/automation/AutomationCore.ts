import { IdempotencyGuard, HistoryManager, JobManager, MessageQueue, Scheduler } from './JobEngine';
import { RuleEngine } from './RuleEngine';
import { AutomationWorkflow, WorkflowStep, AutomationTemplate } from './types';
import { EmailAdapter, WhatsAppAdapter, SMSAdapter, PushAdapter, APIAdapter, IConnectorAdapter } from './adapters';
import { WorkflowEngine } from './WorkflowEngine';
import { MetricsManager } from './MetricsManager';
import { Reactivation90Workflow, Reactivation90Rule } from './definitions';

export class AutomationCore {
  private idempotencyGuard: IdempotencyGuard;
  private historyManager: HistoryManager;
  private jobManager: JobManager;
  private messageQueue: MessageQueue;
  private scheduler: Scheduler;
  private ruleEngine: RuleEngine;
  private workflowEngine: WorkflowEngine;
  private metricsManager: MetricsManager;

  private adapters: Record<string, IConnectorAdapter> = {
    'email': new EmailAdapter(),
    'whatsapp': new WhatsAppAdapter(),
    'sms': new SMSAdapter(),
    'push': new PushAdapter(),
    'api': new APIAdapter()
  };

  constructor(private readRecords: any, private writeRecords: any, customAdapters?: Record<string, IConnectorAdapter>) {
    this.idempotencyGuard = new IdempotencyGuard(readRecords, writeRecords);
    this.historyManager = new HistoryManager(readRecords, writeRecords);
    this.jobManager = new JobManager(readRecords, writeRecords);
    this.messageQueue = new MessageQueue(readRecords, writeRecords);
    this.scheduler = new Scheduler(readRecords, writeRecords);
    this.ruleEngine = new RuleEngine(readRecords, writeRecords);
    this.workflowEngine = new WorkflowEngine(readRecords, writeRecords, this.jobManager, this.historyManager);
    this.metricsManager = new MetricsManager();
    
    this.adapters = {
        'email': new EmailAdapter(),
        'whatsapp': new WhatsAppAdapter(),
        'sms': new SMSAdapter(),
        'push': new PushAdapter(),
        'api': new APIAdapter(),
        ...customAdapters
    };
  }

  public async triggerEvent(eventType: string, context: any, user: string): Promise<void> {
    const rules = (await this.ruleEngine.evaluate(context, eventType));
    
    for (const rule of rules) {
      let workflow: AutomationWorkflow = (await this.readRecords('automation_workflows')).find((w: any) => w.id === rule.workflowId);
      
      if (!workflow || !workflow.isActive) {
        continue;
      }

      // Delegate to workflowEngine
      const execution = await this.workflowEngine.startWorkflow(workflow, context, user);
      if (execution) {
          this.metricsManager.recordStart();
          console.log(`[AutomationCore] Started workflow: ${workflow.id}, context: ${context.id}, executionId: ${execution.id}`);
      }
    }
  }

  public async processQueue(): Promise<void> {
    await this.scheduler.processScheduledJobs();
    const job = await this.messageQueue.peekNextPending();
    if (!job) return;

    // Atomic update check
    const currentJobs = await this.readRecords('automation_jobs');
    const jobInDb = currentJobs.find((j: any) => j.id === job.id);
    if (jobInDb.state !== 'pending') return;

    await this.jobManager.updateJobState(job.id, 'running');
    const startTime = Date.now();

    try {
      if (job.actionType === 'internal_wait') {
        // Logic for handling waiting steps
        await this.jobManager.updateJobState(job.id, 'completed');
        this.metricsManager.recordCompletion(Date.now() - startTime);
        console.log(`[AutomationCore] Job completed: ${job.id}, workflow: ${job.payload.executionId}`);
      } else {
        const adapter = this.adapters[job.actionType];
        if (!adapter) throw new Error(`Adapter not configured for ${job.actionType}`);
        await adapter.send(job.payload);
        
        await this.jobManager.updateJobState(job.id, 'completed');
        this.metricsManager.recordCompletion(Date.now() - startTime);
        
        // Register completion through workflowEngine
        await this.workflowEngine.registerCompletion(
          job.payload.executionId || job.id, 
          'success', 
          job.actionType,
          job.payload.templateId || 'dynamic',
          job.createdBy
        );
        console.log(`[AutomationCore] Job completed: ${job.id}, execution: ${job.payload.executionId}, channel: ${job.actionType}`);
      }
    } catch (e: any) {
      this.metricsManager.recordFailure();
      this.metricsManager.recordRetry();
      await this.jobManager.failJobWithRetry(job.id, e.message);
      console.error(`[AutomationCore] Job failed: ${job.id}, error: ${e.message}`);
    }
  }
}
