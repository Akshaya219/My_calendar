import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ModuleGuard({ module, children }) {
  const { preferences } = useAuth();
  
  const activeModules = preferences?.active_modules || [];
  
  if (!activeModules.includes(module)) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
