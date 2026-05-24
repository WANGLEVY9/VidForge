import apiClient from '../utils/api';

export interface RunAgentDto {
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience?: string;
  style?: string;
  duration?: number;
}

export interface AgentResult {
  taskId: string;
  status: string;
  progress: number;
  currentNode: string;
}

export const agentApi = {
  run(data: RunAgentDto) {
    return apiClient.post<any, AgentResult>('/agent/run', data);
  },
  getStatus(taskId: string) {
    return apiClient.get<any, AgentResult>(`/agent/status/${taskId}`);
  },
  cancel(taskId: string) {
    return apiClient.post<any, void>(`/agent/cancel/${taskId}`);
  },
};
