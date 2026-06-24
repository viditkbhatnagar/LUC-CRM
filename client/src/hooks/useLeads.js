import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

const qs = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export function useLeads(filters = {}) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => api.get(`/leads${qs(filters)}`),
    keepPreviousData: true,
  });
}

export function useLead(id) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get(`/leads/${id}`).then((d) => d.lead),
    enabled: !!id,
  });
}

export function useActivities(id) {
  return useQuery({
    queryKey: ['activities', id],
    queryFn: () => api.get(`/leads/${id}/activities`).then((d) => d.activities),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, force }) => api.post(`/leads${force ? '?force=true' : ''}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.patch(`/leads/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['activities', id] });
    },
  });
}

// Used by the workspace once the transition endpoint lands (M4).
export function useTransition(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post(`/leads/${id}/transition`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['activities', id] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useAddActivity(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post(`/leads/${id}/activities`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', id] }),
  });
}
