export type JobState = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobPriority = 'high' | 'medium' | 'low';

export interface Job {
  id: string;
  createdAt: string;
  createdBy: string;
  origin: string;
  priority: JobPriority;
  state: JobState;
  executionTimeMs?: number;
  result?: any;
  error?: string;
  retries: number;
  maxRetries: number;
  nextRetryAt?: string;
  scheduledAt?: string;
  actionType: string;
  payload: any;
  idempotencyKey: string;
}

export interface IdempotencyRecord {
  id: string;
  key: string;
  timestamp: string;
  jobId: string;
}

export interface AutomationHistoryRecord {
  id: string;
  timestamp: string;
  clientId: string;
  workflowId: string;
  stepId: string;
  channel: string;
  templateId: string;
  user: string;
  result: 'success' | 'error';
  executionTimeMs: number;
  providerResponse?: any;
}

// 1. Template
export interface AutomationTemplate {
  id: string;
  name: string;
  objective: string;
  variables: string[];
  content: string; // The template content (e.g., mustache format)
  status: 'draft' | 'active' | 'archived';
  version: number;
  lastUpdated: string;
}

// 2. Workflow
export interface WorkflowStep {
  id: string;
  type: 'action' | 'wait';
  actionType?: string; // e.g., 'email', 'whatsapp', 'internal_update'
  templateId?: string;
  waitTimeDays?: number;
  nextStepId?: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  steps: Record<string, WorkflowStep>;
  startStepId: string;
  isActive: boolean;
}

// 3. Dynamic Segment
export interface AutomationSegment {
  id: string;
  name: string;
  conditions: AutomationCondition[];
}

export type RuleOperator = 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'in';
export interface AutomationCondition {
  field: string;
  operator: RuleOperator;
  value: any;
}

// 4. Rule Engine (Triggers Workflows)
export interface AutomationRule {
  id: string;
  name: string;
  triggerEvent: string; 
  conditions: AutomationCondition[];
  workflowId: string; // Trigger this workflow
  isActive: boolean;
}
