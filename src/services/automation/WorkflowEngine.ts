import { AutomationWorkflow, WorkflowStep } from './types';
import { JobManager, HistoryManager, IdempotencyGuard } from './JobEngine';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  context: any;
  user: string;
  currentStepId: string;
  state: 'running' | 'completed' | 'failed' | 'waiting';
  createdAt: string;
  updatedAt: string;
}

export class WorkflowEngine {
  constructor(
    private readRecords: any, 
    private writeRecords: any,
    private jobManager: JobManager,
    private historyManager: HistoryManager
  ) {
      this.idempotencyGuard = new IdempotencyGuard(readRecords, writeRecords);
  }
  
  private idempotencyGuard: IdempotencyGuard;

  public async startWorkflow(workflow: AutomationWorkflow, context: any, user: string): Promise<WorkflowExecution | null> {
    const idempotencyKey = `wf_${workflow.id}_ctx_${context.id}`;
    const canProceed = await this.idempotencyGuard.checkAndLock(idempotencyKey, 'workflow_init');
    if (!canProceed) {
        console.log('DEBUG: Idempotency check failed for:', idempotencyKey);
        return null;
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${workflow.id}`,
      workflowId: workflow.id,
      context,
      user,
      currentStepId: workflow.startStepId,
      state: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const currentExecs = await this.readRecords('workflow_executions');
    await this.writeRecords('workflow_executions', [...(currentExecs || []), execution]);
    
    await this.executeStep(execution, workflow.steps[workflow.startStepId]);
    
    return execution;
  }

  private async executeStep(execution: WorkflowExecution, step: WorkflowStep): Promise<void> {
    if (step.type === 'action') {
      const jobData = {
        createdBy: execution.user,
        origin: `Workflow:${execution.workflowId}:Exec:${execution.id}`,
        priority: 'medium' as any,
        maxRetries: 3,
        actionType: step.actionType || 'api',
        payload: {
          contextId: execution.context.id,
          templateId: step.templateId,
          executionId: execution.id
        },
        idempotencyKey: `step_${step.id}_exec_${execution.id}`
      };
      await this.jobManager.createJob(jobData);
    } else if (step.type === 'wait' && step.waitTimeDays) {
      // ... logic for scheduling wait
    }
    
    // Update execution state if needed
  }
  
  public async registerCompletion(executionId: string, result: 'success' | 'error', channel: string, templateId: string, user: string): Promise<void> {
      // Check if already logged
      const existingHistory = await this.readRecords('automation_history') || [];
      if (existingHistory.find((h: any) => h.stepId === executionId && h.channel === channel)) {
          return;
      }
      
      await this.historyManager.logExecution({
          clientId: 'contextId', // Need context
          workflowId: 'workflowId', // Need workflowId
          stepId: executionId,
          channel,
          templateId,
          user,
          result,
          executionTimeMs: 0
      });
  }
}
