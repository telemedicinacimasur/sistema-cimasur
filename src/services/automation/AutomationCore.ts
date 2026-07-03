import { IdempotencyGuard, HistoryManager, JobManager, MessageQueue, Scheduler } from './JobEngine';
import { RuleEngine } from './RuleEngine';
import { Job, AutomationHistoryRecord } from './types';
import { EmailAdapter, WhatsAppAdapter, SMSAdapter, PushAdapter, APIAdapter, IConnectorAdapter } from './adapters';

export class AutomationCore {
  private idempotencyGuard: IdempotencyGuard;
  private historyManager: HistoryManager;
  private jobManager: JobManager;
  private messageQueue: MessageQueue;
  private scheduler: Scheduler;
  private ruleEngine: RuleEngine;

  private adapters: Record<string, IConnectorAdapter> = {
    'email': new EmailAdapter(),
    'whatsapp': new WhatsAppAdapter(),
    'sms': new SMSAdapter(),
    'push': new PushAdapter(),
    'api': new APIAdapter()
  };

  constructor(private readRecords: any, private writeRecords: any) {
    this.idempotencyGuard = new IdempotencyGuard(readRecords, writeRecords);
    this.historyManager = new HistoryManager(readRecords, writeRecords);
    this.jobManager = new JobManager(readRecords, writeRecords);
    this.messageQueue = new MessageQueue(readRecords, writeRecords);
    this.scheduler = new Scheduler(readRecords, writeRecords);
    this.ruleEngine = new RuleEngine(readRecords, writeRecords);
  }

  // Phase 7 Base: Fire events to trigger rules
  public async triggerEvent(eventType: string, context: any, user: string): Promise<void> {
    const rules = await this.ruleEngine.evaluate(context, eventType);
    
    for (const rule of rules) {
      const idempotencyKey = `rule_${rule.id}_context_${context.id || Date.now()}`;
      
      const isNew = await this.idempotencyGuard.checkAndLock(idempotencyKey, 'pending_creation');
      if (!isNew) continue; // Already fired

      const jobData = {
        createdBy: user,
        origin: 'RuleEngine',
        priority: 'medium' as any,
        maxRetries: 3,
        actionType: rule.action.type,
        payload: {
          ...rule.action.payloadTemplate,
          contextId: context.id
        },
        idempotencyKey
      };

      await this.jobManager.createJob(jobData);
    }
  }

  // Dispatcher Worker Simulator
  public async processQueue(): Promise<void> {
    // Check scheduled jobs first
    await this.scheduler.processScheduledJobs();

    // Pull next job
    const job = await this.messageQueue.peekNextPending();
    if (!job) return; // Queue is empty

    await this.jobManager.updateJobState(job.id, 'running');

    const startTime = Date.now();
    try {
      const adapter = this.adapters[job.actionType];
      if (!adapter) {
        throw new Error(`Adapter for actionType ${job.actionType} not found`);
      }

      const response = await adapter.send(job.payload);

      if (response.success) {
        await this.jobManager.updateJobState(job.id, 'completed', undefined, Date.now() - startTime);
        
        await this.historyManager.logExecution({
          clientId: job.payload.contextId || 'unknown',
          campaignId: job.payload.campaignId,
          channel: job.actionType,
          template: job.payload.templateId || 'dynamic',
          user: job.createdBy,
          reason: 'Triggered by Automation Engine',
          result: 'success',
          executionTimeMs: Date.now() - startTime,
          providerResponse: response.providerDetails
        });
      } else {
        throw new Error(response.error || 'Unknown provider error');
      }

    } catch (e: any) {
      await this.jobManager.failJobWithRetry(job.id, e.message);
      await this.historyManager.logExecution({
        clientId: job.payload.contextId || 'unknown',
        campaignId: job.payload.campaignId,
        channel: job.actionType,
        template: job.payload.templateId || 'dynamic',
        user: job.createdBy,
        reason: 'Failed execution',
        result: 'error',
        executionTimeMs: Date.now() - startTime,
        providerResponse: { error: e.message }
      });
    }
  }
}
