import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
    refetchInterval: 60_000, // poll for new escalations
  });
}

export function useMarkNotifications() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  return {
    markOne: useMutation({ mutationFn: (id) => api.post(`/notifications/${id}/read`), onSuccess: invalidate }),
    markAll: useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: invalidate }),
  };
}
