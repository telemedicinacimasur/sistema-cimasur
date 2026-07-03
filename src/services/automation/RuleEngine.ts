import { AutomationRule } from './types';

export class RuleEngine {
  constructor(private readRecords: any, private writeRecords: any) {}

  public async evaluate(context: any, eventType: string): Promise<AutomationRule[]> {
    const rules: AutomationRule[] = await this.readRecords('automation_rules') || [];
    const activeRules = rules.filter(r => r.isActive && r.triggerEvent === eventType);

    const triggeredRules: AutomationRule[] = [];

    for (const rule of activeRules) {
      if (this.evaluateConditions(rule.conditions, context)) {
        triggeredRules.push(rule);
      }
    }

    return triggeredRules;
  }

  private evaluateConditions(conditions: any[], context: any): boolean {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      const { field, operator, value } = condition;
      // Get nested field value safely
      const fieldValue = field.split('.').reduce((o: any, i: string) => (o ? o[i] : undefined), context);

      let match = false;
      switch (operator) {
        case 'equals':
          match = fieldValue === value;
          break;
        case 'greaterThan':
          match = typeof fieldValue === 'number' && fieldValue > value;
          break;
        case 'lessThan':
          match = typeof fieldValue === 'number' && fieldValue < value;
          break;
        case 'contains':
          match = typeof fieldValue === 'string' && fieldValue.includes(value);
          break;
        case 'in':
          match = Array.isArray(value) && value.includes(fieldValue);
          break;
        default:
          match = false;
      }

      if (!match) return false;
    }

    return true; // All conditions met (AND operator assumed for simplicity)
  }
}
