import { IdempotencyGuard, HistoryManager, JobManager, MessageQueue, Scheduler } from './JobEngine';
import { RuleEngine } from './RuleEngine';
import { AutomationWorkflow, WorkflowStep, AutomationTemplate } from './types';
import { EmailAdapter, WhatsAppAdapter, SMSAdapter, PushAdapter, APIAdapter, IConnectorAdapter } from './adapters';
import { WorkflowEngine } from './WorkflowEngine';
import { Reactivation90Workflow, Reactivation90Rule } from './definitions';

export class AutomationCore {
  private idempotencyGuard: IdempotencyGuard;
  private historyManager: HistoryManager;
  private jobManager: JobManager;
  private messageQueue: MessageQueue;
  private scheduler: Scheduler;
  private ruleEngine: RuleEngine;
  private workflowEngine: WorkflowEngine;

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
      await this.workflowEngine.startWorkflow(workflow, context, user);
    }
  }

  public async processQueue(): Promise<void> {
    await this.scheduler.processScheduledJobs();
    const job = await this.messageQueue.peekNextPending();
    if (!job) return;

    await this.jobManager.updateJobState(job.id, 'running');

    try {
      if (job.actionType === 'internal_wait') {
        // Logic for handling waiting steps
        await this.jobManager.updateJobState(job.id, 'completed');
      } else {
        const adapter = this.adapters[job.actionType];
        if (!adapter) throw new Error(`Adapter not configured for ${job.actionType}`);
        await adapter.send(job.payload);
        
        await this.jobManager.updateJobState(job.id, 'completed');
        
        // Register completion through workflowEngine
        await this.workflowEngine.registerCompletion(
          job.payload.executionId || job.id, 
          'success', 
          job.actionType,
          job.payload.templateId || 'dynamic',
          job.createdBy
        );
      }
    } catch (e: any) {
      await this.jobManager.failJobWithRetry(job.id, e.message);
    }
  }
}
