import { protectRoute } from '../lib/server';
import DatabaseTestComp from './component';

export default function DatabaseTestPage() {
  // Protect this route - will redirect to /login if not authenticated
  protectRoute();
  return <DatabaseTestComp />;
}
