import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

/**
 * RoleBasedRoute Component
 * Extends ProtectedRoute with role-based access control
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 */
export default function RoleBasedRoute({ children, allowedRoles }) {
  const { hasRole } = useAuth();

  return (
    <ProtectedRoute>
      {hasRole(allowedRoles) ? (
        children
      ) : (
        <Navigate to="/unauthorized" replace />
      )}
    </ProtectedRoute>
  );
}
