import { rlsFunctionRegistry } from './rlsFunctionRegistry';
import { evaluatePermission, enforcePermissions } from './rlsManager';
import type { PermissionRule, UserContext, TablePermissions } from './types';

// Simple test to verify Jest is working
describe('Simple test', () => {
  test('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});

// Mock Knex instance
const mockKnex = {
  raw: jest.fn(),
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

describe('RLS Manager', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    rlsFunctionRegistry.clear();
    mockKnex.raw.mockReset();
  });

  describe('evaluatePermission', () => {
    // Sample user contexts
    const adminUser: UserContext = {
      userId: 1,
      role: 'admin',
      labels: ['staff'],
      teams: ['engineering'],
    };

    const regularUser: UserContext = {
      userId: 2,
      role: 'user',
      labels: ['customer'],
      teams: ['free-tier'],
    };

    const guestUser: UserContext = {
      userId: 0,
      role: undefined,
      labels: [],
      teams: [],
    };

    // Sample data rows
    const adminOwnedRow = { id: 1, owner_id: 1, status: 'active' };
    const userOwnedRow = { id: 2, owner_id: 2, status: 'active' };

    describe('Basic rule types', () => {
      test('public rule should always return true', async () => {
        const rule: PermissionRule = { allow: 'public' };

        expect(await evaluatePermission([rule], adminUser, {})).toBe(true);
        expect(await evaluatePermission([rule], regularUser, {})).toBe(true);
        expect(await evaluatePermission([rule], guestUser, {})).toBe(true);
      });

      test('private rule should always return false', async () => {
        const rule: PermissionRule = { allow: 'private' };

        expect(await evaluatePermission([rule], adminUser, {})).toBe(false);
        expect(await evaluatePermission([rule], regularUser, {})).toBe(false);
        expect(await evaluatePermission([rule], guestUser, {})).toBe(false);
      });

      test('role rule should check user role', async () => {
        const adminRule: PermissionRule = {
          allow: 'role',
          roles: ['admin'],
        };

        const userRule: PermissionRule = {
          allow: 'role',
          roles: ['user'],
        };

        const multiRoleRule: PermissionRule = {
          allow: 'role',
          roles: ['admin', 'editor'],
        };

        expect(await evaluatePermission([adminRule], adminUser, {})).toBe(true);
        expect(await evaluatePermission([adminRule], regularUser, {})).toBe(
          false
        );
        expect(await evaluatePermission([adminRule], guestUser, {})).toBe(
          false
        );

        expect(await evaluatePermission([userRule], adminUser, {})).toBe(false);
        expect(await evaluatePermission([userRule], regularUser, {})).toBe(
          true
        );
        expect(await evaluatePermission([userRule], guestUser, {})).toBe(false);

        expect(await evaluatePermission([multiRoleRule], adminUser, {})).toBe(
          true
        );
        expect(await evaluatePermission([multiRoleRule], regularUser, {})).toBe(
          false
        );
      });

      test('auth rule should check if user is authenticated', async () => {
        const rule: PermissionRule = { allow: 'auth' };

        expect(await evaluatePermission([rule], adminUser, {})).toBe(true);
        expect(await evaluatePermission([rule], regularUser, {})).toBe(true);
        expect(await evaluatePermission([rule], guestUser, {})).toBe(false);
      });

      test('guest rule should check if user is not authenticated', async () => {
        const rule: PermissionRule = { allow: 'guest' };

        expect(await evaluatePermission([rule], adminUser, {})).toBe(false);
        expect(await evaluatePermission([rule], regularUser, {})).toBe(false);
        expect(await evaluatePermission([rule], guestUser, {})).toBe(true);
      });

      test('labels rule should check user labels', async () => {
        const staffRule: PermissionRule = {
          allow: 'labels',
          labels: ['staff'],
        };

        const customerRule: PermissionRule = {
          allow: 'labels',
          labels: ['customer'],
        };

        const multiLabelRule: PermissionRule = {
          allow: 'labels',
          labels: ['staff', 'vip'],
        };

        expect(await evaluatePermission([staffRule], adminUser, {})).toBe(true);
        expect(await evaluatePermission([staffRule], regularUser, {})).toBe(
          false
        );

        expect(await evaluatePermission([customerRule], adminUser, {})).toBe(
          false
        );
        expect(await evaluatePermission([customerRule], regularUser, {})).toBe(
          true
        );

        expect(await evaluatePermission([multiLabelRule], adminUser, {})).toBe(
          true
        );
        expect(
          await evaluatePermission([multiLabelRule], regularUser, {})
        ).toBe(false);
      });

      test('teams rule should check user teams', async () => {
        const engineeringRule: PermissionRule = {
          allow: 'teams',
          teams: ['engineering'],
        };

        const freeTierRule: PermissionRule = {
          allow: 'teams',
          teams: ['free-tier'],
        };

        expect(await evaluatePermission([engineeringRule], adminUser, {})).toBe(
          true
        );
        expect(
          await evaluatePermission([engineeringRule], regularUser, {})
        ).toBe(false);

        expect(await evaluatePermission([freeTierRule], adminUser, {})).toBe(
          false
        );
        expect(await evaluatePermission([freeTierRule], regularUser, {})).toBe(
          true
        );
      });

      test('static rule should return the static value', async () => {
        const trueRule: PermissionRule = {
          allow: 'static',
          static: true,
        };

        const falseRule: PermissionRule = {
          allow: 'static',
          static: false,
        };

        expect(await evaluatePermission([trueRule], adminUser, {})).toBe(true);
        expect(await evaluatePermission([falseRule], adminUser, {})).toBe(
          false
        );
      });
    });

    describe('fieldCheck rule', () => {
      test('should check equality with userContext field', async () => {
        const ownerRule: PermissionRule = {
          allow: 'fieldCheck',
          fieldCheck: {
            field: 'owner_id',
            operator: '===',
            valueType: 'userContext',
            value: 'userId',
          },
        };

        expect(
          await evaluatePermission([ownerRule], adminUser, adminOwnedRow)
        ).toBe(true);
        expect(
          await evaluatePermission([ownerRule], adminUser, userOwnedRow)
        ).toBe(false);
        expect(
          await evaluatePermission([ownerRule], regularUser, adminOwnedRow)
        ).toBe(false);
        expect(
          await evaluatePermission([ownerRule], regularUser, userOwnedRow)
        ).toBe(true);
      });

      test('should check inequality with userContext field', async () => {
        const notOwnerRule: PermissionRule = {
          allow: 'fieldCheck',
          fieldCheck: {
            field: 'owner_id',
            operator: '!==',
            valueType: 'userContext',
            value: 'userId',
          },
        };

        expect(
          await evaluatePermission([notOwnerRule], adminUser, adminOwnedRow)
        ).toBe(false);
        expect(
          await evaluatePermission([notOwnerRule], adminUser, userOwnedRow)
        ).toBe(true);
        expect(
          await evaluatePermission([notOwnerRule], regularUser, adminOwnedRow)
        ).toBe(true);
        expect(
          await evaluatePermission([notOwnerRule], regularUser, userOwnedRow)
        ).toBe(false);
      });

      test('should check if value is in array', async () => {
        const statusRule: PermissionRule = {
          allow: 'fieldCheck',
          fieldCheck: {
            field: 'status',
            operator: 'in',
            valueType: 'static',
            value: ['active', 'pending'],
          },
        };

        expect(
          await evaluatePermission([statusRule], adminUser, {
            status: 'active',
          })
        ).toBe(true);
        expect(
          await evaluatePermission([statusRule], adminUser, {
            status: 'pending',
          })
        ).toBe(true);
        expect(
          await evaluatePermission([statusRule], adminUser, {
            status: 'inactive',
          })
        ).toBe(false);
      });

      test('should check if value is not in array', async () => {
        const statusRule: PermissionRule = {
          allow: 'fieldCheck',
          fieldCheck: {
            field: 'status',
            operator: 'notIn',
            valueType: 'static',
            value: ['inactive', 'deleted'],
          },
        };

        expect(
          await evaluatePermission([statusRule], adminUser, {
            status: 'active',
          })
        ).toBe(true);
        expect(
          await evaluatePermission([statusRule], adminUser, {
            status: 'inactive',
          })
        ).toBe(false);
        expect(
          await evaluatePermission([statusRule], adminUser, {
            status: 'deleted',
          })
        ).toBe(false);
      });
    });

    describe('customSql rule', () => {
      test('should execute SQL query and return true if results exist', async () => {
        const sqlRule: PermissionRule = {
          allow: 'customSql',
          customSql: 'SELECT 1 FROM users WHERE id = :userId',
        };

        // Mock successful query with results
        mockKnex.raw.mockResolvedValueOnce([[{ count: 1 }]]);

        expect(
          await evaluatePermission([sqlRule], adminUser, {}, mockKnex)
        ).toBe(true);
        expect(mockKnex.raw).toHaveBeenCalledWith(
          expect.stringContaining('SELECT 1 FROM users WHERE id = 1')
        );
      });

      test('should return false if SQL query returns no results', async () => {
        const sqlRule: PermissionRule = {
          allow: 'customSql',
          customSql:
            'SELECT 1 FROM users WHERE id = :userId AND role = "superadmin"',
        };

        // Mock successful query with no results
        mockKnex.raw.mockResolvedValueOnce([]);

        expect(
          await evaluatePermission([sqlRule], adminUser, {}, mockKnex)
        ).toBe(false);
      });

      test('should handle different userContext field types in SQL', async () => {
        const complexSqlRule: PermissionRule = {
          allow: 'customSql',
          customSql:
            'SELECT 1 FROM users WHERE id = :userId AND role = :role AND :labels LIKE "%staff%"',
        };

        mockKnex.raw.mockResolvedValueOnce([[{ count: 1 }]]);

        await evaluatePermission([complexSqlRule], adminUser, {}, mockKnex);

        // Check that parameters were properly substituted
        const sqlCall = mockKnex.raw.mock.calls[0][0];
        expect(sqlCall).toContain(`id = 1`); // Number
        expect(sqlCall).toContain(`role = 'admin'`); // String
        expect(sqlCall).toContain(`'staff'`); // Array item
      });

      test('should handle SQL query errors', async () => {
        const sqlRule: PermissionRule = {
          allow: 'customSql',
          customSql: 'INVALID SQL QUERY',
        };

        // Mock query error
        mockKnex.raw.mockRejectedValueOnce(new Error('SQL syntax error'));

        // Should return false on error and not throw
        expect(
          await evaluatePermission([sqlRule], adminUser, {}, mockKnex)
        ).toBe(false);
      });
    });

    describe('customFunction rule', () => {
      test('should execute registered function and return its result', async () => {
        // Register a test function
        const testFn = jest.fn().mockReturnValue(true);
        rlsFunctionRegistry.register('testFunction', testFn);

        const functionRule: PermissionRule = {
          allow: 'customFunction',
          customFunction: 'testFunction',
        };

        expect(
          await evaluatePermission(
            [functionRule],
            adminUser,
            adminOwnedRow,
            mockKnex
          )
        ).toBe(true);
        expect(testFn).toHaveBeenCalledWith(adminUser, adminOwnedRow, mockKnex);
      });

      test('should return false if function returns false', async () => {
        // Register a test function
        rlsFunctionRegistry.register('falseFunction', () => false);

        const functionRule: PermissionRule = {
          allow: 'customFunction',
          customFunction: 'falseFunction',
        };

        expect(
          await evaluatePermission([functionRule], adminUser, {}, mockKnex)
        ).toBe(false);
      });

      test('should return false if function is not registered', async () => {
        const functionRule: PermissionRule = {
          allow: 'customFunction',
          customFunction: 'nonExistentFunction',
        };

        expect(
          await evaluatePermission([functionRule], adminUser, {}, mockKnex)
        ).toBe(false);
      });

      test('should handle async functions', async () => {
        // Register an async test function
        rlsFunctionRegistry.register('asyncFunction', async () => {
          return Promise.resolve(true);
        });

        const functionRule: PermissionRule = {
          allow: 'customFunction',
          customFunction: 'asyncFunction',
        };

        expect(
          await evaluatePermission([functionRule], adminUser, {}, mockKnex)
        ).toBe(true);
      });

      test('should handle function errors', async () => {
        // Register a function that throws
        rlsFunctionRegistry.register('errorFunction', () => {
          throw new Error('Test error');
        });

        const functionRule: PermissionRule = {
          allow: 'customFunction',
          customFunction: 'errorFunction',
        };

        // Should return false on error and not throw
        expect(
          await evaluatePermission([functionRule], adminUser, {}, mockKnex)
        ).toBe(false);
      });
    });

    test('should return false if no rules match', async () => {
      const rules: PermissionRule[] = [
        { allow: 'role', roles: ['superadmin'] },
        { allow: 'labels', labels: ['vip'] },
      ];

      expect(await evaluatePermission(rules, regularUser, {})).toBe(false);
    });

    test('should return true on first matching rule', async () => {
      // Create a spy on console.log to verify rule evaluation
      const consoleSpy = jest.spyOn(console, 'log');
      consoleSpy.mockImplementation(() => {});

      const rules: PermissionRule[] = [
        { allow: 'auth' }, // This should match for adminUser and prevent further rules from being evaluated
        {
          allow: 'customFunction',
          customFunction: 'shouldNotBeCalled',
        }, // This should not be called because the previous rule matches
      ];

      // Register a function that logs when called
      const testFn = jest.fn().mockImplementation(() => {
        console.log('Custom function called');
        return true;
      });
      rlsFunctionRegistry.register('shouldNotBeCalled', testFn);

      // The auth rule should match, so the custom function should not be called
      const result = await evaluatePermission(rules, adminUser, {}, mockKnex);
      expect(result).toBe(true);
      expect(testFn).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith('Custom function called');

      // Restore console.log
      consoleSpy.mockRestore();
    });
  });

  describe('enforcePermissions', () => {
    const mockPermissionService = new MockPermissionService();

    // Sample user contexts
    const adminUser: UserContext = {
      userId: 1,
      role: 'admin',
      labels: ['staff'],
      teams: ['engineering'],
    };

    const regularUser: UserContext = {
      userId: 2,
      role: 'user',
      labels: ['customer'],
      teams: ['free-tier'],
    };

    // Sample data rows
    const adminOwnedRow = { id: 1, owner_id: 1, status: 'active' };
    const userOwnedRow = { id: 2, owner_id: 2, status: 'active' };
    const publicRow = { id: 3, owner_id: 0, status: 'public' };

    test('should return false if no permissions defined for table', async () => {
      const result = await enforcePermissions(
        'nonexistent_table',
        'SELECT',
        adminUser,
        mockPermissionService as any,
        undefined,
        mockKnex
      );

      expect(result.status).toBe(false);
      expect(result.message).toContain('No permissions defined');
    });

    test('should return false if no permissions defined for operation', async () => {
      mockPermissionService.setMockPermissions('test_table', {
        operations: {
          SELECT: [{ allow: 'public' }],
          // No INSERT permission
        },
      });

      const result = await enforcePermissions(
        'test_table',
        'INSERT',
        adminUser,
        mockPermissionService as any,
        undefined,
        mockKnex
      );

      expect(result.status).toBe(false);
      expect(result.message).toContain('No permissions defined for operation');
    });

    test('should return true if public permission exists', async () => {
      mockPermissionService.setMockPermissions('test_table', {
        operations: {
          SELECT: [{ allow: 'public' }],
        },
      });

      const result = await enforcePermissions(
        'test_table',
        'SELECT',
        regularUser,
        mockPermissionService as any,
        undefined,
        mockKnex
      );

      expect(result.status).toBe(true);
    });

    test('should handle field-level permissions with single row', async () => {
      mockPermissionService.setMockPermissions('test_table', {
        operations: {
          UPDATE: [
            {
              allow: 'fieldCheck',
              fieldCheck: {
                field: 'owner_id',
                operator: '===',
                valueType: 'userContext',
                value: 'userId',
              },
            },
          ],
        },
      });

      // User can update their own row
      const ownedResult = await enforcePermissions(
        'test_table',
        'UPDATE',
        regularUser,
        mockPermissionService as any,
        userOwnedRow,
        mockKnex
      );

      expect(ownedResult.status).toBe(true);

      // User cannot update someone else's row
      const notOwnedResult = await enforcePermissions(
        'test_table',
        'UPDATE',
        regularUser,
        mockPermissionService as any,
        adminOwnedRow,
        mockKnex
      );

      expect(notOwnedResult.status).toBe(false);
    });

    test('should handle field-level permissions with multiple rows', async () => {
      mockPermissionService.setMockPermissions('test_table', {
        operations: {
          SELECT: [
            {
              allow: 'fieldCheck',
              fieldCheck: {
                field: 'owner_id',
                operator: '===',
                valueType: 'userContext',
                value: 'userId',
              },
            },
          ],
        },
      });

      const rows = [adminOwnedRow, userOwnedRow, publicRow];

      // Regular user should only see their own row and public rows
      const result = await enforcePermissions(
        'test_table',
        'SELECT',
        regularUser,
        mockPermissionService as any,
        rows,
        mockKnex
      );

      expect(result.status).toBe(true);
      expect(Array.isArray(result.row)).toBe(true);
      expect((result.row as any[]).length).toBe(1);
      expect((result.row as any[])[0].id).toBe(2); // Only user's own row
    });

    test('should handle customSql permissions', async () => {
      mockPermissionService.setMockPermissions('test_table', {
        operations: {
          DELETE: [
            {
              allow: 'customSql',
              customSql:
                'SELECT 1 FROM test_table WHERE owner_id = :userId AND id = 1',
            },
          ],
        },
      });

      // Mock SQL result for admin (success)
      mockKnex.raw.mockResolvedValueOnce([[{ count: 1 }]]);

      const adminResult = await enforcePermissions(
        'test_table',
        'DELETE',
        adminUser,
        mockPermissionService as any,
        adminOwnedRow,
        mockKnex
      );

      expect(adminResult.status).toBe(true);

      // Mock SQL result for regular user (no results)
      mockKnex.raw.mockResolvedValueOnce([]);

      const userResult = await enforcePermissions(
        'test_table',
        'DELETE',
        regularUser,
        mockPermissionService as any,
        adminOwnedRow,
        mockKnex
      );

      expect(userResult.status).toBe(false);
    });

    test('should handle customFunction permissions', async () => {
      // Register a function that only allows admins
      rlsFunctionRegistry.register('adminOnly', (userContext) => {
        return userContext.role === 'admin';
      });

      mockPermissionService.setMockPermissions('test_table', {
        operations: {
          INSERT: [
            {
              allow: 'customFunction',
              customFunction: 'adminOnly',
            },
          ],
        },
      });

      // Admin should be allowed
      const adminResult = await enforcePermissions(
        'test_table',
        'INSERT',
        adminUser,
        mockPermissionService as any,
        { name: 'Test' },
        mockKnex
      );

      expect(adminResult.status).toBe(true);

      // Regular user should be denied
      const userResult = await enforcePermissions(
        'test_table',
        'INSERT',
        regularUser,
        mockPermissionService as any,
        { name: 'Test' },
        mockKnex
      );

      expect(userResult.status).toBe(false);
    });

    test('should handle multiple rule types', async () => {
      // Register a custom function with debugging
      const checkOwnershipFn = async (userContext, row) => {
        // Log the values for debugging
        console.log('checkOwnership called with:', {
          userId: userContext.userId,
          rowOwnerId: row.owner_id,
          isMatch: row.owner_id === userContext.userId,
        });
        return row.owner_id === userContext.userId;
      };

      // Spy on the function to track calls
      const checkOwnershipSpy = jest.fn(checkOwnershipFn);
      rlsFunctionRegistry.register('checkOwnership', checkOwnershipSpy);

      mockPermissionService.setMockPermissions('test_table', {
        operations: {
          UPDATE: [
            { allow: 'role', roles: ['admin'] }, // Admin can update any row
            {
              allow: 'customFunction',
              customFunction: 'checkOwnership',
            }, // Others can only update their own rows
          ],
        },
      });

      // Admin can update any row
      const adminResult = await enforcePermissions(
        'test_table',
        'UPDATE',
        adminUser,
        mockPermissionService as any,
        userOwnedRow, // Not admin's row
        mockKnex
      );

      expect(adminResult.status).toBe(true);

      // Regular user can only update their own rows
      const userOwnResult = await enforcePermissions(
        'test_table',
        'UPDATE',
        regularUser,
        mockPermissionService as any,
        userOwnedRow, // User's own row
        mockKnex
      );

      // Log the result and check if the spy was called
      console.log('userOwnResult:', userOwnResult);
      console.log(
        'checkOwnershipSpy called:',
        checkOwnershipSpy.mock.calls.length,
        'times'
      );
      if (checkOwnershipSpy.mock.calls.length > 0) {
        console.log(
          'checkOwnershipSpy last call args:',
          checkOwnershipSpy.mock.calls[0]
        );
      }

      // The test should pass because the user owns the row
      expect(userOwnResult.status).toBe(true);

      const userOtherResult = await enforcePermissions(
        'test_table',
        'UPDATE',
        regularUser,
        mockPermissionService as any,
        adminOwnedRow, // Not user's row
        mockKnex
      );

      expect(userOtherResult.status).toBe(false);
    });
  });
});
