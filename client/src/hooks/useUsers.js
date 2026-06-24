import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Assignment dropdowns — managers/admins only (RBAC: GET /auth/users).
export function useUsers() {
  const { isManager } = useAuth();
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users').then((d) => d.users),
    enabled: isManager,
    staleTime: 5 * 60 * 1000,
  });
}
