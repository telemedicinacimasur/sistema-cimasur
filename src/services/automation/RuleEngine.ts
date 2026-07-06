import { AutomationRule, AutomationWorkflow, WorkflowStep, AutomationTemplate } from './types';

export class RuleEngine {
  constructor(private readRecords: any, private writeRecords: any) {}

  public async evaluate(context: any, eventType: string): Promise<AutomationRule[]> {
    const rules: AutomationRule[] = await this.readRecords('automation_rules') || [];
    // Filter active rules for the event
    return rules.filter(r => r.isActive && r.triggerEvent === eventType && this.evaluateConditions(r.conditions, context));
  }

  private evaluateConditions(conditions: any[], context: any): boolean {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      const { field, operator, value } = condition;
      const fieldValue = field.split('.').reduce((o: any, i: string) => (o ? o[i] : undefined), context);

      let match = false;
      switch (operator) {
        case 'equals': match = fieldValue === value; break;
        case 'greaterThan': match = typeof fieldValue === 'number' && fieldValue > value; break;
        case 'lessThan': match = typeof fieldValue === 'number' && fieldValue < value; break;
        case 'contains': match = typeof fieldValue === 'string' && fieldValue.includes(value); break;
        case 'in': match = Array.isArray(value) && value.includes(fieldValue); break;
        default: match = false;
      }
      if (!match) return false;
    }
    return true;
  }
}
