import { Router } from 'ultimate-express';
import { DynamicAuthManager } from '../../../authManager';
import { UltimateExpressAuthConfig } from '../types';

export function createAdminRouter(
  authManager: DynamicAuthManager,
  config: UltimateExpressAuthConfig
): Router {
  const router = Router();
  // TODO: implement admin endpoints
  router.get('/providers', async (req, res) => {
    // TODO: implement get providers logic
    res.status(501).json({ error: 'Not implemented' });
  });
  return router;
}
