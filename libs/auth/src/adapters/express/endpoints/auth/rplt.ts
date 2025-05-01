import { Router, Request, Response, NextFunction } from 'express';
import { DynamicAuthManager } from '../../../../authManager';
import { InternalAdminManager } from '../../../../admin/internal-admin-manager';
import { ExpressAuthConfig, ExpressAuthRequest } from '../../types';

// Placeholder adminGuard middleware for Express
function adminGuard(
  req: ExpressAuthRequest,
  res: Response,
  next: NextFunction,
  adminManager: InternalAdminManager
): any {
  // Implement your admin check logic here
  // For now, assume req.user.isAdmin or similar
  if (req.user && req.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

export function createRpltRouter(
  authManager: DynamicAuthManager,
  adminManager: InternalAdminManager,
  config: ExpressAuthConfig
): Router {
  const router = Router();

  router.use((req, res, next) => adminGuard(req, res, next, adminManager));

  // LABELS
  router.put('/add-labels', async (req: ExpressAuthRequest, res: Response) => {
    try {
      const { labels, userId } = req.body;
      const result = await authManager.addRTP(userId, labels, 'labels');
      res
        .status(200)
        .json({ status: true, message: 'Labels updated', labels: result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  router.post('/set-labels', async (req: ExpressAuthRequest, res: Response) => {
    try {
      const { labels, userId } = req.body;
      const result = await authManager.setRTP(userId, labels, 'labels');
      res
        .status(200)
        .json({ status: true, message: 'Labels updated', labels: result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  router.delete(
    '/remove-labels',
    async (req: ExpressAuthRequest, res: Response) => {
      try {
        const { labels, userId } = req.body;
        const result = await authManager.removeRTP(userId, labels, 'labels');
        res
          .status(200)
          .json({ status: true, message: 'Labels updated', labels: result });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  // PERMISSIONS
  router.put(
    '/add-permissions',
    async (req: ExpressAuthRequest, res: Response) => {
      try {
        const { permissions, userId } = req.body;
        const result = await authManager.addRTP(
          userId,
          permissions,
          'permissions'
        );
        res
          .status(200)
          .json({
            status: true,
            message: 'Permissions updated',
            permissions: result,
          });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );
  router.post(
    '/set-permissions',
    async (req: ExpressAuthRequest, res: Response) => {
      try {
        const { permissions, userId } = req.body;
        const result = await authManager.setRTP(
          userId,
          permissions,
          'permissions'
        );
        res
          .status(200)
          .json({
            status: true,
            message: 'Permissions updated',
            permissions: result,
          });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );
  router.delete(
    '/remove-permissions',
    async (req: ExpressAuthRequest, res: Response) => {
      try {
        const { permissions, userId } = req.body;
        const result = await authManager.removeRTP(
          userId,
          permissions,
          'permissions'
        );
        res
          .status(200)
          .json({
            status: true,
            message: 'Permissions updated',
            permissions: result,
          });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  // TEAMS
  router.put('/add-teams', async (req: ExpressAuthRequest, res: Response) => {
    try {
      const { teams, userId } = req.body;
      const result = await authManager.addRTP(userId, teams, 'teams');
      res
        .status(200)
        .json({ status: true, message: 'Teams updated', teams: result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  router.post('/set-teams', async (req: ExpressAuthRequest, res: Response) => {
    try {
      const { teams, userId } = req.body;
      const result = await authManager.setRTP(userId, teams, 'teams');
      res
        .status(200)
        .json({ status: true, message: 'Teams updated', teams: result });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  router.delete(
    '/remove-teams',
    async (req: ExpressAuthRequest, res: Response) => {
      try {
        const { teams, userId } = req.body;
        const result = await authManager.removeRTP(userId, teams, 'teams');
        res
          .status(200)
          .json({ status: true, message: 'Teams updated', teams: result });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  // ROLE
  router.put('/update-role', async (req: ExpressAuthRequest, res: Response) => {
    try {
      const { role, userId } = req.body;
      await authManager.setRole(userId, role);
      res.status(200).json({ status: true, message: 'Role updated' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
}
