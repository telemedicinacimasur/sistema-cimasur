import { IdempotencyGuard, HistoryManager, JobManager, MessageQueue, Scheduler } from './JobEngine';
import { RuleEngine } from './RuleEngine';
import { AutomationWorkflow, WorkflowStep, AutomationTemplate } from './types';
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

  public async triggerEvent(eventType: string, context: any, user: string): Promise<void> {
    const rules = await this.ruleEngine.evaluate(context, eventType);
    
    for (const rule of rules) {
      const workflow: AutomationWorkflow = (await this.readRecords('automation_workflows')).find((w: any) => w.id === rule.workflowId);
      if (!workflow || !workflow.isActive) continue;

      // Start workflow
      const firstStep = workflow.steps[workflow.startStepId];
      await this.executeStep(workflow, firstStep, context, user);
    }
  }

  private async executeStep(workflow: AutomationWorkflow, step: WorkflowStep, context: any, user: string): Promise<void> {
    if (step.type === 'action') {
      // Create job
      const jobData = {
        createdBy: user,
        origin: `Workflow:${workflow.id}`,
        priority: 'medium' as any,
        maxRetries: 3,
        actionType: step.actionType || 'api',
        payload: {
          contextId: context.id,
          templateId: step.templateId
        },
        idempotencyKey: `step_${step.id}_context_${context.id}`
      };
      await this.jobManager.createJob(jobData);
    } else if (step.type === 'wait' && step.waitTimeDays) {
      // Schedule next step
      const nextStep = workflow.steps[step.nextStepId!];
      const scheduledTime = new Date();
      scheduledTime.setDate(scheduledTime.getDate() + step.waitTimeDays);
      
      const jobData = {
        createdBy: user,
        origin: `Workflow:${workflow.id}:Wait`,
        priority: 'low' as any,
        maxRetries: 0,
        actionType: 'internal_wait',
        payload: { contextId: context.id, nextStepId: step.nextStepId, workflowId: workflow.id },
        idempotencyKey: `wait_${step.id}_${context.id}`,
        scheduledAt: scheduledTime.toISOString()
      };
      await this.jobManager.createJob(jobData);
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
        
        await this.historyManager.logExecution({
          clientId: job.payload.contextId || 'unknown',
          workflowId: job.origin.split(':')[1],
          stepId: job.id,
          channel: job.actionType,
          templateId: job.payload.templateId || 'dynamic',
          user: job.createdBy,
          result: 'success',
          executionTimeMs: 0
        });
      }
    } catch (e: any) {
      await this.jobManager.failJobWithRetry(job.id, e.message);
    }
  }
}
