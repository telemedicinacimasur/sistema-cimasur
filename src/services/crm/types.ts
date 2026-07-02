import { EvaluationOutput } from './contracts';

export type OpportunityType = 'upgrade' | 'reactivation' | 'cross_sell' | 'retention' | 'vip';
export type OpportunityPriority = 'low' | 'medium' | 'high' | 'critical';

export interface OpportunityResult extends EvaluationOutput {
  opportunityType: OpportunityType;
  priority: OpportunityPriority;
  nextReviewDate?: string;
}

export interface RuleResult {
  scoreDelta: number;
  reason: string;
  confidence: number;
  recommendedAction?: string;
  metadata?: Record<string, any>;
}

export interface IOpportunityRule {
  name: string;
  evaluate(context: any): RuleResult | null;
}
