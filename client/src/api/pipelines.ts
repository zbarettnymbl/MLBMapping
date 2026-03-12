import { apiClient } from './client';
import type { PipelineDetail, PipelineListItem, PipelineRunSummary, PipelineNodeRunDetail } from '@mapforge/shared';

export async function fetchPipelines(): Promise<PipelineListItem[]> {
  const response = await apiClient.get<{ pipelines: PipelineListItem[] }>('/pipelines');
  return response.data.pipelines;
}

export async function fetchPipeline(id: string): Promise<PipelineDetail> {
  const response = await apiClient.get<PipelineDetail>(`/pipelines/${id}`);
  return response.data;
}

export async function createPipeline(payload: Partial<PipelineDetail>): Promise<PipelineDetail> {
  const response = await apiClient.post<PipelineDetail>('/pipelines', payload);
  return response.data;
}

export async function updatePipeline(id: string, payload: Partial<PipelineDetail>): Promise<PipelineDetail> {
  const response = await apiClient.put<PipelineDetail>(`/pipelines/${id}`, payload);
  return response.data;
}

export async function deletePipeline(id: string): Promise<void> {
  await apiClient.delete(`/pipelines/${id}`);
}

export async function updatePipelineStatus(id: string, status: 'draft' | 'active' | 'paused'): Promise<PipelineDetail> {
  const response = await apiClient.patch<PipelineDetail>(`/pipelines/${id}/status`, { status });
  return response.data;
}

export async function triggerPipelineRun(id: string): Promise<{ runId: string }> {
  const response = await apiClient.post<{ runId: string }>(`/pipelines/${id}/run`);
  return response.data;
}

export async function fetchPipelineRuns(id: string): Promise<PipelineRunSummary[]> {
  const response = await apiClient.get<{ runs: PipelineRunSummary[] }>(`/pipelines/${id}/runs`);
  return response.data.runs;
}

export async function fetchRunDetail(runId: string): Promise<{ run: PipelineRunSummary; nodeRuns: PipelineNodeRunDetail[] }> {
  const response = await apiClient.get<{ run: PipelineRunSummary; nodeRuns: PipelineNodeRunDetail[] }>(`/pipelines/runs/${runId}`);
  return response.data;
}
