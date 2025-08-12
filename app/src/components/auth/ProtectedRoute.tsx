import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../../lib/auth';
import { type ReactNode } from 'react';

type Props = { children: ReactNode };

export function ProtectedRoute({ children }: Props) {
  const loc = useLocation();
  const token = getToken();
  if (!token) {
    return <Navigate to="/signin" replace state={{ from: loc }} />;
    }
  return <>{children}</>;
}

export default ProtectedRoute;
