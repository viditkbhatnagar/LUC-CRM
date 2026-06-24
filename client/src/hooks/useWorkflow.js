import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

// The workflow definition (stages/phases/transitions/enums). Cached long —
// it only changes when workflow.config changes server-side.
export function useWorkflow() {
  return useQuery({
    queryKey: ['meta', 'workflow'],
    queryFn: () => api.get('/meta/workflow'),
    staleTime: 60 * 60 * 1000,
  });
}
