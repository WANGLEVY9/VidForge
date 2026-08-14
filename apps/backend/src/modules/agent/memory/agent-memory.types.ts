export type AgentMemoryKind =
  'preference' | 'fact' | 'success_pattern' | 'failure_pattern' | 'decision';

export type AgentMemoryScope = 'user' | 'product_space' | 'run';

export interface AgentMemoryMetadata {
  source?: string;
  qualityScore?: number;
  tags?: string[];
  [key: string]: unknown;
}

export interface RememberAgentMemoryInput {
  userId: string;
  productSpaceId?: string;
  sourceRunId?: string;
  kind: AgentMemoryKind;
  scope?: AgentMemoryScope;
  semanticKey: string;
  content: string;
  metadata?: AgentMemoryMetadata;
  importance?: number;
  expiresAt?: Date;
}

export interface RecallAgentMemoryInput {
  userId: string;
  productSpaceId?: string;
  query?: string;
  kinds?: AgentMemoryKind[];
  limit?: number;
}

export interface RecalledAgentMemory {
  id: string;
  kind: AgentMemoryKind;
  scope: AgentMemoryScope;
  content: string;
  metadata: AgentMemoryMetadata;
  score: number;
}
