import { z } from 'zod';

export type PolicyEffect = 'allow' | 'deny';

export interface PolicyStatement {
  effect: PolicyEffect;
  actions: string[];
  resources: string[];
  conditions?: Record<string, any>;
}

export interface Policy {
  id: string;
  name: string;
  statements: PolicyStatement[];
}

export class PolicyManager {
  private policies = new Map<string, Policy>();
  private userPolicies = new Map<string, Set<string>>();

  async addPolicy(policy: Policy): Promise<void> {
    this.policies.set(policy.id, policy);
  }

  async removePolicy(policyId: string): Promise<void> {
    this.policies.delete(policyId);
    // Remove policy from all users
    for (const [userId, policies] of this.userPolicies.entries()) {
      policies.delete(policyId);
      if (policies.size === 0) {
        this.userPolicies.delete(userId);
      }
    }
  }

  async attachPolicyToUser(userId: string, policyId: string): Promise<void> {
    if (!this.policies.has(policyId)) {
      throw new Error(`Policy ${policyId} does not exist`);
    }

    if (!this.userPolicies.has(userId)) {
      this.userPolicies.set(userId, new Set());
    }
    this.userPolicies.get(userId)!.add(policyId);
  }

  async detachPolicyFromUser(userId: string, policyId: string): Promise<void> {
    const userPolicies = this.userPolicies.get(userId);
    if (userPolicies) {
      userPolicies.delete(policyId);
      if (userPolicies.size === 0) {
        this.userPolicies.delete(userId);
      }
    }
  }

  async checkPermission(
    userId: string,
    action: string,
    resource: string,
    context: Record<string, any> = {}
  ): Promise<boolean> {
    const userPolicies = this.userPolicies.get(userId);
    if (!userPolicies) return false;

    let allow = false;
    for (const policyId of userPolicies) {
      const policy = this.policies.get(policyId);
      if (!policy) continue;

      for (const statement of policy.statements) {
        if (!this.matchesStatement(statement, action, resource, context)) {
          continue;
        }

        if (statement.effect === 'deny') {
          return false; // Explicit deny takes precedence
        }
        allow = true;
      }
    }

    return allow;
  }

  private matchesStatement(
    statement: PolicyStatement,
    action: string,
    resource: string,
    context: Record<string, any>
  ): boolean {
    // Check action match
    if (!this.matchesPattern(action, statement.actions)) {
      return false;
    }

    // Check resource match
    if (!this.matchesPattern(resource, statement.resources)) {
      return false;
    }

    // Check conditions if present
    if (
      statement.conditions &&
      !this.evaluateConditions(statement.conditions, context)
    ) {
      return false;
    }

    return true;
  }

  private matchesPattern(value: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      // Convert wildcard pattern to regex
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(value);
    });
  }

  private evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    for (const [key, expected] of Object.entries(conditions)) {
      const actual = context[key];

      if (Array.isArray(expected)) {
        if (!expected.includes(actual)) {
          return false;
        }
      } else if (expected !== actual) {
        return false;
      }
    }
    return true;
  }
}
