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

export interface AutomationHistoryRecord {
  id: string;
  timestamp: string;
  clientId: string;
  campaignId?: string;
  channel: string;
  template: string;
  user: string;
  reason: string;
  result: 'success' | 'error';
  executionTimeMs: number;
  providerResponse?: any;
}

export interface IdempotencyRecord {
  id: string;
  key: string;
  timestamp: string;
  jobId: string;
}

export type RuleOperator = 'equals' | 'greaterThan' | 'lessThan' | 'contains' | 'in';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerEvent: string; // e.g., 'tier_upgrade', 'cart_abandoned', 'inactive_90d'
  conditions: {
    field: string;
    operator: RuleOperator;
    value: any;
  }[];
  action: {
    type: string; // e.g., 'send_email', 'create_opportunity', 'notify_exec'
    payloadTemplate: any;
  };
  isActive: boolean;
}
