import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const report = (key, path, opts = {}) =>
  useQuery({ queryKey: ['reports', key], queryFn: () => api.get(`/reports/${path}`), ...opts });

export const useKpis = () => report('kpis', 'kpis');
export const useSourcePerformance = () => report('source', 'source-performance');
export const useFunnel = () => report('funnel', 'funnel');
export const useStageAging = () => report('aging', 'stage-aging');
export const useLostReasons = () => report('lost', 'lost-reasons');
export const useRule1Check = () => report('rule1', 'rule1-check');

export function useCounsellorPerformance() {
  const { isManager } = useAuth();
  return report('counsellor', 'counsellor-performance', { enabled: isManager });
}
