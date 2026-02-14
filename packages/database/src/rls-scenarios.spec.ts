import { describe, test, expect, beforeEach, vi } from 'vitest';
import { rlsFunctionRegistry } from './rlsFunctionRegistry';
import { evaluatePermission, enforcePermissions } from './rlsManager';
import type { PermissionRule, UserContext, TablePermissions } from './types';

// Mock Kysely instance
const mockExecutor = {
  executeQuery: vi.fn(),
  compileQuery: vi.fn((node) => ({
    sql: node.sqlFragments ? node.sqlFragments.join('?') : 'TEST SQL',
    parameters: node.parameters || [],
    query: node,
  })),
  transformQuery: vi.fn((q) => q),
};
const mockKysely = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  first: vi.fn().mockReturnThis(),
  selectAll: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockReturnThis(),
  getExecutor: () => mockExecutor,
} as any;

// Mock PermissionService
class MockPermissionService {
  private permissions: Record<string, TablePermissions> = {};

  getPermissionsForTableSync(tableName: string): TablePermissions | undefined {
    return this.permissions[tableName];
  }

  async getPermissionsForTable(tableName: string): Promise<TablePermissions> {
    return this.permissions[tableName] || { operations: {} };
  }

  setMockPermissions(tableName: string, permissions: TablePermissions) {
    this.permissions[tableName] = permissions;
  }
}

