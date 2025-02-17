import { z } from 'zod';

export type RuleContext = {
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  attributes: Record<string, any>;
};

export type RuleCondition = {
  field: string;
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'exists'
    | 'regex';
  value: any;
};

export type Rule = {
  id: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  effect: 'allow' | 'deny';
};

export class DynamicRuleEngine {
  private rules = new Map<string, Rule>();

  addRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  async evaluate(context: RuleContext): Promise<boolean> {
    // Sort rules by priority
    const sortedRules = Array.from(this.rules.values()).sort(
      (a, b) => b.priority - a.priority
    );

    for (const rule of sortedRules) {
      if (await this.evaluateRule(rule, context)) {
        return rule.effect === 'allow';
      }
    }

    return false; // Default deny if no rules match
  }

  private async evaluateRule(
    rule: Rule,
    context: RuleContext
  ): Promise<boolean> {
    for (const condition of rule.conditions) {
      if (!(await this.evaluateCondition(condition, context))) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(
    condition: RuleCondition,
    context: RuleContext
  ): Promise<boolean> {
    const value = this.getFieldValue(condition.field, context);

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return value > condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lt':
        return value < condition.value;
      case 'lte':
        return value <= condition.value;
      case 'in':
        return (
          Array.isArray(condition.value) && condition.value.includes(value)
        );
      case 'nin':
        return (
          Array.isArray(condition.value) && !condition.value.includes(value)
        );
      case 'exists':
        return value !== undefined && value !== null;
      case 'regex':
        return new RegExp(condition.value).test(String(value));
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: RuleContext): any {
    return field.split('.').reduce((obj, key) => obj?.[key], context);
  }
}

// Validation schemas for runtime configuration
export const ruleConditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'nin',
    'exists',
    'regex',
  ]),
  value: z.any(),
});

export const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  priority: z.number().int().min(0),
  conditions: z.array(ruleConditionSchema),
  effect: z.enum(['allow', 'deny']),
});
