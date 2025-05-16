import { rlsFunctionRegistry } from './rlsFunctionRegistry';
import { evaluatePermission, enforcePermissions } from './rlsManager';
import type { PermissionRule, UserContext, TablePermissions } from './types';

// Mock Knex instance
const mockKnex = {
  raw: jest.fn(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(),
  first: jest.fn(),
} as any;

// Mock PermissionService
class MockPermissionService {
  private permissions: Record<string, TablePermissions> = {};

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
    jest.clearAllMocks();
    rlsFunctionRegistry.clear();
    mockKnex.raw.mockReset();
    mockKnex.first.mockReset();
    mockKnex.where.mockReset();
    mockKnex.where.mockReturnThis();
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
      mockKnex.raw.mockResolvedValueOnce([[{ count: 1 }]]);

      // Test with pro user
      const result = await evaluatePermission([rule], proUser, newCV, mockKnex);

      // Pro user should be allowed to create a CV
      expect(result).toBe(true);

      // Verify the SQL query was executed with the correct parameters
      expect(mockKnex.raw).toHaveBeenCalledTimes(1);
      const sqlCall = mockKnex.raw.mock.calls[0][0];
      expect(sqlCall).toContain("EXISTS (SELECT 1 FROM subscriptions WHERE user_id = 1 AND plan_type = 'pro')");
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
      mockKnex.raw.mockResolvedValueOnce([[{ count: 1 }]]);

      // Test with free user who has fewer than 5 CVs
      const result = await evaluatePermission([rule], freeUserWithFewCVs, newCV, mockKnex);

      // Free user with fewer than 5 CVs should be allowed to create a CV
      expect(result).toBe(true);

      // Verify the SQL query was executed with the correct parameters
      expect(mockKnex.raw).toHaveBeenCalledTimes(1);
      const sqlCall = mockKnex.raw.mock.calls[0][0];
      expect(sqlCall).toContain("EXISTS (SELECT 1 FROM subscriptions WHERE user_id = 2 AND plan_type = 'pro')");
      expect(sqlCall).toContain("(SELECT COUNT(*) FROM cvs WHERE user_id = 2) < 5");
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
      mockKnex.raw.mockResolvedValueOnce([]);

      // Test with free user who already has 5 CVs
      const result = await evaluatePermission([rule], freeUserWithMaxCVs, newCV, mockKnex);

      // Free user with 5 or more CVs should be denied from creating more
      expect(result).toBe(false);

      // Verify the SQL query was executed with the correct parameters
      expect(mockKnex.raw).toHaveBeenCalledTimes(1);
      const sqlCall = mockKnex.raw.mock.calls[0][0];
      expect(sqlCall).toContain("EXISTS (SELECT 1 FROM subscriptions WHERE user_id = 3 AND plan_type = 'pro')");
      expect(sqlCall).toContain("(SELECT COUNT(*) FROM cvs WHERE user_id = 3) < 5");
    });

    test('should allow pro users to create unlimited CVs using customFunction', async () => {
      // Register a custom function that checks subscription and CV count
      const checkCvLimitFn = jest.fn().mockImplementation(async (userContext: UserContext, _row: Record<string, unknown>, knex: any) => {
        // Check if user is on pro plan
        mockKnex.first.mockResolvedValueOnce({ id: 1, plan_type: 'pro' });
        
        const proSub = await knex.select()
          .from('subscriptions')
          .where({ user_id: userContext.userId, plan_type: 'pro' })
          .first();
        
        if (proSub) return true; // Pro users can create unlimited CVs
        
        // For free users, check CV count
        mockKnex.first.mockResolvedValueOnce({ count: 3 }); // Fewer than 5 CVs
        
        const count = await knex.select()
          .from('cvs')
          .where({ user_id: userContext.userId })
          .count('id as count')
          .first();
        
        return count && count.count < 5; // Allow if less than 5 CVs
      });
      
      rlsFunctionRegistry.register('checkCvLimit', checkCvLimitFn);
      
      // Set up the permission rule with customFunction
      const rule: PermissionRule = {
        allow: 'customFunction',
        customFunction: 'checkCvLimit',
      };

      // Test with pro user
      const result = await evaluatePermission([rule], proUser, newCV, mockKnex);

      // Pro user should be allowed to create a CV
      expect(result).toBe(true);

      // Verify the custom function was called with the correct parameters
      expect(checkCvLimitFn).toHaveBeenCalledTimes(1);
      expect(checkCvLimitFn).toHaveBeenCalledWith(proUser, newCV, mockKnex);
      
      // Verify the knex queries were executed
      expect(mockKnex.where).toHaveBeenCalledWith({ user_id: 1, plan_type: 'pro' });
    });

    test('should allow free users with fewer than 5 CVs to create a CV using customFunction', async () => {
      // Register a custom function that checks subscription and CV count
      const checkCvLimitFn = jest.fn().mockImplementation(async (userContext: UserContext, _row: Record<string, unknown>, knex: any) => {
        // Check if user is on pro plan
        mockKnex.first.mockResolvedValueOnce(null); // Not a pro user
        
        const proSub = await knex.select()
          .from('subscriptions')
          .where({ user_id: userContext.userId, plan_type: 'pro' })
          .first();
        
        if (proSub) return true; // Pro users can create unlimited CVs
        
        // For free users, check CV count
        mockKnex.first.mockResolvedValueOnce({ count: 3 }); // Fewer than 5 CVs
        
        const count = await knex.select()
          .from('cvs')
          .where({ user_id: userContext.userId })
          .count('id as count')
          .first();
        
        return count && count.count < 5; // Allow if less than 5 CVs
      });
      
      rlsFunctionRegistry.register('checkCvLimit', checkCvLimitFn);
      
      // Set up the permission rule with customFunction
      const rule: PermissionRule = {
        allow: 'customFunction',
        customFunction: 'checkCvLimit',
      };

      // Test with free user who has fewer than 5 CVs
      const result = await evaluatePermission([rule], freeUserWithFewCVs, newCV, mockKnex);

      // Free user with fewer than 5 CVs should be allowed to create a CV
      expect(result).toBe(true);

      // Verify the custom function was called with the correct parameters
      expect(checkCvLimitFn).toHaveBeenCalledTimes(1);
      expect(checkCvLimitFn).toHaveBeenCalledWith(freeUserWithFewCVs, newCV, mockKnex);
    });

    test('should deny free users with 5 or more CVs from creating more using customFunction', async () => {
      // Register a custom function that checks subscription and CV count
      const checkCvLimitFn = jest.fn().mockImplementation(async (userContext: UserContext, _row: Record<string, unknown>, knex: any) => {
        // Check if user is on pro plan
        mockKnex.first.mockResolvedValueOnce(null); // Not a pro user
        
        const proSub = await knex.select()
          .from('subscriptions')
          .where({ user_id: userContext.userId, plan_type: 'pro' })
          .first();
        
        if (proSub) return true; // Pro users can create unlimited CVs
        
        // For free users, check CV count
        mockKnex.first.mockResolvedValueOnce({ count: 5 }); // Already has 5 CVs
        
        const count = await knex.select()
          .from('cvs')
          .where({ user_id: userContext.userId })
          .count('id as count')
          .first();
        
        return count && count.count < 5; // Allow if less than 5 CVs
      });
      
      rlsFunctionRegistry.register('checkCvLimit', checkCvLimitFn);
      
      // Set up the permission rule with customFunction
      const rule: PermissionRule = {
        allow: 'customFunction',
        customFunction: 'checkCvLimit',
      };

      // Test with free user who already has 5 CVs
      const result = await evaluatePermission([rule], freeUserWithMaxCVs, newCV, mockKnex);

      // Free user with 5 or more CVs should be denied from creating more
      expect(result).toBe(false);

      // Verify the custom function was called with the correct parameters
      expect(checkCvLimitFn).toHaveBeenCalledTimes(1);
      expect(checkCvLimitFn).toHaveBeenCalledWith(freeUserWithMaxCVs, newCV, mockKnex);
    });

    test('should integrate with enforcePermissions for CV limit scenario', async () => {
      const mockPermissionService = new MockPermissionService();
      
      // Register a custom function that checks subscription and CV count
      const checkCvLimitFn = jest.fn().mockImplementation(async (userContext: UserContext, _row: Record<string, unknown>, knex: any) => {
        // Check if user is on pro plan
        const isPro = userContext.userId === 1;
        mockKnex.first.mockResolvedValueOnce(isPro ? { id: 1, plan_type: 'pro' } : null);
        
        const proSub = await knex.select()
          .from('subscriptions')
          .where({ user_id: userContext.userId, plan_type: 'pro' })
          .first();
        
        if (proSub) return true; // Pro users can create unlimited CVs
        
        // For free users, check CV count
        const cvCount = userContext.userId === 2 ? 3 : 5; // User 2 has 3 CVs, User 3 has 5 CVs
        mockKnex.first.mockResolvedValueOnce({ count: cvCount });
        
        const count = await knex.select()
          .from('cvs')
          .where({ user_id: userContext.userId })
          .count('id as count')
          .first();
        
        return count && count.count < 5; // Allow if less than 5 CVs
      });
      
      rlsFunctionRegistry.register('checkCvLimit', checkCvLimitFn);
      
      // Set up permissions for the cvs table
      mockPermissionService.setMockPermissions('cvs', {
        operations: {
          INSERT: [
            {
              allow: 'customFunction',
              customFunction: 'checkCvLimit',
            }
          ]
        }
      });

      // Test with pro user
      const proResult = await enforcePermissions(
        'cvs',
        'INSERT',
        proUser,
        mockPermissionService as any,
        newCV,
        mockKnex
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
        mockKnex
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
        mockKnex
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
              customSql: 'SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = "pro"'
            },
            // Rule 2: Free users can create CVs if they have fewer than 5
            {
              allow: 'customSql',
              customSql: 'SELECT 1 FROM cvs WHERE user_id = :userId GROUP BY user_id HAVING COUNT(*) < 5'
            }
          ]
        }
      });

      // Mock SQL results for pro user (first rule passes)
      mockKnex.raw.mockResolvedValueOnce([[{ count: 1 }]]);
      
      // Test with pro user
      const proResult = await enforcePermissions(
        'cvs',
        'INSERT',
        proUser,
        mockPermissionService as any,
        newCV,
        mockKnex
      );
      
      // Pro user should be allowed to create a CV by the first rule
      expect(proResult.status).toBe(true);
      expect(mockKnex.raw).toHaveBeenCalledTimes(1);
      
      // Reset mock
      mockKnex.raw.mockReset();
      
      // Mock SQL results for free user with few CVs (first rule fails, second rule passes)
      mockKnex.raw.mockResolvedValueOnce([]); // First rule fails (not a pro user)
      mockKnex.raw.mockResolvedValueOnce([[{ count: 1 }]]); // Second rule passes (has fewer than 5 CVs)
      
      // Test with free user who has fewer than 5 CVs
      const freeWithFewResult = await enforcePermissions(
        'cvs',
        'INSERT',
        freeUserWithFewCVs,
        mockPermissionService as any,
        newCV,
        mockKnex
      );
      
      // Free user with fewer than 5 CVs should be allowed to create a CV by the second rule
      expect(freeWithFewResult.status).toBe(true);
      expect(mockKnex.raw).toHaveBeenCalledTimes(2);
      
      // Reset mock
      mockKnex.raw.mockReset();
      
      // Mock SQL results for free user with max CVs (both rules fail)
      mockKnex.raw.mockResolvedValueOnce([]); // First rule fails (not a pro user)
      mockKnex.raw.mockResolvedValueOnce([]); // Second rule fails (already has 5 CVs)
      
      // Test with free user who already has 5 CVs
      const freeWithMaxResult = await enforcePermissions(
        'cvs',
        'INSERT',
        freeUserWithMaxCVs,
        mockPermissionService as any,
        newCV,
        mockKnex
      );
      
      // Free user with 5 or more CVs should be denied from creating more
      expect(freeWithMaxResult.status).toBe(false);
      expect(mockKnex.raw).toHaveBeenCalledTimes(2);
    });
  });
});
