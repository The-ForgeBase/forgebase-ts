import { protectRoute } from '../lib/auth';
import DatabaseTestComp from './component';

export default function DatabaseTestPage() {
  // Protect this route - will redirect to /login if not authenticated
  protectRoute();
  return <DatabaseTestComp />;
}
