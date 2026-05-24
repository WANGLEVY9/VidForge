import { AgentState } from './agent-state.interface';

export interface AgentResult {
  taskId: string;
  status: AgentState['status'];
  progress: number;
  currentNode: string;
  result: Partial<AgentState>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}
