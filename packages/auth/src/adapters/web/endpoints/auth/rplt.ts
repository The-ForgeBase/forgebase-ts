import { RouterType, error } from 'itty-router';
import { DynamicAuthManager } from '../../../../authManager';
import { InternalAdminManager } from '../../../../admin';
import { adminGuard } from '../admin/middleware';
import { AdminRequest } from '../admin/types';

export function rpltEndpoints(
  router: RouterType<AdminRequest>,
  authManager: DynamicAuthManager,
  adminManager: InternalAdminManager,
) {
  router.put(
    '/add-labels',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { labels, userId } = await json();
        const result = await authManager.addRTP(userId, labels, 'labels');
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Labels updated',
            labels: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );

  router.post(
    '/set-labels',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { labels, userId } = await json();
        const result = await authManager.setRTP(userId, labels, 'labels');
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Labels updated',
            labels: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );

  router.delete(
    '/remove-labels',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { labels, userId } = await json();
        const result = await authManager.removeRTP(userId, labels, 'labels');
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Labels updated',
            labels: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );

  router.put(
    '/add-permissions',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { permissions, userId } = await json();
        const result = await authManager.addRTP(
          userId,
          permissions,
          'permissions',
        );
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Permissions updated',
            permissions: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );

  router.post(
    '/set-permissions',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { permissions, userId } = await json();
        const result = await authManager.setRTP(
          userId,
          permissions,
          'permissions',
        );
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Permissions updated',
            permissions: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );

  router.delete(
    '/remove-permissions',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { permissions, userId } = await json();
        const result = await authManager.removeRTP(
          userId,
          permissions,
          'permissions',
        );
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Permissions updated',
            permissions: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );

  router.put(
    '/add-teams',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { teams, userId } = await json();
        const result = await authManager.addRTP(userId, teams, 'teams');
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Teams updated',
            teams: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );

  router.post(
    '/set-teams',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { teams, userId } = await json();
        const result = await authManager.setRTP(userId, teams, 'teams');
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Teams updated',
            teams: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );

  router.delete(
    '/remove-teams',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { teams, userId } = await json();
        const result = await authManager.removeRTP(userId, teams, 'teams');
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Teams updated',
            teams: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );

  router.put(
    'update-role',
    async (req) => adminGuard(req, adminManager),
    async ({ json }) => {
      try {
        const { role, userId } = await json();
        await authManager.setRole(userId, role);
        return new Response(
          JSON.stringify({
            status: true,
            message: 'Role updated',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (e: any) {
        return error(400, e.message);
      }
    },
  );
}