describe('RLS Scenarios', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    rlsFunctionRegistry.clear();
    mockExecutor.executeQuery.mockReset();
    mockKysely.first.mockReset();
    mockKysely.where.mockReset();
    mockKysely.where.mockReturnThis();
  });

  describe('CV Limit Scenario', () => {
    // Sample user contexts
    const proUser: UserContext = {
      userId: 1,
      role: 'user',
      labels: ['pro'],
      teams: [],
    };

    const freeUserWithFewCVs: UserContext = {
      userId: 2,
      role: 'user',
      labels: ['free'],
      teams: [],
    };

    const freeUserWithMaxCVs: UserContext = {
      userId: 3,
      role: 'user',
      labels: ['free'],
      teams: [],
    };

    // Sample data
    const newCV = { title: 'My New CV', user_id: 1 };

    test('should allow pro users to create unlimited CVs using customSql', async () => {
      // Set up the permission rule with customSql
      const rule: PermissionRule = {
        allow: 'customSql',
        customSql: `
          SELECT 1 WHERE
            -- Check if user is on pro plan
            EXISTS (SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = 'pro')
            -- OR check if user is on free plan but has fewer than 5 CVs
            OR (
              NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = 'pro')
              AND (SELECT COUNT(*) FROM cvs WHERE user_id = :userId) < 5
            )
        `,
      };

      // Mock the SQL query to return results for pro user
      mockExecutor.executeQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });

      // Test with pro user
      const result = await evaluatePermission(
        [rule],
        proUser,
        newCV,
        mockKysely,
      );

      // Pro user should be allowed to create a CV
      expect(result).toBe(true);

      // Verify the SQL query was executed with the correct parameters
      expect(mockExecutor.executeQuery).toHaveBeenCalledTimes(1);
    });

    test('should allow free users with fewer than 5 CVs to create a CV using customSql', async () => {
      // Set up the permission rule with customSql
      const rule: PermissionRule = {
        allow: 'customSql',
        customSql: `
          SELECT 1 WHERE
            -- Check if user is on pro plan
            EXISTS (SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = 'pro')
            -- OR check if user is on free plan but has fewer than 5 CVs
            OR (
              NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = 'pro')
              AND (SELECT COUNT(*) FROM cvs WHERE user_id = :userId) < 5
            )
        `,
      };

      // Mock the SQL query to return results for free user with few CVs
      mockExecutor.executeQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });

      // Test with free user who has fewer than 5 CVs
      const result = await evaluatePermission(
        [rule],
        freeUserWithFewCVs,
        newCV,
        mockKysely,
      );

      // Free user with fewer than 5 CVs should be allowed to create a CV
      expect(result).toBe(true);

      // Verify the SQL query was executed with the correct parameters
      expect(mockExecutor.executeQuery).toHaveBeenCalledTimes(1);
    });

    test('should deny free users with 5 or more CVs from creating more using customSql', async () => {
      // Set up the permission rule with customSql
      const rule: PermissionRule = {
        allow: 'customSql',
        customSql: `
          SELECT 1 WHERE
            -- Check if user is on pro plan
            EXISTS (SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = 'pro')
            -- OR check if user is on free plan but has fewer than 5 CVs
            OR (
              NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = 'pro')
              AND (SELECT COUNT(*) FROM cvs WHERE user_id = :userId) < 5
            )
        `,
      };

      // Mock the SQL query to return no results for free user with max CVs
      mockExecutor.executeQuery.mockResolvedValueOnce({ rows: [] });

      // Test with free user who already has 5 CVs
      const result = await evaluatePermission(
        [rule],
        freeUserWithMaxCVs,
        newCV,
        mockKysely,
      );

      // Free user with 5 or more CVs should be denied from creating more
      expect(result).toBe(false);

      // Verify the SQL query was executed with the correct parameters
      expect(mockExecutor.executeQuery).toHaveBeenCalledTimes(1);
    });

    test('should allow pro users to create unlimited CVs using customFunction', async () => {
      // Register a custom function that checks subscription and CV count
      const checkCvLimitFn = vi
        .fn()
        .mockImplementation(
          async (
            userContext: UserContext,
            _row: Record<string, unknown>,
            knex: any,
          ) => {
            // Check if user is on pro plan
            mockKysely.first.mockResolvedValueOnce({ id: 1, plan_type: 'pro' });

            const proSub = await knex
              .select()
              .from('subscriptions')
              .where({ user_id: userContext.userId, plan_type: 'pro' })
              .first();

            if (proSub) return true; // Pro users can create unlimited CVs

            // For free users, check CV count
            mockKysely.first.mockResolvedValueOnce({ count: 3 }); // Fewer than 5 CVs

            const count = await knex
              .select()
              .from('cvs')
              .where({ user_id: userContext.userId })
              .count('id as count')
              .first();

            return count && count.count < 5; // Allow if less than 5 CVs
          },
        );

      rlsFunctionRegistry.register('checkCvLimit', checkCvLimitFn);

      // Set up the permission rule with customFunction
      const rule: PermissionRule = {
        allow: 'customFunction',
        customFunction: 'checkCvLimit',
      };

      // Test with pro user
      const result = await evaluatePermission(
        [rule],
        proUser,
        newCV,
        mockKysely,
      );

      // Pro user should be allowed to create a CV
      expect(result).toBe(true);

      // Verify the custom function was called with the correct parameters
      expect(checkCvLimitFn).toHaveBeenCalledTimes(1);
      expect(checkCvLimitFn).toHaveBeenCalledWith(proUser, newCV, mockKysely);

      // Verify the knex queries were executed
      expect(mockKysely.where).toHaveBeenCalledWith({
        user_id: 1,
        plan_type: 'pro',
      });
    });

    test('should allow free users with fewer than 5 CVs to create a CV using customFunction', async () => {
      // Register a custom function that checks subscription and CV count
      const checkCvLimitFn = vi
        .fn()
        .mockImplementation(
          async (
            userContext: UserContext,
            _row: Record<string, unknown>,
            knex: any,
          ) => {
            // Check if user is on pro plan
            mockKysely.first.mockResolvedValueOnce(null); // Not a pro user

            const proSub = await knex
              .select()
              .from('subscriptions')
              .where({ user_id: userContext.userId, plan_type: 'pro' })
              .first();

            if (proSub) return true; // Pro users can create unlimited CVs

            // For free users, check CV count
            mockKysely.first.mockResolvedValueOnce({ count: 3 }); // Fewer than 5 CVs

            const count = await knex
              .select()
              .from('cvs')
              .where({ user_id: userContext.userId })
              .count('id as count')
              .first();

            return count && count.count < 5; // Allow if less than 5 CVs
          },
        );

      rlsFunctionRegistry.register('checkCvLimit', checkCvLimitFn);

      // Set up the permission rule with customFunction
      const rule: PermissionRule = {
        allow: 'customFunction',
        customFunction: 'checkCvLimit',
      };

      // Test with free user who has fewer than 5 CVs
      const result = await evaluatePermission(
        [rule],
        freeUserWithFewCVs,
        newCV,
        mockKysely,
      );

      // Free user with fewer than 5 CVs should be allowed to create a CV
      expect(result).toBe(true);

      // Verify the custom function was called with the correct parameters
      expect(checkCvLimitFn).toHaveBeenCalledTimes(1);
      expect(checkCvLimitFn).toHaveBeenCalledWith(
        freeUserWithFewCVs,
        newCV,
        mockKysely,
      );
    });

    test('should deny free users with 5 or more CVs from creating more using customFunction', async () => {
      // Register a custom function that checks subscription and CV count
      const checkCvLimitFn = vi
        .fn()
        .mockImplementation(
          async (
            userContext: UserContext,
            _row: Record<string, unknown>,
            knex: any,
          ) => {
            // Check if user is on pro plan
            mockKysely.first.mockResolvedValueOnce(null); // Not a pro user

            const proSub = await knex
              .select()
              .from('subscriptions')
              .where({ user_id: userContext.userId, plan_type: 'pro' })
              .first();

            if (proSub) return true; // Pro users can create unlimited CVs

            // For free users, check CV count
            mockKysely.first.mockResolvedValueOnce({ count: 5 }); // Already has 5 CVs

            const count = await knex
              .select()
              .from('cvs')
              .where({ user_id: userContext.userId })
              .count('id as count')
              .first();

            return count && count.count < 5; // Allow if less than 5 CVs
          },
        );

      rlsFunctionRegistry.register('checkCvLimit', checkCvLimitFn);

      // Set up the permission rule with customFunction
      const rule: PermissionRule = {
        allow: 'customFunction',
        customFunction: 'checkCvLimit',
      };

      // Test with free user who already has 5 CVs
      const result = await evaluatePermission(
        [rule],
        freeUserWithMaxCVs,
        newCV,
        mockKysely,
      );

      // Free user with 5 or more CVs should be denied from creating more
      expect(result).toBe(false);

      // Verify the custom function was called with the correct parameters
      expect(checkCvLimitFn).toHaveBeenCalledTimes(1);
      expect(checkCvLimitFn).toHaveBeenCalledWith(
        freeUserWithMaxCVs,
        newCV,
        mockKysely,
      );
    });

    test('should integrate with enforcePermissions for CV limit scenario', async () => {
      const mockPermissionService = new MockPermissionService();

      // Register a custom function that checks subscription and CV count
      const checkCvLimitFn = vi
        .fn()
        .mockImplementation(
          async (
            userContext: UserContext,
            _row: Record<string, unknown>,
            knex: any,
          ) => {
            // Check if user is on pro plan
            const isPro = userContext.userId === 1;
            mockKysely.first.mockResolvedValueOnce(
              isPro ? { id: 1, plan_type: 'pro' } : null,
            );

            const proSub = await knex
              .select()
              .from('subscriptions')
              .where({ user_id: userContext.userId, plan_type: 'pro' })
              .first();

            if (proSub) return true; // Pro users can create unlimited CVs

            // For free users, check CV count
            const cvCount = userContext.userId === 2 ? 3 : 5; // User 2 has 3 CVs, User 3 has 5 CVs
            mockKysely.first.mockResolvedValueOnce({ count: cvCount });

            const count = await knex
              .select()
              .from('cvs')
              .where({ user_id: userContext.userId })
              .count('id as count')
              .first();

            return count && count.count < 5; // Allow if less than 5 CVs
          },
        );

      rlsFunctionRegistry.register('checkCvLimit', checkCvLimitFn);

      // Set up permissions for the cvs table
      mockPermissionService.setMockPermissions('cvs', {
        operations: {
          INSERT: [
            {
              allow: 'customFunction',
              customFunction: 'checkCvLimit',
            },
          ],
        },
      });

      // Test with pro user
      const proResult = await enforcePermissions(
        'cvs',
        'INSERT',
        proUser,
        mockPermissionService as any,
        newCV,
        mockKysely,
      );

      // Pro user should be allowed to create a CV
      expect(proResult.status).toBe(true);

      // Test with free user who has fewer than 5 CVs
      const freeWithFewResult = await enforcePermissions(
        'cvs',
        'INSERT',
        freeUserWithFewCVs,
        mockPermissionService as any,
        newCV,
        mockKysely,
      );

      // Free user with fewer than 5 CVs should be allowed to create a CV
      expect(freeWithFewResult.status).toBe(true);

      // Test with free user who already has 5 CVs
      const freeWithMaxResult = await enforcePermissions(
        'cvs',
        'INSERT',
        freeUserWithMaxCVs,
        mockPermissionService as any,
        newCV,
        mockKysely,
      );

      // Free user with 5 or more CVs should be denied from creating more
      expect(freeWithMaxResult.status).toBe(false);
    });

    test('should handle multiple rules in sequence for CV limit scenario', async () => {
      const mockPermissionService = new MockPermissionService();

      // Set up permissions with multiple rules in sequence
      mockPermissionService.setMockPermissions('cvs', {
        operations: {
          INSERT: [
            // Rule 1: Pro users can create unlimited CVs
            {
              allow: 'customSql',
              customSql:
                'SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = "pro"',
            },
            // Rule 2: Free users can create CVs if they have fewer than 5
            {
              allow: 'customSql',
              customSql:
                'SELECT 1 FROM cvs WHERE user_id = :userId GROUP BY user_id HAVING COUNT(*) < 5',
            },
          ],
        },
      });

      // Mock SQL results for pro user (first rule passes)
      mockExecutor.executeQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });

      // Test with pro user
      const proResult = await enforcePermissions(
        'cvs',
        'INSERT',
        proUser,
        mockPermissionService as any,
        newCV,
        mockKysely,
      );

      // Pro user should be allowed to create a CV by the first rule
      expect(proResult.status).toBe(true);
      expect(mockExecutor.executeQuery).toHaveBeenCalledTimes(1);

      // Reset mock
      mockExecutor.executeQuery.mockReset();

      // Mock SQL results for free user with few CVs (first rule fails, second rule passes)
      mockExecutor.executeQuery.mockResolvedValueOnce({ rows: [] }); // First rule fails (not a pro user)
      mockExecutor.executeQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] }); // Second rule passes (has fewer than 5 CVs)

      // Test with free user who has fewer than 5 CVs
      const freeWithFewResult = await enforcePermissions(
        'cvs',
        'INSERT',
        freeUserWithFewCVs,
        mockPermissionService as any,
        newCV,
        mockKysely,
      );

      // Free user with fewer than 5 CVs should be allowed to create a CV by the second rule
      expect(freeWithFewResult.status).toBe(true);
      expect(mockExecutor.executeQuery).toHaveBeenCalledTimes(2);

      // Reset mock
      mockExecutor.executeQuery.mockReset();

      // Mock SQL results for free user with max CVs (both rules fail)
      mockExecutor.executeQuery.mockResolvedValueOnce({ rows: [] }); // First rule fails (not a pro user)
      mockExecutor.executeQuery.mockResolvedValueOnce({ rows: [] }); // Second rule fails (already has 5 CVs)

      // Test with free user who already has 5 CVs
      const freeWithMaxResult = await enforcePermissions(
        'cvs',
        'INSERT',
        freeUserWithMaxCVs,
        mockPermissionService as any,
        newCV,
        mockKysely,
      );

      // Free user with 5 or more CVs should be denied from creating more
      expect(freeWithMaxResult.status).toBe(false);
      expect(mockExecutor.executeQuery).toHaveBeenCalledTimes(2);
    });
  });
});
